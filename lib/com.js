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
  # Sanity check: the JS bridge must be able to return a numeric property.
  $pages = $js.numPages
  if ($null -eq $pages -or $pages -eq '') { throw 'Acrobat JavaScript bridge is not functional (numPages returned empty)' }
  try {
    $null = $js.SaveAs($dst, $filter, '', $false, $false)
  } catch {
    $null = $js.SaveAs($dst, $filter)
  }
  if (-not (Test-Path -LiteralPath $dst)) { throw "SaveAs did not create output file: $dst" }
} finally {
  if ($js -ne $null) { try { $null = $js.closeDoc($true) } catch {} }
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
}
`;
  await runPowerShell(script);
}

async function checkNativeExport(src) {
  if (!src) throw new Error("checkNativeExport requires a PDF path");
  const dst = require("path").join(require("os").tmpdir(), "acrobat-cli-native-check.docx");
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$dst = ${psString(dst)}
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
  $pages = $js.numPages
  if ($null -eq $pages -or $pages -eq '') { throw 'JavaScript bridge not functional' }
  try {
    $null = $js.SaveAs($dst, 'com.adobe.acrobat.docx', '', $false, $false)
  } catch {
    $null = $js.SaveAs($dst, 'com.adobe.acrobat.docx')
  }
  if (-not (Test-Path -LiteralPath $dst)) { throw 'output file not created' }
  'NATIVE_EXPORT_OK'
} catch {
  "NATIVE_EXPORT_FAIL: $($_.Exception.Message)"
} finally {
  if ($js -ne $null) { try { $null = $js.closeDoc($true) } catch {} }
  if ($pdDoc -ne $null) { try { $pdDoc.Close() } catch {} }
  if ($avDoc -ne $null) { try { $avDoc.Close(1) } catch {} }
  if ($app -ne $null) { try { $app.Exit() } catch {} }
  if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Force }
}
`;
  const out = await runPowerShell(script);
  return out.trim();
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

module.exports = { save, saveAs, printPdf, exportNative, checkNativeExport, NATIVE_FILTERS };
