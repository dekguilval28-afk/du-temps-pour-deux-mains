-- Ajout : retirer une annonce avec son code
-- À exécuter une fois dans Supabase > SQL Editor > New query.

create or replace function supprimer_annonce(p_annonce uuid, p_code text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  delete from annonces a
  where a.id = p_annonce
    and a.code_hash = crypt(p_code, a.code_hash);
  return found;
end;
$$;

grant execute on function supprimer_annonce(uuid, text) to anon, authenticated;
