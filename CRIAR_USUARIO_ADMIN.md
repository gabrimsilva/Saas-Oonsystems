# 👤 Criar Usuário Administrador - LIRI E-Commerce

## ✅ Estabelecimento Criado!

- **Nome**: LIRI E-Commerce
- **Slug**: `liri`
- **ID**: `e1cb89b8-8ccb-49b4-85f6-1badc1d396ae`
- **Cor Tema**: #4F46E5 (Índigo)
- **Status**: Ativo ✅

## 🔐 Criar Usuário Admin

### Método 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc
   - Clique em **Authentication** no menu lateral
   - Clique em **Users**

2. **Adicionar Novo Usuário**
   - Clique em **Add user** > **Create new user**
   - **Email**: admin@liri.com (ou seu email preferido)
   - **Password**: (escolha uma senha forte)
   - **Auto Confirm User**: ✅ Marque esta opção
   - Clique em **Create user**

3. **Copiar o User ID**
   - Após criar, copie o **UUID** do usuário
   - Exemplo: `12345678-1234-1234-1234-123456789012`

4. **Vincular ao Estabelecimento**
   - Vá em **SQL Editor**
   - Execute o comando abaixo substituindo `SEU_USER_ID` e `SEU_EMAIL`:

```sql
-- Vincular usuário ao estabelecimento como Admin Geral
INSERT INTO public.usuarios_estabelecimento (
    user_id,
    nome,
    email,
    perfil,
    estabelecimento_id,
    ativo
) VALUES (
    'SEU_USER_ID'::uuid,  -- Substitua pelo UUID copiado
    'Administrador',
    'SEU_EMAIL',          -- Substitua pelo email usado
    'administrador_geral',
    'e1cb89b8-8ccb-49b4-85f6-1badc1d396ae'::uuid,
    true
);

-- Criar perfil administrativo
INSERT INTO public.profile (
    user_id,
    nome,
    email,
    telefone,
    ativo
) VALUES (
    'SEU_USER_ID'::uuid,  -- Mesmo UUID
    'Administrador',
    'SEU_EMAIL',          -- Mesmo email
    NULL,
    true
);
```

### Método 2: Via SQL Direto (Avançado)

Execute este comando no SQL Editor:

```sql
-- Criar usuário diretamente (requer extensão pgcrypto)
-- ATENÇÃO: Substitua 'sua_senha_forte' por uma senha real
DO $$
DECLARE
    novo_user_id UUID;
BEGIN
    -- Inserir na tabela auth.users (simulado - pode não funcionar diretamente)
    -- O método recomendado é via Dashboard
    
    -- Por enquanto, use o método 1 (Dashboard)
    RAISE NOTICE 'Use o Método 1 via Dashboard para criar o usuário';
END $$;
```

## 🎯 Dados de Acesso Sugeridos

### Opção A: Email Pessoal
- **Email**: seu.email@gmail.com
- **Senha**: (sua escolha)
- **Perfil**: Administrador Geral

### Opção B: Email Teste
- **Email**: admin@liri.com
- **Senha**: LiriAdmin@2026
- **Perfil**: Administrador Geral

## ✅ Verificação

Após criar o usuário, verifique se está tudo ok:

```sql
-- 1. Verificar se o usuário foi criado
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'SEU_EMAIL';

-- 2. Verificar vínculo com estabelecimento
SELECT 
    ue.nome,
    ue.email,
    ue.perfil,
    e.nome as estabelecimento
FROM public.usuarios_estabelecimento ue
LEFT JOIN public.estabelecimentos e ON ue.estabelecimento_id = e.id
WHERE ue.email = 'SEU_EMAIL';

-- 3. Verificar perfil
SELECT nome, email, ativo 
FROM public.profile 
WHERE email = 'SEU_EMAIL';
```

## 🚀 Teste de Login

1. Inicie o projeto localmente:
```bash
npm install
npm run dev
```

2. Acesse: http://localhost:5173

3. Faça login com:
   - **Email**: (email que você criou)
   - **Senha**: (senha que você definiu)

4. Você deve ver o Dashboard com acesso completo!

## 🔧 Solução de Problemas

### Erro: "Invalid login credentials"
- Verifique se o email está correto
- Verifique se a senha está correta
- Certifique-se de ter marcado "Auto Confirm User"

### Erro: "User not found in database"
- Execute os comandos SQL de vínculo (passo 4 do Método 1)
- Verifique se o UUID do usuário está correto

### Não consigo ver o Dashboard
- Verifique se o perfil é `administrador_geral`
- Verifique se `ativo = true` em ambas tabelas
- Limpe o cache do navegador

## 📊 Estrutura Criada

```
LIRI E-Commerce (Estabelecimento)
└── Administrador (Usuário Admin Geral)
    ├── Acesso total ao sistema
    ├── Pode gerenciar estabelecimentos
    ├── Pode gerenciar usuários
    └── Pode acessar todas as funcionalidades
```

## 🔗 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc
- **Authentication**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/auth/users
- **SQL Editor**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/editor
- **Database**: https://supabase.com/dashboard/project/jeqhvbjtyrqvownitfdc/database/tables

---

**Data**: 13/08/2026  
**Status**: ✅ Estabelecimento criado, aguardando criação do usuário
