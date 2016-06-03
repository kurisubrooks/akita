function time() { return moment().format("X"); }

$(function() {
    var socket = io.connect();
    var $chat_input = $(".chat_input");
    var $chat_form = $(".chat_form");
    var storage = {
        user: {
            connected: false,
            token: undefined,
            username: undefined
        },
        last: {
            ts: undefined,
            user: undefined
        },
        cookies: {
            user: Cookies.get("user"),
            token: Cookies.get("token")
        }
    };

    if (storage.cookies.user && storage.cookies.token) {
        socket.emit("auth.user", { "ok": true, "ts": time(), "username": storage.cookies.user, "token": storage.cookies.token });
    } else {
        socket.emit("auth.user", { "ok": false, "ts": time(), "code": "ERR_BAD_COOKIES" });
    }

    socket.on("chat.post", function(data) {
        if (data.ok) {
            $chat_input.css("border-color", "#DDD");
        } else {
            $chat_input.css("border-color", "#E65757");
            return false;
        }

        var container = $(".messages");
        var chat_div =  $("<div class=\"message\"></div>");
        var chat_time = $("<div class=\"message-time\"></div>").text(data.ts);
        var chat_user = $("<div class=\"message-user\"></div>").text(data.username);
        var chat_msg =  $("<div class=\"message-msg\"></div>").html(data.message);

        chat_div.append(chat_time);
        chat_div.append(chat_user);
        chat_div.append(chat_msg);
        container.append(chat_div);

        storage.last.user = data.username;
        storage.last.ts = data.ts;
    });

    socket.on("auth.user", function(data) {
        if (data.ok) {
            storage.user.connected = true;
            storage.user.token = data.token;
            storage.user.username = data.username;
        }
    });

    socket.on("error", function(data) {
        console.error(data.code);
        $(".error").text(data.code);
        $(".error").show();

        if (data.disconnect) socket.disconnect();
    });

    $chat_form.submit(function() {
        if (!$.trim($chat_input.val())) {
            return false;
        } else {
            socket.emit("chat.post", { "ok": true, "ts": time(), "message": $chat_input.val().trim() });
            $chat_input.val("");
            return false;
        }
    });
});
