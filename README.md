# Tududi MCP Server

Connect Claude to your tududi task manager.

## Quick Start

```bash
# 1. Install
npm install

# 2. Build
npm run build
```

## Setup with Claude Desktop

1. Get an API token from tududi: **Settings** > **API Tokens** > Create new token

2. Add to your Claude config file:

   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tududi": {
      "command": "node",
      "args": ["/path/to/tududi-mcp/dist/index.js"],
      "env": {
        "TUDUDI_URL": "http://localhost:3002",
        "TUDUDI_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

3. Restart Claude Desktop

## What You Can Do

Ask Claude things like:
- "Show my tasks for today"
- "Create a task called 'Review PR'"
- "What's in my inbox?"
- "Complete the documentation task"

## Available Tools

**Tasks**: list_tasks, get_task, create_task, update_task, complete_task, delete_task, add_subtask, get_task_metrics

**Projects**: list_projects, create_project, update_project

**Other**: list_inbox, add_to_inbox, list_areas, list_tags, search

## Environment Variables

| Variable | Default | Required |
|----------|---------|----------|
| `TUDUDI_API_TOKEN` | - | Yes |
| `TUDUDI_URL` | `http://localhost:3002` | No |
