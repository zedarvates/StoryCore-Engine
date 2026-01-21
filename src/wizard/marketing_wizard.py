"""
ViralForge Marketing Content Wizard - Viral marketing content generation.

An intelligent wizard that creates comprehensive marketing content for StoryCore projects,
including thumbnails, descriptions, social media posts, trailers, and viral strategies.
Transforms creative content into successful promotions across all platforms.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import os
from pathlib import Path
from datetime import datetime
import asyncio
import re


class Platform(Enum):
    """Social media and content platforms"""
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    REDDIT = "reddit"
    DISCORD = "discord"


class ContentType(Enum):
    """Types of marketing content"""
    THUMBNAIL = "thumbnail"
    DESCRIPTION = "description"
    TITLE = "title"
    POST = "post"
    STORY = "story"
    TRAILER = "trailer"
    HASHTAGS = "hashtags"
    SEO_TAGS = "seo_tags"


class ViralStrategy(Enum):
    """Viral marketing strategies"""
    EDUCATIONAL = "educational"
    ENTERTAINING = "entertaining"
    EMOTIONAL = "emotional"
    CONTROVERSIAL = "controversial"
    TRENDING = "trending"
    NOSTALGIC = "nostalgic"
    INSPIRATIONAL = "inspirational"
    HUMOROUS = "humorous"


@dataclass
class MarketingAsset:
    """A marketing asset (thumbnail, description, etc.)"""
    asset_id: str
    content_type: ContentType
    platform: Platform
    title: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    viral_potential: float = 0.0
    engagement_prediction: float = 0.0


@dataclass
class MarketingCampaign:
    """Complete marketing campaign for a project"""
    campaign_id: str
    project_id: str
    creation_timestamp: str
    campaign_title: str
    target_platforms: List[Platform] = field(default_factory=list)
    viral_strategy: ViralStrategy = ViralStrategy.EDUCATIONAL

    # Content assets
    thumbnails: List[MarketingAsset] = field(default_factory=list)
    descriptions: List[MarketingAsset] = field(default_factory=list)
    social_posts: List[MarketingAsset] = field(default_factory=list)
    trailers: List[MarketingAsset] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)

    # Analytics and strategy
    target_audience: Dict[str, Any] = field(default_factory=dict)
    content_strategy: Dict[str, Any] = field(default_factory=dict)
    posting_schedule: List[Dict[str, Any]] = field(default_factory=list)
    performance_metrics: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    project_analysis: Dict[str, Any] = field(default_factory=dict)
    viral_potential_score: float = 0.0
    estimated_reach: int = 0


class MarketingWizard:
    """
    ViralForge Marketing Content Wizard - Viral Marketing Assistant

    Creates comprehensive marketing campaigns including:
    - Eye-catching thumbnails with viral potential
    - SEO-optimized descriptions and titles
    - Platform-specific social media content
    - Automated trailer generation
    - Hashtag strategies and posting schedules
    - Viral potential analysis and optimization
    """

    def __init__(self, marketing_engine=None):
        """Initialize the Marketing wizard"""
        self.marketing_engine = marketing_engine
        self.campaign: Optional[MarketingCampaign] = None

    async def create_marketing_campaign(self, project_path: Path,
                                      campaign_title: str = "",
                                      target_platforms: List[str] = None,
                                      viral_strategy: str = "educational") -> MarketingCampaign:
        """
        Create a comprehensive marketing campaign for the project

        Args:
            project_path: Path to the StoryCore project directory
            campaign_title: Title for the marketing campaign
            target_platforms: List of platforms to target (optional)
            viral_strategy: Viral marketing strategy to employ

        Returns:
            Complete marketing campaign
        """
        print("🚀 ViralForge - Marketing Content Wizard")
        print("=" * 55)

        # Load project data and analyze
        project_data = self._load_project_data(project_path)

        if not project_data:
            raise ValueError("No project data found. Please ensure this is a valid StoryCore project.")

        print(f"🎯 Analyzing project: {project_data.get('name', 'Unknown Project')}")

        # Create campaign
        campaign = MarketingCampaign(
            campaign_id=f"campaign_{int(datetime.utcnow().timestamp())}",
            project_id=self._get_project_id(project_path),
            creation_timestamp=datetime.utcnow().isoformat() + "Z",
            campaign_title=campaign_title or f"Marketing Campaign - {project_data.get('name', 'Project')}",
            viral_strategy=self._parse_viral_strategy(viral_strategy)
        )

        # Set target platforms
        if target_platforms:
            campaign.target_platforms = [Platform(p.lower()) for p in target_platforms if p.lower() in [pl.value for pl in Platform]]
        else:
            campaign.target_platforms = [Platform.YOUTUBE, Platform.TIKTOK, Platform.INSTAGRAM]

        print(f"🎨 Viral strategy: {campaign.viral_strategy.value.title()}")
        print(f"📱 Target platforms: {', '.join([p.value.title() for p in campaign.target_platforms])}")

        # Analyze project for marketing potential
        campaign.project_analysis = self._analyze_project_for_marketing(project_data)
        campaign.viral_potential_score = self._calculate_viral_potential(campaign.project_analysis)

        print("📊 Viral potential analysis completed")

        # Generate marketing content
        await self._generate_thumbnails(campaign, project_data)
        await self._generate_descriptions(campaign, project_data)
        await self._generate_social_posts(campaign, project_data)
        await self._generate_trailers(campaign, project_data)
        await self._generate_hashtags(campaign, project_data)

        # Create posting strategy
        campaign.posting_schedule = self._create_posting_schedule(campaign)
        campaign.target_audience = self._define_target_audience(campaign.project_analysis)
        campaign.content_strategy = self._develop_content_strategy(campaign)
        campaign.performance_metrics = self._initialize_performance_metrics(campaign)

        # Calculate estimated reach
        campaign.estimated_reach = self._estimate_campaign_reach(campaign)

        self.campaign = campaign
        self._save_marketing_campaign(project_path, campaign)

        print("
✅ Marketing campaign created successfully!"        print(f"🎯 Viral potential: {campaign.viral_potential_score:.1f}/10")
        print(f"🎬 Content assets: {len(campaign.thumbnails) + len(campaign.descriptions) + len(campaign.social_posts) + len(campaign.trailers)}")
        print(f"📈 Estimated reach: {campaign.estimated_reach:,} people")
        print(f"🏷️ Hashtags generated: {len(campaign.hashtags)}")

        return campaign

    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load all relevant project data for marketing analysis"""
        project_data = {}

        # Core project files
        files_to_check = [
            'project.json',
            'character_definitions.json',
            'shot_planning.json',
            'scene_breakdown.json'
        ]

        for filename in files_to_check:
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        project_data[filename.replace('.json', '')] = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    continue

        return project_data

    def _get_project_id(self, project_path: Path) -> str:
        """Get project ID from project.json"""
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)
                    return project_data.get('id', 'unknown')
            except:
                pass
        return f"marketing_{int(datetime.utcnow().timestamp())}"

    def _parse_viral_strategy(self, strategy: str) -> ViralStrategy:
        """Parse viral strategy string to enum"""
        strategy_map = {
            'educational': ViralStrategy.EDUCATIONAL,
            'entertaining': ViralStrategy.ENTERTAINING,
            'emotional': ViralStrategy.EMOTIONAL,
            'controversial': ViralStrategy.CONTROVERSIAL,
            'trending': ViralStrategy.TRENDING,
            'nostalgic': ViralStrategy.NOSTALGIC,
            'inspirational': ViralStrategy.INSPIRATIONAL,
            'humorous': ViralStrategy.HUMOROUS
        }
        return strategy_map.get(strategy.lower(), ViralStrategy.EDUCATIONAL)

    def _analyze_project_for_marketing(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze project content for marketing potential"""
        analysis = {
            'genre': 'unknown',
            'tone': 'neutral',
            'target_age': 'general',
            'emotional_impact': 'medium',
            'visual_appeal': 'medium',
            'story_complexity': 'medium',
            'character_appeal': 'medium',
            'viral_triggers': [],
            'market_trends': [],
            'competition_level': 'medium'
        }

        # Analyze project metadata
        if 'project' in project_data:
            project = project_data['project']
            analysis['genre'] = project.get('genre', 'unknown')
            analysis['tone'] = project.get('tone', 'neutral')

        # Analyze characters
        if 'character_definitions' in project_data:
            characters = project_data['character_definitions'].get('characters', [])
            analysis['character_appeal'] = 'high' if len(characters) > 3 else 'medium'

        # Analyze shots for visual appeal
        if 'shot_planning' in project_data:
            shots = project_data['shot_planning'].get('shot_lists', [])
            has_special_shots = any('special' in str(shot).lower() for shot in shots)
            analysis['visual_appeal'] = 'high' if has_special_shots else 'medium'

        # Determine viral triggers based on content
        if analysis['genre'] == 'horror':
            analysis['viral_triggers'].extend(['fear', 'suspense', 'jump_scares'])
        elif analysis['genre'] == 'comedy':
            analysis['viral_triggers'].extend(['humor', 'laughter', 'relatable'])
        elif analysis['genre'] == 'educational':
            analysis['viral_triggers'].extend(['learning', 'knowledge', 'useful'])

        return analysis

    def _calculate_viral_potential(self, analysis: Dict[str, Any]) -> float:
        """Calculate viral potential score (0-10)"""
        score = 5.0  # Base score

        # Genre viral potential
        genre_multipliers = {
            'educational': 1.5,
            'comedy': 1.4,
            'horror': 1.3,
            'drama': 1.1,
            'fantasy': 1.2,
            'documentary': 1.0
        }
        score *= genre_multipliers.get(analysis.get('genre', 'unknown'), 1.0)

        # Visual appeal bonus
        if analysis.get('visual_appeal') == 'high':
            score += 1.0

        # Character appeal bonus
        if analysis.get('character_appeal') == 'high':
            score += 0.5

        # Emotional impact bonus
        if analysis.get('emotional_impact') == 'high':
            score += 1.0

        # Viral triggers bonus
        viral_triggers_count = len(analysis.get('viral_triggers', []))
        score += min(viral_triggers_count * 0.3, 1.5)

        return min(max(score, 0.0), 10.0)

    async def _generate_thumbnails(self, campaign: MarketingCampaign, project_data: Dict[str, Any]):
        """Generate thumbnail concepts for different platforms"""
        print("🖼️ Generating thumbnail concepts...")

        base_title = project_data.get('project', {}).get('name', 'Amazing Project')

        # YouTube thumbnail (landscape)
        youtube_thumb = MarketingAsset(
            asset_id=f"thumb_youtube_{campaign.campaign_id}",
            content_type=ContentType.THUMBNAIL,
            platform=Platform.YOUTUBE,
            title=f"YouTube Thumbnail - {base_title}",
            content=self._generate_thumbnail_description(campaign, Platform.YOUTUBE, project_data),
            metadata={
                'dimensions': '1280x720',
                'style': 'bold_text_on_image',
                'colors': ['red', 'white', 'black'],
                'elements': ['title_text', 'emotional_face', 'brand_logo']
            },
            viral_potential=self._calculate_thumbnail_viral_potential(campaign, Platform.YOUTUBE)
        )
        campaign.thumbnails.append(youtube_thumb)

        # TikTok thumbnail (square/vertical)
        tiktok_thumb = MarketingAsset(
            asset_id=f"thumb_tiktok_{campaign.campaign_id}",
            content_type=ContentType.THUMBNAIL,
            platform=Platform.TIKTOK,
            title=f"TikTok Thumbnail - {base_title}",
            content=self._generate_thumbnail_description(campaign, Platform.TIKTOK, project_data),
            metadata={
                'dimensions': '1080x1080',
                'style': 'trending_effect',
                'colors': ['bright', 'contrasting'],
                'elements': ['short_title', 'emoji', 'music_visualizer']
            },
            viral_potential=self._calculate_thumbnail_viral_potential(campaign, Platform.TIKTOK)
        )
        campaign.thumbnails.append(tiktok_thumb)

        # Instagram thumbnail (square)
        if Platform.INSTAGRAM in campaign.target_platforms:
            ig_thumb = MarketingAsset(
                asset_id=f"thumb_instagram_{campaign.campaign_id}",
                content_type=ContentType.THUMBNAIL,
                platform=Platform.INSTAGRAM,
                title=f"Instagram Thumbnail - {base_title}",
                content=self._generate_thumbnail_description(campaign, Platform.INSTAGRAM, project_data),
                metadata={
                    'dimensions': '1080x1080',
                    'style': 'aesthetic',
                    'colors': ['pastel', 'vibrant'],
                    'elements': ['story_preview', 'engagement_hook', 'brand_colors']
                },
                viral_potential=self._calculate_thumbnail_viral_potential(campaign, Platform.INSTAGRAM)
            )
            campaign.thumbnails.append(ig_thumb)

    def _generate_thumbnail_description(self, campaign: MarketingCampaign, platform: Platform,
                                      project_data: Dict[str, Any]) -> str:
        """Generate thumbnail description/prompt"""
        project_name = project_data.get('project', {}).get('name', 'Amazing Project')
        genre = campaign.project_analysis.get('genre', 'unknown')

        if platform == Platform.YOUTUBE:
            return f"""Create a compelling YouTube thumbnail for "{project_name}" ({genre} genre):

DESIGN REQUIREMENTS:
- Bold, readable title text (white/red on dark background)
- Emotional facial expression or dramatic scene
- High contrast colors for visibility
- Include play button overlay
- Professional cinematic look

CONTENT FOCUS:
- Hook viewers with curiosity or emotion
- Show key character or dramatic moment
- Brand consistency with logo placement
- Optimized for 1280x720 resolution"""

        elif platform == Platform.TIKTOK:
            return f"""Create a viral TikTok thumbnail for "{project_name}" ({genre} genre):

DESIGN REQUIREMENTS:
- Square format (1080x1080) optimized for mobile
- Short, punchy text overlay
- Trending visual effects or filters
- Bright, eye-catching colors
- Include relevant emojis

CONTENT FOCUS:
- First 3 seconds hook - show the exciting part
- Use trending sounds/music visualization
- Mobile-optimized text size and placement
- Curiosity gap to encourage taps"""

        elif platform == Platform.INSTAGRAM:
            return f"""Create an aesthetic Instagram thumbnail for "{project_name}" ({genre} genre):

DESIGN REQUIREMENTS:
- Clean, minimalist design
- Brand colors and consistent style
- Story preview or carousel indicator
- High-quality, polished look
- Mobile-first design approach

CONTENT FOCUS:
- Emotional connection through visuals
- Behind-the-scenes or final result preview
- Engagement hooks (questions, calls-to-action)
- Consistent with overall brand aesthetic"""

        return f"Create an engaging thumbnail for {project_name}"

    def _calculate_thumbnail_viral_potential(self, campaign: MarketingCampaign, platform: Platform) -> float:
        """Calculate viral potential for a thumbnail"""
        base_score = campaign.viral_potential_score / 10.0  # Convert to 0-1 scale

        # Platform-specific multipliers
        platform_multipliers = {
            Platform.TIKTOK: 1.3,  # TikTok favors viral content
            Platform.YOUTUBE: 1.1,  # YouTube favors quality
            Platform.INSTAGRAM: 1.2  # Instagram favors aesthetics
        }

        multiplier = platform_multipliers.get(platform, 1.0)

        return min(base_score * multiplier * 10.0, 10.0)

    async def _generate_descriptions(self, campaign: MarketingCampaign, project_data: Dict[str, Any]):
        """Generate SEO-optimized descriptions for different platforms"""
        print("📝 Generating SEO descriptions...")

        base_title = project_data.get('project', {}).get('name', 'Amazing Project')

        # YouTube description (detailed)
        youtube_desc = MarketingAsset(
            asset_id=f"desc_youtube_{campaign.campaign_id}",
            content_type=ContentType.DESCRIPTION,
            platform=Platform.YOUTUBE,
            title=f"YouTube Description - {base_title}",
            content=self._generate_platform_description(campaign, Platform.YOUTUBE, project_data),
            metadata={
                'max_length': 5000,
                'seo_keywords': self._extract_seo_keywords(project_data),
                'timestamps': True,
                'links': ['social_media', 'playlist', 'related_videos']
            },
            viral_potential=self._calculate_description_viral_potential(campaign, Platform.YOUTUBE)
        )
        campaign.descriptions.append(youtube_desc)

        # TikTok description (short and punchy)
        tiktok_desc = MarketingAsset(
            asset_id=f"desc_tiktok_{campaign.campaign_id}",
            content_type=ContentType.DESCRIPTION,
            platform=Platform.TIKTOK,
            title=f"TikTok Description - {base_title}",
            content=self._generate_platform_description(campaign, Platform.TIKTOK, project_data),
            metadata={
                'max_length': 150,
                'hashtags': True,
                'mentions': True,
                'call_to_action': True
            },
            viral_potential=self._calculate_description_viral_potential(campaign, Platform.TIKTOK)
        )
        campaign.descriptions.append(tiktok_desc)

    def _generate_platform_description(self, campaign: MarketingCampaign, platform: Platform,
                                     project_data: Dict[str, Any]) -> str:
        """Generate platform-specific description"""
        project_name = project_data.get('project', {}).get('name', 'Amazing Project')
        genre = campaign.project_analysis.get('genre', 'unknown')

        if platform == Platform.YOUTUBE:
            return f"""🎬 {project_name} - {genre.title()} Masterpiece!

✨ What makes this project special:
• Stunning visuals and cinematography
• Compelling characters and storytelling
• Professional production quality
• Emotional depth and impact

🎯 Perfect for fans of: {self._generate_genre_recommendations(genre)}

🔥 Don't forget to:
👍 LIKE if you enjoyed this!
🔔 SUBSCRIBE for more amazing content!
💬 COMMENT your thoughts below!

⏱️ TIMESTAMPS:
00:00 - Introduction
00:30 - Main Story
02:15 - Key Moments
04:45 - Conclusion

#StoryCore #{genre.title()} #{project_name.replace(' ', '')} #Creative #Production

🔗 Connect with us:
Instagram: @storycore
TikTok: @storycore
Website: storycore.com

Thanks for watching! 🎉"""

        elif platform == Platform.TIKTOK:
            return f"""🎬 {project_name} - You won't believe what happens! 😱

{genre.title()} story that will blow your mind! 🔥

#StoryCore #{genre} #Viral #Amazing #MustWatch
@storycore #FYP"""

        return f"Check out {project_name} - an amazing {genre} project!"

    def _extract_seo_keywords(self, project_data: Dict[str, Any]) -> List[str]:
        """Extract SEO keywords from project data"""
        keywords = []

        # Add genre
        if 'project' in project_data:
            genre = project_data['project'].get('genre', '')
            if genre:
                keywords.extend([genre, f"{genre} story", f"{genre} video"])

        # Add character types
        if 'character_definitions' in project_data:
            characters = project_data['character_definitions'].get('characters', [])
            for char in characters[:3]:  # Limit to first 3
                char_name = char.get('name', '')
                if char_name:
                    keywords.append(char_name)

        # Add project name variations
        if 'project' in project_data:
            project_name = project_data['project'].get('name', '')
            if project_name:
                keywords.extend([project_name, f"{project_name} story", f"{project_name} project"])

        return keywords[:10]  # Limit to 10 keywords

    def _generate_genre_recommendations(self, genre: str) -> str:
        """Generate genre recommendations for similar content"""
        recommendations = {
            'horror': 'The Conjuring, Hereditary, Midsommar',
            'comedy': 'The Grand Budapest Hotel, Parasite, Everything Everywhere All at Once',
            'drama': 'The Shawshank Redemption, Forrest Gump, Good Will Hunting',
            'fantasy': 'The Lord of the Rings, Game of Thrones, Avatar',
            'sci-fi': 'Inception, Interstellar, The Matrix',
            'romance': 'La La Land, Eternal Sunshine, Before Sunrise',
            'action': 'John Wick, Mad Max, The Dark Knight',
            'documentary': 'Won\'t You Be My Neighbor?, Free Solo, Jiro Dreams of Sushi'
        }

        return recommendations.get(genre.lower(), 'cinematic storytelling')

    def _calculate_description_viral_potential(self, campaign: MarketingCampaign, platform: Platform) -> float:
        """Calculate viral potential for a description"""
        base_score = campaign.viral_potential_score * 0.8  # Descriptions are less visual

        # Platform-specific adjustments
        if platform == Platform.TIKTOK:
            base_score *= 1.2  # TikTok favors short, punchy content
        elif platform == Platform.YOUTUBE:
            base_score *= 1.1  # YouTube favors detailed descriptions

        return min(base_score, 10.0)

    async def _generate_social_posts(self, campaign: MarketingCampaign, project_data: Dict[str, Any]):
        """Generate social media posts for different platforms"""
        print("📱 Generating social media posts...")

        for platform in campaign.target_platforms:
            if platform in [Platform.TIKTOK, Platform.INSTAGRAM, Platform.TWITTER]:
                post = MarketingAsset(
                    asset_id=f"post_{platform.value}_{campaign.campaign_id}",
                    content_type=ContentType.POST,
                    platform=platform,
                    title=f"{platform.value.title()} Post - {campaign.campaign_title}",
                    content=self._generate_social_post(campaign, platform, project_data),
                    metadata={
                        'character_limit': self._get_platform_character_limit(platform),
                        'hashtags': self._generate_platform_hashtags(platform, campaign),
                        'best_posting_time': self._get_optimal_posting_time(platform),
                        'engagement_hooks': self._generate_engagement_hooks(platform)
                    },
                    viral_potential=self._calculate_post_viral_potential(campaign, platform)
                )
                campaign.social_posts.append(post)

    def _generate_social_post(self, campaign: MarketingCampaign, platform: Platform,
                            project_data: Dict[str, Any]) -> str:
        """Generate platform-specific social media post"""
        project_name = project_data.get('project', {}).get('name', 'Amazing Project')
        genre = campaign.project_analysis.get('genre', 'unknown')

        strategy = campaign.viral_strategy

        if platform == Platform.TIKTOK:
            if strategy == ViralStrategy.ENTERTAINING:
                return f"""🎬 Just dropped an EPIC {genre} story that'll blow your mind! 🤯

Watch "{project_name}" and tell me in the comments: What's your favorite part? 👇

#{genre} #Storytelling #Viral #StoryCore #FYP"""
            elif strategy == ViralStrategy.EMOTIONAL:
                return f"""💔 This {genre} story hit different... 😢

"{project_name}" - you need to watch this!

What's the most emotional story you've seen? 💭

#{genre} #Emotional #Storytelling #MustWatch"""
            else:
                return f"""🚀 New {genre} masterpiece alert! 🎯

"{project_name}" is now live! Watch it now 🔥

#{genre} #NewVideo #StoryCore #Amazing"""

        elif platform == Platform.INSTAGRAM:
            return f"""🎬 {project_name}

A {genre} story that will captivate you from start to finish! ✨

Watch the full video in our bio link! 🔗

#{genre} #Storytelling #Creative #VideoContent #StoryCore"""

        elif platform == Platform.TWITTER:
            return f"""🎬 Just released: "{project_name}" - an incredible {genre} story! 🔥

Watch now and let me know what you think! 👇

#{genre} #Storytelling #Creative #VideoContent #StoryCore

[Link in bio]"""

        return f"Check out {project_name} - amazing {genre} content!"

    def _get_platform_character_limit(self, platform: Platform) -> int:
        """Get character limit for platform"""
        limits = {
            Platform.TIKTOK: 150,
            Platform.INSTAGRAM: 125,
            Platform.TWITTER: 280,
            Platform.FACEBOOK: 63206,
            Platform.LINKEDIN: 3000
        }
        return limits.get(platform, 280)

    def _generate_platform_hashtags(self, platform: Platform, campaign: MarketingCampaign) -> List[str]:
        """Generate platform-specific hashtags"""
        base_hashtags = campaign.hashtags[:5]  # Use top 5 from main hashtag list

        platform_specific = {
            Platform.TIKTOK: ['#FYP', '#ForYouPage', '#Viral', '#Trending'],
            Platform.INSTAGRAM: ['#Reels', '#Stories', '#Explore', '#ContentCreator'],
            Platform.TWITTER: ['#Thread', '#NowWatching', '#VideoContent', '#Creative'],
            Platform.YOUTUBE: ['#YouTube', '#Subscribe', '#NewVideo', '#Content']
        }

        platform_tags = platform_specific.get(platform, [])
        return base_hashtags + platform_tags

    def _get_optimal_posting_time(self, platform: Platform) -> str:
        """Get optimal posting time for platform"""
        times = {
            Platform.TIKTOK: "6-9 PM local time",
            Platform.INSTAGRAM: "11 AM - 1 PM, 7-9 PM local time",
            Platform.TWITTER: "8-10 AM, 12-3 PM, 5-6 PM local time",
            Platform.YOUTUBE: "2-4 PM, 8-10 PM local time"
        }
        return times.get(platform, "Peak hours for your audience")

    def _generate_engagement_hooks(self, platform: Platform) -> List[str]:
        """Generate engagement hooks for platform"""
        hooks = {
            Platform.TIKTOK: ["What's your favorite part?", "Tag a friend who needs to see this", "Comment below 👇"],
            Platform.INSTAGRAM: ["What's your reaction? 🤔", "Tag someone who would love this", "Double tap if you agree 💯"],
            Platform.TWITTER: ["What's your take? 🤔", "Retweet if you agree", "Reply with your thoughts 👇"]
        }
        return hooks.get(platform, ["What do you think?", "Share your thoughts!"])

    def _calculate_post_viral_potential(self, campaign: MarketingCampaign, platform: Platform) -> float:
        """Calculate viral potential for a social post"""
        base_score = campaign.viral_potential_score * 0.9  # Posts are highly shareable

        # Platform algorithm bonuses
        platform_bonuses = {
            Platform.TIKTOK: 1.4,  # TikTok algorithm favors viral content
            Platform.INSTAGRAM: 1.2,  # Instagram favors engaging content
            Platform.TWITTER: 1.1  # Twitter favors discussion-worthy content
        }

        bonus = platform_bonuses.get(platform, 1.0)

        return min(base_score * bonus, 10.0)

    async def _generate_trailers(self, campaign: MarketingCampaign, project_data: Dict[str, Any]):
        """Generate trailer concepts for promotional videos"""
        print("🎬 Generating trailer concepts...")

        project_name = project_data.get('project', {}).get('name', 'Amazing Project')

        # Main trailer (15-30 seconds)
        main_trailer = MarketingAsset(
            asset_id=f"trailer_main_{campaign.campaign_id}",
            content_type=ContentType.TRAILER,
            platform=Platform.YOUTUBE,
            title=f"Main Trailer - {project_name}",
            content=self._generate_trailer_script(campaign, "main", project_data),
            metadata={
                'duration': 30,
                'style': 'cinematic',
                'music': 'epic_orchestral',
                'voiceover': True,
                'text_overlays': True,
                'call_to_action': 'Watch Full Video'
            },
            viral_potential=self._calculate_trailer_viral_potential(campaign, "main")
        )
        campaign.trailers.append(main_trailer)

        # Short trailer (10-15 seconds) for social media
        short_trailer = MarketingAsset(
            asset_id=f"trailer_short_{campaign.campaign_id}",
            content_type=ContentType.TRAILER,
            platform=Platform.TIKTOK,
            title=f"Short Trailer - {project_name}",
            content=self._generate_trailer_script(campaign, "short", project_data),
            metadata={
                'duration': 15,
                'style': 'fast_paced',
                'music': 'trending_sound',
                'voiceover': False,
                'text_overlays': True,
                'call_to_action': 'Link in Bio'
            },
            viral_potential=self._calculate_trailer_viral_potential(campaign, "short")
        )
        campaign.trailers.append(short_trailer)

    def _generate_trailer_script(self, campaign: MarketingCampaign, trailer_type: str,
                               project_data: Dict[str, Any]) -> str:
        """Generate trailer script/description"""
        project_name = project_data.get('project', {}).get('name', 'Amazing Project')
        genre = campaign.project_analysis.get('genre', 'unknown')

        if trailer_type == "main":
            return f"""🎬 {project_name} - Official Trailer

TRAILER SCRIPT (30 seconds):

[0-5s] DRAMATIC OPENING SHOT
VOICEOVER: "In a world where..."

[5-15s] MONTAGE OF KEY SCENES
- Character introductions
- Conflict buildup
- Emotional moments
- Action sequences

[15-25s] CLIMAX BUILDUP
VOICEOVER: "One choice will change everything..."
INTENSE MUSIC SWELLS

[25-30s] TITLE CARD + RELEASE INFO
VOICEOVER: "Coming soon..."
CALL TO ACTION: "Like & Subscribe for more!"

MUSIC: Epic orchestral score
STYLE: Cinematic, professional
HOOK: Emotional connection + mystery"""

        elif trailer_type == "short":
            return f"""🎬 {project_name} - Quick Look! 🔥

TRAILER SCRIPT (15 seconds):

[0-3s] HOOK: Most shocking moment
TEXT: "You won't believe this"

[3-10s] FAST MONTAGE:
- Best character moments
- Plot twists
- Visual effects

[10-13s] CLIFFHANGER
TEXT: "Watch the full story"

[13-15s] CALL TO ACTION
TEXT: "Link in bio! 👆"
MUSIC: Trending TikTok sound

GOAL: Maximum curiosity gap for clicks!"""

        return f"Trailer for {project_name}"

    def _calculate_trailer_viral_potential(self, campaign: MarketingCampaign, trailer_type: str) -> float:
        """Calculate viral potential for a trailer"""
        base_score = campaign.viral_potential_score

        # Short form content performs better on social
        if trailer_type == "short":
            base_score *= 1.3

        return min(base_score, 10.0)

    async def _generate_hashtags(self, campaign: MarketingCampaign, project_data: Dict[str, Any]):
        """Generate comprehensive hashtag strategy"""
        print("🏷️ Generating hashtag strategy...")

        project_name = project_data.get('project', {}).get('name', 'Amazing Project')
        genre = campaign.project_analysis.get('genre', 'unknown')

        # Base project hashtags
        campaign.hashtags.extend([
            '#StoryCore',
            f'#{project_name.replace(" ", "")}',
            f'#{genre.title()}',
            '#Creative',
            '#VideoContent'
        ])

        # Genre-specific hashtags
        genre_hashtags = {
            'horror': ['#HorrorStory', '#Scary', '#Thriller', '#Spooky', '#Halloween'],
            'comedy': ['#Comedy', '#Funny', '#Humor', '#Laugh', '#Entertainment'],
            'drama': ['#Drama', '#Emotional', '#Storytelling', '#Acting', '#Film'],
            'fantasy': ['#Fantasy', '#Magic', '#Adventure', '#Epic', '#WorldBuilding'],
            'sci-fi': ['#SciFi', '#ScienceFiction', '#Future', '#Technology', '#Space'],
            'romance': ['#Romance', '#Love', '#Relationship', '#Heartwarming', '#Emotional'],
            'action': ['#Action', '#Adventure', '#Exciting', '#Fight', '#Hero'],
            'educational': ['#Education', '#Learning', '#Knowledge', '#Tutorial', '#Informative']
        }

        campaign.hashtags.extend(genre_hashtags.get(genre.lower(), ['#Creative', '#Art', '#Story']))

        # Viral strategy hashtags
        strategy_hashtags = {
            ViralStrategy.EDUCATIONAL: ['#LearnSomethingNew', '#Knowledge', '#Education'],
            ViralStrategy.ENTERTAINING: ['#Entertainment', '#Fun', '#Enjoy'],
            ViralStrategy.EMOTIONAL: ['#Emotional', '#Feelings', '#Heart'],
            ViralStrategy.TRENDING: ['#Trending', '#Viral', '#Popular'],
            ViralStrategy.HUMOROUS: ['#Funny', '#Humor', '#Comedy']
        }

        campaign.hashtags.extend(strategy_hashtags.get(campaign.viral_strategy, []))

        # Trending/popular hashtags
        campaign.hashtags.extend([
            '#Viral', '#MustWatch', '#Amazing', '#Creative', '#Art',
            '#DigitalArt', '#Animation', '#Video', '#ContentCreator',
            '#YouTube', '#TikTok', '#Instagram', '#SocialMedia'
        ])

        # Remove duplicates and limit to 30
        campaign.hashtags = list(set(campaign.hashtags))[:30]

    def _create_posting_schedule(self, campaign: MarketingCampaign) -> List[Dict[str, Any]]:
        """Create optimal posting schedule"""
        schedule = []

        # YouTube main video
        if Platform.YOUTUBE in campaign.target_platforms:
            schedule.append({
                'platform': 'youtube',
                'content_type': 'main_video',
                'optimal_time': 'Thursday 2-4 PM',
                'reason': 'Peak YouTube viewing time',
                'expected_reach': 'Primary audience'
            })

        # TikTok teasers
        if Platform.TIKTOK in campaign.target_platforms:
            schedule.extend([
                {
                    'platform': 'tiktok',
                    'content_type': 'trailer_teaser',
                    'optimal_time': 'Tuesday 6-8 PM',
                    'reason': 'High TikTok engagement',
                    'expected_reach': 'Young audience'
                },
                {
                    'platform': 'tiktok',
                    'content_type': 'behind_scenes',
                    'optimal_time': 'Friday 7-9 PM',
                    'reason': 'Weekend traffic',
                    'expected_reach': 'Creative community'
                }
            ])

        # Instagram posts
        if Platform.INSTAGRAM in campaign.target_platforms:
            schedule.extend([
                {
                    'platform': 'instagram',
                    'content_type': 'story_teaser',
                    'optimal_time': 'Wednesday 11 AM - 1 PM',
                    'reason': 'Lunch break engagement',
                    'expected_reach': 'Professional audience'
                },
                {
                    'platform': 'instagram',
                    'content_type': 'reel_full',
                    'optimal_time': 'Saturday 10 AM - 12 PM',
                    'reason': 'Weekend casual viewing',
                    'expected_reach': 'General audience'
                }
            ])

        return schedule

    def _define_target_audience(self, project_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Define target audience based on project analysis"""
        genre = project_analysis.get('genre', 'unknown')
        tone = project_analysis.get('tone', 'neutral')

        # Base demographics
        audience = {
            'age_range': '18-34',
            'gender': 'mixed',
            'interests': ['storytelling', 'creative_content'],
            'platforms': ['youtube', 'tiktok', 'instagram'],
            'psychographics': ['creative', 'imaginative']
        }

        # Adjust based on genre
        if genre == 'educational':
            audience.update({
                'age_range': '25-44',
                'interests': ['learning', 'self_improvement', 'knowledge'],
                'psychographics': ['curious', 'ambitious', 'intellectual']
            })
        elif genre == 'horror':
            audience.update({
                'age_range': '18-29',
                'interests': ['thrillers', 'supernatural', 'gaming'],
                'psychographics': ['adventurous', 'thrill_seeking']
            })
        elif genre == 'comedy':
            audience.update({
                'interests': ['humor', 'entertainment', 'social_media'],
                'psychographics': ['fun_loving', 'social', 'optimistic']
            })

        return audience

    def _develop_content_strategy(self, campaign: MarketingCampaign) -> Dict[str, Any]:
        """Develop comprehensive content strategy"""
        return {
            'primary_message': f"Experience this amazing {campaign.project_analysis.get('genre', 'creative')} story",
            'key_benefits': [
                'Emotional engagement',
                'High production quality',
                'Unique storytelling',
                'Professional execution'
            ],
            'content_pillars': [
                'Storytelling excellence',
                'Creative innovation',
                'Audience engagement',
                'Community building'
            ],
            'brand_voice': {
                'tone': 'professional_yet_approachable',
                'personality': 'creative_and_confident',
                'values': ['quality', 'innovation', 'engagement']
            },
            'content_mix': {
                'educational': 20,
                'entertainment': 50,
                'promotional': 20,
                'engagement': 10
            }
        }

    def _initialize_performance_metrics(self, campaign: MarketingCampaign) -> Dict[str, Any]:
        """Initialize performance tracking metrics"""
        return {
            'views_goal': campaign.estimated_reach * 0.1,  # 10% view rate
            'engagement_goal': campaign.estimated_reach * 0.05,  # 5% engagement rate
            'share_goal': campaign.estimated_reach * 0.01,  # 1% share rate
            'conversion_goal': campaign.estimated_reach * 0.005,  # 0.5% conversion rate
            'tracking_period': 30,  # days
            'key_metrics': [
                'views', 'watch_time', 'likes', 'comments', 'shares',
                'clicks', 'subscribers', 'followers', 'saves', 'mentions'
            ]
        }

    def _estimate_campaign_reach(self, campaign: MarketingCampaign) -> int:
        """Estimate total campaign reach"""
        base_reach = 1000  # Minimum reach

        # Viral potential multiplier
        viral_multiplier = campaign.viral_potential_score / 5.0  # 0-2x multiplier

        # Platform reach estimates
        platform_reach = {
            Platform.YOUTUBE: 50000,
            Platform.TIKTOK: 100000,
            Platform.INSTAGRAM: 25000,
            Platform.TWITTER: 15000,
            Platform.FACEBOOK: 30000
        }

        total_platform_reach = sum(platform_reach.get(platform, 0) for platform in campaign.target_platforms)

        estimated_reach = int((base_reach + total_platform_reach) * viral_multiplier)

        return max(estimated_reach, 1000)

    def _save_marketing_campaign(self, project_path: Path, campaign: MarketingCampaign) -> None:
        """Save the marketing campaign to project files"""
        # Save main campaign plan
        campaign_data = {
            'marketing_campaign': {
                'campaign_id': campaign.campaign_id,
                'project_id': campaign.project_id,
                'creation_timestamp': campaign.creation_timestamp,
                'campaign_title': campaign.campaign_title,
                'target_platforms': [p.value for p in campaign.target_platforms],
                'viral_strategy': campaign.viral_strategy.value,
                'project_analysis': campaign.project_analysis,
                'viral_potential_score': campaign.viral_potential_score,
                'target_audience': campaign.target_audience,
                'content_strategy': campaign.content_strategy,
                'posting_schedule': campaign.posting_schedule,
                'performance_metrics': campaign.performance_metrics,
                'estimated_reach': campaign.estimated_reach,
                'thumbnails': [
                    {
                        'asset_id': thumb.asset_id,
                        'platform': thumb.platform.value,
                        'title': thumb.title,
                        'content': thumb.content,
                        'metadata': thumb.metadata,
                        'viral_potential': thumb.viral_potential
                    } for thumb in campaign.thumbnails
                ],
                'descriptions': [
                    {
                        'asset_id': desc.asset_id,
                        'platform': desc.platform.value,
                        'title': desc.title,
                        'content': desc.content,
                        'metadata': desc.metadata,
                        'viral_potential': desc.viral_potential
                    } for desc in campaign.descriptions
                ],
                'social_posts': [
                    {
                        'asset_id': post.asset_id,
                        'platform': post.platform.value,
                        'title': post.title,
                        'content': post.content,
                        'metadata': post.metadata,
                        'viral_potential': post.viral_potential
                    } for post in campaign.social_posts
                ],
                'trailers': [
                    {
                        'asset_id': trailer.asset_id,
                        'platform': trailer.platform.value,
                        'title': trailer.title,
                        'content': trailer.content,
                        'metadata': trailer.metadata,
                        'viral_potential': trailer.viral_potential
                    } for trailer in campaign.trailers
                ],
                'hashtags': campaign.hashtags
            }
        }

        campaign_file = project_path / "marketing_campaign.json"
        with open(campaign_file, 'w') as f:
            json.dump(campaign_data, f, indent=2)

        # Update project.json with campaign metadata
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)

                project_data['marketing_campaign'] = {
                    'campaign_created': True,
                    'campaign_id': campaign.campaign_id,
                    'creation_timestamp': campaign.creation_timestamp,
                    'viral_potential': campaign.viral_potential_score,
                    'estimated_reach': campaign.estimated_reach,
                    'target_platforms': len(campaign.target_platforms)
                }

                with open(project_file, 'w') as f:
                    json.dump(project_data, f, indent=2)

            except Exception as e:
                print(f"Warning: Could not update project.json: {e}")


# Convenience functions
def create_marketing_wizard(marketing_engine=None) -> MarketingWizard:
    """Create a Marketing wizard instance"""
    return MarketingWizard(marketing_engine)


async def create_viral_campaign(project_path: Path, campaign_title: str = "",
                              target_platforms: List[str] = None,
                              viral_strategy: str = "educational") -> MarketingCampaign:
    """
    Convenience function to create a viral marketing campaign

    Args:
        project_path: Path to project directory
        campaign_title: Campaign title
        target_platforms: Target platforms
        viral_strategy: Viral strategy (educational, entertaining, emotional, etc.)

    Returns:
        Complete marketing campaign
    """
    wizard = create_marketing_wizard()
    return await wizard.create_marketing_campaign(
        project_path, campaign_title, target_platforms, viral_strategy
    )


def get_campaign_preview(project_path: Path) -> Dict[str, Any]:
    """
    Get marketing campaign preview

    Args:
        project_path: Path to project directory

    Returns:
        Campaign preview data
    """
    wizard = create_marketing_wizard()
    # For preview, we'd need to implement a preview method
    # For now, return basic info
    return {
        'estimated_assets': 8,
        'recommended_strategy': 'educational',
        'potential_platforms': ['youtube', 'tiktok', 'instagram']
    }