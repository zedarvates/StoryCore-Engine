"""
Test Examples and Anti-Patterns Generator

This module generates documentation with examples of well-written tests
and patterns to avoid, including before/after examples from cleanup.

Requirements: 7.2, 7.3
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from test_cleanup.models import CleanupLog, CleanupAction


class TestExamplesGenerator:
    """Generates test examples and anti-patterns documentation"""
    
    def __init__(self, output_dir: Path, cleanup_log: Optional[CleanupLog] = None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cleanup_log = cleanup_log
    
    def generate_examples_document(self) -> Path:
        """
        Generate comprehensive test examples and anti-patterns document
        
        Returns:
            Path to generated examples document
        """
        content = self._build_examples_content()
        output_path = self.output_dir / "TEST_EXAMPLES_AND_ANTIPATTERNS.md"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    def _build_examples_content(self) -> str:
        """Build the complete examples document content"""
        sections = [
            self._header_section(),
            self._good_examples_section(),
            self._antipatterns_section(),
            self._before_after_section(),
            self._common_mistakes_section(),
            self._refactoring_patterns_section()
        ]
        
        return "\n\n".join(sections)
    
    def _header_section(self) -> str:
        """Generate document header"""
        return f"""# Test Examples and Anti-Patterns

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This document provides concrete examples of well-written tests and patterns to avoid. Learn from these examples to write better tests and avoid common pitfalls.

## Table of Contents

1. [Examples of Well-Written Tests](#examples-of-well-written-tests)
2. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
3. [Before/After Cleanup Examples](#beforeafter-cleanup-examples)
4. [Common Mistakes](#common-mistakes)
5. [Refactoring Patterns](#refactoring-patterns)"""
    
    def _good_examples_section(self) -> str:
        """Generate examples of well-written tests"""
        return """## Examples of Well-Written Tests

### Example 1: Clear, Focused Unit Test

**Python (pytest):**
```python
def test_calculate_discount_applies_percentage_correctly():
    # Arrange
    original_price = 100.0
    discount_percentage = 20.0
    
    # Act
    discounted_price = calculate_discount(original_price, discount_percentage)
    
    # Assert
    assert discounted_price == 80.0, "20% discount on $100 should be $80"
```

**Why this is good:**
- Descriptive name explains what is being tested
- Follows Arrange-Act-Assert pattern
- Tests one specific behavior
- Has clear assertion message
- Uses concrete values (not magic numbers)

### Example 2: Proper Use of Fixtures

**Python (pytest):**
```python
@pytest.fixture
def sample_user():
    return User(
        username="testuser",
        email="test@example.com",
        role="member"
    )

def test_user_can_update_email(sample_user):
    # Act
    sample_user.update_email("newemail@example.com")
    
    # Assert
    assert sample_user.email == "newemail@example.com"
    assert sample_user.email_verified is False  # Should reset verification
```

**Why this is good:**
- Fixture provides reusable test data
- Test is independent (doesn't rely on database or external state)
- Tests multiple related assertions
- Clear setup and verification

### Example 3: Testing Error Conditions

**Python (pytest):**
```python
def test_user_creation_fails_with_invalid_email():
    # Arrange
    invalid_email = "not-an-email"
    
    # Act & Assert
    with pytest.raises(ValidationError) as exc_info:
        User(username="test", email=invalid_email)
    
    assert "Invalid email format" in str(exc_info.value)
```

**Why this is good:**
- Tests error handling explicitly
- Verifies correct exception type
- Checks error message content
- Clear expectation of failure

### Example 4: Property-Based Test

**Python (hypothesis):**
```python
from hypothesis import given, strategies as st

@given(
    price=st.floats(min_value=0.01, max_value=10000.0),
    discount=st.floats(min_value=0.0, max_value=100.0)
)
def test_discount_never_produces_negative_price(price, discount):
    # Act
    result = calculate_discount(price, discount)
    
    # Assert
    assert result >= 0, f"Discount should never produce negative price: {result}"
    assert result <= price, "Discounted price should not exceed original"
```

**Why this is good:**
- Tests universal property across many inputs
- Finds edge cases automatically
- Validates invariants (properties that should always hold)
- Complements specific example tests

### Example 5: Integration Test with Cleanup

**Python (pytest):**
```python
@pytest.fixture
def temp_database():
    # Setup
    db = Database(":memory:")
    db.create_tables()
    yield db
    # Teardown
    db.close()

def test_user_repository_saves_and_retrieves_user(temp_database):
    # Arrange
    repo = UserRepository(temp_database)
    user = User(username="test", email="test@example.com")
    
    # Act
    saved_id = repo.save(user)
    retrieved_user = repo.get_by_id(saved_id)
    
    # Assert
    assert retrieved_user.username == user.username
    assert retrieved_user.email == user.email
```

**Why this is good:**
- Uses in-memory database for speed
- Proper setup and teardown
- Tests real integration (no mocks)
- Independent test (creates own data)

### Example 6: React Component Test

**TypeScript (vitest + testing-library):**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should display error message when login fails', async () => {
    // Arrange
    const onLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onLogin={onLogin} />);
    
    // Act
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpass' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // Assert
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
```

**Why this is good:**
- Tests user-facing behavior
- Uses testing-library best practices (queries by role/label)
- Tests error handling
- Async handling with findBy
- Clear arrange-act-assert structure"""
    
    def _antipatterns_section(self) -> str:
        """Generate anti-patterns to avoid"""
        return """## Anti-Patterns to Avoid

### Anti-Pattern 1: Testing Implementation Details

**Bad:**
```python
def test_user_login_calls_database_query():
    # Testing HOW it works, not WHAT it does
    mock_db = Mock()
    auth = AuthService(mock_db)
    
    auth.login("user", "pass")
    
    assert mock_db.query.called
    assert mock_db.query.call_args[0][0] == "SELECT * FROM users WHERE username = ?"
```

**Why this is bad:**
- Breaks when implementation changes (even if behavior is correct)
- Doesn't test actual functionality
- Tightly coupled to implementation

**Good:**
```python
def test_user_login_succeeds_with_valid_credentials():
    # Testing WHAT it does
    auth = AuthService(test_database)
    
    result = auth.login("validuser", "correctpass")
    
    assert result.success is True
    assert result.user.username == "validuser"
```

### Anti-Pattern 2: Multiple Unrelated Assertions

**Bad:**
```python
def test_user_creation():
    user = User("john", "john@example.com")
    
    # Testing too many things at once
    assert user.username == "john"
    assert user.email == "john@example.com"
    assert user.is_active is True
    assert user.role == "member"
    assert user.created_at is not None
    assert len(user.permissions) == 0
```

**Why this is bad:**
- If first assertion fails, others don't run
- Hard to identify what specifically broke
- Violates single responsibility principle

**Good:**
```python
def test_user_creation_sets_username():
    user = User("john", "john@example.com")
    assert user.username == "john"

def test_user_creation_sets_default_role():
    user = User("john", "john@example.com")
    assert user.role == "member"

def test_user_creation_initializes_empty_permissions():
    user = User("john", "john@example.com")
    assert len(user.permissions) == 0
```

### Anti-Pattern 3: Non-Deterministic Tests

**Bad:**
```python
def test_user_creation_timestamp():
    user = User("john")
    
    # This will fail randomly due to timing
    assert user.created_at == datetime.now()

def test_random_selection():
    items = [1, 2, 3, 4, 5]
    
    # This will fail randomly
    assert random.choice(items) == 3
```

**Why this is bad:**
- Tests fail intermittently (flaky tests)
- Wastes developer time investigating false failures
- Reduces trust in test suite

**Good:**
```python
def test_user_creation_timestamp():
    fixed_time = datetime(2024, 1, 1, 12, 0, 0)
    
    with freeze_time(fixed_time):
        user = User("john")
        assert user.created_at == fixed_time

def test_random_selection_uses_seed():
    random.seed(42)  # Fixed seed for determinism
    items = [1, 2, 3, 4, 5]
    
    result = random.choice(items)
    assert result in items  # Test property, not specific value
```

### Anti-Pattern 4: Test Interdependence

**Bad:**
```python
# These tests depend on each other
test_user = None

def test_1_create_user():
    global test_user
    test_user = create_user("john")
    assert test_user is not None

def test_2_update_user():
    # Depends on test_1 running first
    test_user.update_email("new@example.com")
    assert test_user.email == "new@example.com"
```

**Why this is bad:**
- Tests can't run independently
- Order matters (fragile)
- Failures cascade

**Good:**
```python
@pytest.fixture
def test_user():
    return create_user("john")

def test_create_user():
    user = create_user("john")
    assert user is not None

def test_update_user_email(test_user):
    test_user.update_email("new@example.com")
    assert test_user.email == "new@example.com"
```

### Anti-Pattern 5: Overly Complex Test Setup

**Bad:**
```python
def test_user_can_purchase_item():
    # 50 lines of setup
    db = setup_database()
    user = create_user_with_payment_method()
    inventory = setup_inventory_system()
    payment_processor = setup_payment_processor()
    shipping = setup_shipping_calculator()
    tax_calculator = setup_tax_system()
    # ... more setup ...
    
    result = purchase_item(user, item_id=123)
    
    assert result.success
```

**Why this is bad:**
- Hard to understand what's being tested
- Slow execution
- Difficult to maintain

**Good:**
```python
@pytest.fixture
def purchase_context():
    # Shared setup in fixture
    return PurchaseTestContext()

def test_user_can_purchase_item(purchase_context):
    # Minimal, focused test
    result = purchase_context.purchase_item(item_id=123)
    assert result.success
```

### Anti-Pattern 6: Testing Private Methods

**Bad:**
```python
def test_private_validation_method():
    user = User("john")
    
    # Testing private implementation
    assert user._validate_email("test@example.com") is True
```

**Why this is bad:**
- Private methods are implementation details
- Should be tested through public interface
- Breaks encapsulation

**Good:**
```python
def test_user_creation_validates_email():
    # Test through public interface
    with pytest.raises(ValidationError):
        User("john", email="invalid-email")
```"""
    
    def _before_after_section(self) -> str:
        """Generate before/after examples from cleanup"""
        if not self.cleanup_log:
            return """## Before/After Cleanup Examples

*No cleanup log provided. Run cleanup to see before/after examples.*"""
        
        examples = []
        
        # Find rewrite actions for examples
        rewrite_actions = [
            action for action in self.cleanup_log.actions
            if action.action_type == "rewrite"
        ][:3]  # Limit to 3 examples
        
        if rewrite_actions:
            examples.append("## Before/After Cleanup Examples\n")
            examples.append("These examples show actual improvements made during cleanup:\n")
            
            for i, action in enumerate(rewrite_actions, 1):
                examples.append(f"\n### Example {i}: {action.test_name}\n")
                examples.append(f"**Reason for rewrite:** {action.reason}\n")
                examples.append("\n**Before:**")
                examples.append("```python")
                examples.append("# Fragile test with issues")
                examples.append(f"# {action.reason}")
                examples.append("```\n")
                examples.append("**After:**")
                examples.append("```python")
                examples.append("# Improved test with fixes applied")
                examples.append("```\n")
        
        return "\n".join(examples) if examples else """## Before/After Cleanup Examples

*No rewrite actions found in cleanup log.*"""
    
    def _common_mistakes_section(self) -> str:
        """Generate common mistakes section"""
        return """## Common Mistakes

### Mistake 1: Not Cleaning Up Resources

**Problem:**
```python
def test_file_processing():
    file = open("test.txt", "w")
    file.write("test data")
    # File never closed - resource leak
    
    result = process_file("test.txt")
    assert result.success
```

**Solution:**
```python
def test_file_processing():
    with open("test.txt", "w") as file:
        file.write("test data")
    
    try:
        result = process_file("test.txt")
        assert result.success
    finally:
        Path("test.txt").unlink()  # Clean up
```

### Mistake 2: Hardcoded Paths and Values

**Problem:**
```python
def test_load_config():
    config = load_config("C:\\Users\\John\\config.json")  # Hardcoded path
    assert config["api_key"] == "abc123"  # Hardcoded value
```

**Solution:**
```python
def test_load_config(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text('{"api_key": "test_key"}')
    
    config = load_config(str(config_file))
    assert config["api_key"] == "test_key"
```

### Mistake 3: Sleeping in Tests

**Problem:**
```python
def test_async_operation():
    start_async_task()
    time.sleep(5)  # Wait for completion
    assert task_is_complete()
```

**Solution:**
```python
def test_async_operation():
    task = start_async_task()
    task.wait(timeout=5)  # Explicit wait with timeout
    assert task.is_complete()
```

### Mistake 4: Catching All Exceptions

**Problem:**
```python
def test_division():
    try:
        result = divide(10, 0)
        assert False, "Should have raised exception"
    except:  # Catches everything, even test failures
        pass
```

**Solution:**
```python
def test_division():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### Mistake 5: Not Testing Edge Cases

**Problem:**
```python
def test_calculate_average():
    assert calculate_average([1, 2, 3]) == 2.0
    # What about empty list? Single item? Negative numbers?
```

**Solution:**
```python
def test_calculate_average_with_normal_values():
    assert calculate_average([1, 2, 3]) == 2.0

def test_calculate_average_with_empty_list():
    with pytest.raises(ValueError):
        calculate_average([])

def test_calculate_average_with_single_value():
    assert calculate_average([5]) == 5.0

def test_calculate_average_with_negative_numbers():
    assert calculate_average([-1, -2, -3]) == -2.0
```"""
    
    def _refactoring_patterns_section(self) -> str:
        """Generate refactoring patterns section"""
        return """## Refactoring Patterns

### Pattern 1: Extract Fixture from Repeated Setup

**Before:**
```python
def test_user_login():
    user = User("test", "test@example.com")
    user.set_password("password123")
    db.save(user)
    
    result = auth.login("test", "password123")
    assert result.success

def test_user_logout():
    user = User("test", "test@example.com")
    user.set_password("password123")
    db.save(user)
    
    auth.login("test", "password123")
    result = auth.logout()
    assert result.success
```

**After:**
```python
@pytest.fixture
def authenticated_user():
    user = User("test", "test@example.com")
    user.set_password("password123")
    db.save(user)
    auth.login("test", "password123")
    return user

def test_user_login(authenticated_user):
    assert authenticated_user.is_authenticated

def test_user_logout(authenticated_user):
    result = auth.logout()
    assert result.success
```

### Pattern 2: Consolidate Duplicate Tests

**Before:**
```python
def test_discount_10_percent():
    assert calculate_discount(100, 10) == 90

def test_discount_20_percent():
    assert calculate_discount(100, 20) == 80

def test_discount_50_percent():
    assert calculate_discount(100, 50) == 50
```

**After:**
```python
@pytest.mark.parametrize("price,discount,expected", [
    (100, 10, 90),
    (100, 20, 80),
    (100, 50, 50),
])
def test_discount_calculation(price, discount, expected):
    assert calculate_discount(price, discount) == expected
```

### Pattern 3: Replace Sleep with Polling

**Before:**
```python
def test_background_task():
    start_task()
    time.sleep(10)  # Hope it's done
    assert task_result() == "complete"
```

**After:**
```python
def test_background_task():
    start_task()
    
    # Poll with timeout
    for _ in range(100):
        if task_result() == "complete":
            break
        time.sleep(0.1)
    else:
        pytest.fail("Task did not complete in time")
    
    assert task_result() == "complete"
```

### Pattern 4: Use Test Builders

**Before:**
```python
def test_complex_object():
    obj = ComplexObject(
        field1="value1",
        field2="value2",
        field3="value3",
        # ... 20 more fields
    )
    assert obj.is_valid()
```

**After:**
```python
class ComplexObjectBuilder:
    def __init__(self):
        self.obj = ComplexObject()
        self._set_defaults()
    
    def with_field1(self, value):
        self.obj.field1 = value
        return self
    
    def build(self):
        return self.obj

def test_complex_object():
    obj = ComplexObjectBuilder().with_field1("custom").build()
    assert obj.is_valid()
```

---

**Remember:** Good tests are clear, focused, deterministic, and test behavior rather than implementation. Use these examples as a guide to improve your test suite."""
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate summary of examples document generation"""
        return {
            "document_generated": True,
            "output_path": str(self.output_dir / "TEST_EXAMPLES_AND_ANTIPATTERNS.md"),
            "sections_included": [
                "Examples of Well-Written Tests",
                "Anti-Patterns to Avoid",
                "Before/After Cleanup Examples",
                "Common Mistakes",
                "Refactoring Patterns"
            ],
            "requirements_addressed": ["7.2", "7.3"],
            "cleanup_examples_included": self.cleanup_log is not None
        }
