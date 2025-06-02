'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableView } from '@/components/table-view';
import { SchemaColumn, DatabaseSelector } from '@/components/database-selector';
import { ChevronLeft, ChevronRight, DatabaseIcon, TableIcon, Settings, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TablesPage() {
  const [tableId, setTableId] = useState<number | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [columns, setColumns] = useState<SchemaColumn[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get the selected table information from localStorage
    const storedTableId = localStorage.getItem('selectedTableId');
    const storedTableName = localStorage.getItem('selectedTableName');
    const storedColumns = localStorage.getItem('selectedTableColumns');
    const storedOrgId = localStorage.getItem('selectedOrgId');
    
    if (storedOrgId) {
      const orgId = parseInt(storedOrgId);
      setSelectedOrgId(orgId);
      
      // Fetch the database schema for the selected organization
      const fetchSchema = async () => {
        try {
          const response = await fetch(`/api/schema?orgId=${orgId}`);
          if (!response.ok) {
            console.error('Failed to fetch schema for org ID:', orgId);
          }
        } catch (error) {
          console.error('Error fetching schema:', error);
        }
      };
      
      fetchSchema();
    }
    
    if (storedTableId && storedTableName) {
      setTableId(parseInt(storedTableId));
      setTableName(storedTableName);
      
      // Parse the columns if available
      if (storedColumns) {
        try {
          const parsedColumns = JSON.parse(storedColumns) as SchemaColumn[];
          setColumns(parsedColumns);
        } catch (error) {
          console.error('Error parsing columns:', error);
          setColumns([]);
        }
      }
    }
    
    // Add event listener for table selection
    const handleOpenTableTab = (event: CustomEvent) => {
      const { tableId, tableName, columns } = event.detail;
      console.log('Table selected:', tableId, tableName);
      
      // Update state
      setTableId(tableId);
      setTableName(tableName);
      setColumns(columns || []);
      
      // Store in localStorage for persistence
      localStorage.setItem('selectedTableId', tableId.toString());
      localStorage.setItem('selectedTableName', tableName);
      if (columns) {
        localStorage.setItem('selectedTableColumns', JSON.stringify(columns));
      }
    };
    
    // Add event listener
    document.addEventListener('openTableTab', handleOpenTableTab as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener('openTableTab', handleOpenTableTab as EventListener);
    };
  }, []);
  
  // Handle database selection
  const handleDatabaseSelect = (orgId: number) => {
    console.log('Selected database with org ID:', orgId);
    setSelectedOrgId(orgId);
    localStorage.setItem('selectedOrgId', orgId.toString());
    
    // Clear any previously selected table when changing database
    setTableId(null);
    setTableName(null);
    setColumns([]);
    localStorage.removeItem('selectedTableId');
    localStorage.removeItem('selectedTableName');
    localStorage.removeItem('selectedTableColumns');
    
    // Fetch the database schema for the selected organization
    const fetchSchema = async () => {
      try {
        const response = await fetch(`/api/schema?orgId=${orgId}`);
        if (!response.ok) {
          console.error('Failed to fetch schema for org ID:', orgId);
        }
      } catch (error) {
        console.error('Error fetching schema:', error);
      }
    };
    
    fetchSchema();
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Refresh current table data
  const refreshTable = () => {
    if (tableId && tableName) {
      setIsLoading(true);
      
      // Simulate refresh delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900"
    >
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Schema Explorer Sidebar */}
        <div className="flex h-full">
          {/* Toggle button for collapsed sidebar */}
          {!showSidebar && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start"
            >
              <button 
                onClick={toggleSidebar}
                className="glass-card bg-white dark:bg-gray-800 p-2 rounded-r-md shadow-md border border-l-0 border-gray-200/70 dark:border-gray-700/50 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg focus:outline-none transition-all duration-200 active:scale-95 h-full"
                title="Open Tables"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}
          
          {/* Tables Sidebar */}
          <motion.div 
            layout
            className={`${showSidebar ? 'w-72' : 'w-0 overflow-hidden'} glass-card border border-gray-200/70 dark:border-gray-700/50 bg-white dark:bg-gray-800 shadow-md rounded-lg relative flex flex-col transition-all duration-300`}
          >
            <div className="border-b border-gray-200/70 dark:border-gray-700/50 px-4 py-3 flex justify-between items-center bg-white/80 dark:bg-gray-800/80 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <DatabaseIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Schema Explorer</h2>
              </div>
              <button 
                onClick={toggleSidebar} 
                className="text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-gray-800 rounded-b-lg">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Select Database
                </h3>
                <DatabaseSelector 
                  onDatabaseSelect={handleDatabaseSelect}
                  selectedOrgId={selectedOrgId}
                />
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Main Content */}
        <motion.div 
          layout
          className="flex-1 overflow-y-auto glass-card bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200/70 dark:border-gray-700/50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Loading table data...</p>
              </div>
            </div>
          ) : !tableId || !tableName ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
              <div className="text-center space-y-4 p-8 max-w-md">
                <TableIcon className="h-16 w-16 text-indigo-600/30 dark:text-indigo-400/30 mx-auto" />
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No Table Selected</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a table from the schema explorer in the sidebar to view its data.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <TableIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {tableName}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {columns.length} columns
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={refreshTable}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </motion.div>
              
              <TableView tableId={tableId} tableName={tableName} columns={columns} />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
