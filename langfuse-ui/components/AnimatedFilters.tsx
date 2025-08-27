"use client";

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

interface AnimatedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AnimatedSearchBar: React.FC<AnimatedSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search name, tags, and full prompt content…"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initial animation
    gsap.fromTo(
      containerRef.current,
      { width: '0%', opacity: 0 },
      { width: '100%', opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 }
    );

    // Icon rotation animation
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotate: 360,
        duration: 1,
        delay: 0.8,
        ease: 'power2.inOut',
      });
    }
  }, []);

  useEffect(() => {
    if (!iconRef.current) return;

    if (isFocused) {
      // Continuous rotation when focused
      gsap.to(iconRef.current, {
        rotate: '+=360',
        duration: 2,
        repeat: -1,
        ease: 'none',
      });
    } else {
      gsap.killTweensOf(iconRef.current);
      gsap.to(iconRef.current, {
        rotate: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });
    }
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: '0 0 0 3px rgba(251, 90, 23, 0.2)',
        duration: 0.3,
      });
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: 'none',
        duration: 0.3,
      });
    }
  };

  return (
    <div ref={containerRef} className="relative mb-4 rounded-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#FB5A17]/5 via-transparent to-[#003145]/5 animate-pulse" />
      <div className="relative flex items-center">
        <svg
          ref={iconRef}
          className="absolute left-3 w-5 h-5 text-[#003145]/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          className="w-full pl-10 pr-3 py-3 rounded-lg border border-[#003145]/30 focus:outline-none focus:border-[#FB5A17] transition-all duration-300 bg-white/80 backdrop-blur-sm"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {value && (
          <button
            className="absolute right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => onChange('')}
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

interface AnimatedFilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  index: number;
}

export const AnimatedFilterPill: React.FC<AnimatedFilterPillProps> = ({
  label,
  active,
  onClick,
  index
}) => {
  const pillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pillRef.current) return;

    // Entrance animation
    gsap.fromTo(
      pillRef.current,
      { scale: 0, rotate: -180, opacity: 0 },
      {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.5,
        delay: index * 0.05,
        ease: 'back.out(1.7)',
      }
    );
  }, [index]);

  useEffect(() => {
    if (!pillRef.current) return;

    if (active) {
      // Active state animation using keyframes to satisfy types
      gsap.to(pillRef.current, {
        keyframes: [
          { scale: 1 },
          { scale: 1.05 },
          { scale: 1 },
        ],
        backgroundColor: '#FF8A50',
        duration: 0.6,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 1,
      });
    }
  }, [active]);

  const handleClick = () => {
    if (pillRef.current) {
      // Click animation using keyframes
      gsap.to(pillRef.current, {
        keyframes: [
          { scale: 1 },
          { scale: 0.95 },
          { scale: 1.1 },
          { scale: 1 },
        ],
        duration: 0.4,
        ease: 'elastic.out(1, 0.5)',
      });
    }
    onClick();
  };

  return (
    <button
      ref={pillRef}
      onClick={handleClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-[#FB5A17] text-white shadow-lg' 
          : 'bg-white text-[#003145] border border-[#003145]/20 hover:border-[#FB5A17] hover:shadow-md'
      }`}
    >
      {label}
    </button>
  );
};

interface AnimatedViewToggleProps {
  viewMode: 'table' | 'bento';
  onChange: (mode: 'table' | 'bento') => void;
}

export const AnimatedViewToggle: React.FC<AnimatedViewToggleProps> = ({
  viewMode,
  onChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sliderRef.current) return;

    const isTable = viewMode === 'table';
    gsap.to(sliderRef.current, {
      x: isTable ? 0 : '100%',
      duration: 0.3,
      ease: 'power2.inOut',
    });
  }, [viewMode]);

  const handleToggle = (mode: 'table' | 'bento') => {
    // Haptic-like animation
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        keyframes: [{ scale: 1 }, { scale: 0.98 }, { scale: 1 }],
        duration: 0.2,
        ease: 'power2.inOut',
      });
    }
    onChange(mode);
  };

  return (
    <div ref={containerRef} className="flex items-center gap-1 rounded-full bg-[#003145]/5 p-1 relative">
      <div 
        ref={sliderRef}
        className="absolute left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-full shadow transition-transform"
      />
      <button
        type="button"
        onClick={() => handleToggle('table')}
        className={`relative z-10 px-3 py-1.5 rounded-full text-sm transition-colors duration-200 ${
          viewMode === 'table' ? 'text-[#003145]' : 'text-[#003145]/70 hover:text-[#003145]'
        }`}
      >
        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Table
      </button>
      <button
        type="button"
        onClick={() => handleToggle('bento')}
        className={`relative z-10 px-3 py-1.5 rounded-full text-sm transition-colors duration-200 ${
          viewMode === 'bento' ? 'text-[#003145]' : 'text-[#003145]/70 hover:text-[#003145]'
        }`}
      >
        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Bento
      </button>
    </div>
  );
};