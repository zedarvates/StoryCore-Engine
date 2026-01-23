"""
Test cases for the BackendApiService module.
"""
import unittest
from unittest.mock import patch, MagicMock
from src.services.backendApiService import BackendApiService, MockBackendApiService


class TestBackendApiService(unittest.TestCase):
    """Test cases for the BackendApiService class."""

    def setUp(self):
        """Set up test fixtures."""
        self.api_service = BackendApiService({
            baseUrl: 'http://localhost:3000',
            timeout: 1000,
            retryAttempts: 2
        })

    @patch('fetch')
    async def test_successful_request(self, mock_fetch):
        """Test successful API request."""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.ok = True
        mock_response.json.return_value = {'taskId': 'test-123', 'status': 'pending'}
        mock_fetch.return_value = mock_response
        
        result = await self.api_service.submitProject({'name': 'test_project'})
        
        self.assertTrue(result.success)
        self.assertEqual(result.data.taskId, 'test-123')

    @patch('fetch')
    async def test_failed_request(self, mock_fetch):
        """Test failed API request."""
        # Mock failed response
        mock_response = MagicMock()
        mock_response.ok = False
        mock_response.status = 404
        mock_response.json.return_value = {'error': 'Not found'}
        mock_fetch.return_value = mock_response
        
        result = await self.api_service.submitProject({'name': 'test_project'})
        
        self.assertFalse(result.success)
        self.assertIn('Not found', result.error)

    @patch('fetch')
    async def test_network_error_with_retry(self, mock_fetch):
        """Test network error with retry mechanism."""
        # Mock network error that fails on first attempt but succeeds on retry
        mock_fetch.side_effect = [
            Exception('Network error'),
            MagicMock(ok=True, json=lambda: {'taskId': 'retry-123', 'status': 'pending'})
        ]
        
        result = await self.api_service.submitProject({'name': 'test_project'})
        
        self.assertTrue(result.success)
        self.assertEqual(result.data.taskId, 'retry-123')

    @patch('fetch')
    async def test_max_retry_attempts(self, mock_fetch):
        """Test max retry attempts reached."""
        # Mock consistent network error
        mock_fetch.side_effect = Exception('Network error')
        
        result = await self.api_service.submitProject({'name': 'test_project'})
        
        self.assertFalse(result.success)
        self.assertIn('Max retry attempts reached', result.error)

    async def test_mock_api_service(self):
        """Test MockBackendApiService functionality."""
        mock_api = MockBackendApiService()
        
        # Test submitProject
        result = await mock_api.submitProject({'name': 'test'})
        self.assertTrue(result.success)
        self.assertIn('mock-task-', result.data.taskId)
        
        # Test getTaskStatus
        task_id = 'test-123'
        status_result = await mock_api.getTaskStatus(task_id)
        self.assertTrue(status_result.success)
        self.assertEqual(status_result.data.taskId, task_id)

    async def test_mock_progress_simulation(self):
        """Test progress simulation in MockBackendApiService."""
        mock_api = MockBackendApiService()
        
        # Submit a task
        submit_result = await mock_api.submitProject({'name': 'test'})
        task_id = submit_result.data.taskId
        
        # Check progress multiple times
        progress1 = await mock_api.getTaskStatus(task_id)
        progress2 = await mock_api.getTaskStatus(task_id)
        
        # Progress should increase
        self.assertLess(progress1.data.progress, progress2.data.progress)


if __name__ == '__main__':
    unittest.main()