-- Impressão de cupons: fila de impressão por estabelecimento e cupom salvo na venda e no pedido.
-- Só acrescenta estruturas: nenhum dado existente é alterado.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS receipt_html text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS receipt_html text;

CREATE TABLE public.print_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id),
    ref_type varchar NOT NULL CHECK (ref_type IN ('SALE', 'ORDER')),
    ref_id uuid NOT NULL,
    printer_name varchar,
    status varchar NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'PRINTED', 'FAILED', 'CANCELED')),
    attempts integer NOT NULL DEFAULT 0,
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_print_jobs_estabelecimento_status ON public.print_jobs (estabelecimento_id, status, created_at);
CREATE INDEX idx_print_jobs_referencia ON public.print_jobs (ref_type, ref_id);

CREATE TRIGGER trg_print_jobs_touch BEFORE UPDATE ON public.print_jobs
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_sales_updated_at();

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.print_jobs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_jobs TO authenticated;
GRANT ALL ON public.print_jobs TO service_role;

CREATE POLICY print_jobs_select_tenant ON public.print_jobs FOR SELECT TO authenticated
    USING (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()));
CREATE POLICY print_jobs_insert_tenant ON public.print_jobs FOR INSERT TO authenticated
    WITH CHECK (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()));
CREATE POLICY print_jobs_update_tenant ON public.print_jobs FOR UPDATE TO authenticated
    USING (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()))
    WITH CHECK (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()));
CREATE POLICY print_jobs_delete_tenant ON public.print_jobs FOR DELETE TO authenticated
    USING (estabelecimento_id IN (SELECT public.fn_estabelecimentos_do_usuario()));
