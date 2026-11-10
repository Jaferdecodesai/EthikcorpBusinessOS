import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(path.join(root, "src/main.tsx"), "utf8");
const product = readFileSync(path.join(root, "src/product.tsx"), "utf8");
const css = readFileSync(path.join(root, "src/portal.css"), "utf8");

test("the portal shell does not mount the customer guide rail", () => {
  assert.equal(main.includes("<GuideDock"), false);
  assert.equal(product.includes("<GuideDock"), false);
  assert.doesNotMatch(css, /\.pm-grid\s*\{[^}]*340px/);
  assert.match(main, /<ProductApp/);
});

test("the customer sidebar is the nine build steps", () => {
  assert.match(product, /aria-label="Build steps"/);
  assert.match(product, /STEPS\.map/);
});

test("status pills wrap onto their own row instead of covering the breadcrumb", () => {
  assert.match(css, /\.topbar\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.ctx\s*\{[^}]*min-width:\s*min\(100%,\s*max-content\)/);
  assert.match(css, /\.pills\s*\{[^}]*margin-left:\s*auto/);
});
