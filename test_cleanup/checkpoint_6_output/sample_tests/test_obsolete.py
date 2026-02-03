
import non_existent_module

def test_obsolete_functionality():
    '''Test for functionality that no longer exists'''
    result = non_existent_module.old_function()
    assert result == 42
