'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Pencil, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Table2, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  X,
  Table
} from 'lucide-react';

interface DbColumn {
  ID: number;
  TABLE_ID: number;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  COLUMN_DESCRIPTION: string;
  IS_SEARCHABLE: string;
  CREATED_AT: string;
  isEditing?: boolean;
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

export default function EditTablePage() {
  const router = useRouter();
  const params = useParams();
  const tableId = typeof params.tableId === 'string' ? parseInt(params.tableId, 10) : NaN;
  
  // State variables
  const [table, setTable] = useState<DbTable | null>(null);
  const [columns, setColumns] = useState<DbColumn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // New column state
  const [newColumn, setNewColumn] = useState<Partial<DbColumn>>({
    COLUMN_NAME: '',
    COLUMN_TYPE: '',
    COLUMN_DESCRIPTION: '',
    IS_SEARCHABLE: 'Y'
  });
  const [showNewColumnForm, setShowNewColumnForm] = useState<boolean>(false);
  
  // Editable table data
  const [editableTable, setEditableTable] = useState<Partial<DbTable>>({
    TABLE_NAME: '',
    TABLE_DESCRIPTION: ''
  });

  // Fetch table data
  useEffect(() => {
    if (isNaN(tableId)) {
      setError('Invalid table ID');
      setIsLoading(false);
      return;
    }
    
    const fetchTableData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch table details
        const tableResponse = await fetch(`/api/database/tables/${tableId}`, {
          credentials: 'include'
        });
        
        if (!tableResponse.ok) {
          throw new Error('Failed to fetch table data');
        }
        
        const tableData = await tableResponse.json();
        setTable(tableData);
        setEditableTable({
          TABLE_NAME: tableData.TABLE_NAME,
          TABLE_DESCRIPTION: tableData.TABLE_DESCRIPTION
        });
        
        // Fetch columns
        const columnsResponse = await fetch(`/api/database/tables/${tableId}/columns`, {
          credentials: 'include'
        });
        
        if (!columnsResponse.ok) {
          throw new Error('Failed to fetch columns data');
        }
        
        const columnsData = await columnsResponse.json();
        setColumns(columnsData.map((col: DbColumn) => ({ ...col, isEditing: false })));
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError('Failed to load table data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTableData();
  }, [tableId]);

  // Handle table field changes
  const handleTableChange = (field: string, value: string) => {
    setEditableTable(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle column field changes
  const handleColumnChange = (columnId: number, field: string, value: string) => {
    setColumns(prev => 
      prev.map(col => col.ID === columnId ? { ...col, [field]: value } : col)
    );
  };

  // Handle new column field changes
  const handleNewColumnChange = (field: string, value: string) => {
    setNewColumn(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle column edit mode
  const toggleColumnEdit = (columnId: number) => {
    setColumns(prev => 
      prev.map(col => col.ID === columnId ? { ...col, isEditing: !col.isEditing } : col)
    );
  };

  // Toggle column searchable status (client-side only, then calls API)
  const toggleColumnSearchable = async (columnId: number, currentStatus: string) => {
    try {
      setError(null);
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
      
      setColumns(prev => prev.map(col => col.ID === columnId ? { ...col, IS_SEARCHABLE: newStatus } : col));
      setSuccessMessage('Column searchable status updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling column status:', err);
      setError('Failed to update column status. Please try again.');
    }
  };

  // Save table changes
  const saveTableChanges = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch(`/api/database/tables/${tableId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableTable),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update table');
      }
      
      const updatedData = await response.json();
      setTable(prev => prev ? { ...prev, ...updatedData } : updatedData);
      setIsEditing(false);
      setSuccessMessage('Table updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error('Error updating table:', err);
      setError('Failed to update table. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save column changes
  const saveColumnChanges = async (column: DbColumn) => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch(`/api/database/columns/${column.ID}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          COLUMN_NAME: column.COLUMN_NAME,
          COLUMN_DESCRIPTION: column.COLUMN_DESCRIPTION,
          IS_SEARCHABLE: column.IS_SEARCHABLE
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update column');
      }
      
      toggleColumnEdit(column.ID);
      setSuccessMessage('Column updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error('Error updating column:', err);
      setError('Failed to update column. Please try again.');
    }
  };

  // Add new column
  const addNewColumn = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      
      if (!newColumn.COLUMN_NAME || !newColumn.COLUMN_TYPE) {
        setError('Column name and type are required');
        return;
      }
      
      const response = await fetch(`/api/database/tables/${tableId}/columns/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newColumn),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add column');
      }
      
      const addedColumn = await response.json();
      setColumns(prev => [...prev, { ...addedColumn, isEditing: false }]);
      setNewColumn({ COLUMN_NAME: '', COLUMN_TYPE: '', COLUMN_DESCRIPTION: '', IS_SEARCHABLE: 'Y' });
      setShowNewColumnForm(false);
      setSuccessMessage('Column added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error('Error adding column:', err);
      setError('Failed to add column. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">Loading table data...</p>
      </div>
    );
  }

  if (!table && !isLoading) {
    return (
      <div className="max-w-5xl mx-auto mt-8">
        <div className="glass-card p-8 text-center dark:bg-gray-800 dark:border-gray-700">
          <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Table Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The table you're looking for doesn't exist or you don't have permission to access it.</p>
          <Link 
            href="/dashboard/database" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Database
          </Link>
        </div>
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
          <div className="flex items-center gap-3">
            <Link href="/dashboard/database" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#6c5ce7] dark:text-[#a29bfe] mb-2">Edit Table</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Manage table and column properties for {table?.TABLE_NAME}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isEditing 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
              }`}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  <span>Edit Table</span>
                </>
              )}
            </button>
            
            {isEditing && (
              <button 
                onClick={saveTableChanges}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3"
        >
          <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-800 dark:text-green-300 font-medium">Success</p>
            <p className="text-green-600 dark:text-green-400 text-sm mt-1">{successMessage}</p>
          </div>
        </motion.div>
      )}

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

      {/* Table Details Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
          <Database className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" /> 
          Table Information
        </h2>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editableTable.TABLE_NAME || ''}
                  onChange={(e) => handleTableChange('TABLE_NAME', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter table name"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200">
                  {table?.TABLE_NAME}
                </div>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table Description
              </label>
              {isEditing ? (
                <textarea
                  value={editableTable.TABLE_DESCRIPTION || ''}
                  onChange={(e) => handleTableChange('TABLE_DESCRIPTION', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter table description"
                  rows={3}
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 min-h-[80px]">
                  {table?.TABLE_DESCRIPTION || 'No description provided'}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center">
                {table?.IS_ACTIVE === 'Y' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created On
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
                {new Date(table?.CREATED_AT || '').toLocaleDateString()}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Updated
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
                {new Date(table?.UPDATED_AT || '').toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Columns Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Table2 className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" /> 
            Table Columns
          </h2>
          
          <button 
            onClick={() => setShowNewColumnForm(!showNewColumnForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            {showNewColumnForm ? (
              <>
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add Column</span>
              </>
            )}
          </button>
        </div>
        
        {/* New Column Form */}
        {showNewColumnForm && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-300 mb-4">Add New Column</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Column Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColumn.COLUMN_NAME}
                  onChange={(e) => handleNewColumnChange('COLUMN_NAME', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter column name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Column Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newColumn.COLUMN_TYPE}
                  onChange={(e) => handleNewColumnChange('COLUMN_TYPE', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select type</option>
                  <option value="VARCHAR2">VARCHAR2</option>
                  <option value="NUMBER">NUMBER</option>
                  <option value="DATE">DATE</option>
                  <option value="TIMESTAMP">TIMESTAMP</option>
                  <option value="BLOB">BLOB</option>
                  <option value="CLOB">CLOB</option>
                  <option value="CHAR">CHAR</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Column Description
                </label>
                <textarea
                  value={newColumn.COLUMN_DESCRIPTION}
                  onChange={(e) => handleNewColumnChange('COLUMN_DESCRIPTION', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter column description"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="is-searchable"
                checked={newColumn.IS_SEARCHABLE === 'Y'}
                onChange={(e) => handleNewColumnChange('IS_SEARCHABLE', e.target.checked ? 'Y' : 'N')}
                className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="is-searchable" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Make column searchable
              </label>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={addNewColumn}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Column</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Columns List */}
        {columns.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Searchable
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {columns.map((column) => (
                  <tr key={column.ID} className={column.isEditing ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {column.isEditing ? (
                        <input
                          type="text"
                          value={column.COLUMN_NAME}
                          onChange={(e) => handleColumnChange(column.ID, 'COLUMN_NAME', e.target.value)}
                          className="w-full px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{column.COLUMN_NAME}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{column.COLUMN_TYPE}</div>
                    </td>
                    <td className="px-6 py-4">
                      {column.isEditing ? (
                        <textarea
                          value={column.COLUMN_DESCRIPTION || ''}
                          onChange={(e) => handleColumnChange(column.ID, 'COLUMN_DESCRIPTION', e.target.value)}
                          className="w-full px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={2}
                        />
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {column.COLUMN_DESCRIPTION || 'No description'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleColumnSearchable(column.ID, column.IS_SEARCHABLE)}
                        className={`p-1 rounded-md ${column.IS_SEARCHABLE === 'Y' ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        title={column.IS_SEARCHABLE === 'Y' ? 'Disable Searching' : 'Enable Searching'}
                      >
                        {column.IS_SEARCHABLE === 'Y' ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {column.isEditing ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => toggleColumnEdit(column.ID)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => saveColumnChanges(column)}
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md"
                            title="Save Changes"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => toggleColumnEdit(column.ID)}
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md"
                            title="Edit Column"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <Table className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Columns Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">This table doesn't have any columns yet.</p>
            <button
              onClick={() => setShowNewColumnForm(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Column
            </button>
          </div>
        )}
      </motion.div>

      {/* Table Management Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card p-6 border border-transparent hover:border-indigo-200 transition-all duration-300"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Table Management</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold dark:text-gray-100">Table Status</h4>
              <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${table?.IS_ACTIVE === 'Y' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                {table?.IS_ACTIVE === 'Y' ? 'Active' : 'Inactive'}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {table?.IS_ACTIVE === 'Y' 
                ? 'This table is active and available for queries.' 
                : 'This table is inactive and will not be used in queries.'}
            </p>
            <button 
              onClick={() => router.push(`/api/database/tables/${tableId}/toggle-status`)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${table?.IS_ACTIVE === 'Y' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'}`}
            >
              {table?.IS_ACTIVE === 'Y' ? 'Deactivate Table' : 'Activate Table'}
            </button>
          </div>
          
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold dark:text-gray-100">Database Schema</h4>
              <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              View and verify the underlying database schema for this table.
            </p>
            <button 
              onClick={() => router.push(`/dashboard/database/schema/${tableId}`)}
              className="inline-flex items-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800"
            >
              View Schema Details
            </button>
          </div>
          
          <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h4>
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Delete this table from MyQuery. This action cannot be undone.
            </p>
            <button 
              className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800/50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Table
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
