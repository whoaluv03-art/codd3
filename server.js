const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

function sendJSON(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(data));
}

function readItems(callback) {
    fs.readFile(DATA_FILE, "utf8", function (err, text) {
        if (err) {
            callback(err, null);
            return;
        }

        try {
            const items = JSON.parse(text);
            callback(null, items);
        } catch (err) {
            callback(err, null);
        }
    });
}

function writeItems(items, callback) {
    fs.writeFile(
        DATA_FILE,
        JSON.stringify(items, null, 2),
        "utf8",
        callback
    );
}

function readBody(req, callback) {
    let body = "";

    req.on("data", function (chunk) {
        body += chunk;
    });

    req.on("end", function () {
        try {
            const data = JSON.parse(body);
            callback(null, data);
        } catch (err) {
            callback(err, null);
        }
    });
}

const server = http.createServer(function (req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
        sendJSON(res, 200, {
            message: "Books API",
            routes: [
                "GET /",
                "GET /items",
                "GET /items?genre=Fantasy",
                "GET /items/:id",
                "POST /items"
            ]
        });
        return;
    }

    if (req.method === "POST" && url.pathname === "/items") {
        readBody(req, function (err, newItem) {
            if (err || !newItem || !newItem.title) {
                sendJSON(res, 400, {
                    error: "Требуется поле title"
                });
                return;
            }

            readItems(function (err, items) {
                if (err) {
                    sendJSON(res, 500, {
                        error: "Не удалось прочитать данные"
                    });
                    return;
                }

                const newId = items.length > 0
                    ? Math.max(...items.map(item => item.id)) + 1
                    : 1;

                newItem.id = newId;
                items.push(newItem);

                writeItems(items, function (err) {
                    if (err) {
                        sendJSON(res, 500, {
                            error: "Не удалось сохранить данные"
                        });
                        return;
                    }

                    sendJSON(res, 201, newItem);
                });
            });
        });
        return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/items/")) {
        const id = Number(url.pathname.split("/")[2]);

        if (Number.isNaN(id)) {
            sendJSON(res, 404, {
                error: "Запись не найдена"
            });
            return;
        }

        readItems(function (err, items) {
            if (err) {
                sendJSON(res, 500, {
                    error: "Не удалось прочитать данные"
                });
                return;
            }

            const item = items.find(function (item) {
                return item.id === id;
            });

            if (!item) {
                sendJSON(res, 404, {
                    error: "Запись не найдена"
                });
                return;
            }

            sendJSON(res, 200, item);
        });
        return;
    }

    if (req.method === "GET" && url.pathname === "/items") {
        readItems(function (err, items) {
            if (err) {
                sendJSON(res, 500, {
                    error: "Не удалось прочитать данные"
                });
                return;
            }

            const filterField = url.searchParams.keys().next().value;

            if (filterField) {
                const filterValue = url.searchParams.get(filterField);

                const filteredItems = items.filter(function (item) {
                    return String(item[filterField]).toLowerCase() ===
                        String(filterValue).toLowerCase();
                });

                sendJSON(res, 200, filteredItems);
                return;
            }

            sendJSON(res, 200, items);
        });
        return;
    }

    sendJSON(res, 404, {
        error: "Маршрут не найден"
    });
});

server.listen(PORT, function () {
    console.log(`Server started on http://localhost:${PORT}`);
});