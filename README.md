# 🛒 LIRI E-Commerce

Sistema completo de e-commerce e gestão para estabelecimentos comerciais, desenvolvido com React + TypeScript + Vite e Supabase.

## ✨ Funcionalidades

### Área do Cliente
- 📱 Catálogo de produtos responsivo
- 🛒 Carrinho de compras
- 🎨 Personalização de produtos (variantes, opcionais, adicionais)
- 📍 Validação de área de entrega com taxa extra por distância
- 💳 **Pagamento via PIX com QR Code** (integração Mercado Pago)
- ⏱️ Timer de expiração PIX (10 minutos)
- 📦 Acompanhamento de pedido em tempo real
- ⭐ Sistema de avaliações

### Sistema Administrativo
- 📊 Dashboard com métricas e analytics
- 📋 Kanban de pedidos (drag & drop)
- 💳 PDV para vendas presenciais
- 🎫 Sistema de comandas
- 📦 Gestão completa de estoque
- 📈 Relatórios e gráficos
- 🖨️ Impressão térmica automática
- ⏰ Gestão de pedidos PIX aguardando pagamento
- 🧹 Limpeza automática de pedidos expirados
- ⚙️ Configurações completas

## 🚀 Começando

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta no Mercado Pago (para pagamentos PIX)

### Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar em desenvolvimento
npm run dev
```

### Configuração do Banco de Dados

Execute os scripts SQL disponíveis na pasta raiz do projeto para configurar todas as tabelas necessárias.

### Edge Functions

Deploy das edge functions necessárias:

```bash
# Criar pagamento PIX
supabase functions deploy create-pix-payment

# Verificar status do pagamento
supabase functions deploy check-payment-status

# Webhook do Mercado Pago
supabase functions deploy mercadopago-webhook

# Zerar pedidos (mover para histórico)
supabase functions deploy zerar-pedidos

# Cancelar pedidos PIX expirados
supabase functions deploy cancelar-pedidos-expirados
```

## 📖 Documentação

Consulte a pasta **[docs/](./docs/)** para documentação completa do sistema, incluindo:
- Sistema de Pagamento PIX
- Taxa Extra por Distância (KM)
- Edge Functions
- Gestão de Estoque
- Impressão Térmica
- Configurações
- Troubleshooting

## 🛠️ Scripts

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build
npm run lint             # Verificação de código
npm run test             # Executar testes
npm run test:ui          # Interface de testes
npm run test:coverage    # Cobertura de testes
```

## 🏗️ Tecnologias

- **Frontend**: React 19, TypeScript, Vite
- **Estilização**: Tailwind CSS 4, Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Gráficos**: Recharts
- **Impressão**: QZ Tray
- **PDF**: jsPDF
- **Pagamentos**: Mercado Pago PIX

## 📁 Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # Contextos React
├── hooks/          # Hooks customizados
├── lib/            # Serviços e utilitários
├── pages/          # Páginas da aplicação
├── types/          # Definições de tipos
└── utils/          # Funções utilitárias
```

## 🔐 Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Mercado Pago (para pagamento PIX)
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_public_key_mercado_pago
```

### Configuração do Pagamento PIX

1. Acesse **Configurações > Formas de Pagamento** no sistema
2. Ative o PIX e insira seu Access Token do Mercado Pago
3. Configure o webhook no painel do Mercado Pago

### Taxa Extra por Distância

1. Acesse **Configurações > Entregas por KM** no sistema
2. Ative a funcionalidade
3. Configure o km inicial e os valores por km

## 👥 Gerenciamento de Usuários

### Administradores
- **Acesso**: Total ao sistema
- **Cadastro**: Direto no banco de dados

### Funcionários
- **Acesso**: Baseado em função e permissões
- **Funções**: Atendente, Garçom, Entregador
- **Cadastro**: Via interface do sistema

## 📄 Licença

© 2026 LIRI E-Commerce - Todos os direitos reservados.

---

**Desenvolvido com ❤️ para facilitar a gestão do seu negócio**
