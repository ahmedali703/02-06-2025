//app/chat/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Markdown from 'react-markdown';
import { Header } from '@/components/header';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Match {
  content: string;
  score: number;
  explanation: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isNotAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStreaming = async () => {
    if (!userInput.trim()) return;
  
    const newMessage: Message = {
      sender: 'user',
      text: userInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  
    const botMessage: Message = {
      sender: 'bot',
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setMessages((prev) => [...prev, botMessage]);
    setLoading(true);
    setUserInput('');
  
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_input: userInput, 
          top_k: 5, 
          stream: true
        }),
        signal: abortControllerRef.current.signal,
      });
  
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status} ${response.statusText}`);
      }
  
      if (!response.body) {
        throw new Error('Response body is empty');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessageText = '';
      let buffer = '';
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
  
            if (data.matches) {
              setMatches(data.matches);
              continue;
            }
  
            if (data.content) {
              botMessageText += data.content;
              setMessages((prevMessages) => 
                prevMessages.map((msg, i) => {
                  if (i === prevMessages.length - 1 && msg.sender === 'bot') {
                    return { ...msg, text: botMessageText, isStreaming: true };
                  }
                  return msg;
                })
              );
            }
  
            if (data.done) {
              setMessages((prevMessages) => 
                prevMessages.map((msg, i) => {
                  if (i === prevMessages.length - 1 && msg.sender === 'bot') {
                    return { ...msg, isStreaming: false };
                  }
                  return msg;
                })
              );
            }
  
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing streaming data:', e);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setMessages((prevMessages) => 
          prevMessages.map((msg, i) => {
            if (i === prevMessages.length - 1 && msg.sender === 'bot') {
              return {
                ...msg,
                text: 'Sorry, an error occurred while processing your request. Please try again.',
                isStreaming: false
              };
            }
            return msg;
          })
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    await handleStreaming();
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        <Header />
        
        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth pt-4 pb-24"
        >
          <div className="max-w-3xl mx-auto px-4 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to AI Chat</h1>
                  <p className="text-muted-foreground">Ask me anything about your data!</p>
                </motion.div>
              )}
              
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.sender === 'user'
                        ? 'bg-primary/10 text-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    }`}
                  >
                    {msg.sender === 'bot' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{msg.text}</Markdown>
                        {msg.isStreaming && (
                          <span className="inline-block ml-1 animate-pulse">▌</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        msg.sender === 'user' ? 'text-primary/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}

              {loading && !messages[messages.length - 1]?.isStreaming && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              <ChevronDown className="h-6 w-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={userInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setUserInput(e.target.value)
                }
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Type your message here..."
                className="flex-1 h-12 bg-muted/50 border border-input rounded-lg px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !userInput.trim()}
                className="h-12 px-6 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-5 w-5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--primary);
          opacity: 0.6;
          animation: typing-bounce 1.4s infinite ease-in-out both;
        }
        
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: scale(0.6); }
          40% { transform: scale(1); }
        }
        
        .prose {
          max-width: none;
        }
        
        .prose p { margin-bottom: 0.75rem; }
        
        .prose ul, .prose ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .prose ul { list-style-type: disc; }
        .prose ol { list-style-type: decimal; }
        
        .prose h1, .prose h2, .prose h3, 
        .prose h4, .prose h5, .prose h6 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          line-height: 1.25;
        }
        
        .prose code {
          background-color: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 85%;
          font-family: monospace;
        }
        
        .prose pre {
          background-color: hsl(var(--muted));
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        
        .prose pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        
        .prose blockquote {
          border-left: 4px solid hsl(var(--primary) / 0.2);
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
        }
        
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .prose th, .prose td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          text-align: left;
        }
        
        .prose th {
          background-color: hsl(var(--muted));
        }
      `}</style>
    </div>
  );
}