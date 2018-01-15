var requestRepository = require('./../repositories/requestRepository');
var helpers = require('./../helpers');
var redis = require("redis");

var client = redis.createClient();


module.exports = {
    create: Create,
    get: Get,
    getAll: GetAll,
    getByUserId: GetByUserId,
    update: Update,
    delete: Delete
}

function Get(requestId, callback) {
    if (requestId) {
        client.hgetall("request:" + requestId, function (err, request) {
            if (request) {
                callback({
                    success: true,
                    request: request,
                });
            }
            else {
                callback({
                    success: false,
                    message: "Request do not exist",
                });
            }
        });
    }
    else {
        callback({
            success: false,
            message: "Missing requestId",
        });
    }
}

function Create(auth, title, description, callback) {
    if (auth && title && description) {
        auth = auth.toLowerCase();
        client.hget("auths", auth, function (err, userId) {
            client.hget("user:" + userId, "account", function (err, account) {
                if (userId !== null) {
                    client.get("next_request_id", function (err, next_request_id) {
                        if (next_request_id == null) {
                            client.set("next_request_id", 1);
                            next_request_id = 1;
                        }
                        client.incr("next_request_id");
                        var timestamp = Math.floor(Date.now() / 1000);
                        client.zadd("requests", timestamp, next_request_id);
                        client.zadd(account + ":requests", timestamp, next_request_id);
                        client.zadd("requests:user:" + userId, timestamp, next_request_id);
                        client.hmset(
                            "request:" + next_request_id,
                            "id", next_request_id,
                            "title", title,
                            "description", description,
                            "created", timestamp,
                            "user", userId,
                            function (err, reply) {
                                callback({
                                    success: true,
                                    message: "Request created",
                                });
                            }
                        )
                    });
                }
                else {
                    callback({
                        success: false,
                        message: "User not logged in",
                    });
                }
            });
        });
    }
    else {
        callback({
            success: false,
            message: "auth, description or title missing",
        });
    }
}

function GetAll(auth, page, callback) {
    client.hget("auths", auth, function (err, userId) {
        client.hget("user:" + userId, "account", function (err, account) {

            if (!page)
                page = 0;

            client.zcard(account + ":requests", function (err, count) {
                var totalPages = Math.ceil(count / 10);
                var pageArray = [];

                for (var i = 0; i < totalPages; i++) {
                    if (i < (page - 4) && (totalPages > 4))
                        continue;

                    pageArray.push(i);

                    if (i > (page + 4))
                        break;
                }

                if (pageArray.length == 0)
                    pageArray.push(0);

                var start = 10 * page;
                var stop = start + 10;

                client.zrevrange(account + ":requests", start, stop, function (err, requestIds) {
                    var requestIds = [].concat.apply([], requestIds);
                    multiCall = client.multi();
                    requestIds.forEach(function (requestId) {
                        multiCall.hgetall("request:" + requestId)
                    })
                    multiCall.exec(function (err, requests) {

                        multiCall = client.multi();
                        helpers.distinctArray(requests).forEach(function (request) {
                            multiCall.hgetall("user:" + request.user)
                        });

                        multiCall.exec(function (err, users) {

                            //Cached lenght for performance since this is dumb
                            var rLength = requests.length;
                            var uLength = users.length;

                            for (i = 0; i < rLength; i++) {
                                for (j = 0; j < uLength; j++) {
                                    requests[i].user = users[j];
                                }
                            }
                            callback({
                                success: true,
                                requests: requests,
                                totalPages: totalPages,
                                pages: pageArray,
                                page: page,
                                users: users
                            });
                        });
                    })
                });
            })
        });
    });
}

function Update(requestId, title, description, callback) {
    if (requestId && title && description) {
        client.hmset(
            "request:" + requestId,
            "title", title,
            "description", description,
            function (err, reply) {
                callback({
                    success: true,
                    message: "Request updated",
                });
            }
        )
    }
    else {
        callback({
            success: false,
            message: "Missing requestId, title or description",
        });
    }
}

function Delete(requestId, callback) {
    if (requestId) {
        client.hgetall("request:" + requestId, function (err, request) {
            if (request) {
                client.hget("user:" + request.user, "account", function (err, account) {
                    if (account) {
                        client.del("request:" + requestId);
                        client.zrem("requests", requestId);
                        client.zrem(account + ":requests", requestId);
                        client.zrem("requests:user:" + request.user, requestId);
                        callback({
                            success: true,
                            message: "Request deleted",
                        });

                    }
                    else {
                        callback({
                            success: false,
                            message: "Could not get user account",
                        });
                    }
                });

            }
            else {
                callback({
                    success: false,
                    message: "Request do not exist",
                });
            }

        });
    }
    else {
        callback({
            success: false,
            message: "Missing requestId",
        });
    }
}

function GetByUserId(userId, callback) {
    if (userId) {
        client.zrevrange("requests:user:" + userId, 0, -1, function (err, requests) {
            var multiCall = client.multi();
            requests.forEach(function (requestId) {
                multiCall.hgetall("request:" + requestId, function (err, request) {
                    //Not implemented
                });
            });
            multiCall.exec(function (err, replies) {
                callback({
                    success: true,
                    requests: replies,
                });
            });
        });
    }
    else {
        callback({
            success: false,
            message: "Missing userId",
        });
    }
}