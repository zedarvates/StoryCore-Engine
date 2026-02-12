# Animation System

StoryCore's declarative animation system inspired by React Spring and Remotion.

## Overview

This animation system provides:
- **Spring Physics** - Natural, physics-based animations
- **Keyframe Animations** - Precise timing control
- **Animation Orchestration** - Coordinate multiple animations
- **Transitions** - Smooth enter/exit animations

## Installation

All animation hooks are exported from `src/hooks/useAnimation.ts`:

```typescript
import { useSpring, useKeyframes, Spring, Easing } from '../hooks/useAnimation';
```

## Spring Animations

### Basic Usage

```tsx
import { useSpring, Spring } from '../hooks/useAnimation';

function AnimatedComponent() {
  const { value, isAnimating, start, stop, reset } = useSpring({
    from: 0,
    to: 100,
    config: Spring.gentle
  });

  return (
    <div onClick={start}>
      <div style={{ transform: `translateX(${value}px)` }}>
        Animated!
      </div>
    </div>
  );
}
```

### Object Spring Animations

Animate multiple properties at once:

```tsx
import { useSpringObject, Spring } from '../hooks/useAnimation';

function AnimatedBox() {
  const { value } = useSpringObject({
    from: { opacity: 0, scale: 0.5, rotate: 0 },
    to: { opacity: 1, scale: 1, rotate: 360 },
    config: {
      opacity: { stiffness: 50, damping: 10 },
      scale: { stiffness: 100, damping: 15 },
      rotate: { stiffness: 200, damping: 20 }
    }
  });

  return (
    <div style={{
      opacity: value.opacity,
      transform: `scale(${value.scale}) rotate(${value.rotate}deg)`
    }}>
      Spinning Box
    </div>
  );
}
```

### Spring Config Presets

```typescript
import { Spring } from '../hooks/useAnimation';

// Pre-configured spring settings
Spring.default     // { mass: 1, stiffness: 100, damping: 10 }
Spring.gentle     // { mass: 1, stiffness: 50, damping: 10 }
Spring.wobbly     // { mass: 1, stiffness: 180, damping: 12 }
Spring.stiff      // { mass: 1, stiffness: 260, damping: 20 }
Spring.slow       // { mass: 1, stiffness: 40, damping: 30 }
Spring.rapid      // { mass: 1, stiffness: 200, damping: 14 }
```

### Spring Properties

| Property | Description | Default |
|----------|-------------|---------|
| mass | Mass of the animated object | 1 |
| stiffness | Spring stiffness (tension) | 100 |
| damping | Damping coefficient | 10 |
| velocity | Initial velocity | 0 |

## Keyframe Animations

### Basic Usage

```tsx
import { useKeyframes, Easing } from '../hooks/useAnimation';

function KeyframeAnimation() {
  const { value, progress, isAnimating, play, pause, seek } = useKeyframes({
    from: 0,
    to: 100,
    duration: 1000,
    keyframes: [
      { time: 0, value: 0 },
      { time: 0.3, value: 50, easing: Easing.easeOutQuad },
      { time: 0.7, value: 80, easing: Easing.easeInOutCubic },
      { time: 1, value: 100 }
    ],
    loop: true,
    direction: 'alternate'
  });

  return (
    <div onClick={play}>
      <div style={{ width: `${value}%` }}>
        Progress: {(progress * 100).toFixed(0)}%
      </div>
    </div>
  );
}
```

### Object Keyframes

```tsx
import { useKeyframesObject, Easing } from '../hooks/useAnimation';

function ComplexKeyframes() {
  const { value } = useKeyframesObject({
    from: { x: 0, y: 0, opacity: 0 },
    to: { x: 100, y: 50, opacity: 1 },
    duration: 2000,
    keyframes: [
      {
        time: 0.5,
        value: { x: 50, y: 25, opacity: 0.5 }
      }
    ],
    easing: Easing.easeInOutSine
  });

  return (
    <div style={{
      transform: `translate(${value.x}px, ${value.y}px)`,
      opacity: value.opacity
    }}>
      Moving Element
    </div>
  );
}
```

## Easing Functions

All easing functions accept a value between 0 and 1:

```typescript
import { Easing } from '../hooks/useAnimation';

// Standard easing
Easing.linear(t)
Easing.easeInQuad(t)
Easing.easeOutQuad(t)
Easing.easeInOutQuad(t)

// Cubic easing
Easing.easeInCubic(t)
Easing.easeOutCubic(t)
Easing.easeInOutCubic(t)

// Back easing (with overshoot)
Easing.easeInBack(t)
Easing.easeOutBack(t)
Easing.easeInOutBack(t)

// Elastic easing (bouncy)
Easing.easeInElastic(t)
Easing.easeOutElastic(t)
Easing.easeInOutElastic(t)

// Bounce easing
Easing.easeInBounce(t)
Easing.easeOutBounce(t)
Easing.easeInOutBounce(t)

// Specialized
Easing.easeInSine(t)
Easing.easeInExpo(t)
Easing.easeInCirc(t)
```

## Animation Orchestration

### Sequential Animations

```tsx
import { useSequentialAnimations } from '../hooks/useAnimation';

function SequenceExample() {
  const { executeSequence, currentIndex, totalAnimations } = useSequentialAnimations();

  const runSequence = async () => {
    await executeSequence([
      {
        id: 'fade-in',
        execute: async () => { /* Fade in animation */ }
      },
      {
        id: 'move',
        execute: async () => { /* Move animation */ }
      },
      {
        id: 'scale',
        execute: async () => { /* Scale animation */ }
      }
    ]);
  };

  return (
    <button onClick={runSequence}>
      Run Sequence ({currentIndex}/{totalAnimations})
    </button>
  );
}
```

### Parallel Animations

```tsx
import { useParallelAnimations } from '../hooks/useAnimation';

function ParallelExample() {
  const { executeParallel } = useParallelAnimations();

  const runParallel = async () => {
    await executeParallel([
      {
        id: 'left',
        execute: async () => { /* Animate left */ }
      },
      {
        id: 'right',
        execute: async () => { /* Animate right */ }
      }
    ]);
  };

  return <button onClick={runParallel}>Animate Both</button>;
}
```

### Staggered Animations

```tsx
import { useStaggeredAnimations } from '../hooks/useAnimation';

function StaggeredList() {
  const { executeStaggered } = useStaggeredAnimations(100); // 100ms delay

  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];

  const animateItems = async () => {
    await executeStaggered(
      items.map((item, index) => ({
        id: `item-${index}`,
        execute: async () => { /* Animate item */ }
      }))
    );
  };

  return <button onClick={animateItems}>Stagger In</button>;
}
```

## Trail Animations (Spring)

```tsx
import { useSpringTrail } from '../hooks/useAnimation';

function TrailAnimation() {
  const items = [1, 2, 3, 4, 5];
  const { values, starts, stops } = useSpringTrail(items, {
    from: 0,
    to: 1,
    config: { stiffness: 100, damping: 10 },
    stagger: 50 // 50ms between each
  });

  return (
    <div>
      {values.map((value, index) => (
        <div
          key={index}
          style={{ opacity: value }}
          onClick={starts[index]}
        >
          Item {index + 1}
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### useSpring

```typescript
function useSpring(config: UseSpringSingleConfig): UseSpringReturn<number>
function useSpringObject<T extends object>(config: UseSpringObjectConfig<T>): UseSpringReturn<T>
```

**Config:**
- `from` - Starting value
- `to` - Ending value
- `config` - Spring configuration
- `delay` - Delay before starting
- `loop` - Number of times to loop (true for infinite)
- `direction` - Animation direction
- `immediate` - Skip animation, go directly to end value

**Returns:**
- `value` - Current animated value
- `isAnimating` - Whether animation is running
- `start` - Start animation
- `stop` - Stop animation
- `reset` - Reset to initial values

### useKeyframes

```typescript
function useKeyframes(config: KeyframeConfig): UseKeyframesReturn<number>
function useKeyframesObject<T extends object>(config: KeyframeObjectConfig<T>): UseKeyframesReturn<T>
```

**Config:**
- `from` - Starting value
- `to` - Ending value
- `keyframes` - Array of keyframes
- `duration` - Animation duration in ms
- `easing` - Default easing function
- `delay` - Delay before starting
- `loop` - Number of times to loop
- `direction` - Animation direction
- `immediate` - Skip animation

**Keyframe:**
- `time` - Time position (0-1 for percentage, or absolute ms)
- `value` - Value at this keyframe
- `easing` - Easing for segment leading to this keyframe

## Performance Tips

1. **Use CSS transforms for position** - Transform animations are GPU-accelerated
2. **Avoid animating layout properties** - Properties like `width`, `height` cause reflows
3. **Use `will-change` sparingly** - Only add for properties that will animate
4. **Cancel unused animations** - Always call `stop()` when unmounting
5. **Use `useMemo` for configs** - Prevent unnecessary re-renders

## Comparison with CSS Animations

| Feature | CSS | StoryCore Animation |
|---------|-----|---------------------|
| Physics-based | ❌ | ✅ Spring |
| Dynamic values | Limited | ✅ Full control |
| Interruptible | ❌ | ✅ Built-in |
| Orchestration | Manual | ✅ Automatic |
| React integration | External | ✅ Native |
| Type safety | ❌ | ✅ Full TypeScript |

## Migration from CSS

**Before (CSS):**
```css
.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**After (StoryCore):**
```tsx
const { value } = useSpring({
  from: 0,
  to: 1,
  config: { stiffness: 100, damping: 20 }
});

<div style={{ opacity: value }} />
```

## Examples

See the following components for complete examples:
- `src/components/animation/SpringDemo.tsx`
- `src/components/animation/KeyframeDemo.tsx`
- `src/components/animation/TransitionDemo.tsx`

## License

MIT
