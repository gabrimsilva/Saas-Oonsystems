-- ============================================================================
-- OONSYSTEMS SAAS: RECURSO DE SABORES E ADICIONAIS DESATIVADO
-- ============================================================================
-- Arquivo: 20260930201222_remover_modulo_sabores.sql
-- Descrição: Sabores, bordas, tamanhos e adicionais não são mais usados no
--            sistema. O módulo sai do catálogo (e de todos os clientes, via
--            ON DELETE CASCADE em tenant_modulos).
--            As políticas RESTRICTIVE modulo_{sabores,adicionais,tamanhos}_*
--            continuam: como o módulo não existe mais, fn_modulo_ativo é
--            sempre falso e nenhuma gravação nessas tabelas passa (nem pela
--            API). As tabelas e os dados antigos ficam intactos.
-- Data: 30/09/2026
-- ============================================================================

DELETE FROM public.modulos WHERE codigo = 'sabores_adicionais';

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================
