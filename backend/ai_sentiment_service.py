"""
StoryCore AI Sentiment Service

Analyzes text to detect emotional tone and sentiment.
Used for automatically suggesting music, SFX, and voice profiles.
"""

import logging
from typing import Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class Sentiment(str, Enum):
    """Supported sentiments for audio mapping"""
    HAPPY = "happy"
    SAD = "sad"
    ACTION = "action"
    SUSPENSE = "suspense"
    DRAMATIC = "dramatic"
    CALM = "calm"
    HORROR = "horror"
    COMEDY = "comedy"

class SentimentAnalysisResult:
    """Result of sentiment analysis"""
    def __init__(self, sentiment: Sentiment, confidence: float, keywords: List[str]):
        self.sentiment = sentiment
        self.confidence = confidence
        self.keywords = keywords

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sentiment": self.sentiment.value,
            "confidence": self.confidence,
            "keywords": self.keywords
        }

class AISentimentService:
    """Service for analyzing sentiment of narrative text"""
    
    def __init__(self):
        # In a real implementation, this might load a lightweight model 
        # or prepare to call an LLM.
        pass

    async def analyze_text(self, text: str) -> SentimentAnalysisResult:
        """
        Analyze text and return detected sentiment.
        Uses a keyword-based heuristic or LLM call.
        """
        logger.info(f"Analyzing sentiment for text: {text[:50]}...")
        
        # Simple heuristic for demonstration (in production, use LLM or specialized model)
        text_lower = text.lower()
        
        scores = {s: 0.0 for s in Sentiment}
        
        # Keyword mappings
        keywords = {
            Sentiment.HAPPY: ["joy", "happy", "smile", "laugh", "bright", "sunny", "celebrate"],
            Sentiment.SAD: ["cry", "sad", "dark", "funeral", "loss", "lonely", "rain"],
            Sentiment.ACTION: ["run", "fight", "chase", "explode", "fast", "velocity", "gun"],
            Sentiment.SUSPENSE: ["shadow", "mystery", "quiet", "wait", "creak", "unknown"],
            Sentiment.DRAMATIC: ["intense", "betrayal", "heart", "strong", "power", "clash"],
            Sentiment.CALM: ["peace", "soft", "rest", "nature", "gentle", "smooth"],
            Sentiment.HORROR: ["scary", "blood", "scream", "ghost", "monster", "dead"],
            Sentiment.COMEDY: ["joke", "funny", "silly", "prank", "goofy"]
        }
        
        detected_keywords = []
        for sentiment, words in keywords.items():
            for word in words:
                if word in text_lower:
                    scores[sentiment] += 1.0
                    detected_keywords.append(word)
        
        # Find max score
        top_sentiment = max(scores, key=scores.get)
        confidence = min(0.95, scores[top_sentiment] / 5.0) if scores[top_sentiment] > 0 else 0.5
        
        # If no keywords found, default to DRAMATIC or use LLM if available
        if scores[top_sentiment] == 0:
            top_sentiment = Sentiment.DRAMATIC
            confidence = 0.3
            
        return SentimentAnalysisResult(top_sentiment, confidence, list(set(detected_keywords)))

    def map_to_audio_profile(self, sentiment: Sentiment) -> Dict[str, Any]:
        """Map sentiment to suggested audio parameters"""
        mappings = {
            Sentiment.HAPPY: {
                "theme": "Comedy",
                "intensity": "medium",
                "tempo": "medium",
                "voice_style": "Friendly"
            },
            Sentiment.SAD: {
                "theme": "Drama",
                "intensity": "low",
                "tempo": "slow",
                "voice_style": "Calm"
            },
            Sentiment.ACTION: {
                "theme": "Action",
                "intensity": "high",
                "tempo": "fast",
                "voice_style": "Energetic"
            },
            Sentiment.SUSPENSE: {
                "theme": "Thriller",
                "intensity": "medium",
                "tempo": "medium",
                "voice_style": "Mysterious"
            },
            Sentiment.DRAMATIC: {
                "theme": "Drama",
                "intensity": "high",
                "tempo": "medium",
                "voice_style": "Serious"
            },
            Sentiment.CALM: {
                "theme": "Documentary",
                "intensity": "low",
                "tempo": "slow",
                "voice_style": "Calm"
            },
            Sentiment.HORROR: {
                "theme": "Horror",
                "intensity": "high",
                "tempo": "slow",
                "voice_style": "Aggressive"
            },
            Sentiment.COMEDY: {
                "theme": "Comedy",
                "intensity": "medium",
                "tempo": "fast",
                "voice_style": "Energetic"
            }
        }
        return mappings.get(sentiment, mappings[Sentiment.DRAMATIC])
