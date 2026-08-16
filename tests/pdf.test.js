"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { runPython } = require("../lib/python.js");

function pdfScript(name) {
  return path.join(__dirname, "..", "scripts", "pdf", `${name}.py`);
}

async function makeTempPdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  const file = path.join(os.tmpdir(), `acrobat-cli-test-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  fs.writeFileSync(file, await doc.save());
  return file;
}

test("pdf info shows page count", async () => {
  const file = await makeTempPdf(3);
  const out = await runPython(pdfScript("info"), [file]);
  assert.match(out, /Pages: 3/);
  fs.unlinkSync(file);
});

test("pdf merge combines files", async () => {
  const a = await makeTempPdf(1);
  const b = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `merge-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("merge"), ["--output", out, a, b]);
  assert.match(result, /Merged 2 files/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 3);
  fs.unlinkSync(a); fs.unlinkSync(b); fs.unlinkSync(out);
});

test("pdf split by ranges", async () => {
  const file = await makeTempPdf(5);
  const outDir = path.join(os.tmpdir(), `split-${Date.now()}`);
  const result = await runPython(pdfScript("split"), ["--ranges", "1-2,4", "--output", outDir, file]);
  assert.match(result, /part-1\.pdf/);
  assert.match(result, /part-2\.pdf/);
  assert.ok(fs.existsSync(path.join(outDir, "part-1.pdf")));
  assert.ok(fs.existsSync(path.join(outDir, "part-2.pdf")));
  fs.unlinkSync(file);
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("pdf rotate rotates pages", async () => {
  const file = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `rotate-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("rotate"), ["--pages", "1", "--angle", "90", "--output", out, file]);
  assert.match(result, /Rotated pages 1 by 90/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPage(0).getRotation().angle, 90);
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf delete removes pages", async () => {
  const file = await makeTempPdf(4);
  const out = path.join(os.tmpdir(), `delete-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("delete_pages"), ["--pages", "2,4", "--output", out, file]);
  assert.match(result, /Deleted pages 2,4/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 2);
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf extract by bookmarks", async () => {
  const src = "D:\\a考研\\Obsidian Vault\\考研数学\\习题集\\26李林880题-数学一-试题分册.pdf";
  const out = path.join(os.tmpdir(), `extract-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("extract"), ["--pdf", src, "--chapter", "相似矩阵", "--sections", "综合,拓展", "--output", out]);
  assert.match(result, /已保存/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 4);
  fs.unlinkSync(out);
});

test("pdf encrypt and decrypt roundtrip", async () => {
  const file = await makeTempPdf(2);
  const enc = path.join(os.tmpdir(), `enc-${Date.now()}.pdf`);
  const dec = path.join(os.tmpdir(), `dec-${Date.now()}.pdf`);
  await runPython(pdfScript("encrypt"), ["--user-password", "u", "--owner-password", "o", "--output", enc, file]);
  await runPython(pdfScript("decrypt"), ["--password", "u", "--output", dec, enc]);
  const loaded = await PDFDocument.load(fs.readFileSync(dec));
  assert.strictEqual(loaded.getPageCount(), 2);
  fs.unlinkSync(file); fs.unlinkSync(enc); fs.unlinkSync(dec);
});

test("pdf bookmarks prints outline", async () => {
  const src = "D:\\a考研\\Obsidian Vault\\考研数学\\习题集\\26李林880题-数学一-试题分册.pdf";
  const out = await runPython(pdfScript("bookmarks"), [src]);
  assert.match(out, /第十四章 相似矩阵/);
});

test("pdf insert-blank adds a page", async () => {
  const file = await makeTempPdf(3);
  const out = path.join(os.tmpdir(), `insert-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("insert_blank"), ["--after", "2", "--output", out, file]);
  assert.match(result, /Inserted blank page after 2/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 4);
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf crop keeps page count", async () => {
  const file = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `crop-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("crop"), ["--pages", "1", "--box", "0,0,100,100", "--output", out, file]);
  assert.match(result, /Cropped pages 1/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 2);
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf replace-pages replaces a range", async () => {
  const target = await makeTempPdf(3);
  const src = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `replace-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("replace_pages"), ["--src", src, "--range", "1-2", "--output", out, target]);
  assert.match(result, /Replaced pages 1-2/);
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 3);
  fs.unlinkSync(target); fs.unlinkSync(src); fs.unlinkSync(out);
});

test("pdf watermark writes output", async () => {
  const file = await makeTempPdf(1);
  const out = path.join(os.tmpdir(), `watermark-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("watermark"), ["--text", "test", "--output", out, file]);
  assert.match(result, /Watermarked/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf compress writes output", async () => {
  const file = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `compress-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("compress"), ["--output", out, file]);
  assert.match(result, /Compressed/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});

test("pdf pdfa writes output", async () => {
  const file = await makeTempPdf(1);
  const out = path.join(os.tmpdir(), `pdfa-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("pdfa"), ["--output", out, file]);
  assert.match(result, /PDF\/A/);
  assert.ok(fs.existsSync(out));
  fs.unlinkSync(file); fs.unlinkSync(out);
});
