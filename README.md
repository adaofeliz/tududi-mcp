# Tududi MCP Server

MCP (Model Context Protocol) server that connects Claude to your tududi task management system.

## Setup

### 1. Generate an API Token in Tududi

1. Open tududi in your browser
2. Go to **Settings** > **API Tokens**
3. Create a new token (give it a name like "Claude MCP")
4. Copy the token

### 2. Configure Claude Code

Add this to your Claude Code MCP settings file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tududi": {
      "command": "node",
      "args": ["/path/to/tududi-mcp/dist/index.js"],
      "env": {
        "TUDUDI_URL": "http://localhost:3002",
        "TUDUDI_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### 3. Restart Claude Code

After saving the config, restart Claude Code for the MCP server to load.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (today, upcoming, completed, etc.) |
| `get_task` | Get a specific task by ID |
| `create_task` | Create a new task |
| `update_task` | Update task properties |
| `complete_task` | Toggle task completion |
| `delete_task` | Delete a task |
| `add_subtask` | Add subtask to a task |
| `get_task_metrics` | Get productivity statistics |
| `list_projects` | List all projects |
| `create_project` | Create a new project |
| `update_project` | Update a project |
| `list_inbox` | List inbox items |
| `add_to_inbox` | Quick capture to inbox |
| `list_areas` | List all areas |
| `list_tags` | List all tags |
| `search` | Search across tasks, projects, notes |

## Example Usage

Once configured, you can ask Claude things like:

- "Show me my tasks for today"
- "Create a task called 'Review PR' with high priority"
- "What's in my inbox?"
- "Add 'Call dentist' to my inbox"
- "Complete the task about documentation"
- "Show me tasks in my Work project"
- "What are my productivity metrics?"

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TUDUDI_URL` | `http://localhost:3002` | Your tududi server URL |
| `TUDUDI_API_TOKEN` | (required) | API token from tududi settings |
| `TUDUDI_API_VERSION` | `v1` | API version |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run directly (for testing)
TUDUDI_API_TOKEN=your-token node dist/index.js
```
