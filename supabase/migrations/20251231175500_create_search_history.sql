create table if not exists public.search_history (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  filters jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id)
);

alter table public.search_history enable row level security;

-- Policy: Users can view their own search history
create policy "Users can view own search history"
  on public.search_history for select
  using ( auth.uid() = user_id );

-- Policy: Users can insert their own search history
create policy "Users can insert own search history"
  on public.search_history for insert
  with check ( auth.uid() = user_id );

-- Policy: Admins can view all search history (Optional based on typical requirements, but sticking to basics for now)
-- Unless requested otherwise, I'll stick to "users can only read their own" as the primary constraint ensuring privacy.
