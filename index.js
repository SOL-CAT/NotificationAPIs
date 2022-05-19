const programFunctions = require("./programUtils");
const twitterFunctions = require("./lib/twitterUtils");
const dbFunctions = require('./lib/dbUtils');
const express = require('express');
const axios = require('axios');
const oauth1a = require('oauth-1.0a');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bodyParser = require("body-parser");
var cors = require("cors");
var MongoClient = require("mongodb").MongoClient;
let moment = require("moment");
let _ = require("lodash");
var mongoUrl =
  "mongodb://solanacato:SolanaCato%402021@localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false";
let db = null
MongoClient.connect(mongoUrl).then(data => db = data);
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'pug');
app.set('views', './views');
app.use('/images', express.static('images'));

//serve UI
const path = require("path");
const root = path.join(__dirname, "airdrop-ui");
app.use(express.static(root));
//
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'catoairdropnotification@gmail.com',
      pass: 'Cato@2022'
    }
  });
const port = 3001;
const timeToVerify = 5 * 60 * 1000;

//twitter login part

const cookieParser = require('cookie-parser');
const oauthCallback="https://catotreat.com/";
const oauth = require('./lib/oauth-promise')(oauthCallback);

app.use(cookieParser());

app.post('/twitter/oauth/request_token', async (req, res) => {
    const {walletAddress} = req.body;
    try{
    const { oauth_token, oauth_token_secret } = await oauth.getOAuthRequestToken();
    let dbo = db.db("userValidationtokens");
    dbo.collection("twitter").insertOne({ oauth_token: oauth_token, oauth_token_secret: oauth_token_secret, walletAddress: walletAddress });
    res.json({ oauth_token });
    }
    catch(e){
        console.log(e)
    }
});

app.post('/twitter/oauth/access_token', async (req, res) => {
    try {
        const oauth_token = req.body.oauth_token;
        const oauth_verifier = req.body.oauth_verifier;
        const walletAddress = req.body.walletAddress;
        let dbo = db.db("userValidationtokens");
        let response = await dbo.collection("twitter").findOne({ oauth_token: oauth_token })
        const oauth_token_secret = response.oauth_token_secret;
        const { oauth_access_token, oauth_access_token_secret } = await oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
        let response2 = await dbo.collection("twitter").findOne({ walletAddress, transaction: "Success" });
        if (response2)
            throw new Error;
        dbo.collection("twitter").updateOne({ oauth_token: oauth_token }, { $set: { oauth_access_token, oauth_access_token_secret } });
        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(403).json({ message: "Missing access token" });
    }

});

app.post("/twitter/users/profile_banner", async (req, res) => {
    try {
        const { oauth_token } = req.body;
        let dbo = db.db("userValidationtokens");
        let response2 = await dbo.collection("twitter").findOne({ oauth_token: oauth_token });
        const { oauth_access_token, oauth_access_token_secret } = response2;
        const response = await oauth.getProtectedResource("https://api.twitter.com/1.1/account/verify_credentials.json", "GET", oauth_access_token, oauth_access_token_secret);
        let jsonResponse = JSON.parse(response.data);
        let twitterId =  jsonResponse.id, 
            dp_url =  jsonResponse.profile_image_url_https,
            created_at = jsonResponse.created_at,
            current = moment(),
            difference = moment.duration(moment(created_at).diff(current));

        if (_.isNaN(difference.asDays()))
            difference = 0;
        
        let response3 = await dbo.collection("twitter").findOne({ twitterId, transaction: "Success" });
            if (response3)
                throw new Error;
        await dbo.collection("twitter").updateOne({ oauth_token }, {$set: {twitterId, dp_url}});
        res.json({...jsonResponse, oldSocials: difference < -540 ? true : false});
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: "Missing, invalid, or expired tokens" });
    }
})

app.post("/twitter/users/save_details", async(req, res) => {
    let userAlreadyVerifiedTwitter = false,
        twitterIdAlreadyInUse = false;
    try {
        const { twitterId, walletAddress } = req.body;
        let dbo = db.db("userValidationtokens");

        let response2 = await dbo.collection("twitter").findOne({ walletAddress: walletAddress, transaction: "success" });
        if (response2){
            userAlreadyVerifiedTwitter = true;
            throw new Error;
        }

        response2 = await dbo.collection("twitter").findOne({ twitterId, transaction: "success" });
        if (response2){
            twitterIdAlreadyInUse = true;
            throw new Error;
        }
        await dbo.collection("twitter").updateOne({twitterId, walletAddress}, {$set: {transaction: "Success"}});
        res.send({ message: "Success" })
    }
    catch (e) {
        console.log(e);
        if (userAlreadyVerifiedTwitter)
            res.status(400).send({message: "User Already connected Twitter"});
        if (twitterIdAlreadyInUse)
            res.status(400).send({message: "Twitter ID already in use"});
        res.status(404).json({message: "Unexpected Error"});
    }
})
//twitter login end

//discord login

app.post("/discord/users/getDetails", async(req, res) => {
    try{
        const {token_type, access_token} = req.body;
        let response = await axios({
            url: 'https://discord.com/api/users/@me',
            method: "GET",
            headers: {
                authorization: `${token_type} ${access_token}`
            }
        });
        let dbo = db.db("userValidationtokens"),
            discordId = response.data.id;
        let response2 = await dbo.collection("discord").findOne({ discordId: discordId, transaction: "success" });
        if (response2){
            throw new Error;
        }
        res.json({id: response.data.id});
    }
    catch(e){

        res.status(404).send({message: "Failure"});
    }

})

app.post("/discord/users/saveDetails", async(req, res) => {
    let userAlreadyVerifiedDiscord = false,
        discordIdAlreadyInUse = false;
    try{
        const {token_type, access_token, walletAddress, discordId} = req.body;
        let dbo = db.db("userValidationtokens");
        let response2 = await dbo.collection("discord").findOne({ walletAddress: walletAddress, transaction: "success" });
        if (response2){
            userAlreadyVerifiedDiscord = true;
            throw new Error;
        }

        response2 = await dbo.collection("discord").findOne({ discordId: discordId, transaction: "success" });
        if (response2){
            discordIdAlreadyInUse = true;
            throw new Error;
        }

        await dbo.collection("discord").insertOne({walletAddress: walletAddress, access_token: access_token, token_type: token_type, 
            discordId: discordId, transaction: "success"});
        res.send({message: "Success"})
    }
    catch(e){
        console.log(e);
        if (userAlreadyVerifiedDiscord)
            res.status(400).send({message: "User Already connected Discord"});
        if (discordIdAlreadyInUse)
            res.status(400).send({message: "Discord ID already in use"});
        if (!userAlreadyVerifiedDiscord && !discordIdAlreadyInUse)
            res.status(404).send({message: "Unexpected Error"})
    }
})

//telegram login

app.post("/telegram/users/getDetails", async (req, res) => {
    try {
        const { id } = req.body;
        let dbo = db.db("userValidationtokens");
        response2 = await dbFunctions.dbHelpers.isUserIdInDb("telegram" ,id, dbo);
        if (response2) 
            throw new Error;
        res.send({message: "success"})
    }
    catch (e) {
        console.log(e);
        res.status(400).json({ message: "Telegram Id already in use" });
    }

});

app.post("/telegram/users/saveDetails", async (req, res) => {
    let userAlreadyVerifiedTelegram = false,
        telegramIdAlreadyInUse = false;
    try {
        const { id, walletAddress } = req.body;
        let dbo = db.db("userValidationtokens");
        let response2 = await dbFunctions.dbHelpers.isWalletInDb(walletAddress, "telegram", dbo);
        if (response2) {
            userAlreadyVerifiedTelegram = true;
            throw new Error;
        }
        response2 = await dbFunctions.dbHelpers.isUserIdInDb("telegram" ,id, dbo);
        if (response2) {
            telegramIdAlreadyInUse = true;
            throw new Error;
        }
        await dbo.collection("telegram").insertOne({
            walletAddress: walletAddress, telegramId: id, transaction: "success"
        });
        res.send({ message: "Success" })
    }
    catch (e) {
        console.log(e);
        if (userAlreadyVerifiedTelegram)
            res.status(400).json({ message: "User Already connected Telegram" });
        else if (telegramIdAlreadyInUse)
            res.status(400).json({ message: "Telegram Id already in use" });
        else if (!telegramIdAlreadyInUse && !userAlreadyVerifiedTelegram)
            res.status(404).json({message: "Unexpected Error"});
    }

})

//login end

app.post("/socials/connection/status", async(req, res) => {
    let responseObject = {
        discord: false,
        twitter: false,
        telegram: false
    };
    try{
        const {walletAddress} = req.body;
        let dbObject = db.db("userValidationtokens"),
            twitter = await dbFunctions.dbHelpers.isWalletInDb(walletAddress, "twitter",dbObject),
            discord = await dbFunctions.dbHelpers.isWalletInDb(walletAddress, "discord", dbObject),
            telegram = await dbFunctions.dbHelpers.isWalletInDb(walletAddress, "telegram", dbObject);
        responseObject = {
            twitter: twitter,
            discord: discord,
            telegram: telegram
        };
        res.send(responseObject);
    }
    catch(e){
        res.status(400).send({message: "Wallet Address Missing"});
    }
})

app.get('/twitterInfo/:userId/:tweetId/:projectID', async (req, res) => {
    const {userId, tweetId, projectID} = req.params;
    let responseObject = {
        hasUserLiked: false,
        hasUserFollowedPage: false,
        hasUserRetweeted: false,
        hasUserCommented: false,
        hasUserJoinedDiscordServer: false
    }
    let hasUserLiked = await twitterFunctions.twitterHelpers.hasUserLiked(userId, tweetId);
    responseObject.hasUserLiked = hasUserLiked;

    let {hasUserCommented, hasUserRetweeted} = await twitterFunctions.twitterHelpers.hasUserCommentedAndRetweeted(userId, projectID);
    responseObject.hasUserCommented = hasUserCommented;
    responseObject.hasUserRetweeted = hasUserRetweeted;

    let hasUserFollowed = await twitterFunctions.twitterHelpers.hasUserFollowed(userId, projectID);
    responseObject.hasUserFollowedPage = hasUserFollowed;
    let hasUserJoinedDiscordServer = await twitterFunctions.twitterHelpers.hasUserJoinedDiscordServer(791200266, '927299268044267580')
    responseObject.hasUserJoinedDiscordServer = hasUserJoinedDiscordServer;
    res.send({ result: responseObject });
})

app.get('/airdrops/get', async (req, res) => {
    try{
    let dbo = db.db("projects");
    let response = await dbo.collection("metadata").find({}).toArray();
    if (response.length)
        return res.send({data: response});
    else
        return res.send({data: []});
    }
    catch(e){
        console.log(e);
        return res.send({data: []});    
    }

})


app.get('/user/verify', async (req, res) => {
    let isVerifiedAlready = false,
        emailAlreadyInUse = false;
    try {
        let dbo = db.db("userValidationtokens"),
            dbUsers = db.db("userData"),
            randomFiveCharacter = Math.random().toString(36).slice(2),
            walletAddress = req.query.wallet,
            response2 = await dbUsers.collection("users").find({ $or: [{ wallet: walletAddress }, { email: req.query.email }] }).toArray();
        if (response2.length) {
            emailAlreadyInUse = true;
            throw new Error;
        }

        let hashForString = crypto.createHash('sha256').update(randomFiveCharacter).digest('hex'),
            query = { wallet: walletAddress },
            insertHashObject = { wallet: walletAddress, email: req.query.email, hashForString: hashForString, isVerified: false, when: +new Date() },

            response = await dbo.collection("userHash").findOne(query);
        if (!response)
            await dbo.collection("userHash").insertOne(insertHashObject);
        else {
            if (response.isVerified) {
                isVerifiedAlready = true;
                throw new Error;
            }
            else {
                await dbo.collection("userHash").updateOne(query, { $set: insertHashObject });
            }
        }
        let linkForVerification = "http://localhost:3000/user/attemptVerification?email=" + req.query.email + "&code=" + randomFiveCharacter + "&wallet=" + walletAddress;
        let mailOptions = {
            from: 'Cato Airdrop Service',
            to: req.query.email,
            subject: 'Verify Account',
            html: '<!DOCTYPE html>' +
                '<html><head><title>Verification</title>' +
                '</head><body><div>' +
                '<img src="https://raw.githubusercontent.com/SOL-CAT/SOL-CAT/main/CATO512newlogo.png" alt="" width="160">' +
                '<h1>Welcome to CATO airdrop service!</h1>' +
                '<a href=\"' + linkForVerification + '\">Click here to Verify</a>' +
                '</div></body></html>'
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.send({ word: randomFiveCharacter, hashForString: hashForString });
    }
    catch (e) {
        console.log(e);
        if (isVerifiedAlready)
            res.status(400).send({
                message: "Already Verified"
            });
        else if (emailAlreadyInUse)
            res.status(400).send({
                message: "Email already in use with different wallet"
            });
        else
            res.status(500).send({
                message: "Error!"
            });
    }
});

app.get('/user/attemptVerification', async (req, res) => {
    try {
        let email = req.query.email,
            stringToHash = req.query.code,
            wallet = req.query.wallet,
            hashForString = crypto.createHash('sha256').update(stringToHash).digest('hex'),
            query = { email: email, isVerified: false },
            dbo = db.db("userValidationtokens"),
            response = await dbo.collection("userHash").findOne(query);
        if (!response)
            throw new Error;
        let currentTime = +new Date();

        if (hashForString === response.hashForString && response.wallet === wallet && currentTime < response.when + timeToVerify) {
            let dbUsers = db.db("userData");
            let checkIfUserExists = await dbUsers.collection("users").findOne({ $or: [{ wallet: wallet }, { email: email }] });
            if (checkIfUserExists)
                throw new Error;

            await dbo.collection("userHash").deleteOne(query);
            await dbUsers.collection("users").insertOne({ wallet: wallet, email: email, when: + new Date() });
            res.render("index", { status: "Success" });
        }
        else
            throw new Error;
    }
    catch (e) {
        res.render("index", { status: "Failed" });
    }
})

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "airdrop-ui", "index.html"));
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
