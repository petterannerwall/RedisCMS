var path = require('path')
var express = require('express');
var bodyParser = require('body-parser');
var redis = require("redis");

var app = express();
var client = redis.createClient();
var router = express.Router();

var helpers = require('./helpers');
var userController = require('./controllers/userController');
var authController = require('./controllers/authController');
var requestController = require('./controllers/requestController');

client.on("error", function (err) {
    console.log("Error " + err);
});

app.use('/scripts', express.static(path.resolve('./../node_modules/')));
app.use(express.static(path.resolve('./../client')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8787;

var requestKey = "request-";
var userKey = "user-";
var requestMetaKey = "request-meta-";

var secureRoutes = [
    'request',
];

router.use(function (req, res, next) {

    if (new RegExp(secureRoutes.join("|")).test(req.url)) {
        if (req.headers.auth) {
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
});

// USER ROUTES
// =============================================================================

router.get('/api/user', function (req, res) {
    userController.getUsers(function (result) {
        res.json(result);
    });
});

router.get('/api/user/:auth', function (req, res) {
    var userAuth = req.params.auth;
});

router.delete('/api/user', function (req, res) {
    var username = req.body.username.toLowerCase();
    userController.deleteUser(username, function (result) {
        res.json(result);
    })
});

router.post('/api/user', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var account = req.body.account;
    userController.createUser(username, password, account, function (result) {
        res.json(result);
    })
});

router.post('/api/login', function (req, res) {
    var username = req.body.username.toLowerCase();
    var password = req.body.password.toLowerCase();
    authController.login(username, password, function (result) {
        res.json(result);
    })
});

router.post('/api/logout', function (req, res) {
    var auth = req.headers.auth.toLowerCase();
    authController.logout(auth, function (result) {
        res.json(result);
    })
});

// REQUEST ROUTES
// =============================================================================

router.post('/api/request', function (req, res) {
    var auth = req.headers.auth;
    var title = req.body.title;
    var description = req.body.description;
    requestController.create(auth, title, description, function (result) {
        res.json(result);
    })
});

router.get('/api/request', function (req, res) {
    var auth = req.headers.auth;
    var page = parseInt(req.query.page);
    requestController.getAll(auth, page, function (result) {
        res.json(result);
    })
});

router.post('/api/request/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    var title = req.body.title;
    var description = req.body.description;
    requestController.update(requestId, title, description, function (result) {
        res.json(result);
    })
});

router.get('/api/request/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    requestController.get(requestId)
});


router.delete('/api/request/:requestId', function (req, res) {
    var requestId = req.params.requestId;
    requestController.delete(requestId, function (result) {
        res.json(result);
    })
});

router.get('/api/request/user/:userId', function (req, res) {
    var userId = req.params.userId;
    requestController.getByUserId(userId, function (result) {
        res.json(result);
    })
});

// MISC ROUTES
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
    res.sendfile(path.resolve('.(/../../client/index.html'));
});

// =============================================================================
app.use('/', router);
app.listen(port);
console.log('Magic happens on port ' + port);