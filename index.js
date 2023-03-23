import fs from "node:fs";
import url from "node:url";
import path from "node:path";
import express from "express";
import chokidar from "chokidar";
import crypto from "node:crypto";
import { getFileList } from "./utils.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {Object.<string, crypto.X509Certificate>} */
const X509Certificates = {};
/** @type {Object.<string, crypto.KeyObject>} */
const privateKeys = {};

const certsDir = path.join(__dirname, "certificates");

const app = express();

const processFile = (fileName) => {
    if (X509Certificates[fileName]) return;
    try {
        const cert = new crypto.X509Certificate(fs.readFileSync(fileName));
        const keyFileName = fileName.replace(/\.pem$/i, ".key");
        if (fs.existsSync(keyFileName)) {
            const key = crypto.createPrivateKey(fs.readFileSync(keyFileName));
            if (cert.checkPrivateKey(key)) {
                X509Certificates[fileName] = cert;
                privateKeys[cert.fingerprint256] = key;
                console.log("loaded keypair of", fileName);
            }
        }
    } catch (e) {
        console.error(e);
    }
};

chokidar.watch(certsDir)
    .on("add", (fileName) => {
        if (path.extname(fileName) === ".pem") processFile(fileName);
    })
    .on("change", (fileName) => {
        if (path.extname(fileName) === ".pem") processFile(fileName);
    })
    .on("unlink", (pathName) => {
        if (X509Certificates[pathName]) {
            const cert = X509Certificates[pathName];
            delete X509Certificates[pathName];
            delete privateKeys[cert.fingerprint256];
            console.log("deleted keypair of", pathName);
        }
    });

setInterval(async () => {
    const files = await getFileList(certsDir);
    for (const fileName of files) {
        if (path.extname(fileName) === ".pem") processFile(fileName);
    }
}, 5000);

app.listen(9183, () => {
    console.log("listening");
});
