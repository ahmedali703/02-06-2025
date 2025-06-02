import React from 'react';
import { motion } from 'framer-motion';

interface AISpinnerProps {
  message?: string;
  size?: number;
}

export const AISpinner: React.FC<AISpinnerProps> = ({ 
  message = 'Thinking...',
  size = 60 
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      <motion.div
        className="relative"
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.5, 1],
        }}
        style={{ 
          width: size, 
          height: size 
        }}
      >
        {/* Outer Ring */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 stroke-primary/30"
          fill="none"
          strokeWidth="8"
        >
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            strokeDasharray="283"
            strokeDashoffset="283"
          />
        </svg>

        {/* Active Ring */}
        <motion.svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 stroke-primary"
          fill="none"
          strokeWidth="8"
          initial={{ strokeDashoffset: 283 }}
          animate={{ 
            strokeDashoffset: [283, 0, 283],
            rotate: [0, 360, 720]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1],
          }}
        >
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            strokeDasharray="283"
          />
        </motion.svg>

        {/* Brain/Thinking Icon */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-primary"
          style={{ 
            width: size, 
            height: size 
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            className="w-8 h-8"
          >
            <path d="M9.1 10.5C9.4 9.9 10 9.5 10.7 9.5H13.3C14 9.5 14.6 9.9 14.9 10.5L16 13H8L9.1 10.5Z" />
            <path d="M4 12h2M18 12h2M16 20V22H8V20" />
            <path d="M16 4V2H8V4" />
            <path d="M8 16H4C2.9 16 2 15.1 2 14V10C2 8.9 2.9 8 4 8H20C21.1 8 22 8.9 22 10V14C22 15.1 21.1 16 20 16H16" />
          </svg>
        </div>
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};