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
        
        const ifCommented = await axios.get(twitterAPIUrl + "/users/" +userId+"/tweets?max_results=5", config),
            comment = ifCommented.data.data;

            for (let i = 0; i < comment.length; i++){
                if(comment[i].text.includes(projectID)) 
                responseObject.hasUserCommented = true;}

    }

    catch (e){
        responseObject.hasUserCommented = false;
    }

    try {
        //If user completed retweet task
        let userName = req.params.username,
            tweetId = req.params.tweetId;

        const ifRetweeted = await axios.get(twitterAPIUrl + "/tweets/" + tweetId +"/retweeted_by", config),
            retweet = ifRetweeted.data.data;
            for (let i = 0; i < retweet.length; i++)
                if(retweet[i].username === userName)
                responseObject.hasUserRetweeted = true;    

    }
    
    catch (e){
        responseObject.hasUserRetweeted = false;
    }
    
    res.send({ result: responseObject });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})