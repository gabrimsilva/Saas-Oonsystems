# Instruções de Deploy para Hostinger

## 📦 Build Gerado

**Data:** 4 de Agosto de 2026  
**Versão:** v1.0.1 (com Bug Fix de duplicação de estoque)  
**Tamanho Total:** 6.74 MB  
**Arquivos:** 154 arquivos  
**Tempo de Build:** 27.55s  

### ✅ Status do Build
- TypeScript compilation: ✓ OK
- Vite build: ✓ OK
- 4012 modules transformados
- Todos os assets otimizados e minificados

---

## 📂 Estrutura da Pasta `dist/`

```
dist/
├── assets/                          # Bundles JavaScript + CSS
│   ├── index-*.js                   # Bundle principal (710 kB gzip)
│   ├── Metricas-*.js               # Página de métricas (867 kB gzip)
│   ├── Analytics-*.js              # Página de analytics (304 kB gzip)
│   ├── *.js                        # 128 outros bundles JS
│   └── *.css                       # CSS minificado
├── img/                            # Imagens comprimidas
├── patterns/                       # Padrões/texturas
├── sounds/                         # Efeitos sonoros
├── index.html                      # Página principal (3.7 kB)
├── favicon.ico                     # Ícone do navegador
└── .htaccess                       # Configurações Apache (SE APLICÁVEL)
```

---

## 🚀 Instruções de Upload via FTP (Hostinger)

### 1. **Conectar ao FTP**

#### Opção A: FileZilla (Desktop)
```
Host: seu-dominio.com (ou FTP host da Hostinger)
Username: seu_usuario_ftp
Password: sua_senha_ftp
Port: 21 (ou 22 para SFTP)
```

#### Opção B: Hostinger cPanel
- Acessar cPanel
- File Manager
- Navegar até `public_html/` ou pasta do projeto

### 2. **Backup do Deployment Anterior** (IMPORTANTE!)

**Antes de fazer upload, faça backup:**

```bash
# Na pasta raiz do site (public_html)
# Renomear pasta dist antiga:
dist → dist_backup_2026_08_04
```

---

## 3. **Upload dos Arquivos**

### ✅ Método 1: Substituir toda a pasta `dist/`

1. **Deletar** a pasta `dist` atual no servidor
2. **Upload** da pasta `dist` local (inteira) para o servidor

**Passos no FileZilla:**
```
1. Painel esquerdo: Navegar para c:\Users\gmsilva\Desktop\SISTEMAS\_RODANDO\casa_do_pai\dist
2. Painel direito: Conectar ao servidor em public_html/
3. Drag & Drop: Copiar TODA a pasta dist para public_html/dist
4. Aguardar finalização (154 arquivos)
5. Verificar no navegador: https://seu-dominio.com/sistema
```

### ✅ Método 2: Sync (Mais Seguro)

Se seu cliente FTP suporta, usar "Sincronização":
- Atualiza apenas arquivos modificados
- Mais rápido
- Menos risco de interrupção

---

## 4. **Verificações Pós-Deploy**

### Checklist de Validação

- [ ] **URL da aplicação abre** 
  - Acesse: `https://casadopai.oonsystems.com.br/sistema`
  - Deve carregar sem erros 404

- [ ] **Console do navegador limpo**
  - F12 → Console
  - Não deve ter erros em vermelho
  - Warnings são OK

- [ ] **Bug Fix verificado**
  - Editar um produto
  - Marcar "Controlar Estoque"
  - Salvar
  - Desmarcar "Controlar Estoque"
  - Salvar
  - ✓ Nenhum erro deve ocorrer
  - ✓ Nenhuma duplicação de estoque

- [ ] **Assets carregando**
  - Network tab (F12)
  - CSS, JS, imagens devem estar 200 OK
  - Gzip compression ativo (verifique)

- [ ] **Funcionalidades críticas**
  - [ ] Login funciona
  - [ ] Produtos carregam
  - [ ] PDV abre
  - [ ] Delivery page funciona
  - [ ] Métricas carregam (podem ser lentas)

---

## 5. **Possíveis Problemas & Soluções**

### ❌ Problema: "404 Not Found" para arquivos estáticos

**Solução:**
Verificar arquivo `.htaccess` na raiz:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Arquivo já existe em** `dist/.htaccess` ✓

---

### ❌ Problema: Assets com status 304 (Not Modified)

**Normal!** Significa cache está funcionando corretamente.

---

### ❌ Problema: CSS/JS não aplicando (branco/quebrado)

**Soluções:**
1. **Hard refresh:** Ctrl+Shift+R (ou Cmd+Shift+R no Mac)
2. **Limpar cache do navegador**
3. **Verificar MIME types no servidor:**
   - `.js` → `application/javascript`
   - `.css` → `text/css`

---

### ❌ Problema: Erro "Tracking Prevention blocked access to storage"

**Normal com este browser em modo de rastreamento bloqueado.**

Isso NÃO impede funcionamento. É apenas aviso.

**Nosso Fix (nova versão):** Trata este erro com mais elegância ✓

---

## 6. **Performance**

### Tamanhos dos Assets (Gzip comprimido):

| Arquivo | Tamanho |
|---------|---------|
| index.js | 204 kB |
| Metricas.js | 249 kB |
| Analytics.js | 98 kB |
| CSS Principal | 20 kB |
| Outros (124 arquivos) | ~200 kB |

**Total comprimido:** ~1 MB (impressionante!)

### Dicas de Otimização:

1. **Gzip habilitado no servidor?**
   ```
   Em Hostinger cPanel:
   Home → Compressão → Ativar Gzip
   ```

2. **Lazy Loading ativo?**
   - Páginas carregam sob demanda
   - Ótimo para performance

3. **CDN (se disponível em Hostinger)?**
   - Pode acelerar 30-50% mais
   - Ativar em cPanel se disponível

---

## 7. **Rollback (Voltar versão anterior)**

Se algo der errado após deploy:

```bash
1. FTP → Deletar nova pasta dist
2. FTP → Renomear dist_backup_2026_08_04 → dist
3. Hard refresh (Ctrl+Shift+R)
4. Verificar funcionamento
```

---

## 8. **Log de Monitoramento**

Após 1 hora do deploy, verificar:

### Em Hostinger cPanel:
- **Error Logs:** `/public_html/error_log`
- **Access Logs:** `/public_html/access_log`

### No Navegador (F12 → Console):
```javascript
// Copiar e colar para verificar saúde da app
console.log('🚀 App version:', localStorage.getItem('app_version'))
console.log('📍 Estabelecimento ativo:', localStorage.getItem('estabelecimento_id'))
console.log('👤 Usuario logado:', !!localStorage.getItem('auth.session'))
```

---

## 9. **Informações Técnicas**

### Versão compilada com:
- React 19
- Vite 7.1.5
- TypeScript (strict mode)
- TailwindCSS v4
- Supabase JS Client

### Suporte a Browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar console (F12)**
2. **Hard refresh (Ctrl+Shift+R)**
3. **Limpar localStorage:**
   ```javascript
   localStorage.clear(); location.reload();
   ```
4. **Contato:** gmsilva@casadopai.com.br

---

## ✅ Checklist Final

- [ ] Build gerado em `dist/`
- [ ] Backup da versão anterior feito
- [ ] Arquivos uploaded via FTP
- [ ] Página principal abre sem erros
- [ ] Console limpo (sem erros em vermelho)
- [ ] Bug fix testado (estoque ativa/desativa)
- [ ] Funcionalidades críticas funcionando
- [ ] Performance aceitável

**Data do Deploy:** 4 de Agosto de 2026  
**Build ID:** 2026-08-04-11-07  
**Status:** ✅ PRONTO PARA PRODUÇÃO
