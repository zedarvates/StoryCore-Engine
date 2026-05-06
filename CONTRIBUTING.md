# Contributing to StoryCore Engine

## 🎯 Overview

Thank you for your interest in contributing to StoryCore Engine! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Git
- Docker (optional, for containerized development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/storycore-engine.git
   cd storycore-engine
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   cd creative-studio-ui
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   # Start backend
   python src/main_api.py
   
   # Start frontend (in another terminal)
   cd creative-studio-ui
   npm run dev
   ```

## 📁 Project Structure

```
storycore-engine/
├── creative-studio-ui/          # Frontend (React/TypeScript)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API services
│   │   ├── stores/              # State management (Zustand)
│   │   ├── hooks/               # Custom hooks
│   │   └── utils/               # Utility functions
│   └── public/                  # Static assets
├── src/                          # Backend (Python/FastAPI)
│   ├── api/                     # API routes
│   ├── services/                # Business logic
│   ├── models/                  # Data models
│   └── utils/                   # Utilities
├── electron/                    # Electron desktop app
├── tests/                       # Test files
└── docs/                        # Documentation
```

## 🔄 Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `hotfix/*` - Critical bug fixes

### Creating a Pull Request

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards
   - Write tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # Use conventional commits
   ```

4. **Push to remote**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Target: `develop` branch
   - Include description of changes
   - Link to related issues
   - Request review from maintainers

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements
- `ci:` - CI/CD changes

Examples:
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in video processing"
git commit -m "docs: update API documentation"
```

## ✅ Code Quality Standards

### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use `React.memo` for expensive components
- Memoize expensive calculations with `useMemo`
- Stabilize callbacks with `useCallback`
- Follow ESLint rules
- Write unit tests for components

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for public functions/classes
- Follow Ruff linting rules
- Use Pydantic for data validation
- Write unit tests for all endpoints

### Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Sanitize all user inputs
- Validate all API requests
- Implement rate limiting
- Use prepared statements for database queries

## 🧪 Testing

### Frontend Tests

```bash
cd creative-studio-ui
npm test              # Run all tests
npm test -- --watch  # Run in watch mode
npm run coverage      # Generate coverage report
```

### Backend Tests

```bash
pytest tests/              # Run all tests
pytest tests/ -v           # Verbose output
pytest tests/ --cov=src    # With coverage
```

### Test Guidelines

- Write tests for all new functionality
- Aim for high code coverage (>80%)
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

## 🔍 Code Review Process

### What We Look For

1. **Code Quality**
   - Clean, readable code
   - Proper error handling
   - No console.log in production code
   - Follows project conventions

2. **Testing**
   - Adequate test coverage
   - Tests pass locally
   - Edge cases covered

3. **Documentation**
   - Code is self-documenting
   - Complex logic is explained
   - API changes documented

4. **Security**
   - No security vulnerabilities
   - Input validation present
   - Secrets not hardcoded

5. **Performance**
   - No obvious performance issues
   - Efficient algorithms
   - Proper resource cleanup

## 📝 Documentation

### Code Documentation

- Use JSDoc/TSDoc for frontend
- Use docstrings for Python
- Document complex algorithms
- Explain design decisions

### API Documentation

- Update OpenAPI/Swagger docs
- Include examples
- Document error codes
- Note rate limits

### User Documentation

- Update README
- Add usage examples
- Document configuration options
- Create tutorials if needed

## 🐛 Bug Reports

When reporting bugs, please include:

1. Clear description of the issue
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots or logs if applicable
5. Environment details (OS, browser, version)
6. Minimal reproduction case if possible

## 💡 Feature Requests

When suggesting features:

1. Describe the problem you're solving
2. Explain the proposed solution
3. Consider edge cases
4. Provide mockups or examples if applicable
5. Discuss potential alternatives

## 🤝 Community

- Be respectful and inclusive
- Help others when you can
- Ask questions if you're unsure
- Share knowledge and experience
- Follow the Code of Conduct

## 🔗 Additional Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Setup Guide](docs/DEVELOPMENT.md)
- [Style Guide](docs/STYLE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🙏 Thank You!

Thank you for contributing to StoryCore Engine! Your contributions help make this project better for everyone.

---

*Last updated: 2026-05-05*