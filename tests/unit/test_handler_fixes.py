"""
Comprehensive fixes for handler tests - adds missing argument attributes.
This file documents the required attributes for each handler's execute method.
"""

# Handler argument requirements:
HANDLER_ARGS = {
    'narrative': ['project'],
    'puppet_layer': ['project', 'character', 'all', 'layers'],
    'scene_breakdown': ['project'],
    'script': ['project', 'text', 'input', 'format', 'extract_characters', 'extract_scenes'],
    'storyboard': ['project', 'generate', 'update', 'validate', 'shots'],
    'video_plan': ['project', 'duration', 'fps', 'style'],
    'shot_planning': ['project', 'style', 'analyze_grammar', 'camera_specs'],
    'world_generate': ['project'],
}

def create_test_args(handler_name, **overrides):
    """Create test arguments with all required attributes for a handler."""
    base_args = {'project': '.'}
    
    if handler_name == 'puppet_layer':
        base_args.update({'character': None, 'all': False, 'layers': None})
    elif handler_name == 'script':
        base_args.update({
            'text': None,
            'input': None,
            'format': 'plain',
            'extract_characters': False,
            'extract_scenes': False
        })
    elif handler_name == 'storyboard':
        base_args.update({
            'generate': False,
            'update': False,
            'validate': False,
            'shots': None
        })
    elif handler_name == 'video_plan':
        base_args.update({
            'duration': None,
            'fps': 24,
            'style': 'cinematic'
        })
    elif handler_name == 'shot_planning':
        base_args.update({
            'style': 'cinematic',
            'analyze_grammar': False,
            'camera_specs': False
        })
    
    base_args.update(overrides)
    return base_args
