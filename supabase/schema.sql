create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'admin')),
  display_name text
);

create table if not exists bracelets (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  student_id uuid not null references profiles(id) on delete cascade
);

create table if not exists student_badges (
  student_id uuid not null references profiles(id) on delete cascade,
  badge_id int not null check (badge_id between 1 and 20),
  unlocked_at timestamptz not null default now(),
  unlocked_by_admin_id uuid references profiles(id),
  primary key (student_id, badge_id)
);

alter table profiles enable row level security;
alter table bracelets enable row level security;
alter table student_badges enable row level security;

drop policy if exists "users can view own profile" on profiles;
create policy "users can view own profile"
on profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "public can view bracelets by token" on bracelets;
create policy "public can view bracelets by token"
on bracelets for select
to anon, authenticated
using (true);

drop policy if exists "public can view student badges" on student_badges;
create policy "public can view student badges"
on student_badges for select
to anon, authenticated
using (true);

-- Example setup after creating users in Supabase Auth:
-- insert into profiles (id, role, display_name) values ('ADMIN_USER_UUID', 'admin', 'Admin');
-- insert into profiles (id, role, display_name) values ('STUDENT_USER_UUID', 'student', 'Student 001');
-- insert into bracelets (token, student_id) values ('abc123', 'STUDENT_USER_UUID');

