const express = require('express');
const axios = require('axios');
const oauth1a = require('oauth-1.0a');
const crypto = require('crypto');
const app = express()
const port = 3000
const twitterAPIUrl = "https://api.twitter.com/2"
const config = {
    headers: { Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAALpk8gAAAAAAn6IXdcFeShAKr%2BVl1wMS4Bq82zU%3DX2f3h4KKHok5ZpeogFZpjsLF1CWeYEDvPNtQyhj6z7cLlxjHw8" }
}


app.get('/twitterInfo/:username/:tweetId', async (req, res) => {
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

    }
    catch (e){

    }

    try {

    }
    catch (e){
        
    }

    try {

    }
    catch (e){
        
    }

    res.send({ result: responseObject });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})