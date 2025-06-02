'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Play,
  Eye,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  AlertTriangle,
  ArrowLeft,
  Sliders,
  Calendar,
  BarChart3,
  FileText,
  DownloadCloud,
  Loader2,
  X,
  User
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

// Type for user data
interface UserData {
  ID?: number;
  NAME?: string;
  EMAIL?: string;
  ROLE?: string;
  name?: string;
  email?: string;
  role?: string;
}

// Type for filtered queries
type QueryFilter = 'all' | 'success' | 'failed' | 'long-running';

// Date range type
type DateRange = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export default function ActivityPage() {
  // State management
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<QueryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('thisWeek');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // States for query execution and results
  const [showResults, setShowResults] = useState<boolean>(false);
  const [executingQueryId, setExecutingQueryId] = useState<number | null>(null);
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [queryExecutionTime, setQueryExecutionTime] = useState<number>(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [currentSqlQuery, setCurrentSqlQuery] = useState<string>('');
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);

  // First fetch user data to get role
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await fetch('/api/user/me', {
          credentials: 'include'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserData(userData);
          
          // Check if user is admin
          const userRole = userData.ROLE || userData.role || '';
          setIsAdmin(userRole.toUpperCase() === 'ADMIN');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        // Default to non-admin for security
        setIsAdmin(false);
      }
    };

    fetchUserData();
  }, []);

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

  // Fetch data with all available filters - now with role-based filtering
  useEffect(() => {
    // Don't fetch data until we know user data
    if (userData === null) return;
    
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Define date parameters based on selected range
        let dateParams = '';
        
        switch (dateRange) {
          case 'today':
            dateParams = '&dateRange=today';
            break;
          case 'yesterday':
            dateParams = '&dateRange=yesterday';
            break;
          case 'thisWeek':
            dateParams = '&dateRange=thisWeek';
            break;
          case 'lastWeek':
            dateParams = '&dateRange=lastWeek';
            break;
          case 'thisMonth':
            dateParams = '&dateRange=thisMonth';
            break;
          case 'lastMonth':
            dateParams = '&dateRange=lastMonth';
            break;
          case 'custom':
            if (startDate && endDate) {
              dateParams = `&startDate=${startDate}&endDate=${endDate}`;
            }
            break;
          default:
            dateParams = '';
        }
        
        // Add user filtering for non-admin users
        const userId = userData.ID;
        const userFilter = isAdmin ? '' : `&userId=${userId}`;
        
        // Fetch data with all filters
        const response = await fetch(
          `/api/dashboard/recent-activity?page=${currentPage}&filter=${activeFilter}&search=${encodeURIComponent(searchTerm)}${dateParams}${userFilter}`,
          { credentials: 'include' }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch activity data');
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
        
        setActivities(processedActivities);
        setTotalPages(data.totalPages || 1);
        setTotalActivities(data.totalCount || 0);
      } catch (err: any) {
        console.error('Error fetching activity data:', err);
        setError(err.message || 'An error occurred while fetching activity data');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    
    fetchData();
  }, [currentPage, activeFilter, searchTerm, dateRange, startDate, endDate, isRefreshing, userData, isAdmin]);

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
    setCurrentPage(1); // Reset to first page
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to first page
  };

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
  };

  // Handle refresh button
  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  // Open activity details modal
  const openActivityModal = (activity: RecentActivity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  // Execute the SQL query
  const handleExecuteQuery = async (query: RecentActivity) => {
    try {
      setExecutingQueryId(query.ID);
      setSelectedQueryId(query.ID);
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

  // Handle email
  const handleEmailClick = () => {
    // This will be handled by the Results component
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

  // Export to CSV
  const exportToCSV = async () => {
    try {
      // Add user filtering for non-admin users
      const userId = userData?.ID;
      const userFilter = isAdmin ? '' : `&userId=${userId}`;
      
      const response = await fetch(
        `/api/dashboard/export-activity?filter=${activeFilter}&search=${encodeURIComponent(searchTerm)}${userFilter}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to export activity data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting activity data:', err);
      // Implement error handling/notification
    }
  };

  // Filter options with counts
  const filterOptions = [
    { id: 'all', label: 'All Queries', icon: Activity, count: totalActivities },
    { id: 'success', label: 'Successful', icon: CheckCircle2, count: activities.filter(a => a.EXECUTION_STATUS === 'SUCCESS').length },
    { id: 'failed', label: 'Failed', icon: XCircle, count: activities.filter(a => a.EXECUTION_STATUS !== 'SUCCESS').length },
    { id: 'long-running', label: 'Long Running', icon: Clock, count: activities.filter(a => a.EXECUTION_TIME > 1000).length }
  ];

  // Date range options
  const dateRangeOptions = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'yesterday', label: 'Yesterday', icon: Calendar },
    { id: 'thisWeek', label: 'This Week', icon: Calendar },
    { id: 'lastWeek', label: 'Last Week', icon: Calendar },
    { id: 'thisMonth', label: 'This Month', icon: Calendar },
    { id: 'lastMonth', label: 'Last Month', icon: Calendar },
    { id: 'custom', label: 'Custom Range', icon: Calendar }
  ];

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="max-w-7xl mx-auto mt-8 px-4">
        <div className="flex items-center mb-8">
          <Link href="/dashboard" className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="glass-card p-8 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading insights...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isAdmin ? 'Organization Activity History' : 'Your Query History'}
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin 
              ? 'Track and manage all query executions across your organization' 
              : 'Track and manage your query executions'}
          </p>
          {userData && (
            <div className="inline-flex items-center px-3 py-1 mt-3 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
              <User className="h-4 w-4 mr-2" />
              <span>{userData?.ROLE || userData?.role || 'User'}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleRefresh}
            className={`p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <DownloadCloud className="h-4 w-4 mr-2" />
            <span>Export</span>
          </button>
          
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isFilterOpen 
                ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Sliders className="h-4 w-4 mr-2" />
            <span>Filters</span>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6 mb-6 dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Search and filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Query Filters</h3>
                
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50"
                    placeholder="Search queries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </form>
                
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleFilterChange(option.id as QueryFilter)}
                      className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${
                        activeFilter === option.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              
              {/* Date range filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</h3>
                
                <div className="flex flex-wrap gap-2">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleDateRangeChange(option.id as DateRange)}
                      className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${
                        dateRange === option.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <option.icon className="h-3.5 w-3.5" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                
                {/* Custom date range */}
                {dateRange === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div>
                      <label htmlFor="startDate" className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        id="startDate"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-xs text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                      <input
                        type="date"
                        id="endDate"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="self-end">
                      <button
                        className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors text-xs"
                        onClick={() => setCurrentPage(1)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">
              {isAdmin ? 'Total Queries' : 'Your Queries'}
            </h3>
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{totalActivities.toLocaleString()}</p>
        </div>
        
        <div className="glass-card p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Success Rate</h3>
            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {activities.length > 0 
              ? `${((activities.filter(a => a.EXECUTION_STATUS === 'SUCCESS').length / activities.length) * 100).toFixed(1)}%` 
              : '0%'}
          </p>
        </div>
        
        <div className="glass-card p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Avg. Execution Time</h3>
            <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {activities.length > 0 
              ? (() => {
                  // فلتر الأنشطة التي لها وقت تنفيذ صالح فقط
                  const validActivities = activities.filter(a => 
                    a.EXECUTION_TIME !== null && 
                    a.EXECUTION_TIME !== undefined && 
                    !isNaN(Number(a.EXECUTION_TIME))
                  );
                  
                  // حساب المتوسط فقط للأنشطة التي لها وقت تنفيذ صالح
                  if (validActivities.length > 0) {
                    const avg = validActivities.reduce((sum, a) => sum + Number(a.EXECUTION_TIME || 0), 0) / validActivities.length;
                    return `${Math.round(avg)}ms`;
                  }
                  return '0ms';
                })() 
              : '0ms'}
          </p>
        </div>
        
        <div className="glass-card p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Avg. Rows Returned</h3>
            <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {activities.length > 0 
              ? `${(activities.reduce((sum, a) => sum + (a.ROWS_RETURNED || 0), 0) / activities.length).toFixed(0)}` 
              : '0'}
          </p>
        </div>
      </div>
      
      {/* Activity Table */}
      <div className="glass-card overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            {isAdmin ? 'Organization Activity Log' : 'Your Activity Log'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalActivities} {totalActivities === 1 ? 'entry' : 'entries'} found
          </p>
        </div>
        
        {activities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">No Activity Found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || activeFilter !== 'all' || dateRange !== 'thisWeek'
                ? 'Try adjusting your filters or search criteria'
                : 'Start running queries to see your activity history'}
            </p>
          </div>
        ) : (
          <>
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
                    {isAdmin && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                    )}
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
                  {activities.map((activity) => (
                    <tr key={activity.ID} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {activity.EXECUTION_STATUS === 'SUCCESS' ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Success
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Failed
                            </span>
                          )}
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
                      
                      {/* User column - only shown for admins */}
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900 dark:text-gray-200">{activity.USER_NAME}</div>
                            {activity.USER_ID === userData?.ID && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-xs">You</span>
                            )}
                          </div>
                        </td>
                      )}
                      
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
                            onClick={() => openActivityModal(activity)}
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{activities.length}</span> of{' '}
                      <span className="font-medium">{totalActivities}</span> results
                    </p>
                  </div>
                  <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-gray-500 ${
                        currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {(() => {
                      const buttons = [];
                      // Calculate range of pages to show
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(totalPages, startPage + 4);
                      
                      // Adjust start if we're near the end
                      if (endPage - startPage < 4 && startPage > 1) {
                        startPage = Math.max(1, endPage - 4);
                      }
                      
                      // Generate buttons with unique keys
                      for (let i = startPage; i <= endPage; i++) {
                        buttons.push(
                          <button
                            key={`page-btn-${i}`}
                            onClick={() => setCurrentPage(i)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              i === currentPage
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      return buttons;
                    })()}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-gray-500 ${
                        currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Activity Detail Modal */}
      {showModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Query Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Query Text */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Natural Language Query</h4>
                  <p className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-gray-800 dark:text-gray-200">
                    {ensureString(selectedActivity.QUERY_TEXT) || 'No query text available'}
                  </p>
                </div>
                
                {/* SQL Generated */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Generated SQL</h4>
                    <button
                      onClick={() => copyQueryToClipboard(selectedActivity.SQL_GENERATED)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {ensureString(selectedActivity.SQL_GENERATED) || 'No SQL generated'}
                  </pre>
                </div>
                
                {/* Execution Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
                    <div className="flex items-center gap-2">
                      {selectedActivity.EXECUTION_STATUS === 'SUCCESS' 
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : <XCircle className="h-5 w-5 text-red-500" />}
                      <span className="text-sm font-medium">
                        {selectedActivity.EXECUTION_STATUS === 'SUCCESS' ? 'Successful' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Execution Time</h4>
                    <p className="text-sm font-medium dark:text-gray-200">{selectedActivity.EXECUTION_TIME || 0}ms</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rows Returned</h4>
                    <p className="text-sm font-medium dark:text-gray-200">{selectedActivity.ROWS_RETURNED || 0}</p>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Executed By</h4>
                    <div className="flex items-center">
                      <p className="text-sm font-medium dark:text-gray-200">{selectedActivity.USER_NAME}</p>
                      {selectedActivity.USER_ID === userData?.ID && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-xs">You</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Execution Date</h4>
                    <p className="text-sm font-medium dark:text-gray-200">{new Date(selectedActivity.EXECUTION_DATE).toLocaleString()}</p>
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
                      handleExecuteQuery(selectedActivity);
                    }}
                    disabled={executingQueryId !== null}
                    className={`px-4 py-2 ${executingQueryId !== null ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors flex items-center gap-2`}
                  >
                    {executingQueryId === selectedActivity.ID ? (
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
    </div>
  );
}