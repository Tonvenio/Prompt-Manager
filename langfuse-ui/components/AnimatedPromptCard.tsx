"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { TagPills } from '../app/prompts/TagPills';

interface PromptSummary {
  name: string;
  lastUpdatedAt: string | number | Date;
  tags?: string[];
}

interface AnimatedPromptCardProps {
  prompt: PromptSummary;
  index: number;
  gradient: string;
  pattern: string;
  folder: string;
  restName: string;
  onTagClick: (tag: string) => void;
  openDetails: (name: string) => void;
  socialSummary: { comments: number; reactions: number };
  colorTheme?: 'primary' | 'cyan' | 'purple' | 'yellow';
}

export const AnimatedPromptCard: React.FC<AnimatedPromptCardProps> = ({
  prompt,
  index,
  gradient,
  pattern,
  folder,
  restName,
  onTagClick,
  openDetails,
  socialSummary,
  colorTheme = 'primary'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current) return;

    // Initial state
    gsap.set(cardRef.current, {
      opacity: 0,
      y: 50,
      scale: 0.9,
      rotateX: -15,
    });

    // Animate in with delay based on index
    gsap.to(cardRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      duration: 0.8,
      delay: index * 0.1,
      ease: 'power3.out',
    });

    // Animate content elements
    if (contentRef.current) {
      const elements = contentRef.current.children;
      gsap.fromTo(
        elements,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          delay: index * 0.1 + 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        }
      );
    }
  }, [index]);

  // Hover animations
  useEffect(() => {
    if (!cardRef.current || !glowRef.current || !buttonRef.current) return;

    const card = cardRef.current;
    const glow = glowRef.current;
    const button = buttonRef.current;
    
    let mouseX = 0;
    let mouseY = 0;
    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;

      // Cancel previous frame
      if (animationFrame) cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        // 3D tilt effect
        const tiltX = (mouseY - 0.5) * 10;
        const tiltY = (mouseX - 0.5) * -10;

        gsap.to(card, {
          rotateX: tiltX,
          rotateY: tiltY,
          duration: 0.3,
          ease: 'power2.out',
        });

        // Move glow to cursor position
        gsap.to(glow, {
          background: `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(251, 90, 23, 0.3), transparent 60%)`,
          duration: 0.3,
        });
      });
    };

    const handleMouseEnter = () => {
      // Scale up animation
      gsap.to(card, {
        scale: 1.03,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Glow fade in
      gsap.to(glow, {
        opacity: 1,
        duration: 0.3,
      });

      // Button pulse using keyframes (typesafe)
      gsap.to(button, {
        keyframes: [
          { scale: 1 },
          { scale: 1.1 },
          { scale: 1 },
        ],
        duration: 0.6,
        ease: 'power2.inOut',
      });

      // Stats bounce
      if (statsRef.current) {
        const statElements = statsRef.current.children;
        gsap.to(statElements, {
          keyframes: [
            { y: -3 },
            { y: 0 },
          ],
          duration: 0.4,
          stagger: 0.05,
          ease: 'elastic.out(1, 0.5)',
        });
      }
    };

    const handleMouseLeave = () => {
      // Reset all transforms
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });

      gsap.to(glow, {
        opacity: 0,
        duration: 0.3,
      });
    };

    const handleClick = () => {
      // Ripple effect
      const ripple = document.createElement('div');
      ripple.className = 'absolute inset-0 overflow-hidden rounded-2xl pointer-events-none';
      
      const rippleInner = document.createElement('div');
      rippleInner.className = 'absolute bg-white/30 rounded-full';
      rippleInner.style.width = '20px';
      rippleInner.style.height = '20px';
      rippleInner.style.left = `${mouseX * 100}%`;
      rippleInner.style.top = `${mouseY * 100}%`;
      rippleInner.style.transform = 'translate(-50%, -50%)';
      
      ripple.appendChild(rippleInner);
      card.appendChild(ripple);

      gsap.fromTo(rippleInner, 
        { scale: 0, opacity: 1 },
        { 
          scale: 20, 
          opacity: 0, 
          duration: 0.8, 
          ease: 'expo.out',
          onComplete: () => ripple.remove()
        }
      );

      // Card press effect
      gsap.to(card, {
        keyframes: [
          { scale: 1 },
          { scale: 0.98 },
          { scale: 1 },
        ],
        duration: 0.2,
        ease: 'power2.inOut',
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('click', handleClick);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('click', handleClick);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  const themeColors = {
    primary: {
      border: 'border-[#003145]/10',
      folderBg: 'from-[#003145]/10 to-[#003145]/5',
      folderText: 'text-[#003145]',
      buttonBg: 'from-[#FB5A17] to-[#FF8A50]',
    },
    cyan: {
      border: 'border-cyan-600/10',
      folderBg: 'from-cyan-600/10 to-blue-600/5',
      folderText: 'text-cyan-700',
      buttonBg: 'from-cyan-600 to-blue-600',
    },
    purple: {
      border: 'border-purple-500/10',
      folderBg: 'from-purple-600/10 to-pink-600/5',
      folderText: 'text-purple-700',
      buttonBg: 'from-purple-600 to-pink-600',
    },
    yellow: {
      border: 'border-yellow-500/20',
      folderBg: 'from-yellow-100 to-amber-50',
      folderText: 'text-amber-700',
      buttonBg: 'from-yellow-500 to-orange-500',
    },
  } as const;

  const theme = themeColors[colorTheme];

  return (
    <div 
      ref={cardRef}
      onClick={() => openDetails(prompt.name)} 
      className="group relative cursor-pointer perspective-1000"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div 
        ref={glowRef}
        className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 50% 50%, rgba(251, 90, 23, 0.3), transparent 60%)` }}
      />
      
      <div className={`relative rounded-2xl ${theme.border} bg-white/90 backdrop-blur-sm shadow-lg overflow-hidden`}>
        <div className="absolute inset-0 opacity-30" style={{ background: pattern }} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FB5A17]/10 to-transparent rounded-full -mr-16 -mt-16" />
        
        <div className="relative">
          <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />
          <div ref={contentRef} className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${theme.folderBg} ${theme.folderText} border ${theme.border}`}>
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {folder}
              </span>
              <span className="text-[11px] text-[#003145]/50 font-medium">
                {new Date(prompt.lastUpdatedAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="mb-3">
              <h3 className="text-xl font-bold text-[#003145] tracking-tight mb-1 line-clamp-2">
                {restName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#003145]/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updated {new Date(prompt.lastUpdatedAt).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="mb-4">
              <TagPills tags={prompt.tags || []} onTagClick={onTagClick} />
            </div>
            
            <div className="flex items-center justify-between">
              <div ref={statsRef} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {socialSummary.reactions}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {socialSummary.comments}
                </span>
              </div>
              
              <button 
                ref={buttonRef}
                type="button" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  openDetails(prompt.name); 
                }} 
                className={`group/btn relative px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r ${theme.buttonBg} shadow-md transform transition-all duration-200`}
              >
                <span className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                <span className="relative">Open</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};