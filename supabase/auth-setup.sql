-- Create the itineraries table with user authentication
CREATE TABLE IF NOT EXISTS itineraries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security on itineraries
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own itineraries
CREATE POLICY "Users can view their own itineraries"
ON itineraries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own itineraries
CREATE POLICY "Users can create their own itineraries"
ON itineraries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own itineraries
CREATE POLICY "Users can update their own itineraries"
ON itineraries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own itineraries
CREATE POLICY "Users can delete their own itineraries"
ON itineraries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
