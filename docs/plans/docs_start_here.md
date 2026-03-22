# Contributing to StoryCore-Engine

Thank you for your interest in contributing to StoryCore-Engine!

## Development Environment Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -e .[dev]

# Install Node dependencies
npm install
```

## Running Tests

### Python Tests

```bash
# Run all tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ -v --cov=src --cov-report=html

# Run specific test file
pytest tests/test_example.py -v

# Run tests with markers
pytest tests/ -v -m "unit"
```

### JavaScript/TypeScript Tests

```bash
# Run frontend tests
cd creative-studio-ui
npm test
```

## Code Quality

### Linting

```bash
# Run Black (code formatting)
black src/ tests/

# Run Flake8 (style guide)
flake8 src/ tests/ --max-line-length=100

# Run MyPy (type checking)
mypy src/ --ignore-missing-imports
```

### Pre-commit Hooks

We recommend installing pre-commit hooks to ensure code quality:

```bash
pip install pre-commit
pre-commit install
```

## Building

### Build the Application

```bash
# Build UI and Electron app
npm run build

# Package for distribution
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

## Project Structure

```
storycore-engine/
├── src/                  # Core engine modules
├── backend/              # FastAPI backend services
├── cli/                 # CLI handlers
├── tests/               # Test suite
├── creative-studio-ui/  # React frontend
├── docs/                # Documentation
└── .github/workflows/   # CI/CD workflows
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- Follow PEP 8 for Python code
- Use Black for code formatting (line-length: 100)
- Write docstrings for all public functions
- Add type hints where possible
- Write tests for new features

## Questions?

If you have questions, please open an issue on GitHub or reach out to the maintainers.

