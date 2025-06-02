//context/QueryContext.tsx
import { createContext, useContext } from 'react';

interface QueryContextProps {
  setInputValue: (value: string) => void;
  handleSubmit: (suggestion?: string) => Promise<void>;
}

// Export the context itself
export const QueryContext = createContext<QueryContextProps | null>(null);

export const useQuery = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
};