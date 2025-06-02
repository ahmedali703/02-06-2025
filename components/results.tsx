//components/results.tsx
'use client';

import { useState, useMemo } from 'react';
import { Config, Result } from '@/lib/types';
import { DynamicChart } from './dynamic-chart';
import { SkeletonCard } from './skeleton-card';
import { SingleValueIndicator } from './single-value-indicator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText,
  FileDown,
  FileCode,
  Mail,
  MoreHorizontal,
  Filter,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';

export const Results = ({
  results,
  columns,
  chartConfig,
  onEmailClick,
}: {
  results: Result[];
  columns: string[];
  chartConfig: Config | null;
  onEmailClick?: () => void;
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // التحقق مما إذا كانت النتيجة قيمة واحدة
  const isSingleValue = useMemo(() => {
    // التحقق من وجود سجل واحد فقط
    if (!Array.isArray(results) || results.length !== 1) {
      return false;
    }
    
    const row = results[0];
    const keys = Object.keys(row);
    
    // القيمة الواحدة يمكن أن تكون:
    // 1. كائن به خاصيتا 'label' و 'value'
    if (keys.includes('label') && keys.includes('value')) {
      return true;
    }
    
    // 2. كائن به خاصية واحدة أو خاصيتان
    return keys.length <= 2;
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((row) => {
      return Object.entries(filters).every(([column, filterValue]) => {
        const value = row[column];
        if (!filterValue.trim()) return true;
        if (typeof value === 'number') {
          return value
            .toString()
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        }
        return value
          ?.toString()
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      });
    });
  }, [results, filters]);

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const formatColumnTitle = (title: string) => {
    return title
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getColumnType = (
    columnName: string,
    value: any
  ): 'number' | 'text' | 'status' => {
    if (typeof value === 'number') return 'number';
    if (
      ['status', 'state', 'type'].some((keyword) =>
        columnName.toLowerCase().includes(keyword)
      )
    ) {
      return 'status';
    }
    return 'text';
  };

  const formatCellContent = (
    value: any,
    type: 'number' | 'text' | 'status'
  ) => {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'number':
        return (
          <span className="font-mono text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        );
      case 'status':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {value}
          </span>
        );
      default:
        return <span className="text-foreground/80">{value}</span>;
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of results) {
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
    a.download = 'results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportPDF = async () => {
    if (results.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const headers = Object.keys(results[0]);
    const orientation = headers.length > 8 ? 'landscape' : 'portrait';
    const doc = new jsPDF(orientation, 'pt');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Results Report', 40, 40);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleString();
    doc.text(`Generated on: ${dateStr}`, 40, 60);

    const tableHeaders = [headers];
    const data = results.map((item) => Object.values(item)) as (
      | string
      | number
    )[][];

    const numColumns = headers.length;
    const columnStyles: { [key: number]: { cellWidth: number | 'wrap' } } = {};
    for (let i = 0; i < numColumns; i++) {
      columnStyles[i] = { cellWidth: 'wrap' };
    }

    const fontSize = numColumns > 8 ? 8 : 10;

    autoTable(doc, {
      startY: 80,
      head: tableHeaders,
      body: data,
      tableWidth: 'auto',
      columnStyles: columnStyles,
      styles: { fontSize: fontSize, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [22, 160, 133], textColor: 255 },
      margin: { top: 80, left: 40, right: 40 },
    });

    doc.save('results.pdf');
  };

  const exportHTML = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    let htmlString = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>Results Report</title>
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
           th { background-color: #2c3e50; color: white; }
           tr:nth-child(even) { background-color: #ecf0f1; }
         </style>
      </head>
      <body>
         <div class="container">
           <h1>Results Report</h1>
           <p>Generated on: ${new Date().toLocaleString()}</p>
           <div class="table-container">
             <table>
               <thead>
                 <tr>`;
    headers.forEach((header) => {
      htmlString += `<th>${header}</th>`;
    });
    htmlString += `</tr>
               </thead>
               <tbody>`;
    results.forEach((row) => {
      htmlString += `<tr>`;
      headers.forEach((header) => {
        htmlString += `<td>${row[header]}</td>`;
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
    a.download = 'results.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // إذا كانت النتيجة قيمة واحدة، نعرض مؤشر القيمة الواحدة
  if (isSingleValue) {
    return (
      <div className="flex-grow flex flex-col space-y-4">
        <SingleValueIndicator result={results[0]} />
      </div>
    );
  }

  // غير ذلك، نعرض الجدول أو الرسم البياني كالمعتاد
  return (
    <div className="flex-grow flex flex-col space-y-4">
      <Tabs defaultValue="table" className="w-full">
        <div className="flex justify-center mb-4">
          <TabsList className="tab">
            <TabsTrigger value="table" className="tab">
              Table
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              disabled={!chartConfig || results.length < 2}
              className="tab"
            >
              Chart
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table" className="mt-0">
          <div className="glass-card overflow-hidden rounded-lg border border-border">
            {/* Table Actions Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {filteredResults.length} of {results.length} results
                </span>
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                    filterOpen || Object.keys(filters).length > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/20 hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-xs">Filter</span>
                </button>
                {Object.keys(filters).length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center space-x-1 px-3 py-1 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="text-xs">Clear</span>
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1 rounded-full bg-muted/20 hover:bg-muted/30 transition-colors">
                    <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Export</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 glass-card border-border"
                  >
                    <DropdownMenuItem
                      onClick={exportCSV}
                      className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Export CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={exportPDF}
                      className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                    >
                      <FileDown className="h-4 w-4 text-destructive" />
                      <span>Export PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={exportHTML}
                      className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                    >
                      <FileCode className="h-4 w-4 text-accent-foreground" />
                      <span>Export HTML</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={onEmailClick}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Send Email</span>
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {filterOpen && (
              <div className="p-4 bg-muted/5 border-b border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {columns.map((column) => (
                    <div key={column} className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {formatColumnTitle(column)}
                      </label>
                      <Input
                        placeholder={`Filter ${formatColumnTitle(column)}...`}
                        value={filters[column] || ''}
                        onChange={(e) =>
                          handleFilterChange(column, e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-muted/5">
                    {columns.map((column, index) => (
                      <TableHead
                        key={index}
                        className="h-10 px-4 text-xs font-medium text-muted-foreground bg-muted/5"
                      >
                        {formatColumnTitle(column)}
                      </TableHead>
                    ))}
                    <TableHead className="h-10 w-[52px] p-0 bg-muted/5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((row, rowIndex) => {
                    const isEven = rowIndex % 2 === 0;
                    return (
                      <TableRow
                        key={rowIndex}
                        className={`group border-b border-border hover:bg-muted/10 transition-colors ${
                          isEven ? 'bg-muted/5' : ''
                        }`}
                      >
                        {columns.map((column, colIndex) => {
                          const value = row[column];
                          const columnType = getColumnType(column, value);
                          return (
                            <TableCell
                              key={colIndex}
                              className="px-4 py-2.5 text-sm"
                            >
                              {formatCellContent(value, columnType)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="p-0 w-[52px]">
                          <div className="flex h-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/20">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 glass-card border-border"
                              >
                                <DropdownMenuItem
                                  onClick={exportCSV}
                                  className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                                >
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span>Export Row as CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={onEmailClick}
                                  className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground cursor-pointer"
                                >
                                  <Mail className="h-4 w-4 text-accent-foreground" />
                                  <span>Share Row</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="mt-0">
          <div className="glass-card p-6">
            {chartConfig && results.length > 0 ? (
              <DynamicChart chartData={results} chartConfig={chartConfig} />
            ) : (
              <SkeletonCard />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};