//app/aiquery/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { QueryContext } from '../../context/QueryContext';
import { DatabaseSelector } from '../../components/database-selector';
import { Sidebar } from '../../components/sidebar';
import { TableView } from '../../components/table-view';

import {
  generateChartConfig,
  generateQuery,
  generateDMLQuery,
  runGenerateSQLQuery,
  runDMLQuery,
  explainQuery,
  generateEmailDescription,
  generateDatabaseActionReport,
  AIModel,
} from './actions';
import { Config, Result } from '../../lib/types';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Info,
  AlertTriangle,
  BarChart2,
  BarChart3,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  XCircle,
  RefreshCw,
  Edit,
  MessageCircle,
  LogOut,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Results } from '../../components/results';
import { SuggestedQueries } from '../../components/suggested-queries';
import { QueryViewer } from '../../components/query-viewer';
import { Search } from '../../components/search';
import EmailModal from '../../components/EmailModal';
import { AISpinner } from '../../components/ai-spinner';

const cleanHtmlTags = (text: string) => {
  return text.replace(/<[^>]*>/g, '');
};

const TypewriterText = ({ text }: { text: string }) => {
  const cleanText = cleanHtmlTags(text);

  const sections = cleanText.split(/\d+\.\s+/).filter(Boolean);
  const titles = cleanText.match(/\d+\.\s+([^\n]+)/g) || [];
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [displayedChars, setDisplayedChars] = useState<number[]>(
    new Array(sections.length).fill(0)
  );
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentSectionIndex >= sections.length) {
      setIsComplete(true);
      return;
    }

    const currentSection = sections[currentSectionIndex];
    const interval = setInterval(() => {
      setDisplayedChars((prev) => {
        const newChars = [...prev];
        if (newChars[currentSectionIndex] < currentSection.length) {
          newChars[currentSectionIndex]++;
          return newChars;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentSectionIndex((prev) => prev + 1);
          }, 500);
          return prev;
        }
      });
    }, 20);

    return () => clearInterval(interval);
  }, [currentSectionIndex, sections]);

  const icons = [
    ClipboardList,
    Info,
    AlertTriangle,
    BarChart2,
    AlertCircle,
    FileText,
  ];

  return (
    <div className="glass-card p-6 rounded-lg space-y-6">
      {sections.map((section, index) => {
        const title = titles[index]?.replace(/^\d+\.\s+/, '') || '';
        const content = section.replace(title, '').trim();
        const Icon = icons[index] || Info;
        const isCurrentSection = index <= currentSectionIndex;
        const displayedContent = content.slice(0, displayedChars[index]);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isCurrentSection ? 1 : 0,
              y: isCurrentSection ? 0 : 20,
            }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {title}
              </h3>
            </div>
            <div className="pl-10">
              <span className="text-muted-foreground text-base leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                {displayedContent}
              </span>
              {isCurrentSection && displayedChars[index] < content.length && (
                <span className="animate-pulse">|</span>
              )}
            </div>
          </motion.div>
        );
      })}

      {isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 p-4 rounded-lg mt-4 bg-accent/10"
        >
          <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
          <p className="text-sm text-accent-foreground">
            The database has been updated successfully. You can now run queries
            to verify the changes.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default function Page() {
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState('');
  const [actionReport, setActionReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [chartConfig, setChartConfig] = useState<Config | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>('openai');
  const [selectedAction, setSelectedAction] = useState<'Queries' | 'Data Action'>('Queries');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);
  const [tabs, setTabs] = useState<{id: string; name: string; type: 'query' | 'table' | 'edit'; data?: any}[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, any>>({});
  const [userData, setUserData] = useState({ 
    name: 'Loading...', 
    email: 'Please wait...',
    role: '',
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0 
  });

  // Fetch user data and dashboard stats
  useEffect(() => {
    // Function to fetch user data
    const fetchUserData = async () => {
      try {
        // Fetch user data
        const userResponse = await fetch('/api/user/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Fetch dashboard stats
          const statsResponse = await fetch('/api/dashboard/stats', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            setUserData({
              name: userData.NAME || userData.name || 'User',
              email: userData.EMAIL || userData.email || 'user@example.com',
              role: userData.ROLE || userData.role || 'USER',
              totalQueries: statsData.stats?.totalQueries || 0,
              successfulQueries: statsData.stats?.successfulQueries || 0,
              failedQueries: statsData.stats?.failedQueries || 0
            });
          } else {
            // If stats fetch fails, at least update user info
            setUserData(prev => ({
              ...prev,
              name: userData.NAME || userData.name || 'User',
              email: userData.EMAIL || userData.email || 'user@example.com',
              role: userData.ROLE || userData.role || 'USER',
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);
  
  // Initialize router
  const router = useRouter();
  
  // Handle logout
  const handleLogout = () => {
    // Clear cookies and localStorage
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('userId');
    
    // Redirect to login page
    router.push('/login');
  };

  // Get user ID from localStorage
  const getUserId = (): number | undefined => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      return userId ? parseInt(userId, 10) : undefined;
    }
    return undefined;
  };
  
  // Event listeners for opening tabs
  useEffect(() => {
    const handleOpenTableTab = (event: CustomEvent) => {
      const { tableId, tableName, columns } = event.detail;
      const tabId = `table-${tableId}`;
      
      // Store the columns data for this table
      setTableData(prev => ({
        ...prev,
        [tabId]: {
          tableId,
          tableName,
          columns
        }
      }));
      
      // Check if tab already exists
      if (!tabs.some(tab => tab.id === tabId)) {
        setTabs(prev => [...prev, { id: tabId, name: tableName, type: 'table' }]);
      }
      
      setActiveTab(tabId);
    };
    
    const handleOpenEditTableTab = (event: CustomEvent) => {
      const { tableId, tableName } = event.detail;
      const tabId = `edit-${tableId}`;
      
      // Check if tab already exists
      if (!tabs.some(tab => tab.id === tabId)) {
        setTabs(prev => [...prev, { id: tabId, name: `Edit: ${tableName}`, type: 'edit' }]);
      }
      
      setActiveTab(tabId);
    };
    
    // Add event listeners
    document.addEventListener('openTableTab', handleOpenTableTab as EventListener);
    document.addEventListener('openEditTableTab', handleOpenEditTableTab as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener('openTableTab', handleOpenTableTab as EventListener);
      document.removeEventListener('openEditTableTab', handleOpenEditTableTab as EventListener);
    };
  }, [tabs]);

  const clearExistingData = () => {
    setActiveQuery('');
    setActionReport('');
    setResults([]);
    setColumns([]);
    setChartConfig(null);
  };

  const handleClear = () => {
    setSubmitted(false);
    setInputValue('');
    clearExistingData();
  };

  const handleQueryChange = async (newQuery: string) => {
    setLoading(true);
    setActiveQuery(newQuery);

    try {
      const userId = getUserId();
      
      if (selectedAction === 'Queries') {
        const data = await runGenerateSQLQuery(newQuery, inputValue, userId);
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        setResults(data);
        setColumns(cols);
        const chart = await generateChartConfig(
          data,
          inputValue,
          selectedModel,
          userId
        );
        setChartConfig(chart.config);
        toast.success('Query executed successfully');
      } else {
        const executionResult = await runDMLQuery(newQuery, userId);
        const report = await generateDatabaseActionReport(
          inputValue,
          executionResult.statementsCount,
          executionResult.rowsAffected,
          executionResult.message,
          selectedModel,
          userId
        );
        setActionReport(report);
        toast.success('DML operation executed successfully');
      }
    } catch (error: any) {
      console.error('Error executing query:', error);
      toast.error(error.message || 'Failed to execute updated query');
      // Revert to previous query on error
      setActiveQuery(activeQuery);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (question.trim().length === 0) return;
    clearExistingData();
    if (question.trim()) setSubmitted(true);
    setLoading(true);
    setLoadingStep(1);
    setActiveQuery('');
    setActionReport('');
    
    const userId = getUserId();
    
    try {
      if (selectedAction === 'Queries') {
        const query = await generateQuery(question, selectedModel, userId);
        if (!query) {
          toast.error('An error occurred. Please try again.');
          setLoading(false);
          return;
        }
        setActiveQuery(query);
        setLoadingStep(2);
        const data = await runGenerateSQLQuery(query, question, userId);
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        setResults(data);
        setColumns(cols);
        const chart = await generateChartConfig(data, question, selectedModel, userId);
        setChartConfig(chart.config);
      } else if (selectedAction === 'Data Action') {
        let dmlQuery = await generateDMLQuery(question, selectedModel, userId);
        dmlQuery = dmlQuery.replace(/;+\s*$/, '').trim();
        if (!dmlQuery) {
          toast.error(
            'An error occurred generating DML query. Please try again.'
          );
          setLoading(false);
          return;
        }
        setActiveQuery(dmlQuery);
        setLoadingStep(2);
        const executionResult = await runDMLQuery(dmlQuery, userId);
        const report = await generateDatabaseActionReport(
          question,
          executionResult.statementsCount,
          executionResult.rowsAffected,
          executionResult.message,
          selectedModel,
          userId
        );
        setActionReport(report);
      }
      setLoading(false);
    } catch (e) {
      console.error('Error during submission:', e);
      toast.error('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputValue(suggestion);
    try {
      await handleSubmit(suggestion);
    } catch (e) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const renderActionReport = () => {
    if (!actionReport) return null;
    return <TypewriterText text={actionReport} />;
  };

  // Handle database selection
  const handleDatabaseSelect = (orgId: number) => {
    setSelectedOrgId(orgId);
    // Optional: Clear any existing results when changing database
    if (submitted) {
      handleClear();
    }
    toast.success('Database selected successfully');
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9FAFB] dark:bg-gray-900">
        <div className="flex flex-1 overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="flex h-full">
            <Sidebar />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg px-6 w-full">
              <div className="flex items-center">
                <div className="ml-6 flex items-center">
                  <Link href="/dashboard" className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-gray-800 dark:text-gray-100">Dashboard</span>
                  </Link>
                </div>
              </div>

              {/* Quick Stats - Now dynamically populated */}
              <div className="hidden md:flex items-center space-x-8">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Queries: </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{userData.totalQueries.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Successful: </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{userData.successfulQueries.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Failed: </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{userData.failedQueries.toLocaleString()}</span>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-4">
                <Link href="/aiquery" className="text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                  <MessageCircle className="h-5 w-5" />
                </Link>
                <Link href="/dashboard/profile" className="text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                  <Settings className="h-5 w-5" />
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-indigo-600 transition-colors duration-200"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </header>
            
            <div className="container mx-auto px-6 py-6 max-w-7xl">
              {/* Tabs */}
              {tabs.length > 0 && (
                <div className="flex border-b mb-4">
                  <button
                    className={`px-4 py-2 text-sm font-medium flex items-center ${!activeTab ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab(null)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Query
                  </button>
                  
                  {tabs.map(tab => (
                    <div key={tab.id} className="relative group">
                      <button
                        className={`px-4 py-2 text-sm font-medium flex items-center ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.type === 'table' && <Database className="h-4 w-4 mr-2" />}
                        {tab.type === 'edit' && <Edit className="h-4 w-4 mr-2" />}
                        {tab.name}
                      </button>
                      <button 
                        className="absolute top-2 right-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 rounded-full p-0.5 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Remove the tab
                          setTabs(prev => prev.filter(t => t.id !== tab.id));
                          // If this was the active tab, set to null (query tab)
                          if (activeTab === tab.id) {
                            setActiveTab(null);
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Tab Content */}
              {activeTab && activeTab.startsWith('table-') ? (
                // Table View
                <div className="mt-4">
                  {tableData[activeTab] && (
                    <TableView 
                      tableId={tableData[activeTab].tableId}
                      tableName={tableData[activeTab].tableName}
                      columns={tableData[activeTab].columns}
                    />
                  )}
                </div>
              ) : activeTab && activeTab.startsWith('edit-') ? (
                // Edit Table View (placeholder)
                <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold dark:text-gray-100">Edit Table</h2>
                  <p className="text-gray-500 dark:text-gray-400">Table editing functionality will be implemented soon.</p>
                </div>
              ) : !activeTab ? (
                <div>
                  <motion.div
                    layout
                    className="w-full"
                  >
                    <Search
                      handleSubmit={handleSubmit}
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      submitted={submitted}
                      handleClear={handleClear}
                      selectedAction={selectedAction}
                      onSelectAction={(action) => setSelectedAction(action as 'Queries' | 'Data Action')}
                      showMenu={!submitted}
                    />
                  </motion.div>

                  <div className={`${submitted ? 'mt-4' : 'mt-6'} flex-grow`}>
                    <AnimatePresence mode="wait">
                      {!submitted ? (
                        <QueryContext.Provider value={{ setInputValue, handleSubmit }}>
                          <SuggestedQueries selectedAction={selectedAction} />
                        </QueryContext.Provider>
                      ) : (
                        <motion.div
                          key="results"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          {selectedAction === 'Queries' ? (
                            <>
                              {activeQuery && (
                                <QueryViewer
                                  title="Generated SQL Query"
                                  activeQuery={activeQuery}
                                  onQueryChange={handleQueryChange}
                                />
                              )}
                              {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 glass-card">
                                  <AISpinner 
                                    message={loadingStep === 1
                                      ? 'Generating SQL query...'
                                      : 'Running SQL query...'}
                                  />
                                </div>
                              ) : results.length === 0 ? (
                                <div className="text-center py-8 glass-card">
                                  <p className="text-muted-foreground">
                                    No results found.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <Results
                                    results={results}
                                    chartConfig={chartConfig}
                                    columns={columns}
                                    onEmailClick={() => setIsEmailModalOpen(true)}
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 glass-card">
                                  <AISpinner 
                                    message={loadingStep === 1
                                      ? 'Generating DML query...'
                                      : 'Executing DML operations...'}
                                  />
                                </div>
                              ) : (
                                <>
                                  {activeQuery && (
                                    <QueryViewer
                                      title="Generated DML Query"
                                      activeQuery={activeQuery}
                                    />
                                  )}
                                  {actionReport && renderActionReport()}
                                </>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
                  {/* Table or Edit view based on active tab */}
                  {tabs.find(tab => tab.id === activeTab)?.type === 'table' ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold dark:text-gray-100">{tabs.find(tab => tab.id === activeTab)?.name}</h2>
                      <p className="text-gray-500 dark:text-gray-400">Table view content will be displayed here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold dark:text-gray-100">{tabs.find(tab => tab.id === activeTab)?.name}</h2>
                      <p className="text-gray-500 dark:text-gray-400">Edit table form will be displayed here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          results={results}
          question={inputValue}
          selectedModel={selectedModel}
        />
      </div>
  );
}
