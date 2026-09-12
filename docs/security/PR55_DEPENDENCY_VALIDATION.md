# PR #55 dependency validation — 2026-09-12

This report records a security dependency correction and its validation limits. It does not authorize or claim a merge.

## Source and scope

- Repository: `zedarvates/StoryCore-Engine`.
- Compared base: `5b6c83bd26f60f7eb5e4da53f958f2d3b06edb4a`.
- Original Dependabot PR head: `0046d9328a8adc48d2a401685786bf2d9f5901c7`.
- Full isolated checkouts were used. Application source, test source and configuration are unchanged.
- Keep sharp **0.35.4** and Joi **18.2.9** from Dependabot, with their original root/config manifests and locks byte-for-byte unchanged.
- Change the UI's `vitest`, `@vitest/ui` and `@vitest/coverage-v8` ranges to **^4.1.11**, locked at **4.1.11**. npm also resolves the associated Vitest modules and transitive dependencies.
- Vitest 5 is deferred. Its partially upgraded graph required incompatible 4.x/5.x peers, and the existing nested mock in `AssetPanel.test.tsx` needs migration before v5.

The [Vitest 4.1.11 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11) includes the redirect-mock allowlist security fix.

## Executed evidence

Environment: **Linux x64, Node.js 24.19.0, npm 11.9.0**. These are local checkout results, not GitHub Actions or homelab results.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund`, root | PASS; 751 packages installed |
| Same installation, `config/` | PASS; 547 packages installed |
| Standard UI resolution, base and candidate: `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | BLOCKED by the same pre-existing ESLint peer conflict |
| UI diagnostic installation, base and candidate: `npm ci --ignore-scripts --no-audit --no-fund --force` | Completed; 760 packages installed in each. Not a passing standard installation |
| npm Arborist virtual-tree peer check | Candidate and base have the same one invalid present peer: React Hooks ESLint plugin versus ESLint. Candidate has no invalid Vitest peer |
| `node addons/content_sensitivity/tests/test_censorship.js` | 11 passed, including real Sharp pixelation of a synthetic image |
| Native image smoke | Actual loaded versions: sharp 0.35.4, libvips 8.18.6, libheif 1.23.2; AVIF decode, resize and PNG encode passed |
| Joi and wait-on smoke, root and config | Joi 18.2.9 loaded; flat `__proto__` message code rejected; custom language input leaves global Object.prototype unchanged; wait-on detects a local HTTP fixture |
| UI `npm test -- --maxWorkers=2 --bail=1` | 108 passed, then one failure; stopped early, so the full suite is not validated |
| Base reproduction with Vitest 4.1.8 | Same failure and same 108 preceding successes in `RelationshipManager.test.ts` |
| Targeted `AssetPanel.test.tsx`, Vitest 4.1.11 | 6/6 passed; the nested mock produces a warning |
| Same AssetPanel tests with V8 coverage | 6/6 passed; coverage provider 4.1.11 works. For AssetPanel.tsx only: 95/174 lines, 54.59%. This is not repository-wide coverage |
| UI `npm run build:check` | BLOCKED at TypeScript; Vite build was not reached |
| TypeScript comparison with matching root/UI installation context | Base and candidate each report 2,147 diagnostic lines. After checkout-path normalization, their diagnostic multisets are identical |

The repeated test failure is `ReferenceError: removeRelationship is not defined` at `creative-studio-ui/src/services/__tests__/RelationshipManager.test.ts:2016`. Its import is named `_removeRelationship`. The source is unchanged in this correction.

For the TypeScript comparison, the base was rebuilt with `node node_modules/typescript/bin/tsc -b --force` after installing its root dependencies. Comparing against a base without root dependencies gives misleading differences due to missing Jest and Ant Design types; that preliminary comparison is not used as evidence.

## Security audit before/after

`npm audit --json --package-lock-only --ignore-scripts` was executed for all three lockfiles in the base and candidate.

| Dependency tree | Base vulnerable package entries | Candidate entries |
| --- | ---: | ---: |
| Root | 2: sharp and Joi | 0 |
| config | 1: Joi | 0 |
| creative-studio-ui | 4: Vitest, mocker, UI and coverage | 0 |

These are package entries per lockfile, not distinct vulnerability counts. Zero means no vulnerability reported by the npm advisory service at the time of this run.

The reports cover:
- [sharp / libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
- [Joi recursive-link RangeError](https://github.com/advisories/GHSA-q7cg-457f-vx79), [custom-message prototype pollution](https://github.com/advisories/GHSA-6w3j-5fw6-r9vr), and [template rename prototype changes](https://github.com/advisories/GHSA-gg4h-3hg2-grpc). Joi 18.2.9 also includes the [additional flat-message-code fix](https://github.com/hapijs/joi/pull/3151).
- [Vitest redirect-mock arbitrary file read](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

The private Dependabot alert #461 details and alert closure state were not verified. Candidate audit results do not imply alerts on the unchanged default branch have closed.

## Remaining boundaries

1. `eslint-plugin-react-hooks@7.0.1` accepts ESLint through 9, but the existing UI pins ESLint 10.9.1. This blocks normal npm resolution in both base and candidate. `--force` was used only for isolated lock generation and diagnostic installs; no persistent npm bypass or CI relaxation is added.
2. The full UI test suite and TypeScript/build gate remain unsuccessful. The reproduced failures do not originate in this correction.
3. Lifecycle scripts were not executed. Electron packaging, Windows and the actual homelab were not tested.
4. The original head had only SonarCloud Code Analysis. The existing Harbour workflow's path filter does not cover this dependency slice. No relevant GitHub Actions success is claimed.

## Tested input fingerprints

SHA-256 values bind the executable checks to the two modified UI dependency files; this report itself does not affect their contents.

| File | SHA-256 |
| --- | --- |
| `creative-studio-ui/package.json` | `c36937b3ef143546973e73970c1c5161f2c1197553ab1b58ad542ab7ad09379a` |
| `creative-studio-ui/package-lock.json` | `32acf5282507fc87b69afac3b6061c307e795ed2fe8080d78586f7dc4bf732a3` |

