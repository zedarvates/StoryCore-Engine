# Anna Marketplace media requirements request

Prepared on 2026-08-29. This is a support-message draft, not a submission or
authorization to upload files.

## Verified context

- Anna's public App Manifest documentation says listing metadata, logos, and
  screenshots are managed in the Developer Console Listing tab.
- The authenticated Listing inspected on 2026-08-29 accepts PNG/JPG/WebP/GIF
  logos up to 2MB and states that they are cropped to 256 x 256.
- Screenshots are entered as one URL per line. The Listing exposes no visible
  screenshot count, dimension, aspect-ratio, format, or byte limit, and the
  textarea has no corresponding HTML constraint attributes.
- StoryCore Harbour currently has four deterministic fictional PNG drafts at
  900 x 820. Their largest file is 105,664 bytes.
- The draft is App id 214, slug `storycore-harbour`, working revision 11, with
  zero immutable versions and no public release.

Official pages checked:

- <https://anna.partners/developers/apps/app-manifest>
- <https://anna.partners/developers/reference/ui-manifest>

## Ready-to-send support message

```text
Hi Anna team — we are preparing the first review package for StoryCore Harbour
(@storycore-labs/storycore-harbour), a Schema 2 Host-API-only App with no
Executa.

Could you confirm the current Marketplace media requirements shown to reviewers
and developers?

1. required screenshot count and accepted formats;
2. exact pixel dimensions or aspect-ratio range;
3. maximum bytes per screenshot and whether Anna fetches each URL at review or
   requires a long-lived public asset URL;
4. any screenshot safe-area, rounded-corner, text-overlay, localization, or dark/light
   theme requirements;
5. whether screenshots from the local Anna harness are acceptable when they
   contain only fictional data and accurately represent the submitted bundle.

The Listing already confirms that logos may be PNG/JPG/WebP/GIF up to 2MB and
are cropped to 256 x 256. Our prepared PNG logo is 256 x 256 and 5,302 bytes.

Our current screenshot drafts are four PNG files at 900 x 820, each below 106 KB. They show
Concept, World/production bible, Scenes/shots, and Continuity/export. They do not
show account identifiers, hidden acceptance controls, provider metadata, or
real user content.

We will not treat these drafts as final until the current requirements are
confirmed. Thank you.
```

## Owner action

The authenticated Listing constraints above have been inspected. The owner may
send the remaining screenshot question through Anna's official support channel. Do not
upload assets, submit a review, accept terms, or make a public post without the
owner's explicit approval at the time of the action.
