import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; owner: string; status: string; dueDate?: string };
type Run = { id: string; name: string; status: string; output?: string; outputHash?: string; review?: { reviewer: string } };
type Automation = { id: string; name: string; trigger: string; steps: string[]; status: string; hash: string; review?: { reviewer: string; note: string } };
type Workboard = { definition: { workflows: { id: string; name: string }[] }; tasks: Task[]; runs: Run[]; automations?: Automation[] };
const statuses = { todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done" };

async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The workboard request failed.");
  return result;
}

export function DepartmentSupervision({ id, active, editable, shared, canValidate }: { id: string; active: boolean; editable: boolean; shared: boolean; canValidate: boolean }) {
  const root = `/api/departments/${id}`;
  const [data, setData] = useState<Workboard | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showDone, setShowDone] = useState(false);
  useEffect(() => {
    let current = true;
    request(root).then((value) => { if (current) setData(value); }).catch((reason: Error) => { if (current) setError(reason.message); });
    return () => { current = false; };
  }, [root]);

  async function change(path: string, method: string, body: unknown) {
    setPending(true);
    setError("");
    try {
      await request(`${root}/${path}`, method, body);
      setData(await request(root));
      return true;
    } catch (reason) {
      setError((reason as Error).message);
      return false;
    } finally { setPending(false); }
  }

  const tasks = data?.tasks.filter((task) => showDone ? task.status === "done" : task.status !== "done") || [];
  const automations = data?.automations || [];
  return <section className="card pad supervision" aria-label="Department workboard">
    <div className="ch"><h2>Department workboard</h2><span className={`badge ${active ? "success" : "neutral"}`}>{active ? "Bot active" : "Awaiting activation"}</span></div>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading department records…</p>}
    {data && <div className="supervision-columns">
      <section>
        <h3>{showDone ? "Completed tasks" : "Pending tasks"}</h3>
        <button type="button" className="btn ghost sm" onClick={() => setShowDone(!showDone)}>{showDone ? "View pending" : "View completed"}</button>
        {tasks.length ? <ul className="supervision-list">{tasks.map((task) => <li key={task.id}><span><strong>{task.title}</strong><small>{task.owner || "Unassigned"}{task.dueDate ? ` · Due ${task.dueDate}` : ""}</small></span>
          {editable ? <select aria-label={`Status for ${task.title}`} value={task.status} disabled={pending} onChange={(event) => void change(`tasks/${task.id}`, "PATCH", { status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <span>{statuses[task.status as keyof typeof statuses]}</span>}
        </li>)}</ul> : <p className="note">{showDone ? "No completed tasks." : "No pending tasks."}</p>}
        {editable && <form className="stack" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fields = new FormData(form);
          if (await change("tasks", "POST", { title: fields.get("title"), owner: fields.get("owner"), dueDate: fields.get("dueDate"), notes: fields.get("notes") })) { form.reset(); setShowDone(false); }
        }}>
          <h3>Assign task</h3>
          <label>Task title<input name="title" required maxLength={200} /></label>
          <label>Assignee<input name="owner" maxLength={120} /></label>
          <label>Due date<input name="dueDate" type="date" /></label>
          <label>Notes<textarea name="notes" rows={2} maxLength={4000} /></label>
          <button className="btn" type="submit" disabled={pending}>Assign task</button>
        </form>}
      </section>
      <section>
        <h3>Workflow drafts</h3>
        {data.runs.length ? <ul className="supervision-list">{data.runs.map((run) => <li key={run.id}><details>
          <summary>{run.name} · {run.status.replaceAll("_", " ")}</summary>
          {run.output && <pre>{run.output}</pre>}
          {run.review && <p className="note">Reviewed by {run.review.reviewer}</p>}
          {editable && run.status === "pending_review" && <form className="stack" onSubmit={async (event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            await change(`runs/${run.id}/review`, "POST", { decision: fields.get("decision"), reviewer: fields.get("reviewer"), note: fields.get("note"), outputHash: run.outputHash });
          }}>
            {!shared && <label>Reviewer<input name="reviewer" required maxLength={120} /></label>}
            <label>Decision<select name="decision"><option value="approve">Approve</option><option value="reject">Reject</option></select></label>
            <label>Review note<textarea name="note" required maxLength={2000} /></label>
            <button className="btn ghost" type="submit" disabled={pending}>Record review</button>
          </form>}
        </details></li>)}</ul> : <p className="note">No drafts yet.</p>}
        {active && editable && <form className="stack" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fields = new FormData(form);
          if (await change("runs", "POST", { workflowId: fields.get("workflow"), objective: fields.get("brief"), mode: "local" })) form.reset();
        }}>
          <label>Workflow<select name="workflow">{[...data.definition.workflows, ...automations.filter((item) => item.status === "approved")].map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Brief<textarea name="brief" required maxLength={6000} rows={3} /></label>
          <button className="btn" type="submit" disabled={pending}>Prepare draft</button>
        </form>}
      </section>
      <section className="automation-panel">
        <h3>Automations</h3>
        {automations.length ? <ul className="supervision-list">{automations.map((item) => <li key={item.id}><details>
          <summary>{item.name} <span className={`badge ${item.status === "approved" ? "success" : item.status === "rejected" ? "low" : "neutral"}`}>{item.status.replaceAll("_", " ")}</span></summary>
          <p>Trigger · {item.trigger}</p><ol>{item.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          {item.review && <p className="note">{item.review.reviewer} · {item.review.note}</p>}
          {canValidate && item.status === "pending_review" && <form className="stack" onSubmit={async (event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            await change(`automations/${item.id}/review`, "POST", { decision: fields.get("decision"), note: fields.get("note"), hash: item.hash });
          }}><label>CEO decision<select name="decision"><option value="approve">Approve</option><option value="reject">Reject</option></select></label><label>Validation note<textarea name="note" required maxLength={2000} /></label><button className="btn" disabled={pending}>Record CEO validation</button></form>}
        </details></li>)}</ul> : <p className="note">No custom automations yet.</p>}
        {editable && <form className="stack" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fields = new FormData(form);
          if (await change("automations", "POST", { name: fields.get("name"), trigger: fields.get("trigger"), steps: fields.get("steps") })) form.reset();
        }}>
          <h3>Create automation</h3>
          <label>Automation name<input name="name" required maxLength={120} /></label>
          <label>Trigger<input name="trigger" required maxLength={240} /></label>
          <label>Steps, one per line<textarea name="steps" required rows={4} maxLength={4000} /></label>
          <button className="btn" disabled={pending}>Submit for CEO validation</button>
        </form>}
      </section>
    </div>}
  </section>;
}
