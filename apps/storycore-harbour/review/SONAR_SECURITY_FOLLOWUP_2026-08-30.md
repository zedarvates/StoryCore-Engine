# Sonar security follow-up — 2026-08-30

## Context

Draft PR #37 previously passed the StoryCore Harbour functional CI while SonarQube Cloud reported a **C Security Rating on New Code** with two annotations. The regression appeared after the Marketplace-logo helper scripts were added.

The two helper surfaces were hardened, but subsequent Sonar Automatic Analysis attempts no longer produced a Quality Gate result and instead reported only `The last analysis has failed`. Therefore there is currently **no evidence that the security rating recovered**. The release/security gate remains open until a completed Sonar analysis reports the required rating.

## Bounded remediation

The two new Marketplace-logo scripts were hardened without broadening App permissions or runtime capabilities.

### Renderer

`./scripts/render-marketplace-logo.mjs`

- no longer accepts CLI-supplied input or output paths;
- derives the App root from `import.meta.url`;
- reads only committed `bundle/icon.svg`;
- writes only `review/marketplace-media/storycore-harbour-logo-256.png`;
- no longer interpolates the SVG data URL into an HTML template;
- assigns the fixed local source as the image `src` property;
- no longer prints local filesystem paths in its result log.

### Validator

`./scripts/validate-marketplace-logo.mjs`

- no longer accepts a CLI-supplied logo path;
- reads only the committed StoryCore Harbour Marketplace PNG;
- checks PNG signature, IHDR, 256 × 256 dimensions, the 2 MB limit, and representative pixels;
- no longer prints the local filesystem path.

### Regression coverage

`tests/marketplace-logo.test.mjs` independently verifies that the committed asset:

- is a PNG;
- begins with IHDR;
- is exactly 256 × 256;
- is non-empty;
- remains below 2 MB.

StoryCore Harbour CI run #135 is green after these changes.

## Current Sonar service evidence

Public Sonar Community reports dated 2026-08-28 and 2026-08-29 describe contemporaneous SonarQube Cloud Automatic Analysis failures with the same broad symptom seen here: GitHub checks are queued or ordinary CI remains green while Automatic Analysis reports `The last analysis has failed` and, in at least one report, no Compute Engine task is created at all.

Relevant public reports:

- `Automatic Analysis silently failing since 2026-08-28 — failing analysis ID provided` (2026-08-29);
- `SonarQube Cloud Automatic Analysis queues GitHub checks but starts no CE task for PR #8` (2026-08-28);
- `New repo, Error: The last analysis has failed` (2026-08-28).

This is **corroborating evidence of a possible upstream service incident**, not proof that StoryCore's current analysis failure has the same root cause. Do not treat it as a waiver of the Harbour security gate.

## Evidence boundary

This report does **not** claim that the two former Sonar annotations were definitively the two Marketplace path flows, because the annotation details were not exposed through the available connector. It records the smallest plausible remediation from the exact code introduced in the same change window.

It also does not claim the Sonar service is definitively at fault. The current state is:

- functional Harbour CI: green;
- previous completed Sonar result: Security Rating C;
- relevant code surfaces: hardened;
- subsequent Sonar Automatic Analysis attempts: analysis failure before a usable Quality Gate result;
- security gate: still open.

Do not mark the security gate resolved from CI success alone.

## Exit condition

A fresh completed SonarQube Cloud analysis for the current PR head must show:

- Quality Gate passed;
- Security Rating on New Code = A;
- zero unresolved new security issues/hotspots relevant to this change.

If Sonar reports another concrete issue, fix only that issue and rerun. Do not suppress, accept, or lower the Quality Gate merely to unblock Harbour.
