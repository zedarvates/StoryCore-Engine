# Synchronization Guide: Settings & Wizards

> [!NOTE]
> **Context:** This guide explains how the synchronization issue between the Settings Panel and Wizards was resolved.

## The Problem
Previously, when changing the LLM configuration in the Settings Panel, already open or subsequently opened Wizards would continue to use the **OLD** configuration. There was no real-time synchronization.

**Flow:**
Settings Panel (Change Config) -> ✅ Saved -> Wizards (❌ Use Old Config)

## The Solution
We implemented a real-time subscription model. Wizards now subscribe to configuration changes.

**Flow:**
Settings Panel (Change Config) -> ✅ Saved -> Wizards (✅ Receive Update Event) -> New Config applied immediately.

## How to Test

1.  **Reload** the application (`F5`).
2.  Open **Settings -> LLM Configuration**.
    *   Select a model (e.g., `qwen3-vl:8b`).
    *   Click **Save**.
3.  Open a **Wizard** (e.g., World Building).
    *   Click "Generate World Concept".
    *   ✅ It should work immediately with the new model.

## Console Verification
When providing a configuration change, you should see logs similar to:
```text
[LLMConfigService] Configuration updated
[Event] settings:llm:updated
[useLLMGeneration] LLM service updated
```

When generating, you should see a successful 200 OK request to the configured model.

## Summary of Fix
*   ✅ Wizards subscribe to configuration changes.
*   ✅ Real-time synchronization without page reload.
*   ✅ Seamless user experience when switching models for testing.
