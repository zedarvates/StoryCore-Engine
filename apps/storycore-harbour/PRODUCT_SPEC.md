# Product specification — StoryCore Harbour 0.1

## Audience

Primary:

- independent filmmakers;
- comic and webtoon creators;
- video creators;
- writers preparing visual production;
- small creative studios.

Secondary:

- educators;
- agencies;
- game narrative designers;
- creators exploring StoryCore before installing the desktop product.

## Main job to be done

“When I have an idea or short script, help me turn it into a structured visual production plan without losing character, location, or narrative continuity.”

## Four-step experience

### 1. Concept

Inputs:

- optional working title;
- idea, synopsis, or short script;
- format: short film, advertisement, music video, documentary, comic/webtoon, social video;
- duration in minutes;
- language;
- tone/style;
- audience.

Primary action: **Build my visual story**

Validation:

- idea must contain meaningful content;
- duration must be plausible for the selected format;
- required fields are explained inline;
- no generation begins with invalid input.

### 2. World

Show:

- title, logline, synopsis, themes;
- visual direction;
- character cards;
- location cards;
- continuity rules.

The user can inspect the result before moving on. Editing individual fields is planned for 0.2, not required for 0.1.

### 3. Scenes and shots

Show:

- ordered scenes;
- scene purpose, location, characters, and duration;
- shots with framing, camera movement, action, dialogue, sound intent, and reusable prompt.

The layout must remain readable at the manifest's minimum window size.

### 4. Continuity and export

Show:

- continuity score;
- warnings;
- validation status;
- saved timestamp;
- JSON export;
- “Open in StoryCore Desktop” information as a non-blocking future pathway.

## Meaningful completion event

A core run is considered product-complete only after:

1. the user submitted valid input;
2. Anna's LLM returned a result;
3. the result parsed as JSON;
4. the project contract validation passed;
5. the continuity report exists;
6. the validated project was saved;
7. the result view was rendered.

Do not count button clicks, opened windows, failed generations, or mock fixture runs as product completions.

## Error experience

Supported user-facing states:

- runtime unavailable;
- LLM permission unavailable;
- quota exceeded;
- provider failure;
- timeout;
- malformed JSON;
- contract failure;
- repair attempt failure;
- storage unavailable;
- project export failure.

Every state must explain what happened and offer one safe next action.

## Accessibility

- semantic form labels;
- visible keyboard focus;
- no information conveyed by color alone;
- status updates announced with `aria-live`;
- reasonable contrast;
- motion minimized when the OS requests reduced motion.

## Privacy

- scripts and generated projects remain in the user's Anna App storage;
- no full creative content in analytics;
- no third-party trackers in 0.1;
- no external origins in the UI bundle;
- export is initiated by the user.
