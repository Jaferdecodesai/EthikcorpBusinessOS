import { STEPS, defaultSteps } from "./customer-logic.mjs";

function now() { return new Date().toISOString(); }

export function memoryRepository() {
  const steps = new Map(defaultSteps().map((step) => [step.id, { ...step }]));
  const owners = new Map();
  const submissions = new Map();
  const targets = { github: "", drive: "" };
  return {
    async snapshot() {
      return {
        steps: [...steps.values()],
        owners: [...owners.values()],
        submissions: [...submissions.values()],
        targets: { ...targets }
      };
    },
    async replaceOwners(rows) {
      owners.clear();
      const importedAt = now();
      for (const row of rows) owners.set(row.sourceId, { ...row, importedAt });
    },
    async saveSubmission(row) {
      submissions.set(row.sourceId, { ...row, submittedAt: now() });
    },
    async saveStep(step) {
      steps.set(step.id, { ...step });
    },
    async saveTargets(next) {
      targets.github = next.github;
      targets.drive = next.drive;
    }
  };
}

export function d1Repository(db) {
  return {
    async snapshot() {
      const count = await db.prepare("SELECT COUNT(*) AS n FROM build_step").first();
      if (!count || Number(count.n) === 0) {
        const stamped = now();
        const seed = defaultSteps().map((step) => db.prepare(
          "INSERT INTO build_step (id, n, status, needs_input, summary, progress, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(step.id, STEPS.find((item) => item.id === step.id).n, step.status, step.needsInput ? 1 : 0, step.summary, step.progress, stamped));
        seed.push(db.prepare("INSERT INTO delivery_target (id, url, updated_at) VALUES ('github', '', ?)").bind(stamped));
        seed.push(db.prepare("INSERT INTO delivery_target (id, url, updated_at) VALUES ('drive', '', ?)").bind(stamped));
        await db.batch(seed);
      }
      const steps = (await db.prepare("SELECT id, status, needs_input AS needsInput, summary, progress FROM build_step ORDER BY n").all()).results
        .map((row) => ({ ...row, needsInput: Boolean(row.needsInput), progress: Number(row.progress) }));
      const owners = (await db.prepare("SELECT source_id AS sourceId, department, owner_name AS ownerName, due_date AS dueDate, authority, not_for_ai AS notForAi, notes, imported_at AS importedAt FROM source_owner").all()).results
        .map((row) => ({ ...row, notForAi: Boolean(row.notForAi) }));
      const submissions = (await db.prepare("SELECT source_id AS sourceId, target, note, submitted_at AS submittedAt FROM source_submission").all()).results;
      const targetRows = (await db.prepare("SELECT id, url FROM delivery_target").all()).results;
      return {
        steps,
        owners,
        submissions,
        targets: {
          github: targetRows.find((row) => row.id === "github")?.url || "",
          drive: targetRows.find((row) => row.id === "drive")?.url || ""
        }
      };
    },
    async replaceOwners(rows) {
      const stamped = now();
      const statements = [db.prepare("DELETE FROM source_owner")];
      for (const row of rows) {
        statements.push(db.prepare(
          "INSERT INTO source_owner (source_id, department, owner_name, due_date, authority, not_for_ai, notes, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(row.sourceId, row.department, row.ownerName, row.dueDate, row.authority, row.notForAi ? 1 : 0, row.notes, stamped));
      }
      await db.batch(statements);
    },
    async saveSubmission(row) {
      await db.prepare(
        "INSERT INTO source_submission (source_id, target, note, submitted_at) VALUES (?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET target = excluded.target, note = excluded.note, submitted_at = excluded.submitted_at"
      ).bind(row.sourceId, row.target, row.note, now()).run();
    },
    async saveStep(step) {
      await db.prepare(
        "UPDATE build_step SET status = ?, needs_input = ?, summary = ?, progress = ?, updated_at = ? WHERE id = ?"
      ).bind(step.status, step.needsInput ? 1 : 0, step.summary, step.progress, now(), step.id).run();
    },
    async saveTargets(next) {
      const stamped = now();
      await db.batch([
        db.prepare("UPDATE delivery_target SET url = ?, updated_at = ? WHERE id = 'github'").bind(next.github, stamped),
        db.prepare("UPDATE delivery_target SET url = ?, updated_at = ? WHERE id = 'drive'").bind(next.drive, stamped)
      ]);
    }
  };
}
