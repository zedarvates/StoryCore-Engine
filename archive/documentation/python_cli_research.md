# Python CLI Frameworks & Best Practices Research

## Framework Comparison

### 1. argparse (Built-in, Zero Dependencies)
**Best for**: Hackathons, minimal setups, standard library only

```python
import argparse

def main():
    parser = argparse.ArgumentParser(description='My CLI tool')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Add subcommand
    deploy_parser = subparsers.add_parser('deploy', help='Deploy application')
    deploy_parser.add_argument('--env', choices=['dev', 'prod'], required=True)
    
    args = parser.parse_args()
    
    if args.command == 'deploy':
        deploy(args.env)

def deploy(env):
    print(f"Deploying to {env}")

if __name__ == '__main__':
    main()
```

**Pros**: No dependencies, built-in, lightweight
**Cons**: Verbose, limited features, manual type conversion

### 2. Click (Popular, Feature-Rich)
**Best for**: Professional tools, complex CLIs

```python
import click

@click.group()
def cli():
    """My CLI tool"""
    pass

@cli.command()
@click.option('--env', type=click.Choice(['dev', 'prod']), required=True)
def deploy(env):
    """Deploy application"""
    click.echo(f"Deploying to {env}")

if __name__ == '__main__':
    cli()
```

**Pros**: Decorators, auto-help, type validation, testing support
**Cons**: External dependency

### 3. Typer (Modern, Type Hints)
**Best for**: Modern Python, type safety

```python
import typer
from enum import Enum

class Environment(str, Enum):
    dev = "dev"
    prod = "prod"

app = typer.Typer()

@app.command()
def deploy(env: Environment):
    """Deploy application"""
    typer.echo(f"Deploying to {env}")

if __name__ == "__main__":
    app()
```

**Pros**: Type hints, automatic validation, modern syntax
**Cons**: External dependency, newer (less mature)

## Minimal Project Structure

```
my-cli/
├── cli.py              # Main CLI entry point
├── commands/           # Command modules
│   ├── __init__.py
│   ├── deploy.py
│   └── status.py
├── utils/              # Shared utilities
│   ├── __init__.py
│   └── helpers.py
├── requirements.txt    # Dependencies
└── setup.py           # Package configuration
```

## Error Handling Best Practices

### 1. Graceful Error Handling
```python
import sys
import traceback

def handle_error(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            if os.getenv('DEBUG'):
                traceback.print_exc()
            sys.exit(1)
    return wrapper

@handle_error
def main():
    # Your CLI logic here
    pass
```

### 2. Exit Codes
```python
# Standard exit codes
SUCCESS = 0
GENERAL_ERROR = 1
MISUSE = 2
CANNOT_EXECUTE = 126
COMMAND_NOT_FOUND = 127
```

## Hackathon-Friendly Patterns

### 1. Single File CLI (argparse)
```python
#!/usr/bin/env python3
import argparse
import sys
import json

def cmd_status():
    print("Status: OK")

def cmd_deploy(env, force=False):
    if not force and env == 'prod':
        if input("Deploy to prod? (y/N): ").lower() != 'y':
            return
    print(f"Deploying to {env}")

def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='cmd')
    
    # Status command
    subparsers.add_parser('status')
    
    # Deploy command
    deploy_p = subparsers.add_parser('deploy')
    deploy_p.add_argument('env', choices=['dev', 'prod'])
    deploy_p.add_argument('--force', action='store_true')
    
    args = parser.parse_args()
    
    if args.cmd == 'status':
        cmd_status()
    elif args.cmd == 'deploy':
        cmd_deploy(args.env, args.force)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
```

### 2. Configuration Management
```python
import os
import json
from pathlib import Path

def load_config():
    config_paths = [
        Path.cwd() / '.myapp.json',
        Path.home() / '.config' / 'myapp' / 'config.json',
        Path('/etc/myapp/config.json')
    ]
    
    for path in config_paths:
        if path.exists():
            return json.loads(path.read_text())
    
    return {}  # Default config
```

## Professional Features

### 1. Progress Bars (minimal)
```python
import sys
import time

def progress_bar(iterable, desc="Processing"):
    total = len(iterable)
    for i, item in enumerate(iterable):
        percent = (i + 1) / total * 100
        bar = '█' * int(percent // 5) + '░' * (20 - int(percent // 5))
        print(f'\r{desc}: [{bar}] {percent:.1f}%', end='', flush=True)
        yield item
    print()  # New line when done
```

### 2. Logging Setup
```python
import logging
import sys

def setup_logging(verbose=False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
```

### 3. Environment Detection
```python
import os

def is_ci():
    return any(var in os.environ for var in ['CI', 'GITHUB_ACTIONS', 'JENKINS_URL'])

def is_interactive():
    return sys.stdin.isatty() and sys.stdout.isatty()
```

## Testing CLIs

### argparse Testing
```python
import unittest
from unittest.mock import patch
import sys
from io import StringIO

class TestCLI(unittest.TestCase):
    def test_deploy_command(self):
        with patch('sys.argv', ['cli.py', 'deploy', 'dev']):
            with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
                main()
                self.assertIn('Deploying to dev', mock_stdout.getvalue())
```

### Click Testing
```python
from click.testing import CliRunner

def test_deploy():
    runner = CliRunner()
    result = runner.invoke(cli, ['deploy', '--env', 'dev'])
    assert result.exit_code == 0
    assert 'Deploying to dev' in result.output
```

## Packaging for Distribution

### setup.py (minimal)
```python
from setuptools import setup

setup(
    name='my-cli',
    version='0.1.0',
    py_modules=['cli'],
    entry_points={
        'console_scripts': [
            'mycli=cli:main',
        ],
    },
    python_requires='>=3.6',
)
```

### pyproject.toml (modern)
```toml
[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "my-cli"
version = "0.1.0"
dependencies = []

[project.scripts]
mycli = "cli:main"
```

## Recommendations by Use Case

### Hackathon/Prototype (Speed Priority)
- Use **argparse** (no dependencies)
- Single file structure
- Minimal error handling
- Focus on core functionality

### Professional Tool (Quality Priority)
- Use **Click** or **Typer**
- Proper project structure
- Comprehensive error handling
- Testing and documentation
- Configuration management

### Team Project (Maintainability Priority)
- Use **Typer** for type safety
- Modular command structure
- Extensive testing
- CI/CD integration
- Proper logging

## Quick Start Templates

### Argparse Template
```python
#!/usr/bin/env python3
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description='My CLI')
    parser.add_argument('--verbose', '-v', action='store_true')
    
    subparsers = parser.add_subparsers(dest='command')
    
    # Add your commands here
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Route to command handlers

if __name__ == '__main__':
    main()
```

### Click Template
```python
import click

@click.group()
@click.option('--verbose', '-v', is_flag=True)
@click.pass_context
def cli(ctx, verbose):
    ctx.ensure_object(dict)
    ctx.obj['verbose'] = verbose

# Add commands with @cli.command()

if __name__ == '__main__':
    cli()
```