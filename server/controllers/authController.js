var authRepository = require('./../repositories/authRepository');
var helpers = require('./../helpers');
var redis = require("redis");

var client = redis.createClient();

module.exports = {
    logout: LogoutUser,
    login: LoginUser
}

function LoginUser(username, password, callback) {
    if (username && password) {
        client.hget("users", username, function (err, userId) {
            if (userId) {
                client.hget("user:" + userId, "password", function (err, realPassword) {
                    if (realPassword == password) {
                        var uuid = helpers.uuid();
                        client.hset("auths", uuid, userId);
                        callback({
                            success: true,
                            auth: uuid,
                            message: "Successful login"
                        });
                    }
                    else {
                        callback({ success: false, auth: null, error: "Wrong password" });
                    }
                });
            }
            else {
                callback({ success: false, auth: null, error: "User not found" });
            }
        });
    }
    else {
        callback({ success: false, auth: null, error: "Missing username or password" });
    }
}


function LogoutUser(auth, callback) {
    if (auth) {
        var newAuth = helpers.uuid();
        client.hget("auths", auth, function (err, userId) {
            if (userId) {
                client.hset("user:" + userId, "auth", newAuth, function (err, reply) {
                    client.hdel("auths", auth, function (ett, reply) {
                        callback({
                            success: true,
                            message: "Successful logout"
                        });
                    });
                });
            }
            else {
                callback({
                    success: false,
                    message: "User not logged in"
                });
            }

        });
    }
    else {
        callback({
            success: false,
            message: "userId missing"
        });
    }
}