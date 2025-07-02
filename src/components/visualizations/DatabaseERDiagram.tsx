import React, { useState, useRef } from 'react';
import { BaseChart } from '../charts/BaseChart';
import { Database, Link, Key, Search, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  color?: string;
}

interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface DatabaseERDiagramProps {
  title: string;
  subtitle?: string;
  tables: Table[];
  relationships: Relationship[];
  className?: string;
}

export const DatabaseERDiagram: React.FC<DatabaseERDiagramProps> = ({
  title,
  subtitle,
  tables,
  relationships,
  className
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? Math.min(zoom * 1.2, 3) : Math.max(zoom / 1.2, 0.3);
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getTablePosition = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.position : { x: 0, y: 0 };
  };

  const renderTable = (table: Table) => {
    const isSelected = selectedTable === table.id;
    const isHovered = hoveredTable === table.id;
    const isHighlighted = searchTerm && (
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <g
        key={table.id}
        transform={`translate(${table.position.x}, ${table.position.y})`}
        className="cursor-pointer"
        onClick={() => setSelectedTable(isSelected ? null : table.id)}
        onMouseEnter={() => setHoveredTable(table.id)}
        onMouseLeave={() => setHoveredTable(null)}
      >
        {/* Table container */}
        <rect
          width="200"
          height={Math.max(80, table.columns.length * 20 + 40)}
          fill="rgba(30, 41, 59, 0.9)"
          stroke={
            isSelected ? '#8b5cf6' :
            isHovered ? '#a78bfa' :
            isHighlighted ? '#fbbf24' :
            table.color || '#475569'
          }
          strokeWidth={isSelected ? 3 : isHovered || isHighlighted ? 2 : 1}
          rx="8"
          className="transition-all duration-200"
          style={{
            filter: isSelected || isHovered ? 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3))' : undefined
          }}
        />

        {/* Table header */}
        <rect
          width="200"
          height="30"
          fill={table.color || '#475569'}
          rx="8"
          className="opacity-80"
        />
        <rect
          width="200"
          height="30"
          fill="transparent"
          stroke="none"
          rx="8"
        />

        {/* Table name */}
        <text
          x="10"
          y="20"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          className="select-none"
        >
          <Database className="w-4 h-4 inline mr-2" />
          {table.name}
        </text>

        {/* Columns */}
        {table.columns.map((column, index) => {
          const y = 50 + index * 20;
          const isMatchingSearch = searchTerm && 
            column.name.toLowerCase().includes(searchTerm.toLowerCase());

          return (
            <g key={index}>
              {/* Column background for search highlight */}
              {isMatchingSearch && (
                <rect
                  x="5"
                  y={y - 12}
                  width="190"
                  height="18"
                  fill="rgba(251, 191, 36, 0.2)"
                  rx="3"
                />
              )}

              {/* Primary key icon */}
              {column.isPrimaryKey && (
                <Key className="w-3 h-3" x="8" y={y - 8} fill="#fbbf24" />
              )}

              {/* Foreign key icon */}
              {column.isForeignKey && (
                <Link className="w-3 h-3" x={column.isPrimaryKey ? "20" : "8"} y={y - 8} fill="#60a5fa" />
              )}

              {/* Column name */}
              <text
                x={column.isPrimaryKey || column.isForeignKey ? "32" : "10"}
                y={y}
                fill={column.isPrimaryKey ? "#fbbf24" : column.isForeignKey ? "#60a5fa" : "#e2e8f0"}
                fontSize="12"
                className="select-none"
              >
                {column.name}
              </text>

              {/* Column type */}
              <text
                x="120"
                y={y}
                fill="#94a3b8"
                fontSize="10"
                className="select-none"
              >
                {column.type}
              </text>

              {/* Constraints */}
              {!column.isNullable && (
                <text
                  x="180"
                  y={y}
                  fill="#ef4444"
                  fontSize="8"
                  className="select-none"
                >
                  NOT NULL
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderRelationship = (relationship: Relationship) => {
    const fromTable = getTablePosition(relationship.fromTable);
    const toTable = getTablePosition(relationship.toTable);

    const fromX = fromTable.x + 200;
    const fromY = fromTable.y + 50;
    const toX = toTable.x;
    const toY = toTable.y + 50;

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    return (
      <g key={relationship.id}>
        {/* Connection line */}
        <path
          d={`M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`}
          stroke="#6366f1"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
          className="transition-all duration-200"
        />

        {/* Relationship label */}
        <rect
          x={midX - 30}
          y={midY - 8}
          width="60"
          height="16"
          fill="rgba(30, 41, 59, 0.9)"
          stroke="#6366f1"
          strokeWidth="1"
          rx="8"
        />
        <text
          x={midX}
          y={midY + 4}
          fill="#a5b4fc"
          fontSize="10"
          textAnchor="middle"
          className="select-none"
        >
          {relationship.type}
        </text>
      </g>
    );
  };

  return (
    <BaseChart
      title={title}
      subtitle={subtitle}
      data={tables}
      className={className}
      onExport={(format) => {
        if (format === 'json') {
          const exportData = {
            title,
            subtitle,
            tables: tables.map(table => ({
              name: table.name,
              columns: table.columns.map(col => ({
                name: col.name,
                type: col.type,
                constraints: {
                  primaryKey: col.isPrimaryKey,
                  foreignKey: col.isForeignKey,
                  nullable: col.isNullable,
                  unique: col.isUnique
                },
                references: col.referencesTable ? {
                  table: col.referencesTable,
                  column: col.referencesColumn
                } : undefined
              }))
            })),
            relationships: relationships.map(rel => ({
              from: { table: rel.fromTable, column: rel.fromColumn },
              to: { table: rel.toTable, column: rel.toColumn },
              type: rel.type
            }))
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-schema.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }}
    >
      <div className="h-full flex flex-col">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4 bg-slate-800/20 p-3 rounded-lg border border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tables and columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm w-64"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom('out')}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
              aria-label="Reset view"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagram */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-900/50 rounded-lg border border-slate-700/50 relative"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="absolute inset-0"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Arrowhead marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6366f1"
                />
              </marker>
            </defs>

            {/* Main group with zoom and pan transformations */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Grid background */}
              <defs>
                <pattern
                  id="grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.1)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="2000" height="1500" fill="url(#grid)" />

              {/* Relationships */}
              {relationships.map(renderRelationship)}

              {/* Tables */}
              {(searchTerm ? filteredTables : tables).map(renderTable)}
            </g>
          </svg>

          {/* Minimap */}
          <div className="absolute bottom-4 right-4 w-48 h-32 bg-slate-800/90 border border-slate-700/50 rounded-lg p-2">
            <div className="text-xs text-slate-400 mb-1">Schema Overview</div>
            <svg width="100%" height="100%" viewBox="0 0 800 600" className="border border-slate-700/30 rounded">
              {tables.map(table => (
                <rect
                  key={table.id}
                  x={table.position.x / 4}
                  y={table.position.y / 4}
                  width="50"
                  height="25"
                  fill={selectedTable === table.id ? '#8b5cf6' : table.color || '#475569'}
                  stroke={selectedTable === table.id ? '#a78bfa' : 'transparent'}
                  strokeWidth="1"
                  rx="2"
                  className="cursor-pointer"
                  onClick={() => setSelectedTable(table.id)}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Table details panel */}
        {selectedTable && (
          <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-3">
              Table Details: {tables.find(t => t.id === selectedTable)?.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Columns ({tables.find(t => t.id === selectedTable)?.columns.length})</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tables.find(t => t.id === selectedTable)?.columns.map((col, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {col.isPrimaryKey && <Key className="w-3 h-3 text-yellow-400" />}
                      {col.isForeignKey && <Link className="w-3 h-3 text-blue-400" />}
                      <span className="text-slate-300">{col.name}</span>
                      <span className="text-slate-500">({col.type})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Relationships</h5>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {relationships
                    .filter(rel => rel.fromTable === selectedTable || rel.toTable === selectedTable)
                    .map((rel, index) => (
                      <div key={index} className="text-sm text-slate-400">
                        {rel.fromTable === selectedTable ? '→' : '←'} {rel.type} with{' '}
                        <span className="text-slate-300">
                          {rel.fromTable === selectedTable ? rel.toTable : rel.fromTable}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseChart>
  );
};