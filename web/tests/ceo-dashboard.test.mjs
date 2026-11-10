import test from "node:test";
import assert from "node:assert/strict";
import { ceoDashboard, ceoDepartment } from "../server/ceo-dashboard.mjs";

test("the CEO dashboard API serves nine departments from the labelled sample seed", () => {
  const report = ceoDashboard();
  assert.match(report.label, /Not measured/);
  assert.equal(report.departments.length, 9);
  assert.equal(report.company.employees, 27);
  assert.equal(report.company.tasksDone, 66);
  assert.equal(report.company.tasksOpen, 55);
  assert.equal(report.company.hoursLogged, 251);
  assert.equal(report.company.hoursSavedDemo, 44);
  assert.equal(report.company.automations, 19);
  assert.equal(report.company.netHoursPerWeek, 25.2);
  assert.equal(report.company.clickupOpenTasks, 5);
  const done = report.departments.reduce((sum, department) => sum + department.tasksDone, 0);
  const open = report.departments.reduce((sum, department) => sum + department.tasksOpen, 0);
  const logged = report.departments.reduce((sum, department) => sum + department.hoursLogged, 0);
  assert.equal(done, 66);
  assert.equal(open, 55);
  assert.equal(logged, 251);
  const busiest = [...report.hourBars].sort((a, b) => b.value - a.value)[0];
  assert.equal(busiest.id, "sales");
  assert.equal(busiest.value, 7.6);
  assert.equal(report.trend.length, 8);
  assert.equal(report.trend[7].netHours, 25.2);
  assert.deepEqual(report.pipeline.map((item) => item.label), ["HOT", "WARM", "COLD"]);
  assert.ok(report.departments.every((department) => department.href.startsWith("#live/dept/")));
});

test("a department dashboard returns that team's automations only", () => {
  const sales = ceoDepartment("sales");
  assert.equal(sales.department.automations.length, 3);
  assert.equal(sales.department.automations[0].name, "Proposal draft");
  assert.equal(sales.department.automations[0].minutes, 90);
  assert.equal(ceoDepartment("missing"), null);
});
