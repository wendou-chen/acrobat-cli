"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument, PDFName } = require("pdf-lib");
const { injectSelfClose, OUTLINE_RE, SELF_CLOSE_JS } = require("../acrobat-cli.js");

test("OUTLINE_RE matches outline temp PDF names", () => {
  assert.ok(OUTLINE_RE.test("outline-markdown-export-native-abc123.pdf"));
  assert.ok(!OUTLINE_RE.test("normal.pdf"));
});

test("injectSelfClose adds self-close OpenAction to a PDF", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  const src = path.join(os.tmpdir(), "acrobat-cli-smoke-src.pdf");
  const dst = path.join(os.tmpdir(), "acrobat-cli-smoke-out.pdf");
  fs.writeFileSync(src, await doc.save());

  await injectSelfClose(src, dst);

  const loaded = await PDFDocument.load(fs.readFileSync(dst));
  const openAction = loaded.catalog.get(PDFName.of("OpenAction"));
  assert.ok(openAction, "OpenAction should exist");
  const js = openAction.get(PDFName.of("JS"));
  assert.ok(js.toString().includes(SELF_CLOSE_JS), "OpenAction JS should be self-close");

  fs.unlinkSync(src);
  fs.unlinkSync(dst);
});
