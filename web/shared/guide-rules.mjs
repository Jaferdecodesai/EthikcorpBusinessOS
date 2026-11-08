const uploadable = new Set(["profile", "policies", "sops", "tasks", "marketing"]);

export function formationReport({ stages, sources, checked = {}, records = {}, githubReady = false }) {
  const stageProgress = stages.map((stage) => {
    const done = stage.tasks.filter((task) => checked[task.id]).length;
    return { id: stage.id, name: stage.name, short: stage.short, done, total: stage.tasks.length, gate: stage.gate };
  });
  const completedTasks = stageProgress.reduce((sum, stage) => sum + stage.done, 0);
  const totalTasks = stageProgress.reduce((sum, stage) => sum + stage.total, 0);
  const missingOwners = sources.filter((source) => !String(records[source.id]?.owner || "").trim()).map((source) => ({ id: source.id, title: source.title, sensitivity: source.sensitivity }));
  const missingLocators = sources.filter((source) => !String(records[source.id]?.locator || "").trim() && records[source.id]?.status !== "excluded").map((source) => ({ id: source.id, title: source.title }));
  const needsApproval = sources.filter((source) => uploadable.has(source.id) && records[source.id]?.status !== "excluded" && !String(records[source.id]?.approvalRef || "").trim()).map((source) => ({ id: source.id, title: source.title }));
  const restricted = sources.filter((source) => source.sensitivity.startsWith("Restricted")).map((source) => ({ id: source.id, title: source.title }));
  const nextTask = stages.flatMap((stage) => stage.tasks.map((task) => ({ ...task, stageId: stage.id, stageName: stage.name }))).find((task) => !checked[task.id]) || null;
  let next;
  if (missingOwners.length) {
    const source = missingOwners[0];
    next = { title: `Name the owner for ${source.title}`, href: "#pm/discovery", why: "A category without a named owner cannot move into collection.", ref: `source:${source.id}`, kind: "owner" };
  } else if (nextTask) {
    next = { title: nextTask.label, href: `#pm/${nextTask.stageId}`, why: `Evidence still required: ${nextTask.evidence}`, ref: `task:${nextTask.id}`, kind: "task" };
  } else {
    next = { title: "Review readiness with the client sponsor", href: "#knowledge", why: "Every checklist box is marked. That records progress. It does not accept the brain, build an index, or prove UAE processing.", ref: "gate:readiness", kind: "readiness" };
  }
  return { stageProgress, completedTasks, totalTasks, missingOwners, missingLocators, needsApproval, restricted, nextTask, next, githubReady: Boolean(githubReady), uploadable: [...uploadable] };
}

export function answerQuestion(question, report) {
  const q = String(question || "").trim().toLowerCase();
  const citations = [{ label: report.next.ref, detail: report.next.why }];
  const restrictedAsk = /payroll|passport|visa|salary|contract text|nda body|medical|appraisal/.test(q);
  if (!q) {
    return { answer: `Next step: ${report.next.title}. ${report.next.why} Checklist progress is ${report.completedTasks} of ${report.totalTasks}. ${report.missingOwners.length} source categories still have no named owner.`, citations, speechSafe: true };
  }
  if (restrictedAsk) {
    return {
      answer: "This guide will not retrieve or read restricted people, finance, or contract content. Record the category as metadata, name the owner, and keep the bytes in the source system. Voice playback is turned off for this reply.",
      citations: [{ label: "source:hr", detail: "HR, finance, and legal records stay out of the pilot upload." }, { label: "boundary:voice", detail: "Restricted replies stay on screen." }],
      speechSafe: false
    };
  }
  if (/fine-?tun|train the model|weights/.test(q)) {
    return {
      answer: "Selective fine-tuning is not warranted yet. No stable behavior failure has been shown against retrieval, and no approved training set exists. Use retrieval for current facts. Fine-tuning would be a later, separate decision with its own dataset, evaluation, and UAE training location.",
      citations: [{ label: "stage:evaluation", detail: "Evaluation is separate from fine-tuning." }, report.next],
      speechSafe: true
    };
  }
  if (/uae|sovereign|residen|region|offline/.test(q)) {
    return {
      answer: "Offline operation is not a requirement. UAE data sovereignty is a requirement for the company brain, and it is not met by this screen. The Cloudflare preview is a global front end. Storage, backups, logs, embeddings, inference, and vendor egress each need their own verified UAE or customer-controlled route. None of those routes is configured here.",
      citations: [{ label: "plane:hosting", detail: "Global front end is not the data plane." }, { label: "plane:embeddings", detail: "No embedding endpoint is configured." }],
      speechSafe: true
    };
  }
  if (/voice|speech|microphone|speak/.test(q)) {
    return {
      answer: "Text is the default. Browser speech can send audio or text to the device vendor, which may be outside the UAE, so it stays off until you consent and it never reads restricted replies. A UAE speech adapter can be configured later. It is disconnected: no endpoint, region attestation, or retention terms are stored.",
      citations: [{ label: "boundary:voice", detail: "Browser speech is not a sovereign route." }],
      speechSafe: true
    };
  }
  if (/upload|github|collection|file/.test(q)) {
    const allowed = "Company profile, policies, SOPs, tasks, and marketing assets";
    return {
      answer: `${allowed} can be uploaded only after a named owner, an original locator, and a client approval reference. The other categories stay metadata-only. GitHub is ${report.githubReady ? "configured on this server" : "not configured"}. An upload does not create embeddings.`,
      citations: [{ label: "stage:collection", detail: "Private repository test must pass before save or upload." }, { label: "source:profile", detail: "Eligible category example." }],
      speechSafe: true
    };
  }
  if (/embed|vector|index|gbrain|chunk/.test(q)) {
    return {
      answer: "Chunking and embeddings are later stages. This app records the decision and the route. It does not chunk, embed, or search company text. A UAE PostgreSQL and pgvector service would be a separate integration after the route is verified. Hosted Supabase does not list a UAE region.",
      citations: [{ label: "stage:embeddings", detail: "Index build is not connected." }, { label: "stage:chunking", detail: "Provenance has to be approved before any index." }],
      speechSafe: true
    };
  }
  if (/eval|quality|abstain|citation/.test(q)) {
    return {
      answer: "Evaluation needs a client-written question set, expected sources, and denial cases. No result has been recorded. The guide can explain the gate. It cannot claim an answer-quality score.",
      citations: [{ label: "stage:evaluation", detail: "Thresholds are unsigned." }],
      speechSafe: true
    };
  }
  if (/owner|who |missing|blocker|next/.test(q)) {
    const names = report.missingOwners.slice(0, 4).map((source) => source.title).join(", ");
    return {
      answer: names
        ? `Owners are still missing for ${report.missingOwners.length} categories, starting with ${names}. ${report.next.why}`
        : `Owners are named on every category. Next: ${report.next.title}. ${report.next.why}`,
      citations: report.missingOwners.slice(0, 3).map((source) => ({ label: `source:${source.id}`, detail: source.title })).concat([report.next]),
      speechSafe: true
    };
  }
  if (/follow-?up|remind|email|send/.test(q)) {
    return {
      answer: "Follow-ups can be drafted, marked pending, or approved in this workspace. Approval means a person may send the note later. This app does not email, message, or schedule a send.",
      citations: [{ label: "control:follow-up", detail: "No outbound delivery is connected." }],
      speechSafe: true
    };
  }
  const stage = report.stageProgress.find((item) => q.includes(item.name.toLowerCase().split(" ")[0]));
  if (stage) {
    return {
      answer: `${stage.name} is ${stage.done} of ${stage.total} checklist items. The exit gate is: ${stage.gate} A checklist tick is not client acceptance.`,
      citations: [{ label: `stage:${stage.id}`, detail: stage.gate }],
      speechSafe: true
    };
  }
  return {
    answer: `I can guide the formation journey from the records on this screen. ${report.next.title}. ${report.next.why} Ask about owners, uploads, embeddings, evaluation, fine-tuning, UAE processing, voice, or follow-ups.`,
    citations,
    speechSafe: true
  };
}
