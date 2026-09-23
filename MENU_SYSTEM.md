# 📋 Sistema de Menu - LIRI E-Commerce

## 🎯 Estrutura do Menu

O menu administrativo do LIRI E-Commerce foi simplificado e otimizado para focar nas funcionalidades essenciais do e-commerce.

## 📑 Menus Disponíveis

### 1. 🏠 Dashboard
- **ID**: `dashboard`
- **Descrição**: Visão geral do sistema com métricas principais
- **Permissão**: Sempre visível
- **Submenu**: Não

### 2. 💰 PDV
- **ID**: `pdv`
- **Descrição**: Ponto de Venda para vendas presenciais
- **Permissão**: `podeAcessarPDV`
- **Submenu**: Sim
  - **Histórico de Vendas** (`historico-vendas`)
    - Consulta de vendas realizadas
    - Relatórios de vendas
    - Impressão de comprovantes

### 3. 📦 Estoque
- **ID**: `estoque-produtos`
- **Descrição**: Gestão completa do estoque de produtos
- **Permissão**: `podeAcessarEstoque`
- **Submenu**: Sim
  - **Histórico de Movimentações** (`historico-movimentacoes`)
    - Entradas e saídas de estoque
    - Ajustes manuais
    - Relatórios de movimentação

### 4. 🛍️ Produtos
- **ID**: `produtos`
- **Descrição**: Gestão do catálogo de produtos
- **Permissão**: `podeAcessarProdutos`
- **Submenu**: Sim
  - **Categorias** (`categorias`)
    - Gestão de categorias de produtos
    - Organização hierárquica
    - Imagens e descrições

### 5. ⚙️ Configurações
- **ID**: `configuracoes`
- **Descrição**: Configurações gerais do sistema
- **Permissão**: `podeAcessarConfiguracoes`
- **Submenu**: Sim
  - **Informações Gerais** (`configuracoes-gerais`)
    - Nome, logo, endereço
    - Redes sociais
    - Informações de contato
  - **Horários** (`configuracoes-horario`)
    - Horário de funcionamento
    - Dias de funcionamento
    - Feriados
  - **Pagamentos** (`configuracoes-pagamento`)
    - Formas de pagamento aceitas
    - Configuração PIX (Mercado Pago)
    - Taxas e descontos
  - **Aparência** (`configuracoes-visuais`)
    - Cores e tema
    - Logo e favicon
    - Customização visual
  - **Notificações** (`configuracoes-notificacao`)
    - Notificações de pedidos
    - E-mails automáticos
    - Alertas do sistema
  - **Impressão** (`configuracoes-impressao`)
    - Configuração de impressora térmica
    - Layout de comprovantes
    - QZ Tray

### 6. 👥 Usuários
- **ID**: `usuarios`
- **Descrição**: Gestão de usuários do sistema
- **Permissão**: `podeAcessarPagina('usuarios')`
- **Submenu**: Não
- **Funcionalidades**:
  - Criar, editar e excluir usuários
  - Gerenciar permissões
  - Resetar senhas

### 7. 📊 Métricas
- **ID**: `metricas`
- **Descrição**: Análise de dados e relatórios
- **Permissão**: `podeAcessarPagina('metricas')`
- **Submenu**: Não
- **Funcionalidades**:
  - Vendas por período
  - Produtos mais vendidos
  - Análise de estoque
  - Relatórios customizados

## 🔐 Sistema de Permissões

Cada item do menu é controlado por permissões específicas:

```typescript
// Exemplo de verificação de permissões
if (item.id === 'pdv') return permissoes.podeAcessarPDV
if (item.id === 'estoque-produtos') return permissoes.podeAcessarEstoque
if (item.id === 'produtos') return permissoes.podeAcessarProdutos
if (item.id === 'configuracoes') return permissoes.podeAcessarConfiguracoes
if (item.id === 'usuarios') return podeAcessarPagina('usuarios')
if (item.id === 'metricas') return podeAcessarPagina('metricas')
```

## 📱 Responsividade

O menu é totalmente responsivo:

- **Desktop**: Sidebar fixa à esquerda
- **Mobile**: Menu hamburger com drawer lateral

## 🎨 Aparência

### Desktop
- Sidebar de 16rem de largura
- Itens com hover effects
- Item ativo destacado em cor primária
- Submenus expansíveis com animação

### Mobile
- Header fixo no topo
- Menu overlay com fundo gradiente
- Botão de fechar em destaque
- Indicador de estabelecimento sempre visível

## 🚀 Navegação

A navegação é gerenciada pelo React Router:

```typescript
// Exemplo de navegação
const handleNavigation = (itemId: string) => {
  setActiveItem(itemId)
  navigate(`/sistema/${itemId}`)
}
```

## 📝 Notas de Implementação

### Removidos do Menu Original:
- ❌ Comandas (específico para restaurantes)
- ❌ Delivery/Pedidos (funcionalidade não utilizada)
- ❌ Funcionários (gerenciado via Usuários)
- ❌ Estabelecimentos (multi-tenant simplificado)
- ❌ Auditoria (funcionalidade avançada)
- ❌ Sabores e Adicionais (específico para pizzaria)

### Mantidos e Adaptados:
- ✅ Dashboard
- ✅ PDV + Histórico de Vendas
- ✅ Estoque + Histórico de Movimentações
- ✅ Produtos + Categorias
- ✅ Configurações completas
- ✅ Usuários
- ✅ Métricas

## 🔄 Sincronização

O menu é sincronizado entre:
- AppLayout (desktop)
- MobileAdminHeader (mobile)

Ambos compartilham a mesma lógica de:
- Estrutura de itens
- Sistema de permissões
- Estado ativo
- Navegação

## 🎯 Objetivos

1. **Simplicidade**: Menu limpo e focado
2. **Eficiência**: Acesso rápido às funções principais
3. **Escalabilidade**: Fácil adicionar novos itens
4. **Manutenibilidade**: Código organizado e documentado

---

**Última atualização**: 13/08/2026  
**Status**: ✅ Implementado e testado
