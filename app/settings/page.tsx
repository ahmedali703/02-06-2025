//app/settings/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Key, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

export default function SettingsPage() {
  const [oracleConfig, setOracleConfig] = useState({
    user: '',
    password: '',
    connectString: '',
    libDir: '',
  });
  const [openAiKey, setOpenAiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState('');
  const [activeTab, setActiveTab] = useState('database');
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  const formatSchemaToMarkdown = (schema: string) => {
    // Remove the export const and template literal syntax
    const cleanSchema = schema
      .replace(/export const \w+ = `/, '')
      .replace(/`;$/, '')
      .trim();

    // Split into table definitions
    const tables = cleanSchema.split(/\n\n+/);

    // Format each table
    const formattedTables = tables.map(table => {
      const [tableName, columns] = table.split('(');
      if (!columns) return '';

      const formattedColumns = columns
        .replace(')', '')
        .split(',')
        .map(col => col.trim())
        .filter(col => col)
        .map(col => `  ${col}`)
        .join(',\n');

      return `### ${tableName}\n\n\`\`\`sql\n${tableName}(\n${formattedColumns}\n);\n\`\`\`\n`;
    });

    return formattedTables.join('\n');
  };

  const convertMarkdownToSchema = (markdown: string, user: string) => {
    const tables = markdown
      .split('### ')
      .slice(1) // Skip the first empty element
      .map(section => {
        const lines = section.split('\n');
        const tableName = lines[0].trim();
        const sqlContent = lines
          .slice(1)
          .join('\n')
          .match(/```sql\n([\s\S]*?)\n```/)?.[1]
          ?.trim();
        
        return sqlContent || '';
      })
      .filter(Boolean)
      .join('\n\n');

    return `export const ${user.toLowerCase()}Schema = \`\n\n${tables}\n\n\`;`;
  };

  const handleOracleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/connect-oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oracleConfig),
      });
      const data = await response.json();
      if (data.schema) {
        const formattedSchema = formatSchemaToMarkdown(data.schema);
        setSchema(formattedSchema);
      } else if (data.error) {
        setError(data.error);
        console.error('Failed to connect:', data.error);
      }
    } catch (error) {
      setError('Failed to connect to the database. Please check your credentials and try again.');
      console.error('Error connecting to Oracle:', error);
    }
    setLoading(false);
  };
  
  const handleSaveEnv = async () => {
    setApiKeySaving(true);
    setApiKeyError('');
    setApiKeySuccess(false);

    try {
      const response = await fetch('/api/update-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAiKey }),
      });

      if (response.ok) {
        setApiKeySuccess(true);
        setTimeout(() => setApiKeySuccess(false), 3000);
      } else {
        const data = await response.json();
        setApiKeyError(data.error || 'Failed to save API key');
      }
    } catch (error) {
      setApiKeyError('Failed to save API key. Please try again.');
      console.error('Error saving API key:', error);
    }

    setApiKeySaving(false);
  };
  
  const handleSaveSchema = async () => {
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      const schemaContent = convertMarkdownToSchema(schema, oracleConfig.user);
      
      const response = await fetch('/api/update-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schema: schemaContent,
          user: oracleConfig.user,
          password: oracleConfig.password,
          connectString: oracleConfig.connectString,
          libDir: oracleConfig.libDir,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || 'Failed to save schema');
      }
    } catch (error) {
      setSaveError('Failed to save schema. Please try again.');
      console.error('Error saving schema:', error);
    }
    
    setSaveLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col min-h-screen">
        {/* Main Content */}
        <div className="flex-grow p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#6c5ce7] mb-2">Settings</h1>
              <p className="text-gray-500">
                Configure your database and API connections
              </p>
            </div>
  
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('database')}
                className={`px-4 py-2 rounded-md text-sm ${
                  activeTab === 'database' ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]' : 'text-gray-500'
                }`}
              >
                <span className="flex items-center"></span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M10 0C4.4813 0 0 1.34339 0 3V17C0 18.6566 4.4813 20 10 20C15.5187 20 20 18.6566 20 17V3C20 1.34339 15.5187 0 10 0ZM10 5C15.5214 5 18 6.38469 18 7C18 7.61531 15.5214 9 10 9C4.47862 9 2 7.61531 2 7C2 6.38469 4.47862 5 10 5ZM2 9.87411C3.41609 10.5968 6.24381 11 10 11C13.7562 11 16.5839 10.5968 18 9.87411V13C18 13.6153 15.5214 15 10 15C4.47862 15 2 13.6153 2 13V9.87411ZM2 15.8741C3.41609 16.5968 6.24381 17 10 17C13.7562 17 16.5839 16.5968 18 15.8741V17C18 17.6153 15.5214 19 10 19C4.47862 19 2 17.6153 2 17V15.8741Z" fill="currentColor" />
                </svg>
                Database Connection
              </button>
                
              <button
                onClick={() => setActiveTab('openai')}
                className={`px-4 py-2 rounded-md text-sm ${
                  activeTab === 'openai' ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]' : 'text-gray-500'
                }`}
              >
                <span className="flex items-center"></span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                    <path d="M15 2.5C14.337 2.5 13.7011 2.76339 13.2322 3.23223C12.7634 3.70107 12.5 4.33696 12.5 5C12.5 5.06575 12.5027 5.13086 12.5078 5.19531C10.9348 5.45007 9.53555 6.26781 8.53711 7.5H7.5C6.83696 7.5 6.20107 7.76339 5.73223 8.23223C5.26339 8.70107 5 9.33696 5 10V11.25H3.75C3.05964 11.25 2.5 11.8096 2.5 12.5V15C2.5 15.6904 3.05964 16.25 3.75 16.25H7.5C7.83152 16.25 8.14946 16.1183 8.38388 15.8839C8.6183 15.6495 8.75 15.3315 8.75 15V11.25C8.75 10.9185 8.6183 10.6005 8.38388 10.3661C8.14946 10.1317 7.83152 10 7.5 10H6.25V10C6.25 9.66848 6.3817 9.35054 6.61612 9.11612C6.85054 8.8817 7.16848 8.75 7.5 8.75H9.01367C8.29356 10.4547 8.55811 12.422 9.69727 13.9219C9.87305 14.1555 10.0767 14.3683 10.3008 14.5566C10.1068 14.8359 10 15.174 10 15.5312V16.875C10 17.2016 10.1317 17.5145 10.3661 17.7489C10.6005 17.9833 10.9185 18.125 11.25 18.125H13.75C14.0815 18.125 14.3995 17.9833 14.6339 17.7489C14.8683 17.5145 15 17.2016 15 16.875V15.5312C15 15.1724 14.8932 14.8338 14.6992 14.5547C15.6386 13.8842 16.3449 12.9345 16.7109 11.8222C17.0769 10.7099 17.0843 9.50382 16.7324 8.38672C16.6656 8.18164 16.5856 7.97851 16.4922 7.78321C17.4166 7.44043 18.125 6.54883 18.125 5.5C18.125 4.77065 17.8352 4.07118 17.3195 3.55546C16.8038 3.03973 16.1044 2.75 15.375 2.75L15 2.5ZM15 3.75C15.4973 3.75 15.875 4.12695 15.875 4.625C15.875 5.12305 15.4973 5.5 15 5.5C14.5027 5.5 14.125 5.12305 14.125 4.625C14.125 4.12695 14.5027 3.75 15 3.75ZM10 6.25C11.4336 6.25 12.7324 6.9082 13.5547 7.99609C14.377 9.08398 14.6309 10.5059 14.209 11.7969C13.7871 13.0879 12.7519 14.1035 11.4531 14.5078C11.3653 14.5342 11.2758 14.5557 11.1855 14.5723C10.7392 14.6489 10.2808 14.649 9.83447 14.5728C9.7442 14.5562 9.65479 14.5347 9.56702 14.5083C8.94336 14.2961 8.38477 13.9141 7.94336 13.3789C7.03906 12.2285 6.80664 10.666 7.27344 9.28906C7.74023 7.91211 8.82617 6.86133 10.1934 6.43555C10.1296 6.71289 10.0938 6.95117 10.0938 7.1875C10.0938 7.83398 10.3496 8.43554 10.7852 8.87109C11.4473 9.53516 12.5 9.51953 13.1465 8.87109C13.498 8.5177 13.6768 8.04493 13.7461 7.5625C13.8155 7.08008 13.7708 6.53907 13.5 6.06836C13.4487 5.97461 13.3901 5.88476 13.3242 5.79883C13.6279 5.9209 13.9121 6.08008 14.1738 6.26953C14.8281 6.77539 15.291 7.47657 15.4629 8.26954C15.7832 9.79493 14.6953 11.4727 12.9453 11.8438C12.5039 11.9336 12.0459 11.9355 11.6016 11.8555C11.5117 11.8379 11.4219 11.8164 11.334 11.7911C10.708 11.6123 10.1494 11.2598 9.74219 10.7744C8.48828 9.25977 9.12891 6.89649 11.041 6.44727C10.71 6.3125 10.3594 6.25 10 6.25ZM3.75 12.5H5V15H3.75V12.5ZM11.25 16.875H13.75V16.8638L13.75 15.5312C13.75 15.2002 13.4863 14.9375 13.1562 14.9375C12.9956 14.9375 12.8418 14.9996 12.7246 15.1123C12.6074 15.2251 12.5393 15.3762 12.5332 15.5367C12.5332 15.5386 12.5313 15.5391 12.5313 15.541C12.5313 15.7353 12.4612 15.9267 12.3279 16.0698C12.1946 16.2128 12.0096 16.2957 11.8154 16.3091C11.6211 16.3224 11.4266 16.2652 11.2755 16.1483C11.1244 16.0315 11.0289 15.8635 11.0039 15.6714C10.9789 15.4793 11.0263 15.2849 11.1367 15.1289C11.2471 14.9729 11.4121 14.8667 11.5977 14.832C11.5996 14.832 11.6016 14.832 11.6035 14.8301C12.2676 14.6553 12.8575 14.2139 13.2148 13.5977C13.4981 13.1245 13.6603 12.5871 13.6856 12.0352C14.5508 11.3169 15.0605 10.1895 14.9902 9.01368C14.9673 8.64258 14.8864 8.27734 14.7539 7.92969C14.7773 7.93164 14.8027 7.93555 14.8262 7.93946C15.5137 8.08399 16.001 8.7334 15.9414 9.37696C15.8457 10.4121 15.1875 11.4434 14.1309 11.9609C14.001 11.9629 13.876 12.0078 13.7715 12.0917C13.667 12.1755 13.5879 12.2949 13.5469 12.4307C13.5059 12.5664 13.5051 12.7117 13.5444 12.848C13.5837 12.9843 13.6613 13.1047 13.7646 13.1899C13.8679 13.2751 13.9921 13.3217 14.1214 13.3236C14.2505 13.3255 14.3759 13.2826 14.4813 13.2003C14.5317 13.163 14.5767 13.12 14.6162 13.0731C14.7246 13.3159 14.7812 13.5879 14.7832 13.8662C14.7832 14.5118 14.5 15.1094 14.0078 15.5352C14.0059 15.5371 14.0039 15.5391 14.002 15.541C14.0017 15.5413 14.0015 15.5415 14.0013 15.5417C13.9991 15.5448 13.997 15.548 13.9951 15.5508V16.875H11.25Z" fill="currentColor" />
                  </svg>
                OpenAI API
              </button>
            </div>
  
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-100 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-800 font-medium mb-1">Connection Error</h3>
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              )}
  
              {activeTab === 'database' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Oracle User
                      </label>
                      <input
                        type="text"
                        value={oracleConfig.user}
                        onChange={(e) =>
                          setOracleConfig({ ...oracleConfig, user: e.target.value })
                        }
                        className="w-full bg-gray-200 rounded-md px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/50"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        Oracle Password
                      </label>
                      <input
                        type="password"
                        value={oracleConfig.password}
                        onChange={(e) =>
                          setOracleConfig({ ...oracleConfig, password: e.target.value })
                        }
                        className="w-full bg-gray-200 rounded-md px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/50"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Connect String
                    </label>
                    <input
                      type="text"
                      value={oracleConfig.connectString}
                      onChange={(e) =>
                        setOracleConfig({ ...oracleConfig, connectString: e.target.value })
                      }
                      className="w-full bg-gray-200 rounded-md px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/50"
                      placeholder="(e.g., 5.189.139.14:1521/XEPDB1)"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Library Directory
                    </label>
                    <input
                      type="text"
                      value={oracleConfig.libDir}
                      onChange={(e) =>
                        setOracleConfig({ ...oracleConfig, libDir: e.target.value })
                      }
                      className="w-full bg-gray-200 rounded-md px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/50"
                      placeholder="(e.g., /opt/oracle/product/21c/dbhomeXE/lib/)"
                    />
                  </div>
  
                  <button
                    onClick={handleOracleConnect}
                    disabled={loading}
                    className={`w-full flex items-center justify-center space-x-2 bg-[#6c5ce7] text-white hover:bg-[#6c5ce7]/90 px-4 py-2 rounded-md transition-colors ${
                      loading ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect to Database</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
  
                  {schema && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-medium text-gray-500">
                          Database Schema
                        </h3>
                        <button
                          onClick={handleSaveSchema}
                          disabled={saveLoading}
                          className={`text-[#6c5ce7] hover:text-[#6c5ce7]/80 text-sm flex items-center space-x-2 ${
                            saveLoading ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                        >
                          <span>{saveLoading ? 'Saving...' : 'Save Schema'}</span>
                          {saveSuccess && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </button>
                      </div>
                      
                      {saveError && (
                        <div className="mb-4 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start space-x-3">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{saveError}</p>
                        </div>
                      )}
                      
                      {saveSuccess && (
                        <div className="mb-4 bg-green-50 border border-green-100 rounded-lg p-3 flex items-start space-x-3">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-green-600">Schema saved successfully!</p>
                        </div>
                      )}
                      
                      <div className="max-h-[400px] overflow-y-auto rounded-lg bg-white border border-gray-200" data-color-mode="light">
                        <MDEditor
                          value={schema}
                          onChange={(value) => setSchema(value || '')}
                          preview="live"
                          hideToolbar={true}
                          height={400}
                          className="!bg-transparent border-none"
                          style={{
                            backgroundColor: 'transparent',
                          }}
                          previewOptions={{
                            className: "prose max-w-none px-4",
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={openAiKey}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                      className="w-full bg-gray-200 rounded-md px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/50"
                      placeholder="Enter your API key"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Your API key will be securely stored and used for AI-powered features
                    </p>
                  </div>

                  {apiKeyError && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start space-x-3">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{apiKeyError}</p>
                    </div>
                  )}

                  {apiKeySuccess && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-start space-x-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-600">API key saved successfully!</p>
                    </div>
                  )}

                  <button
                    onClick={handleSaveEnv}
                    disabled={apiKeySaving}
                    className={`w-full flex items-center justify-center space-x-2 bg-[#6c5ce7] text-white hover:bg-[#6c5ce7]/90 px-4 py-2 rounded-md transition-colors ${
                      apiKeySaving ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {apiKeySaving ? (
                      <>
                        <span className="animate-spin mr-2">
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Save API Key</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                    {apiKeySuccess && <CheckCircle2 className="h-4 w-4 ml-2" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}