-- Drop the restrictive policy that doesn't work correctly
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Update existing policies to be PERMISSIVE (they are restrictive by default)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate as PERMISSIVE policies with proper auth check
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);