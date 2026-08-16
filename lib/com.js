"use strict";

const { runPowerShell } = require("./background.js");

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function printPdf(src, firstPage, lastPage) {
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$first = ${firstPage}
$last = ${lastPage}
$app = $null
$avDoc = $null
$pdDoc = $null
try {
  $app = New-Object -ComObject AcroExch.App
  $app.Hide()
  $avDoc = New-Object -ComObject AcroExch.AVDoc
  $null = $avDoc.Open($src, '')
  $pdDoc = $avDoc.GetPDDoc()
  $numPages = $pdDoc.GetNumPages() - 1
  if ($last -lt 0 -or $last -gt $numPages) { $last = $numPages }
  $null = $avDoc.PrintPages($first, $last, 1, 1, 1)
} finally {
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
}
`;
  await runPowerShell(script);
}

const NATIVE_FILTERS = {
  docx: "com.adobe.acrobat.docx",
  xlsx: "com.adobe.acrobat.xlsx",
  pptx: "com.adobe.acrobat.pptx",
  html: "com.adobe.acrobat.html",
  txt: "com.adobe.acrobat.txt",
};

async function exportNative(src, format, dst) {
  const filter = NATIVE_FILTERS[format];
  if (!filter) throw new Error(`unsupported native export format: ${format}`);
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$dst = ${psString(dst)}
$filter = ${psString(filter)}
$app = $null
$avDoc = $null
$pdDoc = $null
$js = $null
try {
  $app = New-Object -ComObject AcroExch.App
  $app.Hide()
  $avDoc = New-Object -ComObject AcroExch.AVDoc
  $null = $avDoc.Open($src, '')
  $pdDoc = $avDoc.GetPDDoc()
  $js = $pdDoc.GetJSObject()
  $null = $js.SaveAs($dst, $filter)
  $null = $js.closeDoc($true)
} finally {
  if ($js -ne $null) { try { $null = $js.closeDoc($true) } catch {} }
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
}
`;
  await runPowerShell(script);
}

async function save(src) {
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$app = $null
$avDoc = $null
$pdDoc = $null
try {
  $app = New-Object -ComObject AcroExch.App
  $app.Hide()
  $avDoc = New-Object -ComObject AcroExch.AVDoc
  $null = $avDoc.Open($src, '')
  $pdDoc = $avDoc.GetPDDoc()
  $null = $pdDoc.Save(1, $src)
} finally {
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
}
`;
  await runPowerShell(script);
}

async function saveAs(src, dst) {
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$dst = ${psString(dst)}
$app = $null
$avDoc = $null
$pdDoc = $null
try {
  $app = New-Object -ComObject AcroExch.App
  $app.Hide()
  $avDoc = New-Object -ComObject AcroExch.AVDoc
  $null = $avDoc.Open($src, '')
  $pdDoc = $avDoc.GetPDDoc()
  $null = $pdDoc.Save(1, $dst)
} finally {
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
}
`;
  await runPowerShell(script);
}

module.exports = { save, saveAs, printPdf, exportNative, NATIVE_FILTERS };
