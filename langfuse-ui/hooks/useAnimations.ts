import { useEffect, useRef, useLayoutEffect, MutableRefObject } from 'react';
import { gsap } from 'gsap';
import { AnimationConfig, animationUtils } from '../utils/animationConfig';

// Custom hook for GSAP animations
export const useGSAPAnimation = (
  animation: (element: HTMLElement) => void,
  dependencies: any[] = []
) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const ctx = gsap.context(() => {
      animation(elementRef.current!);
    }, elementRef);

    return () => ctx.revert();
  }, dependencies);

  return elementRef;
};

// Custom hook for GSAP timeline animations
export const useGSAPTimeline = (
  animation: (tl: gsap.core.Timeline, element: HTMLElement) => void,
  dependencies: any[] = []
) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const ctx = gsap.context(() => {
      timelineRef.current = gsap.timeline();
      animation(timelineRef.current, elementRef.current!);
    }, elementRef);

    return () => {
      ctx.revert();
    };
  }, dependencies);

  return { elementRef, timelineRef };
};

// Stagger animation hook for card grids
export const useStaggerAnimation = (
  selector: string,
  config: any = {},
  trigger: boolean = true
) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !trigger || animationUtils.shouldReduceMotion()) {
      return;
    }

    const elements = containerRef.current.querySelectorAll(selector);
    if (elements.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 30,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: animationUtils.getResponsiveDuration(0.5),
          stagger: {
            each: 0.05,
            from: 'start',
          },
          ease: AnimationConfig.easing.smoothOut,
          ...config,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [selector, trigger, config]);

  return containerRef;
};

// Parallax scroll animation hook
export const useParallaxScroll = (speed: number = 0.5) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const handleScroll = () => {
      if (!elementRef.current) return;
      const scrolled = window.pageYOffset;
      const rate = scrolled * speed * -1;
      elementRef.current.style.transform = `translateY(${rate}px)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return elementRef;
};

// Morph gradient animation hook
export const useMorphGradient = (
  colors: string[],
  duration: number = 3
) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    
    colors.forEach((color, i) => {
      if (i > 0) {
        tl.to(elementRef.current, {
          background: color,
          duration: duration / colors.length,
          ease: 'none',
        });
      }
    });

    return () => tl.kill();
  }, [colors, duration]);

  return elementRef;
};

// Intersection observer animation hook
export const useIntersectionAnimation = (
  animationConfig: any,
  options?: IntersectionObserverInit
) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            
            gsap.to(entry.target, {
              ...AnimationConfig.presets.fadeInUp.to,
              duration: animationUtils.getResponsiveDuration(0.6),
              ease: AnimationConfig.easing.smoothOut,
              ...animationConfig,
            });
          }
        });
      },
      options || animationUtils.createIntersectionConfig()
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [animationConfig, options]);

  return elementRef;
};

// Magnetic hover effect hook
export const useMagneticHover = (strength: number = 0.3) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current || animationUtils.shouldReduceMotion()) return;

    const element = elementRef.current;
    let animationId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        gsap.to(element, {
          x: x * strength,
          y: y * strength,
          duration: 0.3,
          ease: AnimationConfig.easing.smoothOut,
        });
      });
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(animationId);
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.3,
        ease: AnimationConfig.easing.elastic,
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [strength]);

  return elementRef;
};

// Text scramble animation hook
export const useTextScramble = (
  text: string,
  trigger: boolean = true
) => {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!elementRef.current || !trigger || animationUtils.shouldReduceMotion()) {
      if (elementRef.current) elementRef.current.textContent = text;
      return;
    }

    const chars = '!<>-_\\/[]{}—=+*^?#________';
    const element = elementRef.current;
    let iteration = 0;

    const interval = setInterval(() => {
      element.textContent = text
        .split('')
        .map((char, index) => {
          if (index < iteration) {
            return text[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      if (iteration >= text.length) {
        clearInterval(interval);
      }

      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [text, trigger]);

  return elementRef;
};