const path = require('path');
const fs = require('node:fs/promises');
const { Wallets, Gateway } = require('fabric-network');
const { TextEncoder } = require('node:util');
const { split } = require('shamir');
const crypto = require('crypto');

// Configuration
const CHANNEL_NAME = 'sipfs';
const CHAINCODE_NAME = 'basic';
const USERNAME = 'dd1'; // Data Owner username
const WALLET_PATH = path.join(__dirname, 'walletOwner');
const CCP_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'test-network',
  'organizations',
  'peerOrganizations',
  'org1.example.com',
  'connection-org1.json'
);

// Utility functions
function generateRandomAccessKey(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function hashKeyValuePairs(policyAttributes) {
  const hashedAttributes = [];
  for (const attribute of policyAttributes) {
    for (const key in attribute) {
      if (attribute.hasOwnProperty(key)) {
        const value = attribute[key];
        const concatenated = `${key}:${JSON.stringify(value)}`;
        const combinedHash = crypto.createHash('sha256').update(concatenated).digest('hex');
        hashedAttributes.push({ [key]: value, hash: combinedHash });
      }
    }
  }
  return hashedAttributes;
}

function encrypt(text, symmetricKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(symmetricKey), iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, symmetricKey) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(symmetricKey), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

function generateUniqueId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function generateShamirFragments(secret, parts, quorum) {
  const utf8Encoder = new TextEncoder();
  const secretBytes = utf8Encoder.encode(secret);
  const shares = split(crypto.randomBytes, parts, quorum, secretBytes);

  const policyAttributes = Array.from({ length: parts }, (_, i) => ({
    interest: [`topic${i}`],
    languages: ['en'],
  }));

  const hashedAttributes = hashKeyValuePairs(policyAttributes);

  const fragmentsMap = hashedAttributes.map((attr, index) => ({
    ...attr,
    share: shares[index + 1],
  }));

  return { fragmentsMap, hashedAttributes };
}

async function connectToUserGateway(username, userType) {
  let ccpPath;
  let walletPath;
  if (userType === 'requester') {
    walletPath = path.join(__dirname, 'walletRequester');
    ccpPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'test-network',
      'organizations',
      'peerOrganizations',
      'org2.example.com',
      'connection-org2.json'
    );
  } else if (userType === 'owner') {
    walletPath = WALLET_PATH;
    ccpPath = CCP_PATH;
  } else {
    throw new Error(`Invalid userType: ${userType}`);
  }

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(username);
  if (!identity) {
    throw new Error(`An identity for the user ${username} does not exist in the wallet`);
  }

  const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
  const gateway = new Gateway();

  await gateway.connect(ccp, {
    wallet,
    identity: username,
    discovery: { enabled: true, asLocalhost: true },
    eventHandlerOptions: {
      commitTimeout: 10000,
      endorseTimeout: 10000,
    },
    connectionTimeout: 1200000,
    clientConfig: {
      'grpc.keepalive_time_ms': 10000,
      'grpc.keepalive_timeout_ms': 20000,
      'grpc.http2.max_pings_without_data': 0,
    },
  });
  return gateway;
}

async function setupTestData(contract) {
  const username = generateUniqueId('user');
  const assetId = generateUniqueId('asset');
  const currentDate = new Date().toISOString();
  const publicKey = 'dummy-public-key';
  const owner = USERNAME;
  const key = generateRandomAccessKey();
  const hashAccessKey = crypto.createHash('sha256').update(key).digest('hex');
  const policyAttributes = [{ interest: ['topic1'], languages: ['en'] }];
  const hashedAttributes = hashKeyValuePairs(policyAttributes);
  const { fragmentsMap } = generateShamirFragments(key, 2, 2);

  let userExists = false;
  try {
    const userExistsResult = await contract.evaluateTransaction('UserExists', username);
    userExists = JSON.parse(userExistsResult.toString());
  } catch (e) {
    console.error(`Error checking user ${username} existence:`, e.message);
  }
  if (!userExists) {
    await contract.submitTransaction(
      'CreateUser',
      username,
      'testRole',
      currentDate,
      publicKey,
      JSON.stringify(policyAttributes)
    );
  } else {
    console.log(`User ${username} already exists, using existing user`);
  }

  let assetExists = false;
  try {
    const assetExistsResult = await contract.evaluateTransaction('AssetExists', assetId);
    assetExists = JSON.parse(assetExistsResult.toString());
  } catch (e) {
    console.error(`Error checking asset ${assetId} existence:`, e.message);
  }
  if (!assetExists) {
    await contract.submitTransaction(
      'CreateAsset',
      assetId,
      JSON.stringify({ description: 'Test asset' }),
      JSON.stringify(policyAttributes),
      publicKey,
      currentDate,
      currentDate,
      owner,
      'test-asset',
      'dummy-cid',
      '',
      hashAccessKey,
      JSON.stringify(fragmentsMap),
      JSON.stringify(hashedAttributes)
    );
  } else {
    console.log(`Asset ${assetId} already exists, using existing asset`);
  }

  return { username, assetId, owner };
}

async function cleanupTestData(contract, username, assetId) {
  if (assetId) {
    try {
      await contract.submitTransaction('DeleteAsset', assetId);
      console.log(`Successfully deleted asset ${assetId}`);
    } catch (e) {
      console.error(`Cleanup failed for asset ${assetId}:`, e.message);
    }
  }

}

async function cleanupAssetsBatch(contract, assetIds) {
  const batchSize = 5;
  for (let i = 0; i < assetIds.length; i += batchSize) {
    const batch = assetIds.slice(i, i + batchSize);
    const promises = batch.map((assetId) =>
      cleanupTestData(contract, null, assetId)
    );
    await Promise.all(promises);
    console.log(`Completed cleanup batch ${i / batchSize + 1}/${Math.ceil(assetIds.length / batchSize)}`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Delay to reduce peer pressure
  }
}
// function generateRSAKeyPair() {
//     return crypto.generateKeyPairSync('rsa', {
//       modulusLength: 2048, // Standard key size
//       publicKeyEncoding: {
//         type: 'spki',
//         format: 'pem'
//       },
//       privateKeyEncoding: {
//         type: 'pkcs8',
//         format: 'pem'
//       }
//     });
//   }



// 2) Hybrid encrypt: AES-256-GCM + RSA-OAEP wrap of the AES key
function hybridEncrypt(fragment, publicKey) {
    // — serialize fragment
    const plaintext = typeof fragment === 'string'
      ? Buffer.from(fragment, 'utf8')
      : Buffer.from(JSON.stringify(fragment), 'utf8');
  
    // — generate AES key & IV
    const aesKey = crypto.randomBytes(32);        // 256-bit key
    const iv     = crypto.randomBytes(12);        // recommended 96-bit IV for GCM
  
    // — AES-GCM encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const encrypted = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);
    const authTag   = cipher.getAuthTag();
  
    // — RSA-OAEP wrap of the AES key
    const wrappedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      aesKey
    );
  
    return {
      encryptedData: encrypted.toString('base64'),
      iv:            iv.toString('base64'),
      authTag:       authTag.toString('base64'),
      wrappedKey:    wrappedKey.toString('base64')
    };
  }
async function measureFunction(contract, functionName, args, isQuery) {
  const startTime = performance.now();
  try {
    if (functionName === 'CreateUser') {
      const username = args[0];
      const existsResult = await contract.evaluateTransaction('UserExists', username);
      if (JSON.parse(existsResult.toString())) {
        console.log(`User ${username} already exists, skipping creation`);
        return -1;
      }
    } else if (functionName === 'CreateAsset' || functionName === 'UpdateAsset') {
      const assetId = args[0];
      const existsResult = await contract.evaluateTransaction('AssetExists', assetId);
      if (functionName === 'CreateAsset' && JSON.parse(existsResult.toString())) {
        console.log(`Asset ${assetId} already exists, skipping creation`);
        return -1;
      }
      if (functionName === 'UpdateAsset' && !JSON.parse(existsResult.toString())) {
        console.log(`Asset ${assetId} does not exist, skipping update`);
        return -1;
      }
      // Compute Shamir and hashing inside timing
      const key = generateRandomAccessKey();
      const hashAccessKey = crypto.createHash('sha256').update(key).digest('hex');
      const { fragmentsMap, hashedAttributes } = generateShamirFragments(key, 2, 2);


      const worker1Path = path.resolve(__dirname, `./workers/w1-keys.json`);
      const worker2PAth = path.resolve(__dirname, `./workers/w1-keys.json`);
      const w1Data = await fs.readFile(worker1Path, 'utf8');
      const w2Data = await fs.readFile(worker2PAth, 'utf8');
      
    
      const w1Keys = JSON.parse(w1Data);
      const w2Keys = JSON.parse(w2Data);
      
    //   console.log(w1Keys);
      const encryptedFragments = {};
      
      for (const [idx, fragment] of Object.entries(fragmentsMap)) {
        encryptedFragments[idx] = {
          byKey1: hybridEncrypt(fragment, w1Keys.publicKey),
          byKey2: hybridEncrypt(fragment, w2Keys.publicKey)
        };
      }

      args[10] = hashAccessKey;
      args[11] = JSON.stringify(encryptedFragments);
      args[12] = JSON.stringify(hashedAttributes);
    }

    if (isQuery) {
        
      await contract.evaluateTransaction(functionName, ...args);
    } else {
      await contract.submitTransaction(functionName, ...args);
    }
    const endTime = performance.now();
    return endTime - startTime;
  } catch (error) {
    console.error(`Error measuring ${functionName}:`, error.message, error.responses || '');
    return -1;
  }
}

async function benchmarkApiCallTimes() {
  const results = [];
  let gateway;
  try {
    gateway = await connectToUserGateway(USERNAME, 'owner');
    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);

    const { username, assetId, owner } = await setupTestData(contract);
    const iterations = 5;

    const policyAttributes = [{ interest: ['topic1'], languages: ['en'] }];
    const newUserId = generateUniqueId('user');
    const newAssetId = generateUniqueId('asset');
    const currentDate = new Date().toISOString();

    const functions = [
      { name: 'UserExists', args: [username], isQuery: true },
      { name: 'GetUser', args: [username], isQuery: true },
      { name: 'GetAssetsByOwnerAndName', args: [owner, 'test-asset', 'DEMO'], isQuery: true },
      { name: 'AssetExists', args: [assetId], isQuery: true },
      { name: 'ReadAsset', args: [assetId], isQuery: true },
      { name: 'CheckAccess', args: [username, assetId], isQuery: true },
      { name: 'GetAllAssets', args: [], isQuery: true },
      {
        name: 'CreateUser',
        args: [
          newUserId,
          'testRole',
          currentDate,
          'dummy-public-key',
          JSON.stringify(policyAttributes),
        ],
        isQuery: false,
      },
      {
        name: 'CreateAsset',
        args: [
          newAssetId,
          JSON.stringify({ description: 'Test asset' }),
          JSON.stringify(policyAttributes),
          'dummy-public-key',
          currentDate,
          currentDate,
          owner,
          'test-asset',
          'dummy-cid',
          '',
          '', // Placeholder for hashAccessKey
          '', // Placeholder for fragmentsMap
          '', // Placeholder for hashedAttributes
        ],
        isQuery: false,
      },
      {
        name: 'UpdateAsset',
        args: [
          assetId,
          JSON.stringify({ description: 'Updated asset' }),
          JSON.stringify(policyAttributes),
          'dummy-public-key',
          currentDate,
          currentDate,
          owner,
          'test-asset',
          'dummy-cid',
          '',
          '', // Placeholder for hashAccessKey
          '', // Placeholder for fragmentsMap
          '', // Placeholder for hashedAttributes
        ],
        isQuery: false,
      },
      { name: 'RevokePermanentAccess', args: [username, assetId, currentDate], isQuery: false },
      { name: 'GrantAccess', args: [username, assetId, currentDate], isQuery: false },
    ];

    for (const func of functions) {
      let totalTime = 0;
      const successfulIterations = [];

      if (func.isQuery) {
        // Parallel execution for Queries
        const promises = Array.from({ length: iterations }, (_, i) =>
          measureFunction(contract, func.name, func.args, func.isQuery).then((duration) => ({
            iteration: i + 1,
            duration,
          }))
        );
        const iterationResults = await Promise.all(promises);
        for (const { iteration, duration } of iterationResults) {
          if (duration >= 0) {
            totalTime += duration;
            successfulIterations.push({ iteration, latency: duration.toFixed(3) });
          }
        }
      } else {
        // Sequential execution for Submits to avoid MVCC conflicts
        for (let i = 0; i < iterations; i++) {
          const duration = await measureFunction(contract, func.name, func.args, func.isQuery);
          if (duration >= 0) {
            totalTime += duration;
            successfulIterations.push({ iteration: i + 1, latency: duration.toFixed(3) });
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const avgLatency = successfulIterations.length > 0 ? (totalTime / successfulIterations.length).toFixed(3) : -1;
      results.push({
        function: func.name,
        avgLatency,
        latencyUnit: 'milliseconds',
        details: successfulIterations,
      });
    }

    await cleanupTestData(contract, username, assetId);
    await cleanupTestData(contract, newUserId, newAssetId);
    await fs.writeFile(
      path.join(__dirname, 'api_call_times_benchmark.json'),
      JSON.stringify(results, null, 2)
    );
    return results;
  } catch (error) {
    console.error('Error in benchmarkApiCallTimes:', error.message);
    throw error;
  } finally {
    if (gateway) await gateway.disconnect();
  }
}


async function benchmarkCreateAsset() {
  const iterations = 50; // Reduced to speed up cleanup
  const batchSize = 5; // Smaller batch size for stability
  const results = [];
  let gateway;
  const assetIds = [];

  try {
    gateway = await connectToUserGateway(USERNAME, 'owner');
    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);

    for (let batch = 0; batch < iterations; batch += batchSize) {
      const promises = [];
      for (let i = batch; i < Math.min(batch + batchSize, iterations); i++) {
        promises.push(
          (async (iteration) => {
            const assetId = generateUniqueId('asset');
            assetIds.push(assetId);
            const metaData = JSON.stringify({ description: 'Test asset' });
            const policyAttributes = [{ interest: ['topic1'], languages: ['en'] }];
            const policySet = JSON.stringify(policyAttributes);
            const publicKeyOwner = 'dummy-public-key';
            const now = new Date().toISOString();
            const owner = USERNAME;
            const name = 'test-asset';
            const cid = 'dummy-cid';
            const prevCid = '';

            const args = [
              assetId,
              metaData,
              policySet,
              publicKeyOwner,
              now,
              now,
              owner,
              name,
              cid,
              prevCid,
              '',
              '',
              '',
            ];

            const duration = await measureFunction(contract, 'CreateAsset', args, false);

            return {
              iteration: iteration + 1,
              latency: duration.toFixed(3),
            };
          })(i)
        );
      }

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      console.log(`Completed batch ${batch / batchSize + 1}/${Math.ceil(iterations / batchSize)}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('Cleaning up assets...');
    await cleanupAssetsBatch(contract, assetIds);

    const validResults = results.filter((r) => parseFloat(r.latency) >= 0);
    const avgLatency =
      validResults.length > 0
        ? validResults.reduce((sum, r) => sum + parseFloat(r.latency), 0) / validResults.length
        : -1;

    const output = {
      iterations,
      avgLatency: avgLatency.toFixed(3),
      latencyUnit: 'milliseconds',
      details: validResults,
    };

    await fs.writeFile(
      path.join(__dirname, 'create_asset_benchmark.json'),
      JSON.stringify(output, null, 2)
    );

    return output;
  } catch (error) {
    console.error('Error in benchmarkCreateAsset:', error.message);
    throw error;
  } finally {
    if (gateway) await gateway.disconnect();
  }
}
async function benchmarkQueryLatency() {
    const concurrencyLevels = [5, 80, 200, 400, 600, 1000];
    const results = [];
    let gateway;
    try {
      gateway = await connectToUserGateway(USERNAME, 'owner');
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CHAINCODE_NAME);
  
      const { username, assetId, owner } = await setupTestData(contract);
  
      for (const concurrency of concurrencyLevels) {
        const readPromises = Array.from({ length: concurrency }, () =>
          measureFunction(contract, 'ReadAsset', [assetId], true)
        );
        const readStart = performance.now();
        const readDurations = await Promise.all(readPromises);
        const readTotalTime = (performance.now() - readStart) / 1000;
        const validReadDurations = readDurations.filter((d) => d >= 0);
        const readAvgLatency =
          validReadDurations.length > 0
            ? validReadDurations.reduce((sum, latency) => sum + latency, 0) / validReadDurations.length
            : -1;
        const readTPS = validReadDurations.length / readTotalTime;
  
        const assetsPromises = Array.from({ length: concurrency }, () =>
          measureFunction(contract, 'GetAssetsByOwnerAndName', [owner, 'test-asset', 'DEMO'], true)
        );
        const assetsStart = performance.now();
        const assetsDurations = await Promise.all(assetsPromises);
        const assetsTotalTime = (performance.now() - assetsStart) / 1000;
        const validAssetsDurations = assetsDurations.filter((d) => d >= 0);
        const assetsAvgLatency =
          validAssetsDurations.length > 0
            ? validAssetsDurations.reduce((sum, latency) => sum + latency, 0) / validAssetsDurations.length
            : -1;
        const assetsTPS = validAssetsDurations.length / assetsTotalTime;
  
        results.push({
          concurrency,
          readAssetAvgLatency: readAvgLatency.toFixed(3),
          readAssetTPS: readTPS.toFixed(2),
          getAssetsByOwnerAndNameAvgLatency: assetsAvgLatency.toFixed(3),
          getAssetsByOwnerAndNameTPS: assetsTPS.toFixed(2),
        });
      }
  
      await fs.writeFile(
        path.join(__dirname, 'query_latency_benchmark.json'),
        JSON.stringify(results, null, 2)
      );
  
      await cleanupTestData(contract, username, assetId);
      return results;
    } catch (error) {
      console.error('Error in benchmarkQueryLatency:', error.message);
      throw error;
    } finally {
      if (gateway) await gateway.disconnect();
    }
  }



async function runAllBenchmarks() {
  console.log('Starting benchmarks...');

  try {
    console.log('Running API call times benchmark...');
    const apiCallResults = await benchmarkApiCallTimes();
    console.log('API Call Times Results:', JSON.stringify(apiCallResults, null, 2));

    console.log('Running create asset benchmark...');
    const createAssetResults = await benchmarkCreateAsset();
    console.log('Create Asset Results:', JSON.stringify(createAssetResults, null, 2));

    console.log('Running query latency benchmark...');
    const queryLatencyResults = await benchmarkQueryLatency();
    console.log('Query Latency Results:', JSON.stringify(queryLatencyResults, null, 2));

    return {
      apiCallTimes: apiCallResults,
      createAsset: createAssetResults,
      queryLatency: queryLatencyResults,
    };
  } catch (error) {
    console.error('Error running benchmarks:', error.stack);
    throw error;
  }
}
runAllBenchmarks()
  .then((results) => {
    console.log('Benchmarks completed successfully.');
    console.log('Results:', JSON.stringify(results, null, 2));
  })
  .catch((error) => {
    console.error('Benchmarking failed:', error.stack);
    process.exit(1);
  });