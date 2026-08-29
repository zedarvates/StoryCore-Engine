# StoryCore Harbour — launch checklist

This checklist is a release gate. A checked implementation item does not override an unchecked legal, production-platform, or reliability blocker.

## Product identity

- [x] Working name selected: StoryCore Harbour.
- [ ] Anna confirms `storycore-harbour` slug availability.
- [ ] Anna confirms `storycore-labs` developer-handle availability.
- [ ] Brand/name clearance completed for intended markets.
- [ ] Publisher legal name and support contact confirmed.
- [ ] Version fixed at immutable `0.1.0` for review.

## Core product

- [x] Concept/script form supports all six declared formats.
- [x] English and French output are supported by the generation contract.
- [x] Production bible, characters, locations, scenes, shots, prompts, and continuity report are required.
- [x] Supplied input fields are preserved.
- [x] One bounded repair attempt only.
- [x] Invalid projects cannot render or save.
- [x] Save is read back and revalidated.
- [x] JSON export is versioned and filename-sanitized.
- [ ] Real Anna model corpus reaches at least 18/20.
- [ ] Median successful real-model completion is at most 180 seconds.

## Anna integration

- [x] Schema 2 manifest passes strict CLI validation.
- [x] No Executa or custom backend is required for the core workflow.
- [x] Manifest declares only LLM, App storage, and window-title Host APIs.
- [x] Undeclared tool invocation is denied in the official test harness.
- [x] Mock Anna harness starts in CI.
- [x] Browser flow runs inside the Anna harness at 520 × 680.
- [ ] Production Host API handshake verified in the target Anna account.
- [ ] Production App storage write/read/reload verified.
- [ ] Production ETag conflict induced and safely rejected.
- [ ] Qualified App MAU definition and dashboard visibility confirmed.
- [ ] Host-API-only completion confirmed as eligible without local runtime installation.
- [ ] Owner-approved working-draft **Install & test** completes from revision 12 without cutting a version.
- [ ] Installed Apps exposes only the expected LLM, App storage, and window capabilities with no Executa.

## Reliability and CI

- [x] Node.js 22 pinned in CI.
- [x] Anna CLI version pinned.
- [x] JavaScript syntax checks pass.
- [x] Contract/evaluator/Host API tests pass.
- [x] Sample export validates.
- [x] Mock response validates.
- [x] Acceptance corpus and generated bundle remain synchronized.
- [x] Browser test covers validation, generation, save/read-back, navigation, continuity, export, focus, and minimum width.
- [ ] Real acceptance JSONL evaluated locally and archived privately.
- [ ] Every reliability fix followed by a complete corpus rerun.

## Accessibility and usability

- [x] Semantic labels for form controls.
- [x] Required fields identified in text.
- [x] Form error is an assertive announcement and receives focus.
- [x] Steps expose tab/tablist/tabpanel semantics.
- [x] Arrow keys, Home, and End navigate enabled steps.
- [x] Active panel heading receives focus.
- [x] Loading, save, runtime, and fatal states are announced.
- [x] Reduced-motion preference is honored.
- [x] Minimum-size browser flow has no horizontal overflow.
- [ ] Manual screen-reader check completed.
- [ ] Manual high-zoom and high-contrast check completed.
- [ ] 10–20 external beta sessions completed.

## Security and privacy

- [x] No external tracker or App CSP origin.
- [x] No provider key or secret input.
- [x] No generated HTML execution.
- [x] Input and output lengths bounded.
- [x] Content is not written to CI logs.
- [x] Real acceptance result files ignored by Git.
- [x] Privacy/data-handling draft prepared.
- [ ] Current Anna Developer Terms reviewed and accepted by owner.
- [ ] Anna privacy/model-provider retention disclosures reviewed.
- [ ] User-facing App storage deletion path confirmed.
- [ ] Delete-all control added if Anna's native controls are insufficient.
- [ ] Publisher privacy contact and effective date finalized.

## Commercial and program terms

- [ ] Written revenue-share policy obtained.
- [ ] “70% of eligible usage profit” calculation and deductions understood.
- [ ] Payment threshold, cadence, currency, KYC, and tax documentation understood.
- [ ] No exclusivity, IP transfer, or unacceptable distribution restriction.
- [ ] App withdrawal and data-removal rights confirmed.
- [ ] Founding Builder qualification window and current rules rechecked before launch.
- [ ] September launch/Marketplace support confirmed in writing.

## Marketplace package

- [x] Tagline, short description, long description, keywords, limits, and prohibited claims drafted.
- [x] Reviewer guide drafted.
- [x] Privacy/data-handling draft prepared.
- [x] External beta protocol prepared.
- [x] App icon exists.
- [ ] Four final screenshots captured with fictional content.
- [ ] Screenshot dimensions and file limits confirmed with Anna.
- [ ] Short end-to-end demonstration recorded.
- [ ] Final support link and issue template confirmed.
- [ ] Reviewer test account/path confirmed if required.

## Final release decision

- [ ] All P0/P1 defects closed.
- [ ] Real model gate passes.
- [ ] Production storage gate passes.
- [ ] External beta exit gate passes.
- [ ] Legal/commercial terms reviewed by owner.
- [ ] Marketplace assets complete.
- [ ] PR changed from draft to ready only after all blockers above are resolved.
- [ ] Merge explicitly approved by owner.
