# Contributing to StoryCore-Engine

Thank you for your interest in contributing to StoryCore-Engine! This document outlines the process for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Submitting Changes](#-submitting-changes)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Documentation](#-documentation)

---

## 🌟 Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+** (3.11 recommended)
- **Node.js 20+** (for UI development)
- **Git**
- **ComfyUI** (for AI generation workflows)
- **Ollama** (for local LLM processing)

### First Steps

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/storycore-engine.git
   cd storycore-engine
   ```

3. **Set up the development environment**:
   ```bash
   # Create virtual environment
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate

   # Install Python dependencies
   pip install -r requirements.txt

   # Install UI dependencies
   cd creative-studio-ui
   npm install
   cd ..
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 💻 Development Setup

### Running the Application

**CLI Mode:**
```bash
python storycore.py --help
```

**With UI:**
```bash
npm run dev
```

**Electron Development:**
```bash
npm run electron:dev
```

### Running Tests

```bash
# Python tests
pytest tests/ -v --cov=src

# UI tests
cd creative-studio-ui
npm test

# Linting
flake8 src/ tests/ --max-line-length=100
black --check src/ tests/
```

---

## 📝 Submitting Changes

### Pull Request Process

1. **Ensure all tests pass**:
   ```bash
   pytest tests/ -v
   cd creative-studio-ui && npm test
   ```

2. **Update documentation** if needed (README, docstrings, etc.)

3. **Commit your changes** with a clear message:
   ```
   feat: Add new image generation pipeline
   
   - Implemented Qwen2-VL integration
   - Added batch processing support
   - Updated configuration schema
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** against the `main` branch

### PR Requirements

- [ ] All tests pass
- [ ] Code follows style guidelines (Black, flake8)
- [ ] Documentation updated
- [ ] Commit messages are clear and descriptive
- [ ] No sensitive data (API keys, passwords, etc.)
- [ ] Changes are properly tested

---

## 🎨 Coding Standards

### Python

- **Style**: Follow [PEP 8](https://pep8.org/)
- **Formatting**: Use [Black](https://black.readthedocs.io/)
- **Linting**: flake8 with max line length 100
- **Type Hints**: Required for new functions
- **Docstrings**: Google-style for all public functions

Example:
```python
def process_image(
    image_path: Path,
    quality: int = 85,
    output_format: str = "JPEG"
) -> Dict[str, Any]:
    """Process an image for the coherence grid.

    Args:
        image_path: Path to the input image
        quality: Compression quality (1-100)
        output_format: Output format (JPEG, PNG)

    Returns:
        Dictionary containing processing results

    Raises:
        FileNotFoundError: If image_path doesn't exist
        ValueError: If quality is out of range
    """
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    if not 1 <= quality <= 100:
        raise ValueError("Quality must be between 1 and 100")
    
    # Processing logic here
    return {"status": "success", "path": str(image_path)}
```

### TypeScript/React

- Use TypeScript strict mode
- Follow component structure in `creative-studio-ui/src/components/`
- Use functional components with hooks
- Keep components small and focused

---

## 🧪 Testing

### Unit Tests

Place tests in `tests/unit/`:
```python
def test_feature_name():
    """Test description."""
    # Arrange
    # Act
    # Assert
```

### Integration Tests

Place tests in `tests/integration/`:
```python
def test_workflow_integration():
    """Test complete workflow."""
    # Test complete user journey
```

### Running Specific Tests

```bash
# All tests
pytest

# Single file
pytest tests/unit/test_specific_module.py

# With coverage
pytest --cov=src --cov-report=html

# UI tests
cd creative-studio-ui && npm test
```

---

## 📚 Documentation

### Updating README

If your changes affect:
- Installation process → Update README.md
- New features → Add to "Key Features"
- Architecture changes → Update "Architecture" section

### Docstrings & Comments

- Write clear docstrings for all public functions
- Add inline comments for complex logic
- Keep comments up to date with code

---

## 🐛 Reporting Issues

### Before Reporting

1. Search existing issues to avoid duplicates
2. Check if the issue is reproducible
3. Gather relevant information:
   - OS and version
   - Python version
   - Error messages
   - Steps to reproduce

### Issue Format

```markdown
**Describe the Bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Run '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., Windows 11]
 - Python: [e.g., 3.11.0]
 - StoryCore version: [e.g., 1.0.0]

**Additional Context**
Any other relevant information.
```

---

## 💡 Suggesting Features

Before submitting a feature request:

1. Check the [Roadmap](ROADMAP.md) for planned features
2. Consider if the feature aligns with project goals
3. Explain the use case and motivation

Feature request format:
```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Screenshots, mockups, or relevant links.
```

---

## 📦 Project Structure

```
storycore-engine/
├── src/                    # Core engine modules
│   ├── cli/               # Command-line interface
│   ├── engines/           # Processing engines
│   ├── wizards/          # User-guided workflows
│   └── ...
├── creative-studio-ui/    # React/TypeScript UI
├── workflows/              # ComfyUI workflows
├── docs/                   # Documentation
├── tests/                  # Test suite
└── .github/                # CI/CD and configurations
```

---

## 🤝 Getting Help

- **Documentation**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/zedarvates/StoryCore-Engine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zedarvates/StoryCore-Engine/discussions)

---

## 🙏 Acknowledgments

Thank you for contributing to StoryCore-Engine! Every contribution helps make this project better for the entire community.

