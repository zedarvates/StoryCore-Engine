// Ethnic quota analysis module for content sensitivity detection

class EthnicQuotaAnalyzer {
  constructor() {
    this.thresholds = {
      low: 30,
      medium: 60,
      high: 80
    };
    
    // Woke-related keywords and patterns with positive weights
    this.wokePatterns = [
      { regex: /\b(diversity|inclusion|equity)\b/gi, weight: 10 },
      { regex: /\b(privilege|oppression|marginalized)\b/gi, weight: 15 },
      { regex: /\b(systemic|institutional)\b/gi, weight: 12 },
      { regex: /\b(gender|non-binary|pronouns)\b/gi, weight: 8 },
      { regex: /\b(racial|ethnic|cultural)\b/gi, weight: 10 },
      { regex: /\b(social justice|woke)\b/gi, weight: 20 },
      { regex: /\b(ally|microaggression)\b/gi, weight: 15 }
    ];
    
    // Anti-woke patterns with negative weights
    this.antiWokePatterns = [
      { regex: /\b(traditional|conservative|patriotic)\b/gi, weight: -10 },
      { regex: /\b(libertarian|free speech|individualism)\b/gi, weight: -12 },
      { regex: /\b(anti-woke|anti-cancel)\b/gi, weight: -15 },
      { regex: /\b(traditional values|family values)\b/gi, weight: -10 },
      { regex: /\b(patriarchy|toxic masculinity)\b/gi, weight: -18 },
      { regex: /\b(white privilege|colorblind)\b/gi, weight: -20 },
      { regex: /\b(cancel culture|call out)\b/gi, weight: -15 }
    ];
  }

  analyzeContent(text) {
    let score = 0;
    const flaggedTerms = [];
    
    // Analyze woke patterns
    this.wokePatterns.forEach(pattern => {
      const matches = text.match(pattern.regex);
      if (matches) {
        score += matches.length * pattern.weight;
        flaggedTerms.push(...matches);
      }
    });
    
    // Analyze anti-woke patterns
    this.antiWokePatterns.forEach(pattern => {
      const matches = text.match(pattern.regex);
      if (matches) {
        score -= matches.length * pattern.weight;
        flaggedTerms.push(...matches);
      }
    });
    
    // Cap score at 100
    score = Math.min(100, Math.max(0, score));
    
    return {
      score,
      level: this.mapToSensitivityLevel(score),
      color: this.colors[level],
      description: this.getSensitivityLevelDescription(level),
      flaggedTerms: [...new Set(flaggedTerms)],
      recommendations: this.generateRecommendations(score, flaggedTerms)
    };
  }

  mapToSensitivityLevel(score) {
    if (score >= this.thresholds.high) return 'high';
    if (score >= this.thresholds.medium) return 'medium';
    return 'low';
  }

  getSensitivityLevelDescription(level) {
    switch (level) {
      case 'low': return 'Content has minimal woke/ideological markers';
      case 'medium': return 'Content contains moderate woke/ideological themes';
      case 'high': return 'Content contains strong woke/ideological themes';
      default: return 'Unknown sensitivity level';
    }
  }

  generateRecommendations(score, flaggedTerms) {
    const recommendations = [];
    
    if (score >= this.thresholds.high) {
      recommendations.push('Consider reducing ideological language for broader audience');
      recommendations.push('Review flagged terms for necessity in context');
    } else if (score >= this.thresholds.medium) {
      recommendations.push('Some ideological terms detected - ensure they serve narrative purpose');
    } else {
      recommendations.push('Low level of ideological markers detected');
    }
    
    if (flaggedTerms.length > 0) {
      recommendations.push(`Flagged terms: ${[...new Set(flaggedTerms)].join(', ')}`);
    }
    
    return recommendations;
  }

  // Generate gauge visualization data
  generateGaugeData(score) {
    const analysis = this.analyzeContent('');
    analysis.score = score;
    return analysis;
  }
}

module.exports = new