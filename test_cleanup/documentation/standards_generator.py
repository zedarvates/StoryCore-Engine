"""
Testing Standards Document Generator

This module generates comprehensive testing standards documentation
that defines what makes a test valuable, naming conventions, and
when to use different test types.

Requirements: 7.1, 7.4, 7.5
"""

from pathlib import Path
from typing import Dict, Any
from datetime import datetime


class TestingStandardsGenerator:
    """Generates testing standards documentation"""
    
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_standards_document(self) -> Path:
        """
        Generate comprehensive testing standards document
        
        Returns:
            Path to generated standards document
        """
        content = self._build_standards_content()
        output_path = self.output_dir / "TESTING_STANDARDS.md"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    def _build_standards_content(self) -> str:
        """Build the complete standards document content"""
        sections = [
            self._header_section(),
            self._valuable_test_section(),
            self._naming_conventions_section(),
            self._test_types_section(),
            self._test_organization_section(),
            self._best_practices_section(),
            self._quality_metrics_section()
        ]
        
        return "\n\n".join(sections)
    
    def _header_section(self) -> str:
        """Generate document header"""
        return f"""# Testing Standards

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This document defines the testing standards for the StoryCore-Engine project. Following these standards ensures that our test suite remains valuable, maintainable, and reliable.

## Table of Contents

1. [What Makes a Test Valuable](#what-makes-a-test-valuable)
2. [Test Naming Conventions](#test-naming-conventions)
3. [When to Use Different Test Types](#when-to-use-different-test-types)
4. [Test Organization](#test-organization)
5. [Best Practices](#best-practices)
6. [Quality Metrics](#quality-metrics)"""
    
    def _valuable_test_section(self) -> str:
        """Define what makes a test valuable"""
        return """## What Makes a Test Valuable

A valuable test is one that provides measurable benefit to the project. Tests should be kept if they meet one or more of these criteria:

### 1. Bug Detection
- **Has caught real bugs**: The test has identified actual defects in the past
- **Prevents regressions**: The test verifies that previously fixed bugs don't reoccur
- **Covers edge cases**: The test validates behavior in unusual or boundary conditions

### 2. Unique Coverage
- **Tests unique code paths**: The test exercises code that no other test covers
- **Validates critical functionality**: The test verifies essential system behavior
- **Provides documentation**: The test serves as executable documentation of how the system works

### 3. Requirement Verification
- **Linked to requirements**: The test validates specific acceptance criteria from design documents
- **Validates business logic**: The test ensures core business rules are enforced
- **Verifies user workflows**: The test confirms that user-facing features work correctly

### 4. Reliability
- **Deterministic**: The test produces consistent results for the same code state
- **Fast execution**: The test runs quickly enough for frequent execution
- **Clear failure messages**: When the test fails, it's obvious what went wrong

### Tests to Remove

Tests should be removed if they:
- Have **zero unique coverage** (other tests cover the same code)
- Are **not linked to any requirements**
- Have **never caught a bug** and test trivial functionality
- Are **obsolete** (test code that no longer exists)
- Are **duplicates** of other tests without adding value"""
    
    def _naming_conventions_section(self) -> str:
        """Define test naming conventions"""
        return """## Test Naming Conventions

Clear, consistent naming makes tests easier to understand and maintain.

### Python (pytest) Naming

**Test Files:**
- Use `test_` prefix: `test_user_authentication.py`
- Match the module being tested: `user_auth.py` → `test_user_auth.py`
- Place in parallel directory structure: `src/auth/user.py` → `tests/auth/test_user.py`

**Test Functions:**
- Use `test_` prefix: `def test_user_login_with_valid_credentials():`
- Be descriptive: Include what is being tested and the expected outcome
- Use underscores for readability: `test_calculate_total_with_discount`

**Examples:**
```python
# Good
def test_user_login_succeeds_with_valid_credentials():
    # Test that users can log in with correct username and password
    pass

def test_user_login_fails_with_invalid_password():
    # Test that login is rejected when password is incorrect
    pass

# Bad
def test_login():  # Too vague
    pass

def test_user_login_1():  # Numbered tests are unclear
    pass
```

### TypeScript (vitest) Naming

**Test Files:**
- Use `.test.ts` or `.test.tsx` suffix: `UserAuth.test.ts`
- Co-locate with source files when possible: `UserAuth.tsx` and `UserAuth.test.tsx` in same directory
- Use PascalCase for component tests: `UserProfile.test.tsx`

**Test Descriptions:**
- Use descriptive strings in `describe()` and `it()` blocks
- Follow "should" pattern: `it('should validate email format')`
- Group related tests with `describe()` blocks

**Examples:**
```typescript
// Good
describe('UserAuthentication', () => {
  describe('login', () => {
    it('should succeed with valid credentials', () => {
      // test implementation
    });
    
    it('should fail with invalid password', () => {
      // test implementation
    });
  });
});

// Bad
describe('test', () => {
  it('works', () => {  // Too vague
    // test implementation
  });
});
```

### General Naming Principles

1. **Be specific**: Name should indicate what is being tested
2. **Include expected outcome**: Name should indicate what should happen
3. **Avoid abbreviations**: Use full words for clarity
4. **Use consistent patterns**: Follow the same structure across all tests
5. **Keep it readable**: Names should read like sentences"""
    
    def _test_types_section(self) -> str:
        """Define when to use different test types"""
        return """## When to Use Different Test Types

Different types of tests serve different purposes. Choose the right type for what you're testing.

### Unit Tests

**When to use:**
- Testing individual functions or methods in isolation
- Validating business logic and calculations
- Testing edge cases and boundary conditions
- Verifying error handling

**Characteristics:**
- Fast execution (milliseconds)
- No external dependencies (use mocks/stubs)
- Test one thing at a time
- Should be deterministic

**Example scenarios:**
- Testing a function that calculates discounts
- Validating input validation logic
- Testing data transformation functions
- Verifying error messages

### Integration Tests

**When to use:**
- Testing how multiple components work together
- Validating database interactions
- Testing API endpoints
- Verifying file system operations

**Characteristics:**
- Slower than unit tests (seconds)
- May use real dependencies (databases, files)
- Test multiple components together
- May require setup/teardown

**Example scenarios:**
- Testing that a service correctly saves data to database
- Validating that API endpoints return correct responses
- Testing file upload and processing workflows
- Verifying authentication flows

### Property-Based Tests

**When to use:**
- Testing universal properties that should hold for all inputs
- Validating invariants (things that should always be true)
- Finding edge cases automatically
- Testing mathematical properties

**Characteristics:**
- Run many iterations with random inputs
- Find edge cases you didn't think of
- Validate properties rather than specific examples
- Complement unit tests

**Example scenarios:**
- Testing that serialization/deserialization is reversible
- Validating that sorting produces ordered output
- Testing that encryption/decryption round-trips
- Verifying mathematical properties (commutativity, associativity)

### End-to-End Tests

**When to use:**
- Testing complete user workflows
- Validating critical business processes
- Testing across system boundaries
- Smoke testing deployments

**Characteristics:**
- Slowest tests (minutes)
- Use real system components
- Test from user perspective
- Should be minimal (only critical paths)

**Example scenarios:**
- Testing complete checkout process
- Validating user registration and login flow
- Testing report generation end-to-end
- Verifying deployment health

### Decision Matrix

| Test Type | Speed | Scope | When to Use |
|-----------|-------|-------|-------------|
| Unit | Fast (ms) | Single function/class | Business logic, calculations, validation |
| Integration | Medium (sec) | Multiple components | Database, API, file operations |
| Property-Based | Medium (sec) | Universal properties | Invariants, mathematical properties |
| End-to-End | Slow (min) | Complete system | Critical user workflows |

**General Rule:** Write mostly unit tests, some integration tests, few end-to-end tests (test pyramid)."""
    
    def _test_organization_section(self) -> str:
        """Define test organization standards"""
        return """## Test Organization

Organize tests to make them easy to find and maintain.

### Directory Structure

**Python Tests:**
```
tests/
├── unit/                    # Unit tests
│   ├── test_user_auth.py
│   └── test_calculations.py
├── integration/             # Integration tests
│   ├── test_database.py
│   └── test_api.py
├── property/                # Property-based tests
│   └── test_properties.py
├── fixtures/                # Shared test fixtures
│   ├── sample_data/
│   └── conftest.py
└── __init__.py
```

**TypeScript Tests:**
```
src/
├── components/
│   ├── UserProfile.tsx
│   └── UserProfile.test.tsx    # Co-located with component
├── services/
│   ├── api.ts
│   └── api.test.ts
└── __tests__/                  # Alternative: centralized tests
    ├── integration/
    └── e2e/
```

### File Organization

**Within Test Files:**
1. Imports at the top
2. Fixtures and test data
3. Setup/teardown functions
4. Test functions grouped by feature
5. Helper functions at the bottom

**Example:**
```python
# Imports
import pytest
from myapp import UserAuth

# Fixtures
@pytest.fixture
def valid_user():
    return {"username": "test", "password": "pass123"}

# Tests grouped by feature
class TestUserLogin:
    def test_login_with_valid_credentials(self, valid_user):
        pass
    
    def test_login_with_invalid_credentials(self):
        pass

class TestUserLogout:
    def test_logout_clears_session(self):
        pass

# Helper functions
def create_test_user(username, password):
    pass
```"""
    
    def _best_practices_section(self) -> str:
        """Define testing best practices"""
        return """## Best Practices

Follow these practices to maintain a high-quality test suite.

### 1. Test Behavior, Not Implementation

**Good:**
```python
def test_user_can_login_with_valid_credentials():
    result = auth.login("user", "pass")
    assert result.is_authenticated
```

**Bad:**
```python
def test_login_calls_database_query():
    # Testing implementation details
    auth.login("user", "pass")
    assert mock_db.query.called
```

### 2. Use Descriptive Assertions

**Good:**
```python
assert user.age >= 18, f"User age {user.age} is below minimum 18"
```

**Bad:**
```python
assert user.age >= 18  # What does this test?
```

### 3. One Logical Assertion Per Test

**Good:**
```python
def test_user_creation_sets_username():
    user = User("john")
    assert user.username == "john"

def test_user_creation_sets_default_role():
    user = User("john")
    assert user.role == "member"
```

**Bad:**
```python
def test_user_creation():
    user = User("john")
    assert user.username == "john"
    assert user.role == "member"
    assert user.is_active
    assert user.created_at is not None
```

### 4. Avoid Test Interdependence

**Good:**
```python
def test_user_login():
    user = create_test_user()  # Each test creates its own data
    result = auth.login(user.username, "password")
    assert result.success
```

**Bad:**
```python
# test_1 must run before test_2
def test_1_create_user():
    global test_user
    test_user = create_user()

def test_2_login_user():
    result = auth.login(test_user.username, "password")
```

### 5. Use Fixtures for Common Setup

**Good:**
```python
@pytest.fixture
def authenticated_user():
    user = create_test_user()
    auth.login(user.username, "password")
    return user

def test_user_can_update_profile(authenticated_user):
    result = authenticated_user.update_profile({"bio": "New bio"})
    assert result.success
```

### 6. Make Tests Deterministic

**Good:**
```python
def test_user_creation_timestamp():
    fixed_time = datetime(2024, 1, 1, 12, 0, 0)
    with freeze_time(fixed_time):
        user = User("john")
        assert user.created_at == fixed_time
```

**Bad:**
```python
def test_user_creation_timestamp():
    user = User("john")
    # This will fail randomly due to timing
    assert user.created_at == datetime.now()
```

### 7. Clean Up After Tests

**Good:**
```python
@pytest.fixture
def temp_file():
    file_path = Path("test_file.txt")
    file_path.write_text("test data")
    yield file_path
    file_path.unlink()  # Cleanup
```

### 8. Test Edge Cases

Always test:
- Empty inputs (empty strings, empty lists, None)
- Boundary values (0, -1, maximum values)
- Invalid inputs (wrong types, malformed data)
- Error conditions (network failures, permission errors)"""
    
    def _quality_metrics_section(self) -> str:
        """Define quality metrics for tests"""
        return """## Quality Metrics

Use these metrics to evaluate test suite quality.

### Coverage Metrics

**Target:** 90% code coverage minimum
- **Line coverage**: Percentage of code lines executed by tests
- **Branch coverage**: Percentage of conditional branches tested
- **Function coverage**: Percentage of functions called by tests

**Note:** 100% coverage doesn't guarantee quality. Focus on meaningful tests.

### Reliability Metrics

**Target:** 100% pass rate over 100 consecutive runs
- **Flakiness rate**: Percentage of tests that fail intermittently
- **Failure rate**: Percentage of test runs that fail
- **Determinism**: Tests produce same results with same inputs

**Action:** Any test with >0% flakiness should be fixed immediately.

### Performance Metrics

**Targets:**
- Unit tests: < 100ms per test
- Integration tests: < 5 seconds per test
- Full suite: < 5 minutes total

**Action:** Tests exceeding targets should be optimized or moved to slower test category.

### Maintenance Metrics

**Targets:**
- Test-to-code ratio: 1:1 to 2:1 (test code should be similar size to production code)
- Unique coverage: Every test should provide some unique coverage
- Requirement linkage: Critical tests should link to requirements

### Quality Checklist

Before committing tests, verify:
- [ ] Tests have descriptive names
- [ ] Tests are deterministic (no random data, timing dependencies)
- [ ] Tests clean up after themselves
- [ ] Tests are independent (can run in any order)
- [ ] Tests have clear assertions with messages
- [ ] Tests follow naming conventions
- [ ] Tests are in correct directory
- [ ] Tests run quickly (or are marked as slow)
- [ ] Tests provide unique value

---

**Remember:** The goal is not to have many tests, but to have valuable tests that catch bugs, prevent regressions, and document expected behavior."""
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate summary of standards document generation"""
        return {
            "document_generated": True,
            "output_path": str(self.output_dir / "TESTING_STANDARDS.md"),
            "sections_included": [
                "What Makes a Test Valuable",
                "Test Naming Conventions",
                "When to Use Different Test Types",
                "Test Organization",
                "Best Practices",
                "Quality Metrics"
            ],
            "requirements_addressed": ["7.1", "7.4", "7.5"]
        }
