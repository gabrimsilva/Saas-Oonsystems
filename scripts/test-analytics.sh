#!/bin/bash

# Script para testar a integração do Google Analytics 4
# Uso: ./scripts/test-analytics.sh

echo "🧪 Testando integração do Google Analytics 4..."
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado"
    echo "   Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se os secrets estão configurados
echo "🔐 Verificando secrets..."
echo ""

# Listar secrets (não mostra valores por segurança)
supabase secrets list

echo ""
echo "📝 Secrets necessários:"
echo "   - GA4_PROPERTY_ID"
echo "   - GA4_SERVICE_ACCOUNT_EMAIL"
echo "   - GA4_PRIVATE_KEY"
echo ""

# Perguntar se quer fazer deploy
read -p "Fazer deploy da Edge Function? (s/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🚀 Fazendo deploy da Edge Function..."
    supabase functions deploy get-analytics-data
    echo ""
fi

# Perguntar se quer testar
read -p "Testar a Edge Function? (s/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🧪 Testando Edge Function..."
    echo ""
    
    # Pegar URL do projeto
    PROJECT_REF=$(supabase projects list --format json | jq -r '.[0].id')
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Não foi possível obter o Project Ref"
        echo "   Execute: supabase link --project-ref SEU_PROJECT_REF"
        exit 1
    fi
    
    echo "📍 Project Ref: $PROJECT_REF"
    echo ""
    
    # Fazer requisição de teste
    echo "📤 Enviando requisição de teste..."
    echo ""
    
    curl -X POST \
      "https://${PROJECT_REF}.supabase.co/functions/v1/get-analytics-data" \
      -H "Authorization: Bearer $(supabase status | grep 'anon key' | awk '{print $3}')" \
      -H "Content-Type: application/json" \
      -d '{"periodo":"7dias"}' \
      | jq '.'
    
    echo ""
fi

echo ""
echo "✅ Teste concluído!"
echo ""
echo "📚 Para mais informações, consulte:"
echo "   - GOOGLE-ANALYTICS-INTEGRACAO.md (guia completo)"
echo "   - supabase/functions/get-analytics-data/README.md"
echo "   - supabase/functions/get-analytics-data/README.md (documentação da função)"
