# Five-minute StoryCore Harbour demo

This deterministic local demo proves the MVP path without consuming Anna model quota:

`concept -> production bible -> characters and locations -> scenes -> shots -> validated JSON export`

The committed input is `concept.json`. The Anna mock fixture is visibly test-only and returns one character, one location, one scene, and one shot so the complete interaction remains easy to inspect during a short review.

## Prerequisites

- Node.js 22 or newer;
- Microsoft Edge or Google Chrome;
- PowerShell;
- no Anna login, GPU, backend, provider key, or external network call is required after dependencies are installed.

## Exact Windows procedure

From `apps/storycore-harbour/`, run:

```powershell
npm install
npm run check
npm run dev:mock -- --port 5180 --no-watch
```

Keep that terminal open. In a second PowerShell terminal, from the same directory, run:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:HARBOUR_URL = 'http://127.0.0.1:5180/'
$env:HARBOUR_SCREENSHOT_DIR = (Resolve-Path '.').Path + '\demo\output.local\current'
npm run browser:check
```

Expected final line:

```text
{"result":"pass",...,"forcedColors":"pass",...,"exportContract":"valid",...,"screenshotsCaptured":4,...}
{"result":"pass","deletedProjectRecords":2,...,"unrelatedKeyPreserved":true,...}
```

Stop the mock harness with `Ctrl+C` after the browser command finishes.

## Produced evidence

The browser run writes these local, ignored artifacts to the selected
`HARBOUR_SCREENSHOT_DIR`:

- `01-concept.png`;
- `02-world.png`;
- `03-scenes.png`;
- `04-continuity.png`;
- `browser-smoke-story.storycore-harbour.json`.

Each PNG is captured at 900 x 820. The browser test resets the App scroll before
every capture and validates the actual export blob against
`storycore-harbour.project.v1` before writing it. It also proves form
validation, save/read-back, keyboard step navigation, focus management,
forced-colour states, the declared 520 x 680 minimum viewport, 400% text
reflow, and safe project deletion. Hashes may vary with the Edge build and font
renderer; use them as one-run evidence, not portable golden-image assertions.

## Presenter script

1. Show the pre-filled concept and click **Build my visual story**.
2. In **World**, point out the production bible, visual direction, character, location, and continuity rules.
3. Open **Scenes** and show the ordered scene and reusable shot prompt.
4. Open **Continuity**, show the score and warnings, then click **Export JSON**.
5. Open the exported JSON and point to `schemaVersion`, `characters`, `locations`, `scenes[].shots`, and `continuity`.

This demo is deterministic proof of the product flow, not proof of real Anna model quality or production Anna storage. Those remain authenticated gates.
