const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./models/User');
const mongoose = require("mongoose");
const FabricCAServices = require('fabric-ca-client');
const { Wallets , Gateway } = require('fabric-network');
const WareHouse = require('./models/WareHouse');
const Notification = require('./models/Notification');
const DownloadLog = require('./models/DownloadLog');

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

const channelName = envOrDefault('CHANNEL_NAME', 'sipfs');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');

const storage = multer.memoryStorage();
const upload = multer({ storage });



const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided", data: null, error: null });
    }

    jwt.verify(token, 'secretKey', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Token is not valid", data: null, error: null });
        }
        req.user = user;
        next();
    });
};


const utf8Decoder = new TextDecoder();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());


//===================================

const ccpPath = path.resolve(__dirname, 
    '..',
    '..',
    '..',
    '..',
    "test-network",
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "connection-org1.json");


let ccp ; 
(async () => {
    try {
        const ccpData = await fs.readFile(ccpPath, 'utf8');
        ccp = JSON.parse(ccpData);


    } catch (error) {
        console.error("Error reading connection profile:", error);
    }
})();




//===================================

mongoose.connect('mongodb://192.168.1.10:27017/sipfs', {

}).then(() => console.log('Connected to MongoDB'))
  .catch(error => console.error('MongoDB connection error:', error));


// mongoose.connect('mongodb://192.168.82.214:27017/sipfs', {

// }).then(() => console.log('Connected to MongoDB'))
//   .catch(error => console.error('MongoDB connection error:', error));





//   async function enrollAdmin() {
//     try {
//         console.log("enrolling Admin");

//         const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
//         const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));


//         const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
//         const ca = new FabricCAServices(caURL);


//         const walletPath = path.join(__dirname, 'wallet');
//         const wallet = await Wallets.newFileSystemWallet(walletPath);

//         const adminExists = await wallet.get('admin');
//         if (adminExists) {
//             console.log('Admin identity already exists in the wallet.');
//             return;
//         }

//         const enrollment = await ca.enroll({
//             enrollmentID: 'admin',
//             enrollmentSecret: 'adminpw'
//         });

//         const x509Identity = {
//             credentials: {
//                 certificate: enrollment.certificate,
//                 privateKey: enrollment.key.toBytes(),
//             },
//             mspId: 'Org1MSP',
//             type: 'X.509',
//         };


//         await wallet.put('admin', x509Identity);
//         console.log('Successfully enrolled admin and added to the wallet.');

//     } catch (error) {
//         console.error(`Failed to enroll admin: ${error}`);
//     }
// }

// enrollAdmin();


async function enrollAdminForRequester() {
    const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
    const walletPath = path.join(__dirname, 'walletRequester'); 
    return enrollAdmin(ccpPath, walletPath, 'ca.org2.example.com', 'Org2MSP', 'admin', 'adminpw');
}

async function enrollAdminForOwner() {
    const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const walletPath = path.join(__dirname, 'walletOwner'); 
    return enrollAdmin(ccpPath, walletPath, 'ca.org1.example.com', 'Org1MSP', 'admin', 'adminpw');
}

async function enrollAdmin(ccpPath, walletPath, caName, mspId, adminId, adminSecret) {
    try {
        console.log(`Enrolling admin for ${mspId}`);
        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
        const caURL = ccp.certificateAuthorities[caName].url;
        const ca = new FabricCAServices(caURL);
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const adminExists = await wallet.get(adminId);
        if (adminExists) {
            console.log(`Admin identity for ${mspId} already exists in the wallet.`);
            return;
        }

        const enrollment = await ca.enroll({
            enrollmentID: adminId,
            enrollmentSecret: adminSecret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        await wallet.put(adminId, x509Identity);
        console.log(`Successfully enrolled admin for ${mspId} and added to the wallet with ID ${adminId}.`);

    } catch (error) {
        console.error(`Failed to enroll admin for ${mspId}: ${error}`);
    }
}

enrollAdminForRequester();
enrollAdminForOwner();


// async function connectToUserGateway(username) {
//     const wallet = await Wallets.newFileSystemWallet(walletPath);
//     // console.log("Wallet is: ", wallet);

//     const identity = await wallet.get(username);
//     if (!identity) {
//         throw new Error(`An identity for the user ${username} does not exist in the wallet`);
//     }
//     // console.log("Identity is: ", identity);

//     const ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

//     const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
//     const gateway = new Gateway(); 

//     try {
//         // Connect to the gateway
//         await gateway.connect(ccp, { 
//             wallet,
//             identity: username, // Use the username for the identity
//             discovery: { enabled: true, asLocalhost: true } 
//         });
//         console.log("Gateway connected");
//     } catch (error) {
//         console.error("Failed to connect to gateway:", error);
//         throw new Error(`Error connecting to gateway: ${error.message}`);
//     }

//     return gateway;
// }


async function connectToUserGateway(username, userType) {
    let ccpPath;
    let walletPath;
    if (userType === 'requester') {
        walletPath = path.join(__dirname, 'walletRequester'); 
        ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
    } else if (userType === 'owner') {
        walletPath = path.join(__dirname, 'walletOwner'); 
        ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
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

    await gateway.connect(ccp, { wallet, identity: username, discovery: { enabled: true, asLocalhost: true } });
    return gateway;
}


// async function registerUser(username, role) {
//     try {
//         const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
//         const ca = new FabricCAServices(caURL);

//         const wallet = await Wallets.newFileSystemWallet(walletPath);


//         const userExists = await wallet.get(username);
//         if (userExists) {
//             return { message: `User ${username} already exists!` };
//         }

//         const adminIdentity = await wallet.get('admin');


//         if (!adminIdentity) {
//             return { message: 'Admin identity not found in the wallet. Please register admin first.' };
//         }

//         const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
//         const adminUser = await provider.getUserContext(adminIdentity, 'admin');

//         // Register the new user
//         const secret = await ca.register({
//             affiliation: 'org1.department1',
//             enrollmentID: username,
//             role: 'client',
//             attrs: [{ name: 'role', value: role, ecert: true }]
//         }, adminUser);



//         const enrollment = await ca.enroll({
//             enrollmentID: username,
//             enrollmentSecret: secret
//         });




//         const x509Identity = {
//             credentials: {
//                 certificate: enrollment.certificate,
//                 privateKey: enrollment.key.toBytes(),
//             },
//             mspId: 'Org1MSP',
//             type: 'X.509',
//         };

//         await wallet.put(username, x509Identity);
        

//         return { message: `User ${username} successfully created and added to the wallet.`, publicKey: enrollment.certificate };

//     } catch (error) {
//         return { error: `Error in registration: ${error.message}` };
//     }
// }

async function registerUser(username, role, userType) {
    let ccpPath, caName, mspId , wallet , affiliation;
    if (userType === 'owner') {
        ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        caName = 'ca.org1.example.com';
        mspId = 'Org1MSP';
        affiliation = "org1";
    } else if (userType === 'requester') {
        ccpPath = path.resolve(__dirname, '..', '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
        caName = 'ca.org2.example.com';
        mspId = 'Org2MSP';
        affiliation = "org2";
    } else {
        throw new Error(`Invalid userType: ${userType}`);
    }

    try {
        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
        const caURL = ccp.certificateAuthorities[caName].url;
        const ca = new FabricCAServices(caURL);
        if (userType == "requester")
        {
            wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'walletRequester'));
            
        }
        else if (userType == "owner")
        {
            wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'walletOwner'));
            
        }

        

        const userExists = await wallet.get(username);

        console.log('userExists ' , userExists);


        if (userExists) {
            return { message: `User ${username} already exists!` };
        }

        const adminIdentity = await wallet.get('admin');


        if (!adminIdentity) {
            return { message: 'Admin identity not found in the wallet. Please register admin first.' };
        }


        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        
        

        const secret = await ca.register({
            affiliation: `${affiliation.toLowerCase()}.department1`,
            enrollmentID: username,
            role: 'client',
            attrs: [{ name: 'role', value: role, ecert: true }]
        }, adminUser);

        
        

        const enrollment = await ca.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
        });


        
        

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        await wallet.put(username, x509Identity);
        return { message: `User ${username} successfully created and added to the wallet.`, publicKey: enrollment.certificate };

    } catch (error) {
        return { error: `Error in registration: ${error.message}` };
    }
}



async function initializeIPFS() {
    const { create } = await import('ipfs-core');
    return create();
}


async function downloadFromIPFS(cid) {
    const ipfs = await initializeIPFS();
    try {
        const chunks = [];
        for await (const chunk of ipfs.cat(cid)) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks); // Return the complete file as a buffer
    } finally {
        await ipfs.stop();
    }
}

//------------------- ENDORSEMENT_POLICY_FAILURE BY PASS ENGINE -----------------
async function submitTransactionWithRetry(contract, transactionName, args, retryCount = 5, delay = 2000) {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            //---- Attempt the transaction
            const result = await contract.submitTransaction(transactionName, ...args);
            return result; // Return result if successful
        } catch (error) {
            //------- Check for specific error conditions
            const endorsementFailure = error.message.includes('ENDORSEMENT_POLICY_FAILURE');
            const noValidResponses = error.message.includes('No valid responses from any peers');

            //------------- Log the error and retry if it matches the conditions
            if ((endorsementFailure || noValidResponses) && attempt < retryCount) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`);
                console.warn(`Retrying transaction in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay)); // Wait before retrying
            } else {
                //--------------- If maximum retries reached or other errors, throw the error
                console.error(`Transaction failed after ${attempt} attempts`);
                throw error;
            }
        }
    }
}


async function evaluateTransactionWithRetry(contract, transactionName, args, retryCount = 5, delay = 2000) {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            //---- Attempt the transaction
            const result = await contract.evaluateTransaction(transactionName, ...args);
            return result; // Return result if successful
        } catch (error) {
            //------- Check for specific error conditions
            const endorsementFailure = error.message.includes('ENDORSEMENT_POLICY_FAILURE');
            const noValidResponses = error.message.includes('No valid responses from any peers');

            //------------- Log the error and retry if it matches the conditions
            if ((endorsementFailure || noValidResponses) && attempt < retryCount) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`);
                console.warn(`Retrying transaction in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay)); // Wait before retrying
            } else {
                //--------------- If maximum retries reached or other errors, throw the error
                console.error(`Transaction failed after ${attempt} attempts`);
                throw error;
            }
        }
    }
}

//------------------------------------------------------------------

async function uploadToIPFS(encryptedContent) {
    const ipfs = await initializeIPFS();
    try {
        const { cid } = await ipfs.add(encryptedContent);
        return cid.toString();
    } finally {
        await ipfs.stop(); // Ensure the IPFS instance is stopped
    }
}


app.get('/', (req, res) => {
    res.send('WELCOME TO SIPFS API');
});




app.post('/org1/assets', async (req, res) => {
    const {  id, metaData, cid, policySet, publicKeyOwner, releaseAt, updatedAt } = req.body;

    console.log(id , metaData , cid , policySet , publicKeyOwner , releaseAt , updatedAt );
    try {
        const gateway = await connectToUserGateway("a1" , "owner");

        const network = await gateway.getNetwork('sipfs');
        const contract = network.getContract('basic');

        const result = await contract.submitTransaction('CreateAssetDataOwner', id, metaData, policySet, publicKeyOwner, releaseAt, updatedAt , cid);
        res.status(201).json({ message: 'Asset created in Org1 private collection', result: JSON.parse(result.toString()) });
        
        await gateway.disconnect();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/org1/assets/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const gateway = await connectToUserGateway('a1' , "owner");
        const network = await gateway.getNetwork('sipfs');
        const contract = network.getContract('basic');

        const result = await contract.evaluateTransaction('GetAllAssetsDataOwner');
        res.status(200).json({ result: JSON.parse(result.toString()) });
        
        await gateway.disconnect();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/org2/assets/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const gateway = await connectToUserGateway('w1');
        const network = await gateway.getNetwork('sipfs');
        const contract = network.getContract('basic');

        const result = await contract.evaluateTransaction('ReadPrivateAssetOrg2', id);
        res.status(200).json({ result: JSON.parse(result.toString()) });
        
        await gateway.disconnect();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.post('/login', async (req, res) => {
    const { username, role } = req.body;
    //-----------------------------------------
    if (!username || !role) {
        return res.status(400).send({ success: false, message: "Username and role are required." });
    }
    //-----------------------------------------
    try {

        let walletPath;
        
        switch (role) {
            case "Data Requester":
                walletPath = path.join(__dirname, 'walletRequester');
                break;
            case "Data Owner":
                walletPath = path.join(__dirname, 'walletOwner');
                break;
            default:
                return res.status(400).send({ success: false, message: "Invalid role provided." });
        }

        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const userExists = await wallet.get(username);

        if (!userExists) {
            return res.status(404).send({ success: false, message: "User does not exist." });
        }

        //-------------------------------
        const token = jwt.sign(
            {
                username: username,
                role: role,
                publicKey: userExists.credentials.certificate
            },
            
            'secretKey', 

            { expiresIn: '24h' }
        );
        //-------------------------------

        return res.status(200).send({ success: true, token });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).send({ success: false, message: "Login failed", details: error.message });
    }

});
//--------------------------------------------------
app.post('/users', async (req, res) => {
    const { username, role, policySet } = req.body;
    let result;
    try {

        if (role == "Data Owner")
        {
            result = await registerUser(username, "client" ,  "owner");
            if (result.error) {
                return res.status(500).send({ error: result.error });
            }
        }
        //--------------------------------------
        else if (role == "Data Requester")
        {
            result = await registerUser(username, "client" ,  "requester");
            if (result.error) {
                return res.status(500).send({ error: result.error });
            }
            publicKey = result.publicKey;

            console.log(publicKey);
            //----------------------------------
            const   gateway = await connectToUserGateway(username, 'requester');
            const network = await gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);
            // const policySetHash = crypto.createHash('sha256').update(JSON.stringify(policySet)).digest('hex');
            const currentDate = new Date().toISOString();            
            //-----------------------------------
            await contract.submitTransaction('CreateUser', username, "Data Requester" , currentDate, publicKey, JSON.stringify(policySet));
            // await contract.submitTransaction('CreateUser', username, role, currentDate, publicKey, JSON.stringify(policySet));    


            //--------- JUST for Push Notification Engine -------------
            const newUser = new User({
                username,
                role : "Data Requester",
                policySet,
                publicKey 
            });
    
            await newUser.save();

        }

        res.status(201).send({ message: 'User created successfully' });

    } catch (error) {

        res.status(500).send({ error: 'Failed to create user', details: error.message });
    }
});
//---------------------------------------
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    const { policyAttributes, metadata } = req.body;

    if (req.user.role === "Data Requester") {
        return res.status(403).send({ error: 'Access Denied' }); 
    }

    try {
        const { cid, assetId, publicKeyOwner, fileExtension , fileName } = await uploadFileToIPFS(req.file.buffer , req);
        //--------------------------------------------

        const currentDate = new Date().toISOString();
        // const policySetHash = crypto.createHash('sha256').update(JSON.stringify(policyAttributes)).digest('hex');
        
        // console.log(policyAttributes , "hash-> " , policySetHash);

        //----------------------------------------------
        const gateway = await connectToUserGateway(req.user.username, "owner")
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
    

        //----------------------------------------------
        try {
            //------------------------------------------
             
            // Public Collection 
            // const resultCreateAsset = await contract.submitTransaction('CreateAsset',
            //     assetId, 
            //     JSON.stringify(metadata),
            //     JSON.stringify(policyAttributes),
            //     publicKeyOwner, 
            //     currentDate, 
            //     currentDate,
            //     req.user.username,
            //     fileName,
            //     cid
            // );

            // console.log("[+][PUBLIC] CreateAsset Commited Success ")


            
            // const result = await submitTransactionWithRetry(
            //     contract, 
            //     'CreateAssetDataOwner', 
            //     [assetId, cid], 
            //     5, 
            //     1000 
            // );
            
            // console.log("[+][PRIVATE] CreateAsset Commited Success  ")


            const result = await submitTransactionWithRetry(
                contract, 
                'CreateAsset', 
                [assetId,
                JSON.stringify(metadata) ,
                JSON.stringify(policyAttributes), 
                publicKeyOwner,currentDate, 
                currentDate,
                req.user.username,
                fileName,
                cid], 
                5, 
                1000 
            );

            //----------------------------------------
    
    
    
        } catch (error) {
            console.log(error);
            throw new Error("[x] Failed to submit transaction to Hyperledger Fabric");
        }
    
        try {
    
            const newAsset = new WareHouse({
                fileId: assetId,
                publicKey: publicKeyOwner,
                fileName : fileName,
                fileExtension : fileExtension
            });
            await newAsset.save();
    
    
            await createNotificationForDataRequesters(req.user.username, publicKeyOwner);
        } catch (error) {
    
            // await contract.submitTransaction('DeleteAsset', assetId);
            throw new Error("[x] Failed to save asset in MongoDB");
        }
    
        //--------------------------------------------
        res.status(201).json({
            success: true,
            message: "Asset Created Successfully",
            data: {
                assetId,
                metadata: JSON.parse(metadata),
                policyAttributes: JSON.parse(policyAttributes),
                publicKeyOwner,
                owner: req.user.username,
                fileExtension,
                cid : cid
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create asset",
            error: { message: error.message }
        });
    }
});



app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    const { policyAttributes, metadata } = req.body;

    if (req.user.role === "Data Requester") {
        return res.status(403).send({ error: 'Access Denied' }); 
    }

    try {
        const { cid, assetId, publicKeyOwner, fileExtension , fileName } = await uploadFileToIPFS(req.file.buffer , req);
        //--------------------------------------------

        const currentDate = new Date().toISOString();
        // const policySetHash = crypto.createHash('sha256').update(JSON.stringify(policyAttributes)).digest('hex');
        
        // console.log(policyAttributes , "hash-> " , policySetHash);

        //----------------------------------------------
        const gateway = await connectToUserGateway(req.user.username, "owner")
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
    

        //----------------------------------------------
        try {
            //------------------------------------------
             
            // Public Collection 
            // const resultCreateAsset = await contract.submitTransaction('CreateAsset',
            //     assetId, 
            //     JSON.stringify(metadata),
            //     JSON.stringify(policyAttributes),
            //     publicKeyOwner, 
            //     currentDate, 
            //     currentDate,
            //     req.user.username,
            //     fileName,
            //     cid
            // );

            // console.log("[+][PUBLIC] CreateAsset Commited Success ")


            
            // const result = await submitTransactionWithRetry(
            //     contract, 
            //     'CreateAssetDataOwner', 
            //     [assetId, cid], 
            //     5, 
            //     1000 
            // );
            
            // console.log("[+][PRIVATE] CreateAsset Commited Success  ")


            const result = await submitTransactionWithRetry(
                contract, 
                'CreateAsset', 
                [assetId,
                JSON.stringify(metadata) ,
                JSON.stringify(policyAttributes), 
                publicKeyOwner,currentDate, 
                currentDate,
                req.user.username,
                fileName,
                cid], 
                5, 
                1000 
            );

            //----------------------------------------
    
    
    
        } catch (error) {
            console.log(error);
            throw new Error("[x] Failed to submit transaction to Hyperledger Fabric");
        }
    
        try {
    
            const newAsset = new WareHouse({
                fileId: assetId,
                publicKey: publicKeyOwner,
                fileName : fileName,
                fileExtension : fileExtension
            });
            await newAsset.save();
    
    
            await createNotificationForDataRequesters(req.user.username, publicKeyOwner);
        } catch (error) {
    
            // await contract.submitTransaction('DeleteAsset', assetId);
            throw new Error("[x] Failed to save asset in MongoDB");
        }
    
        //--------------------------------------------
        res.status(201).json({
            success: true,
            message: "Asset Created Successfully",
            data: {
                assetId,
                metadata: JSON.parse(metadata),
                policyAttributes: JSON.parse(policyAttributes),
                publicKeyOwner,
                owner: req.user.username,
                fileExtension,
                cid : cid
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create asset",
            error: { message: error.message }
        });
    }
});



app.post('/uploadTest', authenticateToken, upload.single('file'), async (req, res) => {
    const { policyAttributes, metadata } = req.body;

    if (req.user.role === "Data Requester") {
        return res.status(403).send({ error: 'Access Denied' }); 
    }

    try {
        const { cid, assetId, publicKeyOwner, fileExtension , fileName } = await uploadFileToIPFS(req.file.buffer , req);
        //--------------------------------------------

        const currentDate = new Date().toISOString();
        // const policySetHash = crypto.createHash('sha256').update(JSON.stringify(policyAttributes)).digest('hex');
        
        // console.log(policyAttributes , "hash-> " , policySetHash);

        //----------------------------------------------
        const gateway = await connectToUserGateway(req.user.username, "owner")
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
    

        //----------------------------------------------
        try {
            //------------------------------------------
             
            // Public Collection 
            // const resultCreateAsset = await contract.submitTransaction('CreateAsset',
            //     assetId, 
            //     JSON.stringify(metadata),
            //     JSON.stringify(policyAttributes),
            //     publicKeyOwner, 
            //     currentDate, 
            //     currentDate,
            //     req.user.username,
            //     fileName,
            //     cid
            // );

            // console.log("[+][PUBLIC] CreateAsset Commited Success ")


            
            // const result = await submitTransactionWithRetry(
            //     contract, 
            //     'CreateAssetDataOwner', 
            //     [assetId, cid], 
            //     5, 
            //     1000 
            // );
            
            // console.log("[+][PRIVATE] CreateAsset Commited Success  ")


            const result = await submitTransactionWithRetry(
                contract, 
                'CreateAsset', 
                [assetId,
                JSON.stringify(metadata) ,
                JSON.stringify(policyAttributes), 
                publicKeyOwner,currentDate, 
                currentDate,
                req.user.username,
                fileName,
                cid], 
                5, 
                1000 
            );

            //----------------------------------------
    
    
    
        } catch (error) {
            console.log(error);
            throw new Error("[x] Failed to submit transaction to Hyperledger Fabric");
        }
    
        try {
    
            const newAsset = new WareHouse({
                fileId: assetId,
                publicKey: publicKeyOwner,
                fileName : fileName,
                fileExtension : fileExtension
            });
            await newAsset.save();
    
    
            await createNotificationForDataRequesters(req.user.username, publicKeyOwner);
        } catch (error) {
    
            // await contract.submitTransaction('DeleteAsset', assetId);
            throw new Error("[x] Failed to save asset in MongoDB");
        }
    
        //--------------------------------------------
        res.status(201).json({
            success: true,
            message: "Asset Created Successfully",
            data: {
                assetId,
                metadata: JSON.parse(metadata),
                policyAttributes: JSON.parse(policyAttributes),
                publicKeyOwner,
                owner: req.user.username,
                fileExtension,
                cid : cid
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to create asset",
            error: { message: error.message }
        });
    }
});


//-------------- Helper function to upload the file to IPFS 
async function uploadFileToIPFS(fileBuffer , req) {
    const fileExtension = path.extname(req.file.originalname); 
    const fileName = req.file.originalname;

    let cid;
    
    try {
        cid = await uploadToIPFS(fileBuffer);
    } catch (error) {
        throw new Error("Failed to upload file to IPFS");
    }

    const assetId = Math.floor(10000 + Math.random() * 90000).toString(); 
    const publicKeyOwner = req.user.publicKey;

    return { cid, assetId, publicKeyOwner, fileExtension , fileName };
}

//-------------- Helper function for handling asset creation 


//----- Helper function to send notifications to all Data Requesters
async function createNotificationForDataRequesters(uploaderName, publicKeyOwner) {
    const dataRequesters = await User.find({ role: "Data Requester" });
    const requesterIds = dataRequesters.map(requester => requester._id);

    const notification = new Notification({
        message: "A new asset uploaded",
        uploaderName: uploaderName, // Owner's Username
        publicKey: publicKeyOwner,
        unreadBy: requesterIds, // All DataRequesters
    });

    await notification.save();
}




app.get('/notifications', authenticateToken , async (req, res) => {
    const reqPublicKey = req.user.publicKey;
    const user = await User.findOne({ publicKey : reqPublicKey });
    console.log("id of requseter is  : " , user);

    try {
      const notifications = await Notification.find({ unreadBy: user._id });
      res.status(200).send(notifications);
    } catch (error) {
      res.status(500).send({ error: "An error occurred while fetching notifications." });
    }
});
  
app.delete('/notifications/:notificationId',authenticateToken, async (req, res) => {

        const { notificationId } = req.params;
        const reqPublicKey = req.user.publicKey;
        const user = await User.findOne({publicKey: reqPublicKey });


        const dataRequesterId = user._id; 

        try {
            await Notification.findByIdAndUpdate(
            notificationId,
            { $pull: { unreadBy: dataRequesterId } } 
            );

            res.status(200).send({ message: "Notification removed for this user." });
        } 
            catch (error) {
            res.status(500).send({ error: "An error occurred while deleting the notification." });
            }

});


app.post('/grantAccess', authenticateToken, async (req, res) => {
    const { assetID } = req.body;
    const username = req.user.username;
    const currentDate = new Date().toISOString();

    try {
        const gateway = await connectToUserGateway(username, "requester");
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 
        console.log("[+][grantAccess] Requester Connected to GateWay");

        const resultBytes = await contract.evaluateTransaction('CheckAccess', username, assetID);
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);

        
        if (!result || result.length === 0) {
            return res.status(500).json({ error: "Invalid or empty response from chaincode." });
        }

        if (!result.access) {
            return res.status(403).json({ error: "Access Denied!" });
        }

        // await gateway.disconnect();

        const owner = result.owner;
        // console.log(result)
        const ownerGateway = await connectToUserGateway(owner, "owner");
        const ownerNetwork = await ownerGateway.getNetwork(channelName);
        const ownerContract = ownerNetwork.getContract(chaincodeName); 

        const CID = await evaluateTransactionWithRetry(ownerContract, 'ReadAssetDataOwner', [assetID], 10, 2000);
        const getcid = JSON.parse(CID);

        console.log(getcid);

        if (!getcid.cid) {
            return res.status(404).json({ error: "CID not found, try again!" });
        }

        const fileBuffer = await downloadFromIPFS(getcid.cid);
        const warehouseEntry = await WareHouse.findOne({ fileId: assetID });


        const downloadLog = new DownloadLog({
            fileId: assetID,
            requester: { username: username },
            downloadDate: currentDate,
            downloadCount: 1,
            fileName: warehouseEntry.fileName,
            ownerDetails: owner
        });

        const existingLog = await DownloadLog.findOne({ fileId: assetID, 'requester.username': username });
        if (existingLog) {
            existingLog.downloadCount += 1;
            await existingLog.save();
        } else {
            await downloadLog.save();
        }

        // await ownerGateway.disconnect();

        res.setHeader('Content-Disposition', `attachment; filename=${warehouseEntry.fileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);

    } catch (error) {
        console.error("Error in /grantAccess:", error);
        const errorMessage = error.details?.[0]?.message || error.message;
        res.status(500).json({ error: errorMessage });
    }
});




app.post('/checkAccess', async (req, res) => {
    const { username, assetID } = req.body;

    if (!username || !assetID) {
    
        return res.status(400).json({ error: 'username and assetID are required' });
    
    }

    try {

        const gateway = await connectToUserGateway(username  , "requester");
        console.log("[+][grantAccess] Requester Connected to GateWay");
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        const resultBytes = await contract.evaluateTransaction('CheckAccess', username, assetID);
        
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);

        if (!result || result.length === 0) {
            return res.status(500).json({ error: "Invalid or empty response from chaincode." });
        }

        res.status(200).json({data : result});

    } catch (error) {
        console.error("Error in /grantAccess:", error);

        const errorMessage = error.details && error.details[0] ? error.details[0].message : error.message;
        res.status(500).json({ error: errorMessage });
    } 
});



app.post('/assets/public-key', authenticateToken ,  async (req, res) => {
    try {

        let { publicKey } = req.body;
        
        if (!publicKey) {
            return res.status(400).send({ error: 'Public key is required' });
        }

        publicKey = decodeURIComponent(publicKey);


        if (publicKey.startsWith('"') && publicKey.endsWith('"')) {
            publicKey = publicKey.slice(1, -1);
        }


        const normalizeKey = (key) => key.replace(/\\n/g, '\n').trim();
        const normalizedPublicKey = normalizeKey(publicKey);


        const gateway = await connectToUserGateway(req.user.username , "requester");
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        const resultBytes = await contract.evaluateTransaction('GetAllAssets');
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        
        let filteredAssets = result.map(asset => asset.Record);

        

        // Filter assets by comparing normalized public keys
        filteredAssets = filteredAssets.filter(
            
            asset => asset.publicKeyOwner && normalizeKey(asset.publicKeyOwner) === normalizedPublicKey
        );

        if (!filteredAssets.length) {
            return res.status(500).send({ success: false, error: "Public key is invalid or there is no asset" });
        }

        

        res.status(200).send({ success: true, files: filteredAssets });
    } catch (error) {
        res.status(500).send({ success: false, error: 'Failed to get assets', details: error.message });
    }
});

app.post('/assets/metadata', authenticateToken,  async (req, res) => {
    try {
        const { tags } = req.body; // Retrieve metadata tags from query parameters


        const metadataTags = Array.isArray(tags) ? tags : [tags]; // Ensure it's an array


        console.log(metadataTags);

        const gateway = await connectToUserGateway(req.user.username , "requester");
        console.log("Connected to user gateway");
        
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        

        // const gateway = await connectToGateway();
        // const contract = gateway.getNetwork(channelName).getContract(chaincodeName);
        const resultBytes = await contract.evaluateTransaction('GetAllAssets');
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);

        let filteredAssets = result.map(asset => asset.Record);

        filteredAssets = filteredAssets.filter(asset => asset.MetaData && 

            metadataTags.some(tag => asset.MetaData.includes(tag))
        );


        

        if (!filteredAssets.length)
            {
                res.status(500).send({success : false , error : "Asset Not Find"});
                return;
            }
    

        res.status(200).send({ success: true, files: filteredAssets });
    } catch (error) {
        res.status(500).send({ error: 'Failed to get assets', details: error.message });
    }
});


app.post('/assets/blockUser', authenticateToken, async (req, res) => {
    const { requesterUsername, fileId } = req.body;
  
    try {

        const gateway = await connectToUserGateway(req.user.username , "owner");
        const currentDate = new Date().toISOString();        
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        console.log("[!][BlockUSer] Started " , req.user.username , requesterUsername);
        const resultBytes = await contract.submitTransaction('RevokePermanentAccess', requesterUsername  , fileId,  currentDate);
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log(result);
    
        res.json({ success: true, message: "User blocked successfully" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });


  app.get('/assets', authenticateToken, async (req, res) => {
    try {
        let gateway;
        if (req.user.role == "Data Owner") {
            gateway = await connectToUserGateway(req.user.username, "owner");
        } else if (req.user.role == "Data Requester") {
            gateway = await connectToUserGateway(req.user.username, "requester");
        }

        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const resultBytes = await contract.evaluateTransaction('GetAllAssets');
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);

        let filteredAssets = result.map(asset => asset.Record);

        // Filter assets based on user's public key
        const publicKeyOwner = req.user.publicKey;
        const userAssets = filteredAssets.filter(asset => asset.publicKeyOwner === publicKeyOwner);

        // Remove duplicates
        let uniqueAssets = Array.from(new Set(userAssets.map(asset => JSON.stringify(asset))))
            .map(asset => JSON.parse(asset));

        console.log("===>  " , userAssets);
        // Get download count, revoked status, and requester info for each asset
        const assetsWithDetails = await Promise.all(
            uniqueAssets.map(async (asset) => {
                const downloadLogs = await DownloadLog.find({ fileId: asset.ID });
        
                const downloadCount = downloadLogs.reduce((count, log) => count + log.downloadCount, 0);
        
                const requesters = downloadLogs.map((log) => {
                    const revokedUser = asset.revokedAccess.find((revoked) => revoked.username === log.requester.username);
        
                    return {
                        username: log.requester.username,
                        downloadDate: log.downloadDate,
                        revoked: !!revokedUser, // true if revoked, false otherwise
                        revokedDate: revokedUser ? revokedUser.revokedDate : null // add revocation date if available
                    };
                });
        
                const uniqueRequesters = [...new Map(requesters.map(req => [req.username, req])).values()];
        
                return { 
                    ...asset, 
                    downloadCount, 
                    requesters: uniqueRequesters 
                };
            })
        );

        res.status(200).send({ success: true, files: assetsWithDetails });
    } catch (error) {
        res.status(500).send({ error: 'Failed to get assets', details: error.message });
    }
});


app.get('/assets/cid/:cid', authenticateToken, async (req, res) => {
    const cid = req.params.cid;
  
    try {

        const ownerGateway = await connectToUserGateway(owner, "owner");
        const ownerNetwork = await ownerGateway.getNetwork(channelName);
        const ownerContract = ownerNetwork.getContract(chaincodeName); 

        const CID = await evaluateTransactionWithRetry(ownerContract, 'ReadAssetDataOwner', [assetID], 10, 2000);
        const getcid = JSON.parse(CID);

        console.log(getcid);

        if (!getcid.cid) {
            return res.status(404).json({ error: "CID not found, try again!" });
        }


    } catch (error) {
      res.status(500).send({ error: 'Failed to find file by CID', details: error.message });
    }
  });  

app.get('/assets/:id', authenticateToken,  async (req, res) => {
    const assetId = req.params.id;
    username = req.user.username;

    console.log(req.user.role);

    try {
        
        const gateway = await connectToUserGateway(username);
        console.log("Connected to user gateway");
        
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        


        // const gateway = await connectToGateway();
        // const contract = gateway.getNetwork(channelName).getContract(chaincodeName);
        const resultBytes = await contract.evaluateTransaction('ReadAsset', assetId);
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: 'Failed to read asset', details: error.message });
    }
});

app.put('/assets/:id' , authenticateToken ,   async (req, res) => {
    const assetId = req.params.id;
    const { metaData, policySet } = req.body;
    publicKeyOwner = req.user.publicKey;

    console.log(metaData , policySet);
    try {

        const gateway = await connectToUserGateway(req.user.username , "owner");

        
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName); 

        const existingAssetBytes = await contract.evaluateTransaction('ReadAsset', assetId);
        const existingAssetJson = utf8Decoder.decode(existingAssetBytes);
        const existingAsset = JSON.parse(existingAssetJson);
        const releasedAt = existingAsset.ReleasedAt;
        const currentDate = new Date().toISOString();
        console.log(existingAsset);

        
        // const policySetHash = crypto.createHash('sha256').update(JSON.stringify(policySet)).digest('hex');
        // console.log(policySet , "hash-> " , policySetHash);

        await contract.submitTransaction('UpdateAsset', assetId, JSON.stringify(metaData), JSON.stringify(policySet), publicKeyOwner, releasedAt, currentDate , existingAsset.owner , existingAsset.name);
        
        res.status(200).send({ success : true ,  message: 'Asset updated successfully' });
    } catch (error) {
        res.status(500).send({ success: false,  message: 'Failed to update asset', details: error.message });
    }
});

app.delete('/assets/:id', authenticateToken, async (req, res) => {
    const assetId = req.params.id;

    try {
        // Connect to the user's gateway and network
        const gateway = await connectToUserGateway(req.user.username, "owner");
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // Check if asset exists before attempting deletion
        const assetExists = await contract.evaluateTransaction('AssetExists', assetId);
        // const assetExistsPrivate = await contract.evaluateTransaction('AssetExistsDataOwner', assetId);

        if (!assetExists ) {
            return res.status(404).send({ success: false, message: 'Asset not found' });
        }

        // // Begin the deletion process
        // if (assetExistsPublic) {
        //     await contract.submitTransaction('DeleteAsset', assetId);
        //     console.log("[+][Delete][public] Success");
        // }

        if (assetExists) {
            
            await submitTransactionWithRetry(
                contract,
                'DeleteAsset',
                [assetId],
                5,  
                1000 
            );
            console.log("[+][Delete][private] Success");
        }

        // if (assetExistsPublic) {
        //     await contract.submitTransaction('DeleteAsset', assetId);
        //     console.log("[+][Delete][public] Success");
        // }

        // if (assetExistsPrivate) {
            
        //     await submitTransactionWithRetry(
        //         contract,
        //         'DeleteAssetDataOwner',
        //         [assetId],
        //         5,  
        //         1000 
        //     );
        //     console.log("[+][Delete][private] Success");
        // }



        // If asset exists in MongoDB, delete it
        try {

            const result = await WareHouse.findOneAndDelete({ fileId: assetId });
            if (!result) {
                // Rollback chaincode changes if MongoDB deletion fails
                return res.status(404).send({ success: false, message: 'Asset not found in MongoDB' });
            }


        }

        catch(err)
        {
            console.log("[!][Delete] " , e);
        }

        // Send success response
        res.status(200).send({ success: true, message: 'Asset deleted successfully' });

    } catch (error) {
        // Handle errors and roll back changes if any part of the process fails
        console.error("[Error] Deletion failed: ", error);
    

        res.status(500).send({ success: false, message: 'Failed to delete asset', details: error.message });
    }
});





function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

app.listen(PORT, HOST, () => {
    console.log(`Server started on http://${HOST}:${PORT}`);
});

