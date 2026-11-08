declare module "../shared/guide-rules.mjs" {
  export type GuideCitation = { label: string; detail?: string };
  export type GuideReport = {
    stageProgress: { id: string; name: string; short: string; done: number; total: number; gate: string }[];
    completedTasks: number;
    totalTasks: number;
    missingOwners: { id: string; title: string; sensitivity: string }[];
    missingLocators: { id: string; title: string }[];
    needsApproval: { id: string; title: string }[];
    next: { title: string; href: string; why: string; ref: string; kind: string };
    githubReady: boolean;
  };
  export function formationReport(input: {
    stages: { id: string; name: string; short: string; gate: string; tasks: { id: string; label: string; evidence: string }[] }[];
    sources: { id: string; title: string; sensitivity: string }[];
    checked?: Record<string, boolean>;
    records?: Record<string, { status?: string; owner?: string; locator?: string; approvalRef?: string; note?: string }>;
    githubReady?: boolean;
  }): GuideReport;
  export function answerQuestion(question: string, report: GuideReport): { answer: string; citations: GuideCitation[]; speechSafe: boolean };
}
