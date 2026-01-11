-- Create table for approved Telegram users
CREATE TABLE public.telegram_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id bigint NOT NULL UNIQUE,
    telegram_username text,
    approved_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    approved_by bigint NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions)
CREATE POLICY "Service role full access"
ON public.telegram_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for quick lookups
CREATE INDEX idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);
CREATE INDEX idx_telegram_users_active_expires ON public.telegram_users(is_active, expires_at);

-- Add trigger for updated_at
CREATE TRIGGER update_telegram_users_updated_at
    BEFORE UPDATE ON public.telegram_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Table to track last checked email for notifications
CREATE TABLE public.telegram_inbox_tracker (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    last_email_id text,
    last_check_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.telegram_inbox_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access tracker"
ON public.telegram_inbox_tracker
FOR ALL
USING (true)
WITH CHECK (true);