//components/table-view.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SchemaColumn } from '@/components/database-selector';
import { 
  Loader2, 
  Search, 
  Filter, 
  X, 
  FileDown, 
  FileText, 
  FileCode, 
  Mail, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import EmailModal from '@/components/EmailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TableViewProps {
  tableId: number;
  tableName: string;
  columns: SchemaColumn[];
  orgId?: number;
  userId?: number;
}

export function TableView({ tableId, tableName, columns, orgId: propOrgId, userId: propUserId }: TableViewProps) {
  // Format column title for display
  const formatColumnTitle = (title: string) => {
    return title
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Export functions
  const exportCSV = (data: any[]) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = headers.map((header) => {
        const escaped = ('' + row[header]).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${tableName}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportPDF = async (data: any[]) => {
    if (data.length === 0) return;

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const headers = Object.keys(data[0]);
      const orientation = headers.length > 8 ? 'landscape' : 'portrait';
      const doc = new jsPDF(orientation, 'pt');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(`${tableName} - Data Report`, 40, 40);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleString();
      doc.text(`Generated on: ${dateStr}`, 40, 60);

      const tableHeaders = [headers];
      // Convertir los datos a un formato compatible con jspdf-autotable
      const tableData = data.map((item) => 
        Object.values(item).map(val => 
          val === null ? '' : String(val)
        )
      ) as string[][];

      const numColumns = headers.length;
      const columnStyles: { [key: number]: { cellWidth: number | 'wrap' } } = {};
      for (let i = 0; i < numColumns; i++) {
        columnStyles[i] = { cellWidth: 'wrap' };
      }

      const fontSize = numColumns > 8 ? 8 : 10;

      autoTable(doc, {
        startY: 80,
        head: tableHeaders,
        body: tableData,
        tableWidth: 'auto',
        columnStyles: columnStyles,
        styles: { fontSize: fontSize, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [63, 81, 181], textColor: 255 },
        margin: { top: 80, left: 40, right: 40 },
      });

      doc.save(`${tableName}_data.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const exportHTML = (data: any[]) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    let htmlString = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>${tableName} - Data Report</title>
         <style>
           body { font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; }
           .container { max-width: 1500px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); }
           h1 { text-align: center; color: #2c3e50; }
           p { text-align: center; color: #7f8c8d; }
           .table-container { overflow-x: auto; }
           table { width: 100%; border-collapse: collapse; margin-top: 20px; }
           th, td { border: 1px solid #bdc3c7; padding: 8px; text-align: left; font-size: ${
             headers.length > 10 ? '10px' : '12px'
           }; }
           th { background-color: #3f51b5; color: white; }
           tr:nth-child(even) { background-color: #ecf0f1; }
         </style>
      </head>
      <body>
         <div class="container">
           <h1>${tableName} - Data Report</h1>
           <p>Generated on: ${new Date().toLocaleString()}</p>
           <div class="table-container">
             <table>
               <thead>
                 <tr>`;
    headers.forEach((header) => {
      htmlString += `<th>${formatColumnTitle(header)}</th>`;
    });
    htmlString += `</tr>
               </thead>
               <tbody>`;
    data.forEach((row) => {
      htmlString += `<tr>`;
      headers.forEach((header) => {
        htmlString += `<td>${row[header] !== null ? row[header] : '-'}</td>`;
      });
      htmlString += `</tr>`;
    });
    htmlString += `
               </tbody>
             </table>
           </div>
         </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${tableName}_data.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  // Get userId from prop, localStorage, or context
  const getUserId = () => {
    if (typeof propUserId === 'number') return propUserId;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userId');
      return stored ? parseInt(stored, 10) : undefined;
    }
    return undefined;
  };
  // Get orgId from prop or fallback (could add similar logic if needed)
  const getOrgId = () => {
    if (typeof propOrgId === 'number') return propOrgId;
    return undefined;
  };

  const [activeTab, setActiveTab] = useState('columns');
  const [tableData, setTableData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch table data when the Data tab is clicked
  const fetchTableData = async () => {
    // We'll always fetch data when this function is called, removing the previous check
    // that prevented fetching if data was already loaded
    
    setLoading(true);
    try {
      // استخدام نفس طريقة تنفيذ الاستعلامات كما في صفحة activity
      const sqlQuery = `SELECT * FROM ${tableName} WHERE ROWNUM <= 100`;
      
      // استخدام API /api/query/execute بدلاً من /api/table-data
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sqlQuery: sqlQuery,
          queryId: null // لا نحتاج queryId محدد لأننا ننشئ استعلام جديد
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch table data');
      }
      
      const data = await response.json();
      
      if (data.rows && Array.isArray(data.rows)) {
        setTableData(data.rows);
        setFilteredData(data.rows); // Initialize filtered data with all data
      } else {
        console.error('Unexpected data format:', data);
        throw new Error('Unexpected data format received');
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset table data when tableId or tableName changes
  useEffect(() => {
    // Clear existing data when the table changes
    setTableData([]);
    setFilteredData([]);
    setFilters({});
    
    // If the active tab is 'data', fetch the new table data
    if (activeTab === 'data') {
      fetchTableData();
    }
  }, [tableId, tableName]);

  // Apply filters whenever the filters object changes
  useEffect(() => {
    if (tableData.length === 0) return;
    
    let filtered = [...tableData];
    
    // Apply search term across all columns
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        return Object.values(row).some(value => 
          value !== null && String(value).toLowerCase().includes(term)
        );
      });
    }
    
    // Apply column-specific filters
    filtered = filtered.filter(row => {
      // Check if the row matches all active filters
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true; // Skip empty filters
        
        const cellValue = row[key];
        if (cellValue === null) return false;
        
        // Case-insensitive string comparison
        return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });
    
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, tableData, searchTerm]);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="w-full">
      <Tabs 
        defaultValue="columns" 
        className="w-full"
        onValueChange={(value) => {
          setActiveTab(value);
          if (value === 'data') {
            fetchTableData();
          }
        }}
      >
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          <TabsTrigger 
            value="columns" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100 px-6 py-2 transition-all duration-200"
          >
            Columns
          </TabsTrigger>
          <TabsTrigger 
            value="data" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-100 px-6 py-2 transition-all duration-200"
          >
            Data
          </TabsTrigger>
        </TabsList>
        
        {/* Columns Tab */}
        <TabsContent value="columns" className="mt-0">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
          >
            <Table>
              <TableCaption className="dark:text-gray-300 py-4">Table structure for {tableName}</TableCaption>
              <TableHeader>
                <TableRow className="dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="w-[200px] text-gray-800 dark:text-gray-200 font-semibold">Column Name</TableHead>
                  <TableHead className="text-gray-800 dark:text-gray-200 font-semibold">Data Type</TableHead>
                  <TableHead className="text-gray-800 dark:text-gray-200 font-semibold">Primary Key</TableHead>
                  <TableHead className="text-gray-800 dark:text-gray-200 font-semibold">Foreign Key</TableHead>
                  <TableHead className="text-gray-800 dark:text-gray-200 font-semibold">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column, index) => (
                  <TableRow 
                    key={column.ID} 
                    className="dark:border-gray-700 dark:hover:bg-gray-800/50 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <TableCell className="font-medium dark:text-gray-300">{column.COLUMN_NAME}</TableCell>
                    <TableCell className="dark:text-gray-300">
                      <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {column.COLUMN_TYPE}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {column.IS_PRIMARY_KEY === 'Y' ? (
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          Primary
                        </Badge>
                      ) : 'No'}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {column.IS_FOREIGN_KEY === 'Y' ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Foreign
                        </Badge>
                      ) : 'No'}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">{column.COLUMN_DESCRIPTION || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>
        
        {/* Data Tab */}
        <TabsContent value="data" className="mt-0">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center py-12"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-gray-500 dark:text-gray-400">Loading table data...</p>
              </div>
            </motion.div>
          ) : tableData.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800/30 shadow-sm"
            >
              <p className="text-gray-500 dark:text-gray-400">No data available for this table</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="glass-card overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Table Actions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Input
                        type="text"
                        placeholder="Search in all columns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50 rounded-md shadow-sm"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setFilterOpen(!filterOpen)}
                        variant={filterOpen || Object.keys(filters).length > 0 ? "default" : "outline"}
                        size="sm"
                        className={`flex items-center gap-1 ${
                          filterOpen || Object.keys(filters).length > 0
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        <span>Filter</span>
                        {Object.keys(filters).length > 0 && (
                          <Badge className="ml-1 bg-white text-indigo-700 dark:bg-gray-800 dark:text-indigo-300">
                            {Object.keys(filters).length}
                          </Badge>
                        )}
                      </Button>
                      
                      {Object.keys(filters).length > 0 && (
                        <Button
                          onClick={() => setFilters({})}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Clear</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {filteredData.length} of {tableData.length} rows
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span>Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md"
                      >
                        <DropdownMenuItem
                          onClick={() => exportCSV(filteredData)}
                          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer px-3 py-2"
                        >
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span>Export CSV</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportPDF(filteredData)}
                          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer px-3 py-2"
                        >
                          <FileDown className="h-4 w-4 text-red-600" />
                          <span>Export PDF</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportHTML(filteredData)}
                          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer px-3 py-2"
                        >
                          <FileCode className="h-4 w-4 text-blue-600" />
                          <span>Export HTML</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                        <DropdownMenuItem
                          onClick={() => setIsEmailModalOpen(true)}
                          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer px-3 py-2"
                        >
                          <Mail className="h-4 w-4 text-green-600" />
                          <span>Email Report</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Filter Panel */}
                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.keys(tableData[0] || {}).map((column) => (
                          <div key={column} className="space-y-1">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {formatColumnTitle(column)}
                            </label>
                            <Input
                              type="text"
                              placeholder={`Filter ${formatColumnTitle(column)}...`}
                              value={filters[column] || ''}
                              onChange={(e) => {
                                const newFilters = { ...filters };
                                if (e.target.value) {
                                  newFilters[column] = e.target.value;
                                } else {
                                  delete newFilters[column];
                                }
                                setFilters(newFilters);
                              }}
                              className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:ring-opacity-50 rounded-md shadow-sm text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/80 dark:border-gray-700">
                        {Object.keys(tableData[0] || {}).map((column) => (
                          <TableHead 
                            key={column} 
                            className="text-gray-800 dark:text-gray-200 font-semibold whitespace-nowrap px-4 py-3"
                          >
                            {formatColumnTitle(column)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row, rowIndex) => (
                        <TableRow 
                          key={rowIndex} 
                          className="dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                        >
                          {Object.entries(row).map(([column, value], cellIndex) => (
                            <TableCell 
                              key={`${rowIndex}-${cellIndex}`} 
                              className="dark:text-gray-300 px-4 py-3 whitespace-nowrap"
                            >
                              {value !== null ? String(value) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent"
                    >
                      <option value={10}>10 rows</option>
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-2" />
                    </Button>
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1 mx-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={i}
                            onClick={() => handlePageChange(pageNum)}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Email Modal */}
      {isEmailModalOpen && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          results={filteredData}
          question={`Export data from ${tableName}`}
          selectedModel="email"
        />
      )}
    </div>
  );
}
