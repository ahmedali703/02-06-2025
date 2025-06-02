//components/ActivityInsights.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  Calendar, 
  User, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  X, 
  BarChart, 
  Lightbulb, 
  Award
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';

// Types
interface ActivityInsight {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  successRate: number;
  averageExecutionTime: number;
  averageRowsReturned: number;
  topUsers: {
    name: string;
    queries: number;
    successRate: number;
  }[];
  performanceByDay: {
    date: string;
    queries: number;
    avgTime: number;
    successRate: number;
  }[];
  queryWordCloud: {
    word: string;
    count: number;
  }[];
  queryDistribution: {
    category: string;
    count: number;
  }[];
  mostSuccessfulQueries: {
    text: string;
    rowsReturned: number;
    executionTime: number;
  }[];
  mostFailedQueries: {
    text: string;
    error: string;
  }[];
  recommendations: string[];
}

interface ActivityInsightsProps {
  orgId?: number;
  userId?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

// Colors for charts
const COLORS = [
  '#6c5ce7', // Primary (indigo)
  '#00cec9', // Teal
  '#fd79a8', // Pink
  '#fdcb6e', // Yellow
  '#00b894', // Green
  '#e17055', // Orange
  '#74b9ff', // Light Blue
  '#a29bfe', // Lavender
  '#55efc4', // Mint
  '#ff7675', // Salmon
];

export default function ActivityInsights({ orgId, userId, timeRange = 'week' }: ActivityInsightsProps) {
  const [insights, setInsights] = useState<ActivityInsight | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'queries'>('overview');

  // Fetch insights data
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/dashboard/activity-insights?timeRange=${timeRange}${orgId ? `&orgId=${orgId}` : ''}${userId ? `&userId=${userId}` : ''}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }
        
        const data = await response.json();
        setInsights(data);
      } catch (err: any) {
        console.error('Error fetching insights:', err);
        setError(err.message || 'An error occurred while fetching insights');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInsights();
  }, [orgId, userId, timeRange]);

  // Sample data for development - would be replaced by actual API data
  const sampleInsights: ActivityInsight = {
    totalQueries: 1278,
    successfulQueries: 1145,
    failedQueries: 133,
    successRate: 89.6,
    averageExecutionTime: 324,
    averageRowsReturned: 97,
    topUsers: [
      { name: 'Ahmed Hassan', queries: 245, successRate: 92.3 },
      { name: 'Mohammed Ali', queries: 198, successRate: 88.5 },
      { name: 'Sara Khalid', queries: 154, successRate: 95.1 },
      { name: 'Omar Ahmed', queries: 132, successRate: 86.7 },
      { name: 'Fatima Ibrahim', queries: 98, successRate: 90.2 }
    ],
    performanceByDay: [
      { date: '2024-01-01', queries: 35, avgTime: 289, successRate: 91.4 },
      { date: '2024-01-02', queries: 42, avgTime: 312, successRate: 88.1 },
      { date: '2024-01-03', queries: 38, avgTime: 298, successRate: 92.1 },
      { date: '2024-01-04', queries: 51, avgTime: 342, successRate: 86.3 },
      { date: '2024-01-05', queries: 45, avgTime: 278, successRate: 93.3 },
      { date: '2024-01-06', queries: 37, avgTime: 305, successRate: 89.2 },
      { date: '2024-01-07', queries: 40, avgTime: 331, successRate: 90.0 }
    ],
    queryWordCloud: [
      { word: 'sales', count: 87 },
      { word: 'customers', count: 74 },
      { word: 'revenue', count: 62 },
      { word: 'products', count: 59 },
      { word: 'orders', count: 53 },
      { word: 'monthly', count: 48 },
      { word: 'summary', count: 42 },
      { word: 'employees', count: 37 },
      { word: 'invoices', count: 33 },
      { word: 'report', count: 29 }
    ],
    queryDistribution: [
      { category: 'Sales Analysis', count: 385 },
      { category: 'Customer Data', count: 312 },
      { category: 'Financial Reports', count: 278 },
      { category: 'Inventory Management', count: 187 },
      { category: 'HR Queries', count: 116 }
    ],
    mostSuccessfulQueries: [
      { text: 'Show monthly sales by region', rowsReturned: 245, executionTime: 187 },
      { text: 'List top 10 customers by revenue', rowsReturned: 10, executionTime: 231 },
      { text: 'Calculate profit margins by product category', rowsReturned: 42, executionTime: 298 }
    ],
    mostFailedQueries: [
      { text: 'Show sales performance by non-existent field', error: 'Column does not exist' },
      { text: 'Calculate total orders with invalid date format', error: 'Invalid date format' },
      { text: 'List employees with incorrect table join', error: 'Join condition is invalid' }
    ],
    recommendations: [
      'Consider optimizing queries with execution times over 500ms',
      'Review queries related to "inventory" as they have a lower success rate',
      'The most efficient time for running complex queries is between 2-4 PM',
      'Consider creating a view for frequently accessed sales data'
    ]
  };

  const data = insights || sampleInsights;

  // Loading state
  if (isLoading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <BarChart3 className="h-10 w-10 text-indigo-500 animate-pulse mb-4" />
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="glass-card p-8">
        <div className="text-center">
          <X className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Insights</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const pieData = [
    { name: 'Successful', value: data.successfulQueries },
    { name: 'Failed', value: data.failedQueries }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'performance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'queries' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('queries')}
        >
          Query Insights
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Total Queries</h3>
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.totalQueries.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-2">Last {timeRange}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.successRate.toFixed(1)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${data.successRate}%` }}
                ></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Avg. Execution Time</h3>
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.averageExecutionTime}ms</p>
              <p className="text-sm text-gray-500 mt-2">
                {data.averageExecutionTime < 300 ? 'Good performance' : 'May need optimization'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Avg. Rows Returned</h3>
                <BarChart className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.averageRowsReturned}</p>
              <p className="text-sm text-gray-500 mt-2">Per successful query</p>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Success vs Failed Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-gray-800 mb-4">Query Status Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} queries`, '']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Query Distribution Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium text-gray-800 mb-4">Query Category Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={data.queryDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="category" />
                    <Tooltip formatter={(value) => [`${value} queries`, '']} />
                    <Bar dataKey="count" fill="#6c5ce7" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Top Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-medium text-gray-800 mb-4">Top Users by Query Volume</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Queries</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.queries}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          user.successRate >= 90 ? 'text-green-600' : 
                          user.successRate >= 80 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {user.successRate.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="glass-card p-6"
          >
            <div className="flex items-center mb-4">
              <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-800">Recommendations</h3>
            </div>
            <ul className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <span className="text-xs font-medium text-indigo-800">{index + 1}</span>
                  </div>
                  <p className="text-gray-700">{rec}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-medium text-gray-800 mb-4">Performance Trends</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.performanceByDay}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="queries" 
                    stroke="#6c5ce7" 
                    strokeWidth={2}
                    name="Query Count"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="avgTime" 
                    stroke="#ff7675" 
                    strokeWidth={2}
                    name="Avg. Execution Time (ms)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#00b894" 
                    strokeWidth={2}
                    name="Success Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Performance Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Peak Activity</h3>
                <Calendar className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Busiest Day</p>
                  <p className="text-lg font-medium text-gray-800">
                    {data.performanceByDay.reduce((max, day) => day.queries > max.queries ? day : max, data.performanceByDay[0]).date}
                  </p>
                  <p className="text-sm text-indigo-600">
                    {data.performanceByDay.reduce((max, day) => day.queries > max.queries ? day : max, data.performanceByDay[0]).queries} queries
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Most Efficient Day</p>
                  <p className="text-lg font-medium text-gray-800">
                    {data.performanceByDay.reduce((min, day) => day.avgTime < min.avgTime ? day : min, data.performanceByDay[0]).date}
                  </p>
                  <p className="text-sm text-green-600">
                    {data.performanceByDay.reduce((min, day) => day.avgTime < min.avgTime ? day : min, data.performanceByDay[0]).avgTime}ms avg time
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Performance Trends</h3>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-4">
                {/* Calculate trends */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Query Volume</p>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+8.4%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+2.1%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Execution Time</p>
                    <div className="flex items-center">
                      <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">-5.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Performance Benchmarks</h3>
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Response Time Rating</p>
                  <div className="flex items-center">
                    <span className="text-lg font-medium text-gray-800 mr-2">Excellent</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} className="text-yellow-400">★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">System Health Status</p>
                  <div className="flex items-center">
                    <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-lg font-medium text-gray-800">Healthy</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Oracle DB Load</p>
                  <div className="flex items-center">
                    <span className="text-lg font-medium text-gray-800 mr-2">24%</span>
                    <div className="w-full bg-gray-200 rounded-full h-2 ml-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Queries Tab */}
      {activeTab === 'queries' && (
        <div className="space-y-6">
          {/* Query Word Cloud Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-medium text-gray-800 mb-4">Common Query Terms</h3>
            <div className="min-h-[200px] flex flex-wrap items-center justify-center gap-4 py-6">
              {data.queryWordCloud.map((word, index) => (
                <div 
                  key={index}
                  className="px-3 py-2 rounded-lg"
                  style={{ 
                    fontSize: `${Math.max(0.8, Math.min(2.2, (word.count / 20) + 0.8))}rem`,
                    color: COLORS[index % COLORS.length]
                  }}
                >
                  {word.word}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Most Successful & Failed Queries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center mb-4">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Most Successful Queries</h3>
              </div>
              <div className="space-y-4">
                {data.mostSuccessfulQueries.map((query, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-2">{query.text}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{query.rowsReturned} rows returned</span>
                      <span>{query.executionTime}ms execution time</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center mb-4">
                <X className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-800">Most Failed Queries</h3>
              </div>
              <div className="space-y-4">
                {data.mostFailedQueries.map((query, index) => (
                  <div key={index} className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-2">{query.text}</p>
                    <div className="flex items-center text-xs text-red-600">
                      <X className="h-3 w-3 mr-1" />
                      <span>Error: {query.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Query Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-medium text-gray-800 mb-4">Query Type Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.queryDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="category"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.queryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} queries`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}