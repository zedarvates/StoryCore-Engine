---
name: n8n-automation
description: "Manage n8n workflows and trigger automations. Use when: (1) triggering external webhooks, (2) listing workflows, (3) creating new automation logic in n8n. NOT for: internal StoryCore animations."
metadata:
  openclaw:
    emoji: "🔗"
    os: ["darwin", "linux", "windows"]
---

# n8n Automation Skill

This skill allows the agent to interact with a local n8n instance to manage and trigger workflows.

## Commands

- **List Workflows**: Get a list of all available workflows in the n8n instance.
- **Trigger Workflow**: Send a POST request to a specific webhook ID in n8n.
- **Create Workflow**: Programmatically create a new workflow using n8n node structure.

## Usage Examples

### Listing Workflows
"List my n8n workflows"

### Triggering a Workflow
"Trigger the 'Character Enhancer' workflow with character data 'Hero'"

### Creating a Workflow
"Create a simple n8n workflow named 'Test' that logs a message"

## Resources
- [scripts/manage_n8n.py](file:///c:/storycore-engine/skills/n8n-automation/scripts/manage_n8n.py)
