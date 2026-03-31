#!/usr/bin/env python3
"""
Marketplace Configuration Validator

Validates Claude Code marketplace.json and plugin.json files for common issues.

Usage:
    python3 validate_marketplace.py [path]

    If no path is provided, validates the current directory.
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any


class ValidationError:
    """Represents a validation error with context and fix suggestion."""

    def __init__(self, severity: str, file: str, field: str, issue: str, fix: str = ""):
        self.severity = severity  # 'error' or 'warning'
        self.file = file
        self.field = field
        self.issue = issue
        self.fix = fix

    def __str__(self):
        icon = "❌" if self.severity == "error" else "⚠️"
        result = f"{icon} {self.severity.upper()}: {self.file}"
        if self.field:
            result += f" -> {self.field}"
        result += f"\n   Issue: {self.issue}"
        if self.fix:
            result += f"\n   Fix: {self.fix}"
        return result


class MarketplaceValidator:
    """Validates marketplace and plugin configuration files."""

    PLACEHOLDER_PATTERNS = [
        r"your[_\s]name",
        r"your[_\s]email",
        r"example\.com",
        r"username",
        r"\[TODO\]",
        r"<.*>",  # HTML-style placeholders
    ]

    def __init__(self, root_path: Path):
        self.root_path = root_path
        self.errors: List[ValidationError] = []
        self.marketplace_data = None
        self.plugin_data = None

    def validate(self) -> bool:
        """Run all validations. Returns True if all pass."""
        print(f"🔍 Validating marketplace configuration in: {self.root_path}")
        print()

        # Check if .claude-plugin directory exists
        plugin_dir = self.root_path / ".claude-plugin"
        if not plugin_dir.exists():
            self.errors.append(ValidationError(
                "error",
                ".claude-plugin/",
                "",
                "Directory does not exist",
                "Create .claude-plugin directory with marketplace.json and/or plugin.json"
            ))
            return self._report_results()

        # Load and validate marketplace.json
        marketplace_file = plugin_dir / "marketplace.json"
        if marketplace_file.exists():
            self.marketplace_data = self._load_json(marketplace_file, "marketplace.json")
            if self.marketplace_data:
                self._validate_marketplace(self.marketplace_data)

        # Load and validate plugin.json
        plugin_file = plugin_dir / "plugin.json"
        if plugin_file.exists():
            self.plugin_data = self._load_json(plugin_file, "plugin.json")
            if self.plugin_data:
                self._validate_plugin(self.plugin_data)

        # Cross-file validations
        if self.marketplace_data and self.plugin_data:
            self._validate_consistency()

        # Check that at least one file exists
        if not marketplace_file.exists() and not plugin_file.exists():
            self.errors.append(ValidationError(
                "error",
                ".claude-plugin/",
                "",
                "No configuration files found",
                "Create marketplace.json and/or plugin.json"
            ))

        return self._report_results()

    def _load_json(self, file_path: Path, file_name: str) -> Dict[str, Any]:
        """Load and parse JSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(ValidationError(
                "error",
                file_name,
                "",
                f"Invalid JSON syntax: {e.msg} at line {e.lineno}, column {e.colno}",
                "Fix JSON syntax errors using a JSON validator or linter"
            ))
            return None
        except Exception as e:
            self.errors.append(ValidationError(
                "error",
                file_name,
                "",
                f"Failed to read file: {str(e)}",
                ""
            ))
            return None

    def _validate_marketplace(self, data: Dict[str, Any]):
        """Validate marketplace.json structure and content."""
        # Required fields
        self._check_required_field(data, "marketplace.json", "name")
        self._check_required_field(data, "marketplace.json", "description")
        self._check_required_field(data, "marketplace.json", "owner")
        self._check_required_field(data, "marketplace.json", "plugins")

        # Validate owner
        if "owner" in data:
            if not isinstance(data["owner"], dict):
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    "owner",
                    "Must be an object with name and email fields",
                    'Use format: {"name": "Your Name", "email": "your@email.com"}'
                ))
            else:
                self._check_required_field(data["owner"], "marketplace.json", "name", parent="owner")
                self._check_required_field(data["owner"], "marketplace.json", "email", parent="owner")

                # Check for placeholders in owner
                if "name" in data["owner"]:
                    self._check_placeholder(data["owner"]["name"], "marketplace.json", "owner.name")
                if "email" in data["owner"]:
                    self._check_placeholder(data["owner"]["email"], "marketplace.json", "owner.email")

        # Validate plugins array
        if "plugins" in data:
            if not isinstance(data["plugins"], list):
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    "plugins",
                    "Must be an array of plugin objects",
                    ""
                ))
            elif len(data["plugins"]) == 0:
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json",
                    "plugins",
                    "Empty plugins array",
                    "Add at least one plugin entry"
                ))
            else:
                for i, plugin in enumerate(data["plugins"]):
                    self._validate_plugin_entry(plugin, i)

        # Check for placeholder in marketplace name and description
        if "name" in data:
            self._check_placeholder(data["name"], "marketplace.json", "name")
        if "description" in data:
            self._check_placeholder(data["description"], "marketplace.json", "description")

    def _validate_plugin_entry(self, plugin: Dict[str, Any], index: int):
        """Validate a single plugin entry in marketplace.json."""
        prefix = f"plugins[{index}]"

        # Required fields
        self._check_required_field(plugin, "marketplace.json", "name", parent=prefix)
        self._check_required_field(plugin, "marketplace.json", "source", parent=prefix)
        self._check_required_field(plugin, "marketplace.json", "description", parent=prefix)
        self._check_required_field(plugin, "marketplace.json", "version", parent=prefix)

        # Validate source field
        if "source" in plugin:
            source = plugin["source"]
            self._validate_source_field(source, prefix)

        # Validate version format
        if "version" in plugin:
            version = plugin["version"]
            if not re.match(r'^\d+\.\d+\.\d+', str(version)):
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json",
                    f"{prefix}.version",
                    f"Version '{version}' doesn't follow semantic versioning",
                    'Use format: "major.minor.patch" (e.g., "1.0.0")'
                ))

        # Validate author field
        if "author" in plugin:
            author = plugin["author"]
            if isinstance(author, str):
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json",
                    f"{prefix}.author",
                    "Author is a string, should be an object for consistency",
                    'Use format: {"name": "Author Name"}'
                ))
            elif isinstance(author, dict):
                if "name" in author:
                    self._check_placeholder(author["name"], "marketplace.json", f"{prefix}.author.name")

            self._check_placeholder(str(author), "marketplace.json", f"{prefix}.author")

    def _validate_source_field(self, source: Any, prefix: str):
        """Validate the source field format according to Claude Code requirements.

        Valid formats:
        1. Relative path: "./plugins/my-plugin" (string)
        2. GitHub repo: {"source": "github", "repo": "owner/repo"} (object)
        3. Git URL: {"source": "url", "url": "https://gitlab.com/team/plugin.git"} (object)
        4. Direct marketplace URL: "https://url.of/marketplace.json" (string)
        """
        if isinstance(source, str):
            # String sources can be relative paths or direct marketplace URLs
            if source in [".", ".."]:
                # These need to be corrected to start with "./"
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"Invalid relative path '{source}' - must start with \"./\"",
                    f"Change to: \"{source}/\" (add trailing slash to make it \"./\" or \"../\")"
                ))
            elif source in ["./", "../"]:
                # Valid relative paths for local marketplaces
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"Relative path '{source}' only works in local installations",
                    "For public distribution, use GitHub object format: {\"source\": \"github\", \"repo\": \"owner/repo\"}"
                ))
            elif source.startswith("./") or source.startswith("../"):
                # Relative paths are valid for local marketplaces
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"Relative path '{source}' only works in local installations",
                    "For public distribution, use GitHub object format: {\"source\": \"github\", \"repo\": \"owner/repo\"}"
                ))
            elif "github.com" in source.lower():
                # GitHub URLs should use object format
                # Extract owner/repo from URL if possible
                match = re.search(r'github\.com[:/]([^/]+/[^/\.]+)', source, re.IGNORECASE)
                suggested_repo = match.group(1) if match else "owner/repo"

                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"GitHub URL string format '{source}' is not supported",
                    f'Use GitHub object format: {{"source": "github", "repo": "{suggested_repo}"}}'
                ))
            elif source.startswith("http://"):
                # Check if it looks like a git URL that should be an object
                if any(x in source.lower() for x in ["gitlab", "bitbucket", ".git"]):
                    self.errors.append(ValidationError(
                        "error",
                        "marketplace.json",
                        f"{prefix}.source",
                        f"Git repository URL '{source}' should use object format",
                        'Use format: {"source": "url", "url": "' + source.replace("http://", "https://") + '"} (and prefer https://)'
                    ))
                else:
                    # Direct URL, but should be https
                    self.errors.append(ValidationError(
                        "warning",
                        "marketplace.json",
                        f"{prefix}.source",
                        "Using http:// instead of https://",
                        "Use https:// for security"
                    ))
            elif source.startswith("https://"):
                # Check if it looks like a git URL that should be an object
                if any(x in source.lower() for x in ["gitlab", "bitbucket"]) or source.endswith(".git"):
                    self.errors.append(ValidationError(
                        "warning",
                        "marketplace.json",
                        f"{prefix}.source",
                        f"Git repository URL '{source}' should use object format for clarity",
                        'Recommended format: {"source": "url", "url": "' + source + '"}'
                    ))
                # Otherwise it's a direct marketplace.json URL, which is valid
            elif source.startswith("git@"):
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"SSH git URL '{source}' must use object format",
                    'Use format: {"source": "url", "url": "' + source + '"}'
                ))
            elif not source.startswith(("http://", "https://", "./")):
                # Likely a malformed path
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source",
                    f"Invalid source format: '{source}'",
                    'Use relative path ("./path"), GitHub object ({"source": "github", "repo": "owner/repo"}), or URL'
                ))
        elif isinstance(source, dict):
            # Object format - validate based on source type
            if "source" not in source:
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source",
                    "Source object missing 'source' field",
                    'Add "source" field: "github" or "url"'
                ))
                return

            source_type = source.get("source")

            if source_type == "github":
                # Validate GitHub format
                if "repo" not in source:
                    self.errors.append(ValidationError(
                        "error",
                        "marketplace.json",
                        f"{prefix}.source",
                        "GitHub source missing 'repo' field",
                        'Add "repo" field with format: "owner/repository"'
                    ))
                else:
                    repo = source["repo"]
                    if not isinstance(repo, str) or "/" not in repo:
                        self.errors.append(ValidationError(
                            "error",
                            "marketplace.json",
                            f"{prefix}.source.repo",
                            f"GitHub repo '{repo}' must be in 'owner/repository' format",
                            'Use format: "owner/repository" (e.g., "anthropics/example-plugin")'
                        ))
                    # Check for URLs in repo field
                    elif "github.com" in repo or repo.startswith(("http://", "https://")):
                        self.errors.append(ValidationError(
                            "error",
                            "marketplace.json",
                            f"{prefix}.source.repo",
                            f"GitHub repo should only contain 'owner/repository', not URL: '{repo}'",
                            'Remove URL parts, use format: "owner/repository"'
                        ))
            elif source_type == "url":
                # Validate URL format
                if "url" not in source:
                    self.errors.append(ValidationError(
                        "error",
                        "marketplace.json",
                        f"{prefix}.source",
                        "URL source missing 'url' field",
                        'Add "url" field with git repository URL'
                    ))
                else:
                    url = source["url"]
                    if not isinstance(url, str):
                        self.errors.append(ValidationError(
                            "error",
                            "marketplace.json",
                            f"{prefix}.source.url",
                            f"URL must be a string, got {type(url).__name__}",
                            ""
                        ))
                    elif url.startswith("http://"):
                        self.errors.append(ValidationError(
                            "warning",
                            "marketplace.json",
                            f"{prefix}.source.url",
                            "Using http:// instead of https://",
                            "Use https:// for security"
                        ))
                    elif not url.startswith(("https://", "git@")):
                        self.errors.append(ValidationError(
                            "error",
                            "marketplace.json",
                            f"{prefix}.source.url",
                            f"URL must start with https:// or git@: '{url}'",
                            ""
                        ))
            else:
                self.errors.append(ValidationError(
                    "error",
                    "marketplace.json",
                    f"{prefix}.source.source",
                    f"Unknown source type: '{source_type}'",
                    'Use "github" or "url"'
                ))
        else:
            self.errors.append(ValidationError(
                "error",
                "marketplace.json",
                f"{prefix}.source",
                f"Source must be a string or object, got {type(source).__name__}",
                ""
            ))

    def _validate_plugin(self, data: Dict[str, Any]):
        """Validate plugin.json structure and content."""
        # Required fields
        self._check_required_field(data, "plugin.json", "name")
        self._check_required_field(data, "plugin.json", "description")
        self._check_required_field(data, "plugin.json", "version")

        # Validate version format
        if "version" in data:
            version = data["version"]
            if not re.match(r'^\d+\.\d+\.\d+', str(version)):
                self.errors.append(ValidationError(
                    "warning",
                    "plugin.json",
                    "version",
                    f"Version '{version}' doesn't follow semantic versioning",
                    'Use format: "major.minor.patch" (e.g., "1.0.0")'
                ))

        # Check for placeholders
        for field in ["name", "description"]:
            if field in data:
                self._check_placeholder(data[field], "plugin.json", field)

        # Validate author field
        if "author" in data:
            author = data["author"]
            if isinstance(author, str):
                self.errors.append(ValidationError(
                    "warning",
                    "plugin.json",
                    "author",
                    "Author is a string, recommend using object format for consistency",
                    'Use format: {"name": "Author Name"}'
                ))
                self._check_placeholder(author, "plugin.json", "author")
            elif isinstance(author, dict):
                if "name" in author:
                    self._check_placeholder(author["name"], "plugin.json", "author.name")

    def _validate_consistency(self):
        """Validate consistency between marketplace.json and plugin.json."""
        # Check author format consistency
        marketplace_author = None
        if self.marketplace_data and "plugins" in self.marketplace_data:
            if len(self.marketplace_data["plugins"]) > 0:
                marketplace_author = self.marketplace_data["plugins"][0].get("author")

        plugin_author = self.plugin_data.get("author") if self.plugin_data else None

        if marketplace_author is not None and plugin_author is not None:
            marketplace_is_obj = isinstance(marketplace_author, dict)
            plugin_is_obj = isinstance(plugin_author, dict)

            if marketplace_is_obj != plugin_is_obj:
                self.errors.append(ValidationError(
                    "warning",
                    "marketplace.json & plugin.json",
                    "author",
                    "Author format inconsistency between files",
                    "Use the same format (object) in both files"
                ))

    def _check_required_field(self, data: Dict[str, Any], file: str, field: str, parent: str = ""):
        """Check if a required field is present."""
        if field not in data:
            field_path = f"{parent}.{field}" if parent else field
            self.errors.append(ValidationError(
                "error",
                file,
                field_path,
                f"Required field '{field}' is missing",
                f"Add '{field}' field to the configuration"
            ))

    def _check_placeholder(self, value: str, file: str, field: str):
        """Check if a value contains placeholder text."""
        if not isinstance(value, str):
            return

        value_lower = value.lower()
        for pattern in self.PLACEHOLDER_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                self.errors.append(ValidationError(
                    "warning",
                    file,
                    field,
                    f"Contains placeholder value: '{value}'",
                    "Replace with actual value"
                ))
                break

    def _report_results(self) -> bool:
        """Print validation results and return success status."""
        if not self.errors:
            print("✅ All validations passed!")
            print()
            print("Your marketplace configuration is ready to use.")
            return True

        # Separate errors and warnings
        errors = [e for e in self.errors if e.severity == "error"]
        warnings = [e for e in self.errors if e.severity == "warning"]

        # Print errors
        if errors:
            print(f"Found {len(errors)} error(s):")
            print()
            for error in errors:
                print(error)
                print()

        # Print warnings
        if warnings:
            print(f"Found {len(warnings)} warning(s):")
            print()
            for warning in warnings:
                print(warning)
                print()

        # Summary
        print("─" * 60)
        if errors:
            print(f"❌ Validation failed with {len(errors)} error(s) and {len(warnings)} warning(s)")
            print("Fix all errors before distributing this configuration.")
        else:
            print(f"⚠️  Validation passed with {len(warnings)} warning(s)")
            print("Consider addressing warnings for best practices.")

        return len(errors) == 0


def main():
    """Main entry point."""
    # Determine path to validate
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = Path.cwd()

    if not path.exists():
        print(f"❌ Error: Path does not exist: {path}")
        sys.exit(1)

    # Run validation
    validator = MarketplaceValidator(path)
    success = validator.validate()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
