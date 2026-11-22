-- ============================================================================
-- OONSYSTEMS SAAS: ADMINISTRAÇÃO DA PLATAFORMA EXIGE VERIFICAÇÃO EM DUAS ETAPAS
-- ============================================================================
-- fn_is_plataforma_admin() é a base de todas as regras (RLS) e funções da
-- plataforma. Passa a valer só quando a sessão concluiu a segunda etapa
-- (código do app autenticador, nível aal2). Com só a senha (aal1), o
-- administrador consegue entrar e cadastrar o autenticador, mas não lê nem
-- altera nada da plataforma.
-- A tela /plataforma pede o código; as Edge Functions da plataforma conferem
-- o mesmo nível.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_is_plataforma_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
       AND EXISTS (SELECT 1 FROM public.plataforma_admins pa WHERE pa.user_id = auth.uid());
$$;

COMMENT ON FUNCTION public.fn_is_plataforma_admin() IS
    'True se o usuário logado for administrador da plataforma e tiver concluído a verificação em duas etapas (aal2)';
