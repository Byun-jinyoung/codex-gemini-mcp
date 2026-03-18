import { createRequire } from "node:module";
function readPackageVersion() {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json");
    if (typeof pkg.version !== "string" || pkg.version.trim().length === 0) {
        throw new Error("invalid package.json version");
    }
    return pkg.version;
}
export const VERSION = readPackageVersion();
