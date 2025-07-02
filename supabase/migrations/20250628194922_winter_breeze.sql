/*
  # Add description column to database_queries table

  1. Schema Changes
    - Add `description` column to `database_queries` table
    - Make it nullable text column for backward compatibility

  2. Rationale
    - The TypeScript interface DatabaseQuery includes a description field
    - The application code expects this field to exist for auto-save functionality
    - Adding as nullable to maintain compatibility with existing data
*/

-- Add the missing description column to database_queries table
ALTER TABLE database_queries 
ADD COLUMN IF NOT EXISTS description text;

-- Add a comment to document the column purpose
COMMENT ON COLUMN database_queries.description IS 'Optional description for the query or generated content';

-- Create an index for faster searching on descriptions
CREATE INDEX IF NOT EXISTS idx_database_queries_description 
ON database_queries USING gin (to_tsvector('english', description)) 
WHERE description IS NOT NULL;

-- Success message
SELECT 'Successfully added description column to database_queries table!' AS status;