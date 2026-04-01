-- ============================================
-- COMPLETE DATABASE SETUP FOR ITINERO
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Create itineraries table
-- ============================================

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

-- ============================================
-- PART 2: Create user_profiles table for roles
-- ============================================

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

-- ============================================
-- PART 3: Add new columns to itineraries table
-- ============================================

-- Add columns for photos, recommendations, links, and public visibility
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS photos TEXT[],
ADD COLUMN IF NOT EXISTS recommendations TEXT,
ADD COLUMN IF NOT EXISTS links TEXT[],
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ============================================
-- PART 4: Update RLS policies for itineraries
-- ============================================

-- Drop old SELECT policy if it exists
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

-- ============================================
-- DONE! Your database is now ready
-- ============================================
