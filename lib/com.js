"use strict";

const { runPowerShell } = require("./background.js");

function psString(value) {
  return `'${value.replace(/'/g, "''")}'`;
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

module.exports = { saveAs };
