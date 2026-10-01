# OonSystems

SaaS multi-cliente de gestão para estabelecimentos comerciais: PDV, estoque, comandas, pedidos e loja online (catálogo com carrinho e pagamento online opcional). React + TypeScript + Vite no front e Supabase no back.

Repositório: https://github.com/gabrimsilva/Saas-Oonsystems

## Como o SaaS é organizado

- **Plataforma** (`/plataforma`): administração da OonSystems — clientes, período de teste e módulos de cada cliente.
- **Cliente (tenant)**: identificado por CPF/CNPJ. Tem um ou mais **estabelecimentos**; todos os dados do sistema pertencem a um estabelecimento.
- **Isolamento**: garantido no banco por RLS (`fn_estabelecimentos_do_usuario()`); um cliente suspenso perde o acesso.
- **Módulos por cliente**: a plataforma liga/desliga módulos (ex.: "Pedidos online") e o banco bloqueia o que não está contratado.
- **Autocadastro** (`/cadastro`): cria o cliente com 14 dias de teste.
- **Catálogo público** (`/:slug`): vitrine da loja; com "Receber pedidos pelo catálogo" ligado, tem carrinho e checkout (Edge Function `catalogo-pedidos`).

## Funcionalidades

### Área do cliente final
- Catálogo responsivo por loja, com variantes e saldo de estoque (já descontando pedidos em aberto)
- Carrinho e checkout pelo catálogo, varejo ou atacado
- Pagamento na retirada/entrega (resumo enviado pelo WhatsApp) ou online pelo Mercado Pago (PIX, débito, crédito)
- Página de acompanhamento do pedido (`/:slug/pedido/:id`)

### Sistema administrativo
- Dashboard e métricas
- Kanban de pedidos
- PDV e comandas
- Gestão de estoque com variantes
- Impressão térmica (QZ Tray)
- Configurações da loja, formas de pagamento e loja online

## Começando

Pré-requisitos: Node.js 18+, Supabase CLI (já vinculado ao projeto `gagphstrakwfeofghiop`).

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## Banco de dados

O schema é versionado em [`supabase/migrations/`](./supabase/migrations/). Para aplicar migrations novas:

```bash
npx supabase db push
```

## Edge Functions

Ficam em [`supabase/functions/`](./supabase/functions/). Deploy:

```bash
npx supabase functions deploy <nome> --project-ref gagphstrakwfeofghiop --use-api
```

Principais: `catalogo-pedidos` (checkout do catálogo e webhook do Mercado Pago), `cadastro-cliente` (autocadastro), `plataforma-criar-cliente`, `criar-usuario`, `resetar-senha-usuario`, `cancelar-pedidos-expirados`.

## Scripts

```bash
npm run dev            # Servidor de desenvolvimento
npm run build          # Build de produção
npm run preview        # Preview do build
npm run test           # Testes (Vitest)
npm run test:coverage  # Cobertura de testes
```

Testes das Edge Functions (sem Deno instalado):

```bash
docker run --rm -v "$PWD/supabase/functions:/f" -w /f denoland/deno deno test
```

## Tecnologias

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **Pagamentos**: Mercado Pago Checkout Pro
- **Gráficos**: Recharts
- **Impressão**: QZ Tray

## Licença

© 2026 OonSystems - Todos os direitos reservados.
