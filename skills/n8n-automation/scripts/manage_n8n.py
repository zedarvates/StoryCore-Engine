#!/usr/bin/env python3
import argparse
import sys
import os
import asyncio
import json
import aiohttp

# Add StoryCore root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

try:
    from backend.n8n_service import n8n_service
    from backend.config import settings
except ImportError:
    # If not in the engine environment, use standalone logic
    n8n_service = None

async def list_workflows():
    if not n8n_service:
        print("Error: n8n_service not available in this environment.")
        return
    
    workflows = await n8n_service.list_workflows()
    print(json.dumps(workflows, indent=2))

async def trigger_workflow(webhook_id, payload):
    if not n8n_service:
        print("Error: n8n_service not available.")
        return
    
    result = await n8n_service.trigger_workflow(webhook_id, payload)
    print(json.dumps(result, indent=2))

async def create_workflow(name, nodes_json, connections_json):
    if not n8n_service:
        print("Error: n8n_service not available.")
        return
    
    nodes = json.loads(nodes_json)
    connections = json.loads(connections_json)
    
    result = await n8n_service.create_workflow(name, nodes, connections)
    print(json.dumps(result, indent=2))

async def main():
    parser = argparse.ArgumentParser(description="Manage n8n workflows from CLI/Agent.")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # List
    subparsers.add_parser("list", help="List all workflows")
    
    # Trigger
    trigger_parser = subparsers.add_parser("trigger", help="Trigger a workflow")
    trigger_parser.add_argument("webhook_id", help="The webhook ID to trigger")
    trigger_parser.add_argument("--payload", default="{}", help="JSON payload to send")
    
    # Create
    create_parser = subparsers.add_parser("create", help="Create a workflow")
    create_parser.add_argument("name", help="Workflow name")
    create_parser.add_argument("--nodes", required=True, help="JSON string of nodes")
    create_parser.add_argument("--connections", required=True, help="JSON string of connections")
    
    args = parser.parse_args()
    
    if args.command == "list":
        await list_workflows()
    elif args.command == "trigger":
        await trigger_workflow(args.webhook_id, json.loads(args.payload))
    elif args.command == "create":
        await create_workflow(args.name, args.nodes, args.connections)
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(main())
