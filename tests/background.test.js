"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bg = require("../lib/background.js");

test("state file add/remove/clear", () => {
  const stateFile = path.join(os.tmpdir(), `acrobat-cli-test-state-${Date.now()}.json`);
  const original = bg.DEFAULT_STATE_FILE;
  bg.setStateFile(stateFile);

  bg.writeState([]);
  assert.deepStrictEqual(bg.readState(), []);

  bg.addPid(101);
  bg.addPid(202);
  assert.deepStrictEqual(bg.readState(), [101, 202]);

  bg.removePid(101);
  assert.deepStrictEqual(bg.readState(), [202]);

  bg.clearState();
  assert.deepStrictEqual(bg.readState(), []);

  bg.setStateFile(original);
  fs.unlinkSync(stateFile);
});
