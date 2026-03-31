# Marketplace Structure Reference

Complete documentation for marketplace.json schema, field definitions, and source format options.

## Marketplace.json Schema

### Minimum Required Structure

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Jane Developer",
    "email": "jane@example.com"
  },
  "description": "A curated collection of development tools",
  "plugins": [
    {
      "name": "my-plugin",
      "source": {"source": "github", "repo": "janedeveloper/my-plugin"},
      "description": "Helpful development utilities",
      "version": "1.0.0",
      "author": {"name": "Jane Developer"}
    }
  ]
}
```

## Top-Level Fields

### `name` (required)
- **Type:** String
- **Convention:** lowercase-with-hyphens
- **Example:** `"my-marketplace"`, `"team-plugins"`

### `owner` (required)
- **Type:** Object with `name` and `email` fields
- **Example:** `{"name": "Jane Developer", "email": "jane@example.com"}`

### `description` (required)
- **Type:** String
- **Length:** 1-2 sentences
- **Example:** `"Development tools for daily workflows"`

### `plugins` (required)
- **Type:** Array of plugin objects
- **Can be empty:** Yes

## Plugin Entry Fields

### `name` (required)
Plugin identifier. Should match plugin's actual name in plugin.json.

### `source` (required)
Where to find/install the plugin. See source formats below.

### `description` (required)
What the plugin does. Include key features and use cases.

### `version` (required)
Semantic versioning (major.minor.patch). Example: `"1.0.0"`, `"2.3.1"`
Invalid: `"1.0"`, `"v1.0.0"`, `"latest"`

### `author` (required)
Object format: `{"name": "Author Name"}` (NOT string format)

## Source Formats

### GitHub Repository (Recommended)

```json
"source": {
  "source": "github",
  "repo": "username/repository-name"
}
```

With subdirectory path:
```json
"source": {
  "source": "github",
  "repo": "username/monorepo",
  "path": "plugins/my-plugin"
}
```

### Relative Path (Local Only)

```json
"source": "./plugins/my-plugin"
```

⚠️ Only works for local installations. Use GitHub for public distribution.

**Important:** Relative paths MUST start with `"./"` or `"../"`.
- ✅ Valid: `"./"`, `"../"`, `"./plugins/foo"`, `"../other"`
- ❌ Invalid: `"."`, `".."` (schema error - add trailing slash)

### Git Repository URL

```json
"source": {
  "source": "url",
  "url": "https://gitlab.com/team/my-plugin.git"
}
```

Use for GitLab, Bitbucket, or self-hosted Git.

### Direct Marketplace URL

```json
"source": "https://example.com/path/to/marketplace.json"
```

Use for aggregating multiple marketplaces.

### npm Package (If Supported)

```json
"source": {
  "source": "npm",
  "package": "@scope/package-name"
}
```

## Validation Rules

### JSON Syntax
Valid JSON format, proper bracket/brace matching, escaped special characters.

### No Placeholders
Invalid placeholders that must be replaced:
- `"Your Name"`, `"Owner Name"`, `"your name"`
- `"your.email@example.com"`, `"email@example.com"`
- `"plugin-name"`, `"my-plugin"` (unless that's the actual name)

### Source Format Rules
- GitHub URLs as strings are INVALID: `"source": "https://github.com/user/repo"`
- Must use object format: `"source": {"source": "github", "repo": "user/repo"}`
- Relative paths must start with `"./"` or `"../"` (NOT `"."` or `".."`)
- Exception: Direct URLs and properly formatted relative paths can be strings

### Author Format Consistency
Always use object format: `"author": {"name": "Name"}`
NOT string format: `"author": "Name"`

### Semantic Versioning
- Valid: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`
- Invalid: `"1.0"`, `"v1.0.0"`, `"latest"`

## Example Marketplaces

### Single Plugin

```json
{
  "name": "my-awesome-plugin",
  "owner": {"name": "Jane", "email": "jane@example.com"},
  "description": "A powerful development tool",
  "plugins": [
    {
      "name": "awesome-tool",
      "source": {"source": "github", "repo": "jane/awesome-tool"},
      "description": "Development utilities for daily tasks",
      "version": "1.0.0",
      "author": {"name": "Jane"}
    }
  ]
}
```

### Multi-Plugin Collection

```json
{
  "name": "dev-tools",
  "owner": {"name": "DevTools Team", "email": "team@dev.com"},
  "description": "Development tools collection",
  "plugins": [
    {
      "name": "data-tools",
      "source": {"source": "github", "repo": "devtools/data-tools"},
      "description": "Data analysis utilities (CSV, JSON, Excel)",
      "version": "2.0.0",
      "author": {"name": "DevTools Team"}
    },
    {
      "name": "code-quality",
      "source": {"source": "github", "repo": "devtools/code-quality"},
      "description": "Linting and formatting automation",
      "version": "1.5.0",
      "author": {"name": "DevTools Team"}
    }
  ]
}
```

### Local Development

```json
{
  "name": "local-dev-plugins",
  "owner": {"name": "Jane", "email": "jane@example.com"},
  "description": "Local development plugins",
  "plugins": [
    {
      "name": "plugin-one",
      "source": "./plugins/plugin-one",
      "description": "First test plugin",
      "version": "0.1.0",
      "author": {"name": "Jane"}
    }
  ]
}
```

### Mixed Sources

```json
{
  "name": "enterprise-tools",
  "owner": {"name": "IT Dept", "email": "it@company.com"},
  "description": "Enterprise development tools",
  "plugins": [
    {
      "name": "internal-tool",
      "source": {"source": "url", "url": "https://git.company.com/tools/internal.git"},
      "description": "Company-specific utilities",
      "version": "1.0.0",
      "author": {"name": "IT Department"}
    },
    {
      "name": "open-source-tool",
      "source": {"source": "github", "repo": "community/popular-plugin"},
      "description": "Popular open source tool",
      "version": "2.3.0",
      "author": {"name": "Community"}
    }
  ]
}
```

## Token-Efficient Organization

Create multiple marketplaces for different use cases:

**Comprehensive Bundle:**
```json
{"name": "all-tools", "plugins": [/* all plugins */]}
```

**Focused Subsets:**
```json
{"name": "analysis-tools", "plugins": [/* analysis plugins only */]}
{"name": "dev-tools", "plugins": [/* dev plugins only */]}
```

Users install only what they need, reducing token usage.

## Version Management

**Lock to specific versions:**
```json
"version": "1.0.0"
```

**Update when plugins release fixes:**
```json
"version": "1.0.1"  // was 1.0.0
```

**Track marketplace version (optional):**
```json
{
  "name": "my-marketplace",
  "version": "2.0.0",  // marketplace version
  "plugins": [/* plugin versions */]
}
```
