from backend.story_generation_service import (
    StoryGenerationService,
    ProductionMode,
    StoryGenre,
    StoryStructure,
)
import os


def generate_markdown_report(story, output_path):
    md = f"# 🎬 BIBLE DE PRODUCTION COMPLÈTE : {story.title}\n\n"
    md += f"**GÉNÉRATION :** {story.genre.name.title()} / {story.mode.name.title()}\n"
    md += f"**ID PROJET :** `{story.id}`\n\n"

    md += "## 📖 SYNOPSIS\n"
    md += f"{story.synopsis}\n\n"

    md += "## 🛠 MÉTHODOLOGIE BOUT EN BOUT\n"
    md += "En application du protocole **'Bout en Bout'**, le moteur a structuré les actifs suivants :\n\n"

    md += "### 💎 PERSONNAGES (Expertise/Casting)\n"
    for char in story.characters:
        md += f"- **{char['nom']}** ({char['role']}) : {char['description']}\n"
    md += "\n"

    md += "### 🏠 TRINITÉ SPATIALE (Lieux)\n"
    for loc in story.locations:
        md += f"- **{loc['nom']}** : {loc['description']}\n"
    md += "\n"

    md += "### 📦 PROPS (Objets consistants)\n"
    md += "| Nom | Type | Propriétaire |\n"
    md += "| :--- | :--- | :--- |\n"
    for prop in story.props:
        type_str = "Immuable (Décor)" if prop.is_immutable else "Porté (Accessoire)"
        owner = (
            "Environnement"
            if not prop.owner_id
            else next(
                (c["nom"] for c in story.characters if c["id"] == prop.owner_id),
                "Inconnu",
            )
        )
        md += f"| {prop.name} | {type_str} | {owner} |\n"
    md += "\n"

    md += "### 🔊 SFX (Bruitages spatialisés)\n"
    for sfx in story.sfx:
        md += f"- `{sfx.category.upper()}` : **{sfx.name}** - *{sfx.description}*\n"
    md += "\n"

    md += "## 📈 STRUCTURE NARRATIVE\n"
    for i, arc in enumerate(story.arcs):
        md += f"### Acte {i + 1} : {arc.name}\n"
        md += f"- **Thème :** {arc.theme}\n"
        md += f"- **Conflit :** {arc.conflict}\n"
        md += "- **Beats narratifs :**\n"
        for beat in arc.beats:
            md += f"  - `[{beat.name}]` : {beat.emotional_beat} ({beat.narrative_function})\n"
        md += "\n"

    md += "## 📑 SCRIPT COMPLET DÉTAILLÉ\n"
    for i, scene in enumerate(story.scenes):
        md += f"### SCÈNE {i + 1} : {scene.title}\n"
        md += (
            f"**INT/EXT - {scene.location.upper()} - {scene.time_of_day.upper()}**\n\n"
        )
        md += f"> {scene.description}\n\n"
        md += f"**🎬 DIRECTION VISUELLE :** {scene.visual_direction}\n\n"
        md += f"**🎵 AMBIANCE SONORE :** {scene.audio_mood}\n"
        md += "---\n\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md)
    return output_path


if __name__ == "__main__":
    import asyncio

    service = StoryGenerationService()

    # On génère un projet de rénovation
    story = asyncio.run(
        service.generate_story(
            prompt="Rénovation d'un loft new-yorkais abandonné en studio de design high-tech.",
            genre=StoryGenre.DOCUMENTARY,
            structure=StoryStructure.SEQUENCE,
            mode=ProductionMode.RENOVATION,
            length="medium",  # 12-15 scènes
        )
    )

    output_file = "C:/Users/redga/Desktop/BIBLE_PRODUCTION_FULL.md"
    # Fallback si le Desktop n'est pas accessible
    if not os.path.exists("C:/Users/redga/Desktop"):
        output_file = "c:/storycore-engine/BIBLE_PRODUCTION_FULL.md"

    path = generate_markdown_report(story, output_file)
    print(f"✅ Projet généré avec succès dans : {path}")
