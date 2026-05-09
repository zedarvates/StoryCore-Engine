import logging
import uuid
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field, asdict

# Mock for LLM call if not available
try:
    from backend.llm_api import call_llm_real, LLMRequest
except ImportError:
    call_llm_real = None

from backend.cine_production_service import CineProductionService, CineProductionRequest, CineChainType, ProductionQuality

logger = logging.getLogger(__name__)

@dataclass
class NovelProject:
    id: str
    title: str
    seed: str
    methodology: str = "3_act_structure"
    world: Dict[str, Any] = field(default_factory=dict)
    characters: List[Dict[str, Any]] = field(default_factory=list)
    outline: List[Dict[str, Any]] = field(default_factory=list)
    voice: Dict[str, Any] = field(default_factory=dict)
    chapters: List[Dict[str, Any]] = field(default_factory=list)
    state: Dict[str, Any] = field(default_factory=lambda: {"phase": "setup", "iteration": 0})
    questions: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

class HermesNovelistService:
    """
    Service implementing the AutoNovel pipeline by Hermes Agent.
    Phases: Foundation, First Draft, Revision, Export.
    """

    def __init__(self):
        self.projects: Dict[str, NovelProject] = {}
        self.prompts = self._load_prompts()
        self.cine_service = CineProductionService()

    def _load_prompts(self):
        # In a real scenario, this would load from a file.
        # Here we embed the core guidelines from AutoNovel.
        return {
            "foundation": {
                "world": "Generate a structured World Bible. Sections: [Lore], [Geography], [Political Landscape], [Magic/Tech Rules], [Locations]. For each Location, include: name, description, atmosphere, and significance.",
                "characters": "Generate a Character Registry. For each character, include: [Name], [Visual Identity] (hair, eyes, build, clothing), [Personality] (traits, fears, desires), [Background], and [Narrative Role] (archetype, goal, arc).",
                "outline": "Generate a Chapter Outline. For each chapter, specify: [Title], [Setting], [Primary Conflict], [Key Beats], [Foreshadowing/Plants]."
            },
            "drafting": {
                "chapter": "Write a full chapter. Follow CRAFT.md rules (show don't tell, sensory detail). Follow StoryCore Continuity: ensure characters stick to their established visual and personality traits. Avoid ANTI-SLOP.md patterns."
            },
            "craft_guidelines": "Show don't tell. Focus on sensory details. Use character-specific voice. Maintain tension. Avoid information dumps.",
            "anti_slop": "Avoid banned words: 'tapestry', 'testament', 'shiver', 'unbeknownst', 'dance of', etc. Avoid over-explaining scenes.",
            "anti_patterns": "Avoid sequential 'Then he did X, then he did Y'. Avoid perfect characters. Avoid resolution without cost."
        }

    async def _call_llm(self, prompt: str, system_prompt: str = "") -> str:
        if call_llm_real:
            try:
                request = LLMRequest(prompt=prompt, system_prompt=system_prompt, temperature=0.7, max_tokens=4000)
                # Use a specific model for Hermes if requested, otherwise default
                response = await call_llm_real(request, user_id="hermes_novelist")
                return response.text
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                return "Error: LLM call failed."
        else:
            logger.warning("call_llm_real not found, using mock.")
            return "Mock response for prompt: " + prompt[:50] + "..."

    async def create_project(self, seed: str, title: str = "Untitled Novel", methodology: str = "3_act_structure") -> str:
        project_id = str(uuid.uuid4())
        self.projects[project_id] = NovelProject(id=project_id, title=title, seed=seed, methodology=methodology)
        return project_id

    async def run_foundation(self, project_id: str):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}

        project.state["phase"] = "foundation"
        
        # 1. World Bible
        world_prompt = f"{self.prompts['foundation']['world']}\nSeed: {project.seed}"
        project.world = {"content": await self._call_llm(world_prompt, self.prompts['craft_guidelines'])}

        # 2. Characters
        char_prompt = f"{self.prompts['foundation']['characters']}\nWorld: {project.world['content']}"
        project.characters = [{"content": await self._call_llm(char_prompt, self.prompts['craft_guidelines'])}]

        # 3. Outline
        method_map = {
            "hero_journey": "Follow the HERO'S JOURNEY (12 steps). Include Ordinary World, Call to Adventure, Meeting Mentor, etc.",
            "save_the_cat": "Follow SAVE THE CAT beats. Include Opening Image, Theme Stated, Catalyst, Break into Two, B Story, Fun and Games, etc.",
            "snowflake": "Follow the SNOWFLAKE METHOD. Start with a one-sentence summary, expand to a paragraph, then a multi-page outline.",
            "fichtean_curve": "Follow the FICHTEAN CURVE. Focus on rapid-fire crises and rising tension immediately.",
            "3_act_structure": "Follow a standard 3-ACT STRUCTURE (Setup, Confrontation, Resolution)."
        }
        method_desc = method_map.get(project.methodology, method_map["3_act_structure"])
        
        outline_prompt = f"{self.prompts['foundation']['outline']}\nMETHODOLOGY: {method_desc}\nWorld: {project.world['content']}\nCharacters: {project.characters[0]['content']}"
        project.outline = [{"content": await self._call_llm(outline_prompt, self.prompts['craft_guidelines'])}]

        project.state["iteration"] += 1
        return {"status": "Foundation complete", "project": asdict(project)}

    async def draft_chapter(self, project_id: str, chapter_index: int):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}

        project.state["phase"] = "drafting"
        
        system_prompt = f"{self.prompts['craft_guidelines']}\n\nANTI-SLOP:\n{self.prompts['anti_slop']}\n\nANTI-PATTERNS:\n{self.prompts['anti_patterns']}"
        
        prompt = f"Write Chapter {chapter_index} of the novel '{project.title}'.\n"
        prompt += f"Seed: {project.seed}\n"
        prompt += f"World Context: {project.world.get('content', '')[:1000]}...\n"
        prompt += f"Characters: {project.characters[0].get('content', '') if project.characters else ''[:1000]}...\n"
        prompt += f"Outline for this chapter: {project.outline[0].get('content', '') if project.outline else ''[:1000]}...\n"
        
        chapter_content = await self._call_llm(prompt, system_prompt)
        
        chapter = {
            "index": chapter_index,
            "content": chapter_content,
            "revisions": [],
            "created_at": datetime.now().isoformat()
        }
        
        # Update or append
        existing = next((ch for ch in project.chapters if ch["index"] == chapter_index), None)
        if existing:
            existing["content"] = chapter_content
        else:
            project.chapters.append(chapter)
            
        await self.save_project(project_id)
        return {"status": f"Chapter {chapter_index} drafted", "chapter": chapter}

    async def revise_chapter(self, project_id: str, chapter_index: int):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}

        chapter = next((ch for ch in project.chapters if ch["index"] == chapter_index), None)
        if not chapter: return {"error": "Chapter not found"}

        project.state["phase"] = "revision"
        
        # 1. Critique
        critique_prompt = f"Critique the following chapter for slop, passive voice, and weak character voice.\n\nChapter Content:\n{chapter['content']}"
        critique = await self._call_llm(critique_prompt, "You are a ruthless literary editor.")
        
        # 2. Refinement
        refine_prompt = f"Rewrite Chapter {chapter_index} based on this critique:\n{critique}\n\nOriginal Content:\n{chapter['content']}"
        refined_content = await self._call_llm(refine_prompt, self.prompts['craft_guidelines'])
        
        chapter["revisions"].append({
            "critique": critique,
            "previous_content": chapter["content"],
            "timestamp": datetime.now().isoformat()
        })
        chapter["content"] = refined_content
        
        await self.save_project(project_id)
        return {"status": f"Chapter {chapter_index} revised", "chapter": chapter}

    def get_project(self, project_id: str):
        project = self.projects.get(project_id)
        if project:
            return asdict(project)
        return None

    def list_projects(self) -> List[Dict[str, Any]]:
        return [{"id": p.id, "title": p.title, "state": p.state} for p in self.projects.values()]

    async def save_project(self, project_id: str):
        project = self.projects.get(project_id)
        if not project: return
        
        import os
        data_dir = os.path.join("backend", "data", "hermes_novels")
        os.makedirs(data_dir, exist_ok=True)
        
        file_path = os.path.join(data_dir, f"{project_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            # Custom encoder for datetime
            def default(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError
            json.dump(asdict(project), f, indent=2, default=default)

    def load_all_projects(self):
        import os
        data_dir = os.path.join("backend", "data", "hermes_novels")
        if not os.path.exists(data_dir): return
        
        for filename in os.listdir(data_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(data_dir, filename), "r", encoding="utf-8") as f:
                        data = json.load(f)
                        # Reconstruct datetime
                        if "created_at" in data:
                            data["created_at"] = datetime.fromisoformat(data["created_at"])
                        project = NovelProject(**data)
                        self.projects[project.id] = project
                except Exception as e:
                    logger.error(f"Failed to load project {filename}: {e}")

    async def extract_structured_assets(self, project_id: str):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}

        # 1. Extract Characters
        char_extract_prompt = f"Extract all characters from this registry into a JSON array matching the StoryCore schema.\n"
        char_extract_prompt += "Schema: { name, visual_identity: { hair_color, eye_color, build, clothing_style }, personality: { traits: [], fears: [], desires: [] }, role: { archetype, narrative_function } }\n"
        char_extract_prompt += f"Registry:\n{project.characters[0].get('content', '') if project.characters else ''}"
        
        characters_json = await self._call_llm(char_extract_prompt, "Return ONLY valid JSON.")
        
        # 2. Extract Locations
        loc_extract_prompt = f"Extract all locations from this world bible into a JSON array.\n"
        loc_extract_prompt += "Schema: { name, description, significance, atmosphere, location_type: 'interior'|'exterior' }\n"
        loc_extract_prompt += f"World Bible:\n{project.world.get('content', '')}"
        
        locations_json = await self._call_llm(loc_extract_prompt, "Return ONLY valid JSON.")
        
        # Parse and store
        try:
            import re
            def clean_json(text):
                match = re.search(r'\[.*\]', text, re.DOTALL)
                return match.group(0) if match else text

            project.state["structured_assets"] = {
                "characters": json.loads(clean_json(characters_json)),
                "locations": json.loads(clean_json(locations_json))
            }
            await self.save_project(project_id)
            return {"status": "Assets extracted", "assets": project.state["structured_assets"]}
        except Exception as e:
            logger.error(f"Failed to parse structured assets: {e}")
            return {"error": f"Parsing failed: {e}", "raw_char": characters_json, "raw_loc": locations_json}

    async def visualize_chapter(self, project_id: str, chapter_index: int):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}
        
        chapter = next((c for c in project.chapters if c["index"] == chapter_index), None)
        if not chapter: return {"error": "Chapter not found"}

        # 1. Extract Visual Beats
        visual_extract_prompt = f"Extract 5 distinct visual beats from this chapter prose. For each beat, provide a vivid description for video generation in a REALISTIC PHOTOREALISTIC style.\n"
        visual_extract_prompt += "Chapter:\n" + chapter["content"]
        
        beats_json = await self._call_llm(visual_extract_prompt, "Return ONLY a JSON array of strings.")
        
        # 2. Generate Shot List (using MultiAngleService logic internally or via prompt)
        shot_list_prompt = f"Convert these visual beats into a professional shot list with camera angles and motion prompts. STYLE: REALISTIC PHOTOREALISTIC, 35mm, cinematic lighting.\n"
        shot_list_prompt += "Beats:\n" + beats_json
        
        shot_list_json = await self._call_llm(shot_list_prompt, "Return ONLY valid JSON array of objects: { angle, prompt, duration }")
        
        try:
            import re
            def clean_json(text):
                match = re.search(r'\[.*\]', text, re.DOTALL)
                return match.group(0) if match else text

            chapter["visualization"] = json.loads(clean_json(shot_list_json))
            
            # 3. Generate a question for the user to refine the next steps
            question_prompt = f"Based on this chapter and these visual shots, what is one critical question Hermes should ask the author to improve the next chapter or the visual style?\n"
            question_prompt += f"Chapter: {chapter['content'][:500]}...\nShots: {shot_list_json}"
            question_text = await self._call_llm(question_prompt, "Return ONLY the question text.")
            
            project.questions.append({
                "id": str(uuid.uuid4()),
                "text": question_text,
                "status": "pending"
            })

            await self.save_project(project_id)
            return {"status": "Visualization generated", "shot_list": chapter["visualization"], "question": question_text}
        except Exception as e:
            logger.error(f"Failed to parse visualization: {e}")
            return {"error": f"Parsing failed: {e}", "raw": shot_list_json}

    async def generate_video_clips(self, project_id: str, chapter_index: int):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}
        
        chapter = next((c for c in project.chapters if c["index"] == chapter_index), None)
        if not chapter or "visualization" not in chapter:
            return {"error": "Chapter not visualized yet"}

        job_ids = []
        for shot in chapter["visualization"]:
            # Create a CineProductionRequest for ComfyUI
            req = CineProductionRequest(
                chainType=CineChainType.LTX_VIDEO_GENERATION,
                projectId=project_id,
                videoPrompt=shot["prompt"],
                quality=ProductionQuality.STANDARD,
                width=1280,
                height=720,
                useVisualDirector=True # Use the visual director to enhance the shot
            )
            
            job_id = await self.cine_service.start_production_job(req)
            shot["job_id"] = job_id
            shot["status"] = "processing"
            job_ids.append(job_id)
            
        await self.save_project(project_id)
        return {"status": "Clips generation started", "job_ids": job_ids}

    async def get_clips_status(self, project_id: str, chapter_index: int):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}
        
        chapter = next((c for c in project.chapters if c["index"] == chapter_index), None)
        if not chapter or "visualization" not in chapter:
            return {"error": "No visualization found"}

        for shot in chapter["visualization"]:
            if "job_id" in shot:
                job = await self.cine_service.get_job_status(shot["job_id"])
                if job:
                    shot["status"] = job.status.value
                    shot["progress"] = job.progress
                    if job.status.value == "completed" and job.results:
                        # Extract the filename from results
                        video_res = next((r for r in job.results if r["step"] in ["video", "muxed_video"]), None)
                        if video_res:
                            shot["video_url"] = f"/output/{video_res['output']['filename']}"

        await self.save_project(project_id)
        return {"status": "Status updated", "visualization": chapter["visualization"]}

    async def answer_question(self, project_id: str, question_id: str, answer: str):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}
        
        question = next((q for q in project.questions if q["id"] == question_id), None)
        if not question: return {"error": "Question not found"}

        question["status"] = "answered"
        question["answer"] = answer
        
        # Inject the answer into the seed for future iterations
        project.seed += f"\nAuthor Feedback: {answer}"
        
        await self.save_project(project_id)
        return {"status": "Answered", "questions": project.questions}

    async def export_novel(self, project_id: str, format: str = "markdown"):
        project = self.projects.get(project_id)
        if not project: return {"error": "Project not found"}
        
        content = f"# {project.title}\n\n"
        content += f"## World Bible\n{project.world.get('content', '')}\n\n"
        
        content += "## Chapters\n\n"
        for chapter in sorted(project.chapters, key=lambda x: x["index"]):
            content += f"### Chapter {chapter['index']}\n\n{chapter['content']}\n\n"
            
        import os
        export_dir = os.path.join("backend", "data", "exports")
        os.makedirs(export_dir, exist_ok=True)
        
        filename = f"{project.title.replace(' ', '_')}_{project_id[:8]}.md"
        file_path = os.path.join(export_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {"status": "Export complete", "file_path": file_path, "filename": filename}

hermes_novelist_service = HermesNovelistService()
hermes_novelist_service.load_all_projects()
