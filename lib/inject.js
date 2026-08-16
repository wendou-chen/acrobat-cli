"use strict";

const fs = require("fs");
const { PDFDocument, PDFName, PDFString } = require("pdf-lib");

const SELF_CLOSE_JS = "this.closeDoc(true);";

async function injectSelfClose(pdfPath, outputPath) {
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const action = doc.context.obj({
    S: "JavaScript",
    JS: PDFString.of(SELF_CLOSE_JS),
  });
  doc.catalog.set(PDFName.of("OpenAction"), action);
  const modified = await doc.save();
  fs.writeFileSync(outputPath, modified);
}

module.exports = { injectSelfClose, SELF_CLOSE_JS };
