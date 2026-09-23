# 🚀 Guia de Criação do Banco de Dados - LIRI E-Commerce

## ✅ O Que Já Foi Feito (via MCP)

1. **Extensions instaladas** ✅
   - uuid-ossp
   - pgcrypto

2. **Functions criadas** ✅
   - 8 funções auxiliares para o sistema

## 📋 Próximos Passos (Manual no Supabase)

### Passo 1: Abrir o Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc
2. Clique em **SQL Editor** no menu lateral
3. Clique em **+ New query**

### Passo 2: Criar as Tabelas

**Arquivo**: `BD_20_01 Novo banco - atual/03_tables.sql`

1. Abra o arquivo `03_tables.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** ou pressione `Ctrl+Enter`
5. Aguarde ~10-15 segundos
6. Verifique se apareceu "Success"

### Passo 3: Criar Tabelas de Estoque e Vendas

**Arquivo**: `BD_20_01 Novo banco - atual/03b_tables_stock_sales.sql`

1. Abra o arquivo `03b_tables_stock_sales.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor (nova query ou limpe a anterior)
4. Execute
5. Aguarde a confirmação

### Passo 4: Criar Índices

**Arquivo**: `BD_20_01 Novo banco - atual/04_indexes.sql`

1. Abra o arquivo `04_indexes.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Execute
5. Aguarde ~5-10 segundos

### Passo 5: Criar Triggers

**Arquivo**: `BD_20_01 Novo banco - atual/05_triggers.sql`

1. Abra o arquivo `05_triggers.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Execute

### Passo 6: Aplicar Políticas RLS

**Arquivo**: `BD_20_01 Novo banco - atual/06_rls_policies.sql`

1. Abra o arquivo `06_rls_policies.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Execute
5. Aguarde ~10-15 segundos (este é o mais demorado)

### Passo 7: Configurar Storage

**Arquivo**: `BD_20_01 Novo banco - atual/07_storage_and_config.sql`

1. Abra o arquivo `07_storage_and_config.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Execute

### Passo 8: Criar Views

**Arquivo**: `BD_20_01 Novo banco - atual/08_views.sql`

1. Abra o arquivo `08_views.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Execute

## ✅ Verificação Final

Execute este comando no SQL Editor para verificar:

```sql
-- Deve retornar aproximadamente 22-26 tabelas
SELECT COUNT(*) as total_tabelas 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Lista todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 📊 Tabelas Esperadas

Você deve ver estas tabelas:

1. ✅ adicionais
2. ✅ avaliacoes
3. ✅ categorias
4. ✅ clientes
5. ✅ comandas
6. ✅ combo_produtos
7. ✅ combos
8. ✅ configuracoes
9. ✅ estoque
10. ✅ funcionarios
11. ✅ historico_comandas
12. ✅ historico_geral
13. ✅ historico_pedidos
14. ✅ ia_arquivos_temp
15. ✅ ia_config
16. ✅ ia_conversas
17. ✅ pedidos
18. ✅ produto_sabores
19. ✅ produtos
20. ✅ profile
21. ✅ sabores
22. ✅ tamanhos
23. ✅ (+ tabelas de stock e sales se aplicado 03b)

## ⏱️ Tempo Estimado

- **Total**: 10-15 minutos
- **Por arquivo**: 1-3 minutos cada

## 🆘 Solução de Problemas

### Erro: "relation already exists"
- ✅ Normal! Scripts são idempotentes
- Continue executando

### Erro: "permission denied"
- ⚠️ Você precisa ser admin do projeto
- Verifique se está logado com a conta correta

### Erro: "column already exists"  
- ✅ Normal! Pode ignorar e continuar

### Query muito longa/timeout
- Cole em partes menores
- Execute um CREATE TABLE por vez

## 📝 Após Conclusão

1. Verifique o número de tabelas
2. Teste o login no sistema
3. Crie o primeiro usuário admin
4. Configure as settings iniciais

## 🎯 Status Atual

- [x] Extensions
- [x] Functions
- [ ] Tables (Passo 2)
- [ ] Stock/Sales Tables (Passo 3)
- [ ] Indexes (Passo 4)
- [ ] Triggers (Passo 5)
- [ ] RLS Policies (Passo 6)
- [ ] Storage (Passo 7)
- [ ] Views (Passo 8)

---

**Projeto**: LIRI E-Commerce  
**Database**: jeqhvbjtyrqvownitfdc  
**Data**: 13/08/2026
