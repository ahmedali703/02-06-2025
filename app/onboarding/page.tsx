//app/onboarding/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ChevronRightIcon, 
  ServerIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Define types for our application
interface DatabaseField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  type?: string;
}

interface DbTable {
  name: string;
  columns: Array<{
    name: string;
    type: string;
  }>;
}

interface ConnectionStatus {
  success: boolean;
  message: string;
}

type DatabaseType = 'oracle' | 'mssql' | 'mysql' | 'postgres';

// Database field configurations for each supported database type
const databaseFields: Record<DatabaseType, DatabaseField[]> = {
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
    // Removed SSL field as requested
  ],
};

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [selectedDbType, setSelectedDbType] = useState<DatabaseType>('oracle');
  const [connectionData, setConnectionData] = useState<Record<string, string>>({});
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [tables, setTables] = useState<DbTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [schema, setSchema] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Initialize connection data based on selected database type
  useEffect(() => {
    const initialData: Record<string, string> = {};
    databaseFields[selectedDbType].forEach(field => {
      initialData[field.name] = '';
    });
    setConnectionData(initialData);
    setConnectionStatus(null);
  }, [selectedDbType]);
  
  const handleFieldChange = (fieldName: string, value: string): void => {
    setConnectionData({
      ...connectionData,
      [fieldName]: value
    });
    // Reset connection status when fields change
    setConnectionStatus(null);
  };
  
  const handleTestConnection = async (): Promise<void> => {
    setIsTestingConnection(true);
    setError('');
    
    try {
      // Add database type to connection data
      const connectionDataWithType = {
        ...connectionData,
        databaseType: selectedDbType
      };
      
      // Use the new multi-database endpoint
      const response = await fetch('/api/connect-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionDataWithType),
      });
      
      const data = await response.json();
      
      if (data.schema) {
        setSchema(data.schema);
        setConnectionStatus({ success: true, message: 'Connection test successful!' });
      } else if (data.error) {
        setError(data.error);
        setConnectionStatus({ success: false, message: data.error });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to connect to the database: ${errorMessage}`);
      setConnectionStatus({ 
        success: false, 
        message: `Failed to connect to the database. Please check your credentials and try again. ${errorMessage}` 
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  const handleSaveConnection = async (): Promise<void> => {
    setLoadingTables(true);
    
    try {
      // Improved schema parsing to extract table information more accurately
      const extractedTables: DbTable[] = [];
      
      // Parse the schema to extract table information
      const cleanSchema = schema
        .replace(/export const \w+ = /, '')
        .replace(/;$/, '')
        .trim();
      
      // Better regex pattern to capture table name and column definitions
      const tableRegex = /(\w+)\s*\(\s*([\s\S]*?)(?=\)\s*;)/g;
      
      let match;
      while ((match = tableRegex.exec(cleanSchema)) !== null) {
        const tableName = match[1];
        const columnsStr = match[2];
        
        // Improved column extraction with support for different column definitions
        const columnEntries = columnsStr.split(',').map(entry => entry.trim());
        const columns: Array<{name: string, type: string}> = [];
        
        for (const entry of columnEntries) {
          if (entry.trim() === '') continue;
          
          // Extract name and type from column definition
          const columnParts = entry.split(/\s+/);
          if (columnParts.length >= 2) {
            const columnName = columnParts[0];
            const columnType = columnParts[1];
            
            columns.push({
              name: columnName,
              type: columnType
            });
          }
        }
        
        if (columns.length > 0) {
          extractedTables.push({
            name: tableName,
            columns
          });
        }
      }
      
      setTables(extractedTables);
      
      // Move to the next step
      setCurrentStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error processing database schema: ${errorMessage}`);
      console.error('Error processing schema:', err);
    } finally {
      setLoadingTables(false);
    }
  };
  
  const toggleSelectTable = (tableName: string): void => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };
  
  const handleSelectAllTables = (): void => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map(t => t.name));
    }
  };
  
  const handleFinishSetup = async (): Promise<void> => {
    setIsSaving(true);
    
    try {
      // Prepare data for saving to the new schema structure
      const databaseInfo = JSON.stringify(connectionData);
      
      // Only include selected tables in the database objects
      const selectedTablesData = tables.filter(table => selectedTables.includes(table.name));
      
      const databaseObjects = JSON.stringify({
        tables: selectedTablesData
      });
      
      // Call API to save onboarding data
      const response = await fetch('/api/save-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: organizationName,
          databaseType: selectedDbType,
          databaseInfo,
          databaseObjects
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // On success, show success message and redirect to dashboard
        toast.success("Setup completed successfully!");
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to save onboarding data');
        setError(data.error || 'Failed to save onboarding data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error saving onboarding data:', err);
      toast.error(`Failed to complete setup: ${errorMessage}`);
      setError(`Failed to complete setup: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNextStep = (): void => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const isStepComplete = (): boolean => {
    switch(currentStep) {
      case 1:
        return organizationName.trim().length > 0;
      case 2:
        return connectionStatus?.success === true;
      case 3:
        return selectedTables.length > 0;
      default:
        return false;
    }
  };
  
  const areRequiredFieldsFilled = (): boolean => {
    const requiredFields = databaseFields[selectedDbType].filter(field => field.required);
    return requiredFields.every(field => connectionData[field.name]?.trim().length > 0);
  };

  // Get step description
  const getStepDescription = (): string => {
    switch(currentStep) {
      case 1:
        return "Let's set up your organization to get started";
      case 2:
        return "Connect to your database to start querying";
      case 3:
        return "Select the tables you want to make available for querying";
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen grid-pattern flex flex-col justify-between">
      <div>
        <nav className="fixed w-full z-50 bg-white/80 dark:bg-background/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <a href="/" className="flex items-center space-x-2">
                <span className="text-2xl md:text-3xl font-bold">
                  <span className="text-purple-500 dark:text-purple-400">AI</span>
                  <span className="text-gray-700 dark:text-gray-200">Query</span>
                </span>
              </a>
            </div>
          </div>
        </nav>

        <section className="pt-32 pb-20 relative hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Title and subtitle fixed outside the wizard */}
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
                <span className="text-indigo-600 dark:text-indigo-400">Welcome to MyQuery</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8">
                {getStepDescription()}
              </p>
            </div>
            
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm
                      ${step < currentStep 
                          ? 'bg-indigo-600 text-white' 
                          : step === currentStep 
                            ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' 
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step < currentStep ? (
                        <CheckIcon className="w-6 h-6" />
                      ) : (
                        <span className="text-lg font-medium">{step}</span>
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${
                      step <= currentStep ? 'text-indigo-600' : 'text-gray-400'
                    }`}>
                      {step === 1 ? 'Organization' : step === 2 ? 'Database' : 'Tables'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative flex items-center justify-center mt-6 max-w-2xl mx-auto">
                <div className="absolute w-full h-1 bg-gray-200">
                  <motion.div 
                    className="h-full bg-indigo-600 transition-all duration-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                  ></motion.div>
                </div>
              </div>
            </div>
            
            {/* Step Content - now without title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card p-8 max-w-4xl mx-auto"
            >
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
              
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 1: Organization Name */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="w-full px-4 py-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter your organization name"
                      />
                      <p className="mt-2 text-sm text-muted-foreground">
                        This name will be used throughout your MyQuery experience
                      </p>
                    </div>
                    
                    <button
                      onClick={handleNextStep}
                      disabled={!isStepComplete()}
                      className={`w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                        isStepComplete()
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>Continue</span>
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
                
                {/* Step 2: Database Connection */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-4">
                        Database Type
                      </label>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {Object.keys(databaseFields).map((dbType) => (
                          <button
                            key={dbType}
                            onClick={() => setSelectedDbType(dbType as DatabaseType)}
                            className={`p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-3 border ${
                              selectedDbType === dbType
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <ServerIcon className={`h-8 w-8 ${
                              selectedDbType === dbType ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                            }`} />
                            <span className={`${selectedDbType === dbType ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                              {dbType === 'oracle' ? 'Oracle' :
                               dbType === 'mssql' ? 'SQL Server' :
                               dbType === 'mysql' ? 'MySQL' : 'Postgres'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-foreground">Connection Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {databaseFields[selectedDbType].map((field: DatabaseField) => (
                          <div key={field.name}>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              {field.label} {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
                            </label>
                            <input
                              type={field.type || 'text'}
                              value={connectionData[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full px-4 py-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {connectionStatus && (
                      <div className={`p-4 rounded-lg flex items-start space-x-3 ${
                        connectionStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        {connectionStatus.success ? (
                          <CheckIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${connectionStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                            {connectionStatus.message}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || !areRequiredFieldsFilled()}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                          !isTestingConnection && areRequiredFieldsFilled()
                            ? 'bg-background border border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                            : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isTestingConnection ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <span>Test Connection</span>
                        )}
                      </button>
                      
                      <button
                        onClick={handleSaveConnection}
                        disabled={!connectionStatus?.success}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                          connectionStatus?.success
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <span>Save Connection</span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Select Tables */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    {loadingTables ? (
                      <div className="py-16 flex flex-col items-center justify-center">
                        <ArrowPathIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-6" />
                        <p className="text-lg text-muted-foreground">Loading database tables...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="text-lg text-muted-foreground">
                            <span className="font-medium text-foreground">{tables.length}</span> tables found in your database
                          </p>
                          <button
                            onClick={handleSelectAllTables}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center space-x-1"
                          >
                            {selectedTables.length === tables.length && tables.length > 0 ? (
                              <>
                                <span>Deselect All</span>
                              </>
                            ) : (
                              <>
                                <span>Select All</span>
                                <PlusIcon className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="border border-input rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-input flex items-center">
                            <div className="w-8">
                              <input
                                type="checkbox"
                                checked={selectedTables.length === tables.length && tables.length > 0}
                                onChange={handleSelectAllTables}
                                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              />
                            </div>
                            <div className="flex-1 font-medium text-foreground ml-2">Table Name</div>
                            <div className="w-24 text-center font-medium text-foreground">Columns</div>
                          </div>
                          
                          <div className="max-h-96 overflow-y-auto">
                            {tables.map((table) => (
                              <div 
                                key={table.name}
                                className={`px-6 py-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                                  tables.indexOf(table) !== tables.length - 1 ? 'border-b border-input' : ''
                                }`}
                              >
                                <div className="w-8">
                                  <input
                                    type="checkbox"
                                    checked={selectedTables.includes(table.name)}
                                    onChange={() => toggleSelectTable(table.name)}
                                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-input bg-background"
                                  />
                                </div>
                                <div className="flex-1 font-medium text-foreground ml-2">
                                  {table.name}
                                </div>
                                <div className="w-24 text-center text-muted-foreground">
                                  {table.columns.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <button
                            onClick={handleFinishSetup}
                            disabled={selectedTables.length === 0 || isSaving}
                            className={`w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg transition-colors ${
                              selectedTables.length > 0 && !isSaving
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {isSaving ? (
                              <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <span>Start Using MyQuery</span>
                                <SparklesIcon className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>

      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">MyQuery</h3>
              <p className="text-gray-400">
                Transform natural language into powerful SQL queries with advanced AI technology.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">© 2025 MyQuery. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white">
                  <TwitterIcon className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <GitHubIcon className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <LinkedInIcon className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Social Icons components
function TwitterIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  );
}

function GitHubIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LinkedInIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon(props: any) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}