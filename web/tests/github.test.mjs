import test from "node:test";
import assert from "node:assert/strict";
import { validateRepo, validateUpload, cleanPMState } from "../server/github.mjs";

test("repository paths reject traversal and require simple branch", () => {
  assert.throws(() => validateRepo({ owner: "ethikcorp", name: "brain", branch: "main", root: "../secrets" }));
  assert.throws(() => validateRepo({ owner: "ethikcorp", name: "brain", branch: "feature/test", root: "pm" }));
  assert.deepEqual(validateRepo({ owner: "ethikcorp", name: "brain", branch: "main", root: "pm/sources" }), { owner: "ethikcorp", name: "brain", branch: "main", root: "pm/sources" });
});
test("restricted categories cannot enter GitHub upload endpoint", () => {
  const base = { fileName: "current.md", base64: Buffer.from("approved").toString("base64"), owner: "Marketing", originalLocator: "https://example.test/source", approvalRef: "REG-01", approved: true };
  assert.throws(() => validateUpload({ ...base, sourceId: "hr" }), /metadata-only/);
  assert.throws(() => validateUpload({ ...base, sourceId: "profile", approved: false }), /approval/);
  assert.throws(() => validateUpload({ ...base, sourceId: "profile", approvalRef: "" }), /approval reference/);
  assert.equal(validateUpload({ ...base, sourceId: "profile" }).extension, "md");
});
test("sync file keeps only PM metadata, not arbitrary secrets", () => {
  const clean = cleanPMState({ checked: { "discover-owners": true }, records: { profile: { status: "located", owner: "Marketing", locator: "/approved", note: "", token: "secret" } }, token: "secret" });
  assert.equal(clean.checked["discover-owners"], true);
  assert.equal(clean.records.profile.token, undefined);
  assert.equal(clean.token, undefined);
});
