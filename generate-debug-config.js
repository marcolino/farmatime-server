const { execSync } = require("child_process");
const fs = require("fs");

function getBinPath(packageName) {
  //return execSync(`yarn bin ${packageName}`, { encoding: "utf8" }).trim();
  return "/home/marco/apps/sistemisolari/acme-server/.yarn/cache/mocha-npm-9.2.2-f7735febb8-4d5ca4ce33.zip/node_modules/mocha/bin/mocha";
}

const debugConfig = {
  version: "0.2.0",
  configurations: [
    {
      type: "node",
      request: "launch",
      name: "Mocha Tests",
      program: getBinPath("mocha"),
      args: [
        "--require",
        "ts-node/register",
        "--timeout",
        "999999",
        "--colors",
        "${workspaceFolder}/tests/**/*.ts"
      ],
      console: "integratedTerminal",
      internalConsoleOptions: "neverOpen",
      env: {
        TS_NODE_PROJECT: "${workspaceFolder}/tsconfig.json"
      },
      runtimeExecutable: getBinPath("node")
    }
  ]
};

fs.writeFileSync(".vscode/launch.json", JSON.stringify(debugConfig, null, 2));
console.log("Debug configuration has been written to .vscode/launch.json");