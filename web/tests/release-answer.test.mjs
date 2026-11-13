import test from "node:test";
import assert from "node:assert/strict";
import { releaseModelConfig, answerFromReleaseModel } from "../server/llm/release-answer.mjs";

const env = {
  BRAIN_MODEL_EGRESS_APPROVED: "true",
  AZURE_OPENAI_ENDPOINT: "https://synthetic.openai.azure.com",
  AZURE_OPENAI_KEY: "test-only",
  AZURE_OPENAI_DEPLOYMENT: "qa-model"
};
const baseline = {
  answer: "Orders are sent through the approved office.",
  citations: [
    { document: "office.md", excerpt: "Orders are sent through the approved office.", url: "https://github.com/example/private/office.md" },
    { document: "terms.md", excerpt: "The renewal window is 15 days from approval.", url: "https://github.com/example/private/terms.md" }
  ],
  steps: [],
  llm: "extractive",
  refused: false
};

test("model generation uses only selected excerpts and remaps validated citations", async () => {
  const config = releaseModelConfig(env);
  const fetcher = async (url, init) => {
    assert.equal(String(url), "https://synthetic.openai.azure.com/openai/v1/chat/completions");
    assert.equal(init.redirect, "error");
    const payload = JSON.parse(init.body);
    assert.equal(payload.store, false);
    assert.equal(payload.tools, undefined);
    assert.equal(payload.response_format.json_schema.strict, true);
    const data = JSON.parse(payload.messages[1].content);
    assert.deepEqual(data.passages, baseline.citations.map((citation, index) => ({ source: index + 1, text: citation.excerpt })));
    return completion([{ statement: "Renew within 15 days of approval.", source: 2, evidence: baseline.citations[1].excerpt }]);
  };
  const answer = await answerFromReleaseModel(config, baseline, "How long is renewal open?", fetcher);
  assert.equal(answer.llm, "azure-release");
  assert.equal(answer.answer, "Renew within 15 days of approval. [1]");
  assert.deepEqual(answer.citations, [baseline.citations[1]]);
});

test("unapproved egress and retrieval refusals skip the model, and invalid answers fall back", async () => {
  const noCall = async () => { assert.fail("Model call must be skipped"); };
  for (const endpoint of ["https://malicious.example", "https://qa.openai.azure.com/unexpected", "http://qa.openai.azure.com"]) {
    const config = releaseModelConfig({ ...env, AZURE_OPENAI_ENDPOINT: endpoint });
    assert.equal(config.status.invalid, true);
    assert.equal(await answerFromReleaseModel(config, baseline, "Query", noCall), baseline);
  }
  assert.equal(await answerFromReleaseModel(releaseModelConfig({ ...env, BRAIN_MODEL_EGRESS_APPROVED: "false" }), baseline, "Query", noCall), baseline);
  const refused = { ...baseline, refused: true, citations: [] };
  assert.equal(await answerFromReleaseModel(releaseModelConfig(env), refused, "Query", noCall), refused);
  for (const point of [
    { statement: "Renew within 99 days.", source: 2, evidence: baseline.citations[1].excerpt },
    { statement: "Renew within 15 days.", source: 2, evidence: "An unsupported quote." },
    { statement: "Renew within 15 days.", source: 3, evidence: baseline.citations[1].excerpt }
  ]) {
    const result = await answerFromReleaseModel(releaseModelConfig(env), baseline, "Query", async () => completion([point]));
    assert.equal(result.answer, baseline.answer);
    assert.equal(result.steps.at(-1).status, "fallback");
  }
});

function completion(points) {
  return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ points }) } }] });
}
