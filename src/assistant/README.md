# StoryCore AI Assistant

A natural language interface for managing StoryCore projects with secure file operations, storage monitoring, and project generation capabilities.

## Features

- **Secure File Operations**: All file operations restricted to designated project directory
- **Storage Monitoring**: Track and enforce storage limits (50 GB, 248 files)
- **Project Management**: Open, close, and modify projects with auto-save
- **Natural Language Generation**: Generate complete projects from creative prompts
- **RESTful API**: FastAPI-based endpoints with authentication and rate limiting
- **Data Contract Compliance**: All projects adhere to Data Contract v1 schema

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Key configuration options in `config.py`:

- `project_directory`: Location for all projects (default: `~/Documents/StoryCore Projects`)
- `storage_limit_gb`: Maximum storage in GB (default: 50)
- `file_limit`: Maximum number of files (default: 248)
- `auto_save_interval_seconds`: Auto-save interval (default: 300)
- `api_rate_limit_requests`: Rate limit per user (default: 100 req/min)

## Usage

### Starting the API Server

```bash
python -m src.assistant.main
```

The API will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Example API Calls

**Generate a project:**
```bash
curl -X POST http://localhost:8000/api/v1/generate/project \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a sci-fi thriller about AI rebellion",
    "language": "en"
  }'
```

**Open a project:**
```bash
curl -X POST http://localhost:8000/api/v1/projects/open \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_name": "my_project"}'
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/assistant --cov-report=html

# Run specific test types
pytest -m unit          # Unit tests only
pytest -m property      # Property-based tests only
pytest -m integration   # Integration tests only
pytest -m security      # Security tests only
```

## Architecture

```
src/assistant/
├── __init__.py           # Package initialization
├── config.py             # Configuration settings
├── logging_config.py     # Logging setup
├── exceptions.py         # Custom exception classes
├── models.py             # Data models
├── file_operations.py    # Secure file operations
├── storage_monitor.py    # Storage monitoring
├── validator.py          # Data Contract validator
├── project_manager.py    # Project operations
├── auto_save.py          # Auto-save manager
├── prompt_parser.py      # NLP prompt parsing
├── project_generator.py  # Project generation
├── assistant.py          # Main assistant class
├── api/                  # API layer
│   ├── __init__.py
│   ├── app.py           # FastAPI application
│   ├── auth.py          # Authentication
│   ├── rate_limiter.py  # Rate limiting
│   └── routes/          # API endpoints
└── tests/               # Test suite
    ├── __init__.py
    ├── conftest.py      # Test fixtures
    ├── test_file_operations.py
    ├── test_storage_monitor.py
    └── ...
```

## Security

- All file operations are sandboxed within the project directory
- Path validation prevents directory traversal attacks
- JWT-based authentication for API access
- Rate limiting to prevent abuse
- Comprehensive error handling and logging

## Development

### Running Tests

```bash
# Run tests with coverage
pytest --cov=src/assistant

# Run property-based tests with more examples
pytest -m property --hypothesis-max-examples=1000
```

### Code Style

```bash
# Format code
black src/assistant

# Lint code
pylint src/assistant
```

## License

Part of the StoryCore-Engine project.
