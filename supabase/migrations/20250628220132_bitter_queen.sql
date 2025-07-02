/*
  # Update database_queries query_type constraint
  
  1. Changes
     - Update the query_type check constraint on database_queries table to include additional types used by the application
     - Add 'analysis', 'schema', 'implementation', 'validation', and 'visualization' query types
  
  2. Purpose
     - Fix constraint violation errors when saving different types of queries
     - Support the streaming and generation functionality that uses these types
*/

-- Drop the existing constraint
ALTER TABLE database_queries
  DROP CONSTRAINT IF EXISTS database_queries_query_type_check;

-- Add the new constraint with the expanded list of allowed values
ALTER TABLE database_queries
  ADD CONSTRAINT database_queries_query_type_check
  CHECK (query_type = ANY (ARRAY[
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'OTHER',
    'analysis', 'schema', 'implementation', 'validation', 'visualization'
  ]));

-- Add a comment to explain the purpose of this constraint
COMMENT ON CONSTRAINT database_queries_query_type_check ON database_queries IS 
  'Enforces valid query types including both SQL operations and application-specific content types';