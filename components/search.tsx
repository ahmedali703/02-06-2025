//components/search.tsx
'use client';

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { Search as SearchIcon, List, Database } from 'lucide-react';
import SideMenu from './SideMenu';

export const Search = ({
  handleSubmit,
  inputValue,
  setInputValue,
  submitted,
  handleClear,
  selectedAction,
  onSelectAction,
  showMenu = true,
}: {
  handleSubmit: () => Promise<void>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  submitted: boolean;
  handleClear: () => void;
  selectedAction: string;
  onSelectAction: (action: string) => void;
  showMenu?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [tagWidth, setTagWidth] = useState(0);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    if (tagRef.current) {
      setTagWidth(tagRef.current.offsetWidth + 12);
    }
  }, [selectedAction]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedAction]);

  const getPlaceholder = () => {
    if (selectedAction === 'Queries') {
      return "Ask Titan (e.g., 'Show salary trends')";
    }
    return "Describe changes (e.g., 'Add a new employee named John')";
  };

  const getTagStyle = () => {
    if (selectedAction === 'Queries') {
      return 'bg-primary/10 text-primary';
    }
    return 'bg-accent/10 text-accent-foreground';
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center space-x-4">
        <div
          className={`relative flex-1 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-700 overflow-hidden rounded-lg transition-all duration-200 ${
            focused ? 'ring-2 ring-[#7B61FF]/20 shadow-sm' : 'ring-0'
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a question about your data..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full h-12 pr-12 pl-4 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-100"
          />
          <SearchIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-gray-400 h-5 w-5" />
        </div>
        {submitted ? (
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary h-12 px-6"
          >
            Clear
          </button>
        ) : (
          <button type="submit" className="btn-primary h-12 px-6">
            Send
          </button>
        )}
      </div>
    </form>
  );
};