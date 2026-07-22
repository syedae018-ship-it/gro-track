CREATE TABLE IF NOT EXISTS public.user_streaks (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date TEXT,
  completed_dates TEXT[] DEFAULT '{}'
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own streaks"
  ON public.user_streaks FOR ALL USING (auth.uid() = owner_id);
