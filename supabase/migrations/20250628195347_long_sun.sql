/*
# Fix query_type constraint for database_queries table

1. Changes Made
   - Drop existing query_type check constraint that only allowed SQL operation types
   - Add new constraint that includes both SQL operations and application-specific types
   - This allows the application to save queries with types like 'analysis', 'schema', 'implementation', etc.

2. Allowed Query Types
   - SQL Operations: 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'OTHER'
   - Application Types: 'analysis', 'schema', 'implementation', 'validation', 'visualization'
*/

-- Drop the existing constraint that's too restrictive
ALTER TABLE database_queries 
DROP CONSTRAINT IF EXISTS database_queries_query_type_check;

-- Add the updated constraint with all required query types
ALTER TABLE database_queries 
ADD CONSTRAINT database_queries_query_type_check 
CHECK (query_type = ANY (ARRAY[
  'SELECT'::text, 
  'INSERT'::text, 
  'UPDATE'::text, 
  'DELETE'::text, 
  'CREATE'::text, 
  'ALTER'::text, 
  'OTHER'::text,
  'analysis'::text,
  'schema'::text,
  'implementation'::text,
  'validation'::text,
  'visualization'::text
]));