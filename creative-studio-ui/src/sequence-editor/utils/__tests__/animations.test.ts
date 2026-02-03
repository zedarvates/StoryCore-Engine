/**
 * Tests for Animation Utilities
 * 
 * Requirements: 20.1, 20.3, 20.5, 20.6, 20.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ANIMATION_TIMING,
  EASING,
  createTransition,
  TRANSITIONS,
  applyHoverAnimation,
  applyActiveAnimation,
  applyButtonPressAnimation,
  applyToolSelectionAnimation,
  createRippleEffect,
  fadeIn,
  fadeOut,
  slideIn,
  pulse,
  shake,
  shouldReduceMotion,
  AnimationPerformanceMonitor,
  debounceAnimation,
  throttleAnimation,
} from '../animations';

describe('Animation Utilities', () => {
  let testElement: HTMLElement;
  
  beforeEach(() => {
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });
  
  afterEach(() => {
    document.body.removeChild(testElement);
  });
  
  describe('Animation Constants', () => {
    it('should have correct timing constants', () => {
      expect(ANIMATION_TIMING.INSTANT).toBe(0);
      expect(ANIMATION_TIMING.FAST).toBe(100);
      expect(ANIMATION_TIMING.NORMAL).toBe(200);
      expect(ANIMATION_TIMING.SLOW).toBe(300);
      expect(ANIMATION_TIMING.SLOWER).toBe(500);
      expect(ANIMATION_TIMING.TARGET_FPS).toBe(60);
      expect(ANIMATION_TIMING.FRAME_TIME).toBe(16);
    });
    
    it('should have correct easing functions', () => {
      expect(EASING.LINEAR).toBe('linear');
      expect(EASING.EASE_IN).toBe('cubic-bezier(0.4, 0, 1, 1)');
      expect(EASING.EASE_OUT).toBe('cubic-bezier(0, 0, 0.2, 1)');
      expect(EASING.EASE_IN_OUT).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
      expect(EASING.BOUNCE).toBe('cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    });
  });
  
  describe('createTransition', () => {
    it('should create transition string with single property', () => {
      const transition = createTransition({
        duration: 200,
        easing: EASING.EASE_IN_OUT,
        properties: ['opacity'],
      });
      
      expect(transition).toBe('opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)');
    });
    
    it('should create transition string with multiple properties', () => {
      const transition = createTransition({
        duration: 200,
        easing: EASING.EASE_IN_OUT,
        properties: ['opacity', 'transform'],
      });
      
      expect(transition).toContain('opacity 200ms');
      expect(transition).toContain('transform 200ms');
    });
    
    it('should include delay when specified', () => {
      const transition = createTransition({
        duration: 200,
        easing: EASING.EASE_IN_OUT,
        delay: 100,
        properties: ['opacity'],
      });
      
      expect(transition).toBe('opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 100ms');
    });
    
    it('should default to "all" property', () => {
      const transition = createTransition({
        duration: 200,
        easing: EASING.EASE_IN_OUT,
      });
      
      expect(transition).toBe('all 200ms cubic-bezier(0.4, 0, 0.2, 1)');
    });
  });
  
  describe('Hover Animation', () => {
    it('should apply hover animation to element', () => {
      applyHoverAnimation(testElement);
      
      expect(testElement.style.transition).toBeTruthy();
    });
    
    it('should change background color on hover', () => {
      applyHoverAnimation(testElement, '#ff0000');
      
      const mouseEnterEvent = new MouseEvent('mouseenter');
      testElement.dispatchEvent(mouseEnterEvent);
      
      expect(testElement.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });
    
    it('should reset background color on mouse leave', () => {
      applyHoverAnimation(testElement);
      
      const mouseEnterEvent = new MouseEvent('mouseenter');
      testElement.dispatchEvent(mouseEnterEvent);
      
      const mouseLeaveEvent = new MouseEvent('mouseleave');
      testElement.dispatchEvent(mouseLeaveEvent);
      
      expect(testElement.style.backgroundColor).toBe('');
    });
  });
  
  describe('Active Animation', () => {
    it('should apply active animation to element', () => {
      applyActiveAnimation(testElement);
      
      expect(testElement.style.transition).toBeTruthy();
    });
    
    it('should change background color on mouse down', () => {
      applyActiveAnimation(testElement, '#00ff00');
      
      const mouseDownEvent = new MouseEvent('mousedown');
      testElement.dispatchEvent(mouseDownEvent);
      
      expect(testElement.style.backgroundColor).toBe('rgb(0, 255, 0)');
    });
  });
  
  describe('Button Press Animation', () => {
    it('should apply button press animation', () => {
      applyButtonPressAnimation(testElement);
      
      expect(testElement.style.transition).toBeTruthy();
    });
    
    it('should scale down on mouse down', () => {
      applyButtonPressAnimation(testElement);
      
      const mouseDownEvent = new MouseEvent('mousedown');
      testElement.dispatchEvent(mouseDownEvent);
      
      expect(testElement.style.transform).toBe('scale(0.95)');
    });
    
    it('should scale back on mouse up', () => {
      applyButtonPressAnimation(testElement);
      
      const mouseDownEvent = new MouseEvent('mousedown');
      testElement.dispatchEvent(mouseDownEvent);
      
      const mouseUpEvent = new MouseEvent('mouseup');
      testElement.dispatchEvent(mouseUpEvent);
      
      expect(testElement.style.transform).toBe('scale(1)');
    });
  });
  
  describe('Tool Selection Animation', () => {
    it('should apply selected styles when selected', () => {
      applyToolSelectionAnimation(testElement, true);
      
      expect(testElement.style.backgroundColor).toBeTruthy();
      expect(testElement.style.boxShadow).toBeTruthy();
    });
    
    it('should remove selected styles when not selected', () => {
      applyToolSelectionAnimation(testElement, true);
      applyToolSelectionAnimation(testElement, false);
      
      expect(testElement.style.backgroundColor).toBe('');
      expect(testElement.style.boxShadow).toBe('');
    });
  });
  
  describe('Ripple Effect', () => {
    it('should create ripple element', () => {
      const event = new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
      });
      
      createRippleEffect(testElement, event);
      
      const ripple = testElement.querySelector('span');
      expect(ripple).toBeTruthy();
    });
    
    it('should remove ripple after animation', async () => {
      const event = new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
      });
      
      createRippleEffect(testElement, event);
      
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const ripple = testElement.querySelector('span');
      expect(ripple).toBeFalsy();
    });
  });
  
  describe('Fade Animations', () => {
    it('should fade in element', () => {
      fadeIn(testElement);
      
      expect(testElement.style.opacity).toBe('0');
      expect(testElement.style.transition).toBeTruthy();
    });
    
    it('should fade out element', async () => {
      const promise = fadeOut(testElement, 100);
      
      expect(testElement.style.opacity).toBe('0');
      
      await promise;
    });
  });
  
  describe('Slide Animation', () => {
    it('should slide in from specified direction', () => {
      slideIn(testElement, 'up');
      
      expect(testElement.style.opacity).toBe('0');
      expect(testElement.style.transform).toBeTruthy();
    });
  });
  
  describe('Pulse Animation', () => {
    it('should apply pulse animation', () => {
      // Mock animate if not available in test environment
      if (!testElement.animate) {
        testElement.animate = vi.fn();
      }
      
      const animateSpy = vi.spyOn(testElement, 'animate');
      
      pulse(testElement, 1);
      
      expect(animateSpy).toHaveBeenCalled();
    });
  });
  
  describe('Shake Animation', () => {
    it('should apply shake animation', () => {
      // Mock animate if not available in test environment
      if (!testElement.animate) {
        testElement.animate = vi.fn();
      }
      
      const animateSpy = vi.spyOn(testElement, 'animate');
      
      shake(testElement);
      
      expect(animateSpy).toHaveBeenCalled();
    });
  });
  
  describe('Motion Preferences', () => {
    it('should check for reduced motion preference', () => {
      // Mock matchMedia if not available in test environment
      if (!window.matchMedia) {
        window.matchMedia = vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));
      }
      
      const result = shouldReduceMotion();
      
      expect(typeof result).toBe('boolean');
    });
  });
  
  describe('Performance Monitor', () => {
    it('should create performance monitor', () => {
      const monitor = new AnimationPerformanceMonitor();
      
      expect(monitor).toBeTruthy();
      expect(monitor.getFPS()).toBe(60);
    });
    
    it('should start monitoring', () => {
      const monitor = new AnimationPerformanceMonitor();
      
      monitor.start();
      
      expect(monitor.getFPS()).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Debounce Animation', () => {
    it('should debounce function calls', async () => {
      const fn = vi.fn();
      const debounced = debounceAnimation(fn, 50);
      
      debounced();
      debounced();
      debounced();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Throttle Animation', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn();
      const throttled = throttleAnimation(fn, 50);
      
      throttled();
      throttled();
      throttled();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fn).toHaveBeenCalled();
    });
  });
  
  describe('Predefined Transitions', () => {
    it('should have fast transition', () => {
      expect(TRANSITIONS.FAST).toBeTruthy();
      expect(TRANSITIONS.FAST).toContain('100ms');
    });
    
    it('should have normal transition', () => {
      expect(TRANSITIONS.NORMAL).toBeTruthy();
      expect(TRANSITIONS.NORMAL).toContain('200ms');
    });
    
    it('should have panel resize transition', () => {
      expect(TRANSITIONS.PANEL_RESIZE).toBeTruthy();
      expect(TRANSITIONS.PANEL_RESIZE).toContain('width');
      expect(TRANSITIONS.PANEL_RESIZE).toContain('height');
    });
    
    it('should have color transition', () => {
      expect(TRANSITIONS.COLOR).toBeTruthy();
      expect(TRANSITIONS.COLOR).toContain('background-color');
      expect(TRANSITIONS.COLOR).toContain('color');
    });
    
    it('should have tool selection transition', () => {
      expect(TRANSITIONS.TOOL_SELECTION).toBeTruthy();
      expect(TRANSITIONS.TOOL_SELECTION).toContain('background-color');
      expect(TRANSITIONS.TOOL_SELECTION).toContain('box-shadow');
    });
  });
});
