export type Stratum = "prefix-gold" | "missing-slice";
export type Arm = "L0" | "L1" | "mechanical-cap";

export type Task = {
  id: string;
  stratum: Stratum;
  prompt: string;
  gold: string;
  expected_path: string;
};

export type UsageBuckets = {
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_ttl: "5m" | "1h";
};

/** Native OpenAI usage fields. Not Anthropic create/read/uncached. */
export type OpenAIUsageBuckets = {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
};

export type Provider = "openai" | "anthropic" | "claude-code";

export type Observation = {
  task_id: string;
  arm: Arm;
  answer: string | null;
  cited_path: string | null;
  loaded_paths: string[];
  eval_in_play: boolean;
  usage: UsageBuckets | OpenAIUsageBuckets | null;
  model: string;
  provider: Provider;
  /** Paths requested after extraCap and not served. Not a KEEP field. */
  refused_paths: string[];
};

export type Rates = {
  write_5m: number;
  write_1h: number;
  read: number;
  uncached: number;
  output: number;
};

export type OpenAIRates = {
  input: number;
  cached_input: number;
  output: number;
};

// OpenAI published gpt-4o-mini rates, $ per token. 2026-08-14.
// Source: https://platform.openai.com/docs/pricing (also https://openai.com/api/pricing)
export const GPT_4O_MINI_INPUT_PER_TOKEN = 0.15 / 1_000_000;
export const GPT_4O_MINI_CACHED_INPUT_PER_TOKEN = 0.075 / 1_000_000;
export const GPT_4O_MINI_OUTPUT_PER_TOKEN = 0.6 / 1_000_000;

export const GPT_4O_MINI_RATES: OpenAIRates = {
  input: GPT_4O_MINI_INPUT_PER_TOKEN,
  cached_input: GPT_4O_MINI_CACHED_INPUT_PER_TOKEN,
  output: GPT_4O_MINI_OUTPUT_PER_TOKEN,
};

export function isOpenAIUsage(
  usage: UsageBuckets | OpenAIUsageBuckets,
): usage is OpenAIUsageBuckets {
  return "prompt_tokens" in usage;
}

/** Copy billed OpenAI fields. Do not invent Anthropic cache_creation_input_tokens. */
export function bucketsFromOpenAI(usage: Record<string, unknown> | undefined): OpenAIUsageBuckets {
  const details = usage?.prompt_tokens_details;
  const cachedFromDetails =
    typeof details === "object" && details !== null && "cached_tokens" in details
      ? Number((details as { cached_tokens?: unknown }).cached_tokens) || 0
      : null;
  const cachedTop = usage && "cached_tokens" in usage ? Number(usage.cached_tokens) || 0 : 0;
  return {
    prompt_tokens: Number(usage?.prompt_tokens) || 0,
    completion_tokens: Number(usage?.completion_tokens) || 0,
    cached_tokens: cachedFromDetails ?? cachedTop,
  };
}

export function extraFileCap(evalInPlay: boolean): number {
  return evalInPlay ? 3 : 2;
}

/** Derived. Not stored on JSONL. Not a KEEP field. */
export function refuse_count(obs: Observation): number {
  return obs.refused_paths.length;
}

export function gold_ok(answer: string | null, gold: string): boolean {
  return answer !== null && answer.includes(gold);
}

export function cap_obey(obs: Observation, allowlist: ReadonlySet<string>): boolean {
  if (obs.arm === "L0") return true;
  const extras = obs.loaded_paths.filter((p) => p !== "AGENTS.md");
  if (extras.length > extraFileCap(obs.eval_in_play)) return false;
  return obs.loaded_paths.every((p) => allowlist.has(p));
}

export function cites_ok(obs: Observation, task: Task): boolean {
  return obs.cited_path === task.expected_path;
}

export function task_success(obs: Observation, task: Task, allowlist: ReadonlySet<string>): boolean {
  return gold_ok(obs.answer, task.gold) && cap_obey(obs, allowlist);
}

export function call1_dollars(usage: UsageBuckets, rates: Rates): number;
export function call1_dollars(usage: OpenAIUsageBuckets, rates: OpenAIRates): number;
export function call1_dollars(
  usage: UsageBuckets | OpenAIUsageBuckets,
  rates: Rates | OpenAIRates,
): number {
  if (isOpenAIUsage(usage)) {
    const r = rates as OpenAIRates;
    // prompt_tokens includes cached_tokens. Use the reported cached bucket; do not infer hit/miss.
    const cached = usage.cached_tokens;
    const uncached = Math.max(0, usage.prompt_tokens - cached);
    return uncached * r.input + cached * r.cached_input + usage.completion_tokens * r.output;
  }
  const r = rates as Rates;
  const write = usage.cache_ttl === "1h" ? r.write_1h : r.write_5m;
  return (
    usage.cache_creation_input_tokens * write +
    usage.cache_read_input_tokens * r.read +
    usage.input_tokens * r.uncached +
    usage.output_tokens * r.output
  );
}

export function missingSliceFloor(n: number): number {
  return Math.max(10, n * 0.25);
}
