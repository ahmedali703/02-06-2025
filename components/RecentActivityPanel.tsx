'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Play,
  Eye,
  Copy,
  Clock,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  AlertTriangle,
  List,
  Table2,
  Loader2,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import Link from 'next/link';
import { Results } from '@/components/results';

// Types definition for recent activity
interface RecentActivity {
  ID: number;
  QUERY_TEXT: string;
  SQL_GENERATED: string;
  EXECUTION_STATUS: string;
  EXECUTION_TIME: number;
  ROWS_RETURNED: number;
  EXECUTION_DATE: string;
  USER_NAME: string;
  USER_ID?: number;
}

// Type for filtered queries
type QueryFilter = 'all' | 'success' | 'failed' | 'long-running';

const ITEMS_PER_PAGE = 5;

export default function RecentActivityPanel() {
  // State management for recent activity
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedQuery, setSelectedQuery] = useState<RecentActivity | null>(null);
  const [activeFilter, setActiveFilter] = useState<QueryFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  
  // States for query execution and results
  const [showResults, setShowResults] = useState<boolean>(false);
  const [executingQueryId, setExecutingQueryId] = useState<number | null>(null);
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryExecutionTime, setQueryExecutionTime] = useState<number>(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [currentSqlQuery, setCurrentSqlQuery] = useState<string>('');

  // Essential utility function to ensure all data is safely rendered
  const ensureString = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Handle string case directly
    if (typeof value === 'string') {
      return value;
    }
    
    // Handle Buffer objects (Node.js)
    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }
    
    // Handle ArrayBuffer or TypedArray
    if (
      value instanceof ArrayBuffer || 
      value instanceof Uint8Array ||
      value instanceof Int8Array ||
      value instanceof Uint16Array ||
      value instanceof Int16Array ||
      value instanceof Uint32Array ||
      value instanceof Int32Array
    ) {
      return new TextDecoder().decode(value);
    }
    
    // Handle objects with type and data properties (like raw binary data)
    if (typeof value === 'object' && value !== null && 'type' in value && 'data' in value) {
      if (Array.isArray(value.data)) {
        // If it's Array-like, try to convert to Buffer and then to string
        try {
          const buffer = Buffer.from(value.data);
          return buffer.toString('utf8');
        } catch (e) {
          return '[Binary Data]';
        }
      }
      return '[Complex Binary Object]';
    }
    
    // General object handling
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Complex Object]';
      }
    }
    
    // Any other type
    return String(value);
  };

  // Fetch recent activity data
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch data from the API
        const response = await fetch(`/api/dashboard/recent-activity?page=${currentPage}&filter=${activeFilter}&search=${encodeURIComponent(searchTerm)}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity');
        }
        
        const data = await response.json();
        
        // Process the received data to ensure strings are properly handled
        const processedActivities = (data.activities || []).map((activity: any) => {
          // Create a safe copy of the activity
          const safeActivity: any = {};
          
          // Process each field
          Object.keys(activity).forEach(key => {
            // For query text and SQL, ensure they are strings
            if (key === 'QUERY_TEXT' || key === 'SQL_GENERATED') {
              safeActivity[key] = ensureString(activity[key]);
            } else {
              // For other fields, keep as is
              safeActivity[key] = activity[key];
            }
          });
          
          return safeActivity;
        });
        
        setRecentActivity(processedActivities);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        console.error('Error fetching recent activity:', err);
        setError(err.message || 'An error occurred while fetching recent activity');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchRecentActivity();
  }, [currentPage, activeFilter, searchTerm, isRefreshing]);

  // Format relative time, ensuring English locale
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Using only default locale (English)
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'unknown time';
    }
  };

  // Handle filtering
  const handleFilterChange = (filter: QueryFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  // Handle query expansion
  const toggleQueryExpansion = (id: number) => {
    setExpandedQuery(expandedQuery === id ? null : id);
  };

  // Open modal with query details
  const openQueryModal = (query: RecentActivity) => {
    setSelectedQuery(query);
    setShowModal(true);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Execute the SQL query
  const handleExecuteQuery = async (query: RecentActivity) => {
    try {
      setExecutingQueryId(query.ID);
      setExecutionError(null);
      setQueryRows([]);
      setQueryColumns([]);
      setCurrentSqlQuery(query.QUERY_TEXT);
      
      // Call the API to execute the SQL query
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: query.SQL_GENERATED,
          queryId: query.ID
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute query');
      }
      
      const data = await response.json();
      
      // Setup chart config
      const basicChartConfig = data.rows.length > 0 ? {
        type: 'bar',
        xAxis: Object.keys(data.rows[0])[0],
        yAxis: Object.keys(data.rows[0])[1] || null,
      } : null;
      
      // Set results and show
      setQueryColumns(data.columns || []);
      setQueryRows(data.rows || []);
      setQueryExecutionTime(data.executionTime || 0);
      setChartConfig(basicChartConfig);
      setShowResults(true);
      
      // Auto-scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('query-results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (err: any) {
      console.error('Error executing query:', err);
      setExecutionError(err.message || 'An error occurred while executing the query');
      setShowResults(true); // Show error message
    } finally {
      setExecutingQueryId(null);
    }
  };

  // Copy query to clipboard - safely handling any data type
  const copyQueryToClipboard = (query: any) => {
    const queryText = ensureString(query);
    navigator.clipboard.writeText(queryText)
      .then(() => {
        console.log('Query copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy query:', err);
      });
  };

  // Handle email
  const handleEmailClick = () => {
    // This will be handled by the Results component
  };

  // Render loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="glass-card p-6 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">Recent Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading latest database interactions...</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-16">
          <RefreshCw className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="glass-card p-6 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">Recent Activity</h3>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
        <div className="flex justify-center items-center py-12 flex-col">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-700 dark:text-gray-300 mb-4">Unable to load recent activity data.</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Filter indicators with badge counts
  const filterOptions = [
    { id: 'all', label: 'All Queries', icon: Activity, count: recentActivity.length },
    { id: 'success', label: 'Successful', icon: CheckCircle2, count: recentActivity.filter(a => a.EXECUTION_STATUS === 'SUCCESS').length },
    { id: 'failed', label: 'Failed', icon: XCircle, count: recentActivity.filter(a => a.EXECUTION_STATUS !== 'SUCCESS').length },
    { id: 'long-running', label: 'Long Running', icon: Clock, count: recentActivity.filter(a => a.EXECUTION_TIME > 1000).length }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300 dark:bg-gray-800/90 dark:border-gray-700"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">Recent Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest database interactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'list' ? 'table' : 'list')}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={viewMode === 'list' ? 'Switch to Table View' : 'Switch to List View'}
            >
              {viewMode === 'list' ? <Table2 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
            <button 
              onClick={handleRefresh}
              className={`p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`}
              disabled={isRefreshing}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link
              href="/dashboard/activity"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center group transition-all duration-200"
            >
              <span>View All</span>
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50"
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleFilterChange(option.id as QueryFilter)}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${
                  activeFilter === option.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <option.icon className="h-3.5 w-3.5" />
                <span>{option.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === option.id
                    ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* No results state */}
      {recentActivity.length === 0 && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">No activity found</p>
          <p className="text-sm mt-1 dark:text-gray-400">
            {searchTerm 
              ? 'Try adjusting your search or filters' 
              : activeFilter !== 'all' 
                ? 'No queries match the selected filter' 
                : 'Start using MyQuery to see your activity here'}
          </p>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && recentActivity.length > 0 && (
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <motion.div 
              key={activity.ID || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex flex-col rounded-lg border ${
                expandedQuery === activity.ID
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
              } transition-all duration-200 overflow-hidden`}
            >
              {/* Header - always visible */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => toggleQueryExpansion(activity.ID)}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  activity.EXECUTION_STATUS === 'SUCCESS' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {activity.EXECUTION_STATUS === 'SUCCESS' 
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-y-1">
                    {/* Safe display of query text */}
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
                      {ensureString(activity.QUERY_TEXT).length > 60 
                        ? `${ensureString(activity.QUERY_TEXT).substring(0, 60)}...` 
                        : ensureString(activity.QUERY_TEXT) || 'No query text'}
                    </p>
                    <span className="mx-2 text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.USER_NAME}
                    </p>
                  </div>
                  <div className="flex items-center mt-1 flex-wrap gap-y-1">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${
                      activity.EXECUTION_STATUS === 'SUCCESS'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {activity.EXECUTION_STATUS === 'SUCCESS' ? 'Successful' : 'Failed'}
                    </span>
                    
                    {activity.EXECUTION_STATUS === 'SUCCESS' && (
                      <>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-2 py-0.5">
                          {activity.ROWS_RETURNED ? `${activity.ROWS_RETURNED} rows` : 'No rows'}
                        </span>
                      </>
                    )}
                    
                    <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.EXECUTION_TIME ? `${activity.EXECUTION_TIME}ms` : 'N/A'}
                    </span>
                    
                    <span className="ms-auto text-xs text-gray-500 dark:text-gray-400 hidden sm:block" title={activity.EXECUTION_DATE}>
                      {formatRelativeTime(activity.EXECUTION_DATE)}
                    </span>
                  </div>
                </div>

                <ChevronDown className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                  expandedQuery === activity.ID ? 'rotate-180' : ''
                }`} />
              </div>
              
              {/* Expanded content */}
              {expandedQuery === activity.ID && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-4 pb-4"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">SQL Query</h4>
                    <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                      {ensureString(activity.SQL_GENERATED) || 'No SQL generated'}
                    </pre>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleExecuteQuery(activity)}
                        disabled={executingQueryId !== null}
                        className={`px-3 py-1.5 rounded-lg ${
                          executingQueryId === activity.ID 
                            ? 'bg-gray-400 text-white' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } text-xs flex items-center gap-1.5 transition-colors`}
                      >
                        {executingQueryId === activity.ID ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            <span>Run Again</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => copyQueryToClipboard(activity.SQL_GENERATED)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy SQL</span>
                      </button>
                      
                      <button
                        onClick={() => openQueryModal(activity)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View Details</span>
                      </button>
                      
                      <button
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>Share</span>
                      </button>
                      
                      {activity.EXECUTION_STATUS === 'FAILED' && (
                        <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Error occurred during execution</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && recentActivity.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Query
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Result
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.map((activity) => (
                <tr key={activity.ID} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {activity.EXECUTION_STATUS === 'SUCCESS' 
                        ? <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
                        : <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-200 max-w-[300px] truncate" title={ensureString(activity.QUERY_TEXT)}>
                      {ensureString(activity.QUERY_TEXT) || 'No query text'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[300px] truncate font-mono" title={ensureString(activity.SQL_GENERATED)}>
                      {ensureString(activity.SQL_GENERATED) || 'No SQL generated'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-200">{activity.USER_NAME}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-200">{activity.ROWS_RETURNED || 0} rows</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-200">{activity.EXECUTION_TIME || 0}ms</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400" title={activity.EXECUTION_DATE}>
                      {formatRelativeTime(activity.EXECUTION_DATE)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExecuteQuery(activity)}
                        disabled={executingQueryId !== null}
                        className={`text-indigo-600 dark:text-indigo-400 ${executingQueryId !== null ? 'opacity-50' : 'hover:text-indigo-900 dark:hover:text-indigo-300'}`}
                        title="Run Again"
                      >
                        {executingQueryId === activity.ID ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openQueryModal(activity)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyQueryToClipboard(activity.SQL_GENERATED)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                        title="Copy SQL"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}

{totalPages > 1 && (
  <div className="mt-6 flex items-center justify-between">
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Showing {Math.min(ITEMS_PER_PAGE, recentActivity.length)} of {recentActivity.length} results
    </p>
    
    <div className="flex items-center space-x-1">
      {/* Previous button */}
      {currentPage > 1 && (
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      {/* Page numbers */}
      {(() => {
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust start if we're near the end
        if (endPage - startPage < 4) {
          startPage = Math.max(1, endPage - 4);
        }
        
        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
          pages.push(
            <button
              key={i}
              onClick={() => handlePageChange(i)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                currentPage === i
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {i}
            </button>
          );
        }
        return pages;
      })()}
      
      {/* Next button */}
      {currentPage < totalPages && (
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
)}

      {/* Query Detail Modal */}
      {showModal && selectedQuery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Query Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Query Text */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Natural Language Query</h4>
                  <p className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-gray-800 dark:text-gray-200">
                    {ensureString(selectedQuery.QUERY_TEXT) || 'No query text available'}
                  </p>
                </div>
                
                {/* SQL Generated */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Generated SQL</h4>
                    <button
                      onClick={() => copyQueryToClipboard(selectedQuery.SQL_GENERATED)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {ensureString(selectedQuery.SQL_GENERATED) || 'No SQL generated'}
                  </pre>
                </div>
                
                {/* Execution Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
                    <div className="flex items-center gap-2">
                      {selectedQuery.EXECUTION_STATUS === 'SUCCESS' 
                        ? <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
                        : <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />}
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {selectedQuery.EXECUTION_STATUS === 'SUCCESS' ? 'Successful' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Execution Time</h4>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedQuery.EXECUTION_TIME || 0}ms</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rows Returned</h4>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedQuery.ROWS_RETURNED || 0}</p>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Executed By</h4>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedQuery.USER_NAME}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Execution Date</h4>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{new Date(selectedQuery.EXECUTION_DATE).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-end mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleExecuteQuery(selectedQuery);
                    }}
                    disabled={executingQueryId !== null}
                    className={`px-4 py-2 ${executingQueryId !== null ? 'bg-gray-400 dark:bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800'} text-white rounded-lg transition-colors flex items-center gap-2`}
                  >
                    {executingQueryId === selectedQuery.ID ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Run Again</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Using Results component directly */}
      {showResults && (
        <div id="query-results-section" className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Query Results</h3>
            <button
              onClick={() => setShowResults(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Results</span>
            </button>
          </div>
          
          {executionError ? (
            <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Error Executing Query</h3>
              <p className="text-red-600 mb-4">{executionError}</p>
              <p className="text-gray-600 text-sm mt-4">
                {queryExecutionTime > 0 && `Query execution took ${queryExecutionTime}ms`}
              </p>
            </div>
          ) : queryRows.length === 0 ? (
            <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-blue-700 mb-2">Query Executed Successfully</h3>
              <p className="text-blue-600 mb-2">
                The query completed successfully in {queryExecutionTime}ms, but returned no data.
              </p>
              <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4 text-left max-w-2xl mx-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Possible reasons:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>The query condition did not match any records in the database</li>
                  <li>The table or view queried might be empty</li>
                  <li>The query might have filtering conditions that are too restrictive</li>
                </ul>
              </div>
            </div>
          ) : (
            // Use the Results component directly (existing component)
            <Results 
              results={queryRows}
              columns={queryColumns}
              chartConfig={chartConfig}
              onEmailClick={handleEmailClick}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}