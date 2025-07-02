// Chart Components Export Index
export { BaseChart } from './BaseChart';
export { ProgressChart } from './ProgressChart';
export { ScoreChart } from './ScoreChart';

// Visualization Components
export { DatabaseERDiagram } from '../visualizations/DatabaseERDiagram';

// Chart Types and Interfaces
export interface ChartData {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

export interface ProgressData {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  description?: string;
}

export interface ScoreData {
  category: string;
  score: number;
  maxScore: number;
  color: string;
  description?: string;
  details?: string[];
}

export interface TableData {
  id: string;
  name: string;
  columns: ColumnData[];
  position: { x: number; y: number };
  color?: string;
}

export interface ColumnData {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

export interface RelationshipData {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}