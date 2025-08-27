"use client";

import React, { useRef, useEffect, ReactNode } from 'react';
import { gsap } from 'gsap';

interface AnimatedSectionProps {
  children: ReactNode;
  title: string;
  count?: number;
  countLabel?: string;
  actionButton?: ReactNode;
  backgroundGradient: string;
  titleGradient: string;
  badgeColors?: string;
  delay?: number;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  title,
  count,
  countLabel,
  actionButton,
  backgroundGradient,
  titleGradient,
  badgeColors = 'from-[#FB5A17]/20 to-[#FB5A17]/10 text-[#FB5A17] border-[#FB5A17]/20',
  delay = 0,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    // Intersection observer for scroll-triggered animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate background gradient
            if (bgRef.current) {
              gsap.fromTo(
                bgRef.current,
                { opacity: 0, scale: 0.8 },
                {
                  opacity: 1,
                  scale: 1,
                  duration: 1.2,
                  delay: delay,
                  ease: 'power2.out',
                }
              );
            }

            // Animate title with text reveal
            if (titleRef.current) {
              const text = titleRef.current.textContent || '';
              titleRef.current.textContent = '';
              
              const obj = { value: 0 };
              gsap.to(obj, {
                value: text.length,
                duration: 1,
                delay: delay + 0.2,
                ease: 'expo.out',
                onUpdate: function() {
                  if (titleRef.current) {
                    titleRef.current.textContent = text.slice(0, Math.round(obj.value));
                  }
                }
              });

              // Gradient animation
              gsap.to(titleRef.current, {
                backgroundPosition: '200% center',
                duration: 3,
                repeat: -1,
                ease: 'linear',
              });
            }

            // Badge bounce animation
            if (badgeRef.current && count !== undefined) {
              gsap.fromTo(
                badgeRef.current,
                { scale: 0, rotate: -180 },
                {
                  scale: 1,
                  rotate: 0,
                  duration: 0.6,
                  delay: delay + 0.5,
                  ease: 'back.out(1.7)',
                }
              );

              // Count up animation
              const countObj = { value: 0 };
              gsap.to(countObj, {
                value: count,
                duration: 1.5,
                delay: delay + 0.6,
                ease: 'expo.out',
                onUpdate: function() {
                  const current = Math.round(countObj.value);
                  if (badgeRef.current) {
                    const label = current === 1 ? (countLabel || 'prompt') : (countLabel || 'prompts');
                    badgeRef.current.textContent = `${current} ${label}`;
                  }
                }
              });
            }

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, [title, count, countLabel, delay]);

  // Parallax effect on mouse move
  useEffect(() => {
    if (!bgRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!bgRef.current) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xPos = (clientX / innerWidth - 0.5) * 20;
      const yPos = (clientY / innerHeight - 0.5) * 20;
      
      gsap.to(bgRef.current, {
        x: xPos,
        y: yPos,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={sectionRef} className="relative">
      <div 
        ref={bgRef}
        className={`absolute inset-0 bg-gradient-to-br ${backgroundGradient} rounded-3xl -m-4`} 
      />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              ref={titleRef}
              className={`text-2xl font-bold bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}
              style={{ backgroundSize: '200% auto' }}
            >
              {title}
            </span>
            {count !== undefined && (
              <span 
                ref={badgeRef}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${badgeColors} border`}
              >
                {count} {count === 1 ? (countLabel || 'prompt') : (countLabel || 'prompts')}
              </span>
            )}
          </div>
          {actionButton}
        </div>
        {children}
      </div>
    </div>
  );
};