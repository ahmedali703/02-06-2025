'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sparkles, RefreshCw, HelpCircle, Mic } from 'lucide-react';

interface ActionButtonsProps {
  onRefresh: () => void;
  isGenerating: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onRefresh, isGenerating }) => {
  return (
    <div className="flex space-x-2">
      <button
        onClick={onRefresh}
        disabled={isGenerating}
        className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Refresh"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
      
      <button
        className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Create Dashboard"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      
      <button
        className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Help"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      
      <button
        className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Voice Input"
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ActionButtons;
