-- Add 'gmail' to items source CHECK constraint
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_source_check;
ALTER TABLE items ADD CONSTRAINT items_source_check CHECK (source IN ('manual', 'slack', 'ai_suggested', 'gmail'));
