var express = require('express');
var exphbs = require('express-handlebars');
var helpers = require('./server-helpers');
var repo = require('./repository');
var app = express();


var bodyParser = require('body-parser');

var redis = require("redis"), client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


var port = process.env.PORT || 8787;

var requestKey = "request-";
var userKey = "user-";
var requestMetaKey = "request-meta-";
var router = express.Router();

var secureRoutes = [
    'request'
]

router.use(function (req, res, next) {

    if (new RegExp(secureRoutes.join("|")).test(req.url)) {
        console.log("validating route: " + req.url);
        console.log();
        if (req.headers.auth) {
            console.log('Auth missing');
            client.hget("auths", req.headers.auth, function (err, userId) {
                if (userId !== null) {
                    next();
                }
                else {
                    res.send(401, 'missing authorization header');
                }
            });
        }
        else {
            console.log("sending 401");
            res.send(401, 'missing authorization header');
        }
    }
    else {
        next();
    }

});



// SETUP ROUTES
// =============================================================================

router.get('/api/account/new', function (req, res) {

    function getUniqueId() {
        var accountId = helpers.generateAccountId();
        client.hgetall("accounts", accountId, function (err, account) {
            if (account == null) {
                idAlreadyInUse = true;
                res.json({
                    success: true,
                    account: accountId,
                });
            }
            else {
                getUniqueId();
            }
        });
    }
    getUniqueId();
});


// USER ROUTES
// =============================================================================

router.get('/api/user', function (req, res) {
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

            res.json({
                success: true,
                users: userList,
            });
        })
    });
});


router.get('/api/user/:auth', function (req, res) {

    var userAuth = req.params.auth;

    client.hget("auths", userAuth, function (err, userId) {
        client.hgetall("user:" + userId, function (err, user) {
            if (user) {

                delete user.password;

                res.json({
                    success: true,
                    user: user,
                });
            }
            else {
                res.json({
                    success: false,
                    message: "User not logged in",
                });
            }
        })
    });
});

router.delete('/api/user', function (req, res) {
    var username = req.body.username.toLowerCase();
    client.hmget("users", username, function (err, users) {
        var userId = users[0];
        if (userId == null)
            res.json({ success: false, message: 'User not found', });

        client.hdel("user:" + userId, "id", "username", "password", "auth", "account");
        client.hdel("users", username);
        res.json({ success: true, message: 'User deleted', });
    });
});

router.post('/api/user', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var account = req.body.account;

    if (username && password) {
        username = username.toLowerCase();
        password = password.toLowerCase();
        client.get("next_user_id", function (err, next_user_id) {
            if (next_user_id == null) {
                client.set("next_user_id", 1);
                next_user_id = 1;
            }
            client.incr("next_user_id");
            console.log(next_user_id);
            client.hmget("users", username, function (err, userId) {
                if (userId[0] == null) {
                    client.hmset("users", username, next_user_id);
                    client.hmset("user:" + next_user_id, "id", next_user_id, "username", username, "password", password, "account", account);
                    res.json({ success: true, message: "User registered!" });
                }
                else {
                    res.json({ success: false, message: "Username already taken, <br> please try something else" })
                }
            })
        });
    }
    else {
        res.json({ success: false, message: "Missing username or password" })
    }
});

router.post('/api/login', function (req, res) {
    var username = req.body.username.toLowerCase();
    var password = req.body.password.toLowerCase();
    if (username && password) {
        client.hget("users", username, function (err, userId) {
            if (userId) {
                client.hget("user:" + userId, "password", function (err, realPassword) {
                    if (realPassword == password) {
                        var uuid = helpers.uuid();
                        client.hset("auths", uuid, userId);
                        res.json({
                            success: true,
                            auth: uuid,
                            message: "Successful login"
                        });
                    }
                    else {
                        res.json({ success: false, auth: null, error: "Wrong password" });
                    }
                });
            }
            else {
                res.json({ success: false, auth: null, error: "User not found" });
            }
        });
    }
    else {
        res.json({ success: false, auth: null, error: "Missing username or password" });
    }
});

router.post('/api/logout', function (req, res) {
    var auth = req.headers.auth.toLowerCase();
    if (auth) {
        var newAuth = helpers.uuid();
        client.hget("auths", auth, function (err, userId) {
            if (userId) {
                client.hset("user:" + userId, "auth", newAuth, function (err, reply) {
                    client.hdel("auths", auth, function (ett, reply) {
                        res.json({
                            success: true,
                            message: "Successful logout"
                        });
                    });
                });
            }
            else {
                res.json({
                    success: false,
                    message: "User not logged in"
                });
            }

        });
    }
    else {
        res.json({
            success: false,
            message: "userId missing"
        });
    }
});

// REQUEST ROUTES
// =============================================================================

router.post('/api/request', function (req, res) {
    var auth = req.headers.auth;
    var title = req.body.title;
    var description = req.body.description;

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
                                res.json({
                                    success: true,
                                    message: "Request created",
                                });
                            }
                        )
                    });
                }
                else {
                    res.json({
                        success: false,
                        message: "User not logged in",
                    });
                }
            });
        });
    }
    else {
        res.json({
            success: false,
            message: "auth, description or title missing",
        });
    }
});

router.get('/api/request', function (req, res) {

    var auth = req.headers.auth;
    var page = parseInt(req.query.page);

    client.hget("auths", auth, function (err, userId) {
        client.hget("user:" + userId, "account", function (err, account) {

            if (!page)
                page = 0;

            client.zcard(account + ":requests", function (err, count) {


                console.log(count);
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
                            res.json({
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
});


router.post('/api/request/:requestId', function (req, res) {

    var requestId = req.params.requestId;
    var title = req.body.title;
    var description = req.body.description;

    if (requestId && title && description) {
        client.hmset(
            "request:" + requestId,
            "title", title,
            "description", description,
            function (err, reply) {
                res.json({
                    success: true,
                    message: "Request updated",
                });
            }
        )
    }
    else {
        res.json({
            success: false,
            message: "Missing requestId, title or description",
        });
    }
});

router.get('/api/request/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    if (requestId) {
        client.hgetall("request:" + requestId, function (err, request) {
            if (request) {
                res.json({
                    success: true,
                    request: request,
                });
            }
            else {
                res.json({
                    success: false,
                    message: "Request do not exist",
                });
            }
        });
    }
    else {
        res.json({
            success: false,
            message: "Missing requestId",
        });
    }
});


router.delete('/api/request/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    if (requestId) {

        client.hgetall("request:" + requestId, function (err, request) {
            if (request) {
                client.hget("user:" + request.user, "account", function (err, account) {
                    if (account) {
                        client.del("request:" + requestId);
                        client.zrem("requests", requestId);
                        client.zrem(account + ":requests", requestId);
                        client.zrem("requests:user:" + request.user, requestId);
                        res.json({
                            success: true,
                            message: "Request deleted",
                        });

                    }
                    else {
                        res.json({
                            success: false,
                            message: "Could not get user account",
                        });
                    }
                });

            }
            else {
                res.json({
                    success: false,
                    message: "Request do not exist",
                });
            }

        });
    }
    else {
        res.json({
            success: false,
            message: "Missing requestId",
        });
    }
});

router.get('/api/request/user/:userId', function (req, res) {
    var userId = req.params.userId;
    if (userId) {
        client.zrevrange("requests:user:" + userId, 0, -1, function (err, requests) {

            var multiCall = client.multi();
            requests.forEach(function (requestId) {
                multiCall.hgetall("request:" + requestId, function (err, request) {
                    console.log(request);
                });
            });
            multiCall.exec(function (err, replies) {
                res.json({
                    success: true,
                    requests: replies,
                });
            });
        });
    }
    else {
        res.json({
            success: false,
            message: "Missing userId",
        });
    }
});


// REQUEST ROUTES
// =============================================================================

router.post('/api/status', function (req, res) {

    var auth = req.headers.auth;
    var statusArray = req.body.statuses;



    var statusArray = JSON.parse(statusArray);


    res.json({
        success: true,
        message: "Statuses updated",
    });

    if (statusArray) {
        client.hget("auths", auth, function (err, userId) {
            client.hget("user:" + userId, "account", function (err, account) {

                console.log(account);

                var multiCall = client.multi();

                //Remove old
                client.zrange(account + ":status", 0, -1, function (err, statusList) {
                    statusList.forEach(function (status) {
                        multiCall.zrem(account + ":status", status);
                    });
                    multiCall.exec();
                });

                //Add new                
                multiCall = client.multi();
                order = 0;
                statusArray.forEach(function (status) {
                    multiCall.zadd(account + ":status", order, status, function (err, reply) { });
                    order++;
                });
                multiCall.exec(function (err, reply) {
                    res.json({
                        success: true,
                        message: "Statuses updated",
                    });
                });
            });
        });
    }
    else {
        res.json({
            success: false,
            message: "Missing title or order",
        });
    }
});

// WEB ROUTES
// =============================================================================

router.get('*', function (req, res) {
    res.sendfile('./public/index.html');
});

// =============================================================================
app.use('/', router);
app.listen(port);
console.log('Magic happens on port ' + port);