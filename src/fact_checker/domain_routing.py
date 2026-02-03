"""
Domain Routing API

This module provides functionality to classify claims into domain categories
using keyword matching and semantic similarity.

Requirements: 1.2, 6.2, 10.5
"""

import re
from typing import Dict, List, Optional, Set
from .models import Claim, DomainType, Configuration


# Domain-specific keyword dictionaries
DOMAIN_KEYWORDS = {
    DomainType.PHYSICS: {
        'primary': [
            'energy', 'force', 'mass', 'velocity', 'acceleration', 'momentum',
            'gravity', 'electromagnetic', 'quantum', 'particle', 'wave',
            'thermodynamics', 'entropy', 'relativity', 'nuclear', 'atom',
            'electron', 'proton', 'neutron', 'photon', 'radiation',
            'mechanics', 'dynamics', 'kinematics', 'optics', 'magnetism',
            'electricity', 'circuit', 'voltage', 'current', 'resistance',
            'temperature', 'heat', 'pressure', 'density', 'friction'
        ],
        'secondary': [
            'newton', 'einstein', 'joule', 'watt', 'volt', 'ampere',
            'kelvin', 'celsius', 'fahrenheit', 'meter', 'kilogram',
            'second', 'hertz', 'pascal', 'tesla'
        ]
    },
    DomainType.BIOLOGY: {
        'primary': [
            'cell', 'organism', 'species', 'evolution', 'gene', 'dna', 'rna',
            'protein', 'enzyme', 'chromosome', 'mutation', 'natural selection',
            'ecosystem', 'biodiversity', 'photosynthesis', 'respiration',
            'metabolism', 'reproduction', 'heredity', 'genetics', 'anatomy',
            'physiology', 'bacteria', 'virus', 'fungi', 'plant', 'animal',
            'tissue', 'organ', 'system', 'immune', 'nervous', 'circulatory',
            'digestive', 'respiratory', 'skeletal', 'muscular'
        ],
        'secondary': [
            'darwin', 'mendel', 'linnaeus', 'mitochondria', 'chloroplast',
            'nucleus', 'membrane', 'cytoplasm', 'ribosome', 'golgi'
        ]
    },
    DomainType.HISTORY: {
        'primary': [
            'war', 'battle', 'empire', 'kingdom', 'dynasty', 'revolution',
            'treaty', 'independence', 'colonization', 'civilization',
            'ancient', 'medieval', 'renaissance', 'industrial revolution',
            'world war', 'cold war', 'president', 'king', 'queen', 'emperor',
            'pharaoh', 'century', 'era', 'period', 'age', 'conquest',
            'invasion', 'rebellion', 'reform', 'constitution'
        ],
        'secondary': [
            'napoleon', 'caesar', 'alexander', 'cleopatra', 'churchill',
            'roosevelt', 'lincoln', 'washington', 'gandhi', 'mandela',
            'rome', 'greece', 'egypt', 'china', 'persia', 'ottoman'
        ]
    },
    DomainType.STATISTICS: {
        'primary': [
            'percent', 'percentage', 'average', 'mean', 'median', 'mode',
            'standard deviation', 'variance', 'correlation', 'probability',
            'distribution', 'sample', 'population', 'survey', 'study',
            'data', 'statistics', 'statistical', 'analysis', 'trend',
            'rate', 'ratio', 'proportion', 'frequency', 'regression',
            'hypothesis', 'significance', 'confidence interval', 'p-value'
        ],
        'secondary': [
            'gaussian', 'normal distribution', 'bell curve', 'chi-square',
            'anova', 't-test', 'z-score', 'quartile', 'percentile'
        ]
    }
}


# Weighted scoring for keyword matches
PRIMARY_KEYWORD_WEIGHT = 2.0
SECONDARY_KEYWORD_WEIGHT = 1.0
DOMAIN_THRESHOLD = 1.0  # Minimum score to assign a domain


def classify_domain(claim: Claim, config: Optional[Configuration] = None) -> str:
    """
    Classifies a claim into a domain category using keyword matching.
    
    The classification process:
    1. Tokenizes the claim text
    2. Matches tokens against domain keyword dictionaries
    3. Calculates weighted scores for each domain
    4. Assigns the domain with the highest score above threshold
    5. Falls back to GENERAL if no domain scores above threshold
    
    Args:
        claim: Claim object to classify
        config: Optional configuration with custom domain definitions
        
    Returns:
        Domain string: "physics", "biology", "history", "statistics", or "general"
        
    Examples:
        >>> claim = Claim(id="1", text="Water boils at 100 degrees Celsius.", position=(0, 35))
        >>> classify_domain(claim)
        'physics'
        
        >>> claim = Claim(id="2", text="The cell is the basic unit of life.", position=(0, 36))
        >>> classify_domain(claim)
        'biology'
    """
    if not claim.text:
        return DomainType.GENERAL.value
    
    # Get custom domains from config if provided
    custom_domains = _get_custom_domains(config) if config else {}
    
    # Calculate scores for each domain
    scores = {}
    
    # Score standard domains
    for domain_type in DomainType:
        if domain_type == DomainType.GENERAL:
            continue
        scores[domain_type.value] = _calculate_domain_score(
            claim.text, 
            domain_type,
            custom_domains.get(domain_type.value, {})
        )
    
    # Find domain with highest score
    if not scores:
        return DomainType.GENERAL.value
    
    max_domain = max(scores.items(), key=lambda x: x[1])
    
    # Return domain if score exceeds threshold, otherwise GENERAL
    if max_domain[1] >= DOMAIN_THRESHOLD:
        return max_domain[0]
    
    return DomainType.GENERAL.value


def classify_domains_batch(claims: List[Claim], config: Optional[Configuration] = None) -> List[str]:
    """
    Classifies multiple claims efficiently.
    
    Args:
        claims: List of claims to classify
        config: Optional configuration with custom domain definitions
        
    Returns:
        List of domain strings in same order as input claims
    """
    return [classify_domain(claim, config) for claim in claims]


def _calculate_domain_score(text: str, domain_type: DomainType, custom_keywords: Dict[str, List[str]]) -> float:
    """
    Calculates a weighted score for how well text matches a domain.
    
    Args:
        text: Text to analyze
        domain_type: Domain to score against
        custom_keywords: Custom keywords from configuration
        
    Returns:
        Weighted score based on keyword matches
    """
    text_lower = text.lower()
    score = 0.0
    
    # Get standard keywords for this domain
    domain_keywords = DOMAIN_KEYWORDS.get(domain_type, {})
    
    # Score primary keywords
    primary_keywords = domain_keywords.get('primary', [])
    primary_keywords.extend(custom_keywords.get('primary', []))
    
    for keyword in primary_keywords:
        if _keyword_match(keyword, text_lower):
            score += PRIMARY_KEYWORD_WEIGHT
    
    # Score secondary keywords
    secondary_keywords = domain_keywords.get('secondary', [])
    secondary_keywords.extend(custom_keywords.get('secondary', []))
    
    for keyword in secondary_keywords:
        if _keyword_match(keyword, text_lower):
            score += SECONDARY_KEYWORD_WEIGHT
    
    return score


def _keyword_match(keyword: str, text: str) -> bool:
    """
    Checks if a keyword matches in text using word boundary matching.
    
    Args:
        keyword: Keyword to search for
        text: Text to search in (should be lowercase)
        
    Returns:
        True if keyword found as whole word or phrase
    """
    # Handle multi-word keywords
    if ' ' in keyword:
        return keyword in text
    
    # Use word boundaries for single words
    pattern = r'\b' + re.escape(keyword) + r'\b'
    return bool(re.search(pattern, text))


def _get_custom_domains(config: Configuration) -> Dict[str, Dict[str, List[str]]]:
    """
    Extracts custom domain keyword definitions from configuration.
    
    Args:
        config: Configuration object
        
    Returns:
        Dictionary mapping domain names to keyword dictionaries
    """
    # This would parse config.custom_domains if it contains structured data
    # For now, return empty dict as custom_domains is just a list of strings
    return {}


def get_domain_confidence(claim: Claim, assigned_domain: str, config: Optional[Configuration] = None) -> float:
    """
    Calculates confidence in domain classification.
    
    Returns a score from 0-100 indicating how confident the classification is.
    
    Args:
        claim: The classified claim
        assigned_domain: The domain that was assigned
        config: Optional configuration
        
    Returns:
        Confidence score (0-100)
    """
    if assigned_domain == DomainType.GENERAL.value:
        # Low confidence for general domain (fallback)
        return 30.0
    
    # Calculate score for assigned domain
    domain_type = DomainType(assigned_domain)
    score = _calculate_domain_score(claim.text, domain_type, {})
    
    # Calculate scores for all other domains
    other_scores = []
    for dt in DomainType:
        if dt == DomainType.GENERAL or dt.value == assigned_domain:
            continue
        other_scores.append(_calculate_domain_score(claim.text, dt, {}))
    
    # Confidence is based on how much the assigned domain score exceeds others
    if not other_scores:
        return 50.0
    
    max_other = max(other_scores) if other_scores else 0
    
    if max_other == 0:
        confidence = min(100.0, 50.0 + score * 10)
    else:
        # Ratio of assigned score to max other score
        ratio = score / max_other if max_other > 0 else 1.0
        confidence = min(100.0, 50.0 * ratio)
    
    return confidence


def get_supported_domains() -> List[str]:
    """
    Returns list of all supported domain classifications.
    
    Returns:
        List of domain name strings
    """
    return [domain.value for domain in DomainType]


def validate_domain(domain: str) -> bool:
    """
    Validates that a domain string is supported.
    
    Args:
        domain: Domain string to validate
        
    Returns:
        True if domain is valid
    """
    try:
        DomainType(domain)
        return True
    except ValueError:
        return False
