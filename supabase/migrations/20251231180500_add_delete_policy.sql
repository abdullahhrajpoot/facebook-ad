
-- Policy: Users can delete their own search history
create policy "Users can delete own search history"
  on public.search_history for delete
  using ( auth.uid() = user_id );
