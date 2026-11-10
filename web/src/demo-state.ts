import { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { defaultRecords } from "../shared/build-steps.mjs";

export type StepRecord = { id: string; status: "not_started" | "in_progress" | "waiting_on_customer" | "done"; needsInput: boolean; progress: number; summary: string };

export type SourceRow = { category: string; owner: string; decision: "authoritative" | "context" | "excluded" };
export type FileRow = { name: string; owner: string; classification: "Public" | "Internal"; location: string };
export type DraftWorkflow = { id: string; departmentId: string; name: string; purpose: string };
export type DemoState = {
  steps: StepRecord[];
  sources: SourceRow[];
  files: FileRow[];
  drafts: DraftWorkflow[];
  ready: string[];
  admin: { brainName: string; abstain: boolean; departments: Record<string, { enabled: boolean; chat: boolean }> };
};

const KEY = "aqion-portal-demo-v1";

export function freshDemo(): DemoState {
  const departments: DemoState["admin"]["departments"] = {};
  for (const department of catalog) departments[department.id] = { enabled: true, chat: true };
  return {
    steps: defaultRecords(),
    sources: [
      { category: "Company profile and services", owner: "Marketing lead", decision: "authoritative" },
      { category: "Policies and handbooks", owner: "HR reviewer", decision: "authoritative" },
      { category: "SOPs and checklists", owner: "Operations owner", decision: "authoritative" },
      { category: "Proposals and pitch decks", owner: "Sales lead", decision: "context" },
      { category: "Payroll and personal files", owner: "Finance reviewer", decision: "excluded" }
    ],
    files: [
      { name: "service-sheets.md", owner: "Marketing lead", classification: "Public", location: "Marketing drive / 2026" },
      { name: "handbook-2026.md", owner: "HR reviewer", classification: "Internal", location: "HR drive / published" }
    ],
    drafts: [],
    ready: ["sales-proposal", "delivery-tna"],
    admin: { brainName: "Harbour Learning brain", abstain: true, departments }
  };
}

function valid(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const record = value as DemoState;
  return Array.isArray(record.steps) && record.steps.length === 9 && Array.isArray(record.sources) && Array.isArray(record.files) && Array.isArray(record.drafts) && record.admin && typeof record.admin.departments === "object";
}

export function useDemo() {
  const [state, setState] = useState<DemoState>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "");
      return valid(parsed) ? parsed : freshDemo();
    } catch {
      return freshDemo();
    }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  return { state, setState, reset: () => setState(freshDemo()) };
}
