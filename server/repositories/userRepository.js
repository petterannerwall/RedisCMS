var helpers = require('./../helpers');
var redis = require("redis");

var client = redis.createClient();

module.exports = {
    getNextUserId: GetNextUserId,
    createUser: CreateUser,
}

function GetNextUserId(callback) {
    debugger;
    client.get("next_user_id", function (err, next_user_id) {
        if (next_user_id == null) {
            client.set("next_user_id", 1);
            next_user_id = 1;
        }
        client.incr("next_user_id");
        callback(next_user_id);
    })
}

function CreateUser(userId, username, password, account, callback) {
    client.hmget("users", username, function (err, existingId) {
        if (existingId[0] == null) {
            client.hmset("users", username, userId);
            client.hmset("user:" + userId, "id", userId, "username", username, "password", password, "account", account);
            callback({ success: true, message: "User registered!" });
        }
        else {
            callback({ success: false, message: "Username already taken, <br> please try something else" })
        }
    })
}