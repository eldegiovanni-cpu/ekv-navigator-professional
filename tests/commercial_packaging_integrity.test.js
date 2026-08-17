"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
test("Portable Distribution enthält die vollständige Frontend Schicht", () => {
  const required = [
    "index.html", "assets/app.css", "assets/data.bundle.js",
    "assets/backend.bundle.js", "assets/frontend.bundle.js",
    "EKV Navigator starten.bat", "SHA256SUMS.txt"
  ];
  for (const rel of required) assert.equal(fs.existsSync(path.join(DIST, rel)), true, `Fehlt im Portable Build: ${rel}`);
  assert.ok(fs.statSync(path.join(DIST,"assets","app.css")).size > 50000);
  assert.ok(fs.statSync(path.join(DIST,"assets","frontend.bundle.js")).size > 100000);
});
