/**
 * Advisory per-agent repeat-call detector. It enriches post-execute decisions
 * with logged model context without vetoing or rewriting calls. Configuration
 * and chain semantics live in the package README; rationale lives in the
 * repeat-tool-reminder Agent Note.
 * @module @deepseek-ai/dsh-repeat-tool-reminder
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContextFormed } from '@deepseek-ai/dsh-llm'
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'repeat-tool-reminder': { kind: 'repeat-tool-reminder' } & ContextFormed
  }
}

import type { MessageSource } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import type { PostToolDecision, ToolExecution, ToolResult } from '@deepseek-ai/dsh-tools'

export const name = 'repeat-tool-reminder'

/**
 * Plugin config, validated by the same-named schemastery schema plus the
 * load-time checks in `apply` (misconfiguration fails loud: an empty
 * `thresholds` list, a non-integer, a value below 2, or a duplicate throws at
 * plugin load, never a silent fall-back). `include`/`exclude` entries are
 * `*`-wildcard predicates over tool names at call time, not references to
 * registry entries — a pattern matching no currently registered tool is valid
 * (`exclude: [mcp_*]` must stay legal in a deployment that loads no MCP tools).
 */
export interface Config {
  /** Consecutive-repeat counts that trigger a reminder (default `[3, 5, 8]`). */
  thresholds?: number[]
  /** Tool-name patterns to track; empty means every tool is tracked. */
  include?: string[]
  /** Tool-name patterns transparent to the chain (neither count nor reset). */
  exclude?: string[]
  /**
   * Maximum characters of canonical arguments quoted in the DETAILED reminder
   * (default 500). Large payloads (a `write` body, a long command) would
   * otherwise ride into the next request unbounded — precisely in a loop
   * scenario; the cap bounds the reminder, never the detection (the chain key
   * always compares the FULL canonical string).
   */
  argumentsPreviewChars?: number
  /** Tool calls to one tool in a turn before the wrap-up notice (default 12). */
  toolTurnNotice?: number
  /** Tool calls to one tool in a turn: hard stop (default 20). */
  toolTurnLimit?: number
  /** Tool calls of every kind in a turn before the wrap-up notice (default 24). */
  turnBudgetNotice?: number
  /** Tool calls of every kind in a turn: absolute backstop (default 40). */
  turnCallLimit?: number
}

export const Config: z<Config> = z.object({
  thresholds: z.array(z.number()).default([3, 5, 8]),
  include: z.array(z.string()).default([]),
  exclude: z.array(z.string()).default([]),
  argumentsPreviewChars: z.number().default(500),
  toolTurnNotice: z.number().default(12),
  toolTurnLimit: z.number().default(20),
  turnBudgetNotice: z.number().default(24),
  turnCallLimit: z.number().default(40),
})

/**
 * The `{kind:'repeat-tool-reminder'}` producer source stamped on every reminder
 * this guard injects — the label is load-bearing (an unlabeled context would
 * render as a user prompt in derived history).
 */
const REMINDER_SOURCE: MessageSource = { kind: 'repeat-tool-reminder' }

/**
 * The gentle first-threshold reminder. Keyed to `thresholds[0]`, not a literal
 * count, so a custom first threshold keeps the gentle-then-detailed escalation.
 */
const GENTLE_REMINDER =
  'You are repeating the exact same tool call with identical arguments. '
  + 'Carefully analyze the previous result before calling again: if the task is '
  + 'not complete, try a different approach or different arguments instead of '
  + 'repeating the call.'

/** The detailed later-threshold reminder naming the tool, the rep count, and the canonical arguments. */
function detailedReminder(toolName: string, count: number, canonicalArguments: string): string {
  return 'Repeated tool call detected:\n'
    + `- tool: ${toolName}\n`
    + `- identical_calls_recently: ${count}\n`
    + `- arguments: ${canonicalArguments}\n`
    + 'The repeated calls are not making progress. Do not call this tool with '
    + 'these exact arguments again. Inspect the latest result and choose a '
    + 'different action, different arguments, or finish the task if enough '
    + 'evidence has been gathered.'
}

/**
 * The last-resort notice injected before a step once one identical call has
 * repeated past every configured threshold. The reminders above ask the model
 * to change course; this one removes the option of calling another tool, so the
 * turn ends with an answer instead of running on until the human stops it.
 */
const LOOP_BREAKER =
  'You are stuck in a loop: this identical tool call has now been made many '
  + 'times in this turn and its result is not changing. Stop calling tools. '
  + 'Answer the user now with what you already have. If something is genuinely '
  + 'missing, say plainly what it is and what you need — do not call this tool '
  + 'again.'

/**
 * The reminder for a call that keeps *succeeding* while changing nothing.
 *
 * This is the loop an arguments-only check cannot see, and the one measured on
 * the deployment this guard ships to: a model that paraphrases its arguments on
 * every attempt never repeats a signature, yet repeats the outcome. A `memory`
 * write answering "entry already exists, nothing added" for the third time is
 * as stuck as a byte-identical repeat, so results are counted too.
 */
function noProgressReminder(toolName: string, count: number): string {
  return 'No progress detected:\n'
    + `- tool: ${toolName}\n`
    + `- identical_results_this_turn: ${count}\n`
    + `The last ${count} calls to this tool returned the same result, so calling `
    + 'it again cannot change anything. Stop calling this tool. Answer the user '
    + 'now with what you already have, or use a different tool or genuinely '
    + 'different arguments.'
}

/**
 * The last-resort notice for a turn that has spent its whole budget on tool
 * calls. Unlike {@link LOOP_BREAKER} it names no single culprit — some turns
 * loop by switching between several tools — so it simply withdraws the option
 * of another call.
 */
const TURN_BUDGET_REMINDER =
  'This turn has already spent a large number of tool calls and is not '
  + 'converging. Stop calling tools and answer the user now with what you '
  + 'already have. If something is genuinely missing, say plainly what it is '
  + 'and what you need.'

/**
 * A stable fingerprint of what one tool call actually returned.
 *
 * Compared by *outcome*, not by object identity, because the loop worth
 * breaking is a call that keeps succeeding with nothing to show for it. Text
 * blocks are joined when present (the model-facing case); any other payload
 * falls back to a bounded JSON form, so a meta-only or failed result still
 * fingerprints deterministically. Whitespace is collapsed and the length
 * capped, so an answer that differs only in re-rendered spacing still counts
 * as the same outcome.
 *
 * An empty answer fingerprints to the empty string, which the caller reads as
 * "no outcome to compare": silent success is how most write-side tools report
 * having done their job (`mkdir`, `touch`, `cp`), and counting those as one
 * unchanging outcome would end a perfectly healthy turn.
 */
function resultFingerprint(result: ToolResult | undefined): string {
  const parts: string[] = []
  if (Array.isArray(result?.content)) {
    for (const block of result.content) {
      if (block !== null && typeof block === 'object') { const _t = (block as { text?: unknown }).text; parts.push(typeof _t === 'string' ? _t : JSON.stringify(sortJsonValue(block))) }
      else parts.push(JSON.stringify(sortJsonValue(block)))
    }
  }
  const rendered = parts.length > 0 ? parts.join('\u0000') : JSON.stringify(sortJsonValue(result ?? null))
  const text = rendered.replace(/\s+/g, ' ').trim().slice(0, 2000)
  if (text.length === 0) return ''
  return `${result?.isError === true ? 'E' : 'O'}:${text}`
}

/**
 * Deep key-sort of a parsed-JSON value so two argument objects that differ
 * only in property order canonicalize identically. Arguments reach the guard
 * as the loop's `JSON.parse` output (or its raw-string fallback for malformed
 * argument JSON), so JSON's value domain is the whole input domain — no
 * bigint, cycle, or `undefined` handling exists because no input path can
 * produce them.
 */
function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortJsonValue(record[key])
    }
    return sorted
  }
  return value
}

/** Canonical string form of a call's arguments: deep key-sort, then stringify. */
function canonicalize(argumentsValue: unknown): string {
  return JSON.stringify(sortJsonValue(argumentsValue))
}

/** Compile one `*`-wildcard pattern to an anchored RegExp (every other regex metacharacter is matched literally). */
function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, String.raw`\$&`)
  return new RegExp(`^${escaped.replaceAll('*', '.*')}$`)
}

/**
 * Head-truncate the canonical arguments for quoting in the detailed reminder,
 * marking how much was omitted. Bounds only the model-visible text — the
 * chain key always uses the full canonical string.
 */
function previewArguments(canonical: string, cap: number): string {
  if (canonical.length <= cap) return canonical
  return `${canonical.slice(0, cap)}… (+${canonical.length - cap} more chars)`
}

/**
 * Validate `thresholds` per the fail-loud contract and return them sorted
 * ascending (the escalation rule reads `thresholds[0]` as the gentle tier, so
 * order is normalized here, once).
 */
function validateThresholds(values: number[]): number[] {
  if (values.length === 0) {
    throw new Error('repeat-tool-reminder: `thresholds` must not be empty')
  }
  for (const value of values) {
    if (!Number.isInteger(value) || value < 2) {
      throw new Error(`repeat-tool-reminder: invalid threshold ${value} — every threshold must be an integer >= 2`)
    }
  }
  if (new Set(values).size !== values.length) {
    throw new Error('repeat-tool-reminder: `thresholds` must not contain duplicates')
  }
  return [...values].sort((a, b) => a - b)
}

/**
 * Prepend the guard's reminder while preserving every downstream context's
 * source and metadata.
 */
function prependContext(ours: UserMessage, theirs: UserMessage[] | undefined): UserMessage[] {
  return [ours, ...theirs ?? []]
}

/**
 * One agent's repeat chain, as of its most recent tracked call: the identity
 * key `key` of that call, how many times `key` appears inside the sliding
 * `window` (`count`, which drives the advisory thresholds), how many times it
 * has been called this turn (`total`), the rolling window itself, and the
 * per-turn counters every ceiling is measured against.
 *
 * Four counters answer four different questions, and all four are needed
 * because stuck turns do not share one shape: `total` counts one signature
 * verbatim, `toolTotal` counts one TOOL however its arguments are reworded,
 * `outcomeTotal` counts one tool returning the SAME result (the paraphrase
 * loop, invisible to the two above), and `turnCalls` counts the whole turn
 * regardless of who spent it — the turn that loops by switching tools.
 */
interface Chain {
  counts: Map<string, number>
  key: string
  count: number
  total: number
  window: string[]
  /** Tool name of the most recent tracked call. */
  tool: string
  toolCalls: Map<string, number>
  toolTotal: number
  results: Map<string, number>
  /** `undefined` when the call answered with nothing — see {@link resultFingerprint}. */
  outcomeKey: string | undefined
  outcomeTotal: number
  /** The worst same-result run any single tool has reached this turn. */
  outcomePeak: number
  /** The outcome key that holds {@link outcomePeak}; empty when nothing counted yet. */
  outcomePeakKey: string
  turnCalls: number
}

/**
 * Install the guard's listeners.
 * @param ctx - plugin context; listeners are scoped to it and disposed with it.
 * @param config - validated {@link Config}; `thresholds` is re-checked fail-loud here.
 */
export function apply(ctx: Context, config: Config): void {
  // schemastery's .default() guarantees the fields are set after validation.
  const thresholds = validateThresholds(config.thresholds as number[])
  const thresholdSet = new Set(thresholds)
  const includePatterns = (config.include as string[]).map(wildcardToRegExp)
  const excludePatterns = (config.exclude as string[]).map(wildcardToRegExp)
  const argumentsPreviewChars = config.argumentsPreviewChars as number
  if (!Number.isInteger(argumentsPreviewChars) || argumentsPreviewChars < 1) {
    throw new Error(`repeat-tool-reminder: invalid argumentsPreviewChars ${argumentsPreviewChars} — must be an integer >= 1`)
  }

  const chains = new WeakMap<Agent, Chain>()

  /**
   * How many recent calls form the window the thresholds are counted over.
   *
   * The shipped detector compared a call only against the *immediately
   * preceding* one, which a two-call alternation defeats: in `A,B,A,B,…` no
   * neighbour ever matches, so the run length stays 1 and no threshold fires.
   * Measured on the deployment this guard ships to: a 25-step turn that
   * alternated two `memory` writes with identical arguments ran until the user
   * pressed stop, with the guard silent throughout. Counting occurrences inside
   * a window sees that shape, and still sees the plain consecutive case it was
   * written for.
   */
  const REPEAT_WINDOW = 24

  /** Identical calls to one signature in a single turn before the model is told to answer now. */
  const REPEAT_FINAL_WARNING = 12

  /** Identical calls to one signature in a single turn before the turn is ended outright. */
  const REPEAT_TURN_LIMIT = 16

  /**
   * Calls to one tool returning the SAME (non-empty) result in a turn before
   * the model is told it is not progressing.
   */
  const NO_PROGRESS_NOTICE = 5

  /** The same-result run this long in one turn: the last reminder before the hard stop. */
  const NO_PROGRESS_FINAL = 8

  /**
   * The same-result run this long in one turn: the turn ends.
   *
   * Deliberately far above the 3/4/5 an earlier draft used. One tool answering
   * the same thing is not by itself a loop — five probes that all miss, or a
   * checker with nothing to report, are ordinary work, and ending the turn on
   * that would break healthy turns (measured: a 30-call turn ended at 10
   * because one of its two tools answered `ok` every time). Ten identical
   * answers with different arguments is no longer plausibly useful, and the
   * guarantees that matter — one tool × {@link TOOL_TURN_LIMIT}, any tool ×
   * {@link TURN_CALL_LIMIT} — are independent of results anyway.
   */
  const NO_PROGRESS_LIMIT = 10

  /** Calls to one tool in a single turn before the model is told to wrap up. */
  // kbPatch-2026-09-22: config-driven turn budget (was 12)
  const TOOL_TURN_NOTICE = typeof config.toolTurnNotice === 'number' ? config.toolTurnNotice : 12

  /** Calls to one tool in a single turn: the turn ends even when each result differs. */
  // kbPatch-2026-09-22: config-driven turn budget (was 20)
  const TOOL_TURN_LIMIT = typeof config.toolTurnLimit === 'number' ? config.toolTurnLimit : 20

  /** Tool calls of every kind in a single turn before the model is told to wrap up. */
  // kbPatch-2026-09-22: config-driven turn budget (was 24)
  const TURN_BUDGET_NOTICE = typeof config.turnBudgetNotice === 'number' ? config.turnBudgetNotice : 24

  /** Tool calls of every kind in a single turn: the absolute backstop, the turn ends. */
  // kbPatch-2026-09-22: config-driven turn budget (was 40)
  const TURN_CALL_LIMIT = typeof config.turnCallLimit === 'number' ? config.turnCallLimit : 40

  /** Whether a tool participates in the chain (untracked calls are transparent: they neither count nor reset). */
  function tracked(toolName: string): boolean {
    if (includePatterns.length > 0 && !includePatterns.some(pattern => pattern.test(toolName))) return false
    return !excludePatterns.some(pattern => pattern.test(toolName))
  }

  /**
   * Advance the calling agent's chain for one attempt and return the reminder
   * to deliver, if this attempt crosses a configured threshold.
   *
   * Counting happens here — in post-execute — because denied calls also flow
   * through this waterfall (`ToolRuntime.execute` routes a deny through the
   * same pipeline), and a model hammering a denied call is exactly the loop
   * worth breaking. The attempt is counted against four keys at once: its
   * signature (`count` inside {@link REPEAT_WINDOW}, `total` this turn), its
   * tool (`toolTotal`), its outcome ({@link resultFingerprint}), and the turn
   * itself (`turnCalls`). The advisory thresholds read the signature; the
   * ceilings in `stuckReason` read all four.
   */
  function observe(exec: ToolExecution, result: ToolResult | undefined): UserMessage | undefined {
    // A direct `ctx.tools.execute()` caller has no model to remind and no id
    // to key on; only agent-loop calls participate.
    if (!exec.agent) return undefined
    if (!tracked(exec.name)) return undefined
    const canonical = canonicalize(exec.arguments)
    const key = JSON.stringify([exec.name, canonical])
    const chain = chains.get(exec.agent)
    const counts = chain?.counts ?? new Map<string, number>()
    const total = (counts.get(key) ?? 0) + 1
    counts.set(key, total)
    const window = [...chain?.window.slice(-(REPEAT_WINDOW - 1)) ?? [], key]
    const count = window.filter(entry => entry === key).length
    const toolCalls = chain?.toolCalls ?? new Map<string, number>()
    const toolTotal = (toolCalls.get(exec.name) ?? 0) + 1
    toolCalls.set(exec.name, toolTotal)
    const results = chain?.results ?? new Map<string, number>()
    const fingerprint = resultFingerprint(result)
    const outcomeKey = fingerprint.length === 0 ? undefined : `${exec.name}\u0000${fingerprint}`
    const outcomeTotal = outcomeKey === undefined ? 0 : (results.get(outcomeKey) ?? 0) + 1
    if (outcomeKey !== undefined) results.set(outcomeKey, outcomeTotal)
    // The ladder watches the worst single outcome of the turn, not the last
    // one. A run interrupted by an unrelated call is the same run, and a peak
    // that only grows is also what makes the one-shot rungs reliable: each
    // fires on the exact count that crosses it, and calls arrive one at a
    // time, so no rung can be stepped over.
    const outcomePeak = Math.max(chain?.outcomePeak ?? 0, outcomeTotal)
    const outcomePeakKey = outcomeKey !== undefined && outcomePeak === outcomeTotal
      ? outcomeKey
      : chain?.outcomePeakKey ?? ''
    const turnCalls = (chain?.turnCalls ?? 0) + 1
    chains.set(exec.agent, {
      counts, key, count, total, window,
      tool: exec.name, toolCalls, toolTotal,
      results, outcomeKey, outcomeTotal, outcomePeak, outcomePeakKey, turnCalls,
    })
    // The outcome check comes first: when a call repeats both its signature and
    // its result, "nothing has changed" is the more useful thing to say than
    // "you already said that", and it is the earlier of the two to fire.
    if (outcomeTotal === NO_PROGRESS_NOTICE) {
      const text = noProgressReminder(exec.name, outcomeTotal)
      return createUserMessage({
        content: [{ type: 'text', text }],
        source: { ...REMINDER_SOURCE, form: 'notice', summary: `${exec.name} 结果未变 × ${outcomeTotal}` },
      })
    }
    if (!thresholdSet.has(count)) return undefined
    const text = count === thresholds[0]
      ? GENTLE_REMINDER
      : detailedReminder(exec.name, count, previewArguments(canonical, argumentsPreviewChars))
    return createUserMessage({
      content: [{ type: 'text', text }],
      source: { ...REMINDER_SOURCE, form: 'notice', summary: `${exec.name} × ${count}` },
    })
  }

  // Observe-and-enrich, never veto: count first (state advances regardless of
  // the downstream outcome), DELEGATE so a later listener can still block or
  // replace, then fold the reminder onto whatever came back — additionalContexts
  // rides both decision variants, so a blocked call still gets the nudge.
  ctx.on('tools/post-execute', async (exec, result, next): Promise<PostToolDecision> => {
    const reminder = observe(exec, result)
    const downstream = await next()
    if (!reminder) return downstream
    if (downstream.kind === 'block') {
      return { kind: 'block', feedback: downstream.feedback, additionalContexts: prependContext(reminder, downstream.additionalContexts) }
    }
    return {
      ...downstream,
      additionalContexts: prependContext(reminder, downstream.additionalContexts),
    }
  })

  // A user interjection changes the context; repetition across it is not a
  // loop. It also hands the model a last instruction before the hard stop: the
  // reminders above are advisory, and a degenerating model can ignore every one
  // of them, in which case the turn only ends when the human presses stop.
  ctx.on('agent/pre-step', async ({ agent, messages }, next): Promise<PreStepDecision> => {
    if (messages.some(message => message.source.kind === 'user')) {
      chains.delete(agent)
      return next()
    }
    const chain = chains.get(agent)
    if (chain === undefined) return next()
    const stuck = stuckReason(chain)
    if (stuck !== undefined) {
      ctx.logger?.warn?.(`repeat-tool-reminder: ending a turn stuck on ${stuck}`)
      chains.delete(agent)
      return { kind: 'reject' }
    }
    const downstream = await next()
    if (downstream.kind !== 'enter') return downstream
    const notice = oneShotNotice(chain)
    if (notice === undefined) return downstream
    return {
      ...downstream,
      messages: [...downstream.messages, createUserMessage({
        content: [{ type: 'text', text: notice.text }],
        source: { ...REMINDER_SOURCE, form: 'notice', summary: notice.summary },
      })],
    }
  })

  /**
   * Why this turn has to end, or `undefined` when it may continue.
   *
   * Four independent ceilings, because the shapes of a stuck turn differ: one
   * tool whose every call returns the same thing (`outcomePeak` — the paraphrase
   * loop, which a signature check cannot see), one signature hammered verbatim,
   * one tool hammered with cosmetic rewording (`toolTotal`), and finally a turn
   * that keeps spending calls without converging. Ordered worst-cause-first so
   * the log names the shape that actually fired.
   */
  function stuckReason(chain: Chain): string | undefined {
    if (chain.outcomePeak >= NO_PROGRESS_LIMIT) return `${chain.outcomePeak} calls to ${peakTool(chain)} returning the same result`
    if (chain.total >= REPEAT_TURN_LIMIT) return `${chain.total} identical calls to one signature`
    if (chain.toolTotal >= TOOL_TURN_LIMIT) return `${chain.toolTotal} calls to ${chain.tool} in one turn`
    if (chain.turnCalls >= TURN_CALL_LIMIT) return `${chain.turnCalls} tool calls in one turn`
    return undefined
  }

  /** Which tool holds the turn's worst same-result run. */
  function peakTool(chain: Chain): string {
    const separator = chain.outcomePeakKey.indexOf('\u0000')
    return separator === -1 ? chain.tool : chain.outcomePeakKey.slice(0, separator)
  }

  /**
   * The one reminder still worth injecting before the next step, if any.
   *
   * Each rung fires on the *exact* count that crosses it, which is what makes it
   * a one-shot: the counters only ever grow within a turn, and calls arrive one
   * at a time, so equality is a single crossing rather than a per-step repeat.
   */
  function oneShotNotice(chain: Chain): { text: string, summary: string } | undefined {
    if (chain.outcomePeak === NO_PROGRESS_FINAL) {
      return { text: LOOP_BREAKER, summary: `结果未变 × ${chain.outcomePeak}` }
    }
    if (chain.total === REPEAT_FINAL_WARNING) {
      return { text: LOOP_BREAKER, summary: `identical calls × ${chain.total}` }
    }
    if (chain.toolTotal === TOOL_TURN_NOTICE) {
      return { text: TURN_BUDGET_REMINDER, summary: `${chain.tool} 本轮 × ${chain.toolTotal}` }
    }
    if (chain.turnCalls === TURN_BUDGET_NOTICE) {
      return { text: TURN_BUDGET_REMINDER, summary: `本轮工具调用 × ${chain.turnCalls}` }
    }
    return undefined
  }
}
