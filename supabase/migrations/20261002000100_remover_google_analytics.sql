-- Remove o Google Analytics do sistema: apaga as configurações gravadas por
-- loja e tira as duas chaves da lista de configurações públicas (anon).

DELETE FROM public.configuracoes
WHERE chave IN ('google_analytics_measurement_id', 'google_analytics_ativo');

DROP POLICY IF EXISTS configuracoes_select_publico ON public.configuracoes;
CREATE POLICY configuracoes_select_publico ON public.configuracoes FOR SELECT TO anon USING (
  (chave)::text = ANY (ARRAY[
    'nome_estabelecimento', 'logo_url', 'banner_url', 'telefone', 'email', 'endereco', 'cep',
    'horario_funcionamento', 'trabalha_feriado', 'metodos_pagamento', 'tickets_promocionais',
    'tipo_checkout', 'taxa_extra_km_ativa', 'taxa_extra_km_inicial', 'taxa_extra_km_faixas',
    'font_size_base', 'font_size_store_name', 'font_size_section_title', 'font_size_item_sub',
    'font_size_totals', 'font_size_total_final', 'som_notificacao', 'volume_notificacao',
    'modo_cardapio_whatsapp', 'whatsapp_loja', 'favicon_url'
  ]::text[])
);
