#!/usr/bin/env python3
"""
Refactoring Assistant - Analyzes large files and suggests modular structure
Helps implement the 1500-line threshold guideline
"""

import ast
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

def analyze_file_structure(file_path: str) -> Dict[str, Any]:
    """Analyze Python file and extract structural information"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            tree = ast.parse(content)
    except (IOError, SyntaxError) as e:
        return {'error': str(e)}
    
    classes = []
    functions = []
    imports = []
    constants = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            methods = []
            for child in node.body:
                if isinstance(child, ast.FunctionDef):
                    methods.append({
                        'name': child.name,
                        'line': child.lineno,
                        'is_private': child.name.startswith('_')
                    })
            
            classes.append({
                'name': node.name,
                'line': node.lineno,
                'methods': methods,
                'method_count': len(methods)
            })
            
        elif isinstance(node, ast.FunctionDef) and node.col_offset == 0:
            functions.append({
                'name': node.name,
                'line': node.lineno,
                'is_private': node.name.startswith('_')
            })
            
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            imports.append({
                'line': node.lineno,
                'type': 'import' if isinstance(node, ast.Import) else 'from_import'
            })
            
        elif isinstance(node, ast.Assign) and node.col_offset == 0:
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.isupper():
                    constants.append({
                        'name': target.id,
                        'line': node.lineno
                    })
    
    return {
        'classes': classes,
        'functions': functions,
        'imports': imports,
        'constants': constants,
        'total_lines': len(content.splitlines())
    }

def suggest_refactoring_strategy(structure: Dict[str, Any], file_path: str) -> None:
    """Suggest refactoring strategy based on file structure analysis"""
    print(f"📊 Analysis for {file_path}:")
    print(f"   Total lines: {structure['total_lines']}")
    print(f"   Classes: {len(structure['classes'])}")
    print(f"   Functions: {len(structure['functions'])}")
    print(f"   Constants: {len(structure['constants'])}")
    print()
    
    # Analyze classes
    if structure['classes']:
        print("🏗️  Class Analysis:")
        for cls in structure['classes']:
            print(f"   {cls['name']}: {cls['method_count']} methods (line {cls['line']})")
        print()
    
    # Generate refactoring suggestions
    print("💡 Refactoring Suggestions:")
    
    if len(structure['classes']) == 1 and structure['classes'][0]['method_count'] > 15:
        cls = structure['classes'][0]
        print(f"   1. Extract methods from {cls['name']} into separate modules:")
        
        # Group methods by common patterns
        public_methods = [m for m in cls['methods'] if not m['is_private']]
        private_methods = [m for m in cls['methods'] if m['is_private']]
        
        if len(public_methods) > 8:
            print(f"      - Create 'core.py' for main public methods ({len(public_methods)} methods)")
        if len(private_methods) > 5:
            print(f"      - Create 'utils.py' for private utilities ({len(private_methods)} methods)")
        
        # Suggest grouping by method name patterns
        validators = [m for m in cls['methods'] if 'valid' in m['name'].lower()]
        processors = [m for m in cls['methods'] if any(word in m['name'].lower() for word in ['process', 'handle', 'execute'])]
        generators = [m for m in cls['methods'] if any(word in m['name'].lower() for word in ['generate', 'create', 'build'])]
        
        if validators:
            print(f"      - Create 'validators.py' for validation methods ({len(validators)} methods)")
        if processors:
            print(f"      - Create 'processors.py' for processing methods ({len(processors)} methods)")
        if generators:
            print(f"      - Create 'generators.py' for generation methods ({len(generators)} methods)")
    
    elif len(structure['classes']) > 3:
        print(f"   1. Group {len(structure['classes'])} classes into separate modules by responsibility")
        for cls in structure['classes']:
            if 'engine' in cls['name'].lower():
                print(f"      - Move {cls['name']} to 'engines/' subdirectory")
            elif 'manager' in cls['name'].lower():
                print(f"      - Move {cls['name']} to 'managers/' subdirectory")
            elif any(word in cls['name'].lower() for word in ['validator', 'checker']):
                print(f"      - Move {cls['name']} to 'validators.py'")
    
    if len(structure['functions']) > 15:
        print(f"   2. Group {len(structure['functions'])} standalone functions by purpose:")
        
        # Analyze function patterns
        utility_funcs = [f for f in structure['functions'] if any(word in f['name'].lower() for word in ['helper', 'util', 'format'])]
        validation_funcs = [f for f in structure['functions'] if 'valid' in f['name'].lower()]
        
        if utility_funcs:
            print(f"      - Move utility functions to 'utils.py' ({len(utility_funcs)} functions)")
        if validation_funcs:
            print(f"      - Move validation functions to 'validators.py' ({len(validation_funcs)} functions)")
    
    if len(structure['constants']) > 10:
        print(f"   3. Extract {len(structure['constants'])} constants to 'constants.py'")
    
    # Suggest directory structure
    base_name = Path(file_path).stem
    print(f"\n📁 Suggested Directory Structure:")
    print(f"   src/{base_name}/")
    print(f"   ├── __init__.py          # Public interface")
    print(f"   ├── core.py              # Main logic")
    
    if any('valid' in cls['name'].lower() for cls in structure['classes']) or len([f for f in structure['functions'] if 'valid' in f['name'].lower()]) > 3:
        print(f"   ├── validators.py        # Input/output validation")
    
    if len(structure['functions']) > 10:
        print(f"   ├── utils.py             # Utility functions")
    
    if len(structure['constants']) > 5:
        print(f"   ├── constants.py         # Module constants")
    
    print(f"   └── exceptions.py        # Custom exceptions")

def create_refactoring_template(file_path: str) -> None:
    """Create template files for refactoring"""
    base_name = Path(file_path).stem
    module_dir = Path(f"src/{base_name}")
    
    if module_dir.exists():
        print(f"⚠️  Directory {module_dir} already exists")
        return
    
    print(f"📁 Creating refactoring template in {module_dir}/")
    module_dir.mkdir(parents=True, exist_ok=True)
    
    # Create __init__.py template
    init_content = f'''"""
{base_name.title()} Module - Refactored from monolithic file
Provides unified interface while maintaining internal modularity
"""

from .core import {base_name.title()}Core

# Public API - maintain backward compatibility
class {base_name.title()}:
    """Unified interface for {base_name.title()} functionality"""
    
    def __init__(self):
        self._core = {base_name.title()}Core()
    
    # Add your public methods here

# Maintain backward compatibility
__all__ = ['{base_name.title()}']
'''
    
    with open(module_dir / "__init__.py", 'w') as f:
        f.write(init_content)
    
    # Create core.py template
    core_content = f'''"""
Core logic for {base_name.title()} - Main processing functionality
"""

from typing import Dict, Any

class {base_name.title()}Core:
    """Core processing logic - single responsibility"""
    
    def __init__(self):
        pass
    
    # Move your main processing methods here
'''
    
    with open(module_dir / "core.py", 'w') as f:
        f.write(core_content)
    
    print(f"✅ Template created. Move code from {file_path} to appropriate modules.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 tools/refactor_assistant.py <file_path> [--create-template]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    structure = analyze_file_structure(file_path)
    
    if 'error' in structure:
        print(f"❌ Error analyzing file: {structure['error']}")
        sys.exit(1)
    
    suggest_refactoring_strategy(structure, file_path)
    
    if len(sys.argv) > 2 and sys.argv[2] == "--create-template":
        create_refactoring_template(file_path)
