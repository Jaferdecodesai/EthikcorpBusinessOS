// Sample analytics for the Phase 2 CEO portal.
// Company totals are the Figure 5 demo snapshot. Weekly hours are the Section 7
// model (14 Oct 2026). Neither set is a measured Ethikcorp result.

const REVIEW = 0.25;

export const DEPARTMENTS = [
  { id: "sales", name: "Sales & BD", code: "SD", status: "Dashboard live, waiting on Jafer", blocker: "No deal, proposal, or client data in ClickUp.", tasksDone: 12, tasksOpen: 10, blocked: 2, hoursLogged: 40, hoursSavedDemo: 8, publishedNetHours: 7.6, pipeline: { hot: 4, warm: 7, cold: 5 } },
  { id: "marketing", name: "Marketing", code: "MK", status: "Dashboard live, waiting on Jafer", blocker: "Channel numbers, calendar, and team data are still missing.", tasksDone: 6, tasksOpen: 5, blocked: 1, hoursLogged: 22, hoursSavedDemo: 4, publishedNetHours: 2.4 },
  { id: "delivery", name: "Consulting Delivery", code: "CD", status: "Dashboard live, KB update finishing", blocker: "No delivery tasks have an owner or a due date.", tasksDone: 10, tasksOpen: 8, blocked: 1, hoursLogged: 38, hoursSavedDemo: 6, publishedNetHours: 3.0 },
  { id: "technology", name: "Technology & AI", code: "AI", status: "Dashboard live, waiting on Jafer", blocker: "Assignees, due dates, and blocker sections are awaiting data.", tasksDone: 6, tasksOpen: 6, blocked: 2, hoursLogged: 24, hoursSavedDemo: 4, publishedNetHours: 2.2 },
  { id: "finance", name: "Finance", code: "FN", status: "Dashboard live, KB update finishing", blocker: "Revenue, invoices, cash flow, expenses, and budget are awaiting data.", tasksDone: 8, tasksOpen: 7, blocked: 1, hoursLogged: 30, hoursSavedDemo: 5, publishedNetHours: 2.4 },
  { id: "hr", name: "HR & Talent", code: "HR", status: "Dashboard live, waiting on Jafer", blocker: "No HR tasks in ClickUp. Trainer credentials are undocumented.", tasksDone: 5, tasksOpen: 4, blocked: 1, hoursLogged: 18, hoursSavedDemo: 3, publishedNetHours: 0.8 },
  { id: "operations", name: "Operations", code: "OP", status: "Dashboard live, KB update finishing", blocker: "No due dates or assignees, so overdue work cannot be tracked.", tasksDone: 8, tasksOpen: 7, blocked: 2, hoursLogged: 32, hoursSavedDemo: 5, publishedNetHours: 2.0 },
  { id: "client-success", name: "Client Success", code: "CS", status: "Dashboard live, waiting on Jafer", blocker: "Tasks have no owners or due dates. Client names need a check.", tasksDone: 6, tasksOpen: 5, blocked: 1, hoursLogged: 27, hoursSavedDemo: 5, publishedNetHours: 2.2 },
  { id: "legal", name: "Legal & Compliance", code: "LC", status: "Dashboard live, waiting on Jafer", blocker: "Contract, deadline, and risk sections are awaiting data.", tasksDone: 5, tasksOpen: 3, blocked: 1, hoursLogged: 20, hoursSavedDemo: 4, publishedNetHours: 2.6 }
];

export const AUTOMATIONS = [
  ["sales", "Proposal draft", 90, 2],
  ["sales", "Lead qualification scorer", 20, 10],
  ["sales", "Follow-up email", 15, 15],
  ["marketing", "Social post drafts (3)", 45, 3],
  ["marketing", "Blog outline + meta", 60, 1],
  ["delivery", "Training Needs Analysis pack", 60, 1],
  ["delivery", "30/60/90 evaluation report", 90, 2],
  ["technology", "Automation opportunity assessment", 60, 2],
  ["technology", "AI agent requirements spec", 60, 1],
  ["finance", "Invoice generator (5% VAT)", 30, 5],
  ["finance", "Expense categoriser", 40, 1],
  ["hr", "Job description writer", 45, 1],
  ["hr", "Onboarding plan", 30, 0.5],
  ["operations", "Weekly status report", 60, 1],
  ["operations", "Meeting minutes + action items", 20, 5],
  ["client-success", "30/60/90 check-in email", 30, 4],
  ["client-success", "ROI report", 60, 1],
  ["legal", "Contract clause checker", 60, 2],
  ["legal", "Mutual NDA generator", 45, 2]
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function automationRow(row) {
  const [departmentId, name, minutes, runsPerWeek] = row;
  const grossHours = (minutes * runsPerWeek) / 60;
  return { departmentId, name, minutes, runsPerWeek, grossHours: round1(grossHours), netHours: round1(grossHours * (1 - REVIEW)) };
}

export function ceoDashboard() {
  const automations = AUTOMATIONS.map(automationRow);
  const departments = DEPARTMENTS.map((department) => {
    const rows = automations.filter((row) => row.departmentId === department.id);
    return {
      ...department,
      people: 3,
      runsPerWeek: round1(rows.reduce((sum, row) => sum + row.runsPerWeek, 0)),
      netHoursPerWeek: department.publishedNetHours,
      automations: rows,
      href: `#live/dept/${department.id}`
    };
  });
  const runsPerWeek = round1(automations.reduce((sum, row) => sum + row.runsPerWeek, 0));
  const netHoursPerWeek = round1(departments.reduce((sum, department) => sum + department.netHoursPerWeek, 0));
  const trend = [0.55, 0.62, 0.7, 0.78, 0.84, 0.9, 0.96, 1].map((factor, index) => ({
    week: `W${index + 1}`,
    runs: round1(runsPerWeek * factor),
    netHours: round1(netHoursPerWeek * factor)
  }));
  return {
    label: "Sample seed. Figure 5 demo totals and the Section 7 hours model. Not measured results.",
    source: "Ethikcorp setup document, 14 Oct 2026",
    company: {
      employees: 27,
      tasksDone: 66,
      tasksOpen: 55,
      blocked: departments.reduce((sum, department) => sum + department.blocked, 0),
      hoursLogged: 251,
      hoursSavedDemo: 44,
      netHoursPerWeek,
      automations: automations.length,
      clickupOpenTasks: 5,
      runsPerWeek
    },
    departments,
    taskBars: departments.map((department) => ({ id: department.id, label: department.code, name: department.name, done: department.tasksDone, open: department.tasksOpen, blocked: department.blocked, href: department.href })),
    hourBars: departments.map((department) => ({ id: department.id, label: department.name, value: department.netHoursPerWeek, href: department.href })),
    trend,
    trendNote: "Illustrative path toward the base-case week. Not a measured series.",
    pipeline: [
      { label: "HOT", value: 4 },
      { label: "WARM", value: 7 },
      { label: "COLD", value: 5 }
    ],
    pipelineNote: "Sample lead-score mix for Sales. Not a CRM export."
  };
}

export function ceoDepartment(id) {
  const report = ceoDashboard();
  const department = report.departments.find((item) => item.id === id);
  if (!department) return null;
  return { ...report, department, departments: undefined };
}
