# Anna Developer Console credential-report draft

Prepared on 2026-08-29. This is a private support-report draft; it has not been
sent or posted.

## Summary

The authenticated Anna Developer Console can list StoryCore Harbour and show
its working draft, but the read-only **View manifest** action reports:

```text
Could not validate credentials
```

## Reproduction

1. Sign in to Anna and complete workspace onboarding.
2. Open Developer Console.
3. Open StoryCore Harbour, App id 214.
4. Open **Versions**.
5. Confirm the working draft shows revision r12, bundle `ready`, and content
   hash prefix `ad383957f123…`.
6. Click **View manifest**.
7. Observe `Could not validate credentials`; no manifest modal/content appears.

## Independent evidence

- `anna-app apps status storycore-harbour --json` succeeds with the same owner
  account and reports `draft`, unpublished, zero versions.
- `anna-app apps versions storycore-harbour --json` succeeds and returns an
  empty immutable-version list.
- Working draft revision 12 was uploaded with the pinned Node 22-compatible
  CLI flow and bundle status `ready`.
- Local strict validation, canonical contract, mock fixture, fixed corpus,
  browser flow, and deletion flow pass.
- The Console can read the App list, Listing, working revision, bundle status,
  Settings, and version history in the same browser session.

## Instrumentation result

One instrumented reproduction was performed after enabling browser network
observation. The UI reproduced the same message, but the available event buffer
and console logs exposed no request URL or HTTP status. Do not claim whether
the failure occurs before the request, in an unobserved request, or in response
handling without server/frontend evidence.

## Expected behavior

**View manifest** should display the immutable snapshot of the current working
manifest, or return an actionable authentication/authorization error that
identifies which owner/developer credential must be refreshed.

## Safety and impact

- No manifest, Listing field, App permission, installation, or version was
  changed during reproduction.
- **Install & test**, **Cut version**, **Submit now**, **Discard**, and deletion
  actions were not used.
- This blocks a web-console manifest comparison and reduces confidence in the
  new working-draft install path. It does not prove that the uploaded manifest
  or bundle is invalid.

## Ready-to-send question

```text
Hi Anna team — the authenticated Developer Console lists StoryCore Harbour
(App id 214) and shows working draft r12 with bundle ready, but Versions > View
manifest returns “Could not validate credentials”. The pinned CLI can read the
same App status and versions successfully, and strict local validation passes.

Could you confirm which web credential or endpoint View manifest requires, and
whether refreshing that credential is also required before using the new
working-draft “Install & test” action? We have not clicked Install & test, cut a
version, submitted review, or changed permissions.
```
