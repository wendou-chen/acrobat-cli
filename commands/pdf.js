"use strict";

const path = require("path");
const { runPython } = require("../lib/python.js");
const { injectSelfClose } = require("../lib/inject.js");

function pdfScript(name) {
  return path.join(__dirname, "..", "scripts", "pdf", `${name}.py`);
}

async function cmdInfo(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf info requires a file path");
  return runPython(pdfScript("info"), [file]);
}

async function cmdMerge(args) {
  const files = args._;
  const output = args.options.output || args.options.o;
  if (files.length < 2) throw new Error("pdf merge requires at least two input files");
  if (!output) throw new Error("pdf merge requires --output/-o");
  return runPython(pdfScript("merge"), ["--output", output, ...files]);
}

async function cmdSplit(args) {
  const file = args._[0];
  const ranges = args.options.ranges;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf split requires a file path");
  if (!ranges) throw new Error("pdf split requires --ranges");
  if (!output) throw new Error("pdf split requires --output/-o");
  return runPython(pdfScript("split"), ["--ranges", ranges, "--output", output, file]);
}

async function cmdRotate(args) {
  const file = args._[0];
  const pages = args.options.pages;
  const angle = args.options.angle;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf rotate requires a file path");
  if (!pages) throw new Error("pdf rotate requires --pages");
  if (!angle) throw new Error("pdf rotate requires --angle");
  if (!output) throw new Error("pdf rotate requires --output/-o");
  return runPython(pdfScript("rotate"), ["--pages", pages, "--angle", String(angle), "--output", output, file]);
}

async function cmdDelete(args) {
  const file = args._[0];
  const pages = args.options.pages;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf delete requires a file path");
  if (!pages) throw new Error("pdf delete requires --pages");
  if (!output) throw new Error("pdf delete requires --output/-o");
  return runPython(pdfScript("delete_pages"), ["--pages", pages, "--output", output, file]);
}

async function cmdInsertBlank(args) {
  const file = args._[0];
  const after = Number(args.options.after);
  const output = args.options.output || args.options.o;
  if (!file || !Number.isInteger(after) || after < 1) throw new Error("pdf insert-blank requires a file and --after <page>");
  if (!output) throw new Error("pdf insert-blank requires --output/-o");
  const width = Number(args.options.width || 595);
  const height = Number(args.options.height || 842);
  return runPython(pdfScript("insert_blank"), [
    "--after", String(after),
    "--width", String(width),
    "--height", String(height),
    "--output", output,
    file,
  ]);
}

async function cmdCrop(args) {
  const file = args._[0];
  const pages = args.options.pages;
  const box = args.options.box;
  const output = args.options.output || args.options.o;
  if (!file || !pages || !box) throw new Error("pdf crop requires a file, --pages, --box");
  if (!output) throw new Error("pdf crop requires --output/-o");
  return runPython(pdfScript("crop"), ["--pages", pages, "--box", box, "--output", output, file]);
}

async function cmdReplacePages(args) {
  const file = args._[0];
  const src = args.options.src;
  const range = args.options.range;
  const output = args.options.output || args.options.o;
  if (!file || !src || !range) throw new Error("pdf replace-pages requires a file, --src, --range");
  if (!output) throw new Error("pdf replace-pages requires --output/-o");
  return runPython(pdfScript("replace_pages"), ["--src", src, "--range", range, "--output", output, file]);
}

async function cmdWatermark(args) {
  const file = args._[0];
  const text = args.options.text;
  const output = args.options.output || args.options.o;
  if (!file || !text) throw new Error("pdf watermark requires a file and --text");
  if (!output) throw new Error("pdf watermark requires --output/-o");
  return runPython(pdfScript("watermark"), ["--text", text, "--output", output, file]);
}

async function cmdCompress(args) {
  const file = args._[0];
  const output = args.options.output || args.options.o;
  if (!file || !output) throw new Error("pdf compress requires a file and --output/-o");
  return runPython(pdfScript("compress"), ["--output", output, file]);
}

async function cmdPdfa(args) {
  const file = args._[0];
  const output = args.options.output || args.options.o;
  if (!file || !output) throw new Error("pdf pdfa requires a file and --output/-o");
  return runPython(pdfScript("pdfa"), ["--output", output, file]);
}

async function cmdExtract(args) {
  const file = args._[0] || args.options.pdf;
  const chapter = args.options.chapter;
  const sections = args.options.sections;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf extract requires a file path");
  if (!chapter) throw new Error("pdf extract requires --chapter");
  if (!sections) throw new Error("pdf extract requires --sections");
  if (!output) throw new Error("pdf extract requires --output/-o");
  return runPython(pdfScript("extract"), ["--pdf", file, "--chapter", chapter, "--sections", sections, "--output", output]);
}

async function cmdEncrypt(args) {
  const file = args._[0];
  const userPassword = args.options["user-password"];
  const ownerPassword = args.options["owner-password"];
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf encrypt requires a file path");
  if (!userPassword) throw new Error("pdf encrypt requires --user-password");
  if (!ownerPassword) throw new Error("pdf encrypt requires --owner-password");
  if (!output) throw new Error("pdf encrypt requires --output/-o");
  return runPython(pdfScript("encrypt"), [
    "--user-password", userPassword,
    "--owner-password", ownerPassword,
    "--output", output,
    file,
  ]);
}

async function cmdDecrypt(args) {
  const file = args._[0];
  const password = args.options.password;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf decrypt requires a file path");
  if (!password) throw new Error("pdf decrypt requires --password");
  if (!output) throw new Error("pdf decrypt requires --output/-o");
  return runPython(pdfScript("decrypt"), ["--password", password, "--output", output, file]);
}

async function cmdBookmarks(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf bookmarks requires a file path");
  return runPython(pdfScript("bookmarks"), [file]);
}

async function cmdInject(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf inject requires a file path");
  const output = args.options.output || file;
  await injectSelfClose(file, output);
  return `injected: ${file}`;
}

const handlers = {
  info: cmdInfo,
  merge: cmdMerge,
  split: cmdSplit,
  rotate: cmdRotate,
  delete: cmdDelete,
  "insert-blank": cmdInsertBlank,
  crop: cmdCrop,
  "replace-pages": cmdReplacePages,
  watermark: cmdWatermark,
  compress: cmdCompress,
  pdfa: cmdPdfa,
  extract: cmdExtract,
  encrypt: cmdEncrypt,
  decrypt: cmdDecrypt,
  bookmarks: cmdBookmarks,
  inject: cmdInject,
};

async function runPdfCommand(args) {
  const sub = args._[0];
  if (!sub || !handlers[sub]) {
    throw new Error(`unknown pdf command: ${sub || "(missing)"}`);
  }
  const subArgs = {
    _: args._.slice(1),
    options: args.options,
  };
  const out = await handlers[sub](subArgs);
  process.stdout.write(`${out}\n`);
}

module.exports = { runPdfCommand };
