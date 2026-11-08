import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(path.join(root, "src/main.tsx"), "utf8");
const css = readFileSync(path.join(root, "src/portal.css"), "utf8");
const app = main.slice(main.indexOf("function App("), main.indexOf("function TemplateBanner("));

test("formation default workspace does not mount the customer guide rail", () => {
  assert.equal(app.includes("<GuideDock"), false);
  assert.doesNotMatch(css, /\.pm-grid\s*\{[^}]*340px/);
});

test("formation stage cards use a balanced three-column group", () => {
  assert.match(app, /className="stage-board"/);
  assert.match(css, /\.stage-board\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

test("status pills wrap onto their own row instead of covering the breadcrumb", () => {
  assert.match(css, /\.topbar\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.ctx\s*\{[^}]*min-width:\s*min\(100%,\s*max-content\)/);
  assert.match(css, /\.pills\s*\{[^}]*margin-left:\s*auto/);
});
