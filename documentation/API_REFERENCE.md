# Fact-Checking System API Reference

## Table of Contents

1. [Overview](#overview)
2. [Core Data Models](#core-data-models)
3. [Fact Extraction API](#fact-extraction-api)
4. [Domain Routing API](#domain-routing-api)
5. [Trusted Sources API](#trusted-sources-api)
6. [Evidence Retrieval API](#evidence-retrieval-api)
7. [Fact Checking API](#fact-checking-api)
8. [Report Generation API](#report-generation-api)
9. [Complete Workflow Example](#complete-workflow-example)
10. [Error Handling](#error-handling)

---

## Overview

The Fact-Checking System provides a modular API for automated content verification. The system consists of six core APIs that work together to extract claims, classify them by domain, retrieve evidence, verify accuracy, and generate comprehensive reports.

### Architecture

```
Input Text → Fact Extraction → Domain Routing → Evidence Retrieval → Fact Checking → Report Generation → Output
```

### Key Features

- **Modular Design**: Each API can be used independently or as part of the complete pipeline
- **Type Safety**: Full type hints for all functions and data models
- **Extensibility**: Support for custom domains, sources, and configurations
- **Multiple Output Formats**: JSON, Markdown, and PDF report generation

---

## Core Data Models

All APIs use strongly-typed data models defined in `src/fact_checker/models.py`.

### Claim

Represents a factual assertion extracted from content.

```python
@dataclass
class Claim:
    id: str                          # Unique identifier
    text: str                        # The claim text
    position: Tuple[int, int]        # (start, end) character positions
    domain: Optional[str] = None     # Domain classification
    confidence: Optional[float] = None  # Confidence score (0-100)
    risk_level: Optional[str] = None    # Risk level
    evidence: List[Evidence] = []    # Supporting/contradicting evidence
    recommendation: Optional[str] = None  # Actionable recommendation
```

### Evidence

Represents evidence for or against a claim.

```python
@dataclass
class Evidence:
    source: str                      # Source name/identifier
    source_type: str                 # "academic", "news", "government", "encyclopedia"
    credibility_score: float         # Credibility rating (0-100)
    relevance: float                 # Relevance to claim (0-100)
    excerpt: str                     # Relevant excerpt from source
    url: Optional[str] = None        # Source URL
    publication_date: Optional[datetime] = None  # Publication date
```

### VerificationResult

Result of verifying a single claim.

```python
@dataclass
class VerificationResult:
    claim: Claim                     # The verified claim
    confidence: float                # Confidence score (0-100)
    risk_level: str                  # "low", "medium", "high", "critical"
    supporting_evidence: List[Evidence]     # Supporting evidence
    contradicting_evidence: List[Evidence]  # Contradicting evidence
    reasoning: str                   # Explanation of decision
    recommendation: str              # Actionable recommendation
```

### Report

Complete verification report with metadata and summaries.

```python
@dataclass
class Report:
    metadata: Dict[str, Any]         # Timestamp, version, input hash, etc.
    claims: List[VerificationResult] # All verification results
    manipulation_signals: List[ManipulationSignal]  # Video analysis signals
    summary_statistics: Dict[str, Any]  # Summary stats
    human_summary: str               # Human-readable summary
    recommendations: List[str]       # Actionable recommendations
    disclaimer: str                  # Standard disclaimer
```

### Configuration

System configuration settings.

```python
@dataclass
class Configuration:
    confidence_threshold: float = 70.0  # Minimum confidence for acceptance
    risk_level_mappings: Dict[str, Tuple[float, float]]  # Risk thresholds
    trusted_sources: Dict[str, List[str]]  # Trusted sources by domain
    custom_domains: List[str] = []  # Custom domain definitions
    cache_enabled: bool = True      # Enable caching
    cache_ttl_seconds: int = 86400  # Cache TTL (24 hours)
    max_concurrent_verifications: int = 5  # Parallel processing limit
    timeout_seconds: int = 60       # Operation timeout
```

---

## Fact Extraction API

**Module**: `src/fact_checker/fact_extraction.py`

Extracts factual claims from text using pattern matching and semantic analysis.

### extract_claims()

Extracts all factual claims from input text.

**Signature:**
```python
def extract_claims(
    text: str,
    domain_hint: Optional[str] = None
) -> List[Claim]
```

**Parameters:**
- `text` (str): Input text content to analyze
- `domain_hint` (Optional[str]): Optional domain hint for improved extraction

**Returns:**
- `List[Claim]`: List of extracted claims with text and position information

**Example:**
```python
from src.fact_checker.fact_extraction import extract_claims

text = """
Water boils at 100 degrees Celsius at sea level.
The Earth orbits the Sun once every 365.25 days.
Photosynthesis converts light energy into chemical energy.
"""

claims = extract_claims(text)

for claim in claims:
    print(f"Claim: {claim.text}")
    print(f"Position: {claim.position}")
    print()

# Output:
# Claim: Water boils at 100 degrees Celsius at sea level.
# Position: (1, 51)
#
# Claim: The Earth orbits the Sun once every 365.25 days.
# Position: (52, 99)
#
# Claim: Photosynthesis converts light energy into chemical energy.
# Position: (100, 157)
```

**How It Works:**
1. Splits text into sentences using boundary detection
2. Applies pattern matching for factual structures (numerical facts, scientific statements, historical dates, etc.)
3. Filters out questions, subjective statements, and imperatives
4. Creates Claim objects with unique IDs and position tracking

**Supported Claim Patterns:**
- Numerical facts: "X is Y units", "X measures Y"
- Scientific facts: "X causes Y", "X results in Y"
- Historical facts: dates and events
- Comparative facts: "X is more/less than Y"
- Statistical facts: "X percent of Y"
- Location facts: "X is located in Y"
- Composition facts: "X contains Y"

### extract_claim_boundaries()

Finds precise boundaries of a claim within source text.

**Signature:**
```python
def extract_claim_boundaries(
    text: str,
    claim_text: str
) -> Tuple[int, int]
```

**Parameters:**
- `text` (str): Source text containing the claim
- `claim_text` (str): The claim text to locate

**Returns:**
- `Tuple[int, int]`: (start_position, end_position)

**Raises:**
- `ValueError`: If claim_text is not found in text

**Example:**
```python
text = "Water boils at 100 degrees. Ice melts at 0 degrees."
claim_text = "Ice melts at 0 degrees."

start, end = extract_claim_boundaries(text, claim_text)
print(f"Claim found at positions {start}-{end}")
# Output: Claim found at positions 28-50
```

### merge_overlapping_claims()

Merges claims that overlap in position to avoid duplicates.

**Signature:**
```python
def merge_overlapping_claims(claims: List[Claim]) -> List[Claim]
```

**Parameters:**
- `claims` (List[Claim]): List of claims that may have overlapping positions

**Returns:**
- `List[Claim]`: List of claims with overlaps resolved (keeps longest claim)

**Example:**
```python
# When multiple patterns match the same text region
claims = extract_claims(text)
merged = merge_overlapping_claims(claims)
print(f"Reduced from {len(claims)} to {len(merged)} claims")
```

---

## Domain Routing API

**Module**: `src/fact_checker/domain_routing.py`

Classifies claims into domain categories using keyword matching and semantic similarity.

### classify_domain()

Classifies a claim into a domain category.

**Signature:**
```python
def classify_domain(
    claim: Claim,
    config: Optional[Configuration] = None
) -> str
```

**Parameters:**
- `claim` (Claim): Claim object to classify
- `config` (Optional[Configuration]): Optional configuration with custom domains

**Returns:**
- `str`: Domain string - "physics", "biology", "history", "statistics", or "general"

**Example:**
```python
from src.fact_checker.fact_extraction import extract_claims
from src.fact_checker.domain_routing import classify_domain

text = "Water boils at 100 degrees Celsius."
claims = extract_claims(text)
claim = claims[0]

domain = classify_domain(claim)
print(f"Domain: {domain}")
# Output: Domain: physics

# Update claim with domain
claim.domain = domain
```

**How It Works:**
1. Tokenizes the claim text
2. Matches tokens against domain keyword dictionaries
3. Calculates weighted scores (primary keywords: 2.0, secondary keywords: 1.0)
4. Assigns domain with highest score above threshold (1.0)
5. Falls back to "general" if no domain scores above threshold

**Supported Domains:**
- **physics**: energy, force, mass, velocity, temperature, etc.
- **biology**: cell, organism, DNA, evolution, photosynthesis, etc.
- **history**: war, empire, revolution, ancient, medieval, etc.
- **statistics**: percent, average, correlation, probability, etc.
- **general**: fallback for claims that don't fit specific domains

### classify_domains_batch()

Classifies multiple claims efficiently.

**Signature:**
```python
def classify_domains_batch(
    claims: List[Claim],
    config: Optional[Configuration] = None
) -> List[str]
```

**Parameters:**
- `claims` (List[Claim]): List of claims to classify
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `List[str]`: List of domain strings in same order as input claims

**Example:**
```python
claims = extract_claims(long_text)
domains = classify_domains_batch(claims)

for claim, domain in zip(claims, domains):
    claim.domain = domain
    print(f"{domain}: {claim.text[:50]}...")
```

### get_domain_confidence()

Calculates confidence in domain classification.

**Signature:**
```python
def get_domain_confidence(
    claim: Claim,
    assigned_domain: str,
    config: Optional[Configuration] = None
) -> float
```

**Parameters:**
- `claim` (Claim): The classified claim
- `assigned_domain` (str): The domain that was assigned
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `float`: Confidence score (0-100)

**Example:**
```python
domain = classify_domain(claim)
confidence = get_domain_confidence(claim, domain)
print(f"Domain: {domain} (confidence: {confidence:.1f}%)")
# Output: Domain: physics (confidence: 85.3%)
```

### get_supported_domains()

Returns list of all supported domain classifications.

**Signature:**
```python
def get_supported_domains() -> List[str]
```

**Returns:**
- `List[str]`: ["physics", "biology", "history", "statistics", "general"]

**Example:**
```python
domains = get_supported_domains()
print(f"Supported domains: {', '.join(domains)}")
```

### validate_domain()

Validates that a domain string is supported.

**Signature:**
```python
def validate_domain(domain: str) -> bool
```

**Parameters:**
- `domain` (str): Domain string to validate

**Returns:**
- `bool`: True if domain is valid

**Example:**
```python
if validate_domain("physics"):
    print("Valid domain")
else:
    print("Invalid domain")
```

---

## Trusted Sources API

**Module**: `src/fact_checker/trusted_sources.py`

Manages and queries trusted sources for fact-checking with credibility scoring.

### Source Data Class

Represents a trusted source.

```python
@dataclass
class Source:
    name: str                    # Display name
    url: str                     # Base URL
    source_type: str             # "academic", "news", "government", "encyclopedia"
    credibility_score: float     # Base credibility (0-100)
    domains: List[str]           # Authoritative domains
    access_method: str = "web_scrape"  # "api", "web_scrape", "manual"
```

### get_trusted_sources()

Returns curated list of trusted sources for a domain.

**Signature:**
```python
def get_trusted_sources(
    domain: str,
    config: Optional[Configuration] = None
) -> List[Source]
```

**Parameters:**
- `domain` (str): Domain category (physics, biology, history, statistics, general)
- `config` (Optional[Configuration]): Optional configuration with whitelist/blacklist

**Returns:**
- `List[Source]`: List of Source objects appropriate for the domain, sorted by credibility

**Example:**
```python
from src.fact_checker.trusted_sources import get_trusted_sources

# Get physics sources
sources = get_trusted_sources("physics")

for source in sources:
    print(f"{source.name}: {source.credibility_score}% credibility")
    print(f"  Type: {source.source_type}")
    print(f"  URL: {source.url}")
    print()

# Output:
# Physical Review Letters: 98.0% credibility
#   Type: academic
#   URL: https://journals.aps.org/prl
#
# CERN: 97.0% credibility
#   Type: government
#   URL: https://home.cern
# ...
```

**Built-in Sources by Domain:**

**Physics:**
- American Physical Society (95% credibility)
- Physical Review Letters (98% credibility)
- CERN (97% credibility)
- NASA Physics (96% credibility)

**Biology:**
- Nature (98% credibility)
- PubMed (97% credibility)
- CDC (95% credibility)
- WHO (94% credibility)

**History:**
- Smithsonian Institution (96% credibility)
- Library of Congress (97% credibility)
- National Archives (98% credibility)
- Britannica (92% credibility)

**Statistics:**
- US Census Bureau (97% credibility)
- World Bank Data (96% credibility)
- Pew Research Center (93% credibility)
- OECD Data (95% credibility)

**General:**
- Wikipedia (75% credibility)
- Snopes (85% credibility)
- FactCheck.org (88% credibility)

### get_all_trusted_sources()

Returns all trusted sources across all domains.

**Signature:**
```python
def get_all_trusted_sources(
    config: Optional[Configuration] = None
) -> List[Source]
```

**Parameters:**
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `List[Source]`: List of all Source objects (deduplicated by URL)

**Example:**
```python
all_sources = get_all_trusted_sources()
print(f"Total sources: {len(all_sources)}")

# Group by type
by_type = {}
for source in all_sources:
    by_type.setdefault(source.source_type, []).append(source)

for source_type, sources in by_type.items():
    print(f"{source_type}: {len(sources)} sources")
```

### get_source_by_url()

Retrieves a source by its URL.

**Signature:**
```python
def get_source_by_url(
    url: str,
    config: Optional[Configuration] = None
) -> Optional[Source]
```

**Parameters:**
- `url` (str): URL to search for
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `Optional[Source]`: Source object if found, None otherwise

**Example:**
```python
source = get_source_by_url("https://www.nature.com")
if source:
    print(f"Found: {source.name} ({source.credibility_score}% credibility)")
else:
    print("Source not found")
```

### is_source_trusted()

Checks if a URL is from a trusted source.

**Signature:**
```python
def is_source_trusted(
    url: str,
    domain: Optional[str] = None,
    config: Optional[Configuration] = None
) -> bool
```

**Parameters:**
- `url` (str): URL to check
- `domain` (Optional[str]): Optional domain to check against
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `bool`: True if URL is from a trusted source

**Example:**
```python
if is_source_trusted("https://www.nature.com/articles/123"):
    print("Trusted source")
else:
    print("Untrusted source")
```

### get_source_credibility()

Gets the credibility score for a source URL.

**Signature:**
```python
def get_source_credibility(
    url: str,
    config: Optional[Configuration] = None
) -> float
```

**Parameters:**
- `url` (str): URL to score
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `float`: Credibility score (0-100), or 0 if source not found

**Example:**
```python
credibility = get_source_credibility("https://www.nature.com")
print(f"Credibility: {credibility}%")
# Output: Credibility: 98.0%
```

### add_custom_source()

Adds a custom source to the database (runtime only).

**Signature:**
```python
def add_custom_source(
    domain: str,
    name: str,
    url: str,
    source_type: str,
    credibility_score: float,
    access_method: str = "web_scrape"
) -> Source
```

**Parameters:**
- `domain` (str): Domain to add source to
- `name` (str): Display name
- `url` (str): Base URL
- `source_type` (str): Type of source
- `credibility_score` (float): Credibility score (0-100)
- `access_method` (str): How to access the source

**Returns:**
- `Source`: Created Source object

**Raises:**
- `ValueError`: If parameters are invalid

**Example:**
```python
custom_source = add_custom_source(
    domain="physics",
    name="My University Physics Dept",
    url="https://physics.myuniversity.edu",
    source_type="academic",
    credibility_score=85.0,
    access_method="web_scrape"
)

print(f"Added: {custom_source.name}")
```

### get_sources_by_type()

Gets all sources of a specific type.

**Signature:**
```python
def get_sources_by_type(
    source_type: str,
    config: Optional[Configuration] = None
) -> List[Source]
```

**Parameters:**
- `source_type` (str): Type to filter by (academic, news, government, encyclopedia)
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `List[Source]`: List of sources matching the type

**Example:**
```python
academic_sources = get_sources_by_type("academic")
print(f"Found {len(academic_sources)} academic sources")

for source in academic_sources:
    print(f"  - {source.name}")
```

### get_source_statistics()

Returns statistics about the trusted sources database.

**Signature:**
```python
def get_source_statistics() -> Dict[str, int]
```

**Returns:**
- `Dict[str, int]`: Dictionary with counts by domain and type

**Example:**
```python
stats = get_source_statistics()
print(f"Total sources: {stats['total_sources']}")
print("\nBy domain:")
for domain, count in stats['by_domain'].items():
    print(f"  {domain}: {count}")
print("\nBy type:")
for source_type, count in stats['by_type'].items():
    print(f"  {source_type}: {count}")
```

---

## Evidence Retrieval API

**Module**: `src/fact_checker/evidence_retrieval.py`

Retrieves supporting or contradicting evidence for claims from trusted sources.

### retrieve_evidence()

Retrieves evidence for a claim from trusted sources.

**Signature:**
```python
def retrieve_evidence(
    claim: Claim,
    sources: List[Source],
    max_results: int = 5
) -> List[Evidence]
```

**Parameters:**
- `claim` (Claim): Claim to find evidence for
- `sources` (List[Source]): List of sources to search
- `max_results` (int): Maximum number of evidence items to return (default: 5)

**Returns:**
- `List[Evidence]`: List of Evidence objects sorted by relevance

**Example:**
```python
from src.fact_checker.fact_extraction import extract_claims
from src.fact_checker.domain_routing import classify_domain
from src.fact_checker.trusted_sources import get_trusted_sources
from src.fact_checker.evidence_retrieval import retrieve_evidence

# Extract and classify claim
text = "Water boils at 100 degrees Celsius at sea level."
claims = extract_claims(text)
claim = claims[0]
claim.domain = classify_domain(claim)

# Get trusted sources for domain
sources = get_trusted_sources(claim.domain)

# Retrieve evidence
evidence = retrieve_evidence(claim, sources, max_results=3)

for ev in evidence:
    print(f"Source: {ev.source}")
    print(f"Credibility: {ev.credibility_score}%")
    print(f"Relevance: {ev.relevance}%")
    print(f"Excerpt: {ev.excerpt[:100]}...")
    print()
```

**Note:** Current implementation provides placeholder evidence for demonstration. In production, this would make actual API calls or web scraping to retrieve real evidence.

### retrieve_evidence_batch()

Retrieves evidence for multiple claims efficiently.

**Signature:**
```python
def retrieve_evidence_batch(
    claims: List[Claim],
    sources: List[Source],
    max_results_per_claim: int = 5
) -> List[List[Evidence]]
```

**Parameters:**
- `claims` (List[Claim]): List of claims to find evidence for
- `sources` (List[Source]): List of sources to search
- `max_results_per_claim` (int): Maximum evidence items per claim (default: 5)

**Returns:**
- `List[List[Evidence]]`: List of evidence lists, one per claim in same order

**Example:**
```python
claims = extract_claims(long_text)
sources = get_all_trusted_sources()

evidence_lists = retrieve_evidence_batch(claims, sources, max_results_per_claim=3)

for claim, evidence in zip(claims, evidence_lists):
    print(f"Claim: {claim.text[:50]}...")
    print(f"Evidence count: {len(evidence)}")
```

### calculate_relevance_score()

Calculates relevance score between claim and evidence text.

**Signature:**
```python
def calculate_relevance_score(
    claim_text: str,
    evidence_text: str
) -> float
```

**Parameters:**
- `claim_text` (str): The claim text
- `evidence_text` (str): The evidence excerpt text

**Returns:**
- `float`: Relevance score (0-100)

**Example:**
```python
claim = "Water boils at 100 degrees Celsius."
evidence = "According to physics, water reaches its boiling point at 100°C at standard pressure."

relevance = calculate_relevance_score(claim, evidence)
print(f"Relevance: {relevance:.1f}%")
# Output: Relevance: 85.0%
```

**How It Works:**
1. Extracts keywords from both texts
2. Calculates keyword overlap ratio
3. Adds bonus for exact phrase matches (3+ words)
4. Returns score from 0-100

### extract_relevant_excerpt()

Extracts the most relevant excerpt from full text for a claim.

**Signature:**
```python
def extract_relevant_excerpt(
    full_text: str,
    claim_text: str,
    max_length: int = 200
) -> str
```

**Parameters:**
- `full_text` (str): Full source text
- `claim_text` (str): Claim to find relevant excerpt for
- `max_length` (int): Maximum length of excerpt in characters (default: 200)

**Returns:**
- `str`: Relevant excerpt string

**Example:**
```python
full_text = """
Water is a chemical compound with the formula H2O. It exists in three states:
solid (ice), liquid (water), and gas (steam). At standard atmospheric pressure,
water boils at 100 degrees Celsius or 212 degrees Fahrenheit. This boiling point
can vary with altitude and pressure changes.
"""

claim = "Water boils at 100 degrees Celsius."
excerpt = extract_relevant_excerpt(full_text, claim, max_length=150)
print(excerpt)
# Output: At standard atmospheric pressure, water boils at 100 degrees Celsius
#         or 212 degrees Fahrenheit. This boiling point can vary with altitude...
```

### filter_evidence_by_credibility()

Filters evidence by minimum credibility score.

**Signature:**
```python
def filter_evidence_by_credibility(
    evidence_list: List[Evidence],
    min_credibility: float = 70.0
) -> List[Evidence]
```

**Parameters:**
- `evidence_list` (List[Evidence]): List of evidence to filter
- `min_credibility` (float): Minimum credibility score threshold (default: 70.0)

**Returns:**
- `List[Evidence]`: Filtered list of evidence

**Example:**
```python
all_evidence = retrieve_evidence(claim, sources, max_results=10)
high_quality = filter_evidence_by_credibility(all_evidence, min_credibility=90.0)
print(f"High-quality evidence: {len(high_quality)} of {len(all_evidence)}")
```

### filter_evidence_by_relevance()

Filters evidence by minimum relevance score.

**Signature:**
```python
def filter_evidence_by_relevance(
    evidence_list: List[Evidence],
    min_relevance: float = 50.0
) -> List[Evidence]
```

**Parameters:**
- `evidence_list` (List[Evidence]): List of evidence to filter
- `min_relevance` (float): Minimum relevance score threshold (default: 50.0)

**Returns:**
- `List[Evidence]`: Filtered list of evidence

**Example:**
```python
all_evidence = retrieve_evidence(claim, sources, max_results=10)
relevant = filter_evidence_by_relevance(all_evidence, min_relevance=70.0)
print(f"Highly relevant evidence: {len(relevant)} of {len(all_evidence)}")
```

### rank_evidence()

Ranks evidence by weighted combination of credibility and relevance.

**Signature:**
```python
def rank_evidence(
    evidence_list: List[Evidence],
    credibility_weight: float = 0.5,
    relevance_weight: float = 0.5
) -> List[Evidence]
```

**Parameters:**
- `evidence_list` (List[Evidence]): List of evidence to rank
- `credibility_weight` (float): Weight for credibility score (0-1, default: 0.5)
- `relevance_weight` (float): Weight for relevance score (0-1, default: 0.5)

**Returns:**
- `List[Evidence]`: Sorted list of evidence (highest ranked first)

**Example:**
```python
evidence = retrieve_evidence(claim, sources, max_results=10)

# Prioritize credibility over relevance
ranked = rank_evidence(evidence, credibility_weight=0.7, relevance_weight=0.3)

print("Top 3 evidence sources:")
for ev in ranked[:3]:
    score = ev.credibility_score * 0.7 + ev.relevance * 0.3
    print(f"  {ev.source}: {score:.1f} (cred: {ev.credibility_score}, rel: {ev.relevance})")
```

---

## Fact Checking API

**Module**: `src/fact_checker/fact_checking.py`

Verifies claims using evidence, calculates confidence scores, and assigns risk levels.

### verify_claim()

Evaluates claim validity using evidence and returns verification result.

**Signature:**
```python
def verify_claim(
    claim: Claim,
    evidence: List[Evidence],
    config: Optional[Configuration] = None
) -> VerificationResult
```

**Parameters:**
- `claim` (Claim): Claim to verify
- `evidence` (List[Evidence]): List of evidence (supporting and/or contradicting)
- `config` (Optional[Configuration]): Optional configuration with thresholds

**Returns:**
- `VerificationResult`: Complete verification result with confidence, risk level, and reasoning

**Example:**
```python
from src.fact_checker.fact_extraction import extract_claims
from src.fact_checker.domain_routing import classify_domain
from src.fact_checker.trusted_sources import get_trusted_sources
from src.fact_checker.evidence_retrieval import retrieve_evidence
from src.fact_checker.fact_checking import verify_claim

# Complete verification workflow
text = "Water boils at 100 degrees Celsius at sea level."
claims = extract_claims(text)
claim = claims[0]

# Classify domain
claim.domain = classify_domain(claim)

# Get evidence
sources = get_trusted_sources(claim.domain)
evidence = retrieve_evidence(claim, sources)

# Verify claim
result = verify_claim(claim, evidence)

print(f"Claim: {result.claim.text}")
print(f"Confidence: {result.confidence:.1f}%")
print(f"Risk Level: {result.risk_level}")
print(f"Reasoning: {result.reasoning}")
print(f"Recommendation: {result.recommendation}")
print(f"\nSupporting Evidence: {len(result.supporting_evidence)}")
print(f"Contradicting Evidence: {len(result.contradicting_evidence)}")

# Output:
# Claim: Water boils at 100 degrees Celsius at sea level.
# Confidence: 92.5%
# Risk Level: low
# Reasoning: High confidence (92.5%) in this claim. Found 3 supporting source(s)
#            with average credibility of 96.0%. 2 high-quality academic or
#            government sources support this claim.
# Recommendation: LOW RISK: This claim is well-supported by authoritative sources.
#                 Safe to use with proper attribution.
#
# Supporting Evidence: 3
# Contradicting Evidence: 0
```

**How It Works:**
1. Separates supporting vs contradicting evidence (based on relevance heuristic)
2. Calculates confidence score using weighted evidence quality
3. Assigns risk level based on confidence and configured thresholds
4. Generates human-readable reasoning explanation
5. Provides actionable recommendation

**Confidence Calculation:**
- Weights evidence by credibility (60%) and relevance (40%)
- Balances supporting vs contradicting evidence
- Penalizes mixed evidence scenarios
- Returns score from 0-100

**Risk Level Assignment:**
- **critical**: 0-30% confidence
- **high**: 30-50% confidence
- **medium**: 50-70% confidence
- **low**: 70-100% confidence

(Thresholds configurable via Configuration object)

### verify_claims_batch()

Verifies multiple claims efficiently.

**Signature:**
```python
def verify_claims_batch(
    claims: List[Claim],
    evidence_lists: List[List[Evidence]],
    config: Optional[Configuration] = None
) -> List[VerificationResult]
```

**Parameters:**
- `claims` (List[Claim]): List of claims to verify
- `evidence_lists` (List[List[Evidence]]): List of evidence lists (one per claim)
- `config` (Optional[Configuration]): Optional configuration

**Returns:**
- `List[VerificationResult]`: List of VerificationResult objects in same order as claims

**Raises:**
- `ValueError`: If number of claims doesn't match number of evidence lists

**Example:**
```python
claims = extract_claims(long_text)
evidence_lists = retrieve_evidence_batch(claims, sources)

results = verify_claims_batch(claims, evidence_lists)

for result in results:
    print(f"{result.risk_level.upper()}: {result.claim.text[:50]}...")
```

### calculate_overall_confidence()

Calculates overall confidence across multiple verification results.

**Signature:**
```python
def calculate_overall_confidence(
    results: List[VerificationResult]
) -> float
```

**Parameters:**
- `results` (List[VerificationResult]): List of verification results

**Returns:**
- `float`: Average confidence score (0-100)

**Example:**
```python
results = verify_claims_batch(claims, evidence_lists)
overall = calculate_overall_confidence(results)
print(f"Overall confidence: {overall:.1f}%")
```

### count_high_risk_claims()

Counts claims with high or critical risk levels.

**Signature:**
```python
def count_high_risk_claims(
    results: List[VerificationResult]
) -> int
```

**Parameters:**
- `results` (List[VerificationResult]): List of verification results

**Returns:**
- `int`: Count of high-risk claims

**Example:**
```python
results = verify_claims_batch(claims, evidence_lists)
high_risk = count_high_risk_claims(results)
print(f"High-risk claims: {high_risk} of {len(results)}")
```

### filter_by_risk_level()

Filters verification results by risk level.

**Signature:**
```python
def filter_by_risk_level(
    results: List[VerificationResult],
    risk_levels: List[str]
) -> List[VerificationResult]
```

**Parameters:**
- `results` (List[VerificationResult]): List of verification results
- `risk_levels` (List[str]): List of risk levels to include

**Returns:**
- `List[VerificationResult]`: Filtered list of results

**Example:**
```python
results = verify_claims_batch(claims, evidence_lists)

# Get only high-risk claims
high_risk_results = filter_by_risk_level(results, ["high", "critical"])

print(f"High-risk claims requiring attention:")
for result in high_risk_results:
    print(f"  - {result.claim.text}")
    print(f"    Confidence: {result.confidence:.1f}%")
    print(f"    Recommendation: {result.recommendation}")
```

### get_verification_summary()

Generates summary statistics for verification results.

**Signature:**
```python
def get_verification_summary(
    results: List[VerificationResult]
) -> dict
```

**Parameters:**
- `results` (List[VerificationResult]): List of verification results

**Returns:**
- `dict`: Dictionary with summary statistics

**Example:**
```python
results = verify_claims_batch(claims, evidence_lists)
summary = get_verification_summary(results)

print(f"Total claims: {summary['total_claims']}")
print(f"Average confidence: {summary['average_confidence']:.1f}%")
print(f"High-risk count: {summary['high_risk_count']}")
print("\nRisk distribution:")
for risk_level, count in summary['risk_distribution'].items():
    print(f"  {risk_level}: {count}")

# Output:
# Total claims: 15
# Average confidence: 78.3%
# High-risk count: 2
#
# Risk distribution:
#   low: 10
#   medium: 3
#   high: 1
#   critical: 1
```

---

## Report Generation API

**Module**: `src/fact_checker/report_generation.py`

Generates formatted reports from verification results in JSON, Markdown, and PDF formats.

### generate_report()

Generates formatted report from verification results.

**Signature:**
```python
def generate_report(
    verification_results: List[VerificationResult],
    input_text: str,
    format: str = "json",
    manipulation_signals: Optional[List[ManipulationSignal]] = None
) -> Report
```

**Parameters:**
- `verification_results` (List[VerificationResult]): List of verification results for claims
- `input_text` (str): Original input text that was analyzed
- `format` (str): Output format - "json", "markdown", or "pdf" (default: "json")
- `manipulation_signals` (Optional[List[ManipulationSignal]]): Optional manipulation signals for video analysis

**Returns:**
- `Report`: Report object with structured data and human summary

**Example:**
```python
from src.fact_checker.report_generation import generate_report, export_report_json

# After verifying claims
results = verify_claims_batch(claims, evidence_lists)

# Generate report
report = generate_report(
    verification_results=results,
    input_text=original_text,
    format="json"
)

# Access report components
print(f"Generated: {report.metadata['timestamp']}")
print(f"Total claims: {report.summary_statistics['total_claims']}")
print(f"High-risk: {report.summary_statistics['high_risk_count']}")
print(f"\nSummary: {report.human_summary}")
print(f"\nRecommendations:")
for rec in report.recommendations:
    print(f"  - {rec}")
```

**Report Structure:**
- **metadata**: Timestamp, version, input hash, processing time
- **claims**: All verification results
- **manipulation_signals**: Video analysis signals (if applicable)
- **summary_statistics**: Total claims, high-risk count, average confidence, domains analyzed, risk distribution
- **human_summary**: Natural language summary of findings
- **recommendations**: Actionable recommendations
- **disclaimer**: Standard disclaimer about automated verification

### export_report_json()

Exports report as JSON string.

**Signature:**
```python
def export_report_json(report: Report) -> str
```

**Parameters:**
- `report` (Report): Report object to export

**Returns:**
- `str`: JSON string representation with pretty printing

**Example:**
```python
report = generate_report(results, input_text)
json_output = export_report_json(report)

# Save to file
with open("fact_check_report.json", "w") as f:
    f.write(json_output)

# Or print to console
print(json_output)
```

**JSON Structure:**
```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00",
    "version": "1.0",
    "input_hash": "sha256:abc123...",
    "processing_time_ms": 1234
  },
  "claims": [
    {
      "claim": {
        "id": "uuid",
        "text": "Water boils at 100 degrees Celsius.",
        "position": [0, 35],
        "domain": "physics"
      },
      "confidence": 92.5,
      "risk_level": "low",
      "supporting_evidence": [...],
      "contradicting_evidence": [],
      "reasoning": "High confidence (92.5%) in this claim...",
      "recommendation": "LOW RISK: This claim is well-supported..."
    }
  ],
  "summary_statistics": {
    "total_claims": 15,
    "high_risk_count": 2,
    "average_confidence": 78.3,
    "domains_analyzed": ["physics", "biology"],
    "risk_distribution": {"low": 10, "medium": 3, "high": 1, "critical": 1}
  },
  "human_summary": "Analyzed 15 factual claim(s)...",
  "recommendations": ["Verify 2 high-risk claim(s)..."],
  "disclaimer": "This report was generated by an automated..."
}
```

### export_report_markdown()

Exports report as Markdown string.

**Signature:**
```python
def export_report_markdown(report: Report) -> str
```

**Parameters:**
- `report` (Report): Report object to export

**Returns:**
- `str`: Markdown string representation

**Example:**
```python
report = generate_report(results, input_text)
markdown_output = export_report_markdown(report)

# Save to file
with open("fact_check_report.md", "w") as f:
    f.write(markdown_output)
```

**Markdown Structure:**
```markdown
# Fact-Checking Report

## Metadata
- **Generated**: 2024-01-15T10:30:00
- **Version**: 1.0
- **Input Hash**: abc123...
- **Processing Time**: 1234ms

## Summary
Analyzed 15 factual claim(s) from the provided content...

## Statistics
- **Total Claims**: 15
- **High Risk Claims**: 2
- **Average Confidence**: 78.3%

### Risk Distribution
- **LOW**: 10
- **MEDIUM**: 3
- **HIGH**: 1
- **CRITICAL**: 1

## Detailed Results

### Claim 1
**Text**: Water boils at 100 degrees Celsius.
**Confidence**: 92.5%
**Risk Level**: LOW
**Domain**: physics

**Reasoning**: High confidence (92.5%) in this claim...

**Recommendation**: LOW RISK: This claim is well-supported...

**Supporting Evidence**:
- Physical Review Letters (credibility: 98%)
- CERN (credibility: 97%)

---

## Recommendations
1. Verify 2 high-risk claim(s) with additional authoritative sources.
2. Consider adding disclaimers for 3 medium-risk claim(s).

## Disclaimer
This report was generated by an automated fact-checking system...
```

### export_report_pdf()

Exports report as PDF bytes.

**Signature:**
```python
def export_report_pdf(report: Report) -> bytes
```

**Parameters:**
- `report` (Report): Report object to export

**Returns:**
- `bytes`: PDF bytes

**Note:** Current implementation returns markdown as bytes (placeholder). In production, this would use a PDF generation library like ReportLab or WeasyPrint.

**Example:**
```python
report = generate_report(results, input_text)
pdf_bytes = export_report_pdf(report)

# Save to file
with open("fact_check_report.pdf", "wb") as f:
    f.write(pdf_bytes)
```

### save_report_to_file()

Saves report to file in specified format.

**Signature:**
```python
def save_report_to_file(
    report: Report,
    filepath: str,
    format: str = "json"
) -> None
```

**Parameters:**
- `report` (Report): Report object to save
- `filepath` (str): Path to save file to
- `format` (str): Format to save in - "json", "markdown", or "pdf" (default: "json")

**Raises:**
- `ValueError`: If format is not supported

**Example:**
```python
report = generate_report(results, input_text)

# Save in multiple formats
save_report_to_file(report, "report.json", format="json")
save_report_to_file(report, "report.md", format="markdown")
save_report_to_file(report, "report.pdf", format="pdf")
```

---

## Complete Workflow Example

Here's a complete end-to-end example demonstrating all APIs working together:

```python
"""
Complete Fact-Checking Workflow Example

This example demonstrates the full pipeline from text input to report generation.
"""

from src.fact_checker.fact_extraction import extract_claims
from src.fact_checker.domain_routing import classify_domain
from src.fact_checker.trusted_sources import get_trusted_sources
from src.fact_checker.evidence_retrieval import retrieve_evidence
from src.fact_checker.fact_checking import verify_claim
from src.fact_checker.report_generation import (
    generate_report,
    export_report_json,
    export_report_markdown,
    save_report_to_file
)
from src.fact_checker.models import Configuration


def fact_check_text(text: str, config: Configuration = None) -> None:
    """
    Complete fact-checking workflow for text content.
    
    Args:
        text: Input text to fact-check
        config: Optional configuration
    """
    print("=" * 80)
    print("FACT-CHECKING WORKFLOW")
    print("=" * 80)
    
    # Step 1: Extract claims
    print("\n[1/5] Extracting claims...")
    claims = extract_claims(text)
    print(f"Found {len(claims)} claim(s)")
    
    if not claims:
        print("No claims found in text.")
        return
    
    # Step 2: Classify domains
    print("\n[2/5] Classifying domains...")
    for claim in claims:
        claim.domain = classify_domain(claim, config)
        print(f"  - {claim.domain}: {claim.text[:50]}...")
    
    # Step 3: Retrieve evidence
    print("\n[3/5] Retrieving evidence...")
    verification_results = []
    
    for i, claim in enumerate(claims, 1):
        print(f"  Processing claim {i}/{len(claims)}...")
        
        # Get trusted sources for domain
        sources = get_trusted_sources(claim.domain, config)
        
        # Retrieve evidence
        evidence = retrieve_evidence(claim, sources, max_results=5)
        print(f"    Found {len(evidence)} evidence source(s)")
        
        # Step 4: Verify claim
        result = verify_claim(claim, evidence, config)
        verification_results.append(result)
        
        print(f"    Confidence: {result.confidence:.1f}%")
        print(f"    Risk Level: {result.risk_level}")
    
    # Step 5: Generate report
    print("\n[4/5] Generating report...")
    report = generate_report(
        verification_results=verification_results,
        input_text=text,
        format="json"
    )
    
    # Display summary
    print("\n[5/5] Report Summary")
    print("-" * 80)
    print(f"Total Claims: {report.summary_statistics['total_claims']}")
    print(f"Average Confidence: {report.summary_statistics['average_confidence']:.1f}%")
    print(f"High-Risk Claims: {report.summary_statistics['high_risk_count']}")
    print(f"\nDomains Analyzed: {', '.join(report.summary_statistics['domains_analyzed'])}")
    
    print(f"\nRisk Distribution:")
    for risk_level, count in report.summary_statistics['risk_distribution'].items():
        print(f"  {risk_level.upper()}: {count}")
    
    print(f"\n{report.human_summary}")
    
    print(f"\nRecommendations:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"  {i}. {rec}")
    
    # Save reports
    print("\n" + "=" * 80)
    print("Saving reports...")
    save_report_to_file(report, "fact_check_report.json", format="json")
    save_report_to_file(report, "fact_check_report.md", format="markdown")
    print("✓ Saved: fact_check_report.json")
    print("✓ Saved: fact_check_report.md")
    
    return report


# Example usage
if __name__ == "__main__":
    # Sample text with multiple claims
    sample_text = """
    Water boils at 100 degrees Celsius at sea level. The human body contains
    approximately 60% water by weight. The Earth orbits the Sun once every
    365.25 days. Photosynthesis is the process by which plants convert light
    energy into chemical energy. The speed of light in a vacuum is approximately
    299,792,458 meters per second.
    """
    
    # Optional: Create custom configuration
    config = Configuration(
        confidence_threshold=75.0,
        cache_enabled=True
    )
    
    # Run fact-checking workflow
    report = fact_check_text(sample_text, config)
    
    # Access specific results
    print("\n" + "=" * 80)
    print("DETAILED RESULTS")
    print("=" * 80)
    
    for i, result in enumerate(report.claims, 1):
        print(f"\nClaim {i}:")
        print(f"  Text: {result.claim.text}")
        print(f"  Domain: {result.claim.domain}")
        print(f"  Confidence: {result.confidence:.1f}%")
        print(f"  Risk: {result.risk_level.upper()}")
        print(f"  Supporting Evidence: {len(result.supporting_evidence)}")
        print(f"  Contradicting Evidence: {len(result.contradicting_evidence)}")
        print(f"  Reasoning: {result.reasoning}")
        print(f"  Recommendation: {result.recommendation}")
```

**Expected Output:**
```
================================================================================
FACT-CHECKING WORKFLOW
================================================================================

[1/5] Extracting claims...
Found 5 claim(s)

[2/5] Classifying domains...
  - physics: Water boils at 100 degrees Celsius at sea level...
  - biology: The human body contains approximately 60% water...
  - general: The Earth orbits the Sun once every 365.25 days...
  - biology: Photosynthesis is the process by which plants co...
  - physics: The speed of light in a vacuum is approximately ...

[3/5] Retrieving evidence...
  Processing claim 1/5...
    Found 4 evidence source(s)
    Confidence: 92.5%
    Risk Level: low
  Processing claim 2/5...
    Found 3 evidence source(s)
    Confidence: 85.0%
    Risk Level: low
  ...

[4/5] Generating report...

[5/5] Report Summary
--------------------------------------------------------------------------------
Total Claims: 5
Average Confidence: 87.2%
High-Risk Claims: 0

Domains Analyzed: physics, biology, general

Risk Distribution:
  LOW: 4
  MEDIUM: 1

Analyzed 5 factual claim(s) from the provided content. Overall confidence is
high (87.2%), indicating well-supported claims. No high-risk claims were
identified. Claims span multiple domains: biology (2), general (1), physics (2).

Recommendations:
  1. Consider adding disclaimers or qualifying language for 1 medium-risk claim(s).
  2. All claims have acceptable confidence levels. Proceed with proper source attribution.

================================================================================
Saving reports...
✓ Saved: fact_check_report.json
✓ Saved: fact_check_report.md
```

---

## Error Handling

All APIs follow consistent error handling patterns.

### Error Categories

#### 1. Input Validation Errors

Raised when input parameters are invalid.

**Common Scenarios:**
- Empty or None text input
- Invalid domain strings
- Out-of-range confidence thresholds
- Mismatched list lengths in batch operations

**Example:**
```python
from src.fact_checker.fact_extraction import extract_claims

# Empty input
claims = extract_claims("")
# Returns: [] (empty list, no error)

# None input
claims = extract_claims(None)
# Returns: [] (empty list, no error)

# Invalid domain
from src.fact_checker.domain_routing import validate_domain

if not validate_domain("invalid_domain"):
    print("Invalid domain specified")
```

#### 2. Configuration Errors

Raised when configuration is invalid.

**Example:**
```python
from src.fact_checker.models import Configuration

# Invalid confidence threshold
try:
    config = Configuration(confidence_threshold=150.0)  # > 100
    # Validation happens at usage time
except ValueError as e:
    print(f"Configuration error: {e}")

# Invalid risk level mappings
config = Configuration(
    risk_level_mappings={
        "critical": (0, 30),
        "high": (30, 50),
        "medium": (50, 70),
        "low": (70, 100)
    }
)
```

#### 3. Source Errors

Raised when source operations fail.

**Example:**
```python
from src.fact_checker.trusted_sources import add_custom_source

# Invalid credibility score
try:
    source = add_custom_source(
        domain="physics",
        name="Test Source",
        url="https://example.com",
        source_type="academic",
        credibility_score=150.0  # > 100
    )
except ValueError as e:
    print(f"Source error: {e}")
    # Output: Source error: Credibility score must be between 0 and 100

# Invalid source type
try:
    source = add_custom_source(
        domain="physics",
        name="Test Source",
        url="https://example.com",
        source_type="invalid_type",
        credibility_score=90.0
    )
except ValueError as e:
    print(f"Source error: {e}")
    # Output: Source error: Invalid source type: invalid_type
```

#### 4. Batch Operation Errors

Raised when batch operations have mismatched inputs.

**Example:**
```python
from src.fact_checker.fact_checking import verify_claims_batch

claims = [claim1, claim2, claim3]
evidence_lists = [evidence1, evidence2]  # Only 2 lists for 3 claims

try:
    results = verify_claims_batch(claims, evidence_lists)
except ValueError as e:
    print(f"Batch error: {e}")
    # Output: Batch error: Number of claims must match number of evidence lists
```

### Error Handling Best Practices

#### 1. Check for Empty Results

```python
claims = extract_claims(text)
if not claims:
    print("No claims found in text")
    return

# Proceed with claims
for claim in claims:
    # Process claim
    pass
```

#### 2. Validate Configuration

```python
from src.fact_checker.models import Configuration

def create_safe_config(confidence_threshold: float) -> Configuration:
    """Create configuration with validation."""
    # Clamp threshold to valid range
    threshold = max(0.0, min(100.0, confidence_threshold))
    
    return Configuration(
        confidence_threshold=threshold,
        cache_enabled=True
    )

config = create_safe_config(75.0)
```

#### 3. Handle Missing Evidence Gracefully

```python
evidence = retrieve_evidence(claim, sources)

if not evidence:
    print(f"Warning: No evidence found for claim: {claim.text}")
    # Still verify with empty evidence (will result in low confidence)
    result = verify_claim(claim, [])
else:
    result = verify_claim(claim, evidence)
```

#### 4. Validate Domains

```python
from src.fact_checker.domain_routing import validate_domain, classify_domain

domain = classify_domain(claim)

if not validate_domain(domain):
    print(f"Warning: Invalid domain '{domain}', using 'general'")
    domain = "general"

claim.domain = domain
```

#### 5. Check File Operations

```python
from src.fact_checker.report_generation import save_report_to_file

try:
    save_report_to_file(report, "report.json", format="json")
    print("✓ Report saved successfully")
except IOError as e:
    print(f"✗ Failed to save report: {e}")
except ValueError as e:
    print(f"✗ Invalid format: {e}")
```

### Logging and Debugging

For debugging, you can inspect intermediate results:

```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Inspect claims
claims = extract_claims(text)
print(f"Extracted {len(claims)} claims:")
for i, claim in enumerate(claims, 1):
    print(f"  {i}. {claim.text}")
    print(f"     Position: {claim.position}")
    print(f"     ID: {claim.id}")

# Inspect evidence
evidence = retrieve_evidence(claim, sources)
print(f"\nRetrieved {len(evidence)} evidence items:")
for i, ev in enumerate(evidence, 1):
    print(f"  {i}. {ev.source}")
    print(f"     Credibility: {ev.credibility_score}%")
    print(f"     Relevance: {ev.relevance}%")
    print(f"     Excerpt: {ev.excerpt[:100]}...")

# Inspect verification result
result = verify_claim(claim, evidence)
print(f"\nVerification Result:")
print(f"  Confidence: {result.confidence}%")
print(f"  Risk Level: {result.risk_level}")
print(f"  Supporting: {len(result.supporting_evidence)}")
print(f"  Contradicting: {len(result.contradicting_evidence)}")
print(f"  Reasoning: {result.reasoning}")
```

---

## Additional Resources

### Related Documentation

- **User Guide**: `docs/USER_GUIDE.md` - Getting started and usage examples
- **Integration Guide**: `docs/INTEGRATION_GUIDE.md` - Pipeline integration and hooks
- **Design Document**: `.kiro/specs/fact-checking-system/design.md` - System architecture
- **Requirements**: `.kiro/specs/fact-checking-system/requirements.md` - Detailed requirements

### Source Code

All API implementations are in `src/fact_checker/`:
- `fact_extraction.py` - Claim extraction
- `domain_routing.py` - Domain classification
- `trusted_sources.py` - Source management
- `evidence_retrieval.py` - Evidence retrieval
- `fact_checking.py` - Claim verification
- `report_generation.py` - Report formatting
- `models.py` - Data models
- `schemas.py` - JSON schemas

### Testing

Unit tests and property-based tests are in `tests/fact_checker/`:
- `test_fact_extraction.py`
- `test_domain_routing.py`
- `test_trusted_sources.py`
- `test_evidence_retrieval.py`
- `test_fact_checking.py`
- `test_report_generation.py`

### Support

For questions or issues:
1. Check the documentation in `docs/`
2. Review examples in this API reference
3. Examine test files for usage patterns
4. Consult the design document for architecture details

---

**Version**: 1.0  
**Last Updated**: 2024-01-15  
**License**: See LICENSE file in repository root
