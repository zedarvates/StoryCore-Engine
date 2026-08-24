# Mission — StoryCore Harbour

**Owner decision required to change this file. Coding agents must not broaden or rewrite the mission.**

## Mission statement

Build a reliable Anna App that converts a user's creative idea or short script into a coherent, saved, production-ready visual story package in one meaningful run.

## Core input

The minimum input is:

- concept, synopsis, or short script;
- content format;
- approximate duration;
- language;
- tone/style;
- intended audience.

## Core output

A successful run produces:

1. project identity and logline;
2. production bible;
3. visual direction and continuity rules;
4. characters with goals, conflicts, and stable visual identities;
5. locations with stable visual identities;
6. scene breakdown;
7. shot list with framing, camera intent, action, dialogue, and reusable generation prompt;
8. continuity score and explicit warnings;
9. a saved project;
10. downloadable JSON export.

## User promise

**“Turn your idea into a production-ready visual story, with characters, locations, scenes, shots, and continuity kept coherent.”**

## Success definition for the MVP

- The core workflow runs without local software, a GPU, or user-supplied API keys.
- At least 90% of the fixed acceptance prompts complete with a valid project.
- Median successful completion remains below three minutes in realistic Anna testing.
- A project survives reload through Anna storage.
- Exported JSON passes the local contract validator.
- A first-time user can finish without reading technical documentation.
- Ten to twenty external beta users complete the core flow before marketplace submission.
- The September operating target is 250 qualified completed users, not merely 200 opens.

## Non-goals for version 0.1

- final video rendering;
- full image generation;
- voice, music, or sound effects;
- timeline editing;
- Blender or 3D scene generation;
- ComfyUI installation or remote execution;
- local model orchestration;
- full StoryCore Desktop feature parity;
- team collaboration;
- subscriptions or payments inside the App;
- an Executa or custom cloud backend unless Anna's Host API proves insufficient.

## Strategic role

StoryCore Harbour is an acquisition and validation channel. StoryCore Desktop remains the private, local-first production environment for advanced rendering and editing.

## Stop conditions

Pause implementation and record the reason if any of these becomes true:

- users must install a local runtime for the core run;
- the developer must pay inference or GPU costs per user;
- Anna requires exclusivity or transfer of StoryCore intellectual property;
- a reliable core run cannot reach 90% success within the fixed ten-development-day budget;
- the App cannot expose trustworthy completion/usage metrics;
- the integration requires a permanent fork of StoryCore core.
