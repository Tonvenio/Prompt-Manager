/**
 * Animation Configuration & Design System
 * Defines consistent animation patterns for the OC Prompt Manager
 */

export const AnimationConfig = {
  // Duration scales
  duration: {
    instant: 0.15,
    fast: 0.3,
    normal: 0.5,
    slow: 0.8,
    verySlow: 1.2,
    stagger: 0.05,
  },

  // Easing functions
  easing: {
    // GSAP easings
    smooth: 'power2.inOut',
    smoothIn: 'power2.in',
    smoothOut: 'power2.out',
    elastic: 'elastic.out(1, 0.5)',
    bounce: 'bounce.out',
    expo: 'expo.out',
    
    // Anime.js easings
    spring: 'spring(1, 80, 10, 0)',
    cubicBezier: 'cubicBezier(0.645, 0.045, 0.355, 1)',
    easeOutQuart: 'easeOutQuart',
    easeInOutExpo: 'easeInOutExpo',
  },

  // Animation presets
  presets: {
    fadeInUp: {
      from: { opacity: 0, y: 30 },
      to: { opacity: 1, y: 0 },
      duration: 0.6,
      ease: 'power2.out',
    },
    fadeInScale: {
      from: { opacity: 0, scale: 0.9 },
      to: { opacity: 1, scale: 1 },
      duration: 0.5,
      ease: 'power2.out',
    },
    slideInLeft: {
      from: { opacity: 0, x: -50 },
      to: { opacity: 1, x: 0 },
      duration: 0.5,
      ease: 'power2.out',
    },
    slideInRight: {
      from: { opacity: 0, x: 50 },
      to: { opacity: 1, x: 0 },
      duration: 0.5,
      ease: 'power2.out',
    },
    rotateIn: {
      from: { opacity: 0, rotate: -10 },
      to: { opacity: 1, rotate: 0 },
      duration: 0.6,
      ease: 'power2.out',
    },
    morphGradient: {
      duration: 3,
      ease: 'none',
      repeat: -1,
      yoyo: true,
    },
  },

  // Stagger configurations
  stagger: {
    cards: {
      each: 0.05,
      from: 'start',
      ease: 'power2.inOut',
    },
    filters: {
      each: 0.03,
      from: 'center',
      ease: 'power2.out',
    },
    tags: {
      each: 0.02,
      from: 'random',
      ease: 'power2.out',
    },
  },

  // Responsive breakpoints for animations
  breakpoints: {
    mobile: {
      maxWidth: 640,
      reducedMotion: true,
      duration: 0.3,
    },
    tablet: {
      maxWidth: 1024,
      reducedMotion: false,
      duration: 0.5,
    },
    desktop: {
      minWidth: 1025,
      reducedMotion: false,
      duration: 0.6,
    },
  },

  // Performance settings
  performance: {
    gpu: true,
    willChange: ['transform', 'opacity'],
    throttle: 16, // 60fps
    debounce: 100,
  },
};

// Animation utility functions
export const animationUtils = {
  // Check for reduced motion preference
  shouldReduceMotion: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get responsive duration
  getResponsiveDuration: (baseDuration: number) => {
    if (typeof window === 'undefined') return baseDuration;
    const width = window.innerWidth;
    if (width <= 640) return baseDuration * 0.6;
    if (width <= 1024) return baseDuration * 0.8;
    return baseDuration;
  },

  // Create scroll trigger config
  createScrollTrigger: (element: string, options = {}) => ({
    trigger: element,
    start: 'top 80%',
    end: 'bottom 20%',
    toggleActions: 'play none none reverse',
    ...options,
  }),

  // Create intersection observer config
  createIntersectionConfig: (threshold = 0.1, rootMargin = '50px') => ({
    root: null,
    rootMargin,
    threshold,
  }),
};

// Brand-specific animation themes
export const AnimationThemes = {
  primary: {
    color: '#FB5A17',
    glow: 'drop-shadow(0 0 20px rgba(251, 90, 23, 0.5))',
    gradient: 'linear-gradient(135deg, #FB5A17, #FF8A50)',
  },
  secondary: {
    color: '#003145',
    glow: 'drop-shadow(0 0 20px rgba(0, 49, 69, 0.3))',
    gradient: 'linear-gradient(135deg, #003145, #005580)',
  },
  success: {
    color: '#10B981',
    glow: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))',
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
  },
  info: {
    color: '#3B82F6',
    glow: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))',
    gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
  },
};

// Export animation sequences for complex animations
export const AnimationSequences = {
  pageEnter: [
    { selector: '.header-banner', animation: 'fadeInUp', delay: 0 },
    { selector: '.filter-section', animation: 'fadeInUp', delay: 0.1 },
    { selector: '.search-bar', animation: 'fadeInScale', delay: 0.2 },
    { selector: '.prompt-card', animation: 'fadeInUp', stagger: true },
  ],
  
  filterChange: [
    { selector: '.prompt-card', animation: 'fadeInScale', stagger: true },
  ],
  
  cardHover: [
    { scale: 1.02, duration: 0.3, ease: 'power2.out' },
    { boxShadow: '0 20px 40px rgba(0,0,0,0.15)', duration: 0.3 },
  ],
  
  modalOpen: [
    { selector: '.modal-overlay', animation: 'fadeIn', duration: 0.3 },
    { selector: '.modal-content', animation: 'slideInUp', duration: 0.4 },
  ],
};