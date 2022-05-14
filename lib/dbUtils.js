  
const dbHelpers = {
    async isWalletInDb(walletAddress, nameOfCollection, dbObject){
        try{
            let response = await dbObject.collection(nameOfCollection).findOne({walletAddress: walletAddress});
            if (response)
                return true;
            return false;
        }
        catch(e){
            return null;
        }

    },
    async isUserIdInDb(nameOfCollection, identifier, dbObject){
        let queryKey = nameOfCollection === "discord" ? "discordId" : nameOfCollection === "twitter" ? "twitterId" : "telegramId",
            queryObject = {};
        queryObject[queryKey] = identifier;
        try{
            let response = await dbObject.collection(nameOfCollection).findOne(queryObject);
            if (response)
                return true;
            return false;
        }
        catch(e){
            return null;
        }
    }
}

exports.dbHelpers = dbHelpers;