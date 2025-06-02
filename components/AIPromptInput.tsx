'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

const AIPromptInput: React.FC<AIPromptInputProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  isGenerating 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };
  
  return (
    <div className={`relative rounded-lg border ${isFocused ? 'border-ring ring-2 ring-ring/30' : 'border-input'}`}>
      <div className="flex items-center px-3 py-2">
        <Sparkles className="w-5 h-5 text-primary mr-2" />
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="create a dashboard for employee statistics"
          className="flex-1 outline-none bg-transparent text-foreground input-field border-0 p-0 focus:ring-0"
          disabled={isGenerating}
        />
        
        {isGenerating ? (
          <div className="flex items-center text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </div>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className={`px-3 py-1 rounded-full text-sm ${
              value.trim() 
                ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Fast
          </button>
        )}
      </div>
      
      {isGenerating && (
        <div className="absolute top-0 left-0 w-full -mt-8 text-center">
          <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
            <Sparkles className="w-4 h-4 inline mr-1" />
            AI is generating, please don't navigate away.
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPromptInput;
