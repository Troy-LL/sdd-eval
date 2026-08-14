# eval

Pre-registered winner rule for trial 1 (dump vs allowlist+cap). Lived as Satan v0.5.3. Nobody signs W5 until there is a log. Bebot signs W5 off the log. Bototoy does not.

Subject ≠ judge. Gold checker only. First reported run is the run. Pilots throwaway. Do not tune `AGENTS.md` against test tasks.

`$call2plus` is reported. It cannot KEEP and cannot un-KEEP. Cap-obey and `cites_ok` are reported diagnostics, not KEEP bars. `cites_ok` is primary cited path vs gold `expected_path`, both arms, never L1-vs-L0.

## W1 — cost

`$call1` = billed $ through the first scored answer, including tool-use roundtrips. Not first HTTP.

`$call1` KEEP is median over the full paired n, both arms. Quality gates stay separate. Violator bills stay in the $ pool as failures, not as quality-passers. Quality-only $ may be reported.

KEEP $ = all-trials median `$call1`. Quality-only $ is reported, not the KEEP bar.

L1 cap violation ⇒ `task_success` false even if the gold checker would pass. That is the L1 treatment, not a deleted bill. KEEP $ stays all-trials median `$call1`. Violators remain in the $ pool as failures.

L1 all-trials median `$call1` strictly < L0 all-trials median `$call1` (same tasks, same model).

`$ = create×write_rate(ttl) + read×$1 + uncached×input_rate + output×output_rate` from provider buckets. Do not infer hit/miss.

Call-2 cache claims require a shared-prefix allowlisted file to change. Unverified pair ⇒ no KEEP on `$call2plus`.

## W2 — missing-slice

`expected_path` exists in both trees. The map does not name it. Same tree, different load rule. Empty or all-fail stratum ⇒ cannot KEEP.

n_missing ≥ 10, or ≥ 25% of n, whichever is larger. Prefix-gold n ≥ 40 paired. Prefix-gold: L1 success count ≥ L0. No 5pp gift.

Losing missing-slice blocks “allowlist beats dump.” KEEP-prefix-gold only if prefix-gold + `$call1` hold, labeled as such.

## W3 — cites vs gold

Diagnostic. ANDs with `task_success` for reported quality-only $. Not a KEEP bar.

## W4 — cap-obey

Reported metric, not a KEEP bar. Violators are not L1 `task_success`. They stay in all-trials KEEP $.

## W5 — no waiver

Passed audit does not waive this. Dump-winnable axes: missing-slice `task_success`, `$call1`. Not dump-winnable: `cap_obey`, `cites_ok`, `$call2plus`.

- L1 wins missing-slice and `$call1` → cannot distinguish. Not KEEP.
- L1 ties missing-slice and is cheaper → not KEEP. Report cheaper.
- L1 loses missing-slice and is cheaper → TRADE. Not a yes to beat dump on tokens × success.

## Pins

- Tasks hash (before run 1): none. No KEEP run is pinned.
- Subject: no KEEP subject.
- Prefix-bust pair: none. Unverified pair ⇒ no KEEP on `$call2plus`.
