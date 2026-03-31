# Marketplace Creation Process

This reference provides detailed step-by-step guidance for creating and managing marketplaces.

## Process Overview

Marketplace creation involves these steps:

1. Understand marketplace requirements and scope
2. Initialize marketplace configuration
3. Add plugins to the marketplace
4. Validate marketplace structure
5. Test marketplace installation
6. Distribute marketplace
7. Maintain and update marketplace

Follow these steps in order, adapting to your specific use case.

## Step 1: Understanding Marketplace Requirements

Before creating a marketplace, clearly understand what it should provide and who will use it.

### Key Questions

**Scope:** What plugins? Already built or need creation? How many?

**Audience:** Personal, team, or public? Technical expertise level? All plugins or selective?

**Hosting:** GitHub, GitLab, internal Git, or local? Public or private?

**Organization:** Categories? Multiple marketplaces? Comprehensive + focused subsets?

### Gathering Requirements

Ask users concrete questions:
- "What plugins should this marketplace include?"
- "Will this be for personal use, team distribution, or public sharing?"
- "Where are your plugins hosted currently?"

Conclude when you have: clear plugin list, hosting locations, target audience, organization approach.

## Step 2: Initialize Marketplace Configuration

### Use Initialization Script (Recommended)

```bash
python3 skills/marketplace-creator/scripts/init_marketplace.py
```

Prompts for: marketplace name, owner name/email, description. Creates properly formatted marketplace.json.

### Or Create Manually

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "description": "Brief description of marketplace purpose",
  "plugins": []
}
```

### Where to Create marketplace.json

**Single plugin repo:** `.claude-plugin/marketplace.json` at plugin root

**Multi-plugin monorepo:** `.claude-plugin/marketplace.json` at monorepo root, use relative paths

**Dedicated marketplace repo:** `marketplace.json` at repo root, use GitHub/URL sources

**Multiple marketplaces:** Create separate files (`marketplace-all.json`, `marketplace-dev.json`, etc.)

## Step 3: Add Plugins to Marketplace

### Use Helper Script (Recommended)

```bash
python3 skills/marketplace-creator/scripts/add_plugin_to_marketplace.py
```

Prompts for: plugin name, source type, description, version, author. Adds properly formatted entry.

### Source Format Selection

**GitHub:** Plugin on public GitHub → `{"source": "github", "repo": "user/repo"}`

**Relative path:** Same repository as marketplace (local only) → `"./plugins/plugin-name"`

**Git URL:** GitLab/Bitbucket/self-hosted → `{"source": "url", "url": "https://..."}`

**Marketplace URL:** Aggregate marketplaces → `"https://example.com/marketplace.json"`

### Organization Strategies

**Comprehensive bundle:** All plugins in one marketplace (small collections or users need everything)

**Categorized:** Separate marketplace files per category (large collections, token efficiency)

**Layered:** Both comprehensive AND focused marketplaces (maximum flexibility)

## Step 4: Validate Marketplace Structure

```bash
python3 skills/marketplace-creator/scripts/validate_marketplace.py
```

Checks: JSON syntax, required fields, no placeholders, proper source format, author consistency, semver compliance.

### Common Fixes

GitHub URL as string → Use object: `{"source": "github", "repo": "..."}`

Placeholders → Replace "Your Name", "your.email@example.com" with real values

Inconsistent author → Use object format everywhere: `{"name": "..."}`

Invalid version → Use semver: `"1.0.0"` not `"1.0"` or `"v1.0.0"`

## Step 5: Test Marketplace Installation

```bash
# Install entire marketplace
claude plugin install /path/to/marketplace.json

# Install specific plugin
claude plugin install /path/to/marketplace.json --plugin plugin-name
```

Verify: plugins install successfully, skills/commands/agents work, no errors.

### Troubleshooting

**"Plugin not found":** Verify source path/URL, check repository accessibility

**"Invalid plugin structure":** Validate individual plugin.json

**"Version conflict":** Uninstall old version first

## Step 6: Distribute Marketplace

### Distribution Methods

**GitHub (recommended for public):**
1. Commit marketplace.json to repo
2. Share: `claude plugin install https://github.com/user/repo/marketplace.json`
3. Pros: version control, easy updates, discoverability

**Direct URL:**
1. Upload to web server
2. Share: `claude plugin install https://yourdomain.com/marketplace.json`
3. Pros: full control, custom domain

**Local/team:**
1. Share file or private repo
2. Install: `claude plugin install /shared/drive/marketplace.json`
3. Pros: no public hosting, full access control

### Best Practices

**Document installation:** Create README with installation command, prerequisites, plugin descriptions

**Provide version info:** List marketplace/plugin versions, note recent changes

**Include support:** How to report issues, request features, contact

## Step 7: Maintain and Update Marketplace

### Adding Plugins

Use script or manually add to `plugins` array → validate → test → commit

### Updating Versions

Update `version` field → validate → test → commit with changelog

### Removing Plugins

Remove from array → validate → document → notify users if needed → commit

### Reorganizing

When marketplace grows:
1. Create focused subsets (category-specific marketplaces)
2. Update documentation (explain options, token efficiency)
3. Communicate changes (announce, provide migration guide)

### Versioning Strategies

**Marketplace version field:** Add `"version": "2.0.0"` to marketplace.json

**Git tags:** `git tag v2.0.0 -m "Description"` and `git push --tags`

**Changelog file:** Maintain CHANGELOG.md documenting all changes

## Common Patterns

### Monorepo with Multiple Marketplaces

All plugins in `plugins/` directory, multiple marketplace.json files (all, dev, data). Users choose which to install.

### Distributed Plugins, Centralized Marketplace

Plugins in separate repos, marketplace references via GitHub sources. Update marketplace when plugins release.

### Progressive Rollout

New plugin → test with beta users → gather feedback → fix issues → wider announcement → monitor adoption.

### Multi-Tier Distribution

Stable marketplace (well-tested), beta marketplace (latest versions), all marketplace (everything). Plugins move from beta to stable after testing.
