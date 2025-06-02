//components/suggested-queries.tsx
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { ChevronRight, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@/context/QueryContext';

interface SuggestedQueriesProps {
  selectedAction: 'Queries' | 'Data Action';
}

export const SuggestedQueries: React.FC<SuggestedQueriesProps> = ({
  selectedAction,
}) => {
  const { setInputValue, handleSubmit } = useQuery(); // استدعاء الدوال من الـ Context

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // استخدام نقطة API لاسترجاع مخطط قاعدة البيانات الديناميكي
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);

      try {
        // جلب المخطط الديناميكي من نقطة API الجديدة
        const schemaResponse = await fetch('/api/schema-summary');
        const { schemaSummary } = await schemaResponse.json();

        // استخدام LLM لإنشاء الاقتراحات بناءً على المخطط الديناميكي
        const response = await fetch('/api/generate-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemaSummary, selectedAction }),
        });

        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [selectedAction]);

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      layout
      exit={{ opacity: 0 }}
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        {selectedAction === 'Data Action'
          ? 'Try these data actions:'
          : 'Try these queries:'}
      </h2>
      {loading ? (
        <div className="flex items-center justify-center p-8 glass-card">
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
          <span className="ml-3 text-muted-foreground">Loading suggestions...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              className="glass-card overflow-hidden hover-glow transition-all duration-200"
              initial={false}
              animate={{
                height: expandedIndex === index ? 'auto' : 'auto',
                transition: { duration: 0.2 },
              }}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer border-b border-border"
                onClick={() =>
                  setExpandedIndex(expandedIndex === index ? null : index)
                }
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {suggestion.mobile}
                    </h3>
                    {expandedIndex !== index && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {suggestion.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200
                      ${expandedIndex === index ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {expandedIndex === index && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-4 pt-1"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                    </div>
                    <p className="text-sm text-foreground font-mono bg-primary/5 p-3 rounded-md">
                      {suggestion.desktop}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setInputValue(suggestion.desktop); // تحديث الإدخال
                          await handleSubmit(suggestion.desktop); // تنفيذ الاستعلام
                        }}
                        className="btn-primary h-10 px-4"
                      >
                        Use this query
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
