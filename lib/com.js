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
$app = New-Object -ComObject AcroExch.App
$app.Hide()
$avDoc = New-Object -ComObject AcroExch.AVDoc
$null = $avDoc.Open($src, '')
$pdDoc = $avDoc.GetPDDoc()
$numPages = $pdDoc.GetNumPages() - 1
if ($last -lt 0 -or $last -gt $numPages) { $last = $numPages }
$null = $avDoc.PrintPages($first, $last, 1, 1, 1)
$avDoc.Close(1)
$app.Exit()
`;
  await runPowerShell(script);
}

async function save(src) {
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$app = New-Object -ComObject AcroExch.App
$app.Hide()
$avDoc = New-Object -ComObject AcroExch.AVDoc
$null = $avDoc.Open($src, '')
$pdDoc = $avDoc.GetPDDoc()
$null = $pdDoc.Save(1, $src)
$avDoc.Close(1)
$app.Exit()
`;
  await runPowerShell(script);
}

async function saveAs(src, dst) {
  const script = `
$ErrorActionPreference = 'Stop'
$src = ${psString(src)}
$dst = ${psString(dst)}
$app = New-Object -ComObject AcroExch.App
$app.Hide()
$avDoc = New-Object -ComObject AcroExch.AVDoc
$null = $avDoc.Open($src, '')
$pdDoc = $avDoc.GetPDDoc()
$null = $pdDoc.Save(1, $dst)
$avDoc.Close(1)
$app.Exit()
`;
  await runPowerShell(script);
}

module.exports = { save, saveAs, printPdf };
