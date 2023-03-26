#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import url from "node:url";
import path from "node:path";
import express from "express";
import chokidar from "chokidar";
import crypto from "node:crypto";
import { getFileList, findTLSCipherName, findTLSSignatureSchemeName } from "./utils.js"; // eslint-disable-line no-unused-vars
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 9183;

const certsDir = path.join(__dirname, "certificates");

/** @type {Object.<string, crypto.X509Certificate>} */
const X509Certificates = {};
/** @type {Object.<string, Buffer>} */
const rawX509Certificates = {};
/** @type {Object.<string, crypto.KeyObject>} */
const privateKeys = {};

const app = express();

/**
 * @param {string} fileName
 * @returns {void}
 */
const processFile = (fileName) => {
    if (X509Certificates[fileName]) return;
    try {
        const certFile = fs.readFileSync(fileName);
        const cert = new crypto.X509Certificate(certFile);
        const keyFileName = fileName.replace(/\.pem$/i, ".key");
        if (fs.existsSync(keyFileName)) {
            const keyFile = fs.readFileSync(keyFileName);
            const key = crypto.createPrivateKey(keyFile);
            if (cert.checkPrivateKey(key)) {
                X509Certificates[fileName] = cert;
                rawX509Certificates[cert.fingerprint256] = certFile;
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
            delete rawX509Certificates[cert.fingerprint256];
            delete privateKeys[cert.fingerprint256];
            console.log("deleted keypair of", pathName);
        }
    });

const periodicUpdater = setInterval(async () => {
    const files = await getFileList(certsDir);
    for (const fileName of files) {
        if (path.extname(fileName) === ".pem") processFile(fileName);
    }
}, 5000);

app.get("/certs", (req, res, next) => { // eslint-disable-line no-unused-vars
    const { server_name } = req.query;
    if (!server_name) return res.status(400).send("Bad Request");

    let { cipher_suites, signature_schemes } = req.query;
    cipher_suites = cipher_suites.split(",").map(c => findTLSCipherName(c)); // eslint-disable-line no-unused-vars
    signature_schemes = signature_schemes.split(",").map(s => findTLSSignatureSchemeName(s)); // eslint-disable-line no-unused-vars

    const matchedCert = Object.values(X509Certificates).find((cert) => (net.isIP(server_name) === 0 ? cert.checkHost(server_name) : cert.checkIP(server_name)));
    if (!matchedCert) return res.status(404).send("Certificate Not Found");
    const matchedCertFile = rawX509Certificates[matchedCert.fingerprint256];
    const matchedKey = privateKeys[matchedCert.fingerprint256];

    res
        .status(200)
        .header("Content-Type", "application/x-pem-file")
        .send(
            Buffer.concat([
                matchedCertFile,
                Buffer.from("\n\n"),
                Buffer.from(
                    matchedKey.export({
                        type: "pkcs8",
                        format: "pem",
                    }),
                ),
            ]),
        );
});

const server = app.listen(PORT, () => {
    console.log(`listening on :${PORT}`);
});

const terminate = () => {
    console.warn("Termination signal received: closing HTTP server, will hard quit after 5 seconds");

    if (periodicUpdater) clearInterval(periodicUpdater);

    if (server) {
        server.close(() => {
            console.log("HTTP server gracefully closed");
            process.exit(0);
        });
    }

    setTimeout(() => { return process.exit(0); }, 5000);
};

process.on("SIGTERM", terminate);
process.on("SIGINT", terminate);
