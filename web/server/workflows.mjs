import { hourlyRate } from "./datasets.mjs";

export const WORKFLOW_FILES = {
  "workflows/sales-and-bd.md": "sales",
  "workflows/marketing.md": "marketing",
  "workflows/consulting-delivery.md": "delivery",
  "workflows/technology-and-ai.md": "technology",
  "workflows/finance.md": "finance",
  "workflows/hr-and-talent.md": "hr",
  "workflows/operations.md": "operations",
  "workflows/client-success.md": "client-success",
  "workflows/legal-and-compliance.md": "legal"
};

export function parseWorkflow(markdown, departmentId) {
  const friction = [...String(markdown || "").matchAll(/\*\*Friction:\*\*\s*(.+)/g)].map((match) => match[1].trim());
  const flows = String(markdown || "").split(/^## Workflow /m).slice(1).map((block) => {
    const line = block.split("\n")[0].trim();
    const weeklyHours = Number((line.match(/(\d+(?:\.\d+)?)\s*hours/i) || [])[1] || 0);
    const steps = [...block.matchAll(/^\d+\.\s+(.+)$/gm)].map((match) => match[1].trim());
    return { title: line.replace(/\s*\(.*$/, "").replace(/^\d+\s*[—-]\s*/, "").trim(), weeklyHours, steps };
  }).filter((flow) => flow.title);
  return { departmentId, flows, friction, sample: /SAMPLE DATA/.test(markdown) };
}

export function proposeAutomations(map, datasets) {
  const rate = hourlyRate(datasets);
  return (map?.flows || []).slice(0, 5).map((flow, index) => {
    const hoursSavedPerMonth = Math.round(flow.weeklyHours * 4 * 0.4 * 10) / 10;
    const impactAed = rate == null ? null : Math.round(hoursSavedPerMonth * rate);
    const concrete = automationFromFlow(flow);
    return {
      id: `${map.departmentId}-${index + 1}`,
      departmentId: map.departmentId,
      name: `Automate ${flow.title}`,
      trigger: concrete.trigger,
      steps: concrete.steps,
      chain: concrete.chain,
      tools: concrete.tools,
      schedule: "Weekdays, when the trigger arrives",
      hoursSavedPerMonth,
      formula: "weekly_hours × 4 × 0.4",
      assumption: "40% of the weekly manual hours stated in the workflow file",
      impactAed,
      aedFormula: "hours_saved_per_month × (sum(revenue_aed) / 12 / sum(billable_hours_oct_2026))",
      revenueAngle: concrete.benefit,
      sample: true
    };
  });
}

export function automationFromFlow(flow) {
  const blob = `${flow.title} ${flow.steps.join(" ")}`.toLowerCase();
  let trigger = shorten(flow.steps[0] || flow.title);
  if (/form|whatsapp|linkedin/.test(blob) && /lead|bizscan|enquir/.test(blob)) trigger = "New lead in a form, WhatsApp or LinkedIn";
  else if (/invoice|billing|signed proposal|milestone/.test(blob)) trigger = "Signed proposal or a milestone is reached";
  else if (/wordpress|blog|content topic/.test(blob)) trigger = "A content topic is agreed";
  else if (/campaign|bizscan/.test(blob)) trigger = "A BizScan or campaign reply arrives";
  else if (/schedul|venue|calendar/.test(blob)) trigger = "A training date is agreed";
  else if (/overdue|collection|chas/.test(blob)) trigger = "An invoice passes its due date";
  else if (/pipeline|stage|follow-up/.test(blob)) trigger = "The weekly pipeline review starts";
  const steps = flow.steps.map(shorten);
  const tools = [];
  if (/whatsapp/.test(blob)) tools.push("WhatsApp");
  if (/form|website/.test(blob)) tools.push("website form");
  if (/linkedin/.test(blob)) tools.push("LinkedIn");
  if (/bizscan/.test(blob)) tools.push("BizScan");
  if (/spreadsheet/.test(blob)) tools.push("lead spreadsheet");
  if (/email/.test(blob)) tools.push("email");
  if (/calendar/.test(blob)) tools.push("calendar");
  if (/proposal|word\b/.test(blob)) tools.push("proposal template");
  if (/wordpress/.test(blob)) tools.push("WordPress");
  if (/invoice|ledger|vat/.test(blob)) tools.push("accounting ledger");
  if (!tools.length) tools.push("department checklist");
  const chain = [trigger, ...steps.slice(0, 4)].filter((item, index, list) => list.indexOf(item) === index).join(" → ");
  let benefit = `Saves specialist time on ${flow.title}.`;
  if (/lead|form|whatsapp/.test(blob)) benefit = "Logs each lead once so follow-up starts the same day.";
  else if (/invoice|billing|overdue/.test(blob)) benefit = "Issues the invoice sooner so cash is not waiting on a manual draft.";
  else if (/content|blog|wordpress/.test(blob)) benefit = "Moves the draft forward so the campaign is not waiting on a blank page.";
  else if (/proposal/.test(blob)) benefit = "Keeps the proposal version in one place so review is not stuck in email.";
  else if (/pipeline|follow-up/.test(blob)) benefit = "Surfaces stale deals before the weekly review starts from scratch.";
  return { trigger, steps, tools: tools.slice(0, 5), chain, benefit };
}

function shorten(step) {
  return String(step || "").replace(/\(.*?\)/g, "").replace(/\.$/, "").trim().slice(0, 80);
}
