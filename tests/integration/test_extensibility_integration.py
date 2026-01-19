"""
Integration tests for CLI extensibility features.
Tests the complete workflow of plugins, aliases, and hooks.
"""

import argparse
import tempfile
import unittest
from pathlib import Path

from src.cli.base import BaseHandler
from src.cli.core import CLICore
from src.cli.registry import CommandRegistry


class TestExtensibilityIntegration(unittest.TestCase):
    """Integration tests for extensibility features."""
    
    def test_complete_plugin_workflow(self):
        """Test complete workflow: register plugin, use alias, execute with hooks."""
        
        # Create a test handler
        class TestPluginHandler(BaseHandler):
            command_name = "testplugin"
            description = "Test plugin command"
            aliases = ["tp"]
            
            def setup_parser(self, parser):
                parser.add_argument("--value", default="test")
            
            def execute(self, args):
                return 0
        
        # Create CLI core
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        cli.register_handlers()
        
        # Register plugin
        success = cli.registry.register_external_handler(TestPluginHandler)
        self.assertTrue(success)
        
        # Verify handler is accessible by name
        handler = cli.registry.get_handler("testplugin")
        self.assertIsNotNone(handler)
        
        # Verify handler is accessible by alias
        handler_by_alias = cli.registry.get_handler("tp")
        self.assertIsNotNone(handler_by_alias)
        self.assertEqual(handler.command_name, handler_by_alias.command_name)
    
    def test_hooks_with_real_execution(self):
        """Test hooks work with actual command execution."""
        
        # Track hook execution
        hook_state = {'pre': False, 'post': False, 'exit_code': None}
        
        class TestHandler(BaseHandler):
            command_name = "testhooks"
            description = "Test hooks"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 42
        
        # Create and register handler
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        cli.register_handlers()
        cli.registry.register_external_handler(TestHandler)
        
        # Get handler and add hooks
        handler = cli.registry.get_handler("testhooks")
        
        def pre_hook(args):
            hook_state['pre'] = True
        
        def post_hook(args, exit_code):
            hook_state['post'] = True
            hook_state['exit_code'] = exit_code
        
        handler.add_pre_hook(pre_hook)
        handler.add_post_hook(post_hook)
        
        # Execute command
        args = argparse.Namespace(command="testhooks")
        exit_code = handler.execute_with_hooks(args)
        
        # Verify hooks were called
        self.assertTrue(hook_state['pre'])
        self.assertTrue(hook_state['post'])
        self.assertEqual(hook_state['exit_code'], 42)
        self.assertEqual(exit_code, 42)
    
    def test_enhanced_help_integration(self):
        """Test enhanced help system integration."""
        
        from src.cli.help import create_command_help
        
        class TestHelpHandler(BaseHandler):
            command_name = "testhelp"
            description = "Test help"
            
            def get_help(self):
                return (create_command_help(self.command_name, self.description)
                       .add_example("storycore testhelp", "Run test")
                       .add_note("This is a test"))
            
            def setup_parser(self, parser):
                self.setup_help(parser)
            
            def execute(self, args):
                return 0
        
        # Create handler
        handler = TestHelpHandler()
        
        # Get help
        help_obj = handler.get_help()
        self.assertIsNotNone(help_obj)
        self.assertEqual(len(help_obj.examples), 1)
        self.assertEqual(len(help_obj.notes), 1)
        
        # Format epilog
        epilog = help_obj.format_epilog()
        self.assertIn("Examples:", epilog)
        self.assertIn("storycore testhelp", epilog)
        self.assertIn("Notes:", epilog)
        self.assertIn("This is a test", epilog)
    
    def test_command_info_retrieval(self):
        """Test retrieving command information."""
        
        class InfoTestHandler(BaseHandler):
            command_name = "infotest"
            description = "Info test command"
            aliases = ["it", "info"]
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 0
        
        # Create CLI and register handler
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        cli.register_handlers()
        cli.registry.register_external_handler(InfoTestHandler)
        
        # Get command info
        info = cli.registry.get_command_info("infotest")
        
        self.assertIsNotNone(info)
        self.assertEqual(info['command'], "infotest")
        self.assertEqual(info['description'], "Info test command")
        self.assertIn("it", info['aliases'])
        self.assertIn("info", info['aliases'])
        self.assertTrue(info['loaded'])
    
    def test_multiple_plugins_coexist(self):
        """Test multiple plugins can coexist without conflicts."""
        
        class Plugin1Handler(BaseHandler):
            command_name = "plugin1"
            description = "Plugin 1"
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 1
        
        class Plugin2Handler(BaseHandler):
            command_name = "plugin2"
            description = "Plugin 2"
            aliases = ["p2"]
            
            def setup_parser(self, parser):
                pass
            
            def execute(self, args):
                return 2
        
        # Create CLI and register both plugins
        cli = CLICore(lazy_load=False)
        cli.setup_parser()
        cli.register_handlers()
        
        cli.registry.register_external_handler(Plugin1Handler)
        cli.registry.register_external_handler(Plugin2Handler)
        
        # Verify both are registered
        handler1 = cli.registry.get_handler("plugin1")
        handler2 = cli.registry.get_handler("plugin2")
        handler2_alias = cli.registry.get_handler("p2")
        
        self.assertIsNotNone(handler1)
        self.assertIsNotNone(handler2)
        self.assertIsNotNone(handler2_alias)
        
        # Verify they execute independently
        args = argparse.Namespace()
        self.assertEqual(handler1.execute(args), 1)
        self.assertEqual(handler2.execute(args), 2)


if __name__ == '__main__':
    unittest.main()
