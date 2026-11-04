-- Pastas de imagens do sistema (produtos, logos e banners).
-- A leitura é pública, porque as imagens aparecem no catálogo das lojas.
-- Cada arquivo fica em <estabelecimento_id>/<pasta>/<arquivo>: o usuário só
-- altera ou lista os arquivos dos estabelecimentos a que tem acesso.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('produtos-imagens', 'produtos-imagens', true, 5242880, ARRAY['image/*']),
    ('sistema-imagens', 'sistema-imagens', true, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY imagens_select_estabelecimento ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id IN ('produtos-imagens', 'sistema-imagens')
        AND (storage.foldername(name))[1] IN (SELECT e::text FROM public.fn_estabelecimentos_do_usuario() e)
    );

CREATE POLICY imagens_insert_estabelecimento ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('produtos-imagens', 'sistema-imagens')
        AND (storage.foldername(name))[1] IN (SELECT e::text FROM public.fn_estabelecimentos_do_usuario() e)
    );

CREATE POLICY imagens_update_estabelecimento ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id IN ('produtos-imagens', 'sistema-imagens')
        AND (storage.foldername(name))[1] IN (SELECT e::text FROM public.fn_estabelecimentos_do_usuario() e)
    )
    WITH CHECK (
        bucket_id IN ('produtos-imagens', 'sistema-imagens')
        AND (storage.foldername(name))[1] IN (SELECT e::text FROM public.fn_estabelecimentos_do_usuario() e)
    );

CREATE POLICY imagens_delete_estabelecimento ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id IN ('produtos-imagens', 'sistema-imagens')
        AND (storage.foldername(name))[1] IN (SELECT e::text FROM public.fn_estabelecimentos_do_usuario() e)
    );
