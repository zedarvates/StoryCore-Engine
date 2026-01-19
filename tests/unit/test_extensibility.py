"""
Unit tests for CLI extensibility features.
Tests plugin loading, command aliases, and execution hooks.
"""

import argparse
import unittest
from unittest.mock import Mock, patch, MagicMock

from src.cli.base import BaseHandler
from src.cli.registry import CommandRegistry
from src.cli.plugins import PluginLoader
from src.cli.help import CommandHelp, create_command_help


class TestCommandAliases(unittest.TestCase):
    """Test command alias functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = argparse.ArgumentParser()
        self.registry = CommandRegistry(self.parser, lazy_load=False)
    
    def test_handler_with_aliases(self):
        """Test that handler aliases are registered correctly."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            aliases = ["t", "tst"]
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Register handler
        self.registry.register_handler(TestHandler)
        
        # Check aliases are registered
        self.assertIn("t", self.registry.aliases)
        self.assertIn("tst", self.registry.aliases)
        self.assertEqual(self.registry.aliases["t"], "test")
        self.assertEqual(self.registry.aliases["tst"], "test")
    
    def test_get_handler_by_alias(self):
        """Test retrieving handler by alias."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            aliases = ["t"]
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Register handler
        self.registry.register_handler(TestHandler)
        
        # Get handler by alias
        handler = self.registry.get_handler("t")
        self.assertIsNotNone(handler)
        self.assertEqual(handler.command_name, "test")


class TestExecutionHooks(unittest.TestCase):
    """Test execution hook functionality."""
    
    def test_pre_execution_hook(self):
        """Test pre-execution hooks are called."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        handler = TestHandler()
        
        # Add pre-hook
        hook_called = []
        def pre_hook(args):
            hook_called.append(True)
        
        handler.add_pre_hook(pre_hook)
        
        # Execute with hooks
        args = argparse.Namespace()
        handler.execute_with_hooks(args)
        
        # Verify hook was called
        self.assertTrue(hook_called)
    
    def test_post_execution_hook(self):
        """Test post-execution hooks are called."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 42
        
        handler = TestHandler()
        
        # Add post-hook
        hook_results = []
        def post_hook(args, exit_code):
            hook_results.append(exit_code)
        
        handler.add_post_hook(post_hook)
        
        # Execute with hooks
        args = argparse.Namespace()
        exit_code = handler.execute_with_hooks(args)
        
        # Verify hook was called with correct exit code
        self.assertEqual(hook_results, [42])
        self.assertEqual(exit_code, 42)
    
    def test_multiple_hooks(self):
        """Test multiple hooks are executed in order."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        handler = TestHandler()
        
        # Add multiple pre-hooks
        call_order = []
        
        def hook1(args):
            call_order.append(1)
        
        def hook2(args):
            call_order.append(2)
        
        handler.add_pre_hook(hook1)
        handler.add_pre_hook(hook2)
        
        # Execute
        args = argparse.Namespace()
        handler.execute_with_hooks(args)
        
        # Verify hooks called in order
        self.assertEqual(call_order, [1, 2])
    
    def test_hook_removal(self):
        """Test removing hooks."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        handler = TestHandler()
        
        # Add and remove hook
        hook_called = []
        def hook(args):
            hook_called.append(True)
        
        handler.add_pre_hook(hook)
        removed = handler.remove_pre_hook(hook)
        
        self.assertTrue(removed)
        
        # Execute - hook should not be called
        args = argparse.Namespace()
        handler.execute_with_hooks(args)
        
        self.assertEqual(hook_called, [])


class TestPluginLoader(unittest.TestCase):
    """Test plugin loading functionality."""
    
    def test_plugin_loader_initialization(self):
        """Test plugin loader initializes correctly."""
        loader = PluginLoader()
        self.assertIsNotNone(loader)
        self.assertEqual(loader.loaded_plugins, [])
    
    def test_get_loaded_plugins(self):
        """Test getting list of loaded plugins."""
        loader = PluginLoader()
        plugins = loader.get_loaded_plugins()
        self.assertIsInstance(plugins, list)


class TestEnhancedHelp(unittest.TestCase):
    """Test enhanced help system."""
    
    def test_create_command_help(self):
        """Test creating command help."""
        help_obj = create_command_help("test", "Test command")
        self.assertIsInstance(help_obj, CommandHelp)
        self.assertEqual(help_obj.command_name, "test")
        self.assertEqual(help_obj.description, "Test command")
    
    def test_add_example(self):
        """Test adding examples to help."""
        help_obj = create_command_help("test", "Test command")
        help_obj.add_example("storycore test", "Run test")
        
        self.assertEqual(len(help_obj.examples), 1)
        self.assertEqual(help_obj.examples[0]['command'], "storycore test")
        self.assertEqual(help_obj.examples[0]['description'], "Run test")
    
    def test_add_note(self):
        """Test adding notes to help."""
        help_obj = create_command_help("test", "Test command")
        help_obj.add_note("This is a note")
        
        self.assertEqual(len(help_obj.notes), 1)
        self.assertEqual(help_obj.notes[0], "This is a note")
    
    def test_add_see_also(self):
        """Test adding see also references."""
        help_obj = create_command_help("test", "Test command")
        help_obj.add_see_also("other")
        
        self.assertEqual(len(help_obj.see_also), 1)
        self.assertEqual(help_obj.see_also[0], "other")
    
    def test_format_epilog(self):
        """Test formatting epilog with examples."""
        help_obj = (create_command_help("test", "Test command")
                   .add_example("storycore test", "Run test")
                   .add_note("Important note"))
        
        epilog = help_obj.format_epilog()
        
        self.assertIn("Examples:", epilog)
        self.assertIn("storycore test", epilog)
        self.assertIn("Notes:", epilog)
        self.assertIn("Important note", epilog)
    
    def test_chaining(self):
        """Test method chaining for help builder."""
        help_obj = (create_command_help("test", "Test command")
                   .add_example("cmd1", "desc1")
                   .add_example("cmd2", "desc2")
                   .add_note("note1")
                   .add_see_also("other"))
        
        self.assertEqual(len(help_obj.examples), 2)
        self.assertEqual(len(help_obj.notes), 1)
        self.assertEqual(len(help_obj.see_also), 1)


class TestDynamicRegistration(unittest.TestCase):
    """Test dynamic handler registration."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = argparse.ArgumentParser()
        self.registry = CommandRegistry(self.parser, lazy_load=False)
    
    def test_register_external_handler(self):
        """Test registering external handler."""
        
        class ExternalHandler(BaseHandler):
            command_name = "external"
            description = "External command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Register external handler
        success = self.registry.register_external_handler(ExternalHandler)
        self.assertTrue(success)
        
        # Verify handler is registered
        handler = self.registry.get_handler("external")
        self.assertIsNotNone(handler)
        self.assertEqual(handler.command_name, "external")
    
    def test_unregister_handler(self):
        """Test unregistering a handler."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Register and then unregister
        self.registry.register_handler(TestHandler)
        success = self.registry.unregister_handler("test")
        
        self.assertTrue(success)
        
        # Verify handler is removed
        handler = self.registry.get_handler("test")
        self.assertIsNone(handler)
    
    def test_get_command_info(self):
        """Test getting command information."""
        
        class TestHandler(BaseHandler):
            command_name = "test"
            description = "Test command"
            aliases = ["t"]
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Register handler
        self.registry.register_handler(TestHandler)
        
        # Get command info
        info = self.registry.get_command_info("test")
        
        self.assertIsNotNone(info)
        self.assertEqual(info['command'], "test")
        self.assertIn("t", info['aliases'])
        self.assertEqual(info['description'], "Test command")


if __name__ == '__main__':
    unittest.main()
