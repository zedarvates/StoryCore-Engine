# StoryCore-Engine Coding Guidelines: Large File Management

## 🎯 **Core Rule: 1500-Line Threshold**

**MANDATORY**: When any source code file approaches or exceeds **1500 lines**, it MUST be proactively refactored into smaller, logically grouped modules.

---

## 📏 **File Size Monitoring**

### **Automated Check Script**
```bash
#!/bin/bash
# tools/check_file_sizes.sh
find src/ -name "*.py" -exec wc -l {} + | awk '$1 > 1200 {print "⚠️  " $2 " (" $1 " lines) - Approaching 1500 limit"}' 
find src/ -name "*.py" -exec wc -l {} + | awk '$1 >= 1500 {print "🚨 " $2 " (" $1 " lines) - REQUIRES IMMEDIATE REFACTORING"}'
```

### **Pre-commit Hook Integration**
```bash
# .git/hooks/pre-commit
#!/bin/bash
./tools/check_file_sizes.sh
if [ $? -ne 0 ]; then
    echo "❌ Large files detected - refactor before committing"
    exit 1
fi
```

---

## 🔧 **Refactoring Strategy**

### **Step 1: Analyze Responsibilities**
```python
# Example: Large file analysis
# src/large_engine.py (1600+ lines) → Split by responsibility

# BEFORE (monolithic):
class LargeEngine:
    def __init__(self): pass
    def validate_input(self): pass      # Input validation (200 lines)
    def process_data(self): pass        # Core processing (800 lines)
    def generate_output(self): pass     # Output generation (300 lines)
    def handle_errors(self): pass       # Error handling (200 lines)
    def log_operations(self): pass      # Logging utilities (100 lines)
```

### **Step 2: Extract by Single Responsibility**
```python
# AFTER (modular):

# src/large_engine/
# ├── __init__.py           # Main interface (50 lines)
# ├── input_validator.py    # Input validation (200 lines)
# ├── core_processor.py     # Core processing (800 lines)
# ├── output_generator.py   # Output generation (300 lines)
# ├── error_handler.py      # Error handling (200 lines)
# └── operation_logger.py   # Logging utilities (100 lines)
```

---

## 📁 **Directory Structure Standards**

### **Module Organization Pattern**
```
src/
├── engine_name/
│   ├── __init__.py              # Public interface
│   ├── core.py                  # Main logic
│   ├── validators.py            # Input/output validation
│   ├── processors.py            # Data processing
│   ├── handlers.py              # Error/event handling
│   ├── utils.py                 # Utility functions
│   └── constants.py             # Module constants
├── another_engine/
│   └── ...
└── shared/
    ├── exceptions.py            # Shared exceptions
    ├── types.py                 # Type definitions
    └── base_classes.py          # Abstract base classes
```

### **Naming Conventions (Per DEEP_AUDIT_RECONSTRUCTION.md)**
| **Element** | **Convention** | **Example** |
|-------------|----------------|-------------|
| **Modules** | snake_case | `input_validator.py` |
| **Classes** | PascalCase | `InputValidator` |
| **Functions** | snake_case | `validate_input_data()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| **Private** | _leading_underscore | `_internal_method()` |

---

## 🔗 **Import/Export Management**

### **Main Module Interface (`__init__.py`)**
```python
"""
Large Engine - Modular implementation
Provides unified interface while maintaining internal modularity
"""

from .core import LargeEngineCore
from .input_validator import InputValidator
from .output_generator import OutputGenerator
from .error_handler import ErrorHandler

# Public API - maintain backward compatibility
class LargeEngine:
    """Unified interface for Large Engine functionality"""
    
    def __init__(self):
        self._core = LargeEngineCore()
        self._validator = InputValidator()
        self._generator = OutputGenerator()
        self._error_handler = ErrorHandler()
    
    def process(self, data):
        """Main processing method - delegates to internal modules"""
        try:
            validated_data = self._validator.validate(data)
            result = self._core.process(validated_data)
            return self._generator.generate_output(result)
        except Exception as e:
            return self._error_handler.handle_error(e)

# Maintain backward compatibility
__all__ = ['LargeEngine']
```

### **Internal Module Structure**
```python
# src/large_engine/core.py
"""Core processing logic for Large Engine"""

from typing import Dict, Any
from ..shared.exceptions import ProcessingError
from .validators import InputValidator

class LargeEngineCore:
    """Core processing logic - single responsibility"""
    
    def __init__(self):
        self._validator = InputValidator()
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process validated data through core algorithm"""
        # Core processing logic here (< 800 lines)
        pass
```

---

## 📋 **Refactoring Checklist**

### **Pre-Refactoring Analysis**
- [ ] **Identify Responsibilities**: List distinct functional areas
- [ ] **Measure Dependencies**: Map internal method calls
- [ ] **Check External Usage**: Identify public API surface
- [ ] **Plan Backward Compatibility**: Ensure existing imports work

### **During Refactoring**
- [ ] **Create Module Directory**: `src/engine_name/`
- [ ] **Extract by Responsibility**: One concern per file
- [ ] **Maintain Naming Standards**: Follow snake_case/PascalCase rules
- [ ] **Update Imports**: Fix all internal references
- [ ] **Create Public Interface**: Unified `__init__.py`

### **Post-Refactoring Validation**
- [ ] **Run All Tests**: Ensure functionality preserved
- [ ] **Update Documentation**: Reflect new structure
- [ ] **Update INDEX.md**: Add new module references
- [ ] **Verify Line Counts**: All files < 1500 lines
- [ ] **Check Import Paths**: External code still works

---

## 📚 **Documentation Updates**

### **Module Documentation Template**
```python
"""
Engine Name Module - [Brief Description]

This module was refactored from a monolithic file on [DATE] to improve
maintainability and follow the 1500-line guideline.

Responsibilities:
- [Primary responsibility 1]
- [Primary responsibility 2]
- [Primary responsibility 3]

Usage:
    from src.engine_name import EngineName
    engine = EngineName()
    result = engine.process(data)

See Also:
    - REFACTORING_LOG.md for refactoring history
    - INDEX.md for module navigation
"""
```

### **Refactoring Log Entry**
```markdown
## [DATE] - Large Engine Refactoring

**File**: `src/large_engine.py` (1,647 lines)
**Reason**: Exceeded 1500-line threshold
**Action**: Split into modular structure

### Changes:
- Created `src/large_engine/` directory
- Extracted 5 modules by responsibility
- Maintained backward compatibility via `__init__.py`
- Updated 12 import statements across codebase

### New Structure:
- `core.py` (798 lines) - Main processing logic
- `input_validator.py` (201 lines) - Input validation
- `output_generator.py` (298 lines) - Output generation
- `error_handler.py` (187 lines) - Error handling
- `operation_logger.py` (95 lines) - Logging utilities

### Impact:
- ✅ All tests pass
- ✅ External API unchanged
- ✅ Improved maintainability
- ✅ Easier unit testing
```

---

## 🛠️ **Automation Tools**

### **File Size Monitor Script**
```python
#!/usr/bin/env python3
# tools/monitor_file_sizes.py

import os
import sys
from pathlib import Path

def check_file_sizes(directory="src", threshold=1500, warning=1200):
    """Monitor Python file sizes and report violations"""
    violations = []
    warnings = []
    
    for py_file in Path(directory).rglob("*.py"):
        line_count = sum(1 for _ in open(py_file, 'r', encoding='utf-8'))
        
        if line_count >= threshold:
            violations.append((py_file, line_count))
        elif line_count >= warning:
            warnings.append((py_file, line_count))
    
    # Report results
    if warnings:
        print("⚠️  Files approaching 1500-line limit:")
        for file_path, lines in warnings:
            print(f"   {file_path}: {lines} lines")
    
    if violations:
        print("🚨 Files requiring immediate refactoring:")
        for file_path, lines in violations:
            print(f"   {file_path}: {lines} lines")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(check_file_sizes())
```

### **Refactoring Assistant Script**
```python
#!/usr/bin/env python3
# tools/refactor_assistant.py

import ast
import os
from pathlib import Path

def analyze_file_structure(file_path):
    """Analyze Python file and suggest refactoring structure"""
    with open(file_path, 'r') as f:
        tree = ast.parse(f.read())
    
    classes = []
    functions = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
            classes.append({
                'name': node.name,
                'line': node.lineno,
                'methods': methods,
                'method_count': len(methods)
            })
        elif isinstance(node, ast.FunctionDef) and node.col_offset == 0:
            functions.append({
                'name': node.name,
                'line': node.lineno
            })
    
    return {'classes': classes, 'functions': functions}

def suggest_refactoring(file_path):
    """Suggest refactoring strategy for large file"""
    structure = analyze_file_structure(file_path)
    
    print(f"📊 Analysis for {file_path}:")
    print(f"   Classes: {len(structure['classes'])}")
    print(f"   Functions: {len(structure['functions'])}")
    
    if len(structure['classes']) == 1 and structure['classes'][0]['method_count'] > 10:
        print("💡 Suggestion: Extract methods into separate modules by responsibility")
    elif len(structure['classes']) > 3:
        print("💡 Suggestion: Group related classes into separate modules")
    elif len(structure['functions']) > 20:
        print("💡 Suggestion: Group functions by purpose into separate modules")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        suggest_refactoring(sys.argv[1])
```

---

## 📈 **Enforcement & Monitoring**

### **CI/CD Integration**
```yaml
# .github/workflows/code-quality.yml
name: Code Quality Check
on: [push, pull_request]

jobs:
  file-size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check file sizes
        run: |
          python3 tools/monitor_file_sizes.py
          if [ $? -ne 0 ]; then
            echo "❌ Large files detected - refactoring required"
            exit 1
          fi
```

### **Development Workflow**
1. **Daily Monitoring**: Run `tools/monitor_file_sizes.py` during development
2. **Pre-commit Check**: Automated file size validation
3. **Code Review**: Include file size discussion in PR reviews
4. **Refactoring Sprint**: Schedule dedicated refactoring when files approach threshold

---

## 🎯 **Success Metrics**

### **Maintainability Indicators**
- ✅ **File Count**: No files > 1500 lines
- ✅ **Module Cohesion**: Each module has single responsibility
- ✅ **Test Coverage**: Maintained or improved after refactoring
- ✅ **Import Complexity**: Minimal circular dependencies

### **Quality Gates**
- **Warning Threshold**: 1200 lines (plan refactoring)
- **Action Threshold**: 1500 lines (mandatory refactoring)
- **Maximum Module Size**: 800 lines (post-refactoring target)
- **Minimum Module Size**: 50 lines (avoid over-fragmentation)

---

This guideline ensures the StoryCore-Engine codebase remains modular, maintainable, and scalable as it grows, following the unified architecture standards established in the Deep Audit & Reconstruction.
