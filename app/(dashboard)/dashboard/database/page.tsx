'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Table2, 
  Settings, 
  Check, 
  Save, 
  X, 
  ChevronDown, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  EyeIcon, 
  EyeOffIcon, 
  Loader2,
  PlayIcon,
  ArrowRight,
  PlusIcon,
  Brain
} from 'lucide-react';
import Link from 'next/link';

// Types for database
interface DbConnectionDetails {
  host?: string;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  connectString?: string;
  databaseType: string;
  [key: string]: any;
}

interface DbTable {
  ID: number;
  TABLE_NAME: string;
  TABLE_DESCRIPTION: string;
  IS_ACTIVE: string;
  CREATED_AT: string;
  UPDATED_AT: string;
  columns?: DbColumn[];
}

interface DbColumn {
  ID: number;
  TABLE_ID: number;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  COLUMN_DESCRIPTION: string;
  IS_SEARCHABLE: string;
  CREATED_AT: string;
}

interface Organization {
  ORG_ID: number;
  ORG_NAME: string;
  ORG_STATUS: string;
  DATABASE_TYPE: string;
  DATABASE_INFO: string;
  CREATED_AT: string;
}

// Interface for external tables
interface ExternalTableColumn {
  name: string;
  type: string;
}

interface ExternalTable {
  name: string;
  columns: ExternalTableColumn[];
}

export default function DatabaseManagementPage() {
  // State variables for database management
  const [activeTab, setActiveTab] = useState<'connection' | 'tables'>('connection');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New state variables for external tables management
  const [isLoadingExternalTables, setIsLoadingExternalTables] = useState<boolean>(false);
  const [externalTables, setExternalTables] = useState<ExternalTable[]>([]);
  const [selectedExternalTables, setSelectedExternalTables] = useState<string[]>([]);
  const [showTableSelector, setShowTableSelector] = useState<boolean>(false);
  
  // Database data
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [dbConnection, setDbConnection] = useState<DbConnectionDetails>({ databaseType: 'oracle' });
  const [availableTables, setAvailableTables] = useState<DbTable[]>([]);
  const [expandedTables, setExpandedTables] = useState<number[]>([]);

  // Field definitions for different database types
  const databaseFields: Record<string, { name: string; label: string; placeholder: string; required: boolean; type?: string }[]> = {
    oracle: [
      { name: 'user', label: 'Oracle User', placeholder: 'e.g., SYSTEM', required: true },
      { name: 'password', label: 'Oracle Password', placeholder: 'Enter password', required: true, type: 'password' },
      { name: 'connectString', label: 'Connect String', placeholder: 'e.g., localhost:1521/XEPDB1', required: true },
      { name: 'libDir', label: 'Library Directory', placeholder: '(e.g., /opt/oracle/product/21c/dbhomeXE/lib/)', required: false },
    ],
    mssql: [
      { name: 'server', label: 'Server', placeholder: 'e.g., localhost\\SQLEXPRESS', required: true },
      { name: 'database', label: 'Database', placeholder: 'Enter database name', required: true },
      { name: 'username', label: 'Username', placeholder: 'Enter username', required: true },
      { name: 'password', label: 'Password', placeholder: 'Enter password', required: true, type: 'password' },
      { name: 'port', label: 'Port', placeholder: '1433', required: false },
      { name: 'encrypt', label: 'Encrypt', placeholder: 'true or false', required: false },
    ],
    mysql: [
      { name: 'host', label: 'Host', placeholder: 'e.g., localhost', required: true },
      { name: 'port', label: 'Port', placeholder: '3306', required: true },
      { name: 'database', label: 'Database', placeholder: 'Enter database name', required: true },
      { name: 'user', label: 'Username', placeholder: 'Enter username', required: true },
      { name: 'password', label: 'Password', placeholder: 'Enter password', required: true, type: 'password' },
    ],
    postgres: [
      { name: 'host', label: 'Host', placeholder: 'e.g., localhost', required: true },
      { name: 'port', label: 'Port', placeholder: '5432', required: true },
      { name: 'database', label: 'Database', placeholder: 'Enter database name', required: true },
      { name: 'user', label: 'Username', placeholder: 'Enter username', required: true },
      { name: 'password', label: 'Password', placeholder: 'Enter password', required: true, type: 'password' },
    ],
  };

  // Fetch organization and database data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch organization data which contains database connection info
        const orgResponse = await fetch('/api/organization', {
          credentials: 'include'
        });
        
        if (!orgResponse.ok) {
          throw new Error('Failed to fetch organization data');
        }
        
        const orgData = await orgResponse.json();
        setOrganization(orgData);
        
        // Parse database connection info
        if (orgData.DATABASE_INFO) {
          try {
            const connectionData = JSON.parse(orgData.DATABASE_INFO);
            setDbConnection({
              ...connectionData,
              databaseType: orgData.DATABASE_TYPE || 'oracle'
            });
          } catch (err) {
            console.error('Error parsing database info:', err);
            setDbConnection({ databaseType: orgData.DATABASE_TYPE || 'oracle' });
          }
        } else {
          setDbConnection({ databaseType: orgData.DATABASE_TYPE || 'oracle' });
        }
        
        // Fetch available tables
        await fetchTables();
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load database settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch tables and their columns
  const fetchTables = async () => {
    try {
      setIsLoadingTables(true);
      
      const tablesResponse = await fetch('/api/database/tables', {
        credentials: 'include'
      });
      
      if (!tablesResponse.ok) {
        throw new Error('Failed to fetch tables');
      }
      
      const tablesData = await tablesResponse.json();
      setAvailableTables(tablesData);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };
  
  // Fetch columns for a specific table
  const fetchTableColumns = async (tableId: number) => {
    try {
      // Check if columns are already loaded
      const existingTable = availableTables.find(t => t.ID === tableId);
      if (existingTable?.columns) {
        return;
      }
      
      const columnsResponse = await fetch(`/api/database/tables/${tableId}/columns`, {
        credentials: 'include'
      });
      
      if (!columnsResponse.ok) {
        throw new Error(`Failed to fetch columns for table ID ${tableId}`);
      }
      
      const columnsData = await columnsResponse.json();
      
      // Update the table with columns
      setAvailableTables(prevTables => 
        prevTables.map(table => 
          table.ID === tableId 
            ? { ...table, columns: columnsData } 
            : table
        )
      );
    } catch (err) {
      console.error(`Error fetching columns for table ID ${tableId}:`, err);
    }
  };
  
  // Toggle table expansion and fetch columns if needed
  const toggleExpandTable = (tableId: number) => {
    if (expandedTables.includes(tableId)) {
      setExpandedTables(expandedTables.filter(id => id !== tableId));
    } else {
      setExpandedTables([...expandedTables, tableId]);
      fetchTableColumns(tableId);
    }
  };
  
  // Handle connection details change
  const handleConnectionChange = (field: string, value: string) => {
    setDbConnection(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset connection status when fields change
    setConnectionStatus(null);
  };
  
  // Test database connection
  const testConnection = async () => {
    try {
      setIsTesting(true);
      setConnectionStatus(null);
      setError(null);
      
      const connectionDataWithType = {
        ...dbConnection,
        databaseType: dbConnection.databaseType
      };
      
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionDataWithType),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setConnectionStatus({ success: true, message: 'Connection test successful!' });
      } else {
        setConnectionStatus({ success: false, message: data.error || 'Connection test failed' });
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setConnectionStatus({ success: false, message: 'Connection test failed: Network error' });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Fetch tables from external database
  const fetchExternalTables = async () => {
    try {
      setIsLoadingExternalTables(true);
      setError(null);
      
      const connectionDataWithType = {
        ...dbConnection,
        databaseType: dbConnection.databaseType,
        databaseInfo: JSON.stringify(dbConnection),
        refreshTables: true
      };
      
      const response = await fetch('/api/database/save-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionDataWithType),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok && data.tables) {
        setExternalTables(data.tables);
        // اختيار جميع الجداول افتراضيًا
        setSelectedExternalTables(data.tables.map((table: ExternalTable) => table.name));
        setShowTableSelector(true);
      } else {
        setError(data.error || 'Failed to fetch tables from external database');
      }
    } catch (err) {
      console.error('Error fetching external tables:', err);
      setError('Failed to fetch tables from external database. Please check your connection settings.');
    } finally {
      setIsLoadingExternalTables(false);
    }
  };

  // Toggle selection of an external table
  const toggleSelectExternalTable = (tableName: string) => {
    if (selectedExternalTables.includes(tableName)) {
      setSelectedExternalTables(selectedExternalTables.filter(t => t !== tableName));
    } else {
      setSelectedExternalTables([...selectedExternalTables, tableName]);
    }
  };

  // Toggle selection of all external tables
  const toggleSelectAllExternalTables = () => {
    if (selectedExternalTables.length === externalTables.length) {
      setSelectedExternalTables([]);
    } else {
      setSelectedExternalTables(externalTables.map(t => t.name));
    }
  };
  
  // Save database connection settings
  const saveConnection = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // تحضير بيانات الجداول المختارة
      let saveData: any = {
        databaseType: dbConnection.databaseType,
        databaseInfo: JSON.stringify(dbConnection)
      };
      
      // إذا كان هناك جداول تم اختيارها من الخارج
      if (showTableSelector && selectedExternalTables.length > 0) {
        const selectedTablesData = externalTables.filter(table => 
          selectedExternalTables.includes(table.name)
        );
        
        saveData.databaseObjects = JSON.stringify({
          tables: selectedTablesData
        });
        
        saveData.selectedTables = selectedExternalTables;
      }
      
      const response = await fetch('/api/database/save-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save connection settings');
      }
      
      // تحديث حالة الاتصال
      setConnectionStatus({ success: true, message: 'Connection settings saved successfully!' });
      
      // إغلاق منتقي الجداول وإعادة تعيين الجداول الخارجية
      setShowTableSelector(false);
      setExternalTables([]);
      
      // تحديث الجداول بعد الحفظ
      await fetchTables();
    } catch (err) {
      console.error('Error saving connection:', err);
      setError('Failed to save connection settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle table active status
  const toggleTableActive = async (tableId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Y' ? 'N' : 'Y';
      
      const response = await fetch(`/api/database/tables/${tableId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update table status');
      }
      
      // Update local state
      setAvailableTables(prevTables => 
        prevTables.map(table => 
          table.ID === tableId 
            ? { ...table, IS_ACTIVE: newStatus } 
            : table
        )
      );
    } catch (err) {
      console.error('Error toggling table status:', err);
      setError('Failed to update table status. Please try again.');
    }
  };
  
  // Toggle column searchable status
  const toggleColumnSearchable = async (tableId: number, columnId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Y' ? 'N' : 'Y';
      
      const response = await fetch(`/api/database/columns/${columnId}/toggle-searchable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update column status');
      }
      
      // Update local state
      setAvailableTables(prevTables => 
        prevTables.map(table => {
          if (table.ID === tableId && table.columns) {
            return {
              ...table,
              columns: table.columns.map(column => 
                column.ID === columnId 
                  ? { ...column, IS_SEARCHABLE: newStatus } 
                  : column
              )
            };
          }
          return table;
        })
      );
    } catch (err) {
      console.error('Error toggling column status:', err);
      setError('Failed to update column status. Please try again.');
    }
  };

  // Check if all required fields are filled
  const areRequiredFieldsFilled = (): boolean => {
    const requiredFields = databaseFields[dbConnection.databaseType]?.filter(field => field.required) || [];
    return requiredFields.every(field => {
      const value = dbConnection[field.name];
      return value !== undefined && value.trim().length > 0;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">Loading database settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 dark:bg-gray-800"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#6c5ce7] dark:text-[#a29bfe] mb-2">Database Management</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Configure your database connection and manage tables
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('connection')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'connection' 
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Connection</span>
            </button>
            <button 
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'tables' 
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Table2 className="h-4 w-4" />
              <span>Tables</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Connection Tab */}
      {activeTab === 'connection' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Database Type Selection */}
          <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Database Type</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.keys(databaseFields).map((dbType) => (
                <button
                  key={dbType}
                  onClick={() => handleConnectionChange('databaseType', dbType)}
                  className={`p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-3 border ${
                    dbConnection.databaseType === dbType
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Database className={`h-8 w-8 ${
                    dbConnection.databaseType === dbType ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                  <span className={`${dbConnection.databaseType === dbType ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    {dbType === 'oracle' ? 'Oracle' :
                     dbType === 'mssql' ? 'SQL Server' :
                     dbType === 'mysql' ? 'MySQL' : 'Postgres'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Connection Details */}
          <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Connection Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {databaseFields[dbConnection.databaseType]?.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    {field.type === 'password' ? (
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={dbConnection[field.name] || ''}
                          onChange={(e) => handleConnectionChange(field.name, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent transition-colors dark:bg-gray-700 dark:text-gray-100"
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {showPassword ? (
                            <EyeOffIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={dbConnection[field.name] || ''}
                        onChange={(e) => handleConnectionChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent transition-colors dark:bg-gray-700 dark:text-gray-100"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Connection Status */}
            {connectionStatus && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                connectionStatus.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                {connectionStatus.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    connectionStatus.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                  }`}>
                    {connectionStatus.success ? 'Success' : 'Error'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    connectionStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {connectionStatus.message}
                  </p>
                </div>
              </div>
            )}
            
            {/* Table Selector */}
            {showTableSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-8 border border-indigo-100 rounded-lg p-4 bg-indigo-50"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Select Tables to Import</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-indigo-700">
                      {selectedExternalTables.length} of {externalTables.length} selected
                    </span>
                    <button
                      onClick={toggleSelectAllExternalTables}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-500"
                    >
                      {selectedExternalTables.length === externalTables.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto border border-indigo-200 rounded-lg bg-white dark:bg-gray-800">
                  {externalTables.length > 0 ? (
                    <table className="min-w-full divide-y divide-indigo-200 dark:divide-gray-700">
                      <thead className="bg-indigo-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-500 dark:text-gray-300 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedExternalTables.length === externalTables.length}
                              onChange={toggleSelectAllExternalTables}
                              className="h-4 w-4 rounded text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600"
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-500 dark:text-gray-300 uppercase tracking-wider">
                            Table Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-500 dark:text-gray-300 uppercase tracking-wider">
                            Columns
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-indigo-200 dark:divide-gray-700">
                        {externalTables.map((table) => (
                          <tr key={table.name} className="hover:bg-indigo-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedExternalTables.includes(table.name)}
                                onChange={() => toggleSelectExternalTable(table.name)}
                                className="h-4 w-4 rounded text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {table.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {table.columns?.length || 0} columns
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-indigo-500 dark:text-indigo-400">No tables found in the database.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-right">
                  <button
                    onClick={saveConnection}
                    disabled={isSaving || selectedExternalTables.length === 0}
                    className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                      selectedExternalTables.length > 0 && !isSaving
                        ? 'border-transparent text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Selected Tables
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={testConnection}
                disabled={!areRequiredFieldsFilled() || isTesting}
                className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                  areRequiredFieldsFilled() && !isTesting
                    ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-800'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
              
              <button
                onClick={connectionStatus?.success ? fetchExternalTables : saveConnection}
                disabled={isSaving || isLoadingExternalTables || !areRequiredFieldsFilled()}

                className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                  !isSaving && !isLoadingExternalTables && areRequiredFieldsFilled() && (connectionStatus?.success ? true : true)
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isLoadingExternalTables ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading Tables...</span>
                  </>
                ) : connectionStatus?.success && !showTableSelector ? (
                  <>
                    <Database className="h-5 w-5" />
                    <span>Fetch Tables</span>
                  </>
                ) : showTableSelector ? (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Connection</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Connection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Tables Management Section */}
          <div className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Database Tables</h2>
              
              <div className="flex space-x-3">
                <button
                  onClick={fetchTables}
                  disabled={isLoadingTables}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  {isLoadingTables ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                  <span>Refresh</span>
                </button>
                
                <Link
                  href="/dashboard/database/add"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Table</span>
                </Link>
              </div>
            </div>
            
            {/* Tables List */}
            {isLoadingTables ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading tables...</p>
              </div>
            ) : availableTables.length > 0 ? (
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {availableTables.map((table) => (
                      <React.Fragment key={table.ID}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              onClick={() => toggleExpandTable(table.ID)}
                              className="text-gray-900 dark:text-gray-100 font-medium text-sm flex items-center gap-2"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedTables.includes(table.ID) ? 'rotate-180' : ''}`} />
                              {table.TABLE_NAME}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{table.TABLE_DESCRIPTION || 'No description'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              table.IS_ACTIVE === 'Y' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {table.IS_ACTIVE === 'Y' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toggleTableActive(table.ID, table.IS_ACTIVE)}
                                className={`p-1 rounded-md ${
                                  table.IS_ACTIVE === 'Y' 
                                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' 
                                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title={table.IS_ACTIVE === 'Y' ? 'Deactivate Table' : 'Activate Table'}
                              >
                                {table.IS_ACTIVE === 'Y' ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  <X className="h-5 w-5" />
                                )}
                              </button>
                              <Link
                                href={`/dashboard/database/edit/${table.ID}`}
                                className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md"
                                title="Edit Table"
                              >
                                <Settings className="h-5 w-5" />
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Columns Section */}
                        {expandedTables.includes(table.ID) && (
                          <tr>
                            <td colSpan={4} className="bg-gray-50 dark:bg-gray-800">
                              <div className="px-4 py-3">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 ml-7">Columns</h3>
                                
                                {table.columns ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                          <th scope="col" className="pl-7 pr-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Column Name
                                          </th>
                                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                          </th>
                                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                          </th>
                                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Searchable
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {table.columns.map((column) => (
                                          <tr key={column.ID} className="hover:bg-gray-50">
                                            <td className="pl-7 pr-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                              {column.COLUMN_NAME}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                              {column.COLUMN_TYPE}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                              {column.COLUMN_DESCRIPTION || 'No description'}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                              <button
                                                onClick={() => toggleColumnSearchable(table.ID, column.ID, column.IS_SEARCHABLE)}
                                                className={`p-1 rounded-md ${
                                                  column.IS_SEARCHABLE === 'Y' 
                                                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' 
                                                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                                title={column.IS_SEARCHABLE === 'Y' ? 'Disable Searching' : 'Enable Searching'}
                                              >
                                                {column.IS_SEARCHABLE === 'Y' ? (
                                                  <Check className="h-5 w-5" />
                                                ) : (
                                                  <X className="h-5 w-5" />
                                                )}
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center py-6">
                                    <Loader2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Database className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No Tables Available</h3>
                <p className="text-gray-500 mb-4">
                  You haven't added any tables to your database yet.
                </p>
                <Link
                  href="/dashboard/database/add"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Table
                </Link>
              </div>
            )}
          </div>
          
          {/* Next Steps Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card p-6 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 dark:bg-gray-800 dark:border-gray-700"
          >
            <h3 className="text-lg font-medium text-gray-800 mb-4">Next Steps</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/aiquery"
                className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg p-5 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Start Querying</h4>
                  <ArrowRight className="h-5 w-5" />
                </div>
                <p className="text-sm text-indigo-100">
                  Begin asking questions about your data using natural language.
                </p>
              </Link>
              
              <Link
                href="/dashboard/ai-settings"
                className="flex-1 bg-white border border-indigo-200 text-gray-800 rounded-lg p-5 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Configure AI</h4>
                  <Brain className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Customize AI behavior and improve query accuracy.
                </p>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}