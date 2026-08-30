# Sonar security follow-up — 2026-08-30

## Context

Draft PR #37 previously passed the StoryCore Harbour functional CI while SonarQube Cloud reported a **C Security Rating on New Code** with two annotations. The regression appeared after the Marketplace-logo helper scripts were added.

A subsequent Sonar attempt reported only `The last analysis has failed`, so that attempt is not evidence that the security rating recovered. The release/security gate remains open until a completed Sonar analysis reports the required rating.

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

The normal Harbour CI remains green after these changes.

## Evidence boundary

This report does **not** claim that the two former Sonar annotations were definitively those two path flows, because the annotation detail was not exposed through the available connector. It records the smallest plausible remediation from the exact code introduced in the same change window.

Do not mark the security gate resolved from CI success alone.

## Exit condition

A fresh completed SonarQube Cloud analysis for the current PR head must show:

- Quality Gate passed;
- Security Rating on New Code = A;
- zero unresolved new security issues/hotspots relevant to this change.

If Sonar reports another concrete issue, fix only that issue and rerun. Do not suppress, accept, or lower the Quality Gate merely to unblock Harbour.
