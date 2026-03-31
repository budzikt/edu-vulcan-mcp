# edu-vulcan-mcp

MCP server for the Polish [EduVulcan](https://eduvulcan.pl) student education portal. Gives Claude access to grades, messages, and assignments from your child's school account.

## Tools

| Tool | Description |
|---|---|
| `list_journal_accounts` | List all student accounts (children) available under your login |
| `list_grades` | List grades for the current grading period |
| `list_assignments` | List homework and assessments for a date range |
| `get_assignment_details` | Get full details of a specific assignment |
| `list_mailboxes` | List available message mailboxes |
| `list_messages` | List recent messages from a mailbox |
| `get_message_details` | Get full content of a specific message |
| `get_messages_details_bulk` | Fetch details for multiple messages at once |

## Installation

### Via Claude Code plugin system

```bash
claude plugin install github:budzikt/edu-vulcan-mcp
```

After installation, open your Claude MCP settings and fill in the required credentials (see [Configuration](#configuration) below).

### Via marketplace

```bash
claude plugin install https://raw.githubusercontent.com/budzikt/edu-vulcan-mcp/main/marketplace.json
```

### Manual (local development)

```bash
git clone https://github.com/budzikt/edu-vulcan-mcp.git
cd edu-vulcan-mcp
npm install
cp .env.example .env
# fill in your credentials in .env
npm run mcp
```

## Configuration

The server requires two environment variables. Set them in your Claude MCP server configuration after plugin installation:

| Variable | Description |
|---|---|
| `VULCAN_ALIAS` | Your EduVulcan portal login alias (the short identifier, not the full email) |
| `VULCAN_PASSWORD` | Your EduVulcan portal password |

For local development, copy `.env.example` to `.env` and fill in the values.

> **Note:** Credentials are never stored by the MCP server — they are passed as environment variables at startup and used only to authenticate with the EduVulcan portal.

## Multi-child accounts

If your account has multiple children (students), most tools accept an optional `studentName` parameter to target a specific child. Use `list_journal_accounts` first to see the available names.

## Requirements

- Node.js >= 18
- An active EduVulcan parent/guardian account at [eduvulcan.pl](https://eduvulcan.pl)

## License

ISC
