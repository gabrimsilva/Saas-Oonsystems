# 🔧 Configuração do MCP (Model Context Protocol)

## 📝 O que é o MCP?

O MCP (Model Context Protocol) permite que a IA interaja diretamente com serviços externos, como o Supabase, facilitando operações no banco de dados durante o desenvolvimento.

## 🚀 Configuração do Supabase MCP

### 1. Localização do Arquivo

O arquivo de configuração está localizado em:
```
.kiro/settings/mcp.json
```

### 2. Como Configurar

**Opção A: Copiar do Exemplo**
```bash
cp .kiro/settings/mcp.json.example .kiro/settings/mcp.json
```

**Opção B: Criar Manualmente**

Crie o arquivo `.kiro/settings/mcp.json` com o seguinte conteúdo:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=SEU_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "SEU_ACCESS_TOKEN"
      },
      "disabled": false,
      "autoApprove": [
        "list_tables",
        "list_extensions",
        "list_migrations",
        "execute_sql"
      ]
    }
  }
}
```

### 3. Obter as Credenciais

#### Project Reference (`project-ref`)
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **General**
4. Copie o **Reference ID**

#### Access Token
1. No Supabase Dashboard, clique no seu perfil (canto superior direito)
2. Vá em **Access Tokens**
3. Clique em **Generate new token**
4. Dê um nome (ex: "LIRI MCP")
5. Copie o token gerado

### 4. Configuração Atual do Projeto

O projeto LIRI E-Commerce já está configurado com:
- **Project Ref**: `jeqhvbjtyrqvownitfdc`
- **Access Token**: Configurado ✅

## 🔐 Segurança

⚠️ **IMPORTANTE**: O arquivo `mcp.json` contém credenciais sensíveis e está no `.gitignore`. 

**NUNCA** comite este arquivo no Git!

## ✅ Funcionalidades Habilitadas

Com o MCP configurado, a IA pode:

- 📋 **Listar Tabelas**: Ver todas as tabelas do banco
- 🔌 **Listar Extensions**: Verificar extensões instaladas
- 📦 **Listar Migrations**: Ver histórico de migrações
- 🔍 **Executar SQL**: Executar queries SQL diretamente

Todas essas operações estão com `autoApprove` habilitado para maior agilidade.

## 🔄 Reconectar o Servidor

Se precisar reconectar o servidor MCP:

1. Abra a **Command Palette** (`Ctrl+Shift+P` ou `Cmd+Shift+P`)
2. Digite: `MCP: Reconnect Server`
3. Selecione `supabase`

Ou através do painel:
1. Abra a view **MCP Servers** no Kiro
2. Clique no ícone de reconexão

## 📚 Mais Informações

- [Supabase MCP Documentation](https://github.com/supabase-community/mcp-server-supabase)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**Configurado em**: 13/08/2026  
**Status**: ✅ Ativo
