-- Production Database Migration
-- Adds gemini_model column to chatbots table
-- Safe for existing production data

-- Step 1: Add the column as nullable first
ALTER TABLE chatbots 
ADD COLUMN IF NOT EXISTS gemini_model VARCHAR;

-- Step 2: Backfill existing rows with the default value
UPDATE chatbots 
SET gemini_model = 'gemini-2.5-flash' 
WHERE gemini_model IS NULL;

-- Step 3: Set the default for future rows
ALTER TABLE chatbots 
ALTER COLUMN gemini_model SET DEFAULT 'gemini-2.5-flash';

-- Step 4: Make the column NOT NULL (safe now that all rows have values)
ALTER TABLE chatbots 
ALTER COLUMN gemini_model SET NOT NULL;

-- Step 5: Add check constraint for valid values
ALTER TABLE chatbots 
ADD CONSTRAINT chatbots_gemini_model_check 
CHECK (gemini_model IN ('gemini-2.0-flash-exp', 'gemini-2.5-pro', 'gemini-2.5-flash'));

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chatbots' 
AND column_name = 'gemini_model';
