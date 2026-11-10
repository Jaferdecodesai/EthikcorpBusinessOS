const NAMES = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_KEY", "AZURE_OPENAI_DEPLOYMENT"];

export function azureOpenAiStatus(env = {}) {
  const missing = NAMES.filter((name) => !env[name]);
  return { id: "azure-openai-uae-north", region: "uaenorth", ready: missing.length === 0, missing };
}

export async function azureOpenAiPlan() {
  throw new Error("Azure OpenAI UAE North is not called in this preview. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY and AZURE_OPENAI_DEPLOYMENT on the review worker when that region is approved.");
}
