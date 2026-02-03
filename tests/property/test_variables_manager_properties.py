"""
Property-based tests for VariablesManager.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime
from hypothesis import given, strategies as st, settings

from src.memory_system.variables_manager import VariablesManager
from src.memory_system.data_models import Variable, Variables


# Strategy for generating variable names
def variable_name_strategy():
    """Generate valid variable names."""
    return st.text(
        min_size=1,
        max_size=50,
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='_-'
        )
    ).filter(lambda x: x and x[0].isalpha())


# Strategy for generating variable values by type
def variable_value_strategy(var_type):
    """Generate values based on variable type."""
    if var_type == 'string':
        return st.text(min_size=0, max_size=200)
    elif var_type == 'number':
        return st.one_of(
            st.integers(min_value=-1000000, max_value=1000000),
            st.floats(min_value=-1000000.0, max_value=1000000.0, allow_nan=False, allow_infinity=False)
        )
    elif var_type == 'boolean':
        return st.booleans()
    elif var_type == 'array':
        return st.lists(
            st.one_of(
                st.text(min_size=0, max_size=50),
                st.integers(min_value=-1000, max_value=1000),
                st.booleans()
            ),
            min_size=0,
            max_size=20
        )
    elif var_type == 'object':
        return st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(
                st.text(min_size=0, max_size=50),
                st.integers(min_value=-1000, max_value=1000),
                st.booleans()
            ),
            min_size=0,
            max_size=10
        )
    else:
        return st.text(min_size=0, max_size=200)


# Strategy for generating variable types
def variable_type_strategy():
    """Generate valid variable types."""
    return st.sampled_from(['string', 'number', 'boolean', 'array', 'object'])


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    # Create assistant directory
    (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
    # Create build_logs directory for BuildLogger
    (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 62: Variables Key-Value Structure
@settings(max_examples=100, deadline=None)
@given(
    variables=st.dictionaries(
        variable_name_strategy(),
        st.tuples(
            variable_type_strategy(),
            st.text(min_size=0, max_size=100)  # description
        ),
        min_size=1,  # At least one variable
        max_size=20
    ),
    data=st.data()
)
def test_property_variables_key_value_structure(variables, data):
    """
    Property 62: Variables Key-Value Structure
    
    For any variables.json, it SHALL maintain a key-value structure for project parameters.
    
    Validates: Requirements 15.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variables
        for name, (var_type, description) in variables.items():
            value = data.draw(variable_value_strategy(var_type))
            result = manager.set_variable(name, value, var_type, description, trigger_log=False)
            assert result is True, f"Setting variable {name} should succeed"
        
        # Verify: Variables file exists
        variables_path = temp_path / "assistant" / "variables.json"
        assert variables_path.exists(), "Variables file should be created"
        
        # Verify: File contains valid JSON
        with open(variables_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Verify: Has key-value structure
        assert 'variables' in data, "Should have 'variables' key"
        assert isinstance(data['variables'], dict), "Variables should be a dictionary"
        
        # Verify: Each variable has required fields
        for name in variables.keys():
            if name in data['variables']:
                var_data = data['variables'][name]
                assert 'value' in var_data, f"Variable {name} should have 'value' field"
                assert 'type' in var_data, f"Variable {name} should have 'type' field"
                assert 'description' in var_data, f"Variable {name} should have 'description' field"
                assert 'last_modified' in var_data, f"Variable {name} should have 'last_modified' field"
        
        # Verify: Can retrieve variables
        retrieved = manager.list_variables()
        assert isinstance(retrieved, dict), "list_variables should return a dictionary"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 63: Variable Type Validation
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    var_type=variable_type_strategy(),
    data=st.data()
)
def test_property_variable_type_validation(name, var_type, data):
    """
    Property 63: Variable Type Validation
    
    For any variable update, the data type and value SHALL be validated before writing.
    
    Validates: Requirements 15.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variable with correct type
        correct_value = data.draw(variable_value_strategy(var_type))
        result = manager.set_variable(name, correct_value, var_type, trigger_log=False)
        
        # Verify: Correct type is accepted
        assert result is True, f"Setting variable with correct type {var_type} should succeed"
        
        # Verify: Variable was stored
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Variable should be retrievable"
        assert retrieved.type == var_type, f"Variable type should be {var_type}"
        
        # Execute: Try to set with wrong type (type mismatch)
        # Generate a value of a different type
        wrong_types = [t for t in ['string', 'number', 'boolean', 'array', 'object'] if t != var_type]
        if wrong_types:
            wrong_type = wrong_types[0]
            wrong_value = data.draw(variable_value_strategy(wrong_type))
            
            # Try to set with declared type but wrong value type
            result_wrong = manager.set_variable(name, wrong_value, var_type, trigger_log=False)
            
            # Verify: Wrong type is rejected
            assert result_wrong is False, \
                f"Setting variable with wrong value type should fail (expected {var_type}, got {wrong_type})"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 64: Variable Change Logging
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    var_type=variable_type_strategy(),
    data=st.data()
)
def test_property_variable_change_logging(name, var_type, data):
    """
    Property 64: Variable Change Logging
    
    For any modification to variables.json, the change SHALL be logged to build_steps_raw.log.
    
    Validates: Requirements 15.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set initial value
        initial_value = data.draw(variable_value_strategy(var_type))
        manager.set_variable(name, initial_value, var_type, trigger_log=False)
        
        # Execute: Update value (with logging enabled)
        new_value = data.draw(variable_value_strategy(var_type))
        result = manager.set_variable(name, new_value, var_type, trigger_log=True)
        
        # Verify: Update succeeded
        assert result is True, "Variable update should succeed"
        
        # Verify: Build log exists
        log_path = temp_path / "build_logs" / "build_steps_raw.log"
        assert log_path.exists(), "Build log should be created"
        
        # Verify: Log contains variable change entry
        with open(log_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        assert len(log_content) > 0, "Build log should not be empty"
        assert "VARIABLE_CHANGE" in log_content, "Log should contain VARIABLE_CHANGE action"
        assert name in log_content, f"Log should contain variable name {name}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 65: Variable Type Support
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    string_val=st.text(min_size=0, max_size=100),
    number_val=st.one_of(st.integers(), st.floats(allow_nan=False, allow_infinity=False)),
    boolean_val=st.booleans(),
    array_val=st.lists(st.text(min_size=0, max_size=20), min_size=0, max_size=10)
)
def test_property_variable_type_support(name, string_val, number_val, boolean_val, array_val):
    """
    Property 65: Variable Type Support
    
    For any variable, it SHALL support string, number, boolean, and array data types.
    
    Validates: Requirements 15.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute & Verify: String type
        result_string = manager.set_variable(f"{name}_string", string_val, 'string', trigger_log=False)
        assert result_string is True, "String variable should be set successfully"
        retrieved_string = manager.get_variable(f"{name}_string")
        assert retrieved_string is not None, "String variable should be retrievable"
        assert retrieved_string.type == 'string', "Variable type should be string"
        assert retrieved_string.value == string_val, "String value should match"
        
        # Execute & Verify: Number type
        result_number = manager.set_variable(f"{name}_number", number_val, 'number', trigger_log=False)
        assert result_number is True, "Number variable should be set successfully"
        retrieved_number = manager.get_variable(f"{name}_number")
        assert retrieved_number is not None, "Number variable should be retrievable"
        assert retrieved_number.type == 'number', "Variable type should be number"
        assert retrieved_number.value == number_val, "Number value should match"
        
        # Execute & Verify: Boolean type
        result_boolean = manager.set_variable(f"{name}_boolean", boolean_val, 'boolean', trigger_log=False)
        assert result_boolean is True, "Boolean variable should be set successfully"
        retrieved_boolean = manager.get_variable(f"{name}_boolean")
        assert retrieved_boolean is not None, "Boolean variable should be retrievable"
        assert retrieved_boolean.type == 'boolean', "Variable type should be boolean"
        assert retrieved_boolean.value == boolean_val, "Boolean value should match"
        
        # Execute & Verify: Array type
        result_array = manager.set_variable(f"{name}_array", array_val, 'array', trigger_log=False)
        assert result_array is True, "Array variable should be set successfully"
        retrieved_array = manager.get_variable(f"{name}_array")
        assert retrieved_array is not None, "Array variable should be retrievable"
        assert retrieved_array.type == 'array', "Variable type should be array"
        assert retrieved_array.value == array_val, "Array value should match"
        
        # Verify: All variables are in the list
        all_vars = manager.list_variables()
        assert f"{name}_string" in all_vars, "String variable should be in list"
        assert f"{name}_number" in all_vars, "Number variable should be in list"
        assert f"{name}_boolean" in all_vars, "Boolean variable should be in list"
        assert f"{name}_array" in all_vars, "Array variable should be in list"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 66: Variable Read Structure
@settings(max_examples=100, deadline=None)
@given(
    variables=st.dictionaries(
        variable_name_strategy(),
        st.tuples(
            variable_type_strategy(),
            st.text(min_size=0, max_size=100)  # description
        ),
        min_size=1,
        max_size=10
    ),
    data=st.data()
)
def test_property_variable_read_structure(variables, data):
    """
    Property 66: Variable Read Structure
    
    For any variable read operation, values SHALL be provided in a structured format.
    
    Validates: Requirements 15.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variables
        for name, (var_type, description) in variables.items():
            value = data.draw(variable_value_strategy(var_type))
            manager.set_variable(name, value, var_type, description, trigger_log=False)
        
        # Verify: list_variables returns structured format
        all_vars = manager.list_variables()
        
        assert isinstance(all_vars, dict), "list_variables should return a dictionary"
        
        for name in variables.keys():
            if name in all_vars:
                var_data = all_vars[name]
                
                # Verify: Has all required fields
                assert 'value' in var_data, f"Variable {name} should have 'value' field"
                assert 'type' in var_data, f"Variable {name} should have 'type' field"
                assert 'description' in var_data, f"Variable {name} should have 'description' field"
                assert 'last_modified' in var_data, f"Variable {name} should have 'last_modified' field"
                
                # Verify: Field types are correct
                assert isinstance(var_data['type'], str), "Type should be a string"
                assert isinstance(var_data['description'], str), "Description should be a string"
                assert isinstance(var_data['last_modified'], str), "Last modified should be a string"
        
        # Verify: get_variables_for_llm returns formatted string
        llm_format = manager.get_variables_for_llm()
        
        assert isinstance(llm_format, str), "get_variables_for_llm should return a string"
        assert len(llm_format) > 0, "LLM format should not be empty"
        assert "PROJECT VARIABLES" in llm_format, "LLM format should have header"
        
        # Verify: Each variable appears in LLM format
        for name in variables.keys():
            assert name in llm_format, f"Variable {name} should appear in LLM format"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 62: Variables Key-Value Structure (Persistence)
@settings(max_examples=100, deadline=None)
@given(
    variables=st.dictionaries(
        variable_name_strategy(),
        st.tuples(
            variable_type_strategy(),
            st.text(min_size=0, max_size=100)
        ),
        min_size=1,
        max_size=10
    ),
    data=st.data()
)
def test_property_variables_persistence(variables, data):
    """
    Property 62 (Persistence): Variables Key-Value Structure
    
    For any variables set, they should persist across VariablesManager
    instances (file-based persistence).
    
    Validates: Requirements 15.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        # Execute: Set variables with first manager instance
        manager1 = VariablesManager(temp_path)
        for name, (var_type, description) in variables.items():
            value = data.draw(variable_value_strategy(var_type))
            manager1.set_variable(name, value, var_type, description, trigger_log=False)
        
        # Get variable count from first instance
        vars1 = manager1.list_variables()
        count1 = len(vars1)
        
        # Create new manager instance (simulating new session)
        manager2 = VariablesManager(temp_path)
        
        # Verify: Variables are still accessible
        vars2 = manager2.list_variables()
        count2 = len(vars2)
        
        assert count2 == count1, \
            f"Variable count should persist across instances: {count1} vs {count2}"
        
        # Verify: Variable values match
        for name in variables.keys():
            if name in vars1 and name in vars2:
                assert vars1[name]['type'] == vars2[name]['type'], \
                    f"Variable {name} type should match across instances"
                assert vars1[name]['value'] == vars2[name]['value'], \
                    f"Variable {name} value should match across instances"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 63: Variable Type Validation (Auto-detection)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    value=st.one_of(
        st.text(min_size=0, max_size=100),
        st.integers(min_value=-1000, max_value=1000),
        st.floats(min_value=-1000.0, max_value=1000.0, allow_nan=False, allow_infinity=False),
        st.booleans(),
        st.lists(st.text(min_size=0, max_size=20), min_size=0, max_size=10)
    )
)
def test_property_variable_type_auto_detection(name, value):
    """
    Property 63 (Auto-detection): Variable Type Validation
    
    For any variable set without explicit type, the type SHALL be
    automatically detected and validated.
    
    Validates: Requirements 15.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variable without explicit type (auto-detection)
        result = manager.set_variable(name, value, var_type=None, trigger_log=False)
        
        # Verify: Variable was set successfully
        assert result is True, "Variable with auto-detected type should be set successfully"
        
        # Verify: Type was correctly detected
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Variable should be retrievable"
        
        # Verify: Type matches the value type
        if isinstance(value, bool):
            assert retrieved.type == 'boolean', "Boolean should be detected"
        elif isinstance(value, (int, float)):
            assert retrieved.type == 'number', "Number should be detected"
        elif isinstance(value, list):
            assert retrieved.type == 'array', "Array should be detected"
        elif isinstance(value, dict):
            assert retrieved.type == 'object', "Object should be detected"
        else:
            assert retrieved.type == 'string', "String should be detected"
        
        # Verify: Value matches
        assert retrieved.value == value, "Value should match"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 64: Variable Change Logging (Deletion)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    var_type=variable_type_strategy(),
    data=st.data()
)
def test_property_variable_deletion_logging(name, var_type, data):
    """
    Property 64 (Deletion): Variable Change Logging
    
    For any variable deletion, the change SHALL be logged to build_steps_raw.log.
    
    Validates: Requirements 15.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variable
        value = data.draw(variable_value_strategy(var_type))
        manager.set_variable(name, value, var_type, trigger_log=False)
        
        # Execute: Delete variable
        result = manager.delete_variable(name)
        
        # Verify: Deletion succeeded
        assert result is True, "Variable deletion should succeed"
        
        # Verify: Build log exists
        log_path = temp_path / "build_logs" / "build_steps_raw.log"
        assert log_path.exists(), "Build log should be created"
        
        # Verify: Log contains deletion entry
        with open(log_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        assert len(log_content) > 0, "Build log should not be empty"
        assert "VARIABLE_CHANGE" in log_content, "Log should contain VARIABLE_CHANGE action"
        assert name in log_content, f"Log should contain variable name {name}"
        assert "<deleted>" in log_content, "Log should indicate deletion"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 65: Variable Type Support (Object Type)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    object_val=st.dictionaries(
        st.text(min_size=1, max_size=20),
        st.one_of(
            st.text(min_size=0, max_size=50),
            st.integers(min_value=-1000, max_value=1000),
            st.booleans()
        ),
        min_size=0,
        max_size=10
    )
)
def test_property_variable_object_type_support(name, object_val):
    """
    Property 65 (Object): Variable Type Support
    
    For any variable, it SHALL support object (dictionary) data type.
    
    Validates: Requirements 15.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set object variable
        result = manager.set_variable(name, object_val, 'object', trigger_log=False)
        
        # Verify: Object variable was set successfully
        assert result is True, "Object variable should be set successfully"
        
        # Verify: Variable is retrievable
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Object variable should be retrievable"
        assert retrieved.type == 'object', "Variable type should be object"
        assert retrieved.value == object_val, "Object value should match"
        
        # Verify: Object is in the list
        all_vars = manager.list_variables()
        assert name in all_vars, "Object variable should be in list"
        assert all_vars[name]['type'] == 'object', "Listed type should be object"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 66: Variable Read Structure (Empty Variables)
def test_property_variable_read_empty():
    """
    Property 66 (Empty): Variable Read Structure
    
    For an empty variables file, read operations should return empty
    structures gracefully.
    
    Validates: Requirements 15.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Read without setting any variables
        all_vars = manager.list_variables()
        
        # Verify: Returns empty dictionary
        assert all_vars == {}, "Empty variables should return empty dictionary"
        assert isinstance(all_vars, dict), "Should return a dictionary"
        
        # Verify: LLM format handles empty case
        llm_format = manager.get_variables_for_llm()
        assert isinstance(llm_format, str), "Should return a string"
        assert "No variables defined" in llm_format, "Should indicate no variables"
        
        # Verify: Count is zero
        count = manager.count()
        assert count == 0, "Count should be zero for empty variables"
        
        # Verify: get_all_names returns empty list
        names = manager.get_all_names()
        assert names == [], "Should return empty list"
        assert isinstance(names, list), "Should return a list"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 62: Variables Key-Value Structure (Helper Methods)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    initial_count=st.integers(min_value=0, max_value=100),
    increment=st.integers(min_value=1, max_value=10)
)
def test_property_variable_counter_operations(name, initial_count, increment):
    """
    Property 62 (Counter): Variables Key-Value Structure
    
    For any numeric variable, counter operations (increment) should
    maintain the key-value structure correctly.
    
    Validates: Requirements 15.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set initial counter
        manager.set_variable(name, initial_count, 'number', trigger_log=False)
        
        # Execute: Increment counter
        new_value = manager.increment_counter(name, increment)
        
        # Verify: Increment succeeded
        assert new_value is not None, "Increment should succeed"
        assert new_value == initial_count + increment, \
            f"New value should be {initial_count + increment}, got {new_value}"
        
        # Verify: Variable was updated
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Variable should be retrievable"
        assert retrieved.value == initial_count + increment, "Value should be updated"
        assert retrieved.type == 'number', "Type should remain number"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 62: Variables Key-Value Structure (List Operations)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    initial_list=st.lists(st.text(min_size=0, max_size=20), min_size=0, max_size=10),
    item_to_add=st.text(min_size=1, max_size=20)
)
def test_property_variable_list_operations(name, initial_list, item_to_add):
    """
    Property 62 (List): Variables Key-Value Structure
    
    For any array variable, list operations (append, remove) should
    maintain the key-value structure correctly.
    
    Validates: Requirements 15.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set initial list
        manager.set_variable(name, initial_list, 'array', trigger_log=False)
        
        # Execute: Append item
        new_list = manager.append_to_list(name, item_to_add)
        
        # Verify: Append succeeded
        assert new_list is not None, "Append should succeed"
        assert len(new_list) == len(initial_list) + 1, "List length should increase by 1"
        assert item_to_add in new_list, "New item should be in list"
        
        # Verify: Variable was updated
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Variable should be retrievable"
        assert item_to_add in retrieved.value, "New item should be in stored value"
        assert retrieved.type == 'array', "Type should remain array"
        
        # Execute: Remove item (only if it's in the list)
        if item_to_add in retrieved.value:
            # Count occurrences before removal
            count_before = retrieved.value.count(item_to_add)
            removed_list = manager.remove_from_list(name, item_to_add)
            
            # Verify: Remove succeeded
            assert removed_list is not None, "Remove should succeed"
            # After removal, there should be one less occurrence
            count_after = removed_list.count(item_to_add)
            assert count_after == count_before - 1, "Item occurrence should decrease by 1"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 63: Variable Type Validation (Unsupported Type)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    value=st.text(min_size=0, max_size=100)
)
def test_property_variable_unsupported_type_rejection(name, value):
    """
    Property 63 (Unsupported): Variable Type Validation
    
    For any variable with an unsupported type, the operation SHALL be rejected.
    
    Validates: Requirements 15.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Try to set variable with unsupported type
        unsupported_types = ['invalid', 'null', 'undefined', 'function', 'symbol']
        
        for unsupported_type in unsupported_types:
            result = manager.set_variable(name, value, unsupported_type, trigger_log=False)
            
            # Verify: Unsupported type is rejected
            assert result is False, \
                f"Setting variable with unsupported type '{unsupported_type}' should fail"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 66: Variable Read Structure (Get with Default)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    default_value=st.one_of(
        st.text(min_size=0, max_size=50),
        st.integers(min_value=-100, max_value=100),
        st.booleans(),
        st.lists(st.text(min_size=0, max_size=10), min_size=0, max_size=5)
    ),
    data=st.data()
)
def test_property_variable_get_with_default(name, default_value, data):
    """
    Property 66 (Default): Variable Read Structure
    
    For any non-existent variable, get_value with default should return
    the default value.
    
    Validates: Requirements 15.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Get non-existent variable with default
        value = manager.get_value(name, default=default_value)
        
        # Verify: Returns default value
        assert value == default_value, "Should return default value for non-existent variable"
        
        # Execute: Set variable
        actual_value = data.draw(st.text(min_size=1, max_size=50))
        manager.set_variable(name, actual_value, 'string', trigger_log=False)
        
        # Execute: Get existing variable with default
        value_after = manager.get_value(name, default=default_value)
        
        # Verify: Returns actual value, not default
        assert value_after == actual_value, "Should return actual value when variable exists"
        assert value_after != default_value or actual_value == default_value, \
            "Should not return default when variable exists"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 62: Variables Key-Value Structure (Nested Values)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    key_path=st.lists(
        st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
        min_size=1,
        max_size=3
    ),
    value=st.one_of(
        st.text(min_size=0, max_size=50),
        st.integers(min_value=-100, max_value=100),
        st.booleans()
    )
)
def test_property_variable_nested_operations(name, key_path, value):
    """
    Property 62 (Nested): Variables Key-Value Structure
    
    For any object variable, nested value operations should maintain
    the key-value structure correctly.
    
    Validates: Requirements 15.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set nested value
        result = manager.set_nested_value(name, key_path, value)
        
        # Verify: Set succeeded
        assert result is True, "Setting nested value should succeed"
        
        # Verify: Variable exists
        retrieved = manager.get_variable(name)
        assert retrieved is not None, "Variable should be retrievable"
        assert retrieved.type == 'object', "Variable type should be object"
        
        # Execute: Get nested value
        retrieved_value = manager.get_nested_value(name, key_path)
        
        # Verify: Retrieved value matches
        assert retrieved_value == value, \
            f"Retrieved nested value should match: expected {value}, got {retrieved_value}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 66: Variable Read Structure (Exists Check)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    var_type=variable_type_strategy(),
    data=st.data()
)
def test_property_variable_exists_check(name, var_type, data):
    """
    Property 66 (Exists): Variable Read Structure
    
    For any variable, exists() should correctly report whether it exists.
    
    Validates: Requirements 15.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Verify: Variable doesn't exist initially
        assert manager.exists(name) is False, "Variable should not exist initially"
        
        # Execute: Set variable
        value = data.draw(variable_value_strategy(var_type))
        manager.set_variable(name, value, var_type, trigger_log=False)
        
        # Verify: Variable exists after setting
        assert manager.exists(name) is True, "Variable should exist after setting"
        
        # Execute: Delete variable
        manager.delete_variable(name)
        
        # Verify: Variable doesn't exist after deletion
        assert manager.exists(name) is False, "Variable should not exist after deletion"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 64: Variable Change Logging (Clear All)
def test_property_variable_clear_all_logging():
    """
    Property 64 (Clear): Variable Change Logging
    
    For clearing all variables, the operation SHALL be logged to build_steps_raw.log.
    
    Validates: Requirements 15.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set some variables
        manager.set_variable("var1", "value1", 'string', trigger_log=False)
        manager.set_variable("var2", 42, 'number', trigger_log=False)
        
        # Execute: Clear all variables
        result = manager.clear_all()
        
        # Verify: Clear succeeded
        assert result is True, "Clear all should succeed"
        
        # Verify: Variables are cleared
        count = manager.count()
        assert count == 0, "Variable count should be zero after clear"
        
        # Verify: Build log exists
        log_path = temp_path / "build_logs" / "build_steps_raw.log"
        assert log_path.exists(), "Build log should be created"
        
        # Verify: Log contains clear entry
        with open(log_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        assert len(log_content) > 0, "Build log should not be empty"
        assert "VARIABLE_CHANGE" in log_content, "Log should contain VARIABLE_CHANGE action"
        assert "<all>" in log_content, "Log should indicate all variables"
        assert "<cleared>" in log_content, "Log should indicate clearing"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 65: Variable Type Support (Type Consistency)
@settings(max_examples=100, deadline=None)
@given(
    name=variable_name_strategy(),
    var_type=variable_type_strategy(),
    data=st.data()
)
def test_property_variable_type_consistency(name, var_type, data):
    """
    Property 65 (Consistency): Variable Type Support
    
    For any variable, the type should remain consistent across
    multiple read operations.
    
    Validates: Requirements 15.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "assistant").mkdir(parents=True, exist_ok=True)
        (temp_path / "build_logs").mkdir(parents=True, exist_ok=True)
        manager = VariablesManager(temp_path)
        
        # Execute: Set variable
        value = data.draw(variable_value_strategy(var_type))
        manager.set_variable(name, value, var_type, trigger_log=False)
        
        # Execute: Read variable multiple times
        reads = []
        for _ in range(5):
            var = manager.get_variable(name)
            if var:
                reads.append(var.type)
        
        # Verify: Type is consistent across all reads
        assert len(reads) > 0, "Should have successful reads"
        assert all(t == var_type for t in reads), \
            f"Type should be consistent: expected {var_type}, got {reads}"
        
        # Verify: list_variables also shows consistent type
        all_vars = manager.list_variables()
        if name in all_vars:
            assert all_vars[name]['type'] == var_type, \
                "Type in list_variables should match"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
