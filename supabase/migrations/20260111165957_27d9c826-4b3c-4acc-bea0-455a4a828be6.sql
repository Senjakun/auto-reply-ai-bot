-- Fix 1: Add policy to deny anonymous access on profiles table
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix 2: Drop the overly permissive policy on telegram_users
DROP POLICY IF EXISTS "Service role full access" ON public.telegram_users;

-- Create proper service role only policy for telegram_users
CREATE POLICY "Service role only access" 
ON public.telegram_users 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Fix 3: Same fix for telegram_inbox_tracker
DROP POLICY IF EXISTS "Service role full access tracker" ON public.telegram_inbox_tracker;

CREATE POLICY "Service role only access tracker" 
ON public.telegram_inbox_tracker 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');