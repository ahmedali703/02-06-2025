'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/context/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  Settings,
  Database,
  Brain,
  BarChart3,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Activity,
  Loader2,
  AlertCircle,
  Cpu,
  SparklesIcon,
  CircleDollarSign,
  PlusIcon,
  ChevronRightIcon,
  PieChart,
  RefreshCw,
  MessageSquareText,
  Eye,
  Zap,
  HardDriveIcon,
  DatabaseIcon,
  Table2
} from 'lucide-react';
import Link from 'next/link';

// Import the enhanced Recent Activity component
import RecentActivityPanel from '@/components/RecentActivityPanel';

// Types
interface DashboardStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  successRate: number;
  organizationUsers: number;
  activeUsers: number;
  totalTables: number;
}

interface PerformanceData {
  DATE_PERIOD: string;
  TOTAL_QUERIES: number;
  SUCCESSFUL_QUERIES: number;
  FAILED_QUERIES: number;
  AVG_EXECUTION_TIME: number;
}

interface Invoice {
  INVOICE_NUMBER: string;
  AMOUNT: number;
  STATUS: string;
  INVOICE_DATE: string;
}

interface Organization {
  ORG_NAME: string;
  ORG_STATUS: string;
  DATABASE_TYPE: string;
  CREATED_AT: string;
}

interface Subscription {
  ID: number;
  PLAN_NAME: string;
  PRICE_MONTHLY: number;
}

interface UserData {
  ID?: number;
  NAME?: string;
  EMAIL?: string;
  ROLE?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface DashboardData {
  stats: DashboardStats;
  performance: PerformanceData[];
  recentInvoices: Invoice[];
  organization: Organization;
  subscription: Subscription | null;
  needsOnboarding?: boolean;
  userName?: string;
  userEmail?: string;
  user?: UserData;
}

// Sample performance data for chart
const samplePerformanceData = [
  { date: '2024-01-01', queries: 120, successful: 108, failed: 12 },
  { date: '2024-01-08', queries: 165, successful: 155, failed: 10 },
  { date: '2024-01-15', queries: 145, successful: 138, failed: 7 },
  { date: '2024-01-22', queries: 190, successful: 182, failed: 8 },
  { date: '2024-01-29', queries: 210, successful: 202, failed: 8 },
  { date: '2024-02-05', queries: 235, successful: 228, failed: 7 },
  { date: '2024-02-12', queries: 255, successful: 245, failed: 10 },
  { date: '2024-02-19', queries: 275, successful: 265, failed: 10 },
  { date: '2024-02-26', queries: 240, successful: 228, failed: 12 },
  { date: '2024-03-04', queries: 280, successful: 274, failed: 6 },
];

// Define interfaces for table usage and user activity data
interface TableUsage {
  table: string;
  queries: number;
  avgTime: number;
}

interface UserActivity {
  user: string;
  queries: number;
  successRate: number;
}

export default function DashboardPage() {
  const { setHasCompletedOnboarding } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [tableUsageData, setTableUsageData] = useState<TableUsage[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivity[]>([]);
  const [tableUsageLoading, setTableUsageLoading] = useState<boolean>(true);
  const [userActivityLoading, setUserActivityLoading] = useState<boolean>(true);

  // Fetch user data and dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch user data
        const userResponse = await fetch('/api/user/me', {
          credentials: 'include'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserData(userData);
          
          // Check if user is admin
          const userRole = userData.ROLE || userData.role || '';
          const isUserAdmin = userRole.toUpperCase() === 'ADMIN';
          setIsAdmin(isUserAdmin);

          // Fetch dashboard data - with role parameter to get appropriate stats
          const dashboardResponse = await fetch(`/api/dashboard/stats?role=${userRole}`, {
            credentials: 'include'
          });
          
          if (!dashboardResponse.ok) {
            const errorData = await dashboardResponse.json();
            throw new Error(errorData.error || 'Failed to fetch dashboard data');
          }
          
          const dashboardData = await dashboardResponse.json();
          setDashboardData(dashboardData);
          
          // Update the onboarding status in the UserContext
          setHasCompletedOnboarding(!dashboardData.needsOnboarding);
          
          // Fetch table usage data
          try {
            setTableUsageLoading(true);
            const tableUsageResponse = await fetch(`/api/analytics/table-usage?period=${selectedPeriod}`, {
              credentials: 'include'
            });
            
            if (tableUsageResponse.ok) {
              const tableUsageData = await tableUsageResponse.json();
              // Ensure we always have an array, even if data is undefined
              setTableUsageData(Array.isArray(tableUsageData.data) ? tableUsageData.data : []);
            } else {
              console.error('Failed to fetch table usage data');
            }
          } catch (tableErr) {
            console.error('Error fetching table usage data:', tableErr);
          } finally {
            setTableUsageLoading(false);
          }
          
          // Fetch user activity data (only for admin users)
          if (isUserAdmin) {
            try {
              setUserActivityLoading(true);
              const userActivityResponse = await fetch(`/api/analytics/user-activity?period=${selectedPeriod}`, {
                credentials: 'include'
              });
              
              if (userActivityResponse.ok) {
                const userActivityData = await userActivityResponse.json();
                // Ensure we always have an array, even if data is undefined
                setUserActivityData(Array.isArray(userActivityData.data) ? userActivityData.data : []);
              } else {
                console.error('Failed to fetch user activity data');
              }
            } catch (userErr) {
              console.error('Error fetching user activity data:', userErr);
            } finally {
              setUserActivityLoading(false);
            }
          }
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error loading data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="glass-card p-6 text-center dark:bg-gray-800/90 dark:border-gray-700">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Error Loading Data</h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Onboarding needed state
  if (dashboardData?.needsOnboarding) {
    return (
      <div className="max-w-5xl mx-auto mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-8 text-center"
        >
          <div className="bg-indigo-50 p-6 rounded-lg inline-block mb-6">
            <SparklesIcon className="h-16 w-16 text-indigo-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Welcome to MyQuery Dashboard
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            You need to complete the onboarding process to connect your database and start using MyQuery.
          </p>
          
          <p className="text-gray-600 mb-8">
            Hello, <span className="font-medium">{userData?.NAME || userData?.name || dashboardData.userName || 'there'}!</span> Let's set up your organization.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              <span>Refresh Page</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/onboarding'}
              className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              <span>Start Onboarding</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // If no data
  const stats = dashboardData?.stats || {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    successRate: 0,
    organizationUsers: 0,
    activeUsers: 0,
    totalTables: 0
  };

  const recentInvoices = dashboardData?.recentInvoices || [];
  const organization = dashboardData?.organization || { ORG_NAME: 'Your Organization', ORG_STATUS: 'Y', DATABASE_TYPE: 'postgres', CREATED_AT: new Date().toISOString() };
  const subscription = dashboardData?.subscription;
  const userName = userData?.NAME || userData?.name || dashboardData?.user?.NAME || dashboardData?.user?.name || 'User';
  const userRole = userData?.ROLE || userData?.role || 'USER';

  // Process performance data for chart
  const performanceData = dashboardData?.performance?.length 
    ? dashboardData.performance.map(item => ({
        date: item.DATE_PERIOD,
        queries: item.TOTAL_QUERIES,
        successful: item.SUCCESSFUL_QUERIES,
        failed: item.FAILED_QUERIES,
        avgTime: item.AVG_EXECUTION_TIME
      }))
    : samplePerformanceData;

  return (
    <div className="dashboard-page max-w-7xl mx-auto space-y-8 py-6 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      {/* Welcome Section with enhanced hover */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 hover:shadow-lg transition-all duration-300 ease-in-out border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 dark:bg-gray-800/90"
      >
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#6c5ce7] dark:text-indigo-400 mb-2">Welcome, {userName}</h1>
            <p className="text-gray-500 dark:text-gray-300">
              Dashboard for {organization?.ORG_NAME || 'Your Organization'}
            </p>
            {subscription && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                <span className="font-medium">Plan: </span>
                <span className="ml-1">{subscription.PLAN_NAME}</span>
              </div>
            )}
            {/* Add role badge */}
            {userRole && (
              <div className="mt-2 ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                <span className="font-medium">Role: </span>
                <span className="ml-1">{userRole}</span>
              </div>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Only show Database button for admin users */}
              {isAdmin && (
                <Link
                  href="/dashboard/database"
                  className="btn-secondary flex items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <DatabaseIcon className="h-4 w-4 mr-2" />
                  <span>Manage Database</span>
                </Link>
              )}
              <Link
                href="/aiquery"
                className="btn-primary flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <MessageSquareText className="h-4 w-4 mr-2" />
                <span>New Query</span>
              </Link>
              <Link
                href="/dashboard-builder"
                className="btn-secondary flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <MessageSquareText className="h-4 w-4 mr-2" />
                <span>Create Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats with enhanced hover effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card p-6 hover:border-indigo-200 dark:hover:border-indigo-700 border border-transparent hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800/90 dark:border-gray-700"
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Queries</h3>
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{stats.totalQueries.toLocaleString()}</div>
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>{stats.totalQueries > 0 ? 'Last update: Today' : 'No queries executed yet'}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
          }}
          className="glass-card p-6 transform hover:border-indigo-200 border border-transparent transition-all duration-300"
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Success Rate</h3>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{(Number(stats.successRate) || 0).toFixed(1)}%</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${Number(stats.successRate) || 0}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Only show Users stats for admins */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
            }}
            className="glass-card p-6 transform hover:border-indigo-200 border border-transparent transition-all duration-300"
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Active Users</h3>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{stats.activeUsers}</div>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <User className="h-3 w-3 mr-1" />
              <span>of {stats.organizationUsers} total users</span>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
          }}
          className="glass-card p-6 transform hover:border-indigo-200 border border-transparent transition-all duration-300"
        >
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Remaining Queries</h3>
            <CircleDollarSign className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          </div>
        </motion.div>

        {/* Show tables only for admin */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
            }}
            className="glass-card p-6 transform hover:border-indigo-200 border border-transparent transition-all duration-300"
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">Organization Tables</h3>
              <Table2 className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{stats.totalTables || 0}</div>
            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Database className="h-3 w-3 mr-1" />
              <span>Available for queries</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white dark:bg-gray-900">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart with enhanced hover */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            
            className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
          >
            <div className="flex flex-row items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">Query Performance</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isAdmin ? 'Organization-wide performance metrics' : 'Your query performance metrics'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {['day', 'week', 'month'].map((period) => (
                  <button
                    key={period}
                    className={`px-3 py-1 rounded-md text-xs transition-all duration-200 ${
                      selectedPeriod === period 
                        ? 'bg-[#6c5ce7] text-white shadow-md' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedPeriod(period as 'day' | 'week' | 'month')}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" className="dark:opacity-50" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    className="dark:text-gray-300"
                    tick={{
                      fill: '#94a3b8',
                      className: 'dark:fill-gray-300'
                    }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.getDate() + '/' + (date.getMonth() + 1);
                    }} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    className="dark:text-gray-300"
                    tick={{
                      fill: '#94a3b8',
                      className: 'dark:fill-gray-300'
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, white)',
                      border: 'var(--tooltip-border, 1px solid #e2e8f0)',
                      borderRadius: '8px',
                      color: 'var(--tooltip-color, #1e293b)',
                      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [value, '']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="queries" 
                    stroke="#6c5ce7" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 3 }}
                    activeDot={{ r: 6, strokeWidth: 3 }}
                    name="Queries"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successful" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    name="Successful"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Activity - Using the enhanced component without custom props */}
          <RecentActivityPanel />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* User Activity Analysis (Admin Only) */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
            >
              <div className="flex flex-row items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">User Activity Analysis</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Query patterns by user</p>
                </div>
                {userActivityLoading && (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400 animate-spin mr-2" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Updating...</span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                {userActivityData && userActivityData.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Queries</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {userActivityData.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.user}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.queries}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <span className="mr-2">{(Number(user.successRate) || 0).toFixed(1)}%</span>
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min(Number(user.successRate) || 0, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {userActivityLoading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                        <p>Loading user activity data...</p>
                      </div>
                    ) : (
                      <p>No user activity data available</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Table Usage Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ 
              scale: 1.01,
              boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
            }}
            className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
          >
            <div className="flex flex-row items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">Table Usage Analysis</h3>
                <p className="text-sm text-gray-500">Most frequently queried tables</p>
              </div>
              {tableUsageLoading && (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 text-indigo-500 animate-spin mr-2" />
                  <span className="text-xs text-gray-500">Updating...</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              {tableUsageData.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Table Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Query Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg. Execution Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tableUsageData.map((table, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{table.table}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{table.queries}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{table.avgTime.toFixed(2)} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {tableUsageLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-indigo-500 dark:text-indigo-400 animate-spin mb-2" />
                      <p>Loading table usage data...</p>
                    </div>
                  ) : (
                    <p>No table usage data available</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Usage Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
          >
            <div className="flex flex-row items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">Usage Summary</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Remaining queries in your plan</p>
              </div>
            </div>
            
            {subscription ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Queries Used:</span>
                  <span className="text-sm font-medium">{stats.totalQueries.toLocaleString()}</span>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  </div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No subscription data available</p>
              </div>
            )}
          </motion.div>

          {/* Recent Invoices - Only show for admin */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ 
                scale: 1.01,
                boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.1), 0 10px 10px -5px rgba(79, 70, 229, 0.04)"
              }}
              className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
            >
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-1">Recent Invoices</h3>
                <p className="text-sm text-gray-500">Latest billing information</p>
              </div>
              <div className="space-y-4">
                {recentInvoices && recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <div 
                      key={invoice.INVOICE_NUMBER}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{invoice.INVOICE_NUMBER}</p>
                        <p className="text-xs text-gray-500">{invoice.INVOICE_DATE}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${
                          invoice.STATUS === 'PAID' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          ${invoice.AMOUNT.toFixed(2)}
                        </span>
                        <button 
                          className="h-7 w-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-indigo-100 transition-colors duration-200"
                        >
                          <ArrowUpRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent invoices</p>
                  </div>
                )}
                
                {recentInvoices && recentInvoices.length > 0 && (
                  <Link 
                    href="/dashboard/billing/history"
                    className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:border-indigo-200 hover:text-indigo-700 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
                  >
                    View All Invoices
                  </Link>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Subscription Info - Show for all users */}
          {subscription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="glass-card p-6 border border-transparent hover:border-indigo-200 hover:shadow-md transition-all duration-300"
            >
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-1">Subscription Info</h3>
                <p className="text-sm text-gray-500">Current plan details</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plan:</span>
                  <span className="text-sm font-medium">{subscription.PLAN_NAME}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Monthly Price:</span>
                  <span className="text-sm font-medium">${subscription.PRICE_MONTHLY}</span>
                </div>
                
                {/* Only show Upgrade Plan button for admin users */}
                {isAdmin && (
                  <Link 
                    href="/dashboard/plans/available"
                    className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
                  >
                    Upgrade Plan
                  </Link>
                )}
              </div>
            </motion.div>
          )}    
        </div>
      </div>
    </div>
  );
}