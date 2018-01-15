var userRepository = require('./../repositories/userRepository');
var helpers = require('./../helpers');
var redis = require("redis");

var client = redis.createClient();

module.exports = {
    getUsers: GetUsers,
    getUserByAuth: GetUserByAuth,
    createUser: CreateUser,
    deleteUser: DeleteUser
}

function GetUsers(callback) {

    client.hgetall("users", function (err, users) {

        var multiCall = client.multi();
        var users = helpers.toUserList(users);
        var userCount = users.length;

        for (var i = 0; i < userCount; i++) {
            multiCall.hgetall("user:" + users[i].id)
        }

        multiCall.exec(function (err, userList) {

            var userList = userList.map(function (user) {
                delete user.password;
                return user;
            });
            callback({
                success: true,
                users: userList,
            });
        })
    });
}

function GetUserByAuth() {
    client.hget("auths", userAuth, function (err, userId) {
        client.hgetall("user:" + userId, function (err, user) {
            if (user) {

                delete user.password;

                callback({
                    success: true,
                    user: user,
                });
            }
            else {
                callback({
                    success: false,
                    message: "User not logged in",
                });
            }
        })
    });
}

function CreateUser(username, password, account, callback) {
    if (username && password) {
        username = username.toLowerCase();
        password = password.toLowerCase();
        userRepository.getNextUserId(function (next_user_id) {
            userRepository.createUser(next_user_id, username, password, account, function (result) {
                callback(result);
            })
        });
    }
    else {
        callback({ success: false, message: "Missing username or password" })
    }
}

function DeleteUser(username, callback) {
    client.hmget("users", username, function (err, users) {
        var userId = users[0];
        if (userId == null) {
            callback({
                success: false,
                message: 'User not found',
            });
        }
        else {
            client.hdel("user:" + userId, "id", "username", "password", "auth", "account");
            client.hdel("users", username);
            callback({
                success: true,
                message: 'User deleted',
            });
        }
    });
}