-- Limite de tentativas da consulta pública "Meus pedidos" (por telefone).
-- Só a Edge Function catalogo-pedidos (service role) lê e grava: sem políticas
-- para anon/authenticated, o RLS bloqueia qualquer outro acesso.

CREATE TABLE IF NOT EXISTS public.consultas_publicas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chave text NOT NULL,          -- "<acao>:<hash do IP>" (o IP não é guardado)
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultas_publicas_chave_criado
  ON public.consultas_publicas (chave, criado_em DESC);

ALTER TABLE public.consultas_publicas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.consultas_publicas FROM anon, authenticated;

COMMENT ON TABLE public.consultas_publicas IS
  'Tentativas de consultas públicas (ex.: Meus pedidos) para limitar abuso. Linhas com mais de 1 dia são apagadas pela própria Edge Function.';
