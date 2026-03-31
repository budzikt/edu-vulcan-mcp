#!/usr/bin/env python3
"""
Initialize a new marketplace.json file with proper structure.

Usage:
    python3 skills/marketplace-creator/scripts/init_marketplace.py [path]

Args:
    path: Optional path where marketplace.json should be created (default: .claude-plugin/marketplace.json)
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


def create_marketplace_template(name, owner_name, owner_email, description):
    """Create a marketplace.json template with the provided information."""
    return {
        "name": name,
        "owner": {
            "name": owner_name,
            "email": owner_email
        },
        "description": description,
        "plugins": []
    }


def main():
    """Main entry point for marketplace initialization."""
    # Determine output path
    if len(sys.argv) > 1:
        output_path = Path(sys.argv[1])
    else:
        output_path = Path(".claude-plugin/marketplace.json")

    print("=" * 60)
    print("Marketplace Initialization")
    print("=" * 60)
    print()
    print("This script will create a new marketplace.json file.")
    print("Press Ctrl+C at any time to cancel.")
    print()

    try:
        # Check if file already exists
        if output_path.exists():
            overwrite = get_input(
                f"File {output_path} already exists. Overwrite? (yes/no)",
                default="no"
            ).lower()
            if overwrite != "yes":
                print("Cancelled.")
                return 1

        # Gather marketplace information
        name = get_input("Marketplace name (lowercase-with-hyphens)")
        while not name:
            print("  Error: Marketplace name is required")
            name = get_input("Marketplace name (lowercase-with-hyphens)")

        owner_name = get_input("Owner name")
        while not owner_name:
            print("  Error: Owner name is required")
            owner_name = get_input("Owner name")

        owner_email = get_input("Owner email")
        while not owner_email or "@" not in owner_email:
            print("  Error: Valid email is required")
            owner_email = get_input("Owner email")

        description = get_input("Marketplace description (1-2 sentences)")
        while not description:
            print("  Error: Description is required")
            description = get_input("Marketplace description (1-2 sentences)")

        # Create marketplace template
        marketplace = create_marketplace_template(
            name=name,
            owner_name=owner_name,
            owner_email=owner_email,
            description=description
        )

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write marketplace.json
        with open(output_path, 'w') as f:
            json.dump(marketplace, f, indent=2)
            f.write('\n')  # Add trailing newline

        print()
        print("=" * 60)
        print(f"✓ Created: {output_path}")
        print("=" * 60)
        print()
        print("Next steps:")
        print(f"  1. Add plugins: python3 skills/marketplace-creator/scripts/add_plugin_to_marketplace.py {output_path}")
        print(f"  2. Validate: python3 skills/marketplace-creator/scripts/validate_marketplace.py {output_path.parent}")
        print()

        return 0

    except KeyboardInterrupt:
        print("\n\nCancelled.")
        return 1
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
