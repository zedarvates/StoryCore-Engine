# Anna working-draft installation permissions report

Prepared on 2026-08-29. This report is local and has not been sent.

## Observed state

- Developer Console: StoryCore Harbour working draft r12, bundle `ready`, no
  immutable version history.
- Installed Apps: StoryCore Harbour is already present as `v0.0.0-dev`.
- Installed Apps > StoryCore Harbour > Permissions reports:

```text
Failed to load permissions: App version not found
```

- CLI status independently reports App id 214, `draft`, unpublished,
  `latest_version: null`, and `version_count: 0`.
- CLI versions independently returns an empty list.
- CLI grants returns `grants: null`, which in the pinned CLI means the grants
  endpoint supplied no data; it does not independently prove grant or denial.

## Interpretation boundary

The verified facts show that a development installation record exists while
the permission-management surface cannot resolve an App version. This explains
why StoryCore appears installed but its expected LLM/storage grants cannot yet
be inspected through Installed Apps.

It is reasonable to suspect a platform working-draft/version-resolution gap,
but the evidence does not prove whether the fix is to refresh **Install &
test**, create an immutable version, or repair the existing dev-install record
server-side. Do not cut `0.1.0`, reinstall, uninstall, or change permissions as
a diagnostic shortcut.

## Safety boundary

- **Install & test** was not clicked again because StoryCore is already listed.
- The permission dialog was read but no control was changed or saved.
- No version was cut, no review was submitted, no App was removed, and no model
  or storage quota was consumed.

## Ready-to-send support question

```text
Hi Anna team — StoryCore Harbour (App id 214) has a ready working draft at r12
and is already listed in Installed Apps as v0.0.0-dev. However, opening its
Permissions panel returns “Failed to load permissions: App version not found”.

The Developer Console and pinned CLI both confirm that the App is a draft with
zero immutable versions. Could you confirm the intended permissions path for a
working-draft Install & test record?

1. Should a v0.0.0-dev installation resolve permissions directly from the
   current working draft?
2. Is Install & test expected to refresh an existing dev-install record?
3. Is an immutable cut required for permission management, despite the
   working-draft Install & test action?
4. If this is a stale dev-install record, can it be repaired server-side
   without recreating the App or losing the reserved slug?

We have not reinstalled, uninstalled, changed grants, cut a version, submitted
review, or published anything.
```
