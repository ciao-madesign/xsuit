import { scanValue } from "./personal";

// User study files (B22). One file = one study: the protocol and the decision criteria written
// BEFORE the sessions, then one record per participant. Condition A is the page as it is, condition
// B is the page adapted by xsuit. Nothing here identifies a person: pseudonyms, bands, counts.

export const STUDY_SCHEMA = "xsuit.study/1";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PSEUDONYM = /^P\d{2,3}$/;
const MARKETS = ["western", "china", "other"] as const;
const BANDS = ["none", "some", "daily"] as const; // familiarity with the tested sites
const PROFILES = ["western", "china", "hybrid"] as const;
const CONDITIONS = ["A", "B"] as const;
const INCIDENTS = ["misled", "lost-content", "could-not-undo", "other"] as const;
/** Incidents that always stop a "go": they are the harms xsuit exists to prevent. */
export const BLOCKING_INCIDENTS = ["misled", "lost-content", "could-not-undo"] as const;

export type Condition = (typeof CONDITIONS)[number];

export interface Trial {
  task: string;
  condition: Condition;
  seconds: number;
  steps: number;
  errors: number;
  success: boolean;
}
export interface Session {
  participant: string;
  market: (typeof MARKETS)[number];
  familiarity: (typeof BANDS)[number];
  date: string;
  order: "AB" | "BA";
  trials: Trial[];
  preference: { chosen: Condition | "none"; reason: string };
  incidents: { kind: (typeof INCIDENTS)[number]; note: string }[];
}
export interface Criteria {
  registeredOn: string;
  /** B may be at most this share slower than A in median time (0.1 = 10 % slower). */
  maxSlowdown: number;
  /** Success rate of B may be at most this many points under A's (0 = no drop allowed). */
  maxSuccessDrop: number;
  /** Share of participants (excluding "none") who must prefer B. */
  minPreferenceShare: number;
  /** Fewer participants than this: the result can only be "inconclusive". */
  minParticipants: number;
}
export interface Study {
  schema: string;
  studyId: string;
  profileTested: (typeof PROFILES)[number];
  siteCategory: string;
  consent: { obtained: boolean; version: string; withdrawalExplained: boolean };
  tasks: { id: string; description: string; successCriterion: string; maxSeconds: number }[];
  criteria: Criteria;
  limits: string;
  sessions: Session[];
}

const isNum = (v: unknown, min = 0): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min;
const has = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v);

const TOP = [
  "schema",
  "studyId",
  "profileTested",
  "siteCategory",
  "consent",
  "tasks",
  "criteria",
  "limits",
  "sessions",
];
const SESSION = [
  "participant",
  "market",
  "familiarity",
  "date",
  "order",
  "trials",
  "preference",
  "incidents",
];
const TRIAL = ["task", "condition", "seconds", "steps", "errors", "success"];

function extra(o: object, allowed: string[], where: string): string[] {
  return Object.keys(o)
    .filter((k) => !allowed.includes(k))
    .map((k) => `${where}: field "${k}" is not allowed`);
}

/** Returns problems; empty = the file may be kept and shared. Template placeholders are rejected. */
export function validateStudy(input: unknown): string[] {
  const out: string[] = [];
  if (typeof input !== "object" || input === null) return ["study must be an object"];
  const s = input as Record<string, unknown>;
  out.push(...extra(s, TOP, "study"));
  if (s.schema !== STUDY_SCHEMA) out.push(`schema must be "${STUDY_SCHEMA}"`);
  if (typeof s.studyId !== "string" || !/^[a-z0-9-]{3,40}$/.test(s.studyId))
    out.push("studyId must be 3-40 characters: a-z, 0-9, -");
  if (!has(PROFILES, s.profileTested)) out.push("profileTested is not valid");
  if (typeof s.siteCategory !== "string" || !s.siteCategory.trim())
    out.push("siteCategory is required (a category, not a site name of a person)");
  if (typeof s.limits !== "string" || !s.limits.trim())
    out.push("limits is required (what this study cannot show)");

  const c = s.consent as Study["consent"] | undefined;
  if (
    !c ||
    c.obtained !== true ||
    c.withdrawalExplained !== true ||
    typeof c.version !== "string" ||
    !c.version
  )
    out.push("consent: obtained, withdrawalExplained and version are required");

  const taskIds = new Set<string>();
  if (!Array.isArray(s.tasks) || s.tasks.length === 0)
    out.push("tasks: at least one task is required");
  else
    (s.tasks as Study["tasks"][number][]).forEach((t, i) => {
      if (!t || typeof t.id !== "string" || !t.id || taskIds.has(t.id))
        out.push(`tasks[${i}].id must be unique`);
      else taskIds.add(t.id);
      if (!t || !t.description?.trim() || !t.successCriterion?.trim())
        out.push(`tasks[${i}] needs a description and a success criterion`);
      if (!t || !isNum(t.maxSeconds, 1))
        out.push(`tasks[${i}].maxSeconds must be a positive number`);
    });

  const k = s.criteria as Criteria | undefined;
  if (
    !k ||
    !DATE.test(String(k.registeredOn)) ||
    !isNum(k.maxSlowdown) ||
    !isNum(k.maxSuccessDrop) ||
    !isNum(k.minPreferenceShare) ||
    !isNum(k.minParticipants, 1)
  )
    out.push(
      "criteria: registeredOn, maxSlowdown, maxSuccessDrop, minPreferenceShare and minParticipants are required",
    );

  if (!Array.isArray(s.sessions)) out.push("sessions must be an array");
  else {
    const seen = new Set<string>();
    (s.sessions as Session[]).forEach((p, i) => {
      const w = `sessions[${i}]`;
      if (typeof p !== "object" || p === null) return void out.push(`${w} must be an object`);
      out.push(...extra(p, SESSION, w));
      if (typeof p.participant !== "string" || !PSEUDONYM.test(p.participant))
        out.push(`${w}.participant must be a pseudonym like P01`);
      else if (seen.has(p.participant)) out.push(`${w}.participant ${p.participant} appears twice`);
      else seen.add(p.participant);
      if (!has(MARKETS, p.market)) out.push(`${w}.market is not valid`);
      if (!has(BANDS, p.familiarity)) out.push(`${w}.familiarity is not valid`);
      if (!DATE.test(String(p.date))) out.push(`${w}.date must be YYYY-MM-DD`);
      else if (k && DATE.test(String(k.registeredOn)) && p.date < k.registeredOn)
        out.push(
          `${w}: the criteria must be registered before the first session (registeredOn ${k.registeredOn} is after ${p.date})`,
        );
      if (p.order !== "AB" && p.order !== "BA") out.push(`${w}.order must be AB or BA`);
      if (!Array.isArray(p.trials)) return void out.push(`${w}.trials must be an array`);
      const per = new Map<string, Set<string>>();
      p.trials.forEach((t, j) => {
        const tw = `${w}.trials[${j}]`;
        out.push(...extra(t, TRIAL, tw));
        if (!taskIds.has(t.task)) out.push(`${tw}.task is not in the protocol`);
        if (!has(CONDITIONS, t.condition)) out.push(`${tw}.condition must be A or B`);
        if (
          !isNum(t.seconds) ||
          !isNum(t.steps) ||
          !isNum(t.errors) ||
          typeof t.success !== "boolean"
        )
          out.push(`${tw}: seconds, steps, errors (numbers) and success (true/false) are required`);
        const set = per.get(t.task) ?? new Set<string>();
        if (set.has(t.condition))
          out.push(`${tw}: task ${t.task} done twice in condition ${t.condition}`);
        set.add(t.condition);
        per.set(t.task, set);
      });
      for (const id of taskIds)
        if (per.get(id)?.size !== 2) out.push(`${w}: task ${id} needs one trial in A and one in B`);
      if (
        !p.preference ||
        !(p.preference.chosen === "none" || has(CONDITIONS, p.preference.chosen)) ||
        typeof p.preference.reason !== "string"
      )
        out.push(`${w}.preference needs chosen (A, B or none) and reason`);
      if (!Array.isArray(p.incidents)) out.push(`${w}.incidents must be an array (empty if none)`);
      else
        p.incidents.forEach((n, j) => {
          if (!has(INCIDENTS, n?.kind) || typeof n.note !== "string")
            out.push(`${w}.incidents[${j}] is not valid`);
        });
    });
  }
  // Free text must not carry personal data; names are not scannable, so only pseudonyms exist.
  out.push(...scanValue(s));
  return out;
}

/** Counterbalanced order: half of the participants do A first, half B first (seeded shuffle). */
export function assignOrders(n: number, seed = 1): ("AB" | "BA")[] {
  const orders: ("AB" | "BA")[] = Array.from({ length: n }, (_, i) => (i % 2 ? "BA" : "AB"));
  let x = seed >>> 0 || 1;
  const rnd = () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [orders[i], orders[j]] = [orders[j]!, orders[i]!];
  }
  return orders;
}

const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Exact two-sided sign test: probability of a split this uneven (or worse) if A and B were equal. */
export function signTestP(better: number, worse: number): number | null {
  const n = better + worse;
  if (n === 0) return null;
  const k = Math.min(better, worse);
  let p = 0;
  let c = 1; // C(n, 0)
  for (let i = 0; i <= k; i++) {
    p += c;
    c = (c * (n - i)) / (i + 1);
  }
  return Math.min(1, (2 * p) / 2 ** n);
}

export interface Analysis {
  participants: number;
  perTask: {
    task: string;
    medianSecondsA: number | null;
    medianSecondsB: number | null;
    successRateA: number;
    successRateB: number;
    meanErrorsA: number;
    meanErrorsB: number;
    /** Participants faster in B / faster in A (ties left out) and the sign-test p value. */
    fasterB: number;
    fasterA: number;
    signTestP: number | null;
  }[];
  overall: { medianSlowdown: number | null; successDrop: number };
  preference: { A: number; B: number; none: number; shareB: number | null };
  blockingIncidents: number;
  checks: { name: string; ok: boolean; detail: string }[];
  /** go: every registered criterion is met. no-go: a criterion failed or a blocking incident occurred. inconclusive: too few participants. */
  verdict: "go" | "no-go" | "inconclusive";
  note: string;
}

/** Applies the criteria registered in the file, mechanically. The numbers are descriptive; a verdict is only as strong as the sample. */
export function analyzeStudy(study: Study): Analysis {
  const ps = study.sessions;
  const perTask = study.tasks.map((t) => {
    const trials = (cond: Condition) =>
      ps.flatMap((p) => p.trials.filter((x) => x.task === t.id && x.condition === cond));
    const a = trials("A");
    const b = trials("B");
    const rate = (x: Trial[]) => (x.length ? x.filter((y) => y.success).length / x.length : 0);
    const mean = (x: Trial[]) => (x.length ? x.reduce((s, y) => s + y.errors, 0) / x.length : 0);
    let fasterB = 0;
    let fasterA = 0;
    for (const p of ps) {
      const ta = p.trials.find((x) => x.task === t.id && x.condition === "A");
      const tb = p.trials.find((x) => x.task === t.id && x.condition === "B");
      if (ta && tb && ta.seconds !== tb.seconds) {
        if (ta.seconds > tb.seconds) fasterB++;
        else fasterA++;
      }
    }
    return {
      task: t.id,
      medianSecondsA: median(a.map((x) => x.seconds)),
      medianSecondsB: median(b.map((x) => x.seconds)),
      successRateA: rate(a),
      successRateB: rate(b),
      meanErrorsA: mean(a),
      meanErrorsB: mean(b),
      fasterB,
      fasterA,
      signTestP: signTestP(fasterB, fasterA),
    };
  });
  const all = (cond: Condition) => ps.flatMap((p) => p.trials.filter((x) => x.condition === cond));
  const ma = median(all("A").map((x) => x.seconds));
  const mb = median(all("B").map((x) => x.seconds));
  const rate = (x: Trial[]) => (x.length ? x.filter((y) => y.success).length / x.length : 0);
  const overall = {
    medianSlowdown: ma && mb !== null ? (mb - ma) / ma : null,
    successDrop: rate(all("A")) - rate(all("B")),
  };
  const pref = { A: 0, B: 0, none: 0 };
  for (const p of ps) pref[p.preference.chosen]++;
  const decided = pref.A + pref.B;
  const preference = { ...pref, shareB: decided ? pref.B / decided : null };
  const blockingIncidents = ps
    .flatMap((p) => p.incidents)
    .filter((i) => (BLOCKING_INCIDENTS as readonly string[]).includes(i.kind)).length;

  const k = study.criteria;
  const checks = [
    {
      name: "no blocking incident (misled, lost content, could not undo)",
      ok: blockingIncidents === 0,
      detail: `${blockingIncidents} found`,
    },
    {
      name: "speed",
      ok: overall.medianSlowdown !== null && overall.medianSlowdown <= k.maxSlowdown,
      detail: `median change ${overall.medianSlowdown === null ? "n/a" : (overall.medianSlowdown * 100).toFixed(1) + " %"}, allowed ${(k.maxSlowdown * 100).toFixed(1)} %`,
    },
    {
      name: "success",
      ok: overall.successDrop <= k.maxSuccessDrop,
      detail: `drop ${(overall.successDrop * 100).toFixed(1)} points, allowed ${(k.maxSuccessDrop * 100).toFixed(1)}`,
    },
    {
      name: "preference",
      ok: preference.shareB !== null && preference.shareB >= k.minPreferenceShare,
      detail: `${preference.shareB === null ? "n/a" : (preference.shareB * 100).toFixed(0) + " %"} chose B, required ${(k.minPreferenceShare * 100).toFixed(0)} %`,
    },
  ];
  let verdict: Analysis["verdict"];
  if (blockingIncidents > 0) verdict = "no-go";
  else if (ps.length < k.minParticipants) verdict = "inconclusive";
  else verdict = checks.every((c) => c.ok) ? "go" : "no-go";
  return {
    participants: ps.length,
    perTask,
    overall,
    preference,
    blockingIncidents,
    checks,
    verdict,
    note:
      ps.length < k.minParticipants
        ? `Only ${ps.length} participants; the registered minimum is ${k.minParticipants}. Numbers below are descriptive only.`
        : "The verdict applies only the criteria registered before the sessions. It says nothing about other sites, markets or people.",
  };
}
