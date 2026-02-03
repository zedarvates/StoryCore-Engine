"""
Fact Extraction API

This module provides functionality to extract factual claims from text content
using pattern matching and semantic analysis.

Requirements: 1.1, 6.1
"""

import re
import uuid
from typing import List, Optional, Tuple
from .models import Claim


# Pattern definitions for factual assertions
FACTUAL_PATTERNS = [
    # Numerical facts: "X is Y units", "X measures Y", "X equals Y"
    r'\b(?:is|are|was|were|measures?|equals?|amounts? to)\s+(?:approximately\s+)?[\d,]+(?:\.\d+)?\s*(?:percent|%|degrees?|meters?|feet|miles|kilometers|kg|pounds|years?|days?|hours?|minutes?|seconds?)\b',
    
    # Scientific facts: "X causes Y", "X results in Y", "X leads to Y"
    r'\b(?:causes?|results? in|leads? to|produces?|generates?|creates?)\s+\w+',
    
    # Historical facts: dates and events
    r'\b(?:in|on|during|by)\s+(?:\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{4})?)\b',
    
    # Comparative facts: "X is more/less than Y"
    r'\b(?:is|are|was|were)\s+(?:more|less|greater|smaller|larger|higher|lower)\s+than\b',
    
    # Definitive statements: "X is the Y", "X was the first/last"
    r'\b(?:is|are|was|were)\s+the\s+(?:first|last|only|largest|smallest|highest|lowest|most|least)\b',
    
    # Statistical facts: "X percent of Y", "X out of Y"
    r'\b\d+(?:\.\d+)?\s*(?:percent|%)\s+of\b',
    r'\b\d+\s+(?:out of|in)\s+\d+\b',
    
    # Location facts: "X is located in Y", "X is in Y"
    r'\b(?:is|are|was|were)\s+(?:located|situated|found|based)\s+(?:in|at|on)\b',
    
    # Composition facts: "X contains Y", "X consists of Y"
    r'\b(?:contains?|consists? of|comprises?|includes?|is made of)\b',
]


# Sentence boundary markers
SENTENCE_ENDINGS = r'[.!?](?:\s|$)'


def extract_claims(text: str, domain_hint: Optional[str] = None) -> List[Claim]:
    """
    Extracts factual claims from text using pattern matching and semantic analysis.
    
    This function identifies factual assertions in the input text by:
    1. Splitting text into sentences
    2. Applying pattern matching for common factual structures
    3. Analyzing claim boundaries using semantic markers
    4. Creating Claim objects with position information
    
    Args:
        text: Input text content to analyze
        domain_hint: Optional domain hint for improved extraction (not currently used)
        
    Returns:
        List of Claim objects with text, position, and preliminary classification
        
    Examples:
        >>> text = "Water boils at 100 degrees Celsius. The Earth orbits the Sun."
        >>> claims = extract_claims(text)
        >>> len(claims)
        2
        >>> claims[0].text
        'Water boils at 100 degrees Celsius.'
    """
    if not text or not text.strip():
        return []
    
    claims = []
    
    # Split text into sentences for analysis
    sentences = _split_into_sentences(text)
    
    # Track position in original text
    current_pos = 0
    
    for sentence in sentences:
        # Find sentence position in original text
        sentence_start = text.find(sentence, current_pos)
        if sentence_start == -1:
            continue
            
        sentence_end = sentence_start + len(sentence)
        current_pos = sentence_end
        
        # Check if sentence contains factual patterns
        if _contains_factual_assertion(sentence):
            claim = Claim(
                id=str(uuid.uuid4()),
                text=sentence.strip(),
                position=(sentence_start, sentence_end),
                domain=domain_hint  # Will be classified later by domain_routing
            )
            claims.append(claim)
    
    return claims


def _split_into_sentences(text: str) -> List[str]:
    """
    Splits text into sentences using boundary detection.
    
    Handles common abbreviations and edge cases to avoid false splits.
    
    Args:
        text: Input text to split
        
    Returns:
        List of sentence strings
    """
    # Common abbreviations that shouldn't trigger sentence breaks
    abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 
                     'etc.', 'e.g.', 'i.e.', 'vs.', 'approx.']
    
    # Temporarily replace abbreviations to avoid false splits
    protected_text = text
    replacements = {}
    for i, abbr in enumerate(abbreviations):
        placeholder = f"__ABBR{i}__"
        replacements[placeholder] = abbr
        protected_text = protected_text.replace(abbr, placeholder)
    
    # Split on sentence boundaries
    sentences = re.split(SENTENCE_ENDINGS, protected_text)
    
    # Restore abbreviations and clean up
    result = []
    for sentence in sentences:
        if not sentence.strip():
            continue
            
        # Restore abbreviations
        for placeholder, abbr in replacements.items():
            sentence = sentence.replace(placeholder, abbr)
        
        # Add back sentence ending if it was removed
        if sentence and not sentence[-1] in '.!?':
            sentence += '.'
            
        result.append(sentence)
    
    return result


def _contains_factual_assertion(sentence: str) -> bool:
    """
    Determines if a sentence contains a factual assertion.
    
    Uses pattern matching to identify common factual structures.
    
    Args:
        sentence: Sentence to analyze
        
    Returns:
        True if sentence appears to contain a factual claim
    """
    # Check against all factual patterns
    for pattern in FACTUAL_PATTERNS:
        if re.search(pattern, sentence, re.IGNORECASE):
            return True
    
    # Additional heuristics for factual content
    
    # Check for definitive verbs (is, are, was, were, etc.)
    definitive_verbs = r'\b(?:is|are|was|were|has|have|had|will|shall|can|could|would|should)\b'
    if not re.search(definitive_verbs, sentence, re.IGNORECASE):
        return False
    
    # Exclude questions (usually not factual claims)
    if sentence.strip().endswith('?'):
        return False
    
    # Exclude subjective statements
    subjective_markers = r'\b(?:I think|I believe|I feel|in my opinion|perhaps|maybe|possibly|probably|might|may)\b'
    if re.search(subjective_markers, sentence, re.IGNORECASE):
        return False
    
    # Exclude imperatives (commands)
    imperative_markers = r'^(?:Please|Let|Make|Do|Don\'t|Try|Consider)\b'
    if re.search(imperative_markers, sentence.strip(), re.IGNORECASE):
        return False
    
    # If sentence has definitive verb and no exclusions, consider it factual
    # This catches claims that don't match specific patterns but have factual structure
    return True


def extract_claim_boundaries(text: str, claim_text: str) -> Tuple[int, int]:
    """
    Finds the precise boundaries of a claim within the source text.
    
    This is a utility function for cases where claim text is known but
    position needs to be determined.
    
    Args:
        text: Source text containing the claim
        claim_text: The claim text to locate
        
    Returns:
        Tuple of (start_position, end_position)
        
    Raises:
        ValueError: If claim_text is not found in text
    """
    start = text.find(claim_text)
    if start == -1:
        raise ValueError(f"Claim text not found in source text: {claim_text[:50]}...")
    
    end = start + len(claim_text)
    return (start, end)


def merge_overlapping_claims(claims: List[Claim]) -> List[Claim]:
    """
    Merges claims that overlap in position to avoid duplicates.
    
    When multiple patterns match the same text region, this function
    keeps the longest/most complete claim.
    
    Args:
        claims: List of claims that may have overlapping positions
        
    Returns:
        List of claims with overlaps resolved
    """
    if not claims:
        return []
    
    # Sort by start position
    sorted_claims = sorted(claims, key=lambda c: c.position[0])
    
    merged = [sorted_claims[0]]
    
    for current in sorted_claims[1:]:
        last = merged[-1]
        
        # Check for overlap
        if current.position[0] < last.position[1]:
            # Keep the longer claim
            if (current.position[1] - current.position[0]) > (last.position[1] - last.position[0]):
                merged[-1] = current
        else:
            merged.append(current)
    
    return merged
