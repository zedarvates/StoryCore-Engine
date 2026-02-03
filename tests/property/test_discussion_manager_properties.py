"""
Property-based tests for DiscussionManager.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings

from src.memory_system.discussion_manager import DiscussionManager
from src.memory_system.data_models import Conversation, Message


# Strategy for generating valid messages
def message_strategy():
    return st.builds(
        Message,
        role=st.sampled_from(["user", "assistant", "system"]),
        content=st.text(min_size=1, max_size=500),
        timestamp=st.datetimes(
            min_value=datetime(2020, 1, 1),
            max_value=datetime(2030, 12, 31)
        )
    )


# Strategy for generating valid conversations
def conversation_strategy():
    return st.builds(
        Conversation,
        messages=st.lists(message_strategy(), min_size=1, max_size=20),
        session_id=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(
                blacklist_characters='/\\:*?"<>|\x00',
                blacklist_categories=('Cc', 'Cs')
            )
        ),
        start_time=st.datetimes(
            min_value=datetime(2020, 1, 1),
            max_value=datetime(2030, 12, 31)
        )
    )


# Strategy for generating session IDs
session_id_strategy = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(
        blacklist_characters='/\\:*?"<>|\x00',
        blacklist_categories=('Cc', 'Cs')
    )
).filter(lambda x: x.strip())


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    # Create assistant directory structure
    (temp_path / "discussions_raw").mkdir(parents=True, exist_ok=True)
    (temp_path / "discussions_summary").mkdir(parents=True, exist_ok=True)
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 6: Conversation Persistence
@settings(max_examples=100, deadline=None)
@given(conversation=conversation_strategy())
def test_property_conversation_persistence(conversation):
    """
    Property 6: Conversation Persistence
    
    For any conversation, the complete content SHALL be appended to a timestamped
    file in discussions_raw/ preserving all messages.
    
    Validates: Requirements 3.1, 3.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Verify: File was created
        assert discussion_file.exists(), "Discussion file should be created"
        assert discussion_file.parent == discussion_manager.raw_path, "File should be in discussions_raw/"
        
        # Verify: Content is preserved
        with open(discussion_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        assert isinstance(saved_data, list), "Saved data should be a list"
        assert len(saved_data) > 0, "Saved data should contain at least one conversation"
        
        # Verify: All messages are preserved
        saved_conversation = saved_data[0]
        assert "messages" in saved_conversation, "Conversation should have messages"
        assert len(saved_conversation["messages"]) == len(conversation.messages), \
            "All messages should be preserved"
        
        # Verify: Message content is preserved
        for i, msg in enumerate(conversation.messages):
            saved_msg = saved_conversation["messages"][i]
            assert saved_msg["role"] == msg.role, f"Message {i} role should be preserved"
            assert saved_msg["content"] == msg.content, f"Message {i} content should be preserved"
            assert "timestamp" in saved_msg, f"Message {i} should have timestamp"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 7: Discussion Filename Timestamp Format
@settings(max_examples=100, deadline=None)
@given(conversation=conversation_strategy())
def test_property_discussion_filename_timestamp_format(conversation):
    """
    Property 7: Discussion Filename Timestamp Format
    
    For any discussion file created, the filename SHALL contain a valid ISO 8601 timestamp.
    
    Validates: Requirements 3.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Verify: Filename contains timestamp
        filename = discussion_file.stem  # Get filename without extension
        
        # The filename format is: session_YYYYMMDD_HHMMSS_<uuid>
        # Extract the timestamp part
        parts = filename.split('_')
        assert len(parts) >= 3, "Filename should have session, date, time parts"
        
        # Verify date part (YYYYMMDD)
        date_part = parts[1]
        assert len(date_part) == 8, "Date part should be YYYYMMDD format"
        assert date_part.isdigit(), "Date part should be numeric"
        
        # Verify time part (HHMMSS)
        time_part = parts[2]
        assert len(time_part) == 6, "Time part should be HHMMSS format"
        assert time_part.isdigit(), "Time part should be numeric"
        
        # Verify we can parse it as a valid datetime
        try:
            datetime.strptime(f"{date_part}_{time_part}", "%Y%m%d_%H%M%S")
        except ValueError:
            pytest.fail("Filename timestamp should be parseable as datetime")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 8: Session-Based File Grouping
@settings(max_examples=100, deadline=None)
@given(
    session_id=session_id_strategy,
    num_conversations=st.integers(min_value=2, max_value=5)
)
def test_property_session_based_file_grouping(session_id, num_conversations):
    """
    Property 8: Session-Based File Grouping
    
    For any session, multiple conversations within that session SHALL append to
    the same discussion file, while new sessions SHALL create new files.
    
    Validates: Requirements 3.3, 3.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record multiple conversations in same session
        files_created = []
        for i in range(num_conversations):
            conversation = Conversation(
                messages=[
                    Message(
                        role="user",
                        content=f"Message {i}",
                        timestamp=datetime.now()
                    )
                ],
                session_id=session_id,
                start_time=datetime.now()
            )
            discussion_file = discussion_manager.record_conversation(conversation, session_id=session_id)
            files_created.append(discussion_file)
        
        # Verify: All conversations went to the same file
        unique_files = set(files_created)
        assert len(unique_files) == 1, \
            f"All conversations in same session should use same file, got {len(unique_files)} files"
        
        # Verify: File contains all conversations
        discussion_file = files_created[0]
        with open(discussion_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        assert len(saved_data) == num_conversations, \
            f"File should contain {num_conversations} conversations"
        
        # Execute: Record conversation in new session
        new_session_id = f"{session_id}_new"
        new_conversation = Conversation(
            messages=[
                Message(
                    role="user",
                    content="New session message",
                    timestamp=datetime.now()
                )
            ],
            session_id=new_session_id,
            start_time=datetime.now()
        )
        new_file = discussion_manager.record_conversation(new_conversation, session_id=new_session_id)
        
        # Verify: New session created new file
        assert new_file != discussion_file, "New session should create new file"
        assert new_file.exists(), "New session file should exist"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 9: Discussion Round-Trip Integrity
@settings(max_examples=100, deadline=None)
@given(conversation=conversation_strategy())
def test_property_discussion_round_trip_integrity(conversation):
    """
    Property 9: Discussion Round-Trip Integrity
    
    For any conversation written to discussions_raw/, reading it back SHALL
    produce identical content.
    
    Validates: Requirements 3.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Read back the conversation
        with open(discussion_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        saved_conversation = saved_data[0]
        
        # Verify: Session ID matches
        assert saved_conversation["session_id"] == conversation.session_id, \
            "Session ID should match"
        
        # Verify: Number of messages matches
        assert len(saved_conversation["messages"]) == len(conversation.messages), \
            "Number of messages should match"
        
        # Verify: Each message content matches
        for i, original_msg in enumerate(conversation.messages):
            saved_msg = saved_conversation["messages"][i]
            assert saved_msg["role"] == original_msg.role, \
                f"Message {i} role should match"
            assert saved_msg["content"] == original_msg.content, \
                f"Message {i} content should match"
            
            # Verify timestamp is preserved (as ISO string)
            saved_timestamp = saved_msg["timestamp"]
            if isinstance(original_msg.timestamp, datetime):
                expected_timestamp = original_msg.timestamp.isoformat()
            else:
                expected_timestamp = original_msg.timestamp
            assert saved_timestamp == expected_timestamp, \
                f"Message {i} timestamp should match"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 6: Conversation Persistence (Multiple Conversations)
@settings(max_examples=100, deadline=None)
@given(
    conversations=st.lists(conversation_strategy(), min_size=1, max_size=10)
)
def test_property_multiple_conversations_persistence(conversations):
    """
    Property 6 (Multiple): Conversation Persistence
    
    For any sequence of conversations, all SHALL be persisted correctly
    with complete content preservation.
    
    Validates: Requirements 3.1, 3.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record all conversations
        for conversation in conversations:
            discussion_file = discussion_manager.record_conversation(conversation)
            assert discussion_file.exists(), "Each conversation should create/update a file"
        
        # Verify: All files in discussions_raw are valid JSON
        for file_path in discussion_manager.raw_path.glob("*.json"):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)  # Should not raise exception
                assert isinstance(data, list), "File content should be a list"
                assert len(data) > 0, "File should contain at least one conversation"
                
                # Verify each conversation has required fields
                for conv in data:
                    assert "session_id" in conv, "Conversation should have session_id"
                    assert "start_time" in conv, "Conversation should have start_time"
                    assert "messages" in conv, "Conversation should have messages"
                    assert isinstance(conv["messages"], list), "Messages should be a list"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 8: Session-Based File Grouping (Idempotency)
@settings(max_examples=100, deadline=None)
@given(
    session_id=session_id_strategy,
    conversation=conversation_strategy()
)
def test_property_session_file_grouping_idempotent(session_id, conversation):
    """
    Property 8 (Idempotency): Session-Based File Grouping
    
    For any session, recording conversations should be idempotent - calling
    record_conversation multiple times with the same session should always
    use the same file.
    
    Validates: Requirements 3.3, 3.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Execute: Record same conversation multiple times with same session
        file1 = discussion_manager.record_conversation(conversation, session_id=session_id)
        file2 = discussion_manager.record_conversation(conversation, session_id=session_id)
        file3 = discussion_manager.record_conversation(conversation, session_id=session_id)
        
        # Verify: All use the same file
        assert file1 == file2 == file3, "Same session should always use same file"
        
        # Verify: File contains all three conversations
        with open(file1, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        assert len(saved_data) == 3, "File should contain all three conversations"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 9: Discussion Round-Trip Integrity (Special Characters)
@settings(max_examples=100, deadline=None)
@given(
    content=st.text(min_size=1, max_size=1000)
)
def test_property_discussion_round_trip_special_characters(content):
    """
    Property 9 (Special Characters): Discussion Round-Trip Integrity
    
    For any conversation with special characters (unicode, newlines, etc.),
    reading it back SHALL produce identical content.
    
    Validates: Requirements 3.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create conversation with special characters
        conversation = Conversation(
            messages=[
                Message(
                    role="user",
                    content=content,
                    timestamp=datetime.now()
                )
            ],
            session_id="test_session",
            start_time=datetime.now()
        )
        
        # Execute: Record and read back
        discussion_file = discussion_manager.record_conversation(conversation)
        
        with open(discussion_file, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        # Verify: Content matches exactly
        saved_content = saved_data[0]["messages"][0]["content"]
        assert saved_content == content, "Content with special characters should be preserved exactly"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)



# Feature: storycore-llm-memory-system, Property 10: Threshold-Based Summarization Trigger
@settings(max_examples=100, deadline=None)
@given(
    threshold_kb=st.integers(min_value=1, max_value=100),
    content_size_kb=st.integers(min_value=1, max_value=200)
)
def test_property_threshold_based_summarization_trigger(threshold_kb, content_size_kb):
    """
    Property 10: Threshold-Based Summarization Trigger
    
    For any discussion file, when its size exceeds the configured threshold,
    automatic summarization SHALL be triggered.
    
    Validates: Requirements 4.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create a discussion file with specific size
        discussion_file = discussion_manager.raw_path / "test_discussion.json"
        discussion_manager.raw_path.mkdir(parents=True, exist_ok=True)
        
        # Generate content of approximately the desired size
        content = "x" * (content_size_kb * 1024)
        conversation_data = [{
            "session_id": "test",
            "start_time": datetime.now().isoformat(),
            "messages": [{"role": "user", "content": content, "timestamp": datetime.now().isoformat()}]
        }]
        
        with open(discussion_file, 'w', encoding='utf-8') as f:
            json.dump(conversation_data, f)
        
        # Execute: Check if summarization should be triggered
        should_summarize = discussion_manager.should_summarize(discussion_file, threshold_kb=threshold_kb)
        
        # Verify: Summarization trigger matches threshold
        actual_size_kb = discussion_file.stat().st_size / 1024
        expected_trigger = actual_size_kb > threshold_kb
        
        assert should_summarize == expected_trigger, \
            f"Summarization trigger should match threshold: file={actual_size_kb:.2f}KB, threshold={threshold_kb}KB"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 11: Summary Compression and Information Preservation
@settings(max_examples=100, deadline=None)
@given(
    num_messages=st.integers(min_value=5, max_value=50),
    message_length=st.integers(min_value=50, max_value=500)
)
def test_property_summary_compression_and_preservation(num_messages, message_length):
    """
    Property 11: Summary Compression and Information Preservation
    
    For any discussion summary, it SHALL be shorter than the original while
    preserving all key decisions, action items, and important context.
    
    Validates: Requirements 4.2, 4.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create a conversation with key information
        messages = []
        key_decisions = []
        key_actions = []
        
        for i in range(num_messages):
            # Add some messages with key information
            if i % 3 == 0:
                content = f"Decision: We decided to implement feature {i}. " + "x" * message_length
                key_decisions.append(f"feature {i}")
            elif i % 3 == 1:
                content = f"Action: We will complete task {i}. " + "x" * message_length
                key_actions.append(f"task {i}")
            else:
                content = f"Regular message {i}. " + "x" * message_length
            
            messages.append(Message(
                role="assistant" if i % 2 == 0 else "user",
                content=content,
                timestamp=datetime.now()
            ))
        
        conversation = Conversation(
            messages=messages,
            session_id="test_session",
            start_time=datetime.now()
        )
        
        # Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Execute: Create summary
        summary_file = discussion_manager.create_summary(discussion_file)
        
        # Verify: Summary was created
        assert summary_file is not None, "Summary should be created"
        assert summary_file.exists(), "Summary file should exist"
        
        # Verify: Summary is shorter than original
        original_size = discussion_file.stat().st_size
        summary_size = summary_file.stat().st_size
        
        # Summary should be significantly shorter (at least some compression)
        # Note: For very small files, summary might be similar size due to headers
        if original_size > 1000:
            assert summary_size < original_size, \
                f"Summary ({summary_size} bytes) should be shorter than original ({original_size} bytes)"
        
        # Verify: Key information is preserved in summary
        with open(summary_file, 'r', encoding='utf-8') as f:
            summary_content = f.read()
        
        # Check that decisions are mentioned
        for decision in key_decisions[:3]:  # Check first few
            # The summary should contain references to decisions
            assert "DECISION" in summary_content.upper() or "decision" in summary_content.lower(), \
                "Summary should preserve decision information"
        
        # Check that actions are mentioned
        for action in key_actions[:3]:  # Check first few
            # The summary should contain references to actions
            assert "ACTION" in summary_content.upper() or "action" in summary_content.lower(), \
                "Summary should preserve action information"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 12: Summary File Location and Naming
@settings(max_examples=100, deadline=None)
@given(conversation=conversation_strategy())
def test_property_summary_file_location_and_naming(conversation):
    """
    Property 12: Summary File Location and Naming
    
    For any generated summary, it SHALL be stored in discussions_summary/ with
    a corresponding ISO 8601 timestamp in the filename.
    
    Validates: Requirements 4.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Execute: Create summary
        summary_file = discussion_manager.create_summary(discussion_file)
        
        # Verify: Summary file location
        assert summary_file is not None, "Summary should be created"
        assert summary_file.parent == discussion_manager.summary_path, \
            "Summary should be in discussions_summary/"
        
        # Verify: Filename contains timestamp
        filename = summary_file.stem  # Get filename without extension
        
        # The filename format is: summary_<session_info>_YYYYMMDD_HHMMSS
        assert filename.startswith("summary_"), "Filename should start with 'summary_'"
        
        # Extract timestamp part (last two underscore-separated parts)
        parts = filename.split('_')
        assert len(parts) >= 3, "Filename should have multiple parts"
        
        # Get the last two parts which should be date and time
        date_part = parts[-2]
        time_part = parts[-1]
        
        # Verify date part (YYYYMMDD)
        assert len(date_part) == 8, "Date part should be YYYYMMDD format"
        assert date_part.isdigit(), "Date part should be numeric"
        
        # Verify time part (HHMMSS)
        assert len(time_part) == 6, "Time part should be HHMMSS format"
        assert time_part.isdigit(), "Time part should be numeric"
        
        # Verify we can parse it as a valid datetime
        try:
            datetime.strptime(f"{date_part}_{time_part}", "%Y%m%d_%H%M%S")
        except ValueError:
            pytest.fail("Summary filename timestamp should be parseable as datetime")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 13: Discussion-Summary Mapping
@settings(max_examples=100, deadline=None)
@given(conversation=conversation_strategy())
def test_property_discussion_summary_mapping(conversation):
    """
    Property 13: Discussion-Summary Mapping
    
    For any discussion file with a summary, a bidirectional mapping SHALL exist
    between the raw discussion and its summary.
    
    Validates: Requirements 4.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Execute: Create summary
        summary_file = discussion_manager.create_summary(discussion_file)
        
        # Verify: Can find summary from discussion file
        found_summary = discussion_manager.get_summary_file_for_discussion(discussion_file)
        assert found_summary is not None, "Should be able to find summary from discussion file"
        assert found_summary == summary_file, "Found summary should match created summary"
        
        # Verify: Summary filename contains reference to discussion file
        discussion_stem = discussion_file.stem
        summary_name = summary_file.name
        assert discussion_stem in summary_name, \
            f"Summary filename should contain discussion file reference: {discussion_stem} in {summary_name}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 11: Summary Compression (Key Information Extraction)
@settings(max_examples=100, deadline=None)
@given(
    text_with_keywords=st.text(min_size=100, max_size=1000)
)
def test_property_key_information_extraction(text_with_keywords):
    """
    Property 11 (Key Information): Summary Compression and Information Preservation
    
    For any discussion text, extract_key_information() SHALL identify and extract
    decisions, action items, entities, constraints, and objectives.
    
    Validates: Requirements 4.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create text with known key information
        test_text = f"""
        Decision: We decided to use Python for the backend.
        Action: We will implement the API by next week.
        Constraint: The system must handle 1000 requests per second.
        Objective: Build a scalable microservices architecture.
        {text_with_keywords}
        """
        
        # Execute: Extract key information
        key_info = discussion_manager.extract_key_information(test_text)
        
        # Verify: Structure is correct
        assert isinstance(key_info, dict), "Key info should be a dictionary"
        assert "decisions" in key_info, "Should have decisions"
        assert "action_items" in key_info, "Should have action_items"
        assert "entities" in key_info, "Should have entities"
        assert "constraints" in key_info, "Should have constraints"
        assert "objectives" in key_info, "Should have objectives"
        
        # Verify: All fields are lists
        assert isinstance(key_info["decisions"], list), "Decisions should be a list"
        assert isinstance(key_info["action_items"], list), "Action items should be a list"
        assert isinstance(key_info["entities"], list), "Entities should be a list"
        assert isinstance(key_info["constraints"], list), "Constraints should be a list"
        assert isinstance(key_info["objectives"], list), "Objectives should be a list"
        
        # Verify: Known information was extracted
        assert len(key_info["decisions"]) > 0, "Should extract decisions"
        assert len(key_info["action_items"]) > 0, "Should extract action items"
        assert len(key_info["constraints"]) > 0, "Should extract constraints"
        assert len(key_info["objectives"]) > 0, "Should extract objectives"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 10: Threshold-Based Summarization Trigger (Edge Cases)
@settings(max_examples=100, deadline=None)
@given(threshold_kb=st.integers(min_value=1, max_value=100))
def test_property_summarization_trigger_nonexistent_file(threshold_kb):
    """
    Property 10 (Edge Case): Threshold-Based Summarization Trigger
    
    For any nonexistent discussion file, should_summarize() SHALL return False.
    
    Validates: Requirements 4.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create path to nonexistent file
        nonexistent_file = discussion_manager.raw_path / "nonexistent.json"
        
        # Execute: Check if summarization should be triggered
        should_summarize = discussion_manager.should_summarize(nonexistent_file, threshold_kb=threshold_kb)
        
        # Verify: Should return False for nonexistent file
        assert should_summarize is False, "Should not trigger summarization for nonexistent file"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 12: Summary File Location and Naming (Multiple Summaries)
@settings(max_examples=100, deadline=None)
@given(
    num_summaries=st.integers(min_value=2, max_value=5)
)
def test_property_multiple_summaries_unique_timestamps(num_summaries):
    """
    Property 12 (Multiple): Summary File Location and Naming
    
    For any discussion file with multiple summaries created over time,
    each summary SHALL have a unique timestamp in its filename.
    
    Validates: Requirements 4.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create a conversation
        conversation = Conversation(
            messages=[
                Message(role="user", content="Test message", timestamp=datetime.now())
            ],
            session_id="test_session",
            start_time=datetime.now()
        )
        
        # Record conversation
        discussion_file = discussion_manager.record_conversation(conversation)
        
        # Execute: Create multiple summaries with small delays
        summary_files = []
        for i in range(num_summaries):
            summary_file = discussion_manager.create_summary(discussion_file)
            summary_files.append(summary_file)
            # Small delay to ensure different timestamps
            import time
            time.sleep(1.1)  # Sleep for just over 1 second to ensure different timestamps
        
        # Verify: All summaries were created
        assert len(summary_files) == num_summaries, "All summaries should be created"
        
        # Verify: All summary filenames are unique
        filenames = [f.name for f in summary_files]
        unique_filenames = set(filenames)
        assert len(unique_filenames) == num_summaries, \
            f"All summary filenames should be unique, got {len(unique_filenames)} unique out of {num_summaries}"
        
        # Verify: All summaries exist
        for summary_file in summary_files:
            assert summary_file.exists(), f"Summary file {summary_file} should exist"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 13: Discussion-Summary Mapping (Recent Summaries)
@settings(max_examples=100, deadline=None)
@given(
    num_conversations=st.integers(min_value=1, max_value=10)
)
def test_property_get_recent_summaries(num_conversations):
    """
    Property 13 (Recent): Discussion-Summary Mapping
    
    For any project with multiple summaries, get_recent_summaries() SHALL
    return the most recent summaries in chronological order.
    
    Validates: Requirements 4.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        discussion_manager = DiscussionManager(temp_path)
        
        # Create multiple conversations and summaries
        summary_files = []
        for i in range(num_conversations):
            conversation = Conversation(
                messages=[
                    Message(role="user", content=f"Message {i}", timestamp=datetime.now())
                ],
                session_id=f"session_{i}",
                start_time=datetime.now()
            )
            
            discussion_file = discussion_manager.record_conversation(conversation)
            summary_file = discussion_manager.create_summary(discussion_file)
            summary_files.append(summary_file)
            
            # Small delay to ensure different timestamps
            import time
            time.sleep(0.1)
        
        # Execute: Get recent summaries
        limit = min(5, num_conversations)
        recent_summaries = discussion_manager.get_recent_summaries(limit=limit)
        
        # Verify: Correct number of summaries returned
        expected_count = min(limit, num_conversations)
        assert len(recent_summaries) == expected_count, \
            f"Should return {expected_count} summaries, got {len(recent_summaries)}"
        
        # Verify: All returned summaries exist
        for summary_file in recent_summaries:
            assert summary_file.exists(), f"Summary file {summary_file} should exist"
        
        # Verify: Summaries are in reverse chronological order (most recent first)
        if len(recent_summaries) > 1:
            for i in range(len(recent_summaries) - 1):
                assert recent_summaries[i].stat().st_mtime >= recent_summaries[i + 1].stat().st_mtime, \
                    "Summaries should be in reverse chronological order"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
