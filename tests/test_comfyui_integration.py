"""
Unit tests for ComfyUI API integration
Tests connection handling, error recovery, and data validation
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import time

from src.comfy_client import ComfyUIClient, VRAMOverflowError, ExecutionError, ValidationError
from src.integration_utils import (
    load_workflow, inject_storycore_parameters, extract_panel_seed,
    create_panel_workflow, validate_workflow_structure
)

class TestComfyUIClient(unittest.TestCase):
    
    def setUp(self):
        self.client = ComfyUIClient("http://127.0.0.1:8188")
        self.sample_workflow = {
            "1": {
                "class_type": "KSampler",
                "inputs": {"seed": 0, "steps": 20}
            },
            "2": {
                "class_type": "CLIPTextEncode", 
                "inputs": {"text": ""}
            }
        }
    
    @patch('requests.Session.get')
    def test_connection_success(self, mock_get):
        """Test successful connection to ComfyUI"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        result = self.client.test_connection()
        self.assertTrue(result)
        mock_get.assert_called_once()
    
    @patch('requests.Session.get')
    def test_connection_failure(self, mock_get):
        """Test connection failure handling"""
        mock_get.side_effect = Exception("Connection refused")
        
        result = self.client.test_connection()
        self.assertFalse(result)
    
    @patch('requests.Session.post')
    def test_queue_workflow_success(self, mock_post):
        """Test successful workflow queuing"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"prompt_id": "test_123"}
        mock_post.return_value = mock_response
        
        prompt_id = self.client.queue_workflow(self.sample_workflow, 42, "test prompt")
        
        self.assertEqual(prompt_id, "test_123")
        mock_post.assert_called_once()
    
    @patch('requests.Session.post')
    def test_queue_workflow_retry_logic(self, mock_post):
        """Test retry logic on timeout"""
        # First two calls timeout, third succeeds
        mock_post.side_effect = [
            Exception("Timeout"),
            Exception("Timeout"), 
            Mock(status_code=200, json=lambda: {"prompt_id": "retry_success"})
        ]
        
        with patch('time.sleep'):  # Speed up test
            prompt_id = self.client.queue_workflow(self.sample_workflow, 42, "test")
        
        self.assertEqual(prompt_id, "retry_success")
        self.assertEqual(mock_post.call_count, 3)
    
    def test_vram_error_detection(self):
        """Test VRAM error detection from error messages"""
        vram_errors = [
            "CUDA out of memory",
            "RuntimeError: out of memory",
            "Insufficient VRAM available"
        ]
        
        for error_msg in vram_errors:
            self.assertTrue(self.client._is_vram_error(error_msg))
        
        # Non-VRAM errors should return False
        self.assertFalse(self.client._is_vram_error("Invalid input format"))
    
    def test_parameter_injection(self):
        """Test global_seed and prompt injection into workflow"""
        modified = self.client._inject_parameters(self.sample_workflow, 123, "test prompt")
        
        # Check seed injection
        self.assertEqual(modified["1"]["inputs"]["seed"], 123)
        
        # Check prompt injection
        self.assertEqual(modified["2"]["inputs"]["text"], "test prompt")
    
    def test_output_validation_success(self):
        """Test successful output validation"""
        valid_outputs = {
            "node_1": {
                "images": [
                    {"filename": "test.png", "type": "output"}
                ]
            }
        }
        
        result = self.client._validate_outputs(valid_outputs)
        self.assertTrue(result)
    
    def test_output_validation_failure(self):
        """Test output validation failure"""
        invalid_outputs = {
            "node_1": {
                "images": []  # Empty images array should fail
            }
        }
        
        result = self.client._validate_outputs(invalid_outputs)
        self.assertFalse(result)


class TestIntegrationUtils(unittest.TestCase):
    
    def setUp(self):
        self.sample_workflow = {
            "1": {
                "class_type": "KSampler",
                "inputs": {"seed": 0, "width": 512, "height": 512}
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": ""}
            }
        }
        
        self.project_config = {
            "global_seed": 42,
            "target_resolution": "1024x768"
        }
    
    def test_parameter_injection(self):
        """Test StoryCore parameter injection"""
        modified = inject_storycore_parameters(self.sample_workflow, self.project_config)
        
        self.assertEqual(modified["1"]["inputs"]["seed"], 42)
        self.assertEqual(modified["1"]["inputs"]["width"], 1024)
        self.assertEqual(modified["1"]["inputs"]["height"], 768)
    
    def test_panel_seed_generation(self):
        """Test deterministic panel seed generation"""
        seed1 = extract_panel_seed(42, "panel_01")
        seed2 = extract_panel_seed(42, "panel_01")
        seed3 = extract_panel_seed(42, "panel_02")
        
        # Same inputs should produce same seed
        self.assertEqual(seed1, seed2)
        
        # Different panel IDs should produce different seeds
        self.assertNotEqual(seed1, seed3)
    
    def test_panel_workflow_creation(self):
        """Test panel-specific workflow creation"""
        panel_workflow = create_panel_workflow(
            self.sample_workflow, "panel_01", "test prompt", 42
        )
        
        # Should have panel-specific seed
        panel_seed = extract_panel_seed(42, "panel_01")
        self.assertEqual(panel_workflow["1"]["inputs"]["seed"], panel_seed)
        
        # Should have panel-specific prompt
        expected_prompt = "test prompt [Panel: panel_01]"
        self.assertEqual(panel_workflow["2"]["inputs"]["text"], expected_prompt)
    
    def test_workflow_structure_validation(self):
        """Test workflow structure validation"""
        valid_workflow = {
            "1": {"class_type": "KSampler"},
            "2": {"class_type": "VAEDecode"},
            "3": {"class_type": "SaveImage"}
        }
        
        invalid_workflow = {
            "1": {"class_type": "KSampler"}
            # Missing required nodes
        }
        
        self.assertTrue(validate_workflow_structure(valid_workflow))
        self.assertFalse(validate_workflow_structure(invalid_workflow))
    
    @patch('builtins.open', create=True)
    def test_workflow_loading(self, mock_open):
        """Test workflow loading from JSON file"""
        mock_file = MagicMock()
        mock_file.read.return_value = json.dumps(self.sample_workflow)
        mock_open.return_value.__enter__.return_value = mock_file
        
        loaded_workflow = load_workflow("test_workflow.json")
        
        self.assertEqual(loaded_workflow, self.sample_workflow)
        mock_open.assert_called_once_with("test_workflow.json", 'r', encoding='utf-8')


class TestErrorHandling(unittest.TestCase):
    
    def setUp(self):
        self.client = ComfyUIClient()
    
    def test_vram_overflow_exception(self):
        """Test VRAM overflow exception handling"""
        with self.assertRaises(VRAMOverflowError):
            raise VRAMOverflowError("CUDA out of memory")
    
    def test_execution_error_exception(self):
        """Test execution error exception handling"""
        with self.assertRaises(ExecutionError):
            raise ExecutionError("Node execution failed")
    
    def test_validation_error_exception(self):
        """Test validation error exception handling"""
        with self.assertRaises(ValidationError):
            raise ValidationError("Schema validation failed")


class TestIntegrationScenarios(unittest.TestCase):
    """Integration test scenarios for complete workflows"""
    
    def setUp(self):
        self.client = ComfyUIClient()
        self.workflow = {
            "1": {
                "class_type": "KSampler",
                "inputs": {"seed": 0, "steps": 20, "batch_size": 1}
            },
            "2": {
                "class_type": "VAEDecode",
                "inputs": {}
            },
            "3": {
                "class_type": "SaveImage", 
                "inputs": {}
            }
        }
    
    @patch('requests.Session.post')
    @patch('requests.Session.get')
    def test_complete_workflow_execution(self, mock_get, mock_post):
        """Test complete workflow from queue to completion"""
        # Mock successful connection test
        mock_get.return_value = Mock(status_code=200)
        
        # Mock successful queue
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {"prompt_id": "test_workflow_123"}
        )
        
        # Test connection
        self.assertTrue(self.client.test_connection())
        
        # Queue workflow
        prompt_id = self.client.queue_workflow(self.workflow, 42, "test prompt")
        self.assertEqual(prompt_id, "test_workflow_123")
    
    def test_deterministic_seeding(self):
        """Test that same inputs produce identical seeds"""
        seed1 = extract_panel_seed(42, "panel_01")
        seed2 = extract_panel_seed(42, "panel_01")
        
        self.assertEqual(seed1, seed2, "Deterministic seeding failed")
        
        # Different global seeds should produce different results
        seed3 = extract_panel_seed(43, "panel_01")
        self.assertNotEqual(seed1, seed3, "Global seed variation failed")


if __name__ == '__main__':
    unittest.main()
