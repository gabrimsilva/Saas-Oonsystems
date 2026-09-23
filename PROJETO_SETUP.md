# 🚀 Setup do Projeto LIRI E-Commerce

## 📝 Resumo do Projeto

O **LIRI E-Commerce** foi criado a partir do repositório `casa-do-pai`, mantendo toda a estrutura e funcionalidades já desenvolvidas, mas com uma nova identidade e foco em e-commerce.

## ✅ Alterações Realizadas

### 1. Clonagem e Inicialização
- ✅ Repositório clonado de `https://github.com/gabrimsilva/casa-do-pai`
- ✅ Histórico Git removido e reinicializado
- ✅ Novo repositório Git criado do zero

### 2. Atualização de Identidade
- ✅ `package.json`: Nome alterado de `casa-do-pai` para `liri-ecommerce`
- ✅ `README.md`: Criado novo README específico para LIRI E-Commerce
- ✅ `index.html`: Atualizado título e meta tags para LIRI E-Commerce

### 3. Commits Iniciais
- ✅ Commit inicial com todo o código base
- ✅ Commit de atualização de branding

## 📦 Estrutura do Projeto

O projeto mantém toda a estrutura original, incluindo:

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Radix UI
- Sistema completo de e-commerce

### Backend
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Edge Functions para pagamentos e automações

### Funcionalidades Principais
- 🛒 Carrinho de compras completo
- 💳 Pagamento via PIX (Mercado Pago)
- 📦 Gestão de estoque
- 📊 Dashboard com métricas
- 🎫 Sistema de comandas
- 📋 Kanban de pedidos
- 🖨️ Impressão térmica
- ⭐ Sistema de avaliações

## 🔧 Próximos Passos

1. **Configurar Variáveis de Ambiente**
   ```bash
   cp .env.example .env
   # Editar com suas credenciais
   ```

2. **Instalar Dependências**
   ```bash
   npm install
   ```

3. **Configurar Banco de Dados**
   - Execute os scripts SQL na pasta raiz
   - Configure as Edge Functions no Supabase

4. **Iniciar Desenvolvimento**
   ```bash
   npm run dev
   ```

5. **Personalização**
   - Atualizar favicon e logo
   - Ajustar cores e tema visual
   - Configurar Google Analytics
   - Configurar Mercado Pago

## 📚 Documentação

Toda a documentação original foi mantida na pasta `docs/`:
- Sistema de Pagamento PIX
- Gestão de Estoque
- Configurações
- Segurança
- Analytics
- E muito mais...

## 🎯 Diferenças em Relação ao Projeto Original

O LIRI E-Commerce herda todas as funcionalidades do projeto original, mas com:
- ✨ Nova identidade visual
- 🎨 Foco em e-commerce genérico (não apenas delivery de alimentos)
- 🔄 Possibilidade de expansão para múltiplos tipos de produtos
- 📱 Pronto para personalização conforme necessidade

---

**Data de Criação**: 13/08/2026  
**Versão Inicial**: 1.0.0  
**Base**: casa-do-pai repository
