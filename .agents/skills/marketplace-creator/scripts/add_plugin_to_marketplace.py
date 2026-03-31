#!/usr/bin/env python3
"""
Add a plugin entry to an existing marketplace.json file.

Usage:
    python3 skills/marketplace-creator/scripts/add_plugin_to_marketplace.py [marketplace_path]

Args:
    marketplace_path: Optional path to marketplace.json (default: .claude-plugin/marketplace.json)
"""

import json
import os
import sys
from pathlib import Path


def get_input(prompt, default=None):
    """Get user input with optional default value."""
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response if response else default
    return input(f"{prompt}: ").strip()


def get_source_config():
    """Interactively configure the plugin source."""
    print()
    print("Source Type Options:")
    print("  1. GitHub repository (recommended for public plugins)")
    print("  2. Relative path (local development only)")
    print("  3. Git repository URL (GitLab, Bitbucket, etc.)")
    print("  4. Direct URL")
    print()

    source_type = get_input("Select source type (1-4)", default="1")

    if source_type == "1":
        # GitHub repository
        repo = get_input("GitHub repository (owner/repo)")
        while not repo or "/" not in repo:
            print("  Error: Repository must be in 'owner/repo' format")
            repo = get_input("GitHub repository (owner/repo)")

        path = get_input("Path within repository (optional, press enter to skip)")

        if path:
            return {
                "source": "github",
                "repo": repo,
                "path": path
            }
        else:
            return {
                "source": "github",
                "repo": repo
            }

    elif source_type == "2":
        # Relative path
        path = get_input("Relative path to plugin (e.g., ./plugins/my-plugin)")
        while not path:
            print("  Error: Path is required")
            path = get_input("Relative path to plugin")
        return path

    elif source_type == "3":
        # Git URL
        url = get_input("Git repository URL")
        while not url or not url.endswith(".git"):
            print("  Error: URL should end with .git")
            url = get_input("Git repository URL")
        return {
            "source": "url",
            "url": url
        }

    elif source_type == "4":
        # Direct URL
        url = get_input("Direct URL to plugin or marketplace.json")
        while not url or not url.startswith("http"):
            print("  Error: URL must start with http:// or https://")
            url = get_input("Direct URL to plugin or marketplace.json")
        return url

    else:
        print("  Error: Invalid source type")
        return get_source_config()


def create_plugin_entry(name, source, description, version, author_name):
    """Create a plugin entry dictionary."""
    return {
        "name": name,
        "source": source,
        "description": description,
        "version": version,
        "author": {
            "name": author_name
        }
    }


def main():
    """Main entry point for adding plugin to marketplace."""
    # Determine marketplace path
    if len(sys.argv) > 1:
        marketplace_path = Path(sys.argv[1])
    else:
        marketplace_path = Path(".claude-plugin/marketplace.json")

    print("=" * 60)
    print("Add Plugin to Marketplace")
    print("=" * 60)
    print()
    print(f"Marketplace: {marketplace_path}")
    print()
    print("This script will add a new plugin entry to your marketplace.")
    print("Press Ctrl+C at any time to cancel.")
    print()

    try:
        # Load existing marketplace
        if not marketplace_path.exists():
            print(f"Error: Marketplace file not found: {marketplace_path}")
            print()
            print("Create a new marketplace first:")
            print("  python3 skills/marketplace-creator/scripts/init_marketplace.py")
            return 1

        with open(marketplace_path, 'r') as f:
            marketplace = json.load(f)

        if "plugins" not in marketplace:
            print("Error: Invalid marketplace.json - missing 'plugins' array")
            return 1

        # Gather plugin information
        print("Plugin Information:")
        print("-" * 60)
        print()

        name = get_input("Plugin name (lowercase-with-hyphens)")
        while not name:
            print("  Error: Plugin name is required")
            name = get_input("Plugin name")

        # Check if plugin already exists
        existing_names = [p.get("name") for p in marketplace["plugins"]]
        if name in existing_names:
            overwrite = get_input(
                f"Plugin '{name}' already exists. Update it? (yes/no)",
                default="no"
            ).lower()
            if overwrite != "yes":
                print("Cancelled.")
                return 1
            # Remove existing entry
            marketplace["plugins"] = [
                p for p in marketplace["plugins"] if p.get("name") != name
            ]

        source = get_source_config()

        description = get_input("Plugin description (what does it do?)")
        while not description:
            print("  Error: Description is required")
            description = get_input("Plugin description")

        version = get_input("Plugin version (semver format, e.g., 1.0.0)", default="1.0.0")
        while not version or version.count('.') != 2:
            print("  Error: Version must be in semver format (e.g., 1.0.0)")
            version = get_input("Plugin version", default="1.0.0")

        author_name = get_input("Plugin author name")
        while not author_name:
            print("  Error: Author name is required")
            author_name = get_input("Plugin author name")

        # Create and add plugin entry
        plugin_entry = create_plugin_entry(
            name=name,
            source=source,
            description=description,
            version=version,
            author_name=author_name
        )

        marketplace["plugins"].append(plugin_entry)

        # Write updated marketplace
        with open(marketplace_path, 'w') as f:
            json.dump(marketplace, f, indent=2)
            f.write('\n')  # Add trailing newline

        print()
        print("=" * 60)
        print(f"✓ Added plugin '{name}' to marketplace")
        print("=" * 60)
        print()
        print(f"Total plugins in marketplace: {len(marketplace['plugins'])}")
        print()
        print("Next steps:")
        print(f"  1. Validate: python3 skills/marketplace-creator/scripts/validate_marketplace.py {marketplace_path.parent}")
        print(f"  2. Add another plugin: python3 skills/marketplace-creator/scripts/add_plugin_to_marketplace.py {marketplace_path}")
        print()

        return 0

    except KeyboardInterrupt:
        print("\n\nCancelled.")
        return 1
    except json.JSONDecodeError as e:
        print(f"\nError: Invalid JSON in {marketplace_path}: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
