# Contributing Guide - StoryCore

Thank you for your interest in contributing to StoryCore! This guide will help you understand how to contribute to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community Guidelines](#community-guidelines)
- [License](#license)

## Getting Started

### Prerequisites

Before contributing to StoryCore, ensure you have the following installed:

- **Node.js** (v18 or later)
- **Python** (v3.8 or later)
- **Docker** (v20.10 or later)
- **Git** (v2.30 or later)
- **PostgreSQL** (v13 or later)
- **Redis** (v6 or later)

### Project Structure

```
storycore/
├── src/                    # Source code
│   ├── api/               # API layer
│   ├── services/          # Business services
│   ├── models/            # Data models
│   ├── utils/             # Utility functions
│   └── middleware/       # Express middleware
├── frontend/              # Frontend code
│   ├── src/               # React source
│   ├── public/            # Static assets
│   └── components/        # React components
├── tests/                 # Test files
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
├── config/                # Configuration files
└── docker/                # Docker configuration
```

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/storycore/storycore.git
cd storycore
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Set Up Database

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run migrate

# Seed database (optional)
npm run seed
```

### 5. Start Development Servers

```bash
# Start backend API
npm run dev

# Start frontend development server
cd frontend
npm start

# Start ComfyUI (optional)
docker-compose up -d comfyui
```

### 6. Verify Setup

Visit `http://localhost:3000` to verify the application is running.

## Code Style

### JavaScript/TypeScript

We use ESLint and Prettier for code formatting:

```bash
# Install ESLint and Prettier
npm install --save-dev eslint prettier eslint-config-prettier

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Python

We use Black and flake8 for Python code formatting:

```bash
# Install formatting tools
pip install black flake8

# Format Python code
black src/services/

# Check Python code
flake8 src/services/
```

### General Guidelines

- Use meaningful variable and function names
- Follow the existing code style and patterns
- Write clean, readable code
- Add appropriate comments where necessary
- Keep functions focused and single-purpose

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="user authentication"

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

#### JavaScript/TypeScript Tests

```javascript
// Example test using Jest
describe('UserService', () => {
  let userService;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    userService = new UserService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      // Create first user
      await userService.createUser(userData);

      // Try to create user with same email
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

#### Python Tests

```python
# Example test using pytest
import pytest
from unittest.mock import Mock, patch
from services.user_service import UserService

class TestUserService:
    @pytest.fixture
    def user_service(self):
        mock_db = Mock()
        return UserService(mock_db)
    
    @pytest.fixture
    def user_data(self):
        return {
            'email': 'test@example.com',
            'name': 'Test User',
            'password': 'password123'
        }
    
    def test_create_user(self, user_service, user_data):
        # Arrange
        user_service.database.create_user.return_value = {
            'id': 1,
            'email': user_data['email'],
            'name': user_data['name']
        }
        
        # Act
        user = user_service.create_user(user_data)
        
        # Assert
        assert user is not None
        assert user['email'] == user_data['email']
        assert user['name'] == user_data['name']
    
    def test_create_user_duplicate_email(self, user_service, user_data):
        # Arrange
        user_service.database.create_user.side_effect = Exception('Email already exists')
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            user_service.create_user(user_data)
        
        assert str(exc_info.value) == 'Email already exists'
```

### Test Coverage

We aim for at least 80% test coverage. You can check coverage with:

```bash
npm run test:coverage
```

## Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep documentation up to date with code changes
- Follow the existing documentation structure

### Adding New Documentation

1. Create documentation files in the `docs/` directory
2. Follow the existing naming convention: `feature_name.md`
3. Include examples and usage instructions
4. Link to related documentation
5. Submit a pull request with your documentation changes

### API Documentation

We use OpenAPI (Swagger) for API documentation:

```yaml
# Example API documentation
paths:
  /api/users:
    post:
      summary: Create a new user
      description: Create a new user account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                name:
                  type: string
                password:
                  type: string
                  format: password
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid request data
        '409':
          description: Email already exists
```

## Submitting Changes

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests for new functionality**
5. **Ensure all tests pass**
6. **Update documentation if needed**
7. **Submit a pull request**

### Branch Naming Convention

Use descriptive branch names:

```bash
# Feature branch
git checkout -b feature/user-authentication

# Bug fix branch
git checkout -b fix/database-connection-error

# Documentation branch
git checkout -b docs/api-documentation
```

### Pull Request Template

When submitting a pull request, include:

```markdown
## Description
Brief description of the changes made.

## Changes Made
- Added user authentication service
- Implemented JWT token management
- Added unit tests for authentication
- Updated API documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Test coverage maintained

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Changes are backward compatible
- [ ] Performance impact considered

## Additional Notes
Any additional information or context.
```

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

```markdown
## Bug Description
Brief description of the bug.

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: [e.g., Ubuntu 20.04]
- Browser: [e.g., Chrome 91]
- StoryCore Version: [e.g., 2.0.0]

## Additional Context
Any additional information that might help.
```

### Error Reports

For error reports, include:

```markdown
## Error Description
Description of the error.

## Error Message
```
Error message here
```

## Stack Trace
```
Stack trace here
```

## Steps to Reproduce
1. Step one
2. Step two

## Environment
- OS: [e.g., Ubuntu 20.04]
- StoryCore Version: [e.g., 2.0.0]
```

## Feature Requests

### Submitting Feature Requests

When requesting a feature, include:

```markdown
## Feature Description
Detailed description of the requested feature.

## Use Case
How this feature would be used.

## Proposed Implementation
Optional: Suggested implementation approach.

## Alternatives Considered
Optional: Other approaches considered.

## Additional Context
Any additional information or context.
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and constructive
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism
- Focus on what is best for the community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **Discord Server**: Real-time chat and support
- **Email**: Private communication for sensitive matters

### Getting Help

If you need help:

1. Check the [documentation](README.md)
2. Search existing [issues](https://github.com/storycore/storycore/issues)
3. Ask questions in [GitHub Discussions](https://github.com/storycore/storycore/discussions)
4. Join our [Discord server](https://discord.gg/storycore)

### Community Events

We regularly organize:

- **Code Review Sessions**: Weekly code reviews and feedback
- **Development Sprints**: Intensive development periods
- **Webinars**: Educational sessions on various topics
- **Meetups**: Local community meetups

## Development Workflow

### 1. Planning and Design

- Create issue for the feature/bug fix
- Discuss requirements and approach
- Create design documents if needed
- Get approval from maintainers

### 2. Development

- Create feature branch
- Implement changes
- Write tests
- Update documentation
- Test locally

### 3. Code Review

- Submit pull request
- Address review comments
- Ensure all checks pass
- Get approval from maintainers

### 4. Deployment

- Merge to main branch
- Deploy to staging environment
- Test in staging
- Deploy to production

## Performance Considerations

### Code Performance

- Write efficient code
- Profile performance bottlenecks
- Optimize database queries
- Use appropriate caching
- Monitor memory usage

### Database Performance

- Use appropriate indexes
- Optimize query performance
- Implement connection pooling
- Use database transactions appropriately
- Monitor database performance

### API Performance

- Implement proper caching
- Use efficient data formats
- Implement rate limiting
- Monitor API performance
- Optimize response times

## Security Considerations

### Code Security

- Follow security best practices
- Validate all user input
- Use parameterized queries
- Implement proper authentication
- Keep dependencies up to date

### Data Security

- Encrypt sensitive data
- Use secure storage
- Implement proper access controls
- Regular security audits
- Backup and recovery procedures

### Network Security

- Use HTTPS
- Implement proper CORS policies
- Use secure authentication methods
- Monitor for security threats
- Implement proper logging

## Maintenance

### Keeping Dependencies Updated

Regularly update dependencies to ensure security and performance:

```bash
# Update Node.js dependencies
npm update

# Update Python dependencies
pip list --outdated
pip install --upgrade package_name
```

### Code Maintenance

- Remove dead code
- Refactor when needed
- Update deprecated features
- Improve code quality
- Maintain test coverage

### Documentation Maintenance

- Update documentation with code changes
- Fix broken links
- Improve existing documentation
- Add new examples
- Keep documentation current

## Contributing to Different Parts

### Backend API

- Follow RESTful API design principles
- Use proper HTTP status codes
- Implement proper error handling
- Add comprehensive tests
- Document API endpoints

### Frontend

- Follow React best practices
- Use proper state management
- Implement responsive design
- Add accessibility features
- Test component functionality

### AI/ML Components

- Document model performance
- Include model training data
- Add model evaluation metrics
- Implement proper error handling
- Monitor model performance

### Documentation

- Use clear, concise language
- Include examples
- Keep information current
- Follow documentation structure
- Ensure accuracy

## License

By contributing to StoryCore, you agree that your contributions will be licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.

## Recognition

We appreciate all contributions to StoryCore! Contributors will be:

- Listed in the [Contributors](CONTRIBUTORS.md) file
- Recognized in release notes
- Given credit in documentation
- Invited to join special contributor programs

## Questions?

If you have any questions about contributing to StoryCore:

- Check the [FAQ](FAQ.md)
- Contact us via [GitHub Discussions](https://github.com/storycore/storycore/discussions)
- Join our [Discord server](https://discord.gg/storycore)
- Email us at contribute@storycore.com

---

*For more information on development, see [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md).*