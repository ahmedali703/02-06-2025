//components/query-viewer.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Code,
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface QueryViewerProps {
  activeQuery: string;
  title?: string;
  onQueryChange?: (newQuery: string) => void;
}

export const QueryViewer: React.FC<QueryViewerProps> = ({
  activeQuery,
  title = 'Generated SQL Query',
  onQueryChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuery, setEditedQuery] = useState(activeQuery);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedQuery(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Auto-expand when editing starts
  useEffect(() => {
    if (isEditing) {
      setIsCollapsed(false);
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        isEditing ? editedQuery : activeQuery
      );
      setCopied(true);
      toast.success('Query copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy query:', error);
      toast.error('Failed to copy query to clipboard');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsCollapsed(false); // Ensure expanded when editing starts
  };

  const validateQuery = (query: string): boolean => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      toast.error('Query cannot be empty');
      return false;
    }

    if (
      !trimmedQuery.startsWith('WITH') &&
      !trimmedQuery.startsWith('select') &&
      !trimmedQuery.startsWith('insert') &&
      !trimmedQuery.startsWith('update') &&
      !trimmedQuery.startsWith('delete')
    ) {
      toast.error(
        'Query must start with WITH, SELECT, INSERT, UPDATE, or DELETE'
      );
      return false;
    }

    if (trimmedQuery.startsWith('with')) {
      const hasSelect = /with\s+[\s\S]+\s+select\s+/i.test(trimmedQuery);
      if (!hasSelect) {
        toast.error('WITH clause must be followed by a SELECT statement');
        return false;
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validateQuery(editedQuery)) {
      return;
    }

    if (editedQuery === activeQuery) {
      setIsEditing(false);
      return;
    }

    if (onQueryChange) {
      onQueryChange(editedQuery);
    }
    setIsEditing(false);
    toast.success('Query updated successfully');
  };

  const handleCancel = () => {
    setEditedQuery(activeQuery);
    setIsEditing(false);
    toast.info('Changes discarded');
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === 'c' &&
      window.getSelection()?.toString()
    ) {
      handleCopy();
    }
  };

  const toggleExpand = () => {
    if (isEditing) return; // Prevent collapse while editing
    setIsExpanded(!isExpanded);
    setIsCollapsed(false);
  };

  const toggleCollapse = () => {
    if (isEditing) return; // Prevent collapse while editing
    setIsCollapsed(!isCollapsed);
    setIsExpanded(false);
  };

  const renderCodeWithLineNumbers = (code: string) => {
    const lines = code.split('\n');
    const maxLineNumberWidth = String(lines.length).length;

    return (
      <div className="font-mono text-sm leading-6 relative">
        <div
          className="absolute left-0 top-0 bottom-0 flex flex-col items-end pr-4 text-muted-foreground select-none"
          style={{ minWidth: `${maxLineNumberWidth + 2}ch` }}
        >
          {lines.map((_, i) => (
            <div key={i + 1} className="h-6">
              {i + 1}
            </div>
          ))}
        </div>
        <div
          className="pl-[3ch]"
          style={{ marginLeft: `${maxLineNumberWidth}ch` }}
        >
          {lines.map((line, i) => (
            <div key={i} className="h-6">
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      className={`glass-card transition-all duration-300 ${
        isExpanded
          ? 'fixed inset-4 z-50 bg-card/90 backdrop-blur-xl'
          : 'relative'
      }`}
      animate={{
        height: isCollapsed && !isEditing ? '64px' : 'auto',
        overflow: isCollapsed && !isEditing ? 'hidden' : 'visible',
      }}
    >
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium text-foreground">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <span className="text-xs text-muted-foreground mr-2">
                  Press Esc to cancel • Ctrl+Enter to save
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 px-2 text-accent-foreground hover:text-accent-foreground hover:bg-accent/10"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 btn-secondary"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                {onQueryChange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-8 px-2 btn-secondary"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapse}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    disabled={isEditing}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleExpand}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    disabled={isEditing}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        <AnimatePresence>
          {(!isCollapsed || isEditing) && (
            <motion.div
              initial={false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 rounded-md bg-card/30 p-4 text-foreground overflow-x-auto"
            >
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editedQuery}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[100px] bg-transparent font-mono text-sm resize-none focus:outline-none"
                  spellCheck="false"
                  placeholder="Enter your SQL query here..."
                  style={{
                    height: isExpanded ? '60vh' : undefined,
                  }}
                />
              ) : (
                renderCodeWithLineNumbers(activeQuery)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};