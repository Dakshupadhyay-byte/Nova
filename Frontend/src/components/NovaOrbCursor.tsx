import React, { useEffect, useRef, useState } from 'react';
import './NovaOrbCursor.css';

/**
 * NovaOrbCursor
 * A modern, minimal, futuristic glowing NOVA Orb that replaces the default mouse cursor
 * on fine pointer devices while fully respecting prefers-reduced-motion accessibility.
 */
export const NovaOrbCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const isVisible = useRef(false);
  const isHovered = useRef(false);
  const isClicking = useRef(false);
  const clickTimeout = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  // Check if device supports hover and fine pointer (desktop mouse / precision trackpad)
  const [isSupportedPointer, setIsSupportedPointer] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  // Detect user preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const reducedMotionRef = useRef(prefersReducedMotion);
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  // Monitor pointer capability changes (e.g. plugging/unplugging mouse or devtools device emulation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handlePointerChange = (e: MediaQueryListEvent) => {
      setIsSupportedPointer(e.matches);
    };

    if (pointerQuery.addEventListener) {
      pointerQuery.addEventListener('change', handlePointerChange);
    } else {
      pointerQuery.addListener(handlePointerChange);
    }

    return () => {
      if (pointerQuery.removeEventListener) {
        pointerQuery.removeEventListener('change', handlePointerChange);
      } else {
        pointerQuery.removeListener(handlePointerChange);
      }
    };
  }, []);

  // Monitor OS / browser prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }

    return () => {
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else {
        motionQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  // Main cursor motion, hover detection, and interaction handlers
  useEffect(() => {
    if (!isSupportedPointer) return;

    const INTERACTIVE_SELECTOR = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="option"]',
      'label[for]',
      'summary',
      '.cursor-pointer',
      '[data-cursor-hover]',
      '[style*="cursor: pointer"]',
      '[style*="cursor:pointer"]',
    ].join(',');

    const updateVisibility = (visible: boolean) => {
      isVisible.current = visible;
      if (containerRef.current) {
        containerRef.current.classList.toggle('nova-orb-visible', visible);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore touch pointers or non-mouse/fine input
      if (e.pointerType === 'touch') return;

      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;

      if (!isVisible.current) {
        updateVisibility(true);
      }

      // If reduced motion is enabled, snap position immediately with zero lag/smoothing
      if (reducedMotionRef.current && containerRef.current) {
        currentPos.current.x = e.clientX;
        currentPos.current.y = e.clientY;
        containerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Detect interactive elements under the cursor
      const target = e.target as Element | null;
      const interactive = Boolean(target && target.closest(INTERACTIVE_SELECTOR));
      if (interactive !== isHovered.current) {
        isHovered.current = interactive;
        if (containerRef.current) {
          containerRef.current.classList.toggle('nova-orb-hover', interactive);
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (reducedMotionRef.current) return; // Disable click animations in reduced motion mode

      isClicking.current = true;
      if (containerRef.current) {
        containerRef.current.classList.add('nova-orb-clicking');
      }
    };

    const handlePointerUp = () => {
      if (clickTimeout.current) {
        window.clearTimeout(clickTimeout.current);
      }
      clickTimeout.current = window.setTimeout(() => {
        isClicking.current = false;
        if (containerRef.current) {
          containerRef.current.classList.remove('nova-orb-clicking');
        }
      }, 160);
    };

    const handleDocumentLeave = (e: MouseEvent) => {
      // Hide if mouse left the viewport window
      if (!e.relatedTarget) {
        updateVisibility(false);
      }
    };

    const handleDocumentEnter = (e: MouseEvent) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;
      currentPos.current.x = e.clientX;
      currentPos.current.y = e.clientY;
      updateVisibility(true);
    };

    const handleWindowBlur = () => {
      updateVisibility(false);
    };

    // Animation frame loop for smooth, responsive movement
    const renderLoop = () => {
      if (containerRef.current && isVisible.current) {
        if (reducedMotionRef.current) {
          // Instant 1:1 positioning without lag or animation
          currentPos.current.x = targetPos.current.x;
          currentPos.current.y = targetPos.current.y;
        } else {
          // Smooth, responsive interpolation (lerp = 0.28)
          const dx = targetPos.current.x - currentPos.current.x;
          const dy = targetPos.current.y - currentPos.current.y;
          currentPos.current.x += dx * 0.28;
          currentPos.current.y += dy * 0.28;
        }

        containerRef.current.style.transform = `translate3d(${currentPos.current.x.toFixed(2)}px, ${currentPos.current.y.toFixed(2)}px, 0)`;
      }

      rafId.current = requestAnimationFrame(renderLoop);
    };

    // Attach listeners with passive flag for high performance and non-blocking interactions
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleDocumentLeave);
    document.addEventListener('mouseenter', handleDocumentEnter);
    window.addEventListener('blur', handleWindowBlur);

    rafId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleDocumentLeave);
      document.removeEventListener('mouseenter', handleDocumentEnter);
      window.removeEventListener('blur', handleWindowBlur);

      if (clickTimeout.current) {
        window.clearTimeout(clickTimeout.current);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isSupportedPointer]);

  // Don't render cursor markup on touch or coarse pointer devices
  if (!isSupportedPointer) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`nova-orb-container ${prefersReducedMotion ? 'nova-orb-reduced-motion' : ''}`}
      aria-hidden="true"
      role="presentation"
    >
      {/* 4. Restrained outer glow */}
      <div className="nova-orb-aura" />
      {/* 3. Thin outer ring */}
      <div className="nova-orb-ring" />
      {/* 2. Inner halo */}
      <div className="nova-orb-glow" />
      {/* 1. Tiny bright core */}
      <div className="nova-orb-core nova-orb" />
      {/* Subtle click ripple */}
      <div className="nova-orb-ripple" />
    </div>
  );
};

export default NovaOrbCursor;
