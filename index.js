const express = require('express');
const axios = require('axios');
const oauth1a = require('oauth-1.0a');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bodyParser = require("body-parser");
var cors = require("cors");
var MongoClient = require("mongodb").MongoClient;
var mongoUrl =
  "mongodb://solanacato:SolanaCato%402021@localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false";
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'pug');
app.set('views', './views');
app.use('/images', express.static('images'));
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'catoairdropnotification@gmail.com',
      pass: 'Cato@2022'
    }
  });
const port = 3000
const twitterAPIUrl = "https://api.twitter.com/2"
const config = {
    headers: { Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAALpk8gAAAAAAn6IXdcFeShAKr%2BVl1wMS4Bq82zU%3DX2f3h4KKHok5ZpeogFZpjsLF1CWeYEDvPNtQyhj6z7cLlxjHw8" }
}
const timeToVerify = 5 * 60 * 1000;

app.get('/twitterInfo/:username/:tweetId/:projectID', async (req, res) => {

    let responseObject = {
        hasUserLiked: false,
        hasUserFollowedPage: false,
        hasUserRetweeted: false,
        hasUserCommented: false
    }

    try {
        let username = req.params.username,
            tweetId = req.params.tweetId;
        const responsegetId = await axios.get(twitterAPIUrl + "/users/by/username/" + username, config),
            userId = responsegetId.data.data.id;

        const ifLiked = await axios.get(twitterAPIUrl + "/users/" + userId + "/liked_tweets?max_results=10", config),
            likes = ifLiked.data.data;

        for (let i = 0; i < likes.length; i++)
            if (likes[i].id === tweetId)
                responseObject.hasUserLiked = true;
    }

    catch (e) {
        responseObject.hasUserLiked = false;
    }

    try {
        //If user completed comment task
        let username = req.params.username,
            projectID = req.params.projectID;

        const responsegetId = await axios.get(twitterAPIUrl + "/users/by/username/" + username, config),
            userId = responsegetId.data.data.id;

        const ifCommented = await axios.get(twitterAPIUrl + "/users/" + userId + "/tweets?max_results=5", config),
            comment = ifCommented.data.data;

        for (let i = 0; i < comment.length; i++) {
            if (comment[i].text.includes(projectID))
                responseObject.hasUserCommented = true;
        }
    }

    catch (e) {
        responseObject.hasUserCommented = false;
    }

    try {
        //If user completed retweet task
        let userName = req.params.username,
            tweetId = req.params.tweetId;

        const ifRetweeted = await axios.get(twitterAPIUrl + "/tweets/" + tweetId + "/retweeted_by", config),
            retweet = ifRetweeted.data.data;
        for (let i = 0; i < retweet.length; i++)
            if (retweet[i].username === userName)
                responseObject.hasUserRetweeted = true;
    }

    catch (e) {
        responseObject.hasUserRetweeted = false;
    }
    res.send({ result: responseObject });
})

app.get('/user/verify', async (req, res) => {
    let isVerifiedAlready = false,
        emailAlreadyInUse = false;
    try {
        let db = await MongoClient.connect(mongoUrl),
            dbo = db.db("userValidationtokens"),
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
            db = await MongoClient.connect(mongoUrl),
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})