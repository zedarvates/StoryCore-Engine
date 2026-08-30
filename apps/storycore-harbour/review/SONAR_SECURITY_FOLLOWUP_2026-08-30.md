# Sonar security follow-up — 2026-08-30

## Result

The StoryCore Harbour security gate is restored.

After the Marketplace-logo helper hardening, SonarQube Cloud completed a fresh analysis on PR #37 and reported:

- **Quality Gate passed**;
- **0 New issues**;
- **0 Accepted issues**;
- **0 Security Hotspots**.

This supersedes the earlier C Security Rating result and the intervening Automatic Analysis failures. No issue was suppressed or accepted and the Quality Gate was not lowered.

## Context

Draft PR #37 had previously passed the StoryCore Harbour functional CI while SonarQube Cloud reported a **C Security Rating on New Code** with two annotations. The regression appeared after the Marketplace-logo helper scripts were added.

The two helper surfaces were then hardened. Several intervening Sonar Automatic Analysis attempts reported only `The last analysis has failed`; those attempts were treated as inconclusive rather than as evidence of recovery.

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

StoryCore Harbour CI run #136 is green after the final evidence update.

## Sonar service evidence during diagnosis

Public Sonar Community reports dated 2026-08-28 and 2026-08-29 described contemporaneous SonarQube Cloud Automatic Analysis failures with the same broad symptom seen during the intervening attempts: ordinary CI remained green while Automatic Analysis reported `The last analysis has failed`, and one report described no Compute Engine task being created.

Relevant public reports included:

- `Automatic Analysis silently failing since 2026-08-28 — failing analysis ID provided` (2026-08-29);
- `SonarQube Cloud Automatic Analysis queues GitHub checks but starts no CE task for PR #8` (2026-08-28);
- `New repo, Error: The last analysis has failed` (2026-08-28).

Those reports remain corroborating evidence that the intervening analysis failures may have involved a service-side problem. They are not needed to justify the final result because a subsequent completed StoryCore analysis now passes.

## Evidence boundary

The available connector did not expose the detailed text of the original two Sonar annotations, so this report does not claim a proven one-to-one mapping between those annotations and the two path flows. The remediation was the smallest security-oriented change to the executable code introduced in the same change window, and the completed post-remediation Sonar analysis now reports a clean Quality Gate.

## Current gate

The Sonar security blocker is closed for the current PR state. It must reopen automatically if a later Harbour change produces a failed or missing required Sonar Quality Gate.

This does **not** close StoryCore Harbour's separate real-model reliability gate. The immutable acceptance target remains at least 18/20 with median successful completion at or below 180 seconds.
