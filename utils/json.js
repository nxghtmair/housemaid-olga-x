const fs = require("fs");

function loadJson(path, def) {
    try {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load", path, e);
    }
    return def;
}

function saveJson(path, data) {
    try {
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to save", path, e);
    }
}

module.exports = { loadJson, saveJson };
