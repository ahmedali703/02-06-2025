//components/SearchContext.tsx
'use client';

import { createContext, useContext, useCallback, useState } from 'react';

interface SearchContextType {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: () => Promise<void>;
  handleClear: () => void;
  selectedAction: string;
  onSelectAction: (action: string) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedAction, setSelectedAction] = useState('Queries');

  const handleSubmit = useCallback(async () => {
    // Add your submit logic here
    console.log('Submitting:', inputValue);
  }, [inputValue]);

  const handleClear = useCallback(() => {
    setInputValue('');
  }, []);

  const onSelectAction = useCallback((action: string) => {
    setSelectedAction(action);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        inputValue,
        setInputValue,
        handleSubmit,
        handleClear,
        selectedAction,
        onSelectAction,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};