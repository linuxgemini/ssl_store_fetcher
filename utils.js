import { join } from "node:path";
import { readdir } from "node:fs/promises";

/**
 * @param {string} dirName Pathname of the directory.
 * @returns {string[]}
 */
const getFileList = async (dirName) => {
    let files = [];
    const items = await readdir(dirName, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            files = [
                ...files,
                ...(await getFileList(join(dirName, item.name))),
            ];
        } else {
            files.push(join(dirName, item.name));
        }
    }

    return files;
};

export {
    getFileList,
};