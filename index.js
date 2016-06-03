const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const moment = require("moment");
const path = require("path");
const _ = require("lodash");

// Express Addons
const postman = require("body-parser");
const cookies = require("cookie-parser");
const elogger = require("morgan");

// Import Modules
const core = require("./core.js");
const chat = require("./data/chat.json");
const database = require("./database.json");
const keychain = require("./keychain.js");

// Express Configuration
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
app.use("/data", express.static(path.join(__dirname, "data")));
app.use(elogger("short"));
app.use(cookies(keychain.session));
app.use(postman.json());
app.use(postman.urlencoded({ extended: true }));

// Storage
var users = {};

// Express Serve
app.get("/", (req, res) => {
    if (req.cookies.token && core.auth.token(req.cookies.token)) {
        // user already logged in
        res.redirect("/chat");
    } else {
        res.redirect("/login");
    }
});

app.get("/login", (req, res) => {
    if (req.cookies.token && core.auth.token(req.cookies.token)) {
        // user already logged in
        res.redirect("/chat");
    } else {
        res.sendFile(path.join(__dirname, "public", "login.html"));
    }
});

app.get("/chat", (req, res) => {
    if (req.cookies.token && core.auth.token(req.cookies.token)) {
        res.sendFile(path.join(__dirname, "public", "chat.html"));
    } else {
        res.redirect("/login");
    }
});

app.get("/create_account", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "new_user.html"));
});

app.get("/logout", (req, res) => {
    res.clearCookie("user");
    res.clearCookie("token");
    res.redirect("/login");
});

// API
app.post("/api/auth.login", (req, res) => {
    var data = req.body;
    var username = data.username.toLowerCase();
    var password = data.password;
    var hash = core.auth.hash(username, password);

    console.log(`auth.login - ${hash.ok}, ${data.username}, ${req.ip}`);

    if (hash.ok) {
        res.cookie("user", hash.username);
        res.cookie("token", hash.token);
        res.redirect("/chat");
    } else {
        res.redirect(`/login?e=${encodeURIComponent(hash.code)}`);
    }
});

app.post("/api/user.create", (req, res) => {
    var data = req.body;
    var push = core.auth.add_user(data);

    if (push.ok) {
        res.redirect(`/login?u=${encodeURIComponent(push.username)}`);
    } else {
        res.redirect(`/create_account?e=${encodeURIComponent(push.code)}`);
    }
});

app.use((req, res) => res.json({ ok: false, code: "ERR_NOT_FOUND" }));

// WebSocket
io.on("connection", (socket) => {
    socket.on("auth.user", (data) => {
        if (data.ok) {
            socket.token = data.token;
            socket.username = data.username;

            socket.emit("auth.user", {
                "ok": true,
                "username": socket.username,
                "token": socket.token
            });
        } else {
            socket.emit("error", {
                "ok": false,
                "code": "ERR_BAD_AUTH",
                "disconnect": true
            });
        }
    });

    socket.on("chat.post", (data) => {
        core.save(data);
        io.emit("chat.post", {
            "ok": true,
            "ts": data.ts,
            "username": socket.username,
            "message": core.safe(data.message)
        });
    });
});

// Start Server
http.listen(core.config.port, () => {
    console.log("Listening on http://localhost:" + core.config.port);
});
