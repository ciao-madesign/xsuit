import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeStudy,
  assignOrders,
  signTestP,
  validateStudy,
  type Study,
} from "../src/research/study";

const base = (): Study => ({
  schema: "xsuit.study/1",
  studyId: "pilot-news",
  profileTested: "western",
  siteCategory: "news sites",
  consent: { obtained: true, version: "v1", withdrawalExplained: true },
  tasks: [
    {
      id: "t1",
      description: "Find the contact page",
      successCriterion: "Reaches the contact page",
      maxSeconds: 120,
    },
  ],
  criteria: {
    registeredOn: "2026-12-01",
    maxSlowdown: 0.1,
    maxSuccessDrop: 0,
    minPreferenceShare: 0.5,
    minParticipants: 4,
  },
  limits: "Small pilot, one site category.",
  sessions: [],
});
const session = (
  i: number,
  a: number,
  b: number,
  pref: "A" | "B" | "none" = "B",
  ok = [true, true],
) => ({
  participant: `P${String(i).padStart(2, "0")}`,
  market: "western" as const,
  familiarity: "none" as const,
  date: "2026-12-02",
  order: (i % 2 ? "AB" : "BA") as "AB" | "BA",
  trials: [
    { task: "t1", condition: "A" as const, seconds: a, steps: 5, errors: 0, success: ok[0]! },
    { task: "t1", condition: "B" as const, seconds: b, steps: 4, errors: 0, success: ok[1]! },
  ],
  preference: { chosen: pref, reason: "clearer" },
  incidents: [] as { kind: "misled" | "lost-content" | "could-not-undo" | "other"; note: string }[],
});
const withSessions = (n: number, mk: (i: number) => ReturnType<typeof session>): Study => ({
  ...base(),
  sessions: Array.from({ length: n }, (_, i) => mk(i + 1)),
});

describe("study file validation", () => {
  it("accepts a complete study", () => {
    expect(validateStudy(withSessions(4, (i) => session(i, 30, 25)))).toEqual([]);
  });

  it("the template is rejected until it is filled in", () => {
    expect(
      validateStudy(JSON.parse(readFileSync("research/studies/template.json", "utf8"))).length,
    ).toBeGreaterThan(3);
  });

  it("refuses unknown fields, so no name or free-form extra can ride along", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    (s.sessions[0] as unknown as Record<string, unknown>).name = "Mario";
    (s as unknown as Record<string, unknown>).email = "x";
    const p = validateStudy(s).join(" ");
    expect(p).toMatch(/field "name" is not allowed/);
    expect(p).toMatch(/field "email" is not allowed/);
  });

  it("participants are pseudonyms, unique", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    s.sessions[0]!.participant = "Mario Rossi";
    expect(validateStudy(s).join(" ")).toMatch(/pseudonym/);
    const d = withSessions(2, () => session(1, 30, 25));
    expect(validateStudy(d).join(" ")).toMatch(/appears twice/);
  });

  it("personal data in free text is caught", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    s.sessions[0]!.preference.reason = "write to mario@example.com";
    expect(validateStudy(s).join(" ")).toMatch(/e-mail/);
  });

  it("requires consent and withdrawal explained", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    s.consent.obtained = false;
    expect(validateStudy(s).join(" ")).toMatch(/consent/);
  });

  it("criteria must be registered before the first session", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    s.criteria.registeredOn = "2026-12-05";
    expect(validateStudy(s).join(" ")).toMatch(/registered before the first session/);
  });

  it("every task needs exactly one trial per condition", () => {
    const s = withSessions(2, (i) => session(i, 30, 25));
    s.sessions[0]!.trials.pop();
    expect(validateStudy(s).join(" ")).toMatch(/needs one trial in A and one in B/);
    const t = withSessions(2, (i) => session(i, 30, 25));
    t.sessions[0]!.trials[1]!.task = "zzz";
    expect(validateStudy(t).join(" ")).toMatch(/not in the protocol/);
  });
});

describe("orders and the sign test", () => {
  it("counterbalances: half AB, half BA, same seed same result", () => {
    for (const n of [2, 8, 11]) {
      const o = assignOrders(n, 7);
      expect(
        Math.abs(o.filter((x) => x === "AB").length - o.filter((x) => x === "BA").length),
      ).toBeLessThanOrEqual(1);
    }
    expect(assignOrders(10, 3)).toEqual(assignOrders(10, 3));
  });

  it("exact two-sided sign test", () => {
    expect(signTestP(0, 0)).toBeNull();
    expect(signTestP(5, 5)).toBe(1);
    expect(signTestP(8, 0)).toBeCloseTo(2 / 256, 10);
    expect(signTestP(0, 8)).toBeCloseTo(2 / 256, 10);
    expect(signTestP(9, 3)).toBeCloseTo(0.146, 3);
  });
});

describe("analysis applies only the registered criteria", () => {
  it("go when speed, success and preference criteria are met", () => {
    const a = analyzeStudy(withSessions(6, (i) => session(i, 30, 25)));
    expect(a.verdict).toBe("go");
    expect(a.perTask[0]).toMatchObject({
      fasterB: 6,
      fasterA: 0,
      medianSecondsA: 30,
      medianSecondsB: 25,
    });
  });

  it("no-go when B is much slower or less successful or not preferred", () => {
    expect(analyzeStudy(withSessions(6, (i) => session(i, 30, 40))).verdict).toBe("no-go");
    expect(
      analyzeStudy(withSessions(6, (i) => session(i, 30, 25, "B", [true, i < 3]))).verdict,
    ).toBe("no-go");
    expect(
      analyzeStudy(withSessions(6, (i) => session(i, 30, 25, i < 2 ? "B" : "A"))).verdict,
    ).toBe("no-go");
  });

  it("inconclusive with too few participants, never go", () => {
    const a = analyzeStudy(withSessions(2, (i) => session(i, 30, 25)));
    expect(a.verdict).toBe("inconclusive");
    expect(a.note).toMatch(/descriptive only/);
  });

  it("a blocking incident is a no-go whatever the numbers, even with few participants", () => {
    for (const kind of ["misled", "lost-content", "could-not-undo"] as const) {
      const s = withSessions(2, (i) => session(i, 30, 20));
      s.sessions[0]!.incidents.push({ kind, note: "" });
      expect(analyzeStudy(s).verdict, kind).toBe("no-go");
    }
    const o = withSessions(6, (i) => session(i, 30, 25));
    o.sessions[0]!.incidents.push({ kind: "other", note: "small" });
    expect(analyzeStudy(o).verdict).toBe("go");
  });
});
