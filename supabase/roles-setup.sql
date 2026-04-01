-- Create user_profiles table to store user roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT CHECK (role IN ('traveller', 'experienced_traveller')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all profiles
CREATE POLICY "Anyone can view profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Update itineraries table to include photos, links, and public visibility
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS photos TEXT[], -- Array of photo URLs
ADD COLUMN IF NOT EXISTS recommendations TEXT, -- Recommendations text
ADD COLUMN IF NOT EXISTS links TEXT[], -- Array of useful links
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false; -- Whether itinerary is visible to all

-- Update RLS policies for itineraries

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;

-- New policy: Users can see their own itineraries OR public itineraries
CREATE POLICY "Users can view own or public itineraries"
ON itineraries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_public = true);

-- Policy for anonymous users to view public itineraries
CREATE POLICY "Anyone can view public itineraries"
ON itineraries
FOR SELECT
TO anon
USING (is_public = true);
