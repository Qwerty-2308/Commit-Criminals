-- COMPLETE REBUILD OF CHAT MESSAGES TABLE
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Drop the broken table completely
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- 2. Recreate from scratch
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Re-create policies
CREATE POLICY "Anyone can view chat messages" 
    ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can send chat messages" 
    ON public.chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own messages" 
    ON public.chat_messages FOR DELETE USING (auth.uid() = author_id);

-- 5. Force reload
NOTIFY pgrst, 'reload config';

COMMIT;
