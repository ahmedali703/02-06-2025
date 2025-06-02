'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ChevronsUpDown, 
  Database, 
  Loader2, 
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FileText,
  ExternalLink,
  Edit,
  ArrowUpRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ContextMenu } from '@/components/context-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface DatabaseSelectorProps {
  onDatabaseSelect: (orgId: number) => void;
  selectedOrgId?: number;
}

interface Database {
  ORG_ID: number;
  ORG_NAME: string;
  DATABASE_TYPE: string;
}

export interface SchemaTable {
  ID: number;
  TABLE_NAME: string;
  TABLE_DESCRIPTION?: string;
  columns: SchemaColumn[];
}

export interface SchemaColumn {
  ID: number;
  TABLE_ID: number;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  COLUMN_DESCRIPTION?: string;
  IS_PRIMARY_KEY?: string;
  IS_FOREIGN_KEY?: string;
}

export function DatabaseSelector({ onDatabaseSelect, selectedOrgId }: DatabaseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Fetch available databases and set default selection
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        // Get user ID from localStorage or cookies
        const userId = localStorage.getItem('userId') || document.cookie
          .split('; ')
          .find(row => row.startsWith('userId='))
          ?.split('=')[1];
        
        console.log('DatabaseSelector - Fetching databases for user:', userId);
        
        // Fetch databases with user context
        const response = await fetch(`/api/databases${userId ? `?userId=${userId}` : ''}`);
        if (!response.ok) {
          throw new Error('Failed to fetch databases');
        }
        const data = await response.json();
        console.log('DatabaseSelector - Fetched databases:', data);
        setDatabases(data);
        
        // Set default database if available and none is selected
        if (data.length > 0 && !selectedOrgId) {
          const defaultOrgId = data[0].ORG_ID;
          onDatabaseSelect(defaultOrgId);
        }
      } catch (error) {
        console.error('Error fetching databases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabases();
    
    // Refresh database list periodically
    const refreshInterval = setInterval(fetchDatabases, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [selectedOrgId, onDatabaseSelect]);

  // Fetch schema when a database is selected
  useEffect(() => {
    if (selectedOrgId) {
      fetchSchema(selectedOrgId);
    }
  }, [selectedOrgId]);

  const fetchSchema = async (orgId: number) => {
    setLoadingSchema(true);
    try {
      const response = await fetch(`/api/schema?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schema');
      }
      const data = await response.json();
      
      // Process schema data
      const tables: SchemaTable[] = [];
      const tableMap: Record<number, SchemaTable> = {};
      
      // First pass: create tables
      if (data.tables && Array.isArray(data.tables)) {
        data.tables.forEach((table: any) => {
          const newTable: SchemaTable = {
            ID: table.ID,
            TABLE_NAME: table.TABLE_NAME,
            TABLE_DESCRIPTION: table.TABLE_DESCRIPTION,
            columns: []
          };
          tables.push(newTable);
          tableMap[table.ID] = newTable;
        });
      }
      
      // Second pass: add columns to tables
      if (data.columns && Array.isArray(data.columns)) {
        data.columns.forEach((column: any) => {
          const tableId = column.TABLE_ID;
          if (tableMap[tableId]) {
            tableMap[tableId].columns.push({
              ID: column.ID,
              TABLE_ID: tableId,
              COLUMN_NAME: column.COLUMN_NAME,
              COLUMN_TYPE: column.COLUMN_TYPE,
              COLUMN_DESCRIPTION: column.COLUMN_DESCRIPTION,
              IS_PRIMARY_KEY: column.IS_PRIMARY_KEY,
              IS_FOREIGN_KEY: column.IS_FOREIGN_KEY
            });
          }
        });
      }
      
      setSchema(tables);
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  const toggleTable = (tableId: number) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableId]: !prev[tableId]
    }));
  };

  const selectedDatabase = selectedOrgId 
    ? databases.find(db => db.ORG_ID === selectedOrgId) 
    : undefined;

  // Filter tables based on search query
  const filteredTables = schema.filter(table => 
    table.TABLE_NAME.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow transition-all duration-200"
            >
              <span className="flex items-center">
                <Database className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {selectedDatabase ? selectedDatabase.ORG_NAME : "Select database..."}
              </span>
              {loading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-indigo-600/50 dark:text-indigo-400/50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <Command className="bg-transparent">
              <CommandInput placeholder="Search databases..." className="border-b border-gray-200 dark:border-gray-700" />
              <CommandEmpty className="py-6 text-center text-gray-500 dark:text-gray-400">No database found.</CommandEmpty>
              <CommandGroup className="p-1.5">
                {loading ? (
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ) : databases.length > 0 ? (
                  databases.map((database) => (
                    <CommandItem
                      key={database.ORG_ID}
                      value={database.ORG_NAME}
                      onSelect={() => {
                        onDatabaseSelect(database.ORG_ID);
                        setOpen(false);
                      }}
                      className={cn(
                        "rounded-md transition-all duration-200",
                        selectedOrgId === database.ORG_ID ? 
                          "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : 
                          "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <motion.div 
                        className="flex items-center w-full"
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Database className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{database.ORG_NAME}</span>
                      </motion.div>
                      {selectedOrgId === database.ORG_ID && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="ml-auto h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </motion.div>
                      )}
                    </CommandItem>
                  ))
                ) : (
                  <div className="p-6 text-center space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No databases available for your account</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                      className="mt-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
                    >
                      <Link href="/dashboard/database" className="flex items-center">
                        <span className="mr-1 font-bold">+</span> Add Database Connection
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <motion.div 
        className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg glass-card shadow-sm"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-3 bg-white/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 rounded-t-lg" 
          onClick={toggleSidebar}
        >
          <motion.div className="flex items-center" whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
            <Database className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tables</span>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.95 }}
            className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-1"
          >
            {showSidebar ? (
              <ChevronLeft className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </motion.div>
        </div>
        
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search tables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50 rounded-md shadow-sm text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              
              <ScrollArea className="max-h-[calc(100vh-250px)] overflow-auto bg-white dark:bg-gray-800 rounded-b-lg p-1">
                {!selectedOrgId ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400 space-y-4">
                    <Database className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
                    <p>Select a database to view schema</p>
                  </div>
                ) : loadingSchema ? (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-center py-2 mb-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading schema...</span>
                    </div>
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400 space-y-4">
                    {searchQuery ? (
                      <>
                        <TableIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
                        <p>No tables found matching "{searchQuery}"</p>
                      </>
                    ) : (
                      <>
                        <TableIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
                        <p>No tables found in this database</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredTables.map((table) => (
                      <motion.div 
                        key={table.ID} 
                        className="mb-1"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ContextMenu
                          items={[
                            {
                              label: 'Open Table',
                              icon: <ExternalLink className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
                              onClick: () => {
                                // Open table in a tab
                                const event = new CustomEvent('openTableTab', {
                                  detail: { 
                                    tableId: table.ID, 
                                    tableName: table.TABLE_NAME,
                                    columns: table.columns
                                  }
                                });
                                document.dispatchEvent(event);
                              }
                            },
                            {
                              label: 'Edit Table',
                              icon: <Edit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
                              onClick: () => {
                                // Open edit table in a tab
                                const event = new CustomEvent('openEditTableTab', {
                                  detail: { tableId: table.ID, tableName: table.TABLE_NAME }
                                });
                                document.dispatchEvent(event);
                              }
                            }
                          ]}
                        >
                          <div className="rounded-md overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md cursor-pointer group transition-colors duration-200"
                              onClick={() => {
                                // Open table in a tab directly instead of toggling
                                const event = new CustomEvent('openTableTab', {
                                  detail: { 
                                    tableId: table.ID, 
                                    tableName: table.TABLE_NAME,
                                    columns: table.columns
                                  }
                                });
                                document.dispatchEvent(event);
                              }}
                            >
                              <div className="flex items-center">
                                <TableIcon className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                                        {table.TABLE_NAME}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <p>{table.TABLE_NAME}</p>
                                      {table.TABLE_DESCRIPTION && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{table.TABLE_DESCRIPTION}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex items-center">
                                <Badge className="mr-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                  {table.columns.length}
                                </Badge>
                                <motion.div
                                  animate={{ rotate: expandedTables[table.ID] ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </motion.div>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedTables[table.ID] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden pl-6 pr-2 pb-1"
                                >
                                  <div className="space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                    {table.columns.map((column) => (
                                      <motion.div
                                        key={column.ID}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: 0.05 }}
                                        className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded group transition-colors duration-200"
                                        onClick={() => {
                                          // Open table in a tab with focus on this column
                                          const event = new CustomEvent('openTableTab', {
                                            detail: { 
                                              tableId: table.ID, 
                                              tableName: table.TABLE_NAME,
                                              columns: table.columns,
                                              focusColumn: column.COLUMN_NAME
                                            }
                                          });
                                          document.dispatchEvent(event);
                                        }}
                                      >
                                        <div className="flex items-center">
                                          <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="text-xs truncate text-gray-600 dark:text-gray-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200">
                                                  {column.COLUMN_NAME}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent side="right" className="max-w-xs">
                                                <div className="space-y-1">
                                                  <p className="font-medium">{column.COLUMN_NAME}</p>
                                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Type: <span className="font-mono">{column.COLUMN_TYPE}</span>
                                                  </p>
                                                  {column.COLUMN_DESCRIPTION && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                      {column.COLUMN_DESCRIPTION}
                                                    </p>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          {column.IS_PRIMARY_KEY === 'Y' && (
                                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] px-1 py-0">
                                              PK
                                            </Badge>
                                          )}
                                          {column.IS_FOREIGN_KEY === 'Y' && (
                                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1 py-0">
                                              FK
                                            </Badge>
                                          )}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </ContextMenu>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
