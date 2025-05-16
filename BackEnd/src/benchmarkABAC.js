
'use strict';

const path = require('path');
const fs = require('node:fs/promises');
const { Wallets, Gateway } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const { TextEncoder } = require('node:util');
const { split } = require('shamir');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    CHANNEL_NAME: 'sipfs',
    CHAINCODE_NAME: 'basic',
    USERS: {
        OWNER: {
            USERNAME: 'dd1',
            TYPE: 'owner',
            WALLET_PATH: path.join(__dirname, 'walletOwner'),
            CCP_PATH: path.resolve(
                __dirname, '..', '..', '..', '..',
                'test-network', 'organizations', 'peerOrganizations',
                'org1.example.com', 'connection-org1.json'
            ),
            ORG_MSP: 'Org1MSP',
            CA_NAME: 'ca.org1.example.com',
            AFFILIATION: 'org1.department1'
        },
        REQUESTER: {
            USERNAME: 'dr1',
            TYPE: 'requester',
            WALLET_PATH: path.join(__dirname, 'walletRequester'),
            CCP_PATH: path.resolve(
                __dirname, '..', '..', '..', '..',
                'test-network', 'organizations', 'peerOrganizations',
                'org2.example.com', 'connection-org2.json'
            ),
            ORG_MSP: 'Org2MSP',
            CA_NAME: 'ca.org2.example.com',
            AFFILIATION: 'org2.department1'
        }
    },
    GATEWAY_OPTIONS: {
        discovery: { enabled: true, asLocalhost: true },
        eventHandlerOptions: { commitTimeout: 10000, endorseTimeout: 10000 },
        connectionTimeout: 1200000,
        clientConfig: {
            'grpc.keepalive_time_ms': 10000,
            'grpc.keepalive_timeout_ms': 20000,
            'grpc.http2.max_pings_without_data': 0
        }
    }
};

// Admin Enrollment Function
async function enrollAdmin(orgConfig) {
    const { USERNAME, TYPE, WALLET_PATH, CCP_PATH, ORG_MSP, CA_NAME } = orgConfig;
    try {
        const ccp = JSON.parse(await fs.readFile(CCP_PATH, 'utf8'));
        const caInfo = ccp.certificateAuthorities[CA_NAME];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false });

        const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log(`Admin identity already exists in wallet at ${WALLET_PATH} for ${TYPE}`);
            return;
        }

        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId: ORG_MSP,
            type: 'X.509'
        };

        await wallet.put('admin', x509Identity);
        console.log(`Enrolled admin for ${TYPE} at ${WALLET_PATH}`);
    } catch (error) {
        console.error(`Failed to enroll admin for ${TYPE}: ${error.message}`);
        throw new Error(`Failed to enroll admin for ${TYPE}: ${error.message}`);
    }
}

async function enrollAllAdmins() {
    try {
        await enrollAdmin(CONFIG.USERS.OWNER);
        await enrollAdmin(CONFIG.USERS.REQUESTER);
        console.log('All admin enrollments completed successfully');
    } catch (error) {
        console.error('Admin enrollment failed:', error.message);
        throw error;
    }
}

// Utility Functions
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
        role: [`doctor${i}`],
        dept: ['cardiology']
    }));

    const hashedAttributes = hashKeyValuePairs(policyAttributes);

    const fragmentsMap = hashedAttributes.map((attr, index) => ({
        ...attr,
        share: shares[index + 1]
    }));

    return { fragmentsMap, hashedAttributes };
}

async function ensureAdminIdentity(wallet, walletPath, ccp, caName, orgMSP) {
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        throw new Error(`Admin identity not found in wallet at ${walletPath}. Enrollment failed.`);
    }
    console.log(`Admin identity verified in wallet at ${walletPath}`);
    return adminIdentity;
}

async function connectToUserGateway(userConfig) {
    const { USERNAME, TYPE, WALLET_PATH, CCP_PATH, ORG_MSP, CA_NAME, AFFILIATION } = userConfig;
    console.log(`Connecting as ${USERNAME} (${TYPE}) with wallet: ${WALLET_PATH}`);

    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    let identity = await wallet.get(USERNAME);

    if (!identity) {
        console.log(`Identity for ${USERNAME} not found. Registering and enrolling...`);

        const ccp = JSON.parse(await fs.readFile(CCP_PATH, 'utf8'));
        const caInfo = ccp.certificateAuthorities[CA_NAME];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false });

        const adminIdentity = await ensureAdminIdentity(wallet, WALLET_PATH, ccp, CA_NAME, ORG_MSP);
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        try {
            const secret = await ca.register({
                affiliation: AFFILIATION,
                enrollmentID: USERNAME,
                role: 'client'
            }, adminUser);

            const enrollment = await ca.enroll({
                enrollmentID: USERNAME,
                enrollmentSecret: secret
            });

            identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes()
                },
                mspId: ORG_MSP,
                type: 'X.509'
            };

            await wallet.put(USERNAME, identity);
            console.log(`Successfully registered and enrolled ${USERNAME} at ${WALLET_PATH}`);
        } catch (error) {
            console.error(`Failed to register/enroll ${USERNAME}: ${error.message}`);
            throw new Error(`Failed to register/enroll ${USERNAME}: ${error.message}`);
        }
    } else {
        console.log(`Identity for ${USERNAME} found in wallet`);
    }

    const ccp = JSON.parse(await fs.readFile(CCP_PATH, 'utf8'));
    const gateway = new Gateway();

    try {
        await gateway.connect(ccp, {
            wallet,
            identity: USERNAME,
            ...CONFIG.GATEWAY_OPTIONS
        });
        console.log(`Gateway connected for ${USERNAME}`);
        return gateway;
    } catch (error) {
        console.error(`Failed to connect gateway for ${USERNAME}: ${error.message}`);
        throw error;
    }
}

async function setupTestData(ownerContract, requesterContract) {
    const userId = generateUniqueId('user');
    const resId = generateUniqueId('res');
    const policyId = resId;
    const owner = CONFIG.USERS.OWNER.USERNAME;
    const requester = CONFIG.USERS.REQUESTER.USERNAME;
    const key = generateRandomAccessKey();
    const hashAccessKey = crypto.createHash('sha256').update(key).digest('hex');
    const policyAttributes = [{ role: ['doctor'], dept: ['cardiology'] }];
    const hashedAttributes = hashKeyValuePairs(policyAttributes);
    const { fragmentsMap } = generateShamirFragments(key, 2, 2);

    // Register User
    let userExists = false;
    try {
        await ownerContract.evaluateTransaction('QueryUser', userId);
        userExists = true;
        console.log(`User ${userId} already exists`);
    } catch (e) {
        if (e.message.includes('does not exist')) {
            await ownerContract.submitTransaction('UserRegister', userId, 'TestUser');
            console.log(`User ${userId} created`);
        } else {
            console.error(`Error checking user ${userId}: ${e.message}`);
            throw e;
        }
    }

    // Enroll Resource
    let resourceExists = false;
    try {
        await ownerContract.evaluateTransaction('QueryResource', resId);
        resourceExists = true;
        console.log(`Resource ${resId} already exists`);
    } catch (e) {
        if (e.message.includes('does not exist')) {
            await ownerContract.submitTransaction(
                'ResourceEnroll',
                resId,
                owner,
                'TestResource',
                `ipfs://${hashAccessKey}`
            );
            console.log(`Resource ${resId} created`);
        } else {
            console.error(`Error checking resource ${resId}: ${e.message}`);
            throw e;
        }
    }

    // Create Policy
    let policyExists = false;
    try {
        await ownerContract.evaluateTransaction('QueryPolicy', policyId);
        policyExists = true;
        console.log(`Policy ${policyId} already exists`);
    } catch (e) {
        if (e.message.includes('does not exist')) {
            await ownerContract.submitTransaction(
                'AddPolicy',
                policyId,
                JSON.stringify({
                    ResId: resId,
                    OwnerId: owner,
                    ResName: 'TestResource'
                }),
                JSON.stringify({
                    P_Subject: [[{ name: 'role', value: 'doctor' }]],
                    P_Environment: {
                        startTime: '2023-01-01T00:00:00Z',
                        endTime: '2025-12-31T23:59:59Z'
                    }
                })
            );
            const policyCheck = await ownerContract.evaluateTransaction('QueryPolicy', policyId);
            console.log(`Policy ${policyId} created: ${policyCheck.toString()}`);
        } else {
            console.error(`Error checking policy ${policyId}: ${e.message}`);
            throw e;
        }
    }

    // Store Secret
    const secretToken = Buffer.from(`token_${generateUniqueId('secret')}`).toString('hex');
    try {
        await ownerContract.submitTransaction(
            'StoreSecret',
            JSON.stringify([{ name: 'role', value: 'doctor' }]),
            secretToken
        );
        console.log(`Secret stored for policy ${policyId}`);
    } catch (e) {
        console.error(`Error storing secret: ${e.message}`);
    }

    return { userId, resId, policyId, owner, requester, secretToken };
}

async function cleanupTestData(contract, userId, resId, policyId) {
    if (policyId) {
        try {
            await contract.submitTransaction('DeletePolicy', policyId);
            console.log(`Deleted policy ${policyId}`);
        } catch (e) {
            console.log(`Policy ${policyId} not found, skipping: ${e.message}`);
        }
    }
    if (resId) {
        console.log(`Skipping resource deletion for ${resId} (no DeleteResource function)`);
    }
    if (userId) {
        console.log(`Skipping user deletion for ${userId} (no DeleteUser function)`);
    }
}

async function cleanupResourcesBatch(contract, resIds) {
    const batchSize = 5;
    for (let i = 0; i < resIds.length; i += batchSize) {
        const batch = resIds.slice(i, i + batchSize);
        await Promise.all(batch.map(resId => cleanupTestData(contract, null, resId, null)));
        console.log(`Completed cleanup batch ${i / batchSize + 1}/${Math.ceil(resIds.length / batchSize)}`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function measureFunction(contract, functionName, args, isQuery) {
    console.log(`Executing ${functionName} with args: ${JSON.stringify(args)}`);
    const startTime = performance.now();
    try {
        if (functionName === 'UserRegister') {
            const userId = args[0];
            try {
                await contract.evaluateTransaction('QueryUser', userId);
                console.log(`User ${userId} already exists, skipping`);
                return -1;
            } catch (e) {
                if (!e.message.includes('does not exist')) throw e;
            }
        } else if (functionName === 'ResourceEnroll') {
            const resId = args[0];
            try {
                await contract.evaluateTransaction('QueryResource', resId);
                console.log(`Resource ${resId} already exists, skipping`);
                return -1;
            } catch (e) {
                if (!e.message.includes('does not exist')) throw e;
            }
            const key = generateRandomAccessKey();
            const hashAccessKey = crypto.createHash('sha256').update(key).digest('hex');
            const { fragmentsMap } = generateShamirFragments(key, 2, 2);
            args[3] = `ipfs://${hashAccessKey}`;
        } else if (functionName === 'AddPolicy') {
            const policyId = args[0];
            try {
                await contract.evaluateTransaction('QueryPolicy', policyId);
                console.log(`Policy ${policyId} already exists, skipping`);
                return -1;
            } catch (e) {
                if (!e.message.includes('does not exist')) throw e;
            }
        } else if (functionName === 'AccessControl' || functionName === 'UpdatePolicy') {
            const policyId = args[functionName === 'AccessControl' ? 1 : 0];
            let retries = 3;
            while (retries > 0) {
                try {
                    await contract.submitTransaction(functionName, ...args);
                    if (functionName === 'UpdatePolicy') {
                        const policyCheck = await contract.evaluateTransaction('QueryPolicy', policyId);
                        console.log(`Policy ${policyId} verified after update: ${policyCheck.toString()}`);
                    }
                    const endTime = performance.now();
                    return endTime - startTime;
                } catch (error) {
                    if (error.message.includes('Policy for resource') && functionName === 'AccessControl' && retries > 0) {
                        console.log(`Retrying ${functionName} due to policy not found, retries left: ${retries}`);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else if (error.message.includes('MVCC_READ_CONFLICT') && functionName === 'UpdatePolicy' && retries > 0) {
                        console.log(`Retrying ${functionName} due to MVCC_READ_CONFLICT, retries left: ${retries}`);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw error;
                    }
                }
            }
        }

        if (isQuery) {
            await contract.evaluateTransaction(functionName, ...args);
        } else {
            await contract.submitTransaction(functionName, ...args);
            if (functionName === 'AddPolicy') {
                const policyId = args[0];
                try {
                    const policyCheck = await contract.evaluateTransaction('QueryPolicy', policyId);
                    console.log(`Policy ${policyId} verified: ${policyCheck.toString()}`);
                } catch (e) {
                    console.error(`Failed to verify policy ${policyId}: ${e.message}`);
                    throw new Error(`Policy ${policyId} verification failed`);
                }
            }
        }
        const endTime = performance.now();
        return endTime - startTime;
    } catch (error) {
        console.error(`Error in ${functionName}: ${error.message}`);
        return -1;
    }
}

async function benchmarkApiCallTimes() {
    const results = [];
    let ownerGateway, requesterGateway;
    try {
        ownerGateway = await connectToUserGateway(CONFIG.USERS.OWNER);
        requesterGateway = await connectToUserGateway(CONFIG.USERS.REQUESTER);
        const ownerNetwork = await ownerGateway.getNetwork(CONFIG.CHANNEL_NAME);
        const requesterNetwork = await requesterGateway.getNetwork(CONFIG.CHANNEL_NAME);
        const ownerContract = ownerNetwork.getContract(CONFIG.CHAINCODE_NAME);
        const requesterContract = requesterNetwork.getContract(CONFIG.CHAINCODE_NAME);

        const { userId, resId, policyId, owner, requester, secretToken } = await setupTestData(ownerContract, requesterContract);
        const iterations = 5;

        const newUserId = generateUniqueId('user');
        const newResId = generateUniqueId('res');
        const newPolicyId = newResId;

        const functions = [
            { name: 'QueryUser', args: [userId], isQuery: true, userType: 'owner' },
            { name: 'QueryResource', args: [resId], isQuery: true, userType: 'owner' },
            { name: 'QueryPolicy', args: [policyId], isQuery: true, userType: 'owner' },
            {
                name: 'AccessControl',
                args: [JSON.stringify([{ name: 'role', value: 'doctor' }]), resId],
                isQuery: false,
                userType: 'requester'
            },
            {
                name: 'UserRegister',
                args: [newUserId, 'NewUser'],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'ResourceEnroll',
                args: [newResId, owner, 'NewResource', ''],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'AddPolicy',
                args: [
                    newPolicyId,
                    JSON.stringify({ ResId: newResId, OwnerId: owner, ResName: 'NewResource' }),
                    JSON.stringify({
                        P_Subject: [[{ name: 'role', value: 'doctor' }]],
                        P_Environment: { startTime: '2023-01-01T00:00:00Z', endTime: '2025-12-31T23:59:59Z' }
                    })
                ],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'UpdatePolicy',
                args: [
                    policyId,
                    JSON.stringify({ ResId: resId, OwnerId: owner, ResName: 'UpdatedResource' }),
                    JSON.stringify({
                        P_Subject: [[{ name: 'role', value: 'nurse' }]],
                        P_Environment: { startTime: '2023-01-01T00:00:00Z', endTime: '2025-12-31T23:59:59Z' }
                    })
                ],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'DeletePolicy',
                args: [newPolicyId],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'StoreSecret',
                args: [
                    JSON.stringify([{ name: 'role', value: 'doctor' }]),
                    Buffer.from(`token_${generateUniqueId('secret')}`).toString('hex')
                ],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'Decrypt',
                args: [JSON.stringify([{ name: 'role', value: 'doctor' }])],
                isQuery: false,
                userType: 'requester'
            },
            {
                name: 'GenerateSecretShares',
                args: [
                    `secret_${generateUniqueId('secret')}`,
                    JSON.stringify([{ name: 'role', value: 'doctor' }, { name: 'dept', value: 'cardiology' }])
                ],
                isQuery: false,
                userType: 'owner'
            },
            {
                name: 'ReconstructSecret',
                args: () => {
                    const secret = `secret_${generateUniqueId('secret')}`;
                    const shares = Array(2).fill().map((_, i) => ({
                        index: i + 1,
                        share: Buffer.from(`${secret}-share-${i + 1}`).toString('hex')
                    }));
                    return [JSON.stringify(shares)];
                },
                isQuery: false,
                userType: 'owner'
            }
        ];

        const policyCreationStatus = {};
        for (const func of functions) {
            let totalTime = 0;
            const successfulIterations = [];
            const contract = func.userType === 'requester' ? requesterContract : ownerContract;

            if (func.isQuery) {
                const promises = Array.from({ length: iterations }, (_, i) =>
                    measureFunction(contract, func.name, typeof func.args === 'function' ? func.args() : func.args, func.isQuery)
                        .then(duration => ({ iteration: i + 1, duration }))
                );
                const iterationResults = await Promise.all(promises);
                for (const { iteration, duration } of iterationResults) {
                    if (duration >= 0) {
                        totalTime += duration;
                        successfulIterations.push({ iteration, latency: duration.toFixed(3) });
                    }
                }
            } else {
                for (let i = 0; i < iterations; i++) {
                    if (func.name === 'DeletePolicy' && !policyCreationStatus[func.args[0]]) {
                        console.log(`Skipping DeletePolicy for ${func.args[0]}: policy creation failed`);
                        successfulIterations.push({ iteration: i + 1, latency: -1 });
                        continue;
                    }
                    const duration = await measureFunction(contract, func.name, typeof func.args === 'function' ? func.args() : func.args, func.isQuery);
                    if (duration >= 0) {
                        totalTime += duration;
                        successfulIterations.push({ iteration: i + 1, latency: duration.toFixed(3) });
                        if (func.name === 'AddPolicy') {
                            policyCreationStatus[func.args[0]] = true;
                        }
                    } else if (func.name === 'AddPolicy') {
                        policyCreationStatus[func.args[0]] = false;
                    }
                    const delay = func.name === 'UpdatePolicy' ? 500 : 100;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            const avgLatency = successfulIterations.length > 0 ? (totalTime / successfulIterations.length).toFixed(3) : -1;
            results.push({
                function: func.name,
                userType: func.userType,
                avgLatency,
                latencyUnit: 'milliseconds',
                details: successfulIterations
            });
        }

        await cleanupTestData(ownerContract, userId, resId, policyId);
        await cleanupTestData(ownerContract, newUserId, newResId, newPolicyId);
        try {
            await fs.writeFile(path.join(__dirname, 'api_call_times_benchmark.json'), JSON.stringify(results, null, 2));
            console.log('API call times benchmark results saved to api_call_times_benchmark.json');
        } catch (error) {
            console.error(`Failed to write api_call_times_benchmark.json: ${error.message}`);
            throw error;
        }
        return results;
    } catch (error) {
        console.error(`Error in benchmarkApiCallTimes: ${error.message}`);
        throw error;
    } finally {
        if (ownerGateway) await ownerGateway.disconnect();
        if (requesterGateway) await requesterGateway.disconnect();
    }
}

async function benchmarkCreateResource() {
    const iterations = 50;
    const batchSize = 5;
    const results = [];
    const resIds = [];
    let gateway;
    try {
        gateway = await connectToUserGateway(CONFIG.USERS.OWNER);
        const network = await gateway.getNetwork(CONFIG.CHANNEL_NAME);
        const contract = network.getContract(CONFIG.CHAINCODE_NAME);

        for (let batch = 0; batch < iterations; batch += batchSize) {
            const promises = [];
            for (let i = batch; i < Math.min(batch + batchSize, iterations); i++) {
                promises.push((async iteration => {
                    const resId = generateUniqueId('res');
                    resIds.push(resId);
                    const args = [resId, CONFIG.USERS.OWNER.USERNAME, 'TestResource', ''];
                    const duration = await measureFunction(contract, 'ResourceEnroll', args, false);
                    return { iteration: iteration + 1, latency: duration.toFixed(3) };
                })(i));
            }
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            console.log(`Completed batch ${batch / batchSize + 1}/${Math.ceil(iterations / batchSize)}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('Cleaning up resources...');
        await cleanupResourcesBatch(contract, resIds);

        const validResults = results.filter(r => parseFloat(r.latency) >= 0);
        const avgLatency = validResults.length > 0
            ? validResults.reduce((sum, r) => sum + parseFloat(r.latency), 0) / validResults.length
            : -1;

        const output = { iterations, avgLatency: avgLatency.toFixed(3), latencyUnit: 'milliseconds', details: validResults };
        try {
            await fs.writeFile(path.join(__dirname, 'create_resource_benchmark.json'), JSON.stringify(output, null, 2));
            console.log('Create resource benchmark results saved to create_resource_benchmark.json');
        } catch (error) {
            console.error(`Failed to write create_resource_benchmark.json: ${error.message}`);
            throw error;
        }
        return output;
    } catch (error) {
        console.error(`Error in benchmarkCreateResource: ${error.message}`);
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
        gateway = await connectToUserGateway(CONFIG.USERS.OWNER);
        const network = await gateway.getNetwork(CONFIG.CHANNEL_NAME);
        const contract = network.getContract(CONFIG.CHAINCODE_NAME);

        const { resId, policyId } = await setupTestData(contract, contract);

        for (const concurrency of concurrencyLevels) {
            const resourcePromises = Array.from({ length: concurrency }, () =>
                measureFunction(contract, 'QueryResource', [resId], true)
            );
            const resourceStart = performance.now();
            const resourceDurations = await Promise.all(resourcePromises);
            const resourceTotalTime = (performance.now() - resourceStart) / 1000;
            const validResourceDurations = resourceDurations.filter(d => d >= 0);
            const resourceAvgLatency = validResourceDurations.length > 0
                ? validResourceDurations.reduce((sum, latency) => sum + latency, 0) / validResourceDurations.length
                : -1;
            const resourceTPS = validResourceDurations.length / resourceTotalTime;

            const policyPromises = Array.from({ length: concurrency }, () =>
                measureFunction(contract, 'QueryPolicy', [resId], true)
            );
            const policyStart = performance.now();
            const policyDurations = await Promise.all(policyPromises);
            const policyTotalTime = (performance.now() - policyStart) / 1000;
            const validPolicyDurations = policyDurations.filter(d => d >= 0);
            const policyAvgLatency = validPolicyDurations.length > 0
                ? validPolicyDurations.reduce((sum, latency) => sum + latency, 0) / validPolicyDurations.length
                : -1;
            const policyTPS = validPolicyDurations.length / policyTotalTime;

            results.push({
                concurrency,
                queryResourceAvgLatency: resourceAvgLatency.toFixed(3),
                queryResourceTPS: resourceTPS.toFixed(2),
                queryPolicyAvgLatency: policyAvgLatency.toFixed(3),
                queryPolicyTPS: policyTPS.toFixed(2)
            });
        }

        await cleanupTestData(contract, null, resId, policyId);
        try {
            await fs.writeFile(path.join(__dirname, 'query_latency_benchmark.json'), JSON.stringify(results, null, 2));
            console.log('Query latency benchmark results saved to query_latency_benchmark.json');
        } catch (error) {
            console.error(`Failed to write query_latency_benchmark.json: ${error.message}`);
            throw error;
        }
        return results;
    } catch (error) {
        console.error(`Error in benchmarkQueryLatency: ${error.message}`);
        throw error;
    } finally {
        if (gateway) await gateway.disconnect();
    }
}

async function benchmarkEncryptionDecryption() {
    const iterations = 1000;
    const results = {
        encrypt: [],
        decrypt: []
    };
    const text = "This is a test message for encryption and decryption benchmarking.";
    const symmetricKey = crypto.randomBytes(32); // 256-bit key for AES-256-CBC

    try {
        // Benchmark Encryption
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            const encrypted = encrypt(text, symmetricKey);
            const endTime = performance.now();
            const duration = endTime - startTime;
            results.encrypt.push({ iteration: i + 1, latency: duration.toFixed(3) });
        }

        // Benchmark Decryption
        const encryptedText = encrypt(text, symmetricKey); // Encrypt once for decryption tests
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            const decrypted = decrypt(encryptedText, symmetricKey);
            const endTime = performance.now();
            const duration = endTime - startTime;
            results.decrypt.push({ iteration: i + 1, latency: duration.toFixed(3) });
        }

        // Calculate Average Latencies
        const encryptAvgLatency = results.encrypt.reduce((sum, r) => sum + parseFloat(r.latency), 0) / results.encrypt.length;
        const decryptAvgLatency = results.decrypt.reduce((sum, r) => sum + parseFloat(r.latency), 0) / results.decrypt.length;

        const output = {
            iterations,
            encrypt: {
                avgLatency: encryptAvgLatency.toFixed(3),
                latencyUnit: 'milliseconds',
                details: results.encrypt
            },
            decrypt: {
                avgLatency: decryptAvgLatency.toFixed(3),
                latencyUnit: 'milliseconds',
                details: results.decrypt
            }
        };

        try {
            await fs.writeFile(path.join(__dirname, 'encryption_decryption_benchmark.json'), JSON.stringify(output, null, 2));
            console.log('Encryption/Decryption benchmark results saved to encryption_decryption_benchmark.json');
        } catch (error) {
            console.error(`Failed to write encryption_decryption_benchmark.json: ${error.message}`);
            throw error;
        }
        return output;
    } catch (error) {
        console.error(`Error in benchmarkEncryptionDecryption: ${error.message}`);
        throw error;
    }
}

async function runAllBenchmarks() {
    console.log('Starting benchmarks...');
    try {
        // Enroll admin identities before running benchmarks
        console.log('Enrolling admin identities...');
        await enrollAllAdmins();

        console.log('Running API call times benchmark...');
        const apiCallResults = await benchmarkApiCallTimes();
        console.log('API Call Times Results:', JSON.stringify(apiCallResults, null, 2));

        console.log('Running create resource benchmark...');
        const createResourceResults = await benchmarkCreateResource();
        console.log('Create Resource Results:', JSON.stringify(createResourceResults, null, 2));

        console.log('Running query latency benchmark...');
        const queryLatencyResults = await benchmarkQueryLatency();
        console.log('Query Latency Results:', JSON.stringify(queryLatencyResults, null, 2));

        console.log('Running encryption/decryption benchmark...');
        const encryptionDecryptionResults = await benchmarkEncryptionDecryption();
        console.log('Encryption/Decryption Results:', JSON.stringify(encryptionDecryptionResults, null, 2));

        // Save all benchmark results to a consolidated JSON file
        const allResults = {
            apiCallTimes: apiCallResults,
            createResource: createResourceResults,
            queryLatency: queryLatencyResults,
            encryptionDecryption: encryptionDecryptionResults
        };
        try {
            await fs.writeFile(path.join(__dirname, 'all_benchmarks.json'), JSON.stringify(allResults, null, 2));
            console.log('All benchmark results saved to all_benchmarks.json');
        } catch (error) {
            console.error(`Failed to write all_benchmarks.json: ${error.message}`);
            throw error;
        }

        return allResults;
    } catch (error) {
        console.error(`Error running benchmarks: ${error.stack}`);
        throw error;
    }
}

runAllBenchmarks()
    .then(results => {
        console.log('Benchmarks completed successfully.');
        console.log('Results:', JSON.stringify(results, null, 2));
    })
    .catch(error => {
        console.error(`Benchmarking failed: ${error.stack}`);
        process.exit(1);
    });
