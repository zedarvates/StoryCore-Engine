"""
ViralForge Marketing Content Wizard command handler - Viral marketing campaign creation.
"""

import argparse
from pathlib import Path
from typing import List
import json

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MarketingWizardHandler(BaseHandler):
    """Handler for the marketing-wizard command - viral marketing campaigns."""

    command_name = "marketing-wizard"
    description = "Create comprehensive viral marketing campaigns with thumbnails, posts, and strategies"

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up marketing-wizard command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory (default: current directory)"
        )

        parser.add_argument(
            "--title",
            help="Campaign title (auto-generated if not provided)"
        )

        parser.add_argument(
            "--platforms",
            nargs="+",
            choices=["youtube", "tiktok", "instagram", "twitter", "facebook", "linkedin", "reddit", "discord"],
            help="Target platforms (default: youtube, tiktok, instagram)"
        )

        parser.add_argument(
            "--strategy",
            choices=["educational", "entertaining", "emotional", "controversial", "trending", "nostalgic", "inspirational", "humorous"],
            default="educational",
            help="Viral marketing strategy (default: educational)"
        )

        parser.add_argument(
            "--preview",
            action="store_true",
            help="Show campaign preview without creating it"
        )

        parser.add_argument(
            "--format",
            choices=["detailed", "summary", "minimal"],
            default="detailed",
            help="Output format (default: detailed)"
        )

        parser.add_argument(
            "--export-assets",
            action="store_true",
            help="Export individual marketing assets to separate files"
        )

        parser.add_argument(
            "--export-strategy",
            action="store_true",
            help="Export content strategy and posting schedule separately"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the marketing-wizard command."""
        try:
            # Import Marketing wizard
            try:
                from wizard.marketing_wizard import (
                    create_marketing_wizard,
                    get_campaign_preview,
                    MarketingCampaign,
                    Platform,
                    ViralStrategy
                )
            except ImportError as e:
                raise SystemError(
                    f"Marketing wizard modules not available: {e}",
                    "Ensure wizard package is installed"
                )

            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            print("🚀 ViralForge - Marketing Content Wizard")
            print("=" * 55)

            # Handle preview mode
            if args.preview:
                return self._execute_preview_mode(project_path, args)

            # Execute full campaign creation
            import asyncio

            wizard = create_marketing_wizard()

            # Convert platform strings to enum
            target_platforms = None
            if args.platforms:
                target_platforms = args.platforms

            print(f"🎯 Viral strategy: {args.strategy}")
            if target_platforms:
                print(f"📱 Target platforms: {', '.join(target_platforms)}")

            # Create marketing campaign
            campaign = asyncio.run(
                wizard.create_marketing_campaign(
                    project_path,
                    args.title,
                    target_platforms,
                    args.strategy
                )
            )

            # Display results based on format
            return self._display_campaign_results(campaign, args.format, args)

        except Exception as e:
            return self.handle_error(e, "Marketing campaign creation")

    def _execute_preview_mode(self, project_path: Path, args: argparse.ArgumentParser) -> int:
        """Execute preview mode to show campaign potential."""
        print("👁️ Campaign Preview Mode")
        print("-" * 30)

        preview = get_campaign_preview(project_path)

        print(f"🎯 Estimated marketing assets: {preview.get('estimated_assets', 'N/A')}")
        print(f"🎨 Recommended viral strategy: {preview.get('recommended_strategy', 'educational').title()}")
        print(f"📱 Potential platforms: {', '.join(preview.get('potential_platforms', []))}")

        print("\n💡 Campaign Preview:")
        print(f"   • Thumbnails: YouTube, TikTok, Instagram optimized")
        print(f"   • Descriptions: SEO-optimized for each platform")
        print(f"   • Social Posts: Platform-specific content with engagement hooks")
        print(f"   • Trailers: Main + short versions for different audiences")
        print(f"   • Hashtags: Curated strategy for viral reach")
        print(f"   • Posting Schedule: Optimal timing for maximum engagement")

        print("\n🎯 Viral Potential Analysis:")
        print(f"   • Content analysis based on project genre and style")
        print(f"   • Platform algorithm optimization")
        print(f"   • Audience targeting recommendations")
        print(f"   • Performance tracking setup")

        return 0

    def _display_campaign_results(self, campaign: MarketingCampaign, format_type: str, args: argparse.ArgumentParser) -> int:
        """Display campaign creation results."""
        print(f"\n🎯 Marketing Campaign Created - Viral Potential: {campaign.viral_potential_score:.1f}/10")
        print("=" * 85)

        # Basic campaign info
        print(f"🚀 Campaign ID: {campaign.campaign_id}")
        print(f"📅 Created: {campaign.creation_timestamp[:19].replace('T', ' ')}")
        print(f"🎯 Strategy: {campaign.viral_strategy.value.title()}")
        print(f"📱 Platforms: {', '.join([p.value.title() for p in campaign.target_platforms])}")
        print(f"🎭 Estimated Reach: {campaign.estimated_reach:,} people")

        # Viral potential breakdown
        analysis = campaign.project_analysis
        print(f"\n📊 Content Analysis:")
        print(f"   Genre: {analysis.get('genre', 'unknown').title()}")
        print(f"   Visual Appeal: {analysis.get('visual_appeal', 'medium').title()}")
        print(f"   Character Appeal: {analysis.get('character_appeal', 'medium').title()}")
        print(f"   Viral Triggers: {', '.join(analysis.get('viral_triggers', []))}")

        if format_type == "minimal":
            return self._display_minimal_format(campaign, args)
        elif format_type == "summary":
            return self._display_summary_format(campaign, args)
        else:
            return self._display_detailed_format(campaign, args)

    def _display_minimal_format(self, campaign: MarketingCampaign, args: argparse.ArgumentParser) -> int:
        """Display minimal format output."""
        total_assets = (len(campaign.thumbnails) + len(campaign.descriptions) +
                       len(campaign.social_posts) + len(campaign.trailers))

        print(f"\n🚀 Quick Summary:")
        print(f"   Assets: {total_assets}")
        print(f"   Hashtags: {len(campaign.hashtags)}")
        print(f"   Viral Score: {campaign.viral_potential_score:.1f}/10")
        print(f"   Reach: {campaign.estimated_reach:,}")

        print(f"\n💾 Campaign saved to: marketing_campaign.json")
        return 0

    def _display_summary_format(self, campaign: MarketingCampaign, args: argparse.ArgumentParser) -> int:
        """Display summary format output."""
        print(f"\n🚀 Campaign Summary:")

        # Asset counts
        print(f"   🖼️ Thumbnails: {len(campaign.thumbnails)}")
        print(f"   📝 Descriptions: {len(campaign.descriptions)}")
        print(f"   📱 Social Posts: {len(campaign.social_posts)}")
        print(f"   🎬 Trailers: {len(campaign.trailers)}")
        print(f"   🏷️ Hashtags: {len(campaign.hashtags)}")

        # Target audience
        audience = campaign.target_audience
        print(f"\n👥 Target Audience:")
        print(f"   Age: {audience.get('age_range', 'unknown')}")
        print(f"   Interests: {', '.join(audience.get('interests', []))}")
        print(f"   Platforms: {', '.join(audience.get('platforms', []))}")

        # Top hashtags
        if campaign.hashtags:
            print(f"\n🏷️ Top Hashtags:")
            for hashtag in campaign.hashtags[:10]:
                print(f"   {hashtag}")

        # Posting schedule preview
        if campaign.posting_schedule:
            print(f"\n📅 Posting Schedule:")
            for post in campaign.posting_schedule[:3]:
                platform = post.get('platform', 'unknown').title()
                content_type = post.get('content_type', 'post').replace('_', ' ').title()
                timing = post.get('optimal_time', 'TBD')
                print(f"   • {platform} {content_type}: {timing}")

        # Export information
        self._display_export_info(campaign, args)

        return 0

    def _display_detailed_format(self, campaign: MarketingCampaign, args: argparse.ArgumentParser) -> int:
        """Display detailed format output."""

        # Thumbnails
        if campaign.thumbnails:
            print(f"\n🖼️ Thumbnails:")
            for i, thumb in enumerate(campaign.thumbnails, 1):
                platform = thumb.platform.value.title()
                viral_score = thumb.viral_potential
                print(f"   {i}. {platform} - Viral Potential: {viral_score:.1f}/10")
                print(f"      Title: {thumb.title}")
                print(f"      Dimensions: {thumb.metadata.get('dimensions', 'N/A')}")
                if len(thumb.content) > 100:
                    print(f"      Description: {thumb.content[:100]}...")
                else:
                    print(f"      Description: {thumb.content}")

        # Descriptions
        if campaign.descriptions:
            print(f"\n📝 Descriptions:")
            for i, desc in enumerate(campaign.descriptions, 1):
                platform = desc.platform.value.title()
                viral_score = desc.viral_potential
                print(f"   {i}. {platform} Description - Viral Potential: {viral_score:.1f}/10")
                seo_keywords = desc.metadata.get('seo_keywords', [])
                if seo_keywords:
                    print(f"      SEO Keywords: {', '.join(seo_keywords[:5])}")

        # Social Posts
        if campaign.social_posts:
            print(f"\n📱 Social Posts:")
            for i, post in enumerate(campaign.social_posts, 1):
                platform = post.platform.value.title()
                viral_score = post.viral_potential
                char_limit = post.metadata.get('character_limit', 'N/A')
                print(f"   {i}. {platform} Post - Viral Potential: {viral_score:.1f}/10 ({len(post.content)}/{char_limit} chars)")
                print(f"      Content: {post.content[:80]}{'...' if len(post.content) > 80 else ''}")
                hashtags = post.metadata.get('hashtags', [])
                if hashtags:
                    print(f"      Hashtags: {', '.join(hashtags[:5])}")

        # Trailers
        if campaign.trailers:
            print(f"\n🎬 Trailers:")
            for i, trailer in enumerate(campaign.trailers, 1):
                platform = trailer.platform.value.title()
                duration = trailer.metadata.get('duration', 'N/A')
                viral_score = trailer.viral_potential
                print(f"   {i}. {platform} Trailer - {duration}s - Viral Potential: {viral_score:.1f}/10")
                print(f"      Style: {trailer.metadata.get('style', 'N/A')}")
                print(f"      Call to Action: {trailer.metadata.get('call_to_action', 'N/A')}")

        # Hashtags
        if campaign.hashtags:
            print(f"\n🏷️ Hashtag Strategy ({len(campaign.hashtags)} hashtags):")
            # Group by category for better display
            categories = {
                'Project': [h for h in campaign.hashtags if 'storycore' in h.lower() or 'creative' in h.lower()],
                'Genre': [h for h in campaign.hashtags if any(g in h.lower() for g in ['horror', 'comedy', 'drama', 'fantasy', 'scifi', 'romance', 'action'])],
                'Viral': [h for h in campaign.hashtags if any(v in h.lower() for v in ['viral', 'trending', 'fyp', 'mustwatch'])]
            }

            for category, hashtags in categories.items():
                if hashtags:
                    print(f"   {category}: {', '.join(hashtags[:8])}")

        # Content Strategy
        strategy = campaign.content_strategy
        if strategy:
            print(f"\n🎯 Content Strategy:")
            print(f"   Primary Message: {strategy.get('primary_message', 'N/A')}")
            print(f"   Brand Voice: {strategy.get('brand_voice', {}).get('tone', 'N/A')}")
            content_mix = strategy.get('content_mix', {})
            if content_mix:
                print(f"   Content Mix: Educational {content_mix.get('educational', 0)}%, Entertainment {content_mix.get('entertainment', 0)}%, Promotional {content_mix.get('promotional', 0)}%")

        # Performance Metrics
        metrics = campaign.performance_metrics
        if metrics:
            print(f"\n📊 Performance Goals:")
            print(f"   Views Goal: {metrics.get('views_goal', 0):,}")
            print(f"   Engagement Goal: {metrics.get('engagement_goal', 0):,}")
            print(f"   Tracking Period: {metrics.get('tracking_period', 30)} days")

        # Export information
        self._display_export_info(campaign, args)

        print(f"\n✅ Viral marketing campaign created successfully!")
        print(f"   Use this campaign to launch your content across social platforms.")
        print(f"   Track performance and adjust strategy based on audience engagement.")

        return 0

    def _display_export_info(self, campaign: MarketingCampaign, args: argparse.ArgumentParser) -> None:
        """Display export information."""
        print(f"\n💾 Files Created/Updated:")

        exports = [
            ("marketing_campaign.json", "Complete marketing campaign specification"),
            ("project.json", "Updated with campaign metadata")
        ]

        if args.export_assets:
            exports.extend([
                ("thumbnails_export.json", "Individual thumbnail assets"),
                ("social_posts_export.json", "Social media post content"),
                ("trailers_export.json", "Trailer specifications")
            ])

        if args.export_strategy:
            exports.extend([
                ("posting_schedule.json", "Detailed posting schedule"),
                ("content_strategy.json", "Content strategy guidelines")
            ])

        for filename, description in exports:
            print(f"   • {filename} - {description}")

    def _export_additional_files(self, campaign: MarketingCampaign, args: argparse.ArgumentParser) -> None:
        """Export additional files based on arguments."""
        # Export individual assets
        if args.export_assets:
            # Thumbnails
            thumbnails_data = {
                'thumbnails_export': {
                    'campaign_id': campaign.campaign_id,
                    'export_timestamp': campaign.creation_timestamp,
                    'thumbnails': [
                        {
                            'platform': thumb.platform.value,
                            'title': thumb.title,
                            'content': thumb.content,
                            'metadata': thumb.metadata,
                            'viral_potential': thumb.viral_potential
                        } for thumb in campaign.thumbnails
                    ]
                }
            }
            with open("thumbnails_export.json", 'w') as f:
                json.dump(thumbnails_data, f, indent=2)

            # Social posts
            posts_data = {
                'social_posts_export': {
                    'campaign_id': campaign.campaign_id,
                    'export_timestamp': campaign.creation_timestamp,
                    'posts': [
                        {
                            'platform': post.platform.value,
                            'title': post.title,
                            'content': post.content,
                            'metadata': post.metadata,
                            'viral_potential': post.viral_potential
                        } for post in campaign.social_posts
                    ]
                }
            }
            with open("social_posts_export.json", 'w') as f:
                json.dump(posts_data, f, indent=2)

            # Trailers
            trailers_data = {
                'trailers_export': {
                    'campaign_id': campaign.campaign_id,
                    'export_timestamp': campaign.creation_timestamp,
                    'trailers': [
                        {
                            'platform': trailer.platform.value,
                            'title': trailer.title,
                            'content': trailer.content,
                            'metadata': trailer.metadata,
                            'viral_potential': trailer.viral_potential
                        } for trailer in campaign.trailers
                    ]
                }
            }
            with open("trailers_export.json", 'w') as f:
                json.dump(trailers_data, f, indent=2)

        # Export strategy files
        if args.export_strategy:
            # Posting schedule
            schedule_data = {
                'posting_schedule_export': {
                    'campaign_id': campaign.campaign_id,
                    'export_timestamp': campaign.creation_timestamp,
                    'schedule': campaign.posting_schedule,
                    'target_platforms': [p.value for p in campaign.target_platforms]
                }
            }
            with open("posting_schedule.json", 'w') as f:
                json.dump(schedule_data, f, indent=2)

            # Content strategy
            strategy_data = {
                'content_strategy_export': {
                    'campaign_id': campaign.campaign_id,
                    'export_timestamp': campaign.creation_timestamp,
                    'strategy': campaign.content_strategy,
                    'viral_strategy': campaign.viral_strategy.value,
                    'target_audience': campaign.target_audience
                }
            }
            with open("content_strategy.json", 'w') as f:
                json.dump(strategy_data, f, indent=2)