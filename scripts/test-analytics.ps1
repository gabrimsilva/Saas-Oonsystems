# Script para testar a integração do Google Analytics 4 (Windows PowerShell)
# Uso: .\scripts\test-analytics.ps1

Write-Host "🧪 Testando integração do Google Analytics 4..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o Supabase CLI está instalado
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI não encontrado" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se os secrets estão configurados
Write-Host "🔐 Verificando secrets..." -ForegroundColor Cyan
Write-Host ""

# Listar secrets (não mostra valores por segurança)
supabase secrets list

Write-Host ""
Write-Host "📝 Secrets necessários:" -ForegroundColor Yellow
Write-Host "   - GA4_PROPERTY_ID"
Write-Host "   - GA4_SERVICE_ACCOUNT_EMAIL"
Write-Host "   - GA4_PRIVATE_KEY"
Write-Host ""

# Perguntar se quer fazer deploy
$deploy = Read-Host "Fazer deploy da Edge Function? (s/n)"

if ($deploy -eq "s" -or $deploy -eq "S") {
    Write-Host "🚀 Fazendo deploy da Edge Function..." -ForegroundColor Cyan
    supabase functions deploy get-analytics-data
    Write-Host ""
}

# Perguntar se quer testar
$test = Read-Host "Testar a Edge Function? (s/n)"

if ($test -eq "s" -or $test -eq "S") {
    Write-Host "🧪 Testando Edge Function..." -ForegroundColor Cyan
    Write-Host ""
    
    # Pegar informações do projeto
    $projectInfo = supabase projects list --format json | ConvertFrom-Json
    
    if (-not $projectInfo -or $projectInfo.Count -eq 0) {
        Write-Host "❌ Não foi possível obter informações do projeto" -ForegroundColor Red
        Write-Host "   Execute: supabase link --project-ref SEU_PROJECT_REF" -ForegroundColor Yellow
        exit 1
    }
    
    $projectRef = $projectInfo[0].id
    Write-Host "📍 Project Ref: $projectRef" -ForegroundColor Green
    Write-Host ""
    
    # Obter anon key
    $statusOutput = supabase status
    $anonKey = ($statusOutput | Select-String "anon key").ToString().Split(":")[1].Trim()
    
    # Fazer requisição de teste
    Write-Host "📤 Enviando requisição de teste..." -ForegroundColor Cyan
    Write-Host ""
    
    $body = @{
        periodo = "7dias"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod `
            -Uri "https://$projectRef.supabase.co/functions/v1/get-analytics-data" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $anonKey"
                "Content-Type" = "application/json"
            } `
            -Body $body
        
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Erro ao fazer requisição:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Para mais informações, consulte:" -ForegroundColor Yellow
Write-Host "   - GOOGLE-ANALYTICS-INTEGRACAO.md (guia completo)"
Write-Host "   - supabase/functions/get-analytics-data/README.md"
Write-Host "   - supabase/functions/get-analytics-data/README.md (documentação da função)"
