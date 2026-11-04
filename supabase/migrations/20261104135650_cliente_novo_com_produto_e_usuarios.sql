-- Cliente novo, ainda sem plano, precisa cadastrar produtos e usuários:
-- começa com os módulos do sistema mais Produto e Usuários.
-- Os demais serviços vêm do plano.
CREATE OR REPLACE FUNCTION public.fn_tenant_modulos_iniciais()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.tenant_modulos (tenant_id, modulo)
    SELECT NEW.id, m.codigo
    FROM public.modulos m
    WHERE m.sistema OR m.codigo IN ('produto', 'usuarios');
    RETURN NEW;
END;
$$;
