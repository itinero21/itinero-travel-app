-- Create the travel_items table
CREATE TABLE IF NOT EXISTS travel_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE travel_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read travel_items
CREATE POLICY "Allow public read access"
ON travel_items
FOR SELECT
TO public
USING (true);

-- Insert some sample data
INSERT INTO travel_items (title, description) VALUES
  ('Paris, France', 'Visit the Eiffel Tower and explore the Louvre Museum'),
  ('Tokyo, Japan', 'Experience the bustling city life and traditional temples'),
  ('New York, USA', 'See the Statue of Liberty and walk through Central Park'),
  ('Barcelona, Spain', 'Admire Gaudi architecture and enjoy Mediterranean beaches');
