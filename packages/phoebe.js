import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const VENV_PATH = path.resolve(process.cwd(), "./.venv");
const WORKSPACE_PATH = path.resolve(import.meta.dirname);

function createVenv() {
    if (!fs.existsSync(VENV_PATH)) {
        execSync(`python -m venv "${VENV_PATH}"`, { stdio: "inherit" });
    }
}

function activeVenv() {
    const activatePath = path.resolve(VENV_PATH, process.platform === "win32" ? "Scripts/Activate.ps1" : "bin/activate");

    if (process.platform === "win32") {
        execSync(`powershell.exe "${activatePath}"`, { stdio: "inherit" });
    } else {
        execSync(`bash -c 'source "${activatePath}"'`, { stdio: "inherit" });
    }
}

function install() {
    const pipPath = path.resolve(VENV_PATH, process.platform === "win32" ? "Scripts/pip.exe" : "bin/pip");

    execSync(`"${pipPath}" install -e "${WORKSPACE_PATH}"`, { stdio: "inherit" });
}

function execute(pkg) {
    const pythonPath = path.resolve(VENV_PATH, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const pkgPath = path.resolve(WORKSPACE_PATH, pkg);

    execSync(`"${pythonPath}" "${pkgPath}"`, { stdio: "inherit" });
}

void function () {
    const args = process.argv.slice(2);
    const mode = args[0];

    createVenv();

    switch (mode) {
        case "train":
            activeVenv();
            execute("train");
            break;
        case "setup":
            activeVenv();
            install();
            break;
        default: break;
    }
}();
