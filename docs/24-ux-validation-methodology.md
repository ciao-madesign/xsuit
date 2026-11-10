# 24 — UX validation with people and go / no-go (B22)

xsuit's rules come from studies of what differs between markets. Nothing yet shows that **a person finds things faster or more easily on an adapted page**. This build gives the researcher a fixed method, a file format that cannot hold personal data, and a go / no-go decision made from criteria written **before** the sessions.

The study itself needs people and is not done here.

## Question

On pages of one site category, do people complete everyday tasks at least as quickly and as successfully on the adapted page (B) as on the original (A), and do they prefer it, without being misled and without losing content?

## Design

- **Within participants, A/B.** Each participant does every task twice: once on the original page (A, xsuit set to _Original_) and once on the adapted page (B, one chosen profile). Switching uses the existing popup profile switch; the researcher does not need anything new in the extension.
- **Counterbalanced order.** Half start with A, half with B: `npm run study -- --assign 12 [seed]` prints a balanced list, so order and learning effects do not favour one condition.
- **Different but comparable tasks.** The same task on the same page twice teaches the page. Use two comparable pages or two equivalent targets per task, assigned to A and B by the same balanced list, and say which in `limits`.
- **Tasks** are everyday and findable (examples: find the contact page; find the opening hours; find the shipping cost; use the search to reach a named article). Each has a written success criterion and a time limit (`maxSeconds`); reaching the limit counts as failure.
- **Measures per trial:** seconds, steps (clicks and page changes), errors (wrong turns), success (yes/no). **Per participant:** which version they preferred (A, B or none) and a short reason, and any **incident**.
- **Incidents** are harms xsuit exists to prevent: `misled` (clicked or believed something they did not intend), `lost-content` (could not find what was there before), `could-not-undo` (could not return to the original), or `other`. The first three always stop a "go".

## Sample

- Registered minimum before starting (`criteria.minParticipants`; the template says 12). Below it the verdict can only be _inconclusive_.
- Record the participant's market (`western`, `china`, `other`) and familiarity with the tested sites (`none`, `some`, `daily`) as bands. Do not recruit only people who already know the sites.
- Pilot first: two or three people, to fix wording and timing. Pilot data is not part of the study file.
- A sample this size can show large differences only. State that in `limits`.

## Criteria (registered before the first session)

Written in the study file with a date **earlier than every session**; the check refuses the file otherwise.

| Criterion        | Field                | Meaning                                                     |
| ---------------- | -------------------- | ----------------------------------------------------------- |
| speed            | `maxSlowdown`        | median time of B at most this share slower than A           |
| success          | `maxSuccessDrop`     | success rate of B at most this many points under A's        |
| preference       | `minPreferenceShare` | share of those who chose A or B who chose B                 |
| enough people    | `minParticipants`    | fewer: inconclusive                                         |
| no blocking harm | (fixed)              | any `misled`, `lost-content` or `could-not-undo` is a no-go |

The template defaults (10 % slowdown, no success drop, half prefer B, 12 people) are a starting point the researcher may change **before** collecting data, never after.

## Verdict

`npm run study` validates every file in `research/studies/` and applies the registered criteria mechanically:

- **GO**: every criterion met.
- **NO-GO**: a criterion failed or a blocking incident happened.
- **INCONCLUSIVE**: too few participants.

It also prints, per task, medians, success rates, mean errors, how many people were faster in each version and an exact two-sided sign-test p value. These are descriptive. The verdict covers only this site category, these tasks, this profile and these people.

## What a verdict allows

- **GO** for a profile and category: it may be described as "tested on N people for tasks X, with these limits". It does not mean all sites.
- **NO-GO**: the profile or the rules behind the failed criterion are reviewed; nothing is shipped on that evidence.
- **Deep Mode and smarter recognition** are decided only after at least one GO, never before (build plan, B22).

## Ethics and privacy

- **Consent** before the session, in writing or recorded as given: purpose, what is measured, that they may stop at any time and withdraw their data, that nothing identifies them. The study file records `consent.obtained`, `withdrawalExplained` and the consent text version; without them the file is invalid.
- **No recording** of screen, face or voice; no screenshots in the study file. The researcher times and counts by hand or with a stopwatch.
- **Pseudonyms only** (`P01`…). The key linking pseudonym to person, if one exists at all, stays with the researcher and is never put in the repository. No names, e-mail addresses, ages (only bands), employers or locations. The personal-data scanner runs on every text field; it cannot find a plain name, so the researcher must not write one.
- **Withdrawal:** delete that participant's record from the file before anything is shared.
- **Pages:** use public pages, logged out. Never ask participants to log in, enter payment details or personal data on a test page.
- **Compensation and any institutional ethics review** are the researcher's responsibility and depend on where the study is run.

## Files

| Path                             | What                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `research/studies/template.json` | Blank study (rejected until filled in)                     |
| `research/studies/<id>.json`     | One study: protocol, criteria, sessions                    |
| `src/research/study.ts`          | Closed format check, balanced orders, analysis and verdict |
| `npm run study`                  | Validate and analyse; `--assign N [seed]` for orders       |
| `npm run privacy`                | Includes study files                                       |

## Limits

- One study cannot show that rules work in general. Each site category and profile needs its own.
- Time and steps counted by hand have error; keep the same observer.
- Preference is reported after both versions; order is counterbalanced, but the second version is always fresher in memory.
- The verdict is as strong as the criteria and the sample the researcher registered.
