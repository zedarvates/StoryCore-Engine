// Test file for content sensitivity addon

const addon = require('../src/main.js');
const sensitivityCriteria = require('../config/schema.json');

describe('Content Sensitivity Addon', () => {
  it('should detect sensitive content in dialogue', () => {
    const dialogue = 'This is a test dialogue with sensitive keywords';
    const result = addon.analyzeContent({ dialogue });
    expect(result.score).toBeGreaterThan(0);
  });

  it('should detect cultural context in clothing', () => {
    const clothing = [{ name: 'T-shirt', culturalSignificance: true, origin: 'France' }];
    const context = { origin: 'India' };
    const result = addon.analyzeClothing(clothing, context);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should generate appropriate recommendations', () => {
    const dialogue = 'This is a test dialogue with sensitive keywords';
    const clothing = [{ name: 'T-shirt', culturalSignificance: true, origin: 'France' }];
    const context = { origin: 'India' };
    const result = addon.analyzeContent({ dialogue, clothing, context });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should apply censorship mechanisms', () => {
    const content = { text: 'Sensitive content', image: null, clothing: [] };
    const sensitivityLevel = 'high';
    const result = addon.applyCensorship(content, sensitivityLevel);
    expect(result.censoredContent.text).not.toContain('Sensitive');
  });
