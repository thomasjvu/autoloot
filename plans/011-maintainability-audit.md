# Maintainability audit — October 27, 2026

Audited commit: 5a5190b. Read-only runtime-source review; no implementation changes. Scope: current server composition, HTTP policy/routes/DTO/body/SSE seams, frontend page/controller/connection boundaries, CSS ownership and verification, critical-state/test coverage, CI/dependency posture and architecture/onboarding docs. Hotspot-weighted review; not an exhaustive provider/apps/marketing/Python/model-quality audit. No browser automation or real provider calls.

## Verdict

Architecture is maintainable enough for continued scoped development. Do not start another broad rewrite. Two reproduced P2 correctness issues should be repaired before declaring this pass fully green; both have small, low-risk fixes. Production readiness remains a separate live-provider and rendered-browser gate.

## Vetted findings

### P2 — Decode JSON request bytes once

- Evidence: lib/http/response.mjs:14–22 appends each Buffer to a JavaScript string independently. A multibyte character split across chunks decodes as replacement characters.
- Reproduction: an in-memory Readable containing a JSON title with an accented character split inside its UTF-8 sequence returns a different title. No files, accounts or providers involved.
- Impact: valid product names, seller text and other JSON fields can be silently corrupted by network chunk boundaries.
- Fix sketch: retain the existing byte limit, concatenate buffers and decode once (or use StringDecoder) before parsing. Keep raw signed webhook bytes separate and unchanged.
- Coverage gap: tests/http-boundaries.test.mjs tests raw Unicode bytes but JSON decoding only with ASCII.
- Effort S; fix risk LOW; confidence HIGH. Add split-boundary tests for accented characters/emoji and retain size/malformed JSON checks.

### P2 — Validate companion settings before any mutation

- Evidence: lib/http/companion-actions.mjs:74–82 mutates boolean settings at77–78 before checking that practice provider selection is permitted at79.
- Reproduction: direct route invocation with a live-mode state and incompatible provider/boolean settings rejects while leaving the boolean changed. No commit occurs, so memory and last-committed state diverge; a later successful save can persist the rejected change.
- Impact: rejected admin actions can still alter settings, making rollback/error semantics unreliable.
- Fix sketch: validate all preconditions, construct a settings patch, then apply and commit. Test deep state equality and zero saves/broadcasts after rejection, plus successful live/practice paths.
- Effort S; fix risk LOW; confidence HIGH. No authentication/payment bypass was demonstrated; this is an administrator correctness defect.

### P3 — Make lexical binding validation repeatable in CI

- Evidence: scripts/check/app.mjs:11 checks syntax;14–20 uses regex to check local module paths. This does not detect unresolved variables, temporal-dead-zone shadowing, or missing named exports. .forgejo/workflows/check.yml runs this check plus the Node/demo suites.
- Impact: extraction mistakes can survive syntax validation if their runtime branch lacks coverage. This refactor already required manual lexical review and a clock-shadowing correction.
- Fix sketch: add a small maintained lint/binding check (or checked-in equivalent) with browser/Node environments and tests; use AST-based import analysis if expanding graph enforcement. Keep runtime branch regression tests as well.
- Effort S/M; fix risk LOW; confidence HIGH. Current syntax/import/cycle tests remain useful; this finding concerns their verification scope, not a current unresolved binding claim.

## Checks and positive findings

- npm run check: passes across79 runtime modules, local import/cycle and buyer/overlay/style boundaries.
- npm test:198/198 pass.
- npm run demo:check: auction purchase, direct purchase and public privacy fixtures pass.
- npm audit --omit=dev: zero reported advisories.
- Forgejo CI runs npm ci, check, tests and demo checks.
- Explicit common request policy and small route factories make authorization ordering reviewable; role projections and SSE session/backpressure tests are present.
- Workspace views/controllers and live-state accessors have meaningful import/render/race regressions. The former commerce source-eval test now imports real presenters.
- CSS import ownership and a migration cascade fingerprint guard accidental reorder. This does not prove rendered visual correctness or eliminate every historical refinement.
- Domain Engine/Payments/Shipping boundaries and atomic storage remain explicit; no framework or database rewrite is warranted solely for file size.

## Considered, not blockers

- Engine725 lines / app637 lines: still sizeable, but cohesive enough with current extracted seams; extract further when a concrete change needs it, not for a line-count target.
- Full snapshot persistence/projection grows with retained orders/history (lib/persistence/storage.mjs:123–132, lib/http/projections.mjs:43–46). Track volume and latency before changing the local single-streamer persistence model; not a proven current performance failure.
- Separate ignored documentation checkout is explicitly documented in README; packaging docs is a release/distribution task, not hidden refactor breakage.
- CSS source fingerprint requires deliberate updates for future design changes; rendered regression coverage should supplement it when browser testing is available.

Recommended order: repair the two small correctness findings with focused tests, then add the repeatable lexical gate. No implementation plans or source fixes created in this audit; findings await selection. No commit/push.

## Follow-through — user approved all findings

Implemented both P2 fixes and the P3 repeatable binding gate. JSON bodies reuse bounded raw-byte collection and decode once; raw signed webhook bytes remain unchanged. Companion settings validate before applying one patch. `npm run check` now uses development-only Acorn/eslint-scope for unresolved bindings and direct initializer shadowing, with Node/browser globals. Existing Forgejo check step runs the gate. Added regressions for every Unicode byte split, request limits/invalid JSON, rejected-state equality, successful provider settings and lint positive/negative cases. Final verification recorded in the plans index. No broad refactor or provider/account/data changes.
