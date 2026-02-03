"""
Demo script for LogAnonymizer functionality.
Shows how the log anonymizer removes sensitive information while preserving debugging context.
"""

from src.log_anonymizer import LogAnonymizer


def main():
    print("=" * 80)
    print("LogAnonymizer Demo - Feedback & Diagnostics Module")
    print("=" * 80)
    print()
    
    # Initialize anonymizer
    anonymizer = LogAnonymizer()
    
    # Example log entries with sensitive information
    sample_logs = [
        "2024-01-25 10:30:15 ERROR: /home/john/storycore-engine/src/promotion_engine.py:142 - Connection timeout",
        "2024-01-25 10:30:16 INFO: User alice@example.com authenticated successfully",
        "2024-01-25 10:30:17 DEBUG: Using API key sk-proj-abc123def456ghi789 for OpenAI",
        "2024-01-25 10:30:18 WARN: C:\\Users\\bob\\Documents\\storycore\\config.json not found",
        "2024-01-25 10:30:19 ERROR: Password authentication failed for user: bob, password: secret123",
        "2024-01-25 10:30:20 INFO: Session ID session_xyz789abc created for request",
        "2024-01-25 10:30:21 DEBUG: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 token validated",
        "2024-01-25 10:30:22 ERROR: AWS credentials AKIAIOSFODNN7EXAMPLE invalid",
        "2024-01-25 10:30:23 INFO: Processing file /home/alice/projects/storycore/exports/video.mp4",
    ]
    
    print("ORIGINAL LOGS (with sensitive data):")
    print("-" * 80)
    for i, log in enumerate(sample_logs, 1):
        print(f"{i}. {log}")
    
    print()
    print("=" * 80)
    print()
    
    # Anonymize the logs
    anonymized_logs = anonymizer.anonymize_logs(sample_logs)
    
    print("ANONYMIZED LOGS (safe to share):")
    print("-" * 80)
    for i, log in enumerate(anonymized_logs, 1):
        print(f"{i}. {log}")
    
    print()
    print("=" * 80)
    print()
    
    print("WHAT WAS REMOVED/ANONYMIZED:")
    print("-" * 80)
    print("✓ Usernames (john, alice, bob) → USER")
    print("✓ Email addresses → [EMAIL_REDACTED]")
    print("✓ API keys (sk-proj-...) → [TOKEN_REDACTED]")
    print("✓ Passwords → [PASSWORD_REDACTED]")
    print("✓ Bearer tokens → [TOKEN_REDACTED]")
    print("✓ AWS credentials → [AWS_KEY_REDACTED]")
    print("✓ Session IDs → Consistent hashes (ID_xxxxxxxx)")
    print("✓ Absolute paths → Relative paths or filenames")
    
    print()
    print("WHAT WAS PRESERVED:")
    print("-" * 80)
    print("✓ Timestamps")
    print("✓ Log levels (ERROR, INFO, DEBUG, WARN)")
    print("✓ Error messages")
    print("✓ Stack trace line numbers (:142)")
    print("✓ Module names (promotion_engine.py)")
    print("✓ File extensions (.py, .json, .mp4)")
    
    print()
    print("=" * 80)
    print("Demo complete! The LogAnonymizer is ready for use in the Feedback system.")
    print("=" * 80)


if __name__ == "__main__":
    main()
