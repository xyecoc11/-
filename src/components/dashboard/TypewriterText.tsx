'use client';
import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

export default function TypewriterText({ text, speed = 50 }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const controls = useAnimation();

  useEffect(() => {
    setDisplayed('');
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayed(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <motion.p
      animate={controls}
      className="text-sm font-medium text-slate-200"
    >
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-0.5 h-4 bg-[var(--amber-400)] ml-1"
      />
    </motion.p>
  );
}

