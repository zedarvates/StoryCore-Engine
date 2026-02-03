"""
Evidence Retrieval API

This module provides functionality to retrieve supporting or contradicting
evidence for claims from trusted sources, with relevance scoring and excerpt extraction.

Requirements: 6.4
"""

import re
from typing import List, Optional, Tuple
from datetime import datetime
from .models import Claim, Evidence
from .trusted_sources import Source, get_trusted_sources


def retrieve_evidence(
    claim: Claim,
    sources: List[Source],
    max_results: int = 5
) -> List[Evidence]:
    """
    Retrieves supporting or contradicting evidence for a claim from sources.
    
    This is a placeholder implementation that demonstrates the API structure.
    In a production system, this would:
    1. Query each source's API or scrape web content
    2. Search for relevant information about the claim
    3. Extract relevant excerpts
    4. Score relevance and credibility
    
    Args:
        claim: Claim to find evidence for
        sources: List of sources to search
        max_results: Maximum number of evidence items to return
        
    Returns:
        List of Evidence objects with source, relevance, and excerpt
        
    Examples:
        >>> from .trusted_sources import get_trusted_sources
        >>> claim = Claim(id="1", text="Water boils at 100 degrees Celsius.", position=(0, 35))
        >>> sources = get_trusted_sources("physics")
        >>> evidence = retrieve_evidence(claim, sources, max_results=3)
        >>> len(evidence) <= 3
        True
    """
    evidence_list = []
    
    # Extract key terms from claim for searching
    search_terms = _extract_search_terms(claim.text)
    
    for source in sources[:max_results]:  # Limit sources to search
        # In production, this would make actual API calls or web scraping
        # For now, create placeholder evidence
        evidence = _create_placeholder_evidence(claim, source, search_terms)
        if evidence:
            evidence_list.append(evidence)
    
    # Sort by relevance score
    evidence_list.sort(key=lambda e: e.relevance, reverse=True)
    
    return evidence_list[:max_results]


def retrieve_evidence_batch(
    claims: List[Claim],
    sources: List[Source],
    max_results_per_claim: int = 5
) -> List[List[Evidence]]:
    """
    Retrieves evidence for multiple claims efficiently.
    
    Args:
        claims: List of claims to find evidence for
        sources: List of sources to search
        max_results_per_claim: Maximum evidence items per claim
        
    Returns:
        List of evidence lists, one per claim in same order
    """
    return [retrieve_evidence(claim, sources, max_results_per_claim) for claim in claims]


def calculate_relevance_score(claim_text: str, evidence_text: str) -> float:
    """
    Calculates relevance score between claim and evidence text.
    
    Uses keyword overlap and semantic similarity heuristics.
    
    Args:
        claim_text: The claim text
        evidence_text: The evidence excerpt text
        
    Returns:
        Relevance score (0-100)
    """
    # Extract keywords from both texts
    claim_keywords = _extract_keywords(claim_text)
    evidence_keywords = _extract_keywords(evidence_text)
    
    if not claim_keywords:
        return 0.0
    
    # Calculate keyword overlap
    overlap = claim_keywords.intersection(evidence_keywords)
    overlap_ratio = len(overlap) / len(claim_keywords)
    
    # Base score on overlap
    base_score = overlap_ratio * 100
    
    # Bonus for exact phrase matches
    claim_lower = claim_text.lower()
    evidence_lower = evidence_text.lower()
    
    # Check for significant phrase matches (3+ words)
    claim_phrases = _extract_phrases(claim_lower, min_words=3)
    phrase_matches = sum(1 for phrase in claim_phrases if phrase in evidence_lower)
    
    if phrase_matches > 0:
        base_score = min(100.0, base_score + phrase_matches * 10)
    
    return base_score


def extract_relevant_excerpt(
    full_text: str,
    claim_text: str,
    max_length: int = 200
) -> str:
    """
    Extracts the most relevant excerpt from full text for a claim.
    
    Finds the section of text most relevant to the claim and extracts
    a readable excerpt around it.
    
    Args:
        full_text: Full source text
        claim_text: Claim to find relevant excerpt for
        max_length: Maximum length of excerpt in characters
        
    Returns:
        Relevant excerpt string
    """
    if not full_text:
        return ""
    
    # Extract keywords from claim
    keywords = _extract_keywords(claim_text)
    
    # Split text into sentences
    sentences = _split_into_sentences(full_text)
    
    # Score each sentence by keyword presence
    sentence_scores = []
    for i, sentence in enumerate(sentences):
        score = _score_sentence_relevance(sentence, keywords)
        sentence_scores.append((i, score, sentence))
    
    # Sort by score
    sentence_scores.sort(key=lambda x: x[1], reverse=True)
    
    if not sentence_scores:
        return full_text[:max_length]
    
    # Get best sentence and surrounding context
    best_idx = sentence_scores[0][0]
    
    # Include surrounding sentences for context
    start_idx = max(0, best_idx - 1)
    end_idx = min(len(sentences), best_idx + 2)
    
    excerpt = " ".join(sentences[start_idx:end_idx])
    
    # Truncate if too long
    if len(excerpt) > max_length:
        excerpt = excerpt[:max_length - 3] + "..."
    
    return excerpt


def _extract_search_terms(text: str) -> List[str]:
    """
    Extracts key search terms from claim text.
    
    Args:
        text: Text to extract terms from
        
    Returns:
        List of search term strings
    """
    # Remove common words
    stopwords = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
        'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
    }
    
    # Tokenize and filter
    words = re.findall(r'\b\w+\b', text.lower())
    terms = [w for w in words if w not in stopwords and len(w) > 2]
    
    return terms


def _extract_keywords(text: str) -> set:
    """
    Extracts significant keywords from text.
    
    Args:
        text: Text to extract keywords from
        
    Returns:
        Set of keyword strings
    """
    terms = _extract_search_terms(text)
    return set(terms)


def _extract_phrases(text: str, min_words: int = 3) -> List[str]:
    """
    Extracts multi-word phrases from text.
    
    Args:
        text: Text to extract phrases from
        min_words: Minimum number of words in a phrase
        
    Returns:
        List of phrase strings
    """
    words = text.split()
    phrases = []
    
    for i in range(len(words) - min_words + 1):
        phrase = " ".join(words[i:i + min_words])
        phrases.append(phrase)
    
    return phrases


def _split_into_sentences(text: str) -> List[str]:
    """
    Splits text into sentences.
    
    Args:
        text: Text to split
        
    Returns:
        List of sentence strings
    """
    # Simple sentence splitting on common punctuation
    sentences = re.split(r'[.!?]+\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def _score_sentence_relevance(sentence: str, keywords: set) -> float:
    """
    Scores how relevant a sentence is based on keyword presence.
    
    Args:
        sentence: Sentence to score
        keywords: Set of keywords to look for
        
    Returns:
        Relevance score
    """
    sentence_words = set(re.findall(r'\b\w+\b', sentence.lower()))
    matches = keywords.intersection(sentence_words)
    
    if not keywords:
        return 0.0
    
    return len(matches) / len(keywords)


def _create_placeholder_evidence(
    claim: Claim,
    source: Source,
    search_terms: List[str]
) -> Optional[Evidence]:
    """
    Creates placeholder evidence for demonstration purposes.
    
    In production, this would be replaced with actual API calls or web scraping.
    
    Args:
        claim: Claim to create evidence for
        source: Source to attribute evidence to
        search_terms: Search terms extracted from claim
        
    Returns:
        Evidence object or None
    """
    # Create a synthetic excerpt that includes some search terms
    if search_terms:
        excerpt = f"According to {source.name}, research indicates that {' '.join(search_terms[:3])} " \
                  f"is supported by multiple studies. Further investigation is recommended."
    else:
        excerpt = f"Information from {source.name} provides context for this claim."
    
    # Calculate synthetic relevance based on source credibility
    relevance = min(100.0, source.credibility_score * 0.8 + 20)
    
    evidence = Evidence(
        source=source.name,
        source_type=source.source_type,
        credibility_score=source.credibility_score,
        relevance=relevance,
        excerpt=excerpt,
        url=source.url,
        publication_date=datetime.now()
    )
    
    return evidence


def filter_evidence_by_credibility(
    evidence_list: List[Evidence],
    min_credibility: float = 70.0
) -> List[Evidence]:
    """
    Filters evidence by minimum credibility score.
    
    Args:
        evidence_list: List of evidence to filter
        min_credibility: Minimum credibility score threshold
        
    Returns:
        Filtered list of evidence
    """
    return [e for e in evidence_list if e.credibility_score >= min_credibility]


def filter_evidence_by_relevance(
    evidence_list: List[Evidence],
    min_relevance: float = 50.0
) -> List[Evidence]:
    """
    Filters evidence by minimum relevance score.
    
    Args:
        evidence_list: List of evidence to filter
        min_relevance: Minimum relevance score threshold
        
    Returns:
        Filtered list of evidence
    """
    return [e for e in evidence_list if e.relevance >= min_relevance]


def rank_evidence(
    evidence_list: List[Evidence],
    credibility_weight: float = 0.5,
    relevance_weight: float = 0.5
) -> List[Evidence]:
    """
    Ranks evidence by weighted combination of credibility and relevance.
    
    Args:
        evidence_list: List of evidence to rank
        credibility_weight: Weight for credibility score (0-1)
        relevance_weight: Weight for relevance score (0-1)
        
    Returns:
        Sorted list of evidence (highest ranked first)
    """
    def calculate_rank(evidence: Evidence) -> float:
        return (evidence.credibility_score * credibility_weight +
                evidence.relevance * relevance_weight)
    
    return sorted(evidence_list, key=calculate_rank, reverse=True)
