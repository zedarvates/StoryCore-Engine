"""
Recap Engine - CLI Interface
Usage : python -m addons.official.recap_engine.src.cli [commande] [options]
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="StoryCore Recap Engine CLI — BD → Vidéo Recap",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples :
  # Générer depuis un JSON de BD
  python -m addons.official.recap_engine.src.cli generate \\
      --project my_project \\
      --comic data/assets/comics/my_project/export/comic_export.json \\
      --context "Dans un Tokyo futuriste, Akira découvre..."

  # Rendre la vidéo
  python -m addons.official.recap_engine.src.cli render \\
      --project my_project \\
      --timeline <timeline_id>

  # Export final
  python -m addons.official.recap_engine.src.cli export \\
      --project my_project \\
      --timeline <timeline_id>

  # Voir les timelines d'un projet
  python -m addons.official.recap_engine.src.cli status --project my_project
        """,
    )

    subparsers = parser.add_subparsers(dest="command")

    # --- generate ---
    gen_parser = subparsers.add_parser("generate", help="Générer un recap depuis une BD")
    gen_parser.add_argument("--project", required=True, help="ID du projet StoryCore")
    gen_parser.add_argument("--comic", required=True, help="Chemin du JSON BD exporté")
    gen_parser.add_argument("--context", required=True, help="Contexte narratif global")
    gen_parser.add_argument("--style", default="manga_recap",
                            choices=["manga_recap", "anime_epic", "comic_book", "cinematic"],
                            help="Style visuel du recap")
    gen_parser.add_argument("--tts", default="gtts",
                            choices=["gtts", "edge_tts", "piper", "mock"],
                            help="Provider TTS pour la voix off")
    gen_parser.add_argument("--lang", default="fr", help="Langue TTS (fr/en)")
    gen_parser.add_argument("--characters", default=None,
                            help="Chemin vers un JSON de personnages (optionnel)")

    # --- render ---
    render_parser = subparsers.add_parser("render", help="Rendre la vidéo MP4")
    render_parser.add_argument("--project", required=True)
    render_parser.add_argument("--timeline", required=True, help="ID de la timeline")
    render_parser.add_argument("--ffmpeg", default="ffmpeg", help="Chemin vers ffmpeg")

    # --- export ---
    export_parser = subparsers.add_parser("export", help="Exporter vidéo + sous-titres")
    export_parser.add_argument("--project", required=True)
    export_parser.add_argument("--timeline", required=True)
    export_parser.add_argument("--output", default=None, help="Chemin de sortie MP4")
    export_parser.add_argument("--no-subs", action="store_true",
                               help="Ne pas incruster les sous-titres")

    # --- status ---
    status_parser = subparsers.add_parser("status", help="État des timelines d'un projet")
    status_parser.add_argument("--project", required=True)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    asyncio.run(_dispatch(args))


async def _dispatch(args):
    from .recap_pipeline import RecapPipeline
    from .types import RecapStyle, TTSProvider

    if args.command == "generate":
        pipeline = RecapPipeline(
            tts_provider=TTSProvider(args.tts),
            language=args.lang,
        )

        # Charger les personnages si fournis
        characters = []
        if args.characters and Path(args.characters).exists():
            characters = json.loads(Path(args.characters).read_text(encoding="utf-8"))

        print(f"🎬 Génération recap depuis : {args.comic}")
        result = await pipeline.generate_from_comic_json(
            project_id=args.project,
            comic_json_path=args.comic,
            story_context=args.context,
            characters=characters,
            style=RecapStyle(args.style),
        )

        if result.success:
            print(f"✅ Timeline générée !")
            print(f"   ID        : {result.timeline.timeline_id}")
            print(f"   Scènes    : {result.scenes_count}")
            print(f"   Durée     : ~{result.estimated_duration/60:.1f} min")
            print(f"\n💡 Lancez le rendu avec :")
            print(f"   --command render --project {args.project} --timeline {result.timeline.timeline_id}")
        else:
            print(f"❌ Erreur : {result.error}")
            sys.exit(1)

    elif args.command == "render":
        pipeline = RecapPipeline(ffmpeg_path=args.ffmpeg)

        def on_progress(progress, current, total):
            bar = "█" * int(progress * 20) + "░" * (20 - int(progress * 20))
            print(f"\r  [{bar}] {current}/{total} scènes", end="", flush=True)
            return asyncio.coroutine(lambda: None)()

        print(f"🎥 Rendu vidéo en cours…")
        result = await pipeline.render(
            project_id=args.project,
            timeline_id=args.timeline,
        )
        print()  # Nouvelle ligne après la barre de progression

        if result.success:
            print(f"✅ Vidéo rendue !")
            print(f"   Chemin    : {result.video_path}")
            print(f"   Durée     : {result.duration:.1f}s")
            print(f"   Taille    : {result.file_size_mb:.1f} MB")
            print(f"   Temps     : {result.render_time:.1f}s")
        else:
            print(f"❌ Erreur rendu : {result.error}")
            sys.exit(1)

    elif args.command == "export":
        pipeline = RecapPipeline()

        print(f"📦 Export final…")
        result = await pipeline.export(
            project_id=args.project,
            timeline_id=args.timeline,
            include_subtitles=not args.no_subs,
            output_path=args.output,
        )

        if result.success:
            print(f"✅ Export réussi !")
            print(f"   Vidéo     : {result.video_path}")
            print(f"   Sous-titres : {result.subtitle_path}")
        else:
            print(f"❌ Erreur export : {result.error}")
            sys.exit(1)

    elif args.command == "status":
        pipeline = RecapPipeline()
        timelines = pipeline.get_project_timelines(args.project)

        if not timelines:
            print(f"Aucune timeline pour le projet '{args.project}'")
        else:
            print(f"📋 Timelines du projet '{args.project}' :")
            for t in timelines:
                progress = t.get("render_progress", 0.0)
                status = "✅ Rendue" if t.get("final_video_path") else (
                    f"⏳ {int(progress*100)}%" if progress > 0 else "⏸️  En attente"
                )
                print(f"\n  [{t['timeline_id'][:8]}] {t['title']}")
                print(f"    Scènes  : {t['scenes_count']}")
                print(f"    Durée   : ~{t['estimated_duration']/60:.1f} min")
                print(f"    Statut  : {status}")
                if t.get("final_video_path"):
                    print(f"    Vidéo   : {t['final_video_path']}")


if __name__ == "__main__":
    main()
