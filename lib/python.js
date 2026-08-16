"use strict";

const { execFile } = require("child_process");

function runPython(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const candidates = process.env.PYTHON ? [process.env.PYTHON] : ["python", "py"];
    let index = 0;
    const attempt = () => {
      if (index >= candidates.length) {
        reject(new Error("python/py not found. Install Python 3 or set PYTHON env var."));
        return;
      }
      const python = candidates[index++];
      execFile(python, [scriptPath, ...args], {
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) {
          if (err.code === "ENOENT") {
            attempt();
            return;
          }
          reject(new Error(stderr.trim() || err.message));
          return;
        }
        resolve(stdout.trim());
      });
    };
    attempt();
  });
}

module.exports = { runPython };
