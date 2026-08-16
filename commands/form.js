"use strict";

const path = require("path");
const { runPython } = require("../lib/python.js");

function formScript(name) {
  return path.join(__dirname, "..", "scripts", "form", `${name}.py`);
}

async function cmdList(args) {
  const file = args._[0];
  if (!file) throw new Error("form list requires a PDF path");
  return runPython(formScript("list"), [file]);
}

async function cmdFill(args) {
  const file = args._[0];
  const field = args.options.field;
  const value = args.options.value;
  const output = args.options.output || args.options.o;
  if (!file || !field || !value) throw new Error("form fill requires a file, --field, --value");
  if (!output) throw new Error("form fill requires --output/-o");
  return runPython(formScript("fill"), ["--field", field, "--value", value, "--output", output, file]);
}

const handlers = {
  list: cmdList,
  fill: cmdFill,
};

async function runFormCommand(args) {
  const sub = args._[0];
  if (!sub || !handlers[sub]) {
    throw new Error(`unknown form command: ${sub || "(missing)"}`);
  }
  const subArgs = {
    _: args._.slice(1),
    options: args.options,
  };
  const out = await handlers[sub](subArgs);
  process.stdout.write(`${out}\n`);
}

module.exports = { runFormCommand };
