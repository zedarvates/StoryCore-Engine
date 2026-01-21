# Examples & Tutorials - Advanced ComfyUI Workflows

## Overview

This comprehensive tutorial collection provides hands-on examples for using advanced ComfyUI workflows. From basic generation to complex creative projects, these tutorials will help you master all aspects of the advanced workflow system.

## Table of Contents

1. [Getting Started Examples](#getting-started-examples)
2. [Video Generation Tutorials](#video-generation-tutorials)
3. [Image Generation Tutorials](#image-generation-tutorials)
4. [Advanced Techniques](#advanced-techniques)
5. [Creative Projects](#creative-projects)
6. [Production Workflows](#production-workflows)
7. [Troubleshooting Examples](#troubleshooting-examples)

## Getting Started Examples

### Example 1: First Video Generation

Let's create your first video using the enhanced video engine:

```python
from src.enhanced_video_engine import EnhancedVideoEngine, VideoGenerationRequest

# Initialize the engine
config = load_config("config/advanced_workflows.json")
engine = EnhancedVideoEngine(config)

# Create a simple video request
request = VideoGenerationRequest(
    prompt="A peaceful lake surrounded by mountains at sunset, gentle ripples on water",
    duration=5.0,
    quality_level="balanced",
    mode="auto"  # Let the system choose the best workflow
)

# Generate the video
print("Starting video generation...")
result = engine.generate_video(request)

print(f"Video generated successfully!")
print(f"Output path: {result.video_path}")
print(f"Quality score: {result.quality_metrics.overall_score:.2f}")
print(f"Generation time: {result.generation_time:.1f} seconds")
print(f"Workflow used: {result.workflow_used}")
```

**Expected Output:**
```
Starting video generation...
[INFO] Selected workflow: hunyuan_t2v (score: 0.92)
[INFO] Loading models... (30s)
[INFO] Generating video... (120s)
[INFO] Quality analysis... (5s)
Video generated successfully!
Output path: outputs/video_20240112_143022.mp4
Quality score: 0.87
Generation time: 155.3 seconds
Workflow used: hunyuan_t2v
```

### Example 2: First Image Generation

Create your first anime-style image:

```python
from src.enhanced_image_engine import EnhancedImageEngine, ImageGenerationRequest

# Initialize the engine
engine = EnhancedImageEngine(config)

# Create an anime image request
request = ImageGenerationRequest(
    prompt="Anime girl with long silver hair and blue eyes, wearing a school uniform, gentle smile",
    mode="anime",
    quality_level="high",
    resolution=(1024, 1536)
)

# Generate the image
print("Starting image generation...")
result = engine.generate_image(request)

print(f"Image generated successfully!")
print(f"Output path: {result.image_path}")
print(f"Quality score: {result.quality_metrics.overall_score:.2f}")
print(f"Generation time: {result.generation_time:.1f} seconds")
```

## Video Generation Tutorials

### Tutorial 1: Creating Cinematic Videos with HunyuanVideo

**Objective:** Create a professional-quality cinematic sequence

**Step 1: Setup and Configuration**
```python
from src.hunyuan_video_integration import HunyuanVideoIntegration

# Configure for high-quality cinematic generation
config = HunyuanVideoConfig(
    model_precision="fp16",
    enable_1080p_sr=True,
    guidance_scale=8.5,
    num_inference_steps=50
)

hunyuan = HunyuanVideoIntegration(config)
```

**Step 2: Create Detailed Prompts**
```python
# Cinematic prompts with specific camera and lighting details
cinematic_prompts = [
    {
        "prompt": "Epic wide shot of a lone warrior standing on a cliff overlooking a vast fantasy landscape, "
                 "dramatic golden hour lighting, cinematic composition, slow camera push-in, "
                 "detailed armor gleaming in sunlight, wind blowing cape dramatically",
        "duration": 8.0,
        "camera_movement": "slow_push_in"
    },
    {
        "prompt": "Close-up of the warrior's determined face, strong jawline, piercing eyes, "
                 "dramatic side lighting creating strong shadows, slight camera tilt for dynamic feel, "
                 "hair moving gently in wind, cinematic depth of field",
        "duration": 4.0,
        "camera_movement": "subtle_tilt"
    },
    {
        "prompt": "Medium shot of warrior drawing sword, blade catching sunlight with lens flare, "
                 "dynamic action pose, camera following the motion, "
                 "particles of dust in air, cinematic color grading",
        "duration": 3.0,
        "camera_movement": "follow_action"
    }
]
```

**Step 3: Generate Cinematic Sequence**
```python
cinematic_results = []

for i, scene in enumerate(cinematic_prompts):
    print(f"Generating scene {i+1}/3: {scene['prompt'][:50]}...")
    
    result = hunyuan.text_to_video(
        prompt=scene['prompt'],
        duration=scene['duration'],
        resolution=(1080, 1920),  # Vertical for social media
        guidance_scale=8.5,
        num_inference_steps=50,
        enable_upscaling=True
    )
    
    cinematic_results.append(result)
    print(f"Scene {i+1} completed. Quality: {result.quality_metrics.overall_score:.2f}")

print("Cinematic sequence completed!")
```

**Step 4: Quality Enhancement and Post-Processing**
```python
from src.advanced_video_quality_monitor import AdvancedVideoQualityMonitor

quality_monitor = AdvancedVideoQualityMonitor(config)

enhanced_results = []
for i, result in enumerate(cinematic_results):
    # Analyze quality
    quality_report = quality_monitor.analyze_quality(result.video_path)
    
    # Apply enhancements if needed
    if quality_report.overall_score < 0.9:
        suggestions = quality_monitor.suggest_improvements(quality_report)
        enhanced_result = quality_monitor.apply_enhancements(
            result.video_path, suggestions
        )
        enhanced_results.append(enhanced_result)
    else:
        enhanced_results.append(result)

# Combine into final sequence (pseudo-code for video editing)
final_video = combine_video_sequences(enhanced_results)
print(f"Final cinematic video: {final_video}")
```

### Tutorial 2: Image-to-Video Animation

**Objective:** Animate a static portrait into a dynamic video

**Step 1: Prepare Reference Image**
```python
# First, generate or prepare a high-quality reference image
reference_request = ImageGenerationRequest(
    prompt="Professional portrait of a young woman with flowing brown hair, "
           "gentle expression, soft lighting, high detail, photorealistic",
    quality_level="ultra",
    resolution=(1024, 1024)
)

reference_result = engine.generate_image(reference_request)
reference_image = reference_result.image_path
```

**Step 2: Create Animation Prompts**
```python
animation_scenarios = [
    {
        "prompt": "The woman slowly turns her head to look directly at camera, "
                 "hair flowing naturally with the movement, maintaining facial features",
        "motion_strength": 0.6,
        "preserve_structure": True
    },
    {
        "prompt": "Gentle smile appears on her face, eyes lighting up with warmth, "
                 "subtle facial expression change, natural and believable",
        "motion_strength": 0.4,
        "preserve_structure": True
    },
    {
        "prompt": "Hair gently blowing in a soft breeze, peaceful expression, "
                 "natural hair movement, maintaining portrait composition",
        "motion_strength": 0.7,
        "preserve_structure": True
    }
]
```

**Step 3: Generate Animations**
```python
animated_results = []

for i, scenario in enumerate(animation_scenarios):
    print(f"Creating animation {i+1}: {scenario['prompt'][:40]}...")
    
    result = hunyuan.image_to_video(
        image_path=reference_image,
        prompt=scenario['prompt'],
        duration=4.0,
        motion_strength=scenario['motion_strength'],
        preserve_structure=scenario['preserve_structure'],
        fps=24
    )
    
    animated_results.append(result)
    
    # Analyze temporal consistency
    consistency_score = quality_monitor.analyze_temporal_consistency(result.video_path)
    print(f"Animation {i+1} - Temporal consistency: {consistency_score:.2f}")

print("Portrait animations completed!")
```

### Tutorial 3: Video Inpainting with Wan Video

**Objective:** Create smooth transitions between different scenes

**Step 1: Prepare Keyframes**
```python
# Generate or prepare start and end keyframes
keyframes = [
    {
        "description": "Sunny day in a park with green trees and blue sky",
        "time_of_day": "day",
        "weather": "sunny"
    },
    {
        "description": "Same park at sunset with orange sky and golden lighting",
        "time_of_day": "sunset", 
        "weather": "clear"
    },
    {
        "description": "Night scene in the same park with street lights and stars",
        "time_of_day": "night",
        "weather": "clear"
    }
]

# Generate keyframe images
keyframe_images = []
for keyframe in keyframes:
    image_request = ImageGenerationRequest(
        prompt=f"Park scene: {keyframe['description']}, high quality, detailed",
        quality_level="high",
        resolution=(1024, 576)  # 16:9 aspect ratio
    )
    
    result = engine.generate_image(image_request)
    keyframe_images.append(result.image_path)
```

**Step 2: Create Smooth Transitions**
```python
from src.wan_video_integration import WanVideoIntegration

wan_integration = WanVideoIntegration(config)

transitions = []

# Create transitions between consecutive keyframes
for i in range(len(keyframe_images) - 1):
    start_image = keyframe_images[i]
    end_image = keyframe_images[i + 1]
    
    transition_prompt = f"Smooth transition from {keyframes[i]['time_of_day']} " \
                       f"to {keyframes[i+1]['time_of_day']}, natural lighting change, " \
                       f"gradual transformation, maintaining scene composition"
    
    print(f"Creating transition {i+1}: {keyframes[i]['time_of_day']} → {keyframes[i+1]['time_of_day']}")
    
    result = wan_integration.inpaint_video(
        start_image=start_image,
        end_image=end_image,
        prompt=transition_prompt,
        duration=6.0,
        noise_level="high",
        use_lightning=False  # Use full quality for smooth transitions
    )
    
    transitions.append(result)
    print(f"Transition {i+1} completed. Quality: {result.quality_metrics.overall_score:.2f}")

print("All transitions completed!")
```

## Image Generation Tutorials

### Tutorial 4: Character Design with NewBie Image

**Objective:** Create consistent anime character designs with detailed control

**Step 1: Define Character with XML**
```python
character_xml = """
<character>
    <basic_info>
        <name>Aria Moonwhisper</name>
        <age>17</age>
        <role>Magical Academy Student</role>
    </basic_info>
    <appearance>
        <hair color="silver_white" style="long_flowing" texture="silky" accessories="blue_ribbon" />
        <eyes color="deep_blue" shape="large_expressive" expression="gentle_determined" />
        <face shape="oval" features="delicate" skin_tone="fair" />
        <body type="slender" height="average" posture="graceful" />
    </appearance>
    <clothing>
        <outfit type="magical_academy_uniform" color_scheme="navy_white_gold" />
        <accessories>
            <item type="pendant" description="glowing_crystal" />
            <item type="gloves" description="white_fingerless" />
            <item type="boots" description="knee_high_leather" />
        </accessories>
    </clothing>
    <personality_traits>
        <trait>kind_hearted</trait>
        <trait>determined</trait>
        <trait>slightly_shy</trait>
    </personality_traits>
</character>
"""
```

**Step 2: Generate Character Reference Sheet**
```python
from src.newbie_image_integration import NewBieImageIntegration

newbie = NewBieImageIntegration(config)

# Parse character definition
character_data = newbie.parse_character_xml(character_xml)

# Generate multiple poses for reference sheet
poses = [
    "standing straight, front view, neutral expression, reference pose",
    "three-quarter view, gentle smile, hand on hip, confident pose",
    "side profile, looking thoughtful, hand near chin, contemplative pose",
    "action pose, casting magic spell, dynamic stance, magical effects around hands"
]

character_references = []

for i, pose_description in enumerate(poses):
    scene_prompt = f"Character reference sheet: {pose_description}, " \
                  f"clean white background, professional character design, " \
                  f"anime art style, high detail, masterpiece quality"
    
    print(f"Generating pose {i+1}: {pose_description[:30]}...")
    
    result = newbie.generate_anime_image(
        character_prompt=character_xml,
        scene_prompt=scene_prompt,
        style="detailed",
        quality_level="ultra"
    )
    
    character_references.append(result)
    print(f"Pose {i+1} completed. Quality: {result.quality_metrics.overall_score:.2f}")

# Save character to library for consistency
character_id = newbie.save_character(character_data, "aria_moonwhisper")
print(f"Character saved with ID: {character_id}")
```

**Step 3: Generate Character in Different Scenes**
```python
# Use saved character in various scenes
scenes = [
    {
        "setting": "magical library with floating books and glowing orbs",
        "action": "reading an ancient spellbook",
        "mood": "focused and studious"
    },
    {
        "setting": "academy courtyard with cherry blossom trees",
        "action": "practicing magic with friends",
        "mood": "happy and social"
    },
    {
        "setting": "moonlit balcony overlooking magical city",
        "action": "gazing at stars with contemplative expression",
        "mood": "peaceful and dreamy"
    }
]

scene_results = []

for i, scene in enumerate(scenes):
    scene_prompt = f"Aria in {scene['setting']}, {scene['action']}, " \
                  f"{scene['mood']} atmosphere, detailed background, " \
                  f"anime art style, cinematic lighting, masterpiece"
    
    print(f"Generating scene {i+1}: {scene['setting'][:30]}...")
    
    result = newbie.generate_with_character(
        character_id=character_id,
        scene_prompt=scene_prompt,
        maintain_consistency=True,
        quality_level="high"
    )
    
    scene_results.append(result)
    
    # Check character consistency
    consistency_score = newbie.check_character_consistency(
        result.image_path, character_id
    )
    print(f"Scene {i+1} - Character consistency: {consistency_score:.2f}")

print("Character design series completed!")
```

### Tutorial 5: Professional Photo Editing with Qwen

**Objective:** Transform a portrait with professional lighting and editing

**Step 1: Prepare Source Image**
```python
# Start with a base portrait (can be generated or uploaded)
source_image = "inputs/portrait_base.jpg"

# Or generate a base portrait
base_request = ImageGenerationRequest(
    prompt="Professional headshot of a business person, neutral expression, "
           "clean background, good composition, natural lighting",
    quality_level="high",
    resolution=(1024, 1024)
)

base_result = engine.generate_image(base_request)
source_image = base_result.image_path
```

**Step 2: Apply Professional Relighting**
```python
from src.qwen_image_suite_integration import QwenImageSuiteIntegration

qwen = QwenImageSuiteIntegration(config)

# Try different professional lighting setups
lighting_setups = [
    {
        "name": "Corporate Headshot",
        "lighting_type": "studio_portrait",
        "intensity": 1.0,
        "description": "Professional studio lighting for corporate headshots"
    },
    {
        "name": "Creative Portrait",
        "lighting_type": "dramatic_side",
        "intensity": 1.2,
        "description": "Dramatic side lighting for artistic portraits"
    },
    {
        "name": "Natural Look",
        "lighting_type": "natural_daylight",
        "intensity": 0.8,
        "description": "Soft natural lighting for approachable look"
    },
    {
        "name": "Golden Hour",
        "lighting_type": "golden_hour",
        "intensity": 1.1,
        "description": "Warm golden hour lighting for premium feel"
    }
]

lighting_results = []

for setup in lighting_setups:
    print(f"Applying {setup['name']} lighting...")
    
    result = qwen.relight_image(
        image_path=source_image,
        lighting_prompt=setup['description'],
        lighting_type=setup['lighting_type'],
        intensity=setup['intensity'],
        preserve_shadows=True
    )
    
    lighting_results.append({
        'name': setup['name'],
        'result': result,
        'setup': setup
    })
    
    print(f"{setup['name']} completed. Quality: {result.quality_metrics.overall_score:.2f}")
```

**Step 3: Advanced Multi-Modal Editing**
```python
# Use the best lighting result for further editing
best_lighting = max(lighting_results, key=lambda x: x['result'].quality_metrics.overall_score)
enhanced_image = best_lighting['result'].image_path

# Prepare style references
style_references = [
    "references/magazine_style.jpg",  # Professional magazine style
    "references/color_palette.jpg"   # Desired color palette
]

# Apply advanced editing with references
final_result = qwen.edit_image_multimodal(
    image_path=enhanced_image,
    reference_images=style_references,
    edit_prompt="Apply professional magazine-style editing with enhanced colors, "
               "subtle skin smoothing, and polished final look while maintaining natural appearance",
    model_version="2511",
    edit_strength=0.6,
    preserve_composition=True
)

print(f"Professional editing completed!")
print(f"Final result: {final_result.image_path}")
print(f"Quality score: {final_result.quality_metrics.overall_score:.2f}")
```

### Tutorial 6: Layered Composition Creation

**Objective:** Create a complex scene using layered generation

**Step 1: Plan Layer Structure**
```python
# Define layers for a fantasy landscape scene
layer_plan = [
    {
        "name": "background_sky",
        "description": "Dramatic sky with clouds and atmospheric perspective",
        "z_order": 0,
        "blend_mode": "normal"
    },
    {
        "name": "distant_mountains",
        "description": "Mountain range silhouettes in the distance",
        "z_order": 1,
        "blend_mode": "multiply"
    },
    {
        "name": "middle_landscape",
        "description": "Rolling hills with forests and meadows",
        "z_order": 2,
        "blend_mode": "normal"
    },
    {
        "name": "foreground_elements",
        "description": "Detailed foreground with rocks, flowers, and grass",
        "z_order": 3,
        "blend_mode": "normal"
    },
    {
        "name": "magical_effects",
        "description": "Floating particles, magical aura, and light effects",
        "z_order": 4,
        "blend_mode": "screen"
    }
]
```

**Step 2: Generate Layered Composition**
```python
# Create the main prompt
main_prompt = "Epic fantasy landscape with magical elements, " \
             "cinematic composition, detailed and atmospheric, " \
             "high quality digital art"

# Generate layered image
layered_result = qwen.generate_layered_image(
    prompt=main_prompt,
    num_layers=len(layer_plan),
    layer_descriptions=[layer["description"] for layer in layer_plan],
    compositing_mode="advanced",
    resolution=(2048, 1024)  # Wide landscape format
)

print(f"Layered composition generated!")
print(f"Composite image: {layered_result.composite_image}")
print(f"Individual layers: {len(layered_result.layers)}")
```

**Step 3: Fine-tune Individual Layers**
```python
# Fine-tune each layer individually
refined_layers = []

for i, (layer_path, layer_info) in enumerate(zip(layered_result.layers, layer_plan)):
    print(f"Refining layer {i+1}: {layer_info['name']}")
    
    # Apply layer-specific enhancements
    if layer_info['name'] == 'background_sky':
        # Enhance sky drama
        refined = qwen.edit_image_multimodal(
            image_path=layer_path,
            reference_images=["references/dramatic_sky.jpg"],
            edit_prompt="Enhance dramatic sky with more dynamic clouds and lighting"
        )
    elif layer_info['name'] == 'magical_effects':
        # Enhance magical elements
        refined = qwen.edit_image_multimodal(
            image_path=layer_path,
            reference_images=["references/magical_particles.jpg"],
            edit_prompt="Enhance magical particles and glowing effects"
        )
    else:
        # General enhancement
        refined = qwen.relight_image(
            image_path=layer_path,
            lighting_type="natural_daylight",
            intensity=1.0
        )
    
    refined_layers.append(refined.image_path)

# Recomposite with refined layers
final_composite = qwen.composite_layers(
    layer_paths=refined_layers,
    blend_modes=[layer["blend_mode"] for layer in layer_plan],
    layer_opacities=[1.0, 0.8, 1.0, 1.0, 0.7]  # Adjust opacity per layer
)

print(f"Final layered composition: {final_composite}")
```

## Advanced Techniques

### Tutorial 7: Batch Processing Optimization

**Objective:** Efficiently process multiple requests with optimal performance

**Step 1: Setup Batch Configuration**
```python
from src.advanced_performance_optimizer import AdvancedPerformanceOptimizer

# Configure for batch processing
batch_config = {
    "strategy": "balanced",
    "max_batch_size": 4,
    "enable_model_sharing": True,
    "parallel_processing": True,
    "memory_optimization": True
}

optimizer = AdvancedPerformanceOptimizer(config)
optimizer.configure_batch_processing(batch_config)
```

**Step 2: Prepare Batch Requests**
```python
# Create a diverse batch of requests
batch_requests = [
    # Video requests
    VideoGenerationRequest(
        prompt="Ocean waves at sunset",
        duration=4.0,
        quality_level="balanced"
    ),
    VideoGenerationRequest(
        prompt="Forest path in autumn",
        duration=5.0,
        quality_level="balanced"
    ),
    
    # Image requests
    ImageGenerationRequest(
        prompt="Anime character portrait",
        mode="anime",
        quality_level="high"
    ),
    ImageGenerationRequest(
        prompt="Mountain landscape photography",
        mode="standard",
        quality_level="high"
    ),
    
    # Mixed requests for different workflows
    VideoGenerationRequest(
        prompt="Character animation from portrait",
        reference_image="inputs/character.jpg",
        mode="i2v_specialized",
        duration=3.0
    )
]
```

**Step 3: Execute Optimized Batch**
```python
# Group requests by workflow type for efficiency
video_requests = [r for r in batch_requests if isinstance(r, VideoGenerationRequest)]
image_requests = [r for r in batch_requests if isinstance(r, ImageGenerationRequest)]

# Process each group with optimal settings
print("Processing video batch...")
video_results = engine.batch_generate_videos(
    video_requests,
    batch_size=2,  # Smaller batch for video (more VRAM intensive)
    parallel_processing=True
)

print("Processing image batch...")
image_results = engine.batch_generate_images(
    image_requests,
    batch_size=4,  # Larger batch for images
    parallel_processing=True
)

# Combine results
all_results = video_results + image_results

# Analyze batch performance
batch_stats = optimizer.analyze_batch_performance(all_results)
print(f"Batch completed in {batch_stats['total_time']:.1f} seconds")
print(f"Average quality: {batch_stats['average_quality']:.2f}")
print(f"Throughput: {batch_stats['throughput']:.1f} generations/hour")
```

### Tutorial 8: Quality-Driven Workflow Selection

**Objective:** Implement intelligent workflow selection based on quality requirements

**Step 1: Define Quality Profiles**
```python
quality_profiles = {
    "draft": {
        "min_quality_score": 0.6,
        "max_generation_time": 30,
        "preferred_workflows": ["wan_lightning", "qwen_lightning"],
        "fallback_workflows": ["basic_video", "basic_image"]
    },
    "production": {
        "min_quality_score": 0.85,
        "max_generation_time": 300,
        "preferred_workflows": ["hunyuan_t2v", "newbie_anime", "qwen_edit"],
        "fallback_workflows": ["hunyuan_i2v", "qwen_relight"]
    },
    "premium": {
        "min_quality_score": 0.92,
        "max_generation_time": 600,
        "preferred_workflows": ["hunyuan_t2v", "qwen_layered"],
        "fallback_workflows": ["hunyuan_i2v", "qwen_edit"]
    }
}
```

**Step 2: Implement Adaptive Quality Control**
```python
class AdaptiveQualityController:
    def __init__(self, quality_profiles):
        self.quality_profiles = quality_profiles
        self.generation_history = []
    
    def select_workflow_for_quality(self, request, target_profile):
        """Select optimal workflow for quality target"""
        profile = self.quality_profiles[target_profile]
        
        # Analyze request characteristics
        content_complexity = self.analyze_content_complexity(request.prompt)
        style_requirements = self.detect_style_requirements(request.prompt)
        
        # Score available workflows
        workflow_scores = {}
        for workflow in profile["preferred_workflows"]:
            score = self.calculate_workflow_suitability(
                workflow, content_complexity, style_requirements, profile
            )
            workflow_scores[workflow] = score
        
        # Select best workflow
        best_workflow = max(workflow_scores, key=workflow_scores.get)
        return best_workflow
    
    def generate_with_quality_assurance(self, request, target_profile):
        """Generate with quality assurance and fallbacks"""
        profile = self.quality_profiles[target_profile]
        max_attempts = 3
        
        for attempt in range(max_attempts):
            # Select workflow for this attempt
            if attempt == 0:
                workflow = self.select_workflow_for_quality(request, target_profile)
            else:
                # Use fallback workflows for retries
                fallbacks = profile["fallback_workflows"]
                workflow = fallbacks[min(attempt-1, len(fallbacks)-1)]
            
            print(f"Attempt {attempt+1}: Using {workflow}")
            
            # Generate with selected workflow
            request.workflow_preference = workflow
            result = engine.generate_video(request) if isinstance(request, VideoGenerationRequest) else engine.generate_image(request)
            
            # Check quality
            if result.quality_metrics.overall_score >= profile["min_quality_score"]:
                print(f"Quality target achieved: {result.quality_metrics.overall_score:.2f}")
                return result
            else:
                print(f"Quality below target: {result.quality_metrics.overall_score:.2f} < {profile['min_quality_score']}")
                
                # Adjust parameters for next attempt
                if attempt < max_attempts - 1:
                    request = self.adjust_parameters_for_quality(request, result.quality_metrics)
        
        # Return best attempt if all fail to meet quality target
        print("Quality target not achieved, returning best attempt")
        return result
```

**Step 3: Use Adaptive Quality Control**
```python
# Initialize quality controller
quality_controller = AdaptiveQualityController(quality_profiles)

# Generate with different quality targets
test_requests = [
    VideoGenerationRequest(
        prompt="Simple nature scene with trees and sky",
        duration=3.0
    ),
    VideoGenerationRequest(
        prompt="Complex fantasy battle scene with multiple characters and magical effects",
        duration=8.0
    )
]

for i, request in enumerate(test_requests):
    print(f"\nGenerating request {i+1} with production quality...")
    
    result = quality_controller.generate_with_quality_assurance(
        request, target_profile="production"
    )
    
    print(f"Final result - Quality: {result.quality_metrics.overall_score:.2f}, "
          f"Time: {result.generation_time:.1f}s, Workflow: {result.workflow_used}")
```

## Creative Projects

### Tutorial 9: Music Video Creation

**Objective:** Create a complete music video with synchronized visuals

**Step 1: Analyze Music Structure**
```python
# Define music structure (in a real scenario, this could be automated)
music_structure = {
    "duration": 180,  # 3 minutes
    "bpm": 120,
    "sections": [
        {"name": "intro", "start": 0, "end": 16, "mood": "mysterious", "energy": "low"},
        {"name": "verse1", "start": 16, "end": 48, "mood": "building", "energy": "medium"},
        {"name": "chorus1", "start": 48, "end": 80, "mood": "energetic", "energy": "high"},
        {"name": "verse2", "start": 80, "end": 112, "mood": "contemplative", "energy": "medium"},
        {"name": "chorus2", "start": 112, "end": 144, "mood": "climactic", "energy": "very_high"},
        {"name": "outro", "start": 144, "end": 180, "mood": "resolution", "energy": "low"}
    ]
}

# Define visual themes for each section
visual_themes = {
    "intro": {
        "setting": "misty forest at dawn",
        "colors": "muted blues and grays",
        "camera": "slow, dreamy movements"
    },
    "verse1": {
        "setting": "character walking through forest",
        "colors": "warming up with golden tones",
        "camera": "following shots, building energy"
    },
    "chorus1": {
        "setting": "character reaches magical clearing",
        "colors": "vibrant greens and golds",
        "camera": "dynamic movements, multiple angles"
    },
    "verse2": {
        "setting": "character reflects by mystical pool",
        "colors": "cool blues and purples",
        "camera": "intimate close-ups, gentle movements"
    },
    "chorus2": {
        "setting": "magical transformation sequence",
        "colors": "brilliant whites and rainbows",
        "camera": "dramatic angles, fast cuts"
    },
    "outro": {
        "setting": "character transformed, peaceful ending",
        "colors": "soft pastels, ethereal lighting",
        "camera": "slow pull-back, serene"
    }
}
```

**Step 2: Generate Video Segments**
```python
music_video_segments = []

for section in music_structure["sections"]:
    section_name = section["name"]
    duration = section["end"] - section["start"]
    theme = visual_themes[section_name]
    
    print(f"Generating {section_name} ({duration}s)...")
    
    # Create detailed prompt based on music and visual theme
    prompt = f"Music video scene: {theme['setting']}, {theme['colors']}, " \
            f"{theme['camera']}, {section['mood']} mood, {section['energy']} energy, " \
            f"cinematic quality, professional music video style, " \
            f"synchronized to {music_structure['bpm']} BPM rhythm"
    
    # Generate video segment
    segment_request = VideoGenerationRequest(
        prompt=prompt,
        duration=duration,
        quality_level="high",
        fps=30,  # Higher fps for music video
        resolution=(1920, 1080)  # Full HD
    )
    
    result = engine.generate_video(segment_request)
    
    music_video_segments.append({
        'section': section_name,
        'video_path': result.video_path,
        'start_time': section['start'],
        'end_time': section['end'],
        'quality_score': result.quality_metrics.overall_score
    })
    
    print(f"{section_name} completed - Quality: {result.quality_metrics.overall_score:.2f}")

print("All music video segments generated!")
```

**Step 3: Create Synchronized Final Video**
```python
# Combine segments with music synchronization (pseudo-code)
def create_music_video(segments, music_file, output_path):
    """Combine video segments with music track"""
    
    # This would use video editing libraries like moviepy
    from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
    
    # Load music
    audio = AudioFileClip(music_file)
    
    # Process video segments
    video_clips = []
    for segment in segments:
        clip = VideoFileClip(segment['video_path'])
        
        # Trim to exact timing
        start_time = segment['start_time']
        end_time = segment['end_time']
        duration = end_time - start_time
        
        # Adjust clip duration and add effects based on section
        clip = clip.subclip(0, duration)
        
        # Add section-specific effects
        if segment['section'] in ['chorus1', 'chorus2']:
            # Add dynamic effects for chorus sections
            clip = clip.fx(vfx.colorx, 1.2)  # Increase saturation
        elif segment['section'] == 'intro':
            # Add fade in for intro
            clip = clip.fadein(2.0)
        elif segment['section'] == 'outro':
            # Add fade out for outro
            clip = clip.fadeout(3.0)
        
        video_clips.append(clip)
    
    # Combine all clips
    final_video = concatenate_videoclips(video_clips)
    
    # Add audio track
    final_video = final_video.set_audio(audio)
    
    # Export final music video
    final_video.write_videofile(
        output_path,
        fps=30,
        codec='libx264',
        audio_codec='aac'
    )
    
    return output_path

# Create final music video
final_music_video = create_music_video(
    music_video_segments,
    "inputs/background_music.mp3",
    "outputs/complete_music_video.mp4"
)

print(f"Music video completed: {final_music_video}")
```

### Tutorial 10: Interactive Story Generation

**Objective:** Create an interactive visual story with branching narratives

**Step 1: Define Story Structure**
```python
story_structure = {
    "title": "The Enchanted Forest Adventure",
    "scenes": {
        "start": {
            "description": "A young adventurer stands at the edge of a mysterious forest",
            "prompt": "Young adventurer with backpack standing at forest entrance, "
                     "mysterious fog, ancient trees, sense of wonder and anticipation",
            "choices": [
                {"text": "Enter the forest cautiously", "next": "careful_path"},
                {"text": "Rush in boldly", "next": "bold_path"}
            ]
        },
        "careful_path": {
            "description": "Taking the safe route through well-worn paths",
            "prompt": "Adventurer walking carefully on forest path, dappled sunlight, "
                     "peaceful woodland creatures, safe and serene atmosphere",
            "choices": [
                {"text": "Follow the stream", "next": "stream_discovery"},
                {"text": "Investigate strange sounds", "next": "mystery_encounter"}
            ]
        },
        "bold_path": {
            "description": "Charging through dense undergrowth",
            "prompt": "Adventurer pushing through thick forest, dramatic lighting, "
                     "sense of danger and excitement, wild and untamed nature",
            "choices": [
                {"text": "Climb the ancient tree", "next": "tree_top_view"},
                {"text": "Enter the dark cave", "next": "cave_exploration"}
            ]
        },
        "stream_discovery": {
            "description": "Finding a magical stream with glowing water",
            "prompt": "Adventurer by magical stream with glowing blue water, "
                     "fairy lights, mystical atmosphere, sense of magic and wonder",
            "choices": [
                {"text": "Drink from the stream", "next": "magical_transformation"},
                {"text": "Follow stream to source", "next": "hidden_grove"}
            ]
        },
        # ... more scenes
    }
}
```

**Step 2: Generate Interactive Scenes**
```python
class InteractiveStoryGenerator:
    def __init__(self, engine):
        self.engine = engine
        self.generated_scenes = {}
        self.story_state = {}
    
    def generate_scene(self, scene_id, previous_choices=None):
        """Generate visual for a story scene"""
        scene_data = story_structure["scenes"][scene_id]
        
        # Enhance prompt based on previous choices
        enhanced_prompt = self.enhance_prompt_with_context(
            scene_data["prompt"], previous_choices
        )
        
        print(f"Generating scene: {scene_id}")
        print(f"Description: {scene_data['description']}")
        
        # Generate scene image
        scene_request = ImageGenerationRequest(
            prompt=enhanced_prompt,
            quality_level="high",
            resolution=(1920, 1080),
            style="cinematic"
        )
        
        result = self.engine.generate_image(scene_request)
        
        # Store generated scene
        self.generated_scenes[scene_id] = {
            'image_path': result.image_path,
            'description': scene_data['description'],
            'choices': scene_data['choices'],
            'quality_score': result.quality_metrics.overall_score
        }
        
        return self.generated_scenes[scene_id]
    
    def enhance_prompt_with_context(self, base_prompt, previous_choices):
        """Enhance prompt based on story context"""
        if not previous_choices:
            return base_prompt
        
        # Add context based on previous choices
        context_additions = []
        
        if "cautious" in str(previous_choices):
            context_additions.append("careful and observant character")
        elif "bold" in str(previous_choices):
            context_additions.append("confident and adventurous character")
        
        if context_additions:
            enhanced = f"{base_prompt}, {', '.join(context_additions)}"
        else:
            enhanced = base_prompt
        
        return enhanced
    
    def create_choice_visualization(self, scene_id):
        """Create visual representation of choices"""
        scene = self.generated_scenes[scene_id]
        
        choice_images = []
        for i, choice in enumerate(scene['choices']):
            # Generate preview of what each choice leads to
            next_scene_id = choice['next']
            if next_scene_id in story_structure["scenes"]:
                next_scene = story_structure["scenes"][next_scene_id]
                
                preview_prompt = f"Preview of choice outcome: {next_scene['description']}, " \
                               f"small vignette style, {choice['text']} action"
                
                preview_request = ImageGenerationRequest(
                    prompt=preview_prompt,
                    quality_level="balanced",
                    resolution=(512, 512)
                )
                
                preview_result = self.engine.generate_image(preview_request)
                choice_images.append({
                    'choice_text': choice['text'],
                    'preview_image': preview_result.image_path,
                    'next_scene': next_scene_id
                })
        
        return choice_images
```

**Step 3: Generate Complete Interactive Story**
```python
# Initialize story generator
story_generator = InteractiveStoryGenerator(engine)

# Generate starting scene
current_scene = "start"
story_path = []

# Simulate interactive story generation
story_scenes = {}
choice_history = []

# Generate all possible scenes for the story
scenes_to_generate = ["start", "careful_path", "bold_path", "stream_discovery", 
                     "tree_top_view", "cave_exploration", "magical_transformation"]

for scene_id in scenes_to_generate:
    print(f"\n--- Generating Scene: {scene_id} ---")
    
    scene_result = story_generator.generate_scene(scene_id, choice_history)
    story_scenes[scene_id] = scene_result
    
    # Generate choice visualizations
    if scene_result['choices']:
        choice_visuals = story_generator.create_choice_visualization(scene_id)
        story_scenes[scene_id]['choice_visuals'] = choice_visuals
    
    print(f"Scene quality: {scene_result['quality_score']:.2f}")

# Create interactive story package
story_package = {
    'title': story_structure['title'],
    'scenes': story_scenes,
    'structure': story_structure,
    'metadata': {
        'total_scenes': len(story_scenes),
        'average_quality': sum(s['quality_score'] for s in story_scenes.values()) / len(story_scenes),
        'generation_date': datetime.now().isoformat()
    }
}

print(f"\nInteractive story completed!")
print(f"Total scenes: {story_package['metadata']['total_scenes']}")
print(f"Average quality: {story_package['metadata']['average_quality']:.2f}")
```

## Production Workflows

### Tutorial 11: Automated Content Pipeline

**Objective:** Create an automated pipeline for content generation at scale

**Step 1: Setup Pipeline Configuration**
```python
class ContentPipeline:
    def __init__(self, config):
        self.config = config
        self.video_engine = EnhancedVideoEngine(config)
        self.image_engine = EnhancedImageEngine(config)
        self.quality_monitor = AdvancedVideoQualityMonitor(config)
        self.performance_optimizer = AdvancedPerformanceOptimizer(config)
        
        # Pipeline statistics
        self.stats = {
            'total_processed': 0,
            'successful_generations': 0,
            'failed_generations': 0,
            'average_quality': 0.0,
            'total_processing_time': 0.0
        }
    
    def process_content_batch(self, content_requests):
        """Process a batch of content requests"""
        print(f"Processing batch of {len(content_requests)} requests...")
        
        # Optimize batch for performance
        optimized_batch = self.performance_optimizer.optimize_batch(content_requests)
        
        results = []
        start_time = time.time()
        
        for i, request in enumerate(optimized_batch):
            print(f"Processing request {i+1}/{len(optimized_batch)}")
            
            try:
                # Generate content
                if isinstance(request, VideoGenerationRequest):
                    result = self.video_engine.generate_video(request)
                else:
                    result = self.image_engine.generate_image(request)
                
                # Quality check
                if result.quality_metrics.overall_score >= self.config.quality_threshold:
                    results.append(result)
                    self.stats['successful_generations'] += 1
                else:
                    # Retry with enhanced settings
                    enhanced_request = self.enhance_request_for_quality(request)
                    retry_result = self.retry_generation(enhanced_request)
                    results.append(retry_result)
                
            except Exception as e:
                print(f"Generation failed: {e}")
                self.stats['failed_generations'] += 1
                continue
            
            self.stats['total_processed'] += 1
        
        # Update statistics
        processing_time = time.time() - start_time
        self.stats['total_processing_time'] += processing_time
        
        if results:
            avg_quality = sum(r.quality_metrics.overall_score for r in results) / len(results)
            self.stats['average_quality'] = avg_quality
        
        return results
```

**Step 2: Content Template System**
```python
class ContentTemplateSystem:
    def __init__(self):
        self.templates = {
            'social_media_video': {
                'duration': 15,
                'resolution': (1080, 1920),  # Vertical
                'quality_level': 'balanced',
                'style_keywords': ['trendy', 'engaging', 'vibrant'],
                'target_audience': 'social_media'
            },
            'marketing_hero_image': {
                'resolution': (1920, 1080),  # Horizontal
                'quality_level': 'high',
                'style_keywords': ['professional', 'clean', 'impactful'],
                'target_audience': 'business'
            },
            'product_showcase_video': {
                'duration': 30,
                'resolution': (1920, 1080),
                'quality_level': 'high',
                'style_keywords': ['premium', 'detailed', 'showcase'],
                'target_audience': 'customers'
            }
        }
    
    def generate_from_template(self, template_name, custom_params):
        """Generate content request from template"""
        template = self.templates[template_name]
        
        # Merge template with custom parameters
        request_params = {**template, **custom_params}
        
        # Build enhanced prompt
        enhanced_prompt = self.build_enhanced_prompt(
            custom_params.get('base_prompt', ''),
            template['style_keywords'],
            template['target_audience']
        )
        
        # Create appropriate request type
        if 'duration' in request_params:
            return VideoGenerationRequest(
                prompt=enhanced_prompt,
                duration=request_params['duration'],
                resolution=request_params['resolution'],
                quality_level=request_params['quality_level']
            )
        else:
            return ImageGenerationRequest(
                prompt=enhanced_prompt,
                resolution=request_params['resolution'],
                quality_level=request_params['quality_level']
            )
    
    def build_enhanced_prompt(self, base_prompt, style_keywords, target_audience):
        """Build enhanced prompt with template context"""
        style_text = ', '.join(style_keywords)
        
        enhanced = f"{base_prompt}, {style_text} style, "
        
        if target_audience == 'social_media':
            enhanced += "eye-catching, shareable, modern aesthetic"
        elif target_audience == 'business':
            enhanced += "professional, corporate, high-end presentation"
        elif target_audience == 'customers':
            enhanced += "appealing, trustworthy, product-focused"
        
        return enhanced
```

**Step 3: Automated Quality Assurance**
```python
class AutomatedQA:
    def __init__(self, quality_standards):
        self.quality_standards = quality_standards
        self.qa_history = []
    
    def comprehensive_quality_check(self, result, content_type):
        """Perform comprehensive quality assessment"""
        qa_report = {
            'content_path': result.video_path if hasattr(result, 'video_path') else result.image_path,
            'content_type': content_type,
            'timestamp': datetime.now(),
            'checks': {}
        }
        
        # Technical quality checks
        qa_report['checks']['technical'] = self.check_technical_quality(result)
        
        # Content appropriateness checks
        qa_report['checks']['content'] = self.check_content_appropriateness(result)
        
        # Brand compliance checks (if applicable)
        qa_report['checks']['brand'] = self.check_brand_compliance(result)
        
        # Overall assessment
        qa_report['overall_pass'] = all(
            check['pass'] for check in qa_report['checks'].values()
        )
        
        qa_report['overall_score'] = sum(
            check['score'] for check in qa_report['checks'].values()
        ) / len(qa_report['checks'])
        
        self.qa_history.append(qa_report)
        return qa_report
    
    def check_technical_quality(self, result):
        """Check technical quality metrics"""
        quality_metrics = result.quality_metrics
        standards = self.quality_standards['technical']
        
        checks = {
            'resolution': quality_metrics.resolution_score >= standards['min_resolution_score'],
            'sharpness': quality_metrics.sharpness >= standards['min_sharpness'],
            'color_accuracy': quality_metrics.color_accuracy >= standards['min_color_accuracy'],
            'artifacts': quality_metrics.artifact_score <= standards['max_artifacts']
        }
        
        return {
            'pass': all(checks.values()),
            'score': sum(checks.values()) / len(checks),
            'details': checks
        }
    
    def generate_qa_report(self, batch_results):
        """Generate comprehensive QA report for batch"""
        report = {
            'batch_summary': {
                'total_items': len(batch_results),
                'passed_qa': sum(1 for r in batch_results if r['qa_result']['overall_pass']),
                'average_score': sum(r['qa_result']['overall_score'] for r in batch_results) / len(batch_results),
                'processing_date': datetime.now().isoformat()
            },
            'quality_breakdown': self.analyze_quality_patterns(batch_results),
            'recommendations': self.generate_improvement_recommendations(batch_results)
        }
        
        return report
```

**Step 4: Complete Production Pipeline**
```python
# Initialize production pipeline
pipeline_config = load_config("config/production_pipeline.json")
content_pipeline = ContentPipeline(pipeline_config)
template_system = ContentTemplateSystem()
qa_system = AutomatedQA(pipeline_config.quality_standards)

# Define production batch
production_requests = [
    # Social media content
    {
        'template': 'social_media_video',
        'custom_params': {
            'base_prompt': 'Product launch announcement with excitement',
            'brand_colors': ['blue', 'white'],
            'call_to_action': 'Learn More'
        }
    },
    {
        'template': 'marketing_hero_image',
        'custom_params': {
            'base_prompt': 'Professional team collaboration in modern office',
            'brand_style': 'corporate_modern'
        }
    },
    # Add more requests...
]

# Generate content requests from templates
content_requests = []
for req_config in production_requests:
    request = template_system.generate_from_template(
        req_config['template'],
        req_config['custom_params']
    )
    content_requests.append(request)

# Process production batch
print("Starting production batch processing...")
batch_results = content_pipeline.process_content_batch(content_requests)

# Quality assurance for all results
qa_results = []
for result in batch_results:
    content_type = 'video' if hasattr(result, 'video_path') else 'image'
    qa_result = qa_system.comprehensive_quality_check(result, content_type)
    
    qa_results.append({
        'generation_result': result,
        'qa_result': qa_result
    })

# Generate final production report
production_report = qa_system.generate_qa_report(qa_results)

print(f"Production batch completed!")
print(f"Success rate: {production_report['batch_summary']['passed_qa']}/{production_report['batch_summary']['total_items']}")
print(f"Average quality: {production_report['batch_summary']['average_score']:.2f}")

# Save production assets and reports
save_production_batch(qa_results, production_report)
```

---

*This examples and tutorials guide provides comprehensive hands-on experience with advanced ComfyUI workflows. For additional support, see the [Troubleshooting Guide](troubleshooting.md) and [API Reference](api-reference.md).*