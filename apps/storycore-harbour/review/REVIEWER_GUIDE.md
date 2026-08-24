# StoryCore Harbour — reviewer guide

## Review objective

Verify that StoryCore Harbour is an independently useful Anna App whose core function reliably transforms a creative concept or short script into a validated and saved production-planning project.

The reviewer should not need StoryCore Desktop, ComfyUI, Blender, a local GPU, a provider key, an Executa, or a developer-operated backend.

## Preconditions

- Anna account able to open the submitted App;
- one language model enabled for the account;
- permission to use the manifest-declared Host APIs:
  - `llm.complete`;
  - `storage.get`;
  - `storage.set`;
  - `window.set_title`.

The App must not request or invoke undeclared tools.

## Recommended functional review

### 1. Open the App

Expected:

- window title is “StoryCore Harbour”;
- the Concept step is selected;
- World, Scenes, and Continuity remain unavailable until a project succeeds;
- no acceptance/developer controls are visible in the normal App URL;
- no prompt asks for an external API key or local runtime.

### 2. Verify local validation

Enter fewer than twenty characters in the concept field and press **Build my visual story**.

Expected:

- no model run begins;
- an actionable error explains the minimum length;
- keyboard focus moves to the error;
- the Concept form remains available.

### 3. Run the reference project

Use:

- **Working title:** `The Last Ferry`
- **Format:** Short film
- **Duration:** 4 minutes
- **Language:** English
- **Tone:** `Grounded cyberpunk drama with maritime textures and restrained emotion`
- **Audience:** `Young adult science-fiction viewers`
- **Concept:** `At dawn, a courier must cross a flooded neon harbour on the final autonomous ferry to deliver a damaged memory archive before a corporate checkpoint seals the city.`

Press **Build my visual story**.

Expected:

- one primary model request begins;
- if the first response is malformed, at most one repair request occurs;
- the final result must pass validation or fail visibly;
- a successful run opens the World step and preserves the supplied title, language, format, duration, tone, audience, and source idea.

### 4. Inspect World

Expected:

- logline, synopsis, themes, and visual direction;
- at least one character and one location;
- explicit visual identity and continuity rules;
- no claim that final images or video were rendered.

### 5. Inspect Scenes

Use the **Continue to scenes** button or focus the World tab and press the right arrow.

Expected:

- ordered scenes with purpose, location, characters, and duration;
- at least one shot per scene;
- framing, camera intent, action, optional dialogue/sound, and reusable generation prompt;
- every character/location reference resolves to a declared entity.

### 6. Inspect Continuity

Move to the Continuity step.

Expected:

- score between 0 and 100;
- explicit warnings or a clear “no warning” state;
- save status confirms validation and storage read-back;
- keyboard focus follows the active step heading.

### 7. Export

Press **Export JSON**.

Expected:

- filename derived safely from the project title;
- valid JSON using `storycore-harbour.project.v1`;
- no automatic external upload;
- the project remains usable without StoryCore Desktop.

### 8. Reload

Close/reopen the App or return to the Concept step and use **Load latest saved project**.

Expected:

- latest project is read from the default App storage scope;
- the loaded data is validated again before rendering;
- corrupted/invalid data must be rejected rather than rendered.

## Expected error behavior

The UI distinguishes, when reported by Anna or the model path:

- permission unavailable;
- model/provider failure;
- quota exhausted;
- timeout;
- malformed JSON or failed repair;
- contract failure;
- storage unavailable;
- optimistic concurrency conflict;
- no saved project.

Every error must leave a safe next action. The App must not silently replace a failed real project with fixture data.

## Security and privacy checks

- inspect the manifest: no external origins, Executas, or undeclared tools;
- verify generated text is inserted as text, not HTML;
- verify no provider key or secret input exists;
- verify no third-party tracker request occurs;
- verify the privacy notice accurately describes Anna/model-provider processing and the current deletion limitation;
- use only fictional test content.

## Developer-only acceptance mode

The `?acceptance=1` query activates an internal twenty-prompt collector. It is not part of the normal user flow and must not be shown in Marketplace screenshots.

It requires explicit confirmation because it may consume 20 primary model calls, up to 20 repair calls, and create test projects in the active App storage. The collector is for developer reliability testing, not for Marketplace reviewers unless specifically coordinated.

## Offline technical reproduction

From `apps/storycore-harbour/`:

```bash
npm install
npm run check
npm run dev:mock
```

The repository CI additionally runs the App in a system Chromium browser at the declared minimum size of 520 × 680 and verifies:

- form validation and focus;
- complete mock generation;
- storage write/read-back through a deterministic test adapter;
- all four steps;
- keyboard tab navigation;
- no horizontal overflow;
- export filename and project contract.

Production APS behavior is not inferred from the mock adapter; it remains an explicit authenticated review gate.

## Approval blockers

The submission should not be approved as release-ready until:

- the fixed real-model corpus reaches at least 18/20 valid results with median completion at or below 180 seconds;
- production App storage write/read/reload and ETag conflict behavior are verified;
- deletion controls are deemed sufficient;
- applicable Developer Terms and privacy disclosures are accepted;
- slug, developer profile, Qualified App MAU reporting, and review path are confirmed.
