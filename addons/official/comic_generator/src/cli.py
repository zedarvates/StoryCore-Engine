"""
Comic Generator CLI
Provides command-line access to comic generation features.

Usage:
  storycore-comic generate --project-id my_project --story "..." --style manga
  storycore-comic export --project-id my_project --format pdf
  storycore-comic status --project-id my_project
  storycore-comic history --project-id my_project
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import List

from .types import ComicStyle
from .comic_pipeline import ComicPipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="storycore-comic",
        description="StoryCore Comic Generator CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # --- generate ---
    gen = sub.add_parser("generate", help="Generate the next comic page")
    gen.add_argument("--project-id", required=True, help="StoryCore project ID")
    gen.add_argument("--story", required=True, help="Story context (text or summary)")
    gen.add_argument(
        "--style",
        choices=[s.value for s in ComicStyle],
        default="manga",
        help="Visual style (default: manga)",
    )
    gen.add_argument("--panels", type=int, default=4, help="Number of panels (4-6)")
    gen.add_argument("--characters-file", help="JSON file with character data")
    gen.add_argument("--locations-file", help="JSON file with location data")
    gen.add_argument("--objects-file", help="JSON file with object data")
    gen.add_argument(
        "--generate-images", action="store_true", help="Call image backend"
    )
    gen.add_argument(
        "--direction", help="Narrative direction hint (tension/revelation/climax)"
    )

    # --- export ---
    exp = sub.add_parser("export", help="Export comic to file")
    exp.add_argument("--project-id", required=True)
    exp.add_argument("--format", choices=["json", "pdf"], default="json")
    exp.add_argument("--output", help="Output file path")

    # --- status ---
    status = sub.add_parser("status", help="Show comic state for a project")
    status.add_argument("--project-id", required=True)

    # --- history ---
    hist = sub.add_parser("history", help="List generated pages")
    hist.add_argument("--project-id", required=True)

    return parser


def _load_json_file(path: str) -> List:
    if not path:
        return []
    file = Path(path)
    if not file.exists():
        print(f"[Warning] File not found: {path}", file=sys.stderr)
        return []
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else [data]
    except Exception as e:
        print(f"[Warning] Failed to parse {path}: {e}", file=sys.stderr)
        return []


async def run_generate(args, pipeline: ComicPipeline):
    characters = _load_json_file(args.characters_file)
    locations = _load_json_file(args.locations_file)
    objects = _load_json_file(args.objects_file)

    print(f"🎨 Generating comic page for project '{args.project_id}'...")
    print(f"   Style: {args.style} | Panels: {args.panels}")

    result = await pipeline.generate_next_page(
        project_id=args.project_id,
        story_context=args.story,
        characters=characters,
        locations=locations,
        objects=objects,
        style=ComicStyle(args.style),
        generate_images=args.generate_images,
        panels_count=args.panels,
        narrative_direction=args.direction,
    )

    if result.success and result.page:
        page = result.page
        print(f"\n✅ Page {page.page_number} generated successfully!")
        print(f"   ID: {page.id}")
        print(f"   Summary: {page.narrative_summary}")
        print(f"   Panels: {len(page.panels)}")
        print("\n📝 Panel scripts:")
        for panel in page.panels:
            print(
                f"\n  Panel {panel.panel_index + 1} [{panel.narrative_beat.value.upper()}]"
            )
            print(f"  Location: {panel.location}")
            print(f"  Characters: {', '.join(panel.character_names) or 'None'}")
            print(f"  Visual: {panel.visual_cue[:80]}...")
            for d in panel.dialogue:
                print(f'  💬 {d.character_name}: "{d.text}"')
            if panel.generated_image_path:
                print(f"  🖼️  Image: {panel.generated_image_path}")
    else:
        print(f"\n❌ Generation failed: {result.error}", file=sys.stderr)
        sys.exit(1)


async def run_export(args, pipeline: ComicPipeline):
    print(
        f"📦 Exporting comic for project '{args.project_id}' as {args.format.upper()}..."
    )
    if args.format == "pdf":
        result = await pipeline.export_to_pdf(args.project_id, args.output)
    else:
        result = await pipeline.export_to_json(args.project_id, args.output)

    if result.success:
        print(f"✅ Exported {result.pages_exported} pages → {result.output_path}")
    else:
        print(f"❌ Export failed: {result.error}", file=sys.stderr)
        sys.exit(1)


def run_status(args, pipeline: ComicPipeline):
    state = pipeline.load_state(args.project_id)
    if not state:
        print(f"ℹ️  No comic data found for project '{args.project_id}'")
        return
    print(f"\n📊 Comic State for '{args.project_id}':")
    print(f"   Style:       {state.style_preset.value}")
    print(f"   Progression: {state.progression * 100:.1f}%")
    print(f"   Total pages: {state.total_pages}")
    print(f"   Chapters:    {len(state.chapters)}")
    if state.narrative_checkpoint:
        cp = state.narrative_checkpoint
        print(f"   Last event:  {cp.last_dramatic_event}")
        print(f"   Arc pos:     {cp.story_arc_position:.2f}")


def run_history(args, pipeline: ComicPipeline):
    state = pipeline.load_state(args.project_id)
    if not state:
        print(f"ℹ️  No comic data found for project '{args.project_id}'")
        return
    print(f"\n📚 Comic History for '{args.project_id}':")
    for chapter_id in state.chapters:
        pages = pipeline.get_chapter_pages(args.project_id, chapter_id)
        print(f"\n  Chapter: {chapter_id}")
        for p in pages:
            print(f"    Page {p['page_number']:03d}: {p['narrative_summary'][:60]}...")


def main():
    parser = build_parser()
    args = parser.parse_args()
    pipeline = ComicPipeline()

    if args.command == "generate":
        asyncio.run(run_generate(args, pipeline))
    elif args.command == "export":
        asyncio.run(run_export(args, pipeline))
    elif args.command == "status":
        run_status(args, pipeline)
    elif args.command == "history":
        run_history(args, pipeline)


if __name__ == "__main__":
    main()
