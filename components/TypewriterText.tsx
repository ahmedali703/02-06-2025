'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
}

export function TypewriterText({ text }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const getWords = useCallback(() => {
    // Split text into words while preserving punctuation and formatting
    return text.match(/[\w\u0600-\u06FF]+|[^\w\s]|\s+/g) || [];
  }, [text]);

  useEffect(() => {
    if (isPaused || isComplete) return;

    const words = getWords();
    let currentIndex = 0;
    let currentText = '';

    const typeNextWord = () => {
      if (currentIndex < words.length) {
        const word = words[currentIndex];

        // Calculate dynamic delay based on word content
        const delay = getDelay(word, currentIndex === words.length - 1);

        const timeout = setTimeout(() => {
          currentText += word;
          setDisplayedText(currentText);
          currentIndex++;

          if (currentIndex < words.length) {
            typeNextWord();
          } else {
            setIsComplete(true);
          }
        }, delay);

        return () => clearTimeout(timeout);
      }
    };

    typeNextWord();

    return () => {
      setDisplayedText('');
      setIsComplete(false);
    };
  }, [text, isPaused, getWords]);

  const getDelay = (word: string, isLastWord: boolean) => {
    // Natural delays based on content
    if (/[.!?]$/.test(word)) return 400; // End of sentence
    if (/[,;:]$/.test(word)) return 250; // Mid-sentence break
    if (/\n/.test(word)) return 350; // New line
    if (/^[-•]/.test(word)) return 200; // List items
    if (/^\d+\./.test(word)) return 200; // Numbered items
    if (isLastWord) return 300; // Last word

    // Base delay for regular words (faster for shorter words)
    const baseDelay = Math.min(100, word.length * 10);

    // Add slight randomness for natural feel
    return baseDelay + Math.random() * 50;
  };

  const handleClick = () => {
    if (!isComplete) {
      setIsPaused(!isPaused);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="prose prose-invert max-w-none cursor-pointer select-none"
      style={{ whiteSpace: 'pre-wrap' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-white/90 leading-relaxed"
      >
        {displayedText}
        {!isComplete && !isPaused && (
          <span
            className="ml-0.5 inline-block w-0.5 h-4 align-middle bg-current animate-pulse"
            style={{ animationDuration: '1s' }}
          />
        )}
      </motion.div>
      {isPaused && !isComplete && (
        <div className="mt-2 text-sm text-primary/80">
          Click to resume typing...
        </div>
      )}
    </div>
  );
}
