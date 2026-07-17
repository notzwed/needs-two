begin;
drop policy if exists "avatar uploads own folder" on storage.objects;
create policy "avatar uploads own folder" on storage.objects for insert to authenticated
with check (bucket_id='needs-two-avatars' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "avatar updates own folder" on storage.objects;
create policy "avatar updates own folder" on storage.objects for update to authenticated
using (bucket_id='needs-two-avatars' and split_part(name,'/',1)=auth.uid()::text)
with check (bucket_id='needs-two-avatars' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "avatar deletes own folder" on storage.objects;
create policy "avatar deletes own folder" on storage.objects for delete to authenticated
using (bucket_id='needs-two-avatars' and split_part(name,'/',1)=auth.uid()::text);

drop policy if exists "avatar images public read" on storage.objects;
create policy "avatar images public read" on storage.objects for select to public
using (bucket_id='needs-two-avatars');
commit;
