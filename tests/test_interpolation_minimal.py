"""Minimal test to debug"""
import pytest
from hypothesis import given, strategies as st

@given(x=st.integers())
def test_minimal(x):
    assert isinstance(x, int)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
