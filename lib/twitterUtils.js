const axios = require('axios');
const twitterAPIUrl = "https://api.twitter.com/2";
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
                else if (comment[i].text.includes(projectID) && !comment[i].text.includes("RT")){
                    hasUserCommented = true;
                }
            }
            return {hasUserCommented,hasUserRetweeted};
        }
        catch (e) {
            return {hasUserCommented: false, hasUserRetweeted: false};
        }
    }
};

exports.twitterHelpers = functions;