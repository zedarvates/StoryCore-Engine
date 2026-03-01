// PEGI rating analysis module for content sensitivity detection

class PEGIAnalyzer {
  constructor() {
    // PEGI age rating thresholds
    this.pegiThresholds = {
      'PEGI 3': 30,
      'PEGI 7': 60,
      'PEGI 12': 80,
      'PEGI 16': 90,
      'PEGI 18': 100
    };
    
    // Content indicators and their labels
    this.indicators = {
      'violence': 'Violence',
      'language': 'Language',
      'fear': 'Fear',
      'drugs': 'Drugs',
      'sex': 'Sexual Content',
      'discrimination': 'Discrimination',
      'gambling': 'Gambling',
      'in_app_purchases': 'In-App Purchases',
      'online_interaction': 'Online Interaction'
    };
  }

  // Get PEGI rating based on sensitivity score
  getRating(score) {
    const sortedRatings = Object.keys(this.pegiThresholds).sort((a, b) => this.pegiThresholds[b] - this.pegiThresholds[a]);
    for (const rating of sortedRatings) {
      if (score <= this.pegiThresholds[rating]) {
        return rating;
      }
    }
    return 'PEGI 18';
  }

  // Get content warnings based on detected indicators
  getContentWarnings(detectedIndicators) {
    const warnings = [];
    const allIndicatorKeys = Object.keys(this.indicators);
    allIndicatorKeys.forEach(key => {
      if (detectedIndicators.includes(key)) {
        warnings.push(this.indicators[key]);
      }
    });
    return warnings;
  }
}

module.exports = PEGIAnalyzer;