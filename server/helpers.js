// helpers.js
// ========

module.exports = {

    uuid: function (a, b) {
        for (b = a = ''; a++ < 36; b += 4 << ~a * 6.5 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-'); return b
    },

    toUserList: function (object) {
        var users = [];
        for (var key in object) {
            if (!object.hasOwnProperty(key)) continue;
            var obj = object[key];
            for (var prop in obj) {
                if (!obj.hasOwnProperty(prop)) continue;
                users.push({ id: obj[prop], username: key });
            }
        }
        return users;
    },

    encodeUTF8: function (string) {
        return unescape(encodeURIComponent(string));
    },

    distinctArray: function (a) {
        var seen = {};
        return a.filter(function (item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    },

    generateAccountId: function () {
        var text = "";
        var possible = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        for (var i = 0; i < 4; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
};
