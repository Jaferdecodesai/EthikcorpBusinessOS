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
    return {
      id: `${map.departmentId}-${index + 1}`,
      departmentId: map.departmentId,
      name: `Automate ${flow.title}`,
      trigger: `A new item arrives for ${flow.title}`,
      steps: flow.steps,
      tools: ["Ethikcorp BusinessBrain", "department task list"],
      schedule: "Weekdays, when a new item arrives",
      hoursSavedPerMonth,
      formula: "weekly_hours × 4 × 0.4",
      assumption: "40% of the weekly manual hours stated in the workflow file",
      impactAed,
      aedFormula: "hours_saved_per_month × (sum(revenue_aed) / 12 / sum(billable_hours_oct_2026))",
      revenueAngle: "Turns saved specialist time toward billable delivery and faster follow-up.",
      sample: true
    };
  });
}
