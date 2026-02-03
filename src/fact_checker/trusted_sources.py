"""
Trusted Sources API

This module provides functionality to manage and query trusted sources
for fact-checking, including whitelist/blacklist filtering and credibility scoring.

Requirements: 6.3, 10.6
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass
from .models import SourceType, Configuration


@dataclass
class Source:
    """
    Represents a trusted source for fact-checking.
    
    Attributes:
        name: Display name of the source
        url: Base URL of the source
        source_type: Type of source (academic, news, government, encyclopedia)
        credibility_score: Base credibility score (0-100)
        domains: List of domains this source is authoritative for
        access_method: How to access this source (api, web_scrape, manual)
    """
    name: str
    url: str
    source_type: str
    credibility_score: float
    domains: List[str]
    access_method: str = "web_scrape"


# Curated database of trusted sources by domain
TRUSTED_SOURCES_DATABASE = {
    "physics": [
        Source(
            name="American Physical Society",
            url="https://www.aps.org",
            source_type=SourceType.ACADEMIC.value,
            credibility_score=95.0,
            domains=["physics"],
            access_method="web_scrape"
        ),
        Source(
            name="Physical Review Letters",
            url="https://journals.aps.org/prl",
            source_type=SourceType.ACADEMIC.value,
            credibility_score=98.0,
            domains=["physics"],
            access_method="api"
        ),
        Source(
            name="CERN",
            url="https://home.cern",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=97.0,
            domains=["physics"],
            access_method="web_scrape"
        ),
        Source(
            name="NASA Physics",
            url="https://www.nasa.gov",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=96.0,
            domains=["physics"],
            access_method="api"
        ),
    ],
    "biology": [
        Source(
            name="Nature",
            url="https://www.nature.com",
            source_type=SourceType.ACADEMIC.value,
            credibility_score=98.0,
            domains=["biology", "physics", "general"],
            access_method="api"
        ),
        Source(
            name="PubMed",
            url="https://pubmed.ncbi.nlm.nih.gov",
            source_type=SourceType.ACADEMIC.value,
            credibility_score=97.0,
            domains=["biology"],
            access_method="api"
        ),
        Source(
            name="CDC",
            url="https://www.cdc.gov",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=95.0,
            domains=["biology"],
            access_method="web_scrape"
        ),
        Source(
            name="WHO",
            url="https://www.who.int",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=94.0,
            domains=["biology"],
            access_method="web_scrape"
        ),
    ],
    "history": [
        Source(
            name="Smithsonian Institution",
            url="https://www.si.edu",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=96.0,
            domains=["history"],
            access_method="web_scrape"
        ),
        Source(
            name="Library of Congress",
            url="https://www.loc.gov",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=97.0,
            domains=["history"],
            access_method="web_scrape"
        ),
        Source(
            name="National Archives",
            url="https://www.archives.gov",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=98.0,
            domains=["history"],
            access_method="web_scrape"
        ),
        Source(
            name="Britannica",
            url="https://www.britannica.com",
            source_type=SourceType.ENCYCLOPEDIA.value,
            credibility_score=92.0,
            domains=["history", "general"],
            access_method="api"
        ),
    ],
    "statistics": [
        Source(
            name="US Census Bureau",
            url="https://www.census.gov",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=97.0,
            domains=["statistics"],
            access_method="api"
        ),
        Source(
            name="World Bank Data",
            url="https://data.worldbank.org",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=96.0,
            domains=["statistics"],
            access_method="api"
        ),
        Source(
            name="Pew Research Center",
            url="https://www.pewresearch.org",
            source_type=SourceType.ACADEMIC.value,
            credibility_score=93.0,
            domains=["statistics"],
            access_method="web_scrape"
        ),
        Source(
            name="OECD Data",
            url="https://data.oecd.org",
            source_type=SourceType.GOVERNMENT.value,
            credibility_score=95.0,
            domains=["statistics"],
            access_method="api"
        ),
    ],
    "general": [
        Source(
            name="Wikipedia",
            url="https://www.wikipedia.org",
            source_type=SourceType.ENCYCLOPEDIA.value,
            credibility_score=75.0,
            domains=["general"],
            access_method="api"
        ),
        Source(
            name="Snopes",
            url="https://www.snopes.com",
            source_type=SourceType.NEWS.value,
            credibility_score=85.0,
            domains=["general"],
            access_method="web_scrape"
        ),
        Source(
            name="FactCheck.org",
            url="https://www.factcheck.org",
            source_type=SourceType.NEWS.value,
            credibility_score=88.0,
            domains=["general"],
            access_method="web_scrape"
        ),
    ]
}


def get_trusted_sources(domain: str, config: Optional[Configuration] = None) -> List[Source]:
    """
    Returns curated list of trusted sources for a given domain.
    
    Sources are filtered based on:
    1. Domain relevance
    2. Configuration whitelist/blacklist
    3. Credibility score thresholds
    
    Args:
        domain: Domain category (physics, biology, history, statistics, general)
        config: Optional configuration with custom source lists
        
    Returns:
        List of Source objects appropriate for the domain
        
    Examples:
        >>> sources = get_trusted_sources("physics")
        >>> len(sources) > 0
        True
        >>> all(s.credibility_score >= 90 for s in sources if s.source_type == "academic")
        True
    """
    # Get base sources for domain
    sources = TRUSTED_SOURCES_DATABASE.get(domain, []).copy()
    
    # Add general sources as fallback
    if domain != "general":
        sources.extend(TRUSTED_SOURCES_DATABASE.get("general", []))
    
    # Apply configuration filters if provided
    if config:
        sources = _apply_source_filters(sources, config)
    
    # Sort by credibility score (highest first)
    sources.sort(key=lambda s: s.credibility_score, reverse=True)
    
    return sources


def get_all_trusted_sources(config: Optional[Configuration] = None) -> List[Source]:
    """
    Returns all trusted sources across all domains.
    
    Args:
        config: Optional configuration with custom source lists
        
    Returns:
        List of all Source objects
    """
    all_sources = []
    seen_urls = set()
    
    for domain_sources in TRUSTED_SOURCES_DATABASE.values():
        for source in domain_sources:
            if source.url not in seen_urls:
                all_sources.append(source)
                seen_urls.add(source.url)
    
    # Apply configuration filters if provided
    if config:
        all_sources = _apply_source_filters(all_sources, config)
    
    return all_sources


def get_source_by_url(url: str, config: Optional[Configuration] = None) -> Optional[Source]:
    """
    Retrieves a source by its URL.
    
    Args:
        url: URL to search for
        config: Optional configuration
        
    Returns:
        Source object if found, None otherwise
    """
    all_sources = get_all_trusted_sources(config)
    
    for source in all_sources:
        if source.url == url or url.startswith(source.url):
            return source
    
    return None


def is_source_trusted(url: str, domain: Optional[str] = None, config: Optional[Configuration] = None) -> bool:
    """
    Checks if a URL is from a trusted source.
    
    Args:
        url: URL to check
        domain: Optional domain to check against
        config: Optional configuration
        
    Returns:
        True if URL is from a trusted source
    """
    if domain:
        sources = get_trusted_sources(domain, config)
    else:
        sources = get_all_trusted_sources(config)
    
    for source in sources:
        if url.startswith(source.url):
            return True
    
    return False


def get_source_credibility(url: str, config: Optional[Configuration] = None) -> float:
    """
    Gets the credibility score for a source URL.
    
    Args:
        url: URL to score
        config: Optional configuration
        
    Returns:
        Credibility score (0-100), or 0 if source not found
    """
    source = get_source_by_url(url, config)
    return source.credibility_score if source else 0.0


def _apply_source_filters(sources: List[Source], config: Configuration) -> List[Source]:
    """
    Applies whitelist/blacklist filters from configuration.
    
    Args:
        sources: List of sources to filter
        config: Configuration with trusted_sources settings
        
    Returns:
        Filtered list of sources
    """
    if not config.trusted_sources:
        return sources
    
    whitelist = set(config.trusted_sources.get("whitelist", []))
    blacklist = set(config.trusted_sources.get("blacklist", []))
    
    filtered = []
    
    for source in sources:
        # If whitelist exists, only include whitelisted sources
        if whitelist and source.url not in whitelist:
            continue
        
        # Exclude blacklisted sources
        if source.url in blacklist:
            continue
        
        filtered.append(source)
    
    return filtered


def add_custom_source(
    domain: str,
    name: str,
    url: str,
    source_type: str,
    credibility_score: float,
    access_method: str = "web_scrape"
) -> Source:
    """
    Adds a custom source to the database (runtime only, not persisted).
    
    Args:
        domain: Domain to add source to
        name: Display name
        url: Base URL
        source_type: Type of source
        credibility_score: Credibility score (0-100)
        access_method: How to access the source
        
    Returns:
        Created Source object
        
    Raises:
        ValueError: If parameters are invalid
    """
    if not 0 <= credibility_score <= 100:
        raise ValueError("Credibility score must be between 0 and 100")
    
    if source_type not in [st.value for st in SourceType]:
        raise ValueError(f"Invalid source type: {source_type}")
    
    source = Source(
        name=name,
        url=url,
        source_type=source_type,
        credibility_score=credibility_score,
        domains=[domain],
        access_method=access_method
    )
    
    # Add to database
    if domain not in TRUSTED_SOURCES_DATABASE:
        TRUSTED_SOURCES_DATABASE[domain] = []
    
    TRUSTED_SOURCES_DATABASE[domain].append(source)
    
    return source


def get_sources_by_type(source_type: str, config: Optional[Configuration] = None) -> List[Source]:
    """
    Gets all sources of a specific type.
    
    Args:
        source_type: Type to filter by (academic, news, government, encyclopedia)
        config: Optional configuration
        
    Returns:
        List of sources matching the type
    """
    all_sources = get_all_trusted_sources(config)
    return [s for s in all_sources if s.source_type == source_type]


def get_source_statistics() -> Dict[str, int]:
    """
    Returns statistics about the trusted sources database.
    
    Returns:
        Dictionary with counts by domain and type
    """
    stats = {
        "total_sources": 0,
        "by_domain": {},
        "by_type": {}
    }
    
    all_sources = get_all_trusted_sources()
    stats["total_sources"] = len(all_sources)
    
    for source in all_sources:
        # Count by type
        stats["by_type"][source.source_type] = stats["by_type"].get(source.source_type, 0) + 1
        
        # Count by domain
        for domain in source.domains:
            stats["by_domain"][domain] = stats["by_domain"].get(domain, 0) + 1
    
    return stats
