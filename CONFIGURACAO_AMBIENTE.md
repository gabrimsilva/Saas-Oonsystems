# ⚙️ Configuração do Ambiente - LIRI E-Commerce

## ✅ Credenciais Configuradas

O arquivo `.env` foi criado com as credenciais do projeto Supabase:

### 🔗 Informações do Projeto

- **Project Reference ID**: `jeqhvbjtyrqvownitfdc`
- **URL do Projeto**: `https://jeqhvbjtyrqvownitfdc.supabase.co`
- **Anon Key**: Configurada ✅
- **App Name**: LIRI E-Commerce
- **Version**: 1.0.0

## 📋 Variáveis de Ambiente Configuradas

### Essenciais (✅ Configuradas)
```env
VITE_SUPABASE_URL=https://jeqhvbjtyrqvownitfdc.supabase.co
VITE_SUPABASE_ANON_KEY=[configurada]
VITE_APP_NAME=LIRI E-Commerce
VITE_APP_VERSION=1.0.0
```

### Opcionais (⏳ Pendentes)
```env
# Pagamento PIX
VITE_MERCADO_PAGO_PUBLIC_KEY=[não configurado]

# Geolocalização
VITE_GOOGLE_MAPS_API_KEY=[não configurado]

# Analytics
GA4_PROPERTY_ID=[não configurado]
GA4_SERVICE_ACCOUNT_EMAIL=[não configurado]
GA4_PRIVATE_KEY=[não configurado]
```

## 🔐 Segurança

⚠️ **IMPORTANTE**:
- ✅ O arquivo `.env` está no `.gitignore`
- ✅ As credenciais **NÃO serão commitadas** no Git
- ✅ O arquivo `.env.example` serve como template
- ⚠️ **NUNCA** compartilhe suas credenciais publicamente

## 🚀 Próximos Passos

### 1. Testar a Conexão
```bash
npm install
npm run dev
```

### 2. Aplicar Migrations do Banco
Execute os scripts SQL da pasta:
```
BD_20_01 Novo banco - atual/
```

Na seguinte ordem:
1. `01_extensions.sql`
2. `02_functions.sql`
3. `03_tables.sql`
4. `03b_tables_stock_sales.sql`
5. `04_indexes.sql`
6. `05_triggers.sql`
7. `06_rls_policies.sql`
8. `07_storage_and_config.sql`
9. `08_views.sql`

### 3. Configurar Integrações Opcionais

#### Mercado Pago (Pagamento PIX)
1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Crie uma aplicação
3. Obtenha a Public Key
4. Adicione no `.env`: `VITE_MERCADO_PAGO_PUBLIC_KEY=sua_chave`

#### Google Maps (Entregas)
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Ative a API do Google Maps
3. Crie uma chave de API
4. Adicione no `.env`: `VITE_GOOGLE_MAPS_API_KEY=sua_chave`

#### Google Analytics (Métricas)
1. Acesse [Google Analytics](https://analytics.google.com/)
2. Crie uma propriedade GA4
3. Configure Service Account
4. Configure os secrets no Supabase:
```bash
supabase secrets set GA4_PROPERTY_ID="seu_id"
supabase secrets set GA4_SERVICE_ACCOUNT_EMAIL="seu_email"
supabase secrets set GA4_PRIVATE_KEY="sua_chave_privada"
```

## 📊 Status do Banco de Dados

### Schemas Ativos:
- **public**: 0 tabelas (aguardando migrations)
- **auth**: 23 tabelas ✅ (sistema)
- **realtime**: 3 tabelas ✅ (sistema)
- **storage**: 8 tabelas ✅ (sistema)
- **vault**: 1 tabela ✅ (sistema)

### Extensions Instaladas:
- `pgcrypto` - Funções de criptografia
- `uuid-ossp` - Geração de UUIDs
- `pg_stat_statements` - Estatísticas de queries
- `supabase_vault` - Gerenciamento de secrets
- `plpgsql` - Linguagem procedural

## 🔗 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc
- **SQL Editor**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/editor
- **API Docs**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/api
- **Database**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/database/tables

---

**Data de Configuração**: 13/08/2026  
**Status**: ✅ Pronto para desenvolvimento
