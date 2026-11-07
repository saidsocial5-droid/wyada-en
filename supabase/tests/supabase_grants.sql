-- Supabase's default privileges: API roles get table rights, RLS does the filtering.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
