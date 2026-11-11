export const KPI_TARGETS_PATH = "sample-data/kpi-targets.csv";

// Same bytes as web/fixtures/demo/sample-data/kpi-targets.csv.
// Inlined so the Worker bundle can ingest the fixture when the public demo repo has no copy.
export const KPI_TARGETS_CSV = `# SAMPLE DATA for demo – not real Ethikcorp figures
metric_id,scope,metric,subject,period,target_value,unit,good_direction
rev-company-may-oct,company,revenue,Company,2026-05..2026-10,5000000,AED,up
rev-company-month,company,monthly_revenue,Company,month,900000,AED,up
rev-btc,service_line,monthly_revenue,Business Transformation Consulting,month,250000,AED,up
rev-aie,service_line,monthly_revenue,AI-Enabled Business Transformation,month,150000,AED,up
rev-train,service_line,monthly_revenue,Corporate Training Programs,month,140000,AED,up
rev-agents,service_line,monthly_revenue,AI Agents for Workflow Automation,month,120000,AED,up
rev-lead,service_line,monthly_revenue,Leadership Development & Culture Transformation,month,120000,AED,up
rev-game,service_line,monthly_revenue,Gamification in Learning & Corporate Education,month,50000,AED,up
win-count,company,win_rate_count,Company,closed,70,percent,up
win-value,company,win_rate_value,Company,closed,75,percent,up
weighted-pipeline,company,weighted_pipeline,Company,open,2200000,AED,up
util-company,company,utilisation_pct,Company,2026-10,80,percent,up
bill-company,company,billable_pct,Company,2026-10,45,percent,up
util-sales,department,utilisation_pct,Sales & BD,2026-10,70,percent,up
util-marketing,department,utilisation_pct,Marketing,2026-10,80,percent,up
util-delivery,department,utilisation_pct,Consulting Delivery,2026-10,80,percent,up
util-technology,department,utilisation_pct,Technology & AI,2026-10,75,percent,up
util-finance,department,utilisation_pct,Finance,2026-10,65,percent,up
util-hr,department,utilisation_pct,HR & Talent,2026-10,70,percent,up
util-operations,department,utilisation_pct,Operations,2026-10,80,percent,up
util-client,department,utilisation_pct,Client Success,2026-10,75,percent,up
util-legal,department,utilisation_pct,Legal & Compliance,2026-10,65,percent,up
bill-sales,department,billable_pct,Sales & BD,2026-10,30,percent,up
bill-marketing,department,billable_pct,Marketing,2026-10,0,percent,up
bill-delivery,department,billable_pct,Consulting Delivery,2026-10,75,percent,up
bill-technology,department,billable_pct,Technology & AI,2026-10,70,percent,up
bill-finance,department,billable_pct,Finance,2026-10,0,percent,up
bill-hr,department,billable_pct,HR & Talent,2026-10,0,percent,up
bill-operations,department,billable_pct,Operations,2026-10,15,percent,up
bill-client,department,billable_pct,Client Success,2026-10,45,percent,up
bill-legal,department,billable_pct,Legal & Compliance,2026-10,0,percent,up
hours-sales,department,hours_utilized,Sales & BD,2026-10,340,hours,up
hours-marketing,department,hours_utilized,Marketing,2026-10,260,hours,up
hours-delivery,department,hours_utilized,Consulting Delivery,2026-10,800,hours,up
hours-technology,department,hours_utilized,Technology & AI,2026-10,480,hours,up
hours-finance,department,hours_utilized,Finance,2026-10,200,hours,up
hours-hr,department,hours_utilized,HR & Talent,2026-10,220,hours,up
hours-operations,department,hours_utilized,Operations,2026-10,340,hours,up
hours-client,department,hours_utilized,Client Success,2026-10,360,hours,up
hours-legal,department,hours_utilized,Legal & Compliance,2026-10,100,hours,up
`;
