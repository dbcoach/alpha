import React from 'react';

export interface DatabaseContentProps {
  content: string;
  dbType: string;
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export interface DatabaseStyle {
  icon: string;
  color: string;
  bg: string;
  border: string;
  accent: string;
}

export interface DatabaseContent {
  type: string;
  hasSpecificContent: boolean;
  blocks?: string[];
  tables?: string[];
  collections?: string[];
  documents?: string[];
  embeddings?: string[];
  dimensions?: string[];
  metrics?: string[];
  indices?: string[];
}

export const getDatabaseStyle = (type: string): DatabaseStyle => {
  switch (type?.toLowerCase()) {
    case 'sql':
      return { 
        icon: '🗄️', 
        color: 'text-blue-300', 
        bg: 'bg-blue-500/20', 
        border: 'border-blue-400/30',
        accent: 'bg-blue-400'
      };
    case 'nosql':
      return { 
        icon: '📄', 
        color: 'text-green-300', 
        bg: 'bg-green-500/20', 
        border: 'border-green-400/30',
        accent: 'bg-green-400'
      };
    case 'vectordb':
      return { 
        icon: '🧮', 
        color: 'text-purple-300', 
        bg: 'bg-purple-500/20', 
        border: 'border-purple-400/30',
        accent: 'bg-purple-400'
      };
    default:
      return { 
        icon: '💾', 
        color: 'text-slate-300', 
        bg: 'bg-slate-500/20', 
        border: 'border-slate-400/30',
        accent: 'bg-slate-400'
      };
  }
};

export const extractDatabaseContent = (content: string, dbType: string): DatabaseContent => {
  if (dbType?.toLowerCase() === 'sql') {
    const sqlBlocks = content.match(/```sql\n?([\s\S]*?)```/gi) || [];
    const createTables = content.match(/CREATE TABLE\s+(\w+)[\s\S]*?;/gi) || [];
    const insertStatements = content.match(/INSERT INTO\s+\w+[\s\S]*?;/gi) || [];
    
    return {
      type: 'SQL',
      blocks: sqlBlocks,
      tables: createTables,
      hasSpecificContent: sqlBlocks.length > 0 || createTables.length > 0
    };
  } else if (dbType?.toLowerCase() === 'nosql') {
    const jsonBlocks = content.match(/```(?:json|mongodb?)\n?([\s\S]*?)```/gi) || [];
    const mongoBlocks = content.match(/```mongodb?\n?([\s\S]*?)```/gi) || [];
    const collections = content.match(/db\.(\w+)/g) || [];
    const documents = content.match(/\{[\s\S]*?\}/g) || [];
    
    return {
      type: 'NoSQL',
      blocks: [...jsonBlocks, ...mongoBlocks],
      collections: [...new Set(collections.map(c => c.replace('db.', '')))],
      documents: documents.slice(0, 5),
      hasSpecificContent: jsonBlocks.length > 0 || collections.length > 0
    };
  } else if (dbType?.toLowerCase() === 'vectordb') {
    const vectorBlocks = content.match(/```(?:python|vector|embedding)\n?([\s\S]*?)```/gi) || [];
    const embeddings = content.match(/embeddings?:\s*\[[\s\S]*?\]/gi) || [];
    const indices = content.match(/index[_\s]*(?:name|type):\s*[\w\-"']+/gi) || [];
    const dimensions = content.match(/dimension[s]?:\s*(\d+)/gi) || [];
    const metrics = content.match(/metric[s]?:\s*(cosine|euclidean|dotproduct|manhattan)/gi) || [];
    
    return {
      type: 'VectorDB',
      blocks: vectorBlocks,
      embeddings: embeddings.slice(0, 3),
      indices: indices,
      dimensions: dimensions,
      metrics: metrics,
      hasSpecificContent: vectorBlocks.length > 0 || embeddings.length > 0
    };
  }
  
  return { type: 'Generic', hasSpecificContent: false };
};

export const DatabaseContentRenderer: React.FC<DatabaseContentProps> = ({ 
  content, 
  dbType, 
  className = '', 
  showHeader = true,
  compact = false 
}) => {
  if (!content) return null;

  const style = getDatabaseStyle(dbType);
  const dbContent = extractDatabaseContent(content, dbType);

  if (!dbContent.hasSpecificContent) {
    return (
      <pre className={`text-slate-200 text-sm font-mono whitespace-pre-wrap leading-relaxed ${className}`}>
        {content}
      </pre>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Database Type Header */}
      {showHeader && (
        <div className={`flex items-center gap-2 px-3 py-2 ${style.bg} rounded-lg border ${style.border}`}>
          <span className="text-base">{style.icon}</span>
          <span className={`text-sm font-medium ${style.color}`}>
            {dbContent.type} Content
          </span>
        </div>
      )}

      {/* SQL Content */}
      {dbContent.type === 'SQL' && (
        <SQLContentRenderer dbContent={dbContent} style={style} compact={compact} />
      )}

      {/* NoSQL Content */}
      {dbContent.type === 'NoSQL' && (
        <NoSQLContentRenderer dbContent={dbContent} style={style} compact={compact} />
      )}

      {/* VectorDB Content */}
      {dbContent.type === 'VectorDB' && (
        <VectorDBContentRenderer dbContent={dbContent} style={style} compact={compact} />
      )}

      {/* Raw Content Toggle */}
      {!compact && (
        <div className="mt-4">
          <details className="group">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 mb-2">
              View Raw Content
            </summary>
            <div className="bg-slate-800/30 rounded p-3 border border-slate-700/30">
              <pre className="text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {content}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

const SQLContentRenderer: React.FC<{ dbContent: DatabaseContent; style: DatabaseStyle; compact: boolean }> = ({ 
  dbContent, 
  style, 
  compact 
}) => (
  <div className={`space-y-${compact ? '2' : '3'}`}>
    {/* SQL Code Blocks */}
    {dbContent.blocks && dbContent.blocks.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>
          SQL Statements ({dbContent.blocks.length})
        </div>
        {dbContent.blocks.map((block: string, index: number) => {
          const cleanSQL = block.replace(/```sql\n?/gi, '').replace(/```/g, '').trim();
          return (
            <div key={index} className={`${style.bg} rounded p-${compact ? '2' : '3'} border ${style.border} mb-2`}>
              <pre className={`${style.color} font-mono text-${compact ? 'xs' : 'sm'} overflow-x-auto whitespace-pre-wrap`}>
                <code>{cleanSQL}</code>
              </pre>
            </div>
          );
        })}
      </div>
    )}
    
    {/* Database Tables */}
    {dbContent.tables && dbContent.tables.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>
          Database Tables ({dbContent.tables.length})
        </div>
        {dbContent.tables.map((table: string, index: number) => {
          const tableName = table.match(/CREATE TABLE\s+(\w+)/i)?.[1] || `table_${index}`;
          return (
            <div key={index} className={`bg-slate-800/30 rounded p-${compact ? '2' : '3'} border border-slate-700/30 mb-2`}>
              <div className={`flex items-center gap-2 mb-${compact ? '1' : '2'}`}>
                <div className={`w-2 h-2 ${style.accent} rounded-full`}></div>
                <span className={`text-white text-${compact ? 'xs' : 'sm'} font-medium`}>{tableName}</span>
              </div>
              <pre className={`text-slate-300 font-mono text-xs overflow-x-auto ${compact ? '' : 'whitespace-pre-wrap'}`}>
                <code>{table}</code>
              </pre>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const NoSQLContentRenderer: React.FC<{ dbContent: DatabaseContent; style: DatabaseStyle; compact: boolean }> = ({ 
  dbContent, 
  style, 
  compact 
}) => (
  <div className={`space-y-${compact ? '2' : '3'}`}>
    {/* Collections */}
    {dbContent.collections && dbContent.collections.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Collections</div>
        <div className={`flex flex-wrap gap-${compact ? '1' : '2'} mb-3`}>
          {dbContent.collections.map((collection: string, index: number) => (
            <span key={index} className={`px-2 py-1 ${style.bg} ${style.color} rounded text-xs border ${style.border}`}>
              {collection}
            </span>
          ))}
        </div>
      </div>
    )}
    
    {/* JSON/MongoDB Blocks */}
    {dbContent.blocks && dbContent.blocks.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Document Schemas</div>
        {dbContent.blocks.map((block: string, index: number) => {
          const cleanJSON = block.replace(/```(?:json|mongodb?)\n?/gi, '').replace(/```/g, '').trim();
          let formattedJSON = cleanJSON;
          try {
            const parsed = JSON.parse(cleanJSON);
            formattedJSON = JSON.stringify(parsed, null, compact ? 0 : 2);
          } catch (e) {
            // Keep original if not valid JSON
          }
          return (
            <div key={index} className={`${style.bg} rounded p-${compact ? '2' : '3'} border ${style.border} mb-2`}>
              <pre className={`${style.color} font-mono text-${compact ? 'xs' : 'sm'} overflow-x-auto whitespace-pre-wrap`}>
                <code>{formattedJSON}</code>
              </pre>
            </div>
          );
        })}
      </div>
    )}
    
    {/* Sample Documents */}
    {dbContent.documents && dbContent.documents.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Sample Documents</div>
        {dbContent.documents.slice(0, compact ? 2 : 5).map((doc: string, index: number) => {
          let formattedDoc = doc;
          try {
            const parsed = JSON.parse(doc);
            formattedDoc = JSON.stringify(parsed, null, compact ? 0 : 2);
          } catch (e) {
            // Keep original format
          }
          return (
            <div key={index} className={`bg-slate-800/30 rounded p-${compact ? '2' : '3'} border border-slate-700/30 mb-2`}>
              <pre className={`text-slate-300 font-mono text-xs overflow-x-auto ${compact ? '' : 'whitespace-pre-wrap'}`}>
                <code>{formattedDoc}</code>
              </pre>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const VectorDBContentRenderer: React.FC<{ dbContent: DatabaseContent; style: DatabaseStyle; compact: boolean }> = ({ 
  dbContent, 
  style, 
  compact 
}) => (
  <div className={`space-y-${compact ? '2' : '3'}`}>
    {/* Vector Configuration */}
    {(dbContent.dimensions?.length > 0 || dbContent.metrics?.length > 0) && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Vector Configuration</div>
        <div className={`grid grid-cols-2 gap-${compact ? '1' : '2'}`}>
          {dbContent.dimensions && dbContent.dimensions.length > 0 && (
            <div className={`${style.bg} rounded p-${compact ? '2' : '3'} border ${style.border}`}>
              <div className="text-xs text-slate-400">Dimensions</div>
              <div className={`${style.color} font-mono text-${compact ? 'xs' : 'sm'}`}>
                {dbContent.dimensions[0]}
              </div>
            </div>
          )}
          {dbContent.metrics && dbContent.metrics.length > 0 && (
            <div className={`${style.bg} rounded p-${compact ? '2' : '3'} border ${style.border}`}>
              <div className="text-xs text-slate-400">Metric</div>
              <div className={`${style.color} font-mono text-${compact ? 'xs' : 'sm'}`}>
                {dbContent.metrics[0]}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    
    {/* Vector Indices */}
    {dbContent.indices && dbContent.indices.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Vector Indices</div>
        <div className={`flex flex-wrap gap-${compact ? '1' : '2'}`}>
          {dbContent.indices.map((index: string, idx: number) => (
            <span key={idx} className={`px-2 py-1 ${style.bg} ${style.color} rounded text-xs border ${style.border}`}>
              {index}
            </span>
          ))}
        </div>
      </div>
    )}
    
    {/* Vector Code Blocks */}
    {dbContent.blocks && dbContent.blocks.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Vector Operations</div>
        {dbContent.blocks.map((block: string, index: number) => {
          const cleanCode = block.replace(/```(?:python|vector|embedding)\n?/gi, '').replace(/```/g, '').trim();
          return (
            <div key={index} className={`${style.bg} rounded p-${compact ? '2' : '3'} border ${style.border} mb-2`}>
              <pre className={`${style.color} font-mono text-${compact ? 'xs' : 'sm'} overflow-x-auto whitespace-pre-wrap`}>
                <code>{cleanCode}</code>
              </pre>
            </div>
          );
        })}
      </div>
    )}
    
    {/* Sample Embeddings */}
    {dbContent.embeddings && dbContent.embeddings.length > 0 && (
      <div>
        <div className={`text-xs text-slate-400 mb-${compact ? '1' : '2'}`}>Sample Embeddings</div>
        {dbContent.embeddings.slice(0, compact ? 1 : 3).map((embedding: string, index: number) => (
          <div key={index} className={`bg-slate-800/30 rounded p-${compact ? '2' : '3'} border border-slate-700/30 mb-2`}>
            <pre className={`text-slate-300 font-mono text-xs overflow-x-auto ${compact ? '' : 'whitespace-pre-wrap'}`}>
              <code>{embedding}</code>
            </pre>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default DatabaseContentRenderer;