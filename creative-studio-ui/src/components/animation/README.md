## Animation System

A comprehensive animation system built with Framer Motion that provides consistent, accessible, and performant animations throughout the application.

### Features

- ✅ **Consistent Timing**: All animations use standard durations (200-300ms)
- ✅ **Accessibility**: Full support for `prefers-reduced-motion`
- ✅ **Visual Feedback**: Success, error, and state change animations
- ✅ **Hover States**: Smooth interactive feedback
- ✅ **Loading States**: Skeleton loaders and spinners
- ✅ **Orchestration**: Prevents visual conflicts between multiple animations

### Validates Requirements

- **11.1**: State transitions with natural acceleration curves
- **11.2**: Success feedback (checkmark, highlight)
- **11.3**: Error feedback (shake animation)
- **11.4**: Consistent animation durations (200-300ms)
- **11.5**: Smooth hover state transitions
- **11.6**: Skeleton loaders and spinners
- **11.7**: Respects `prefers-reduced-motion`
- **11.8**: Animation orchestration to prevent conflicts

## Quick Start

### 1. Wrap your app with AnimationProvider

```tsx
import { AnimationProvider } from './components/animation';

function App() {
  return (
    <AnimationProvider>
      <YourApp />
    </AnimationProvider>
  );
}
```

### 2. Use animation components

```tsx
import {
  AnimatedFeedback,
  HoverScale,
  Spinner,
  StateTransition,
} from './components/animation';

function MyComponent() {
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <div>
      {/* Feedback */}
      {showSuccess && (
        <AnimatedFeedback
          type="success"
          message="Operation completed!"
          duration={3000}
        />
      )}

      {/* Hover animation */}
      <HoverScale>
        <button>Hover me</button>
      </HoverScale>

      {/* Loading */}
      <Spinner size={24} />

      {/* State transition */}
      <StateTransition show={isVisible} type="fade">
        <div>Content</div>
      </StateTransition>
    </div>
  );
}
```

## Components

### AnimationProvider

Provides animation configuration context to the entire application.

```tsx
<AnimationProvider disableAnimations={false}>
  <App />
</AnimationProvider>
```

### AnimatedFeedback

Visual feedback for success, error, warning, and info states.

```tsx
<AnimatedFeedback
  type="success"
  message="Saved successfully!"
  duration={3000}
  onComplete={() => console.log('Animation complete')}
/>
```

**Types**: `success`, `error`, `warning`, `info`

### SuccessHighlight / ErrorShake

Wrapper components that animate on trigger.

```tsx
<SuccessHighlight trigger={wasSuccessful}>
  <div>Content that highlights on success</div>
</SuccessHighlight>

<ErrorShake trigger={hasError}>
  <input />
</ErrorShake>
```

### StateTransition

Animated transitions for showing/hiding content.

```tsx
<StateTransition show={isVisible} type="fade">
  <div>Content</div>
</StateTransition>
```

**Types**: `fade`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `scale`

### ContentSwitcher

Smooth transitions when content changes.

```tsx
<ContentSwitcher contentKey={currentTab} type="slide-left">
  {tabContent}
</ContentSwitcher>
```

### HoverScale

Scales element on hover for interactive feedback.

```tsx
<HoverScale scaleAmount={1.05}>
  <button>Click me</button>
</HoverScale>
```

### HoverLift

Lifts element with shadow on hover.

```tsx
<HoverLift liftAmount={-4}>
  <div className="card">Card content</div>
</HoverLift>
```

### InteractiveButton

Button with built-in hover and tap animations.

```tsx
<InteractiveButton
  onClick={handleClick}
  variant="primary"
>
  Click me
</InteractiveButton>
```

**Variants**: `default`, `primary`, `secondary`, `danger`

### HoverCard

Card component with hover animation.

```tsx
<HoverCard onClick={handleClick}>
  <div>Card content</div>
</HoverCard>
```

### Spinner

Rotating loading spinner.

```tsx
<Spinner size={24} className="text-blue-600" />
```

### DotsLoader

Pulsing dots loader.

```tsx
<DotsLoader className="text-gray-600" />
```

### SkeletonText

Skeleton loader for text content.

```tsx
<SkeletonText lines={3} />
```

### SkeletonImage

Skeleton loader for images.

```tsx
<SkeletonImage width="100%" height="200px" />
```

### SkeletonCard

Pre-built skeleton for card layouts.

```tsx
<SkeletonCard />
```

### LoadingOverlay

Full-screen loading overlay.

```tsx
<LoadingOverlay message="Loading..." />
```

### ProgressBar

Animated progress bar.

```tsx
<ProgressBar progress={75} showLabel />
```

### CircularProgress

Circular progress indicator.

```tsx
<CircularProgress progress={60} size={48} />
```

### AccessibleAnimation

Wrapper that respects `prefers-reduced-motion`.

```tsx
<AccessibleAnimation
  animate={{ opacity: 1, scale: 1 }}
  initial={{ opacity: 0, scale: 0.9 }}
  reducedMotionFallback={{ animate: { opacity: 1 } }}
>
  <div>Content</div>
</AccessibleAnimation>
```

## Hooks

### useAnimationConfig

Access animation configuration.

```tsx
const { isAnimationEnabled, prefersReducedMotion } = useAnimationConfig();
```

### useReducedMotion

Detect `prefers-reduced-motion` preference.

```tsx
const prefersReducedMotion = useReducedMotion();
```

### useAnimationOrchestrator

Orchestrate multiple animations.

```tsx
const { executeAnimation } = useAnimationOrchestrator();

await executeAnimation('my-animation', async () => {
  // Animation logic
});
```

### useSequentialAnimations

Run animations sequentially.

```tsx
const { executeSequence } = useSequentialAnimations();

await executeSequence([
  { id: 'anim1', execute: () => animate1() },
  { id: 'anim2', execute: () => animate2() },
]);
```

### useParallelAnimations

Run animations in parallel.

```tsx
const { executeParallel } = useParallelAnimations();

await executeParallel([
  { id: 'anim1', execute: () => animate1() },
  { id: 'anim2', execute: () => animate2() },
]);
```

### useStaggeredAnimations

Run animations with stagger delay.

```tsx
const { executeStaggered } = useStaggeredAnimations(150);

await executeStaggered([
  { id: 'anim1', execute: () => animate1() },
  { id: 'anim2', execute: () => animate2() },
]);
```

## Configuration

### Animation Durations

```typescript
import { ANIMATION_DURATIONS } from './config/animations';

ANIMATION_DURATIONS.fast;     // 150ms
ANIMATION_DURATIONS.standard; // 250ms
ANIMATION_DURATIONS.slow;     // 350ms
```

### Easing Curves

```typescript
import { EASING } from './config/animations';

EASING.easeInOut; // [0.4, 0.0, 0.2, 1]
EASING.easeOut;   // [0.0, 0.0, 0.2, 1]
EASING.easeIn;    // [0.4, 0.0, 1, 1]
EASING.spring;    // { type: 'spring', stiffness: 300, damping: 30 }
```

### Animation Variants

Pre-configured animation variants are available:

```typescript
import {
  fadeVariants,
  slideVariants,
  scaleVariants,
  successVariants,
  errorVariants,
  hoverVariants,
} from './config/animations';
```

## Accessibility

The animation system fully supports `prefers-reduced-motion`:

1. **Automatic Detection**: The system automatically detects the user's preference
2. **Graceful Degradation**: Animations are disabled or reduced when preferred
3. **Manual Control**: You can manually disable animations via `AnimationProvider`

```tsx
// Disable all animations
<AnimationProvider disableAnimations={true}>
  <App />
</AnimationProvider>
```

## Best Practices

### 1. Use Consistent Durations

Always use the standard durations from the configuration:

```tsx
// ✅ Good
transition={{ duration: ANIMATION_DURATIONS.standard }}

// ❌ Bad
transition={{ duration: 0.3 }}
```

### 2. Respect Reduced Motion

Always use components that respect `prefers-reduced-motion`:

```tsx
// ✅ Good
<AccessibleAnimation animate={{ scale: 1.1 }}>
  <div>Content</div>
</AccessibleAnimation>

// ❌ Bad (doesn't respect preference)
<motion.div animate={{ scale: 1.1 }}>
  <div>Content</div>
</motion.div>
```

### 3. Orchestrate Conflicting Animations

Use the orchestrator for animations that might conflict:

```tsx
// ✅ Good
const { executeAnimation } = useAnimationOrchestrator();
await executeAnimation('element-move', () => moveElement());

// ❌ Bad (might conflict with other animations)
moveElement();
```

### 4. Provide Visual Feedback

Always provide feedback for user actions:

```tsx
// ✅ Good
<SuccessHighlight trigger={saved}>
  <button>Save</button>
</SuccessHighlight>

// ❌ Bad (no feedback)
<button>Save</button>
```

## Examples

See the `examples/` directory for complete examples:

- `AnimationOrchestrationExample.tsx` - Demonstrates animation orchestration
- Check component files for inline examples

## Testing

The animation system includes property-based tests to ensure:

- Consistent animation durations
- Proper reduced motion support
- Correct orchestration behavior

Run tests with:

```bash
npm test
```

## Performance

The animation system is optimized for performance:

- Uses Framer Motion's optimized animation engine
- Respects `will-change` CSS property
- Minimal re-renders with React.memo
- Efficient orchestration with queuing

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with reduced motion detection
