//components/export-menu.tsx
'use client';

import * as React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { FileText, FileDown, FileCode, Mail, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ExportMenuProps {
  results: any[];
  onEmailClick: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ results, onEmailClick }) => {
  // 1. CSV Export
  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvRows = [headers.join(',')];

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
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. PDF Export (using jsPDF + autoTable)
  const exportPDF = () => {
    console.log('Export PDF function called!'); // Check if function is triggered

    if (!results || results.length === 0) {
      console.error('No data available for PDF export');
      return;
    }

    console.log('Results available for export:', results); // Check data

    try {
      const headers = Object.keys(results[0]);
      console.log('Headers:', headers); // Check if headers are correct

      const tableBody = results.map((row) =>
        headers.map((header) => row[header] || '')
      );
      console.log('Table body:', tableBody); // Check table data

      const doc = new jsPDF();
      console.log('jsPDF instance created!'); // Check if jsPDF is initialized

      doc.text('Exported Results', 14, 15);

      autoTable(doc, {
        head: [headers],
        body: tableBody,
        startY: 25,
        margin: { left: 14, right: 14 },
      });

      console.log('autoTable executed successfully!'); // Check if table is drawn

      doc.save('export.pdf');
      console.log('PDF saved successfully!'); // Should trigger download
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // 3. HTML Export
  const exportHTML = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: system-ui; padding: 2rem; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${results
                .map((row) => {
                  return `
                  <tr>
                    ${headers.map((h) => `<td>${row[h]}</td>`).join('')}
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'export.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-1 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.08] transition-colors">
        <FileDown className="h-3.5 w-3.5 text-white/70" />
        <span className="text-xs text-white/70">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 glass-card border-white/10"
      >
        {/* CSV */}
        <DropdownMenuItem
          onClick={exportCSV}
          className="flex items-center gap-2 text-white/90 hover:text-white focus:text-white cursor-pointer"
        >
          <FileText className="h-4 w-4 text-blue-400" />
          <span>Export CSV</span>
        </DropdownMenuItem>

        {/* PDF */}
        <DropdownMenuItem
          onClick={exportPDF}
          className="flex items-center gap-2 text-white/90 hover:text-white focus:text-white cursor-pointer"
        >
          <FileDown className="h-4 w-4 text-red-400" />
          <span>Export PDF</span>
        </DropdownMenuItem>

        {/* HTML */}
        <DropdownMenuItem
          onClick={exportHTML}
          className="flex items-center gap-2 text-white/90 hover:text-white focus:text-white cursor-pointer"
        >
          <FileCode className="h-4 w-4 text-green-400" />
          <span>Export HTML</span>
        </DropdownMenuItem>

        {/* Email */}
        <DropdownMenuItem
          onClick={onEmailClick}
          className="flex items-center gap-2 text-white/90 hover:text-white focus:text-white cursor-pointer"
        >
          <Mail className="h-4 w-4 text-purple-400" />
          <span>Send Email</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
