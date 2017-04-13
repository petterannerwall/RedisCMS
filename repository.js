// repository.js
// ========

var redis = require("redis"), client = redis.createClient();

module.exports = {
    getUserFromUserId: function (userId, callback) {
        redis.hget("user:" + userId, function (err, user) {
            callback(user);
        })

    }
};
