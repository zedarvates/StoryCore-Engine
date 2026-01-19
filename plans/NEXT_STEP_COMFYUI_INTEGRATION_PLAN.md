# Plan d'Intégration ComfyUI pour Wan ATI

**Date:** 14 janvier 2026  
**Objectif:** Intégrer le workflow ComfyUI réel pour remplacer la génération mock  
**Durée Estimée:** 2-3 jours

---

## 📋 Vue d'Ensemble

### Objectif Principal
Remplacer la génération vidéo mock dans `WanATIIntegration.generate_trajectory_video()` par une exécution réelle du workflow ComfyUI `video_wan_ati.json`.

### Résultat Attendu
- ✅ Génération de vidéos réelles avec contrôle de trajectoire
- ✅ Intégration complète avec l'API ComfyUI
- ✅ Support CLIP vision encoding
- ✅ Monitoring de progression en temps réel
- ✅ Gestion d'erreurs robuste

---

## 🏗️ Architecture Proposée

### 1. ComfyUI Workflow Executor

```python
# src/comfyui_workflow_executor.py

import asyncio
import json
import uuid
import websockets
import aiohttp
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ComfyUIConfig:
    """Configuration for ComfyUI connection"""
    host: str = "localhost"
    port: int = 8188
    timeout: int = 300  # 5 minutes
    check_interval: float = 1.0  # Check status every second


class ComfyUIWorkflowExecutor:
    """Execute ComfyUI workflows via API"""
    
    def __init__(self, config: ComfyUIConfig):
        self.config = config
        self.base_url = f"http://{config.host}:{config.port}"
        self.ws_url = f"ws://{config.host}:{config.port}/ws"
        self.client_id = str(uuid.uuid4())
        
    async def execute_workflow(
        self,
        workflow: Dict[str, Any],
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> Dict[str, Any]:
        """
        Execute a ComfyUI workflow
        
        Args:
            workflow: Workflow JSON structure
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with execution results
        """
        # 1. Submit workflow
        prompt_id = await self._submit_workflow(workflow)
        logger.info(f"Workflow submitted: {prompt_id}")
        
        # 2. Monitor execution via WebSocket
        result = await self._monitor_execution(
            prompt_id,
            progress_callback
        )
        
        # 3. Retrieve generated images/videos
        outputs = await self._retrieve_outputs(prompt_id, result)
        
        return {
            "prompt_id": prompt_id,
            "outputs": outputs,
            "status": "success"
        }
    
    async def _submit_workflow(self, workflow: Dict[str, Any]) -> str:
        """Submit workflow to ComfyUI API"""
        prompt = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/prompt",
                json=prompt
            ) as response:
                if response.status != 200:
                    raise RuntimeError(f"Failed to submit workflow: {response.status}")
                
                data = await response.json()
                return data["prompt_id"]
    
    async def _monitor_execution(
        self,
        prompt_id: str,
        progress_callback: Optional[Callable[[str, float], None]]
    ) -> Dict[str, Any]:
        """Monitor workflow execution via WebSocket"""
        async with websockets.connect(
            f"{self.ws_url}?clientId={self.client_id}"
        ) as websocket:
            start_time = asyncio.get_event_loop().time()
            
            while True:
                # Check timeout
                if asyncio.get_event_loop().time() - start_time > self.config.timeout:
                    raise TimeoutError(f"Workflow execution timeout after {self.config.timeout}s")
                
                # Receive message
                message = await websocket.recv()
                data = json.loads(message)
                
                # Handle different message types
                if data["type"] == "executing":
                    node_id = data["data"]["node"]
                    if node_id is None:
                        # Execution complete
                        logger.info("Workflow execution complete")
                        break
                    else:
                        logger.info(f"Executing node: {node_id}")
                
                elif data["type"] == "progress":
                    # Progress update
                    value = data["data"]["value"]
                    max_value = data["data"]["max"]
                    progress = value / max_value if max_value > 0 else 0
                    
                    if progress_callback:
                        progress_callback(f"Processing: {value}/{max_value}", progress)
                
                elif data["type"] == "execution_error":
                    # Execution error
                    error = data["data"]
                    raise RuntimeError(f"Workflow execution error: {error}")
            
            # Get final result
            return await self._get_history(prompt_id)
    
    async def _get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get execution history"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/history/{prompt_id}"
            ) as response:
                if response.status != 200:
                    raise RuntimeError(f"Failed to get history: {response.status}")
                
                data = await response.json()
                return data[prompt_id]
    
    async def _retrieve_outputs(
        self,
        prompt_id: str,
        history: Dict[str, Any]
    ) -> Dict[str, List[bytes]]:
        """Retrieve output files from ComfyUI"""
        outputs = {}
        
        for node_id, node_output in history["outputs"].items():
            if "images" in node_output:
                outputs[node_id] = []
                for image_info in node_output["images"]:
                    filename = image_info["filename"]
                    subfolder = image_info.get("subfolder", "")
                    
                    # Download image
                    image_data = await self._download_file(
                        filename,
                        subfolder,
                        image_info["type"]
                    )
                    outputs[node_id].append(image_data)
            
            elif "videos" in node_output:
                outputs[node_id] = []
                for video_info in node_output["videos"]:
                    filename = video_info["filename"]
                    subfolder = video_info.get("subfolder", "")
                    
                    # Download video
                    video_data = await self._download_file(
                        filename,
                        subfolder,
                        video_info["type"]
                    )
                    outputs[node_id].append(video_data)
        
        return outputs
    
    async def _download_file(
        self,
        filename: str,
        subfolder: str,
        file_type: str
    ) -> bytes:
        """Download a file from ComfyUI"""
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": file_type
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/view",
                params=params
            ) as response:
                if response.status != 200:
                    raise RuntimeError(f"Failed to download file: {response.status}")
                
                return await response.read()
    
    async def check_connection(self) -> bool:
        """Check if ComfyUI is accessible"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"ComfyUI connection check failed: {e}")
            return False
```

---

## 🔧 Intégration dans WanATIIntegration

### Modifications à `src/wan_ati_integration.py`

```python
# Ajouter les imports
from .comfyui_workflow_executor import ComfyUIWorkflowExecutor, ComfyUIConfig
import base64
from io import BytesIO

class WanATIIntegration:
    """Integration for Wan Video ATI (Advanced Trajectory Interface)"""
    
    def __init__(
        self,
        config: WanATIConfig,
        comfyui_config: Optional[ComfyUIConfig] = None
    ):
        """Initialize Wan ATI integration"""
        self.config = config
        self.trajectory_system = TrajectoryControlSystem()
        
        # Initialize ComfyUI executor
        self.comfyui_config = comfyui_config or ComfyUIConfig()
        self.workflow_executor = ComfyUIWorkflowExecutor(self.comfyui_config)
        
        # Load workflow template
        self.workflow_template = self._load_workflow_template()
        
        logger.info("Wan ATI Integration initialized")
        # ... rest of init
    
    def _load_workflow_template(self) -> Dict[str, Any]:
        """Load ComfyUI workflow template"""
        workflow_path = Path(__file__).parent.parent / "video_wan_ati.json"
        
        if not workflow_path.exists():
            logger.warning(f"Workflow template not found: {workflow_path}")
            return {}
        
        with open(workflow_path, 'r') as f:
            return json.load(f)
    
    async def generate_trajectory_video(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str = "",
        progress_callback: Optional[Callable[[str, float], None]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate video with trajectory-based motion control"""
        logger.info(f"Generating trajectory video with {len(trajectories)} trajectories")
        logger.info(f"Prompt: {prompt}")
        
        # Validate trajectories
        if self.config.enable_trajectory_validation:
            for i, traj in enumerate(trajectories):
                is_valid, errors = self.trajectory_system.validate_trajectory(
                    traj,
                    (self.config.width, self.config.height),
                    self.config.length
                )
                if not is_valid:
                    raise ValueError(f"Trajectory {i} validation failed: {errors}")
        
        # Interpolate trajectories to match frame count
        interpolated_trajectories = []
        for traj in trajectories:
            interpolated = traj.interpolate(
                self.config.length,
                self.config.interpolation_method
            )
            interpolated_trajectories.append(interpolated)
        
        # Check ComfyUI connection
        if not await self.workflow_executor.check_connection():
            logger.error("ComfyUI is not accessible")
            raise RuntimeError(
                f"Cannot connect to ComfyUI at {self.comfyui_config.host}:{self.comfyui_config.port}. "
                "Please ensure ComfyUI is running."
            )
        
        # Prepare workflow
        workflow = self._prepare_workflow(
            start_image,
            interpolated_trajectories,
            prompt,
            negative_prompt,
            **kwargs
        )
        
        # Execute workflow
        logger.info("Executing ComfyUI workflow...")
        result = await self.workflow_executor.execute_workflow(
            workflow,
            progress_callback
        )
        
        # Process results
        video_frames = self._extract_video_frames(result)
        
        # Calculate quality metrics
        quality_metrics = {}
        if video_frames:
            quality_metrics = {
                "trajectory_adherence": self._calculate_trajectory_adherence(
                    video_frames,
                    interpolated_trajectories[0]
                ),
                "motion_smoothness": self._calculate_motion_smoothness(video_frames),
                "visual_consistency": self._calculate_visual_consistency(video_frames)
            }
        
        return {
            "video_frames": video_frames,
            "metadata": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": self.config.width,
                "height": self.config.height,
                "length": self.config.length,
                "num_trajectories": len(trajectories),
                "trajectory_strength": self.config.trajectory_strength,
                "trajectory_decay": self.config.trajectory_decay,
                "steps": self.config.steps,
                "cfg_scale": self.config.cfg_scale,
                "prompt_id": result["prompt_id"]
            },
            "quality_metrics": quality_metrics
        }
    
    def _prepare_workflow(
        self,
        start_image: Image.Image,
        trajectories: List[Trajectory],
        prompt: str,
        negative_prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Prepare ComfyUI workflow with parameters"""
        workflow = self.workflow_template.copy()
        
        # Convert trajectories to JSON string
        trajectory_json = self._trajectories_to_json(trajectories)
        
        # Save start image temporarily
        image_path = self._save_temp_image(start_image)
        
        # Update workflow nodes
        # Node 6: Positive prompt
        workflow["nodes"][15]["widgets_values"][0] = prompt
        
        # Node 7: Negative prompt
        workflow["nodes"][3]["widgets_values"][0] = negative_prompt
        
        # Node 240: Load image
        workflow["nodes"][8]["widgets_values"][0] = image_path.name
        
        # Node 247: Trajectory JSON
        workflow["nodes"][16]["widgets_values"][0] = trajectory_json
        
        # Node 248: WanTrackToVideo parameters
        workflow["nodes"][2]["widgets_values"] = [
            trajectory_json,  # tracks
            self.config.width,  # width
            self.config.height,  # height
            self.config.length,  # length
            self.config.batch_size,  # batch_size
            self.config.trajectory_strength,  # trajectory_strength
            self.config.trajectory_decay  # trajectory_decay
        ]
        
        # Node 3: KSampler parameters
        workflow["nodes"][12]["widgets_values"] = [
            kwargs.get("seed", 48),  # seed
            "fixed",  # control_after_generate
            self.config.steps,  # steps
            self.config.cfg_scale,  # cfg
            self.config.sampler,  # sampler_name
            self.config.scheduler,  # scheduler
            1  # denoise
        ]
        
        return workflow
    
    def _trajectories_to_json(self, trajectories: List[Trajectory]) -> str:
        """Convert trajectories to JSON string"""
        data = []
        for traj in trajectories:
            points = [{"x": p.x, "y": p.y} for p in traj.points]
            data.append(points)
        return json.dumps(data)
    
    def _save_temp_image(self, image: Image.Image) -> Path:
        """Save image temporarily for ComfyUI"""
        temp_dir = Path("temp_assets")
        temp_dir.mkdir(exist_ok=True)
        
        temp_path = temp_dir / f"wan_ati_input_{uuid.uuid4().hex[:8]}.png"
        image.save(temp_path)
        
        return temp_path
    
    def _extract_video_frames(self, result: Dict[str, Any]) -> List[Image.Image]:
        """Extract video frames from ComfyUI result"""
        frames = []
        
        # Find video output node (typically node 258: SaveVideo)
        for node_id, outputs in result["outputs"].items():
            if outputs:
                for output_data in outputs:
                    # Convert bytes to PIL Image
                    image = Image.open(BytesIO(output_data))
                    frames.append(image)
        
        return frames
    
    def _calculate_trajectory_adherence(
        self,
        video_frames: List[Image.Image],
        trajectory: Trajectory
    ) -> float:
        """Calculate how well video follows trajectory"""
        # TODO: Implement actual trajectory adherence calculation
        # This would involve:
        # 1. Detecting motion in video frames
        # 2. Comparing detected motion with expected trajectory
        # 3. Calculating adherence score
        return 0.0
    
    def _calculate_motion_smoothness(
        self,
        video_frames: List[Image.Image]
    ) -> float:
        """Calculate motion smoothness"""
        # TODO: Implement motion smoothness calculation
        # This would involve:
        # 1. Calculating optical flow between frames
        # 2. Measuring smoothness of flow vectors
        # 3. Returning smoothness score
        return 0.0
    
    def _calculate_visual_consistency(
        self,
        video_frames: List[Image.Image]
    ) -> float:
        """Calculate visual consistency across frames"""
        # TODO: Implement visual consistency calculation
        # This would involve:
        # 1. Comparing visual features between frames
        # 2. Detecting discontinuities or artifacts
        # 3. Returning consistency score
        return 0.0
```

---

## 📝 Plan d'Exécution

### Phase 1: Créer ComfyUI Workflow Executor (Jour 1)

**Tâches:**
1. ✅ Créer `src/comfyui_workflow_executor.py`
2. ✅ Implémenter `ComfyUIConfig` dataclass
3. ✅ Implémenter `ComfyUIWorkflowExecutor` class
4. ✅ Ajouter méthodes:
   - `execute_workflow()`
   - `_submit_workflow()`
   - `_monitor_execution()`
   - `_get_history()`
   - `_retrieve_outputs()`
   - `_download_file()`
   - `check_connection()`

**Tests:**
```python
# tests/test_comfyui_workflow_executor.py

async def test_connection_check():
    config = ComfyUIConfig(host="localhost", port=8188)
    executor = ComfyUIWorkflowExecutor(config)
    
    is_connected = await executor.check_connection()
    assert is_connected, "ComfyUI should be accessible"

async def test_workflow_submission():
    # Test workflow submission
    pass

async def test_workflow_execution():
    # Test complete workflow execution
    pass
```

---

### Phase 2: Intégrer dans WanATIIntegration (Jour 2)

**Tâches:**
1. ✅ Modifier `WanATIIntegration.__init__()` pour accepter `ComfyUIConfig`
2. ✅ Ajouter `_load_workflow_template()`
3. ✅ Remplacer génération mock dans `generate_trajectory_video()`
4. ✅ Implémenter `_prepare_workflow()`
5. ✅ Implémenter `_trajectories_to_json()`
6. ✅ Implémenter `_save_temp_image()`
7. ✅ Implémenter `_extract_video_frames()`

**Tests:**
```python
# tests/test_wan_ati_comfyui_integration.py

async def test_workflow_preparation():
    # Test workflow parameter preparation
    pass

async def test_video_generation_real():
    # Test real video generation with ComfyUI
    pass
```

---

### Phase 3: Tests et Validation (Jour 3)

**Tâches:**
1. ✅ Installer et configurer ComfyUI
2. ✅ Télécharger les modèles requis
3. ✅ Tester workflow manuellement dans ComfyUI
4. ✅ Exécuter tests d'intégration
5. ✅ Valider qualité des vidéos générées
6. ✅ Optimiser performances si nécessaire

**Checklist de Validation:**
- [ ] ComfyUI accessible via API
- [ ] Workflow se soumet correctement
- [ ] Monitoring de progression fonctionne
- [ ] Vidéos générées avec trajectoires
- [ ] Qualité visuelle acceptable
- [ ] Temps de génération raisonnable (< 10 min)
- [ ] Gestion d'erreurs robuste

---

## 🔍 Points d'Attention

### 1. Gestion des Chemins de Fichiers
- ComfyUI attend les images dans son dossier `input/`
- Copier l'image de départ dans le bon dossier
- Ou utiliser l'API d'upload d'images

### 2. Format du Workflow JSON
- Le workflow JSON doit correspondre exactement à la structure ComfyUI
- Les IDs de nœuds doivent être cohérents
- Les liens entre nœuds doivent être valides

### 3. Timeout et Monitoring
- La génération peut prendre 8-10 minutes
- Implémenter un timeout approprié (300s = 5 min)
- Fournir des updates de progression réguliers

### 4. Gestion d'Erreurs
- ComfyUI peut échouer pour diverses raisons
- Capturer et logger toutes les erreurs
- Fournir des messages d'erreur clairs

### 5. Nettoyage des Ressources
- Supprimer les images temporaires après utilisation
- Fermer les connexions WebSocket proprement
- Libérer la mémoire GPU si nécessaire

---

## 📦 Dépendances à Ajouter

```bash
# requirements.txt
aiohttp>=3.9.0
websockets>=12.0
```

Installation:
```bash
pip install aiohttp websockets
```

---

## 🧪 Tests Manuels

### Test 1: Connexion ComfyUI
```python
import asyncio
from src.comfyui_workflow_executor import ComfyUIWorkflowExecutor, ComfyUIConfig

async def test_connection():
    config = ComfyUIConfig()
    executor = ComfyUIWorkflowExecutor(config)
    
    is_connected = await executor.check_connection()
    print(f"ComfyUI connected: {is_connected}")

asyncio.run(test_connection())
```

### Test 2: Génération Vidéo Simple
```python
import asyncio
from PIL import Image
from src.wan_ati_integration import WanATIIntegration, WanATIConfig

async def test_video_generation():
    # Create test image
    image = Image.new('RGB', (720, 480), color='skyblue')
    
    # Simple trajectory
    trajectory_json = """
    [
        [
            {"x": 100, "y": 240},
            {"x": 600, "y": 240}
        ]
    ]
    """
    
    # Initialize
    config = WanATIConfig()
    integration = WanATIIntegration(config)
    
    # Parse trajectory
    trajectories = integration.trajectory_system.parse_trajectory_json(trajectory_json)
    
    # Generate video
    result = await integration.generate_trajectory_video(
        start_image=image,
        trajectories=trajectories,
        prompt="Camera pans horizontally across landscape"
    )
    
    print(f"Generated {len(result['video_frames'])} frames")
    print(f"Quality metrics: {result['quality_metrics']}")

asyncio.run(test_video_generation())
```

---

## ✅ Critères de Succès

### Fonctionnels
- [ ] Connexion à ComfyUI établie
- [ ] Workflow soumis et exécuté
- [ ] Vidéo générée avec trajectoire
- [ ] Frames extraites correctement
- [ ] Qualité visuelle acceptable

### Techniques
- [ ] Code propre et documenté
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Gestion d'erreurs robuste
- [ ] Logging approprié

### Performance
- [ ] Temps de génération < 10 minutes
- [ ] Utilisation mémoire raisonnable
- [ ] Pas de fuites mémoire
- [ ] Connexions fermées proprement

---

## 📚 Ressources

### Documentation ComfyUI API
- [ComfyUI API Reference](https://github.com/comfyanonymous/ComfyUI/wiki/API)
- [WebSocket Protocol](https://github.com/comfyanonymous/ComfyUI/wiki/API#websocket-protocol)

### Exemples de Code
- [ComfyUI Python Client](https://github.com/comfyanonymous/ComfyUI/blob/master/script_examples/websockets_api_example.py)

---

## 🎯 Prochaines Étapes Après Intégration

1. **Implémenter métriques de qualité**
   - Trajectory adherence calculation
   - Motion smoothness analysis
   - Visual consistency checking

2. **Ajouter CLI commands**
   - `wan-ati generate`
   - `wan-ati visualize`
   - `wan-ati validate`

3. **Optimiser performances**
   - Model caching
   - Batch processing
   - GPU memory management

4. **Documentation utilisateur**
   - Guide d'utilisation complet
   - Exemples de trajectoires
   - Tutoriels vidéo

---

**Status:** 📋 Plan Ready - Ready to Start Implementation

**Prochaine Action:** Créer `src/comfyui_workflow_executor.py`
