export const BUILD_STAGES = [
  { id: "ownership", title: "Discovery & ownership", evidence: "Signed source inventory (.xlsx)" },
  { id: "intake", title: "Collection & handoff", evidence: "Approved source document (.md, .txt, .pdf or .docx)" },
  { id: "parse", title: "Parse", evidence: "Parser output or format review" },
  { id: "clean", title: "Clean & deduplicate", evidence: "Cleaning and version review" },
  { id: "privacy", title: "Privacy review", evidence: "Redaction and exclusion record" },
  { id: "chunk", title: "Chunk & enrich", evidence: "Passage and metadata review" },
  { id: "embed", title: "Embeddings", evidence: "Embedding configuration or evaluation" },
  { id: "index", title: "Vector index", evidence: "Index manifest or validation report" },
  { id: "access", title: "Role-based access", evidence: "Access matrix and permission review" },
  { id: "rag", title: "Grounded retrieval", evidence: "Cited retrieval review" },
  { id: "semantic", title: "Business definitions", evidence: "Approved KPI definitions and aliases" },
  { id: "evaluation", title: "Evaluation", evidence: "Golden questions and acceptance results" },
  { id: "instruction", title: "Instruction examples", evidence: "Anonymised style examples" },
  { id: "finetune", title: "Fine-tuning", evidence: "Training configuration or run report" },
  { id: "refresh", title: "Refresh & removal", evidence: "Refresh schedule and removal procedure" }
];
