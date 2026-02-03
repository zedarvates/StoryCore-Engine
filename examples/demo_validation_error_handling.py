"""
Demonstration of Input Validation and Error Handling

This example shows how to use the validation and error handling frameworks
together in a realistic scenario.
"""

from src.fact_checker import (
    # Validation
    validate_scientific_audit_input,
    validate_claim,
    InputValidationError,
    # Error Handling
    ProcessingError,
    NetworkError,
    with_retry,
    RetryConfig,
    CircuitBreaker,
    handle_error,
    graceful_degradation,
    ErrorLogger
)


def demo_input_validation():
    """Demonstrates input validation with detailed error messages."""
    print("=" * 60)
    print("DEMO 1: Input Validation")
    print("=" * 60)
    
    # Valid input
    print("\n1. Valid input:")
    valid_input = {
        "content": "Water boils at 100 degrees Celsius at sea level.",
        "confidence_threshold": 70
    }
    result = validate_scientific_audit_input(valid_input)
    print(f"   Valid: {result.is_valid}")
    
    # Invalid input - empty content
    print("\n2. Invalid input (empty content):")
    invalid_input = {
        "content": "",
        "confidence_threshold": 70
    }
    result = validate_scientific_audit_input(invalid_input)
    print(f"   Valid: {result.is_valid}")
    if not result.is_valid:
        for error in result.errors:
            print(f"   Error: {error.field} - {error.issue}")
            print(f"          Expected: {error.expected}")
    
    # Invalid input - confidence out of range
    print("\n3. Invalid input (confidence out of range):")
    invalid_input = {
        "content": "Some text",
        "confidence_threshold": 150  # Should be 0-100
    }
    result = validate_scientific_audit_input(invalid_input)
    print(f"   Valid: {result.is_valid}")
    if not result.is_valid:
        for error in result.errors:
            print(f"   Error: {error.field} - {error.issue}")
            print(f"          Expected: {error.expected}")
            print(f"          Received: {error.received}")
    
    # Invalid claim
    print("\n4. Invalid claim (negative position):")
    claim_data = {
        "id": "claim-123",
        "text": "Water boils at 100 degrees.",
        "position": [-1, 35]  # Negative position
    }
    result = validate_claim(claim_data)
    print(f"   Valid: {result.is_valid}")
    if not result.is_valid:
        for error in result.errors:
            print(f"   Error: {error.field} - {error.issue}")


def demo_retry_logic():
    """Demonstrates retry logic with exponential backoff."""
    print("\n" + "=" * 60)
    print("DEMO 2: Retry Logic with Exponential Backoff")
    print("=" * 60)
    
    # Simulate a function that fails twice then succeeds
    attempt_count = [0]
    
    @with_retry(config=RetryConfig(max_attempts=3, initial_delay=0.1))
    def fetch_data():
        attempt_count[0] += 1
        print(f"\n   Attempt {attempt_count[0]}")
        
        if attempt_count[0] < 3:
            print("   -> Failed (transient error)")
            raise NetworkError("Network temporarily unavailable")
        
        print("   -> Success!")
        return {"data": "Retrieved successfully"}
    
    try:
        result = fetch_data()
        print(f"\n   Final result: {result}")
    except NetworkError as e:
        print(f"\n   All retries exhausted: {e}")


def demo_circuit_breaker():
    """Demonstrates circuit breaker pattern."""
    print("\n" + "=" * 60)
    print("DEMO 3: Circuit Breaker Pattern")
    print("=" * 60)
    
    breaker = CircuitBreaker(
        failure_threshold=3,
        success_threshold=2,
        timeout=1.0,
        window_size=10.0
    )
    
    # Simulate external service
    call_count = [0]
    
    def external_service():
        call_count[0] += 1
        if call_count[0] <= 3:
            raise Exception("Service unavailable")
        return "Success"
    
    # Make calls that will open the circuit
    print("\n1. Making calls that will fail:")
    for i in range(3):
        try:
            result = breaker.call(external_service)
            print(f"   Call {i+1}: {result}")
        except Exception as e:
            print(f"   Call {i+1}: Failed - {e}")
    
    print(f"\n   Circuit state: {breaker.state.value}")
    
    # Try to make a call with open circuit
    print("\n2. Trying to call with open circuit:")
    try:
        result = breaker.call(external_service)
        print(f"   Call: {result}")
    except Exception as e:
        print(f"   Call: Rejected - {type(e).__name__}")
    
    print(f"   Circuit state: {breaker.state.value}")


def demo_error_handling():
    """Demonstrates structured error handling."""
    print("\n" + "=" * 60)
    print("DEMO 4: Structured Error Handling")
    print("=" * 60)
    
    # Handle different error types
    print("\n1. Processing error:")
    error = ProcessingError(
        "Fact-checking analysis failed",
        details={"claim_id": "claim-123", "reason": "timeout"},
        request_id="req-456",
        retry_after=60
    )
    error_response = handle_error(error)
    print(f"   Error code: {error_response['error']['code']}")
    print(f"   Message: {error_response['error']['message']}")
    print(f"   Request ID: {error_response['request_id']}")
    print(f"   Retry after: {error_response['retry_after']}s")
    print(f"   HTTP status: {error.get_http_status()}")
    
    # Handle ValueError (converted to ValidationError)
    print("\n2. ValueError (converted to ValidationError):")
    error = ValueError("Invalid confidence threshold")
    error_response = handle_error(error)
    print(f"   Error code: {error_response['error']['code']}")
    print(f"   Message: {error_response['error']['message']}")


def demo_graceful_degradation():
    """Demonstrates graceful degradation."""
    print("\n" + "=" * 60)
    print("DEMO 5: Graceful Degradation")
    print("=" * 60)
    
    # Function that may fail but has fallback
    @graceful_degradation(
        fallback_value=[],
        error_message="Evidence retrieval failed"
    )
    def retrieve_evidence(claim_id):
        if claim_id == "bad-id":
            raise Exception("Invalid claim ID")
        return [{"source": "Wikipedia", "excerpt": "Some evidence"}]
    
    print("\n1. Successful retrieval:")
    result = retrieve_evidence("good-id")
    print(f"   Result: {result}")
    
    print("\n2. Failed retrieval (using fallback):")
    result = retrieve_evidence("bad-id")
    print(f"   Result: {result} (fallback value)")


def demo_error_logging():
    """Demonstrates structured error logging."""
    print("\n" + "=" * 60)
    print("DEMO 6: Structured Error Logging")
    print("=" * 60)
    
    error = ProcessingError("Analysis failed")
    error_data = ErrorLogger.log_error(
        error,
        request_id="req-789",
        input_hash="hash-abc",
        agent="scientific_audit",
        processing_time_ms=1500.0,
        retry_count=2,
        additional_context={"user": "demo_user"}
    )
    
    print("\n   Logged error data:")
    print(f"   - Timestamp: {error_data['timestamp']}")
    print(f"   - Error type: {error_data['error_type']}")
    print(f"   - Error category: {error_data['error_category']}")
    print(f"   - Request ID: {error_data['request_id']}")
    print(f"   - Agent: {error_data['agent']}")
    print(f"   - Processing time: {error_data['processing_time_ms']}ms")
    print(f"   - Retry count: {error_data['retry_count']}")
    print(f"   - Context: {error_data['context']}")


def main():
    """Run all demonstrations."""
    print("\n")
    print("*" * 60)
    print("* Input Validation and Error Handling Demonstration")
    print("*" * 60)
    
    demo_input_validation()
    demo_retry_logic()
    demo_circuit_breaker()
    demo_error_handling()
    demo_graceful_degradation()
    demo_error_logging()
    
    print("\n" + "=" * 60)
    print("All demonstrations completed!")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
