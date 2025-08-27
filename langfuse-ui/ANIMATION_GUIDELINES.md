# Animation Guidelines & CI for OC Prompt Manager

## 🎨 Animation Design System

### Core Principles
1. **Performance First**: All animations use GPU-accelerated properties (transform, opacity)
2. **Meaningful Motion**: Every animation serves a purpose (feedback, guidance, delight)
3. **Consistent Timing**: Follow our duration scale for cohesive experience
4. **Accessibility**: Respect `prefers-reduced-motion` settings

### Animation Libraries
- **GSAP**: Complex sequences, scroll-triggered animations, morphing
- **Anime.js**: Simple transitions, stagger effects, SVG animations

## 🎯 Animation Patterns

### 1. Entrance Animations
```javascript
// Card entrance with stagger
duration: 0.8s
delay: index * 0.1s
ease: 'power3.out'
transform: translateY(50px) → translateY(0)
opacity: 0 → 1
```

### 2. Hover Effects
```javascript
// 3D card tilt
on hover: rotateX(±10deg) rotateY(±10deg)
scale: 1 → 1.03
shadow: enhanced drop-shadow
duration: 0.3s
```

### 3. Click Feedback
```javascript
// Ripple effect from click point
scale: 0 → 20
opacity: 1 → 0
duration: 0.8s
ease: 'easeOutExpo'
```

### 4. Page Transitions
```javascript
// Section reveals on scroll
trigger: IntersectionObserver (threshold: 0.2)
transform: translateY(30px) → translateY(0)
opacity: 0 → 1
duration: 0.6s
```

## ⏱️ Timing Scale

| Type | Duration | Use Case |
|------|----------|----------|
| instant | 150ms | Micro-interactions |
| fast | 300ms | Button hovers, small transitions |
| normal | 500ms | Card animations, reveals |
| slow | 800ms | Page transitions |
| verySlow | 1200ms | Complex sequences |

## 🎭 Easing Functions

### GSAP Easings
- `power2.out` - Default, natural deceleration
- `power3.out` - Stronger deceleration for entrances
- `elastic.out(1, 0.5)` - Playful bounce for emphasis
- `back.out(1.7)` - Slight overshoot for delight

### Anime.js Easings
- `spring(1, 80, 10, 0)` - Natural spring physics
- `easeOutElastic` - Elastic bounce
- `easeInOutQuad` - Smooth acceleration/deceleration

## 🎨 Animation Themes

### Color Animations
- **Primary**: #FB5A17 (Orange) - CTAs, important actions
- **Secondary**: #003145 (Navy) - Headers, navigation
- **Success**: #10B981 (Green) - Confirmations
- **Info**: #3B82F6 (Blue) - Information, stats

### Gradient Morphing
```javascript
// Continuous gradient animation
background: linear-gradient(135deg, color1, color2)
duration: 3s
direction: alternate
loop: infinite
```

## 📱 Responsive Animations

### Mobile Adjustments
- Reduce duration by 40% (baseDuration * 0.6)
- Disable parallax effects
- Simplify complex sequences
- Use transform3d for hardware acceleration

### Performance Optimizations
```javascript
// GPU Acceleration
will-change: transform, opacity
transform: translate3d(0, 0, 0)

// Throttling
requestAnimationFrame for 60fps
debounce scroll events (100ms)
```

## 🔧 Implementation Examples

### 1. Animated Card Component
```jsx
<AnimatedPromptCard
  index={0}
  gradient="from-blue-500/20 to-purple-500/20"
  colorTheme="primary"
  onTagClick={handleTagClick}
/>
```

### 2. Section with Parallax
```jsx
<AnimatedSection
  title="My Prompts"
  count={prompts.length}
  backgroundGradient="from-[#FB5A17]/5 to-[#003145]/5"
  titleGradient="from-[#FB5A17] to-[#003145]"
/>
```

### 3. Interactive Filters
```jsx
<AnimatedSearchBar
  value={query}
  onChange={setQuery}
  placeholder="Search..."
/>

<AnimatedViewToggle
  viewMode={viewMode}
  onChange={setViewMode}
/>
```

## 🚀 Best Practices

### DO's
- ✅ Use CSS transforms over position changes
- ✅ Batch DOM updates with GSAP context
- ✅ Clean up animations on component unmount
- ✅ Test with Chrome DevTools Performance tab
- ✅ Provide immediate visual feedback

### DON'Ts
- ❌ Animate width/height (use scale instead)
- ❌ Chain more than 3 sequential animations
- ❌ Use animations longer than 1s for common actions
- ❌ Animate during data loading
- ❌ Override user's motion preferences

## 🎯 Animation Sequences

### Page Load Sequence
1. Header fade down (0s, 0.6s)
2. Filters slide in from left (0.2s, 0.8s)
3. Search bar scale up (0.4s, 0.6s)
4. Cards stagger in (0.6s+, 0.5s each)

### Filter Change Sequence
1. Old cards fade out (0s, 0.2s)
2. Loading indicator (if needed)
3. New cards stagger in (0.2s+, 0.5s each)

### Modal Open Sequence
1. Overlay fade in (0s, 0.3s)
2. Modal slide up + scale (0.1s, 0.4s)
3. Content fade in (0.3s, 0.3s)

## 📊 Performance Metrics

Target metrics for animations:
- **FPS**: Maintain 60fps during animations
- **Paint time**: < 16ms per frame
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

## 🔍 Testing Checklist

- [ ] Test with Chrome Performance profiler
- [ ] Verify 60fps on mid-range devices
- [ ] Check with prefers-reduced-motion enabled
- [ ] Test on mobile devices (iOS/Android)
- [ ] Validate with screen readers
- [ ] Ensure animations don't block interactions
- [ ] Test with slow network conditions

## 🛠️ Debugging Tips

1. Use Chrome DevTools Rendering tab:
   - Enable "Paint flashing"
   - Monitor "Frame rate"
   - Check "Layer borders"

2. GSAP DevTools:
   - Install GSAP DevTools Chrome extension
   - Monitor timeline performance

3. React DevTools Profiler:
   - Identify unnecessary re-renders
   - Optimize animation triggers

## 📚 Resources

- [GSAP Documentation](https://gsap.com/docs/)
- [Anime.js Documentation](https://animejs.com/documentation/)
- [Web Animation Best Practices](https://web.dev/animations/)
- [Material Design Motion](https://material.io/design/motion/)