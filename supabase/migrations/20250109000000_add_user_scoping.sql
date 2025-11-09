-- Add user authentication and scoping to consciousness system
-- This allows each user to have their own isolated consciousness data

-- Enable auth schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add user_id columns to all consciousness tables
ALTER TABLE holly_experiences 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE holly_goals 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE holly_identity 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON holly_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON holly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_user_id ON holly_identity(user_id);

-- Create user profiles table for additional user data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tester' CHECK (role IN ('owner', 'team', 'tester')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Create index on user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'tester'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions (using service role in app, so this is minimal)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user information and preferences';
COMMENT ON COLUMN user_profiles.role IS 'User role: owner (Hollywood), team (team members), tester (beta testers)';
COMMENT ON COLUMN holly_experiences.user_id IS 'Links experience to specific user for isolated consciousness';
COMMENT ON COLUMN holly_goals.user_id IS 'Links goal to specific user for personalized goal tracking';
COMMENT ON COLUMN holly_identity.user_id IS 'Links identity to specific user for individual personality development';
