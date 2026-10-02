/**
 * Utilitários para formatação de combos
 */

import { MessageSquare } from "lucide-react"

/**
 * Renderiza os detalhes de um item de combo de forma organizada
 * @param item - Item do pedido
 * @returns JSX com os detalhes formatados ou null se não for combo
 */
export const renderizarDetalhesCombo = (item: any) => {
  // Verificar se é um combo
  const isCombo = item.produto.categoria === 'combo' || item.isCombo || item.produtosCombo

  if (!isCombo) {
    return null
  }

  // Se tem produtosCombo (estrutura de comandas/PDV)
  if (item.produtosCombo && Array.isArray(item.produtosCombo)) {
    return (
      <div className="text-sm text-muted-foreground space-y-2 mt-2">
        {item.produtosCombo.map((produtoCombo: any, idx: number) => (
          <div key={idx} className="ml-2 border-l-2 border-input pl-3">
            <div className="font-medium text-foreground/80">
              {idx + 1}° item: {produtoCombo.nome}
            </div>
            {produtoCombo.tamanhoSelecionado && (
              <div className="text-xs">
                • Tamanho: {produtoCombo.tamanhoSelecionado.nome} ({produtoCombo.tamanhoSelecionado.tamanho})
              </div>
            )}
            {produtoCombo.saboresSelecionados && produtoCombo.saboresSelecionados.length > 0 && (
              <div className="text-xs">
                • Sabor{produtoCombo.saboresSelecionados.length > 1 ? 'es' : ''}: {produtoCombo.saboresSelecionados.map((s: any) => s.nome).join(', ')}
              </div>
            )}
            {produtoCombo.bordaSelecionada && (
              <div className="text-xs">
                • Borda: {produtoCombo.bordaSelecionada.nome}
              </div>
            )}
          </div>
        ))}
        {item.observacoes && (
          <p className="text-xs text-foreground/80 italic ml-2 mt-2 bg-warning/10 p-2 rounded border border-warning/30">
            <MessageSquare className="inline h-3 w-3 mr-1" />
            <span className="font-medium">Obs:</span> {item.observacoes}
          </p>
        )}
      </div>
    )
  }

  // Se não tem produtosCombo mas tem as seleções diretas (estrutura antiga)
  // Neste caso, mostrar as informações disponíveis
  return null
}

/**
 * Renderiza os detalhes de um item de combo para impressão (texto simples)
 * @param item - Item do pedido
 * @returns String com os detalhes formatados ou string vazia se não for combo
 */
export const renderizarDetalhesComboTexto = (item: any): string => {
  // Verificar se é um combo
  const isCombo = item.produto.categoria === 'combo' || item.isCombo || item.produtosCombo

  if (!isCombo) {
    return ''
  }

  // Se tem produtosCombo
  if (item.produtosCombo && Array.isArray(item.produtosCombo)) {
    let texto = item.produtosCombo.map((produtoCombo: any, idx: number) => {
      let textoItem = `\n  ${idx + 1}° item: ${produtoCombo.nome}`
      
      if (produtoCombo.tamanhoSelecionado) {
        textoItem += `\n    • Tamanho: ${produtoCombo.tamanhoSelecionado.nome} (${produtoCombo.tamanhoSelecionado.tamanho})`
      }
      
      if (produtoCombo.saboresSelecionados && produtoCombo.saboresSelecionados.length > 0) {
        textoItem += `\n    • Sabor${produtoCombo.saboresSelecionados.length > 1 ? 'es' : ''}: ${produtoCombo.saboresSelecionados.map((s: any) => s.nome).join(', ')}`
      }
      
      if (produtoCombo.bordaSelecionada) {
        textoItem += `\n    • Borda: ${produtoCombo.bordaSelecionada.nome}`
      }
      
      return textoItem
    }).join('')
    
    // Adicionar observações do combo se houver
    if (item.observacoes) {
      texto += `\n  Obs: ${item.observacoes}`
    }
    
    return texto
  }

  return ''
}

/**
 * Renderiza os detalhes de um item de combo para HTML de impressão
 * @param item - Item do pedido
 * @returns String HTML com os detalhes formatados ou string vazia se não for combo
 */
export const renderizarDetalhesComboHTML = (item: any): string => {
  // Verificar se é um combo
  const isCombo = item.produto.categoria === 'combo' || item.isCombo || item.produtosCombo

  if (!isCombo) {
    return ''
  }

  // Se tem produtosCombo
  if (item.produtosCombo && Array.isArray(item.produtosCombo)) {
    let html = item.produtosCombo.map((produtoCombo: any, idx: number) => {
      let htmlItem = `<div class="item-sub" style="margin-left: 4mm; margin-top: 2px;"><strong>${idx + 1}° item: ${produtoCombo.nome}</strong></div>`
      
      if (produtoCombo.tamanhoSelecionado) {
        htmlItem += `<div class="item-sub" style="margin-left: 6mm;">• Tamanho: ${produtoCombo.tamanhoSelecionado.nome} (${produtoCombo.tamanhoSelecionado.tamanho})</div>`
      }
      
      if (produtoCombo.saboresSelecionados && produtoCombo.saboresSelecionados.length > 0) {
        htmlItem += `<div class="item-sub" style="margin-left: 6mm;">• Sabor${produtoCombo.saboresSelecionados.length > 1 ? 'es' : ''}: ${produtoCombo.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>`
      }
      
      if (produtoCombo.bordaSelecionada) {
        htmlItem += `<div class="item-sub" style="margin-left: 6mm;">• Borda: ${produtoCombo.bordaSelecionada.nome}</div>`
      }
      
      return htmlItem
    }).join('')
    
    // Adicionar observações do combo se houver
    if (item.observacoes) {
      html += `<div class="item-sub" style="margin-left: 4mm; margin-top: 2px; font-style: italic;">Obs: ${item.observacoes}</div>`
    }
    
    return html
  }

  return ''
}
