const { resolveRequest } = require("pnpapi");

const binaryName = "mocha";
const binaryPath = resolveRequest(`${binaryName}/package.json`, process.cwd());
console.log(binaryPath);