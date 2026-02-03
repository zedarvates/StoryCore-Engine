
def multiply(a, b):
    return a * b

def test_multiplication():
    '''Test multiplication functionality'''
    assert multiply(2, 3) == 6
    assert multiply(0, 5) == 0
    assert multiply(-1, 5) == -5
