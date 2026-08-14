export type Stratum = "prefix-gold" | "missing-slice";
export type Arm = "L0" | "L1";

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

export type Observation = {
  task_id: string;
  arm: Arm;
  answer: string | null;
  cited_path: string | null;
  loaded_paths: string[];
  eval_in_play: boolean;
  usage: UsageBuckets | null;
};

export type Rates = {
  write_5m: number;
  write_1h: number;
  read: number;
  uncached: number;
  output: number;
};

export function extraFileCap(evalInPlay: boolean): number {
  return evalInPlay ? 3 : 2;
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

export function call1_dollars(usage: UsageBuckets, rates: Rates): number {
  const write = usage.cache_ttl === "1h" ? rates.write_1h : rates.write_5m;
  return (
    usage.cache_creation_input_tokens * write +
    usage.cache_read_input_tokens * rates.read +
    usage.input_tokens * rates.uncached +
    usage.output_tokens * rates.output
  );
}

export function missingSliceFloor(n: number): number {
  return Math.max(10, n * 0.25);
}
