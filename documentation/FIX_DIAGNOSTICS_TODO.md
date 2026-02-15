# FIX_DIAGNOSTICS_TODO.md

## Task: Fix TypeScript and SonarLint Errors

### Files to Fix:
1. `llmConfigService.ts` - 6 errors
2. `llmService.ts` - 16 errors
3. `localModelService.ts` - 4 errors
4. `wizard/OllamaClient.ts` - 8 errors

---

## TODO List

### Phase 1: llmConfigService.ts

- [ ] 1.1 Fix line 79 - Add missing properties (systemPrompts, timeout, retryAttempts) to LLMConfig
- [ ] 1.2 Fix line 94 - Add null check for getConfig()
- [ ] 1.3 Fix line 28 - Mark listeners as readonly
- [ ] 1.4 Fix line 60 - Fix negated condition
- [ ] 1.5 Fix line 70 - Fix empty block statement
- [ ] 1.6 Fix line 136 - Fix negated condition

### Phase 2: llmService.ts

- [ ] 2.1 Fix line 1258 - Fix ApiResponse type assignment
- [ ] 2.2 Fix line 1264 - Add generateImage to LLMProviderBase interface
- [ ] 2.3 Fix line 281 - Remove zero fraction (1.0 -> 1)
- [ ] 2.4 Fix line 437 - Reduce cognitive complexity
- [ ] 2.5 Fix line 472 - Handle exception properly
- [ ] 2.6 Fix line 534 - Replace deprecated substr with substring
- [ ] 2.7 Fix line 638 - Reduce cognitive complexity
- [ ] 2.8 Fix line 672 - Remove redundant assignment
- [ ] 2.9 Fix line 674 - Handle exception properly
- [ ] 2.10 Fix line 879 - Remove redundant assignment
- [ ] 2.11 Fix line 881 - Handle exception properly
- [ ] 2.12 Fix line 895 - Reduce cognitive complexity
- [ ] 2.13 Fix line 930 - Handle exception properly
- [ ] 2.14 Fix line 964 - Mark abortControllers as readonly
- [ ] 2.15 Fix line 1114 - Replace deprecated substr with substring
- [ ] 2.16 Fix line 1349 - Use optional chain

### Phase 3: localModelService.ts

- [ ] 3.1 Fix line 381 - Fix 'm' type from unknown
- [ ] 3.2 Fix line 154 - Remove zero fraction
- [ ] 3.3 Fix line 345 - Mark endpoint as readonly
- [ ] 3.4 Fix line 399 - Reduce cognitive complexity (51 > 15)

### Phase 4: wizard/OllamaClient.ts

- [ ] 4.1 Fix line 618 - Fix OllamaGenerationOptions type issue
- [ ] 4.2 Fix line 47 - Mark logger as readonly
- [ ] 4.3 Fix line 279 - Handle exception properly
- [ ] 4.4 Fix line 554 - Use RegExp.exec() instead of match
- [ ] 4.5 Fix line 564 - Use RegExp.exec() instead of match
- [ ] 4.6 Fix line 645 - Use optional chain
- [ ] 4.7 Fix line 675 - Use nullish coalescing operator
- [ ] 4.8 Fix line 716 - Use optional chain

---

## Fix Progress

- [ ] Phase 1 Complete
- [ ] Phase 2 Complete
- [ ] Phase 3 Complete
- [ ] Phase 4 Complete

