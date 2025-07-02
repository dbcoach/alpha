import React, { useState, useMemo } from 'react';
import { Table, Download, Search, Filter, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import BaseChart from './BaseChart';

interface TableData {
  headers: string[];
  rows: (string | number)[][];
  tableName?: string;
}

interface DataTableChartProps {
  data: string | TableData;
  title?: string;
  className?: string;
}

const DataTableChart: React.FC<DataTableChartProps> = ({ 
  data, 
  title = 'Data Table',
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const tableData = useMemo(() => {
    if (typeof data === 'string') {
      // Parse SQL INSERT statements to extract table data
      const tables: TableData[] = [];
      const lines = data.split('\n');
      let currentTable: TableData | null = null;
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Match INSERT INTO statements
        const insertMatch = trimmedLine.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES/i);
        if (insertMatch) {
          const tableName = insertMatch[1];
          const columns = insertMatch[2].split(',').map(col => col.trim().replace(/['"]/g, ''));
          currentTable = {
            tableName,
            headers: columns,
            rows: []
          };
          tables.push(currentTable);
        }
        
        // Match VALUES lines
        const valuesMatch = trimmedLine.match(/\((.*?)\)[,;]?$/);
        if (valuesMatch && currentTable) {
          const values = valuesMatch[1].split(',').map(val => {
            const trimmed = val.trim().replace(/^['"]|['"]$/g, '');
            // Try to convert to number if possible
            const num = parseFloat(trimmed);
            return isNaN(num) ? trimmed : num;
          });
          currentTable.rows.push(values);
        }
      });
      
      return tables[0] || { headers: [], rows: [] };
    }
    return data;
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = tableData.rows;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.some(cell => 
          cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply sorting
    if (sortColumn !== null) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = aVal.toString().localeCompare(bVal.toString());
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [tableData, searchTerm, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedData.slice(start, start + rowsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    const filename = `${tableData.tableName || 'data'}.${format}`;
    let content = '';
    
    if (format === 'csv') {
      content = [
        tableData.headers.join(','),
        ...filteredAndSortedData.map(row => row.join(','))
      ].join('\n');
    } else {
      const jsonData = filteredAndSortedData.map(row => 
        Object.fromEntries(tableData.headers.map((header, i) => [header, row[i]]))
      );
      content = JSON.stringify(jsonData, null, 2);
    }
    
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderControls = () => (
    <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Table className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-white">
            {tableData.tableName || title}
          </span>
          <span className="text-sm text-slate-400">
            ({filteredAndSortedData.length} rows)
          </span>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => exportData('csv')}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">CSV</span>
        </button>
        <button
          onClick={() => exportData('json')}
          className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">JSON</span>
        </button>
      </div>
    </div>
  );

  const renderTable = () => (
    <div className="flex-1 overflow-auto">
      <div className="min-w-full">
        <table className="w-full">
          <thead className="bg-slate-800/50 sticky top-0 z-10">
            <tr>
              {tableData.headers.map((header, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(index)}
                  className="px-4 py-3 text-left text-sm font-medium text-slate-300 cursor-pointer hover:bg-slate-700/50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <span>{header}</span>
                    {sortColumn === index && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-sm text-slate-200">
                    {typeof cell === 'number' 
                      ? cell.toLocaleString()
                      : cell
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!tableData.headers.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <BarChart3 className="w-12 h-12 mb-4" />
        <p>No data available to display</p>
      </div>
    );
  }

  return (
    <BaseChart
      title={tableData.tableName || title}
      className={className}
      exportData={() => ({
        csv: [tableData.headers.join(','), ...filteredAndSortedData.map(row => row.join(','))].join('\n'),
        json: JSON.stringify(filteredAndSortedData.map(row => 
          Object.fromEntries(tableData.headers.map((header, i) => [header, row[i]]))
        ), null, 2)
      })}
    >
      <div className="h-full flex flex-col bg-slate-900/50">
        {renderControls()}
        {renderTable()}
      </div>
    </BaseChart>
  );
};

export default DataTableChart;