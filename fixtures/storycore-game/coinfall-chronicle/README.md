# Coinfall Chronicle

Coinfall Chronicle is an original, dependency-free vertical slice for the
public StoryCore-to-game contract. It turns a localized world, actor, item,
quest, reward, and deterministic gameplay seed into a small Godot 4.2 project.
The artwork is made from procedural shapes; no third-party game or asset is
copied.

## What this proves

- A StoryCore game specification can fail closed on unknown fields, broken
  references, incomplete localization, and private-component leakage.
- The same normalized input produces the same SHA-256-addressed manifest.
- A Godot consumer can verify the embedded hash before loading any gameplay.
- The fixture works without an account, network service, model, or proprietary
  backend.

It does **not** contain or describe the Ultimate Odycer commercial server,
internal agents/reasoners, private algorithms, credentials, or provider
adapters. A production server may implement the public `external-contract`
authority boundary without becoming part of this MIT fixture.

## Compile and test

From the repository root:

```bash
python -m src.game_bridge \
  --input fixtures/storycore-game/coinfall-chronicle/storycore_game_spec.json \
  --output-dir fixtures/storycore-game/coinfall-chronicle/godot
python -m unittest discover -s tests/game_bridge -v
```

The compiler writes `storycore_game_manifest.json` plus a reproducible evidence
record. The test suite also detects when the checked-in Godot inputs drift from
the compiler output. For path safety, CLI input and output must resolve inside
the current workspace; symlink and `..` escapes are rejected.

## Play

Open `godot/project.godot` with Godot 4.2 or newer and run the main scene.

- Click or press Space to drop a rune.
- Press L to switch between English and French.
- Recover at least five runes and reach 100 points within twelve drops.
- Press R to restart.

The automated quest smoke can be reproduced with a trusted Godot binary:

```bash
godot --headless \
  --path fixtures/storycore-game/coinfall-chronicle/godot \
  --script res://SmokeTest.gd
```

Success prints `STORYCORE_GAME_SMOKE_PASS`. The recorded acceptance run used
the official Linux x86-64 Godot 4.7.2 binary (`ed1daf0bf`) after verifying its
published SHA-256. Because Godot may still exit with status zero after a script
parse error, automation must also reject `SCRIPT ERROR` and `ERROR:` in its log.

## Acceptance gate

| Check | Local status | Promotion requirement |
|---|---|---|
| Strict contract and negative cases | Automated | All unit tests pass |
| Deterministic manifest and evidence | Automated | Checked-in outputs match |
| Manifest tamper detection | Automated | Modified content is rejected |
| Godot import and script parse | Passed on 4.7.2 | Repeat on an isolated trusted runner |
| Full quest play-through | Automated smoke passed | `STORYCORE_GAME_SMOKE_PASS` is present |
| Private/public boundary | Automated + review | No private component or secret is present |

The fixture remains experimental until the Quality Gate and human boundary
review also pass. Never run public fork code on a self-hosted runner carrying
personal, signing, deployment, or production credentials.
