"""
Unit tests for fixture extraction.
"""

import pytest
from pathlib import Path
from test_cleanup.cleanup.fixture_extraction import (
    SetupPattern,
    extract_setup_code_from_test,
    extract_all_setup_code,
    identify_repeated_setup,
    generate_pytest_fixture,
    generate_vitest_before_each,
    suggest_fixture_name,
    generate_fixture_file,
    extract_fixtures_from_tests,
    analyze_fixture_opportunities
)
from test_cleanup.models import CleanupLog


class TestExtractSetupCodeFromTest:
    """Tests for extract_setup_code_from_test function."""
    
    def test_extract_setup_code(self):
        """Test extracting setup code from a test function."""
        source = """
def test_example():
    x = 1
    y = 2
    assert x + y == 3
"""
        setup = extract_setup_code_from_test(source, "test_example")
        
        assert len(setup) >= 1
        assert any("=" in s for s in setup)
    
    def test_extract_no_setup(self):
        """Test when test has no setup code."""
        source = """
def test_example():
    assert True
"""
        setup = extract_setup_code_from_test(source, "test_example")
        
        assert len(setup) == 0


class TestExtractAllSetupCode:
    """Tests for extract_all_setup_code function."""
    
    def test_extract_from_multiple_files(self, tmp_path):
        """Test extracting setup from multiple test files."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_one():
    x = 1
    assert x == 1
""")
        
        test2 = tmp_path / "test_2.py"
        test2.write_text("""
def test_two():
    y = 2
    assert y == 2
""")
        
        all_setup = extract_all_setup_code([test1, test2])
        
        assert len(all_setup) == 2
        assert str(test1) in all_setup
        assert str(test2) in all_setup


class TestIdentifyRepeatedSetup:
    """Tests for identify_repeated_setup function."""
    
    def test_identify_repeated_patterns(self):
        """Test identifying repeated setup patterns."""
        all_setup = {
            "test_1.py": ["x = 1", "y = 2"],
            "test_2.py": ["x = 1", "z = 3"],
            "test_3.py": ["x = 1", "w = 4"]
        }
        
        patterns = identify_repeated_setup(all_setup, min_frequency=2)
        
        assert len(patterns) >= 1
        # "x = 1" should be identified as repeated (appears 3 times)
        assert any(p.frequency >= 2 for p in patterns)
    
    def test_no_repeated_patterns(self):
        """Test when no patterns are repeated."""
        all_setup = {
            "test_1.py": ["x = 1"],
            "test_2.py": ["y = 2"],
            "test_3.py": ["z = 3"]
        }
        
        patterns = identify_repeated_setup(all_setup, min_frequency=2)
        
        assert len(patterns) == 0


class TestGeneratePytestFixture:
    """Tests for generate_pytest_fixture function."""
    
    def test_generate_fixture(self):
        """Test generating a pytest fixture."""
        pattern = SetupPattern(
            code="x = 1",
            test_files=["test_1.py", "test_2.py"],
            frequency=2
        )
        
        fixture_code = generate_pytest_fixture(pattern, "x_fixture")
        
        assert "@pytest.fixture" in fixture_code
        assert "def x_fixture():" in fixture_code
        assert "x = 1" in fixture_code
    
    def test_fixture_with_return(self):
        """Test fixture generation includes return statement."""
        pattern = SetupPattern(
            code="value = 42",
            test_files=["test_1.py"],
            frequency=1
        )
        
        fixture_code = generate_pytest_fixture(pattern, "value_fixture")
        
        assert "return value" in fixture_code


class TestGenerateVitestBeforeEach:
    """Tests for generate_vitest_before_each function."""
    
    def test_generate_before_each(self):
        """Test generating a vitest beforeEach hook."""
        pattern = SetupPattern(
            code="const x = 1;",
            test_files=["test_1.ts", "test_2.ts"],
            frequency=2
        )
        
        before_each_code = generate_vitest_before_each(pattern)
        
        assert "beforeEach(() => {" in before_each_code
        assert "const x = 1;" in before_each_code
        assert "});" in before_each_code


class TestSuggestFixtureName:
    """Tests for suggest_fixture_name function."""
    
    def test_suggest_name_from_variable(self):
        """Test suggesting name based on variable."""
        pattern = SetupPattern(
            code="client = create_client()",
            test_files=["test_1.py"],
            frequency=1
        )
        
        name = suggest_fixture_name(pattern)
        
        assert "client" in name
        assert "fixture" in name
    
    def test_suggest_name_from_keywords(self):
        """Test suggesting name based on keywords."""
        pattern = SetupPattern(
            code="setup_database()",
            test_files=["test_1.py"],
            frequency=1
        )
        
        name = suggest_fixture_name(pattern)
        
        assert "fixture" in name


class TestGenerateFixtureFile:
    """Tests for generate_fixture_file function."""
    
    def test_generate_pytest_fixture_file(self, tmp_path):
        """Test generating a pytest fixture file."""
        patterns = [
            SetupPattern(
                code="x = 1",
                test_files=["test_1.py", "test_2.py"],
                frequency=2
            )
        ]
        
        output_path = tmp_path / "conftest.py"
        
        success = generate_fixture_file(patterns, output_path, framework="pytest")
        
        assert success is True
        assert output_path.exists()
        
        content = output_path.read_text()
        assert "import pytest" in content
        assert "@pytest.fixture" in content
    
    def test_generate_vitest_fixture_file(self, tmp_path):
        """Test generating a vitest setup file."""
        patterns = [
            SetupPattern(
                code="const x = 1;",
                test_files=["test_1.ts", "test_2.ts"],
                frequency=2
            )
        ]
        
        output_path = tmp_path / "setup.ts"
        
        success = generate_fixture_file(patterns, output_path, framework="vitest")
        
        assert success is True
        assert output_path.exists()
        
        content = output_path.read_text()
        assert "beforeEach" in content


class TestExtractFixturesFromTests:
    """Tests for extract_fixtures_from_tests function."""
    
    def test_extract_fixtures(self, tmp_path):
        """Test extracting fixtures from test files."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_one():
    x = 1
    assert x == 1

def test_two():
    x = 1
    assert x > 0
""")
        
        output_path = tmp_path / "conftest.py"
        cleanup_log = CleanupLog()
        
        result = extract_fixtures_from_tests(
            [test1],
            output_path,
            cleanup_log,
            framework="pytest",
            min_frequency=2
        )
        
        assert result['success'] is True
        assert result['fixtures_extracted'] >= 0
    
    def test_extract_no_fixtures(self, tmp_path):
        """Test when no fixtures can be extracted."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_one():
    assert True
""")
        
        output_path = tmp_path / "conftest.py"
        cleanup_log = CleanupLog()
        
        result = extract_fixtures_from_tests(
            [test1],
            output_path,
            cleanup_log,
            framework="pytest",
            min_frequency=2
        )
        
        assert result['success'] is True
        assert result['fixtures_extracted'] == 0


class TestAnalyzeFixtureOpportunities:
    """Tests for analyze_fixture_opportunities function."""
    
    def test_analyze_opportunities(self, tmp_path):
        """Test analyzing fixture extraction opportunities."""
        test1 = tmp_path / "test_1.py"
        test1.write_text("""
def test_one():
    x = 1
    assert x == 1

def test_two():
    x = 1
    assert x > 0
""")
        
        analysis = analyze_fixture_opportunities([test1], min_frequency=2)
        
        assert 'total_test_files' in analysis
        assert 'repeated_patterns_found' in analysis
        assert 'patterns' in analysis
        assert analysis['total_test_files'] == 1
