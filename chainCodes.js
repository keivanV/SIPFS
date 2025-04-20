'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const { TextDecoder } = require('node:util');
const { split, join } = require('shamir');


//-------------------------------------------------------------
class AssetchainCode extends Contract {
    async CreateUser(ctx, username, role, createdAt, publicKey, policySet) {
        const exists = await this.UserExists(ctx, username);
        if (exists) {
            throw new Error(`User ${username} already exists`);
        }
    
        const user = {
            Username: username,
            Role: role,
            CreatedAt: createdAt,
            PublicKey: publicKey,
            PolicySet: JSON.parse(policySet)
        };
    
        await ctx.stub.putState(username, Buffer.from(stringify(sortKeysRecursive(user))));
        return JSON.stringify(user);
    }


    async  hashKeyValuePairs(policyAttributes) {
        const hashedAttributes = [];
        for (const attribute of policyAttributes) {
            for (const key in attribute) {
                if (attribute.hasOwnProperty(key)) {
                    const value = attribute[key];
                    const concatenated = `${key}:${JSON.stringify(value)}`;
                    const combinedHash = crypto.createHash('sha256').update(concatenated).digest('hex');
                    // Push the attribute along with the generated hash
                    hashedAttributes.push({ [key]: value, hash: combinedHash });
                }
            }
        }
        return hashedAttributes;
    }


    async UserExists(ctx, username) {
        const userJSON = await ctx.stub.getState(username);
        return userJSON && userJSON.length > 0;
    }

    async GetUser(ctx, username) {
        const userJSON = await ctx.stub.getState(username);
        if (!userJSON || userJSON.length === 0) {
            throw new Error(`User ${username} does not exist`);
        }
        return userJSON.toString();
    }

    async GetAssetsByOwnerAndName(ctx, owner, name, type) {
        const startKey = '';
        const endKey = '';
        const matchedAssets = [];
    
        try {
            for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
                const strValue = value.toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue); 
                } catch (err) {
                    console.log("Error parsing JSON", err);
                    continue; 
                }
    
                if (record.owner === owner && record.name === name && record.type == type) {
                    matchedAssets.push({ Key: key, Record: record });
                }
            }
        } catch (error) {
            console.error("Error iterating through assets", error);
            throw new Error(`Failed to get assets: ${error.message}`);
        }
    
        console.info("Matched Assets:", matchedAssets);
        return JSON.stringify(matchedAssets);
    }

    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    async CreateAsset(ctx, id, metaData, policySet, publicKeyOwner, releaseAt, updatedAt, owner, name, cid, PrevCid , hashAccessKey , fragmentsMap , hashedAttributes) {
        const exists = await this.AssetExists(ctx, id);
        
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            ID: id,
            MetaData: metaData,
            policySet: JSON.parse(policySet),
            publicKeyOwner: publicKeyOwner,
            ReleasedAt: releaseAt,
            UpdatedAt: updatedAt,
            Requesters: [],
            revokedAccess: [],
            owner: owner,
            name: name,
            cid: cid,
            PrevCid: PrevCid ,
            hashAccessKey:hashAccessKey,
            fragmentsMap: JSON.parse(fragmentsMap),
            hashedAttributes: JSON.parse(hashedAttributes)
        };

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }


    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    async UpdateAsset(ctx, id, metaData, policySet, publicKeyOwner, releaseAt, updatedAt , owner , name , cid , PrevCid ,  hashAccessKey , fragmentsMap , hashedAttributes ) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const updatedAsset = {
            ID: id,
            MetaData: metaData,
            policySet: JSON.parse(policySet),
            publicKeyOwner: publicKeyOwner,
            ReleasedAt: releaseAt,
            UpdatedAt: updatedAt,
            Requesters: [],
            revokedAccess: [],
            owner : owner,
            name : name,
            cid : cid , 
            PrevCid : PrevCid,
            hashAccessKey : hashAccessKey,
            fragmentsMap:JSON.parse(fragmentsMap),
            hashedAttributes:JSON.parse(hashedAttributes)

        };

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }


    async RevokePermanentAccess(ctx, username, assetID , revokedAt) {
        const assetString = await this.ReadAsset(ctx, assetID);
        if (!assetString) {
            throw new Error(`Asset with ID ${assetID} not found.`);
        }
        
        const asset = JSON.parse(assetString);
    
        if (!asset.revokedAccess) {
            asset.revokedAccess = [];
        }

        asset.revokedAccess.push({
            username: username,
            type: 'permanent',
            revokedAt: revokedAt
        });
    
        await ctx.stub.putState(assetID, Buffer.from(stringify(sortKeysRecursive(asset))));
    
        return JSON.stringify(asset);
    }
    
    async CheckAccess(ctx, username, assetID) {
        let user = await this.GetUser(ctx, username);
        user = JSON.parse(user);
    
        let userPolicySet;


        
    
        try {
            if (typeof user.PolicySet === 'string') {
                userPolicySet = JSON.parse(user.PolicySet);
            } else if (Array.isArray(user.PolicySet)) {
                userPolicySet = user.PolicySet;
            } else if (typeof user.PolicySet === 'object') {
                userPolicySet = [user.PolicySet];
            } else {
                throw new Error("PolicySet is neither a valid JSON string, object, nor an array");
            }
    
            if (!Array.isArray(userPolicySet)) {
                throw new Error("PolicySet should be an array");
            }
        } catch (error) {
            console.error(`Invalid PolicySet format for user ${username}:`, user.PolicySet);
            throw new Error(`Invalid JSON format for PolicySet of user ${username}: ${error.message}`);
        }
    
        const assetJSON = await ctx.stub.getState(assetID);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`Asset ${assetID} does not exist`);
        }
        const asset = JSON.parse(assetJSON.toString());
    
        if (typeof asset.policySet === 'string') {
            asset.policySet = JSON.parse(asset.policySet);
        }
    
        const isPermanentRevoked = asset.revokedAccess && asset.revokedAccess.some(access => 
            access.username === username && access.type === 'permanent'
        );
        if (isPermanentRevoked) {
            return { access: false };
        }



        
    
        const userHasAccess = asset.policySet.every(assetPolicy => 
            userPolicySet.some(userPolicy => {
                const isInterestSubset = assetPolicy.interest.every(interest => 
                    userPolicy.interest.includes(interest)
                );
    
                const isLanguagesSubset = assetPolicy.languages.every(language => 
                    userPolicy.languages.includes(language)
                );
    
                return isInterestSubset && isLanguagesSubset;
            })
        );
        

        const extractedShares = {};
        asset.fragmentsMap.slice(0, asset.hashedAttributes.length).forEach((fragment, index) => {
            extractedShares[index + 1] = fragment.share; // Store at correct index
        });

        const result = {};
        for (const key in extractedShares) {
          if (extractedShares.hasOwnProperty(key)) {
            // Extract the array of numbers from the nested object
            const numbers = Object.values(extractedShares[key]);
            // Convert the array of numbers to Uint8Array
            result[key] = new Uint8Array(numbers);
          }
        }

        

        const recovered = join(result);
        const utf8Decoder = new TextDecoder();
        const recoveredAccessKey = utf8Decoder.decode(recovered);
    



        return { access: userHasAccess, owner: asset.owner , key :recoveredAccessKey };


    }
    async GrantAccess(ctx, username, assetID, grantedAt) {
        const assetString = await this.ReadAsset(ctx, assetID);
        const asset = JSON.parse(assetString);

        asset.Requesters.push({ username: username, grantedAt: grantedAt });
        await ctx.stub.putState(assetID, Buffer.from(JSON.stringify(asset)));

        return JSON.stringify(asset);
    }

    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        await ctx.stub.deleteState(id);
    }
    
    async DeleteAssetPublic(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        await ctx.stub.deleteState(id);
    }


    async GetAllAssets(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
    
        try {
            for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
                const strValue = value.toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                } catch (err) {
                    console.log("Error parsing JSON", err);
                    record = strValue;
                }
                allResults.push({ Key: key, Record: record });
            }
        } catch (error) {
            console.error("Error iterating through state data", error);
            throw new Error(`Failed to get assets: ${error.message}`);
        }
    
        console.info(allResults);
        return JSON.stringify(allResults);
    }


}

module.exports = AssetchainCode;

