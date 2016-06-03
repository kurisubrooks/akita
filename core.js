const crypto = require("crypto");
const moment = require("moment");
const fs = require("fs");
const _ = require("lodash");

const database = require("./database.json");

function time() {
    return moment().format("X");
}

function key() {
    return crypto.randomBytes(48).toString("hex");
}

exports.safe = function(input) {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

exports.config = {
    port: 8080
};

exports.save = function(data) {
    
};

exports.auth = {
    token: function(token) {
        var data = _.findKey(database.users, { token: token });
        if (data) return true;
        else return false;
    },
    hash: function(username, password) {
        var id = _.findKey(database.users, { username: username });

        if (!database.users[id]) return { ok: false, ts: time(), code: "ERR_USER_NOEXIST" };

        var salt = database.users[id].salt;
        var hash = crypto.createHash("sha256").update(password + salt).digest("hex");

        if (database.users[id].password === hash)
            return { ok: true, ts: time(), username: username, token: database.users[id].token };
        else
            return { ok: false, ts: time(), code: "ERR_PASSWD_MISMATCH" };
    },
    add_user: function(data) {
        if (!data.username || !data.password || !data.email)
            return { ok: false, ts: time(), code: "ERR_FIELD_MISSING" };

        var db    = require("./database.json");
        var id    = "U0" + crypto.randomBytes(3).toString("hex").toUpperCase();
        var token = "T0" + crypto.createHash("md5").update(key()).digest("hex").toUpperCase();
        var icon  = crypto.createHash("md5").update(data.email).digest("hex");
        var salt  = crypto.randomBytes(32).toString("base64");
        var hash  = crypto.createHash("sha256").update(data.password + salt).digest("hex");
        var exist = _.findKey(db.users, { username: data.username });

        if (exist) return { ok: false, ts: time(), code: "ERR_USER_EXIST", username: data.username };

        db.users[id] = {
            type: 0,
            token: token,
            username: data.username,
            email: data.email,
            icon: icon,
            salt: salt,
            password: hash
        };

        try {
            fs.writeFileSync("./database.json", JSON.stringify(db, null, 4));
            return { ok: true, ts: time(), code: "SUCCESS", username: data.username };
        } catch (error) {
            return { ok: false, ts: time(), code: "ERR_WRITEFAIL", message: error };
        }
    }
};
