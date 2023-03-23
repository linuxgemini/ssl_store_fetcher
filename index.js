import fs from "node:fs";
import url from "node:url";
import path from "node:path";
import express from "express";
import chokidar from "chokidar";
import crypto from "node:crypto";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

chokidar.watch(path.join(__dirname, "certificates"))
    .on("add", (fileName) => {
        console.log("new file:", fileName);
    })
    .on("change", (fileName) => {
        console.log("file changed:", fileName);
    })
    .on("unlink", (pathName) => {
        console.log("something is removed:", pathName);
    });

app.listen(9183, () => {
    console.log("listening");
});