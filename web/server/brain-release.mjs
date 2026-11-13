import { createHash } from "node:crypto";
import departments from "../shared/departments.json" with { type: "json" };
import { rankChunks, tokenize } from "./brain-pipeline.mjs";
import { sourceKey } from "./source-lifecycle.mjs";

const profiles = [
  { id: "balanced", vector: 1, phrase: 0 },
  { id: "lexical", vector: 0, phrase: 0 },
  { id: "phrase-weighted", vector: 0.5, phrase: 3 }
];
const questionFiller = new Set(tokenize(
  "a an and are as at be by can could did do does explain find for from had has have how in is it me of on or please should tell that the them these they this to was were what when where which who why will with would you your " +
  "ما ماذا متى اين كيف هل من في على عن الى هو هي هذه هذا ذلك تلك لي ممكن"
));
const broadBusinessTerms = new Set(tokenize(
  "approval approved business client company deadline department document information policy process procedure request status team workflow " +
  "اعتماد الموافقة الشركة القسم السياسة الاجراء الطلب الحالة الفريق"
));

function evidenceTerms(text) {
  return tokenize(text).filter((token) => !questionFiller.has(token));
}

export function parseGoldenQuestions(text) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  if (!text.trim() || lines.length > 200) throw new Error("Use 1–200 JSONL evaluation cases.");
  const seen = new Set();
  return lines.map((line, index) => {
    let row;
    try { row = JSON.parse(line); } catch { throw new Error(`Invalid evaluation JSON on line ${index + 1}.`); }
    if (!row || typeof row.question !== "string" || !row.question.trim() || row.question.length > 1000 ||
      (row.expectedDocument !== null && (typeof row.expectedDocument !== "string" || !row.expectedDocument.trim() || row.expectedDocument.length > 120)) ||
      (row.department && !departments.some(({ id }) => id === row.department)) ||
      (row.split && !["calibration", "validation"].includes(row.split))) {
      throw new Error(`Evaluation line ${index + 1} needs a question, expectedDocument (file name or null), and a valid optional department and split.`);
    }
    const terms = evidenceTerms(row.question);
    if (!terms.length) throw new Error(`Evaluation line ${index + 1} needs a specific question with searchable terms.`);
    const key = JSON.stringify([row.department || null, [...new Set(terms)].sort()]);
    if (seen.has(key)) throw new Error(`Evaluation line ${index + 1} repeats a question in the same scope. Use distinct calibration and validation cases.`);
    seen.add(key);
    return { question: row.question.trim(), expectedDocument: row.expectedDocument?.trim() || null, department: row.department || null, split: row.split || "validation" };
  });
}

export function eligibleDocuments(brain) {
  const activeSources = new Set((brain.ownership || []).filter((row) => !row.notForAi).map((row) => row.sourceId));
  const latest = new Map();
  for (const doc of brain.documents || []) {
    if (doc.handoffId && activeSources.has(doc.sourceId)) latest.set(sourceKey(doc), doc);
  }
  return [...latest.values()];
}

function visibleChunks(brain, ids, departmentId) {
  const allowed = new Set(ids);
  return (brain.chunks || []).filter((chunk) => allowed.has(chunk.documentId) && (
    !departmentId || chunk.audience === "company" || chunk.audience === departmentId
  ));
}

function retrieve(question, chunks, profile = profiles[0]) {
  const query = evidenceTerms(question);
  const terms = new Set(query);
  if (!terms.size) return [];
  const phrase = ` ${query.join(" ")} `;
  const ranked = rankChunks(query.join(" "), chunks).map((chunk) => {
    const tokens = evidenceTerms(chunk.text);
    const words = new Set(tokens);
    const matchingTerms = [...terms].filter((term) => words.has(term));
    const overlap = matchingTerms.length;
    const grounded = overlap > 1 || matchingTerms.some((term) => !broadBusinessTerms.has(term));
    const phraseHit = terms.size > 1 && ` ${tokens.join(" ")} `.includes(phrase);
    return { ...chunk, grounded, relevance: overlap + chunk.score * profile.vector + Number(phraseHit) * profile.phrase };
  });
  return ranked.filter((chunk) => chunk.grounded).sort((a, b) => b.relevance - a.relevance).slice(0, 3);
}

function fingerprint(brain, documentIds) {
  const encoded = ["unicode-evidence-v3", documentIds, brain.golden?.id || null];
  return createHash("sha256").update(JSON.stringify(encoded)).digest("hex");
}

function checkQuestion(brain, documentIds, row, profile) {
  const match = retrieve(row.question, visibleChunks(brain, documentIds, row.department), profile)[0]?.document || null;
  return { expectedDocument: row.expectedDocument, department: row.department, match, passed: match === row.expectedDocument };
}

export function evaluateCandidate(brain) {
  const documents = eligibleDocuments(brain);
  const documentIds = documents.map((doc) => doc.id);
  const candidateId = fingerprint(brain, documentIds);
  const questions = brain.golden?.questions || [];
  const calibration = questions.filter((row) => row.split === "calibration");
  const validation = questions.filter((row) => row.split === "validation");
  const scored = profiles.map((profile) => ({ profile, passed: calibration.filter((row) => checkQuestion(brain, documentIds, row, profile).passed).length }));
  const selected = scored.reduce((best, next) => next.passed > best.passed ? next : best).profile;
  const validationChecks = validation.map((row) => checkQuestion(brain, documentIds, row, selected));
  const checks = documents.map((doc) => {
    const own = visibleChunks(brain, [doc.id], doc.audience === "company" ? null : doc.audience);
    const question = tokenize(own[0]?.text).slice(0, 10).join(" ");
    const citation = Boolean(question && retrieve(question, own, selected)[0]?.sourceUrl);
    const excluded = doc.audience === "company" || departments.filter(({ id }) => id !== doc.audience)
      .every(({ id }) => visibleChunks(brain, [doc.id], id).length === 0);
    return { name: doc.name, citation, excluded };
  });
  return {
    candidateId, documentIds, checks, profile: selected.id, validationChecks, calibrationCases: calibration.length,
    passed: Boolean(checks.length) && checks.every((item) => item.citation && item.excluded) &&
      (!questions.length || (validationChecks.length > 0 && validationChecks.every((item) => item.passed)))
  };
}

export function releaseState(brain, { requireGolden = false, departmentId = null } = {}) {
  const documentIds = eligibleDocuments(brain).map((doc) => doc.id);
  const candidateId = fingerprint(brain, documentIds);
  const active = brain.release;
  const serving = activeDocumentIds(brain, departmentId);
  const fresh = brain.candidate?.candidateId === candidateId;
  const needsGolden = requireGolden && !brain.golden?.questions.some(({ split }) => split === "validation");
  return {
    candidates: documentIds.length,
    evaluation: fresh ? brain.candidate : null,
    canDeploy: Boolean(brain.ownershipReady && fresh && brain.candidate.passed && !needsGolden),
    needsGolden,
    active: active ? { id: active.id, deployedAt: active.deployedAt, documents: serving.length, departments: active.departments, contentVersion: fingerprint({}, serving) } : null,
    pendingChanges: Boolean(active && candidateId !== active.candidateId)
  };
}

function activeDocumentIds(brain, departmentId = null) {
  if (!brain.release) return [];
  const scope = new Map(eligibleDocuments(brain).map((doc) => [sourceKey(doc), doc.audience]));
  const active = new Set(brain.release.documentIds);
  return (brain.documents || []).filter((doc) => active.has(doc.id) && scope.get(sourceKey(doc)) === doc.audience &&
    (!departmentId || doc.audience === "company" || doc.audience === departmentId)).map(({ id }) => id);
}

export function sourceInventory(brain) {
  const latest = new Map();
  const counts = new Map();
  for (const doc of brain.documents || []) {
    if (!doc.handoffId) continue;
    const key = sourceKey(doc);
    latest.set(key, doc);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const serving = new Set(activeDocumentIds(brain));
  const live = new Set((brain.documents || []).filter(({ id }) => serving.has(id)).map(sourceKey));
  const eligible = new Set(eligibleDocuments(brain).map(({ id }) => id));
  return {
    sources: [...latest].map(([key, doc]) => ({ id: doc.id, name: doc.name, sourceId: doc.sourceId, audience: doc.audience, revisions: counts.get(key), serving: live.has(key), current: serving.has(doc.id), eligible: eligible.has(doc.id) })),
    withdrawals: (brain.sourceWithdrawals || []).slice().reverse().map(({ key, previousApprovals, ...event }) => event)
  };
}

export function deployCandidate(brain, { requireGolden = false } = {}) {
  const candidate = evaluateCandidate(brain);
  if (requireGolden && !candidate.validationChecks.length) throw new Error("Upload a golden-question evaluation file with validation cases before deploying to the team.");
  if (!brain.ownershipReady || !candidate.passed || brain.candidate?.candidateId !== candidate.candidateId || !brain.candidate?.passed) {
    throw new Error("Import ownership, index an approved file, and pass the current retrieval checks before deploying.");
  }
  const activeDepartments = departments.filter(({ id }) => brain.confirmed?.[id]).map(({ id }) => id);
  if (brain.release?.candidateId === candidate.candidateId && JSON.stringify(brain.release.departments) === JSON.stringify(activeDepartments)) return brain;
  return { ...brain, release: { id: `brain-${new Date().toISOString()}`, deployedAt: new Date().toISOString(), candidateId: candidate.candidateId, documentIds: candidate.documentIds, departments: activeDepartments, profile: candidate.profile } };
}

export function askRelease(brain, body) {
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 2000) : "";
  if (!question) return { error: "Enter a question." };
  const departmentId = body.area === "bots" ? body.departmentId : null;
  if (body.area === "bots" && !brain.release?.departments.includes(departmentId)) return { error: "Choose a department workspace with an active bot." };
  if (!brain.release) return { error: "Deploy an approved BusinessBrain release to query it." };
  const ids = activeDocumentIds(brain);
  const profile = profiles.find(({ id }) => id === brain.release.profile);
  const hits = retrieve(question, visibleChunks(brain, ids, departmentId), profile);
  return {
    answer: hits[0]?.text || "No approved passage matches that question.",
    citations: hits.map((hit) => ({ document: hit.document, heading: hit.heading, anchor: hit.anchor, excerpt: hit.text.slice(0, 280), url: hit.sourceUrl })),
    refused: !hits.length,
    sample: false,
    llm: "extractive",
    steps: [{ tool: "search_brain", status: "done", detail: `${hits.length} citations from ${brain.release.id}` }]
  };
}
