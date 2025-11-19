-- Production Database Migration - Single Transaction Version
-- Adds gemini_model column to chatbots table
-- Run this entire script in the SQL Console

DO $$
BEGIN
    -- Step 1: Add the column as nullable first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' AND column_name = 'gemini_model'
    ) THEN
        ALTER TABLE chatbots ADD COLUMN gemini_model VARCHAR;
        
        -- Step 2: Backfill existing rows with the default value
        UPDATE chatbots SET gemini_model = 'gemini-2.5-flash' WHERE gemini_model IS NULL;
        
        -- Step 3: Set the default for future rows
        ALTER TABLE chatbots ALTER COLUMN gemini_model SET DEFAULT 'gemini-2.5-flash';
        
        -- Step 4: Make the column NOT NULL
        ALTER TABLE chatbots ALTER COLUMN gemini_model SET NOT NULL;
        
        -- Step 5: Add check constraint for valid values
        ALTER TABLE chatbots ADD CONSTRAINT chatbots_gemini_model_check 
        CHECK (gemini_model IN ('gemini-2.0-flash-exp', 'gemini-2.5-pro', 'gemini-2.5-flash'));
        
        RAISE NOTICE 'Successfully added gemini_model column to chatbots table';
    ELSE
        RAISE NOTICE 'Column gemini_model already exists, skipping migration';
    END IF;
END $$;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chatbots' 
AND column_name = 'gemini_model';
