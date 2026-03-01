// Keyword detection module for sensitive content

const sensitivityCriteria = require('../config/schema.json');

module.exports = {
  detectSensitiveKeywords: async (text) => {
    // Implement keyword detection logic
    // Use regex patterns from configuration
    // Apply context-aware scoring
    // Return flagged words and confidence scores
    
    const patterns = sensitivityCriteria.detection_criteria.keywords.patterns;
    const flaggedWords = [];
    let totalScore = 0;
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        flaggedWords.push(...matches);
        totalScore += matches.length * 10;
      }
    });
    
    return {
      flaggedWords: [...new Set(flaggedWords)],
      score: Math.min(100, totalScore),
      recommendations: this.generateRecommendations(flaggedWords)
    };
  },
  
  generateRecommendations: (flaggedWords) => {
    if (flaggedWords.length === 0) {
      return ['No sensitive keywords detected'];
    }
    
    return [
      `Review flagged terms: ${flaggedWords.join(', ')}`,
      'Consider alternative phrasing',
      'Check cultural context of sensitive terms'
    ];
  }
};