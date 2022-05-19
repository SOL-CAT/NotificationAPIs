const axios = require('axios');
const twitterAPIUrl = "https://api.twitter.com/2";
const oauthCallback="https://498c-115-110-248-75.ngrok.io/";
const oauth = require('./oauth-promise')(oauthCallback);
const oauth_access_token = "791200266-qwPbpDEA01cwTZ38WGDPkoAEoQbLzyQBlns2bgWQ"
const oauth_access_token_secret = "L5BEJ48Zbg0XGOwX6YpP3SqT3erq3DXQU0PbwIwCupDB1"
const config = {
    headers: { Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAALpk8gAAAAAAn6IXdcFeShAKr%2BVl1wMS4Bq82zU%3DX2f3h4KKHok5ZpeogFZpjsLF1CWeYEDvPNtQyhj6z7cLlxjHw8" }
}

const functions = {
    async hasUserLiked(userId, tweetId){
        try{
        let hasUserLiked = false;
        const ifLiked = await axios.get(twitterAPIUrl + "/users/" + userId + "/liked_tweets?max_results=10", config),
            likes = ifLiked.data.data;
        for (let i = 0; i < likes.length; i++)
            if (likes[i].id === tweetId)
                hasUserLiked = true;
            return hasUserLiked;
        }
        catch(e){
            console.log(e)
            return false;
        }
    },
    async hasUserCommentedAndRetweeted(userId, projectID) {
        try {
            let hasUserCommented = false,
                hasUserRetweeted = false;
            
            const ifCommented = await axios.get(twitterAPIUrl + "/users/" + userId + "/tweets?max_results=20", config),
                comment = ifCommented.data.data;
            for (let i = 0; i < comment.length; i++) {
                if (comment[i].text.includes(projectID) && comment[i].text.includes("RT")){
                    hasUserRetweeted = true;
                }
                else if (comment[i].text.includes(projectID) && !comment[i].text.includes("Checkout") && !comment[i].text.includes("RT")){
                    hasUserCommented = true;
                    console.log(comment[i].text)
                }
            }
            return {hasUserCommented,hasUserRetweeted};
        }
        catch (e) {
            console.log(e)
            return {hasUserCommented: false, hasUserRetweeted: false};
        }
    },
    async hasUserFollowed(userId, projectID){
        try{
        const response = await oauth.getProtectedResource("https://api.twitter.com/1.1/friendships/show.json?source_id=" + userId + "&target_id=" +"1393614520048779264", "GET", oauth_access_token, oauth_access_token_secret);
        let jsonResponse = JSON.parse(response.data);
        let hasUserFollowed = false
        hasUserFollowed = jsonResponse.relationship.source.following
        return hasUserFollowed
        }
        catch(e){
            console.log(e)
            return false
        }
    },
    async hasUserJoinedDiscordServer(userId, projectServerId, bearerToken = "b7sQCTBOwLxSnVe0819Ph7xwLbCRea"){
        try{
            const url = "https://discord.com/api/users/@me/guilds";
            const config = {
                headers: {Authorization: "Bearer b7sQCTBOwLxSnVe0819Ph7xwLbCRea"}
            }
            const response = await axios.get(url, config)
            let servers = response.data
            let hasUserJoinedDiscordServer = false;
            for (let i=0; i<servers.length; i++){
                if (servers[i].id === projectServerId){
                    hasUserJoinedDiscordServer = true;
                    break;
                }
            }
            return hasUserJoinedDiscordServer;

        }
        catch(e){
            console.log(e)
            return false;

        }
    }
};

exports.twitterHelpers = functions;