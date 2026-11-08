import fs from "node:fs";
import path from "node:path";
import { createDepartmentStoreCore } from "./department-core.mjs";
export { departments, required, localDraft, localLead, handleDepartmentApi } from "./department-core.mjs";

export function createDepartmentStore(filename) {
  const initial = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : null;
  return createDepartmentStoreCore(initial, (state) => {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const temp = `${filename}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(temp, filename);
  });
}
