"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { runPython } = require("../lib/python.js");

async function makeTempPdf(pageCount = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  const file = path.join(os.tmpdir(), `acrobat-cli-phase4-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  fs.writeFileSync(file, await doc.save());
  return file;
}

function script(name) {
  return path.join(__dirname, "..", "scripts", `${name}.py`);
}

test("form list reports no fields on plain pdf", async () => {
  const file = await makeTempPdf(1);
  const out = await runPython(path.join(__dirname, "..", "scripts", "form", "list.py"), [file]);
  assert.match(out, /No form fields found/);
  fs.unlinkSync(file);
});

test("annotate writes output", async () => {
  const file = await makeTempPdf(1);
  const out = path.join(os.tmpdir(), `annotate-${Date.now()}.pdf`);
  const result = await runPython(script("annotate"), ["--page", "1", "--rect", "10,10,100,100", "--output", out, file]);
  assert.match(result, /Added highlight annotation/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("sign writes output", async () => {
  const file = await makeTempPdf(1);
  const out = path.join(os.tmpdir(), `sign-${Date.now()}.pdf`);
  const result = await runPython(script("sign"), ["--text", "test", "--page", "1", "--rect", "10,10,200,100", "--output", out, file]);
  assert.match(result, /Signed with text/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("ocr writes text output", async () => {
  const file = await makeTempPdf(1);
  const out = path.join(os.tmpdir(), `ocr-${Date.now()}.txt`);
  const result = await runPython(script("ocr"), ["--lang", "eng", "--output", out, file]);
  assert.match(result, /OCR complete/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});
