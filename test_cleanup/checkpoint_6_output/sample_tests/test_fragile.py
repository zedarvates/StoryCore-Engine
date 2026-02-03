
import time
import random

def test_fragile_with_timing():
    '''Test with timing dependencies'''
    time.sleep(0.1)
    result = random.randint(1, 10)
    assert result > 0  # Sometimes fails due to randomness
    
def test_fragile_with_external_state():
    '''Test with external state dependency'''
    import os
    # Depends on environment variable
    value = os.environ.get('TEST_VAR', 'default')
    assert value == 'expected'  # Fails if env var not set
