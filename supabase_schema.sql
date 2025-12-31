-- Create a table for public profiles
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text not null,
  full_name text,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies

-- 1. Public profiles are viewable by everyone (or just authenticated users, depends on privacy)
-- Let's stick to authenticated users can view their own profile for now.
create policy "Users can view own profile" 
  on public.profiles for select 
  using ( auth.uid() = id );

create policy "Admins can view all profiles"
  on public.profiles for select
  using ( 
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- 2. Users can update their own profile
create policy "Users can update own profile" 
  on public.profiles for update 
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'user') -- Default to user if not specified
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA INSTRUCTIONS
-- Since we cannot insert directly into auth.users easily with password hashing via simple SQL script here without enabling extensions or using the API:
-- 1. Go to Authentication -> Users in Supabase Dashboard.
-- 2. Create User: admin@gmail.com (Password: admin123)
-- 3. Create User: user@gmail.com (Password: user123)

-- AFTER CREATING USERS manually or via signup page, RUN THIS to promote the admin:

-- update public.profiles
-- set role = 'admin'
-- where email = 'admin@gmail.com';

-- update public.profiles
-- set gender = 'male', full_name = 'Admin User'
-- where email = 'admin@gmail.com';

-- update public.profiles
-- set gender = 'female', full_name = 'Regular User'
-- where email = 'user@gmail.com';
