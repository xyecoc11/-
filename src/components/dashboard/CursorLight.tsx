'use client';
import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export default function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const unsubscribeX = springX.on('change', (x) => {
      if (ref.current) {
        ref.current.style.left = `${x}px`;
      }
    });
    const unsubscribeY = springY.on('change', (y) => {
      if (ref.current) {
        ref.current.style.top = `${y}px`;
      }
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [springX, springY]);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-0 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 opacity-100"
      style={{
        background: 'radial-gradient(circle, rgba(255,122,0,0.08) 0%, transparent 70%)',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  );
}

