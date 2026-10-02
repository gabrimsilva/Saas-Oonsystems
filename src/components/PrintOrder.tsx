import { useState, useEffect } from "react"
import { type PedidoSupabase } from "@/services"
import { useConfiguracoesLoja } from "@/hooks/useConfiguracoesLoja"
import { qzTrayService } from "@/lib/qzTrayService"
import { configuracaoService } from "@/services"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { renderizarDetalhesComboHTML } from "@/utils/comboFormatacao"
import { calcularDescontoEmReais } from "@/utils/descontoCalculation"

interface PrintOrderProps {
  pedido: PedidoSupabase
  compact?: boolean
}

export default function PrintOrder({ pedido, compact = false }: PrintOrderProps) {
  const { configuracoes } = useConfiguracoesLoja()
  const [impressoraPadrao, setImpressoraPadrao] = useState<string>('')
  const [usarQZTray, setUsarQZTray] = useState(false)
  const [densidadeImpressao, setDensidadeImpressao] = useState(3)
  const [fontSizes, setFontSizes] = useState({
    base: 11,
    storeName: 16,
    sectionTitle: 11,
    itemSub: 10,
    totals: 12,
    totalFinal: 14
  })

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const [configImpressora, configUsarQZ, configDensidade,
               fontBase, fontStoreName, fontSectionTitle, fontItemSub, fontTotals, fontTotalFinal] = await Promise.all([
          configuracaoService.buscarPorChave('impressora_padrao'),
          configuracaoService.buscarPorChave('usar_qz_tray'),
          configuracaoService.buscarPorChave('densidade_impressao'),
          configuracaoService.buscarPorChave('font_size_base'),
          configuracaoService.buscarPorChave('font_size_store_name'),
          configuracaoService.buscarPorChave('font_size_section_title'),
          configuracaoService.buscarPorChave('font_size_item_sub'),
          configuracaoService.buscarPorChave('font_size_totals'),
          configuracaoService.buscarPorChave('font_size_total_final')
        ])
        
        if (configImpressora?.valor) {
          setImpressoraPadrao(configImpressora.valor)
        }
        
        setUsarQZTray(configUsarQZ?.valor === 'true')
        setDensidadeImpressao(parseInt(configDensidade?.valor || '3'))
        
        setFontSizes({
          base: parseInt(fontBase?.valor || '11'),
          storeName: parseInt(fontStoreName?.valor || '16'),
          sectionTitle: parseInt(fontSectionTitle?.valor || '11'),
          itemSub: parseInt(fontItemSub?.valor || '10'),
          totals: parseInt(fontTotals?.valor || '12'),
          totalFinal: parseInt(fontTotalFinal?.valor || '14')
        })
      } catch (error) {
        // Erro ao carregar configurações de impressão
      }
    }

    carregarConfiguracoes()
  }, [])

  const formatarHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatarFormaPagamento = (forma: string) => {
    const formas: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'cartaoCredito': 'Cartão de Crédito',
      'cartaoDebito': 'Cartão de Débito',
      'pix': 'PIX',
      'pixEntrega': 'PIX na Entrega',
      'pix_entrega': 'PIX na Entrega',
      'cartaoVR': 'Cartão VR',
      'cartao_vr': 'Cartão VR',
      'cartaoVA': 'Cartão VA',
      'cartao_va': 'Cartão VA',
      'ticketPromo': 'Ticket Promocional',
      'ticket_promo': 'Ticket Promocional'
    }
    return formas[forma] || forma
  }

  const obterStatusPagamento = () => {
    if (pedido.forma_pagamento === 'pix' && pedido.mercado_pago_status === 'approved') {
      return 'Pedido pago com sucesso!'
    }
    return 'Pedido há pagar'
  }

  const obterDataAprovacao = () => {
    if (pedido.forma_pagamento === 'pix' && pedido.mercado_pago_date_approved) {
      return formatarHora(pedido.mercado_pago_date_approved)
    }
    return null
  }

  const calcularPrecoItem = (item: any): number => {
    let precoItem = item.produto.preco
    
    // Para combos, o preço já está correto em item.produto.preco (preco_combo)
    // Não deve ser sobrescrito pelo tamanho selecionado (que é da bebida do combo)
    if (item.produto.categoria === 'combo') {
      return precoItem * item.quantidade
    }
    
    // Para outros produtos, usar tamanho se disponível
    if (item.tamanhoSelecionado?.valor) precoItem = item.tamanhoSelecionado.valor
    if (item.bordaSelecionada?.valor) precoItem += item.bordaSelecionada.valor
    if (item.adicionaisSelecionados?.length > 0) {
      precoItem += item.adicionaisSelecionados.reduce((sum: number, a: any) => sum + (a.valor * a.quantidade), 0)
    }
    return precoItem * item.quantidade
  }

  const gerarItensHTML = () => {
    return pedido.itens.map((item: any) => {
      const precoTotal = calcularPrecoItem(item).toFixed(2).replace('.', ',')
      const categoria = item.produto?.categoria_nome || item.produto?.categoria || ''
      
      let html = `
    <div class="item">
      <div class="item-head">
        <div class="qty-name">${item.quantidade}x ${item.produto.nome}</div>
        <div class="price">R$ ${precoTotal}</div>
      </div>`
      
      // Renderizar detalhes do combo se for um combo
      const detalhesCombo = renderizarDetalhesComboHTML(item)
      if (detalhesCombo) {
        html += detalhesCombo
      } else {
        // Renderizar detalhes normais se não for combo
        if (categoria) {
          html += `<div class="item-sub"><strong>Categoria:</strong> ${categoria}</div>`
        }
        if (item.tamanhoSelecionado) {
          html += `<div class="item-sub"><strong>Tamanho:</strong> ${item.tamanhoSelecionado.nome} (${item.tamanhoSelecionado.tamanho})</div>`
        }
        if (item.saboresSelecionados && item.saboresSelecionados.length > 0) {
          html += `<div class="item-sub"><strong>Sabores:</strong> ${item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>`
        }
        if (item.bordaSelecionada) {
          html += `<div class="item-sub"><strong>Borda:</strong> ${item.bordaSelecionada.nome}</div>`
        }
        if (item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0) {
          html += `<div class="item-sub"><strong>Adicionais:</strong> ${item.adicionaisSelecionados.map((a: any) => `${a.quantidade}x ${a.nome} (+R$ ${(a.valor * a.quantidade).toFixed(2).replace('.', ',')})`).join(', ')}</div>`
        }
        if (item.observacoes) {
          html += `<div class="item-sub"><strong>Obs:</strong> ${item.observacoes}</div>`
        }
      }
      
      html += `</div>`
      return html
    }).join('')
  }

  const idCurto = pedido.codigo_pedido || pedido.pedido_id.split('-').pop()?.slice(-4) || pedido.pedido_id.slice(-4)

  const imprimirComQZTray = async (): Promise<boolean> => {
    try {
      const fontWeight = 200 + (densidadeImpressao * 100)
      const itensHTML = gerarItensHTML()
      
      // Calcular desconto se houver
      const temDesconto = pedido.desconto > 0
      const descontoCalculado = temDesconto 
        ? calcularDescontoEmReais(pedido.desconto, pedido.tipo_desconto, pedido.subtotal)
        : 0
      const subtotalComDesconto = temDesconto 
        ? pedido.subtotal - descontoCalculado
        : pedido.subtotal
      
      const htmlThermal = `
<html>
<head>
  <style>
    @page { size: 70mm auto; margin: 0; }
    @media print { body { margin: 0; -webkit-print-color-adjust: exact; } }
    body { width: 70mm; font-family: "Courier New", Courier, monospace; font-size: ${fontSizes.base}px; color: #000; line-height: 1.2; word-break: break-word; padding: 2mm; margin: 0; font-weight: ${fontWeight}; }
    .header { text-align: center; margin-bottom: 6px; }
    .store-name { font-size: ${fontSizes.storeName}px; font-weight: ${Math.min(fontWeight + 200, 900)}; letter-spacing: 1px; }
    .store-address, .store-contact { font-size: ${fontSizes.itemSub}px; }
    .section-title { font-weight: ${Math.min(fontWeight + 200, 900)}; font-size: ${fontSizes.sectionTitle}px; margin-top: 6px; margin-bottom: 4px; }
    .divider { border-top: 2px solid #000; margin: 6px 0; }
    .info-block { font-size: ${fontSizes.base}px; }
    .info-row { margin-bottom: 2px; }
    .items { margin-top: 4px; }
    .item { display: block; margin-bottom: 4px; width: 100%; }
    .item-head { display:flex; justify-content:space-between; align-items: flex-start; }
    .qty-name { flex: 1; max-width: 58%; white-space: normal; padding-right: 1mm; }
    .price { text-align: right; white-space: nowrap; min-width: 32%; }
    .item-sub { font-size: ${fontSizes.itemSub}px; margin-left: 2mm; margin-top: 2px; }
    .totals { margin-top: 6px; font-size: ${fontSizes.totals}px; }
    .totals .line { display:flex; justify-content:space-between; align-items: flex-start; margin-bottom:2px; }
    .totals .line > div:first-child { flex: 1; max-width: 58%; padding-right: 1mm; }
    .totals .line > div:last-child { white-space: nowrap; text-align: right; min-width: 32%; }
    .totals .total { font-weight: ${Math.min(fontWeight + 200, 900)}; font-size:${fontSizes.totalFinal}px; }
    .footer { text-align:center; margin-top:8px; font-size:${fontSizes.itemSub}px; }
    .order-id { font-size: ${fontSizes.totalFinal}px; font-weight: ${Math.min(fontWeight + 200, 900)}; text-align:center; margin:6px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${configuracoes.nome}</div>
    <div class="store-address">${configuracoes.endereco}</div>
    <div class="store-contact">Tel: ${configuracoes.telefone}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="order-id">Detalhes do Pedido #${idCurto}</div>
  
  <div class="info-block">
    <div class="section-title">Dados Pessoais</div>
    <div class="info-row"><strong>Nome:</strong> ${pedido.cliente_nome} ${pedido.cliente_sobrenome}</div>
    <div class="info-row"><strong>Telefone:</strong> ${pedido.cliente_telefone}</div>
    
    <div class="section-title">Dados de Entrega</div>
    <div class="info-row"><strong>Tipo:</strong> ${pedido.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}</div>
    ${pedido.entrega_domicilio && pedido.cliente_endereco ? `
    <div class="info-row"><strong>Endereço:</strong> ${pedido.cliente_endereco}, ${pedido.cliente_numero}</div>
    ${pedido.cliente_complemento ? `<div class="info-row"><strong>Complemento:</strong> ${pedido.cliente_complemento}</div>` : ''}
    ${pedido.cliente_bairro ? `<div class="info-row"><strong>Bairro:</strong> ${pedido.cliente_bairro}</div>` : ''}
    ${pedido.cliente_cidade ? `<div class="info-row"><strong>Cidade:</strong> ${pedido.cliente_cidade} - ${pedido.cliente_estado}</div>` : ''}
    ${pedido.cliente_cep ? `<div class="info-row"><strong>CEP:</strong> ${pedido.cliente_cep}</div>` : ''}
    ` : ''}
    
    <div class="section-title">Dados do Pedido</div>
    <div class="info-row"><strong>Data/Hora:</strong> ${formatarHora(pedido.criado_em)}</div>
    ${pedido.forma_pagamento_dividido ? `
    <div class="info-row"><strong>Forma de Pagamento:</strong> Pagamento Dividido</div>
    <div class="info-row" style="margin-left: 4mm;">- ${formatarFormaPagamento(pedido.pagamento_1_tipo || '')}: R$ ${(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}</div>
    <div class="info-row" style="margin-left: 4mm;">- ${formatarFormaPagamento(pedido.pagamento_2_tipo || '')}: R$ ${(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}</div>
    ` : `<div class="info-row"><strong>Forma de Pagamento:</strong> ${formatarFormaPagamento(pedido.forma_pagamento)}</div>`}
    ${pedido.forma_pagamento === 'pix' && pedido.mercado_pago_date_approved ? `<div class="info-row"><strong>Aprovado em:</strong> ${obterDataAprovacao()}</div>` : ''}
    <div class="info-row"><strong>Status:</strong> ${obterStatusPagamento()}</div>
    ${pedido.precisa_troco && pedido.valor_troco ? `<div class="info-row"><strong>Troco para:</strong> R$ ${pedido.valor_troco.toFixed(2).replace('.', ',')}</div>` : ''}
    ${pedido.observacoes && !pedido.observacoes.includes('Pedido criado via PDV') ? `<div class="info-row"><strong>Observações:</strong> ${pedido.observacoes}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="section-title">Itens</div>
  <div class="items">
    ${itensHTML}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="line">
      <div>Subtotal:</div>
      <div>R$ ${pedido.subtotal.toFixed(2).replace('.', ',')}</div>
    </div>
    ${temDesconto ? `
    <div class="line">
      <div>Desconto (${pedido.tipo_desconto === 'percentual' ? `${pedido.desconto}%` : ''}):</div>
      <div>-R$ ${descontoCalculado.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="divider"></div>
    <div class="line">
      <div>Subtotal c/ desc:</div>
      <div>R$ ${subtotalComDesconto.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    ${pedido.taxa_entrega > 0 ? `
    <div class="line">
      <div>Taxa de entrega:</div>
      <div>R$ ${pedido.taxa_entrega.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    ${(pedido as any).taxa_extra_km > 0 ? `
    <div class="line">
      <div>Taxa extra (dist.):</div>
      <div>R$ ${(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    <div class="line total">
      <div>Total:</div>
      <div>R$ ${pedido.total.toFixed(2).replace('.', ',')}</div>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="footer" style="text-align: center; color: #000; padding: 6px; margin: 6px 0; font-weight: bold;">
    Deus abençoe!
  </div>
  
  <div class="divider"></div>
</body>
</html>
      `

      const sucesso = await qzTrayService.printHTML(impressoraPadrao, htmlThermal)
      return sucesso
    } catch (error) {
      console.error('Erro ao imprimir com QZ Tray:', error)
      return false
    }
  }


  const handlePrint = async () => {
    if (usarQZTray && impressoraPadrao) {
      try {
        const sucesso = await imprimirComQZTray()
        if (sucesso) {
          return
        }
      } catch (error) {
        console.error('Erro ao imprimir com QZ Tray:', error)
      }
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const fontWeight = 200 + (densidadeImpressao * 100)
    const itensHTML = gerarItensHTML()
    
    // Calcular desconto se houver
    const temDesconto = pedido.desconto > 0
    const descontoCalculado = temDesconto 
      ? calcularDescontoEmReais(pedido.desconto, pedido.tipo_desconto, pedido.subtotal)
      : 0
    const subtotalComDesconto = temDesconto 
      ? pedido.subtotal - descontoCalculado
      : pedido.subtotal

    const printContent = `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=70mm, initial-scale=1.0" />
  <title>Pedido #${idCurto}</title>
  <style>
    @page { size: 70mm auto; margin: 0; }
    @media print { body { margin: 0; -webkit-print-color-adjust: exact; } }
    body { width: 70mm; font-family: "Courier New", Courier, monospace; font-size: ${fontSizes.base}px; color: #000; line-height: 1.2; word-break: break-word; padding: 2mm; margin: 0; font-weight: ${fontWeight}; }
    .header { text-align: center; margin-bottom: 6px; }
    .store-name { font-size: ${fontSizes.storeName}px; font-weight: ${Math.min(fontWeight + 200, 900)}; letter-spacing: 1px; }
    .store-address, .store-contact { font-size: ${fontSizes.itemSub}px; }
    .section-title { font-weight: ${Math.min(fontWeight + 200, 900)}; font-size: ${fontSizes.sectionTitle}px; margin-top: 6px; margin-bottom: 4px; }
    .divider { border-top: 2px solid #000; margin: 6px 0; }
    .info-block { font-size: ${fontSizes.base}px; }
    .info-row { margin-bottom: 2px; }
    .items { margin-top: 4px; }
    .item { display: block; margin-bottom: 4px; width: 100%; }
    .item-head { display:flex; justify-content:space-between; align-items: flex-start; }
    .qty-name { flex: 1; max-width: 58%; white-space: normal; padding-right: 1mm; }
    .price { text-align: right; white-space: nowrap; min-width: 32%; }
    .item-sub { font-size: ${fontSizes.itemSub}px; margin-left: 2mm; margin-top: 2px; }
    .totals { margin-top: 6px; font-size: ${fontSizes.totals}px; }
    .totals .line { display:flex; justify-content:space-between; align-items: flex-start; margin-bottom:2px; }
    .totals .line > div:first-child { flex: 1; max-width: 58%; padding-right: 1mm; }
    .totals .line > div:last-child { white-space: nowrap; text-align: right; min-width: 32%; }
    .totals .total { font-weight: ${Math.min(fontWeight + 200, 900)}; font-size:${fontSizes.totalFinal}px; }
    .footer { text-align:center; margin-top:8px; font-size:${fontSizes.itemSub}px; }
    .order-id { font-size: ${fontSizes.totalFinal}px; font-weight: ${Math.min(fontWeight + 200, 900)}; text-align:center; margin:6px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${configuracoes.nome}</div>
    <div class="store-address">${configuracoes.endereco}</div>
    <div class="store-contact">Tel: ${configuracoes.telefone}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="order-id">Detalhes do Pedido #${idCurto}</div>
  
  <div class="info-block">
    <div class="section-title">Dados Pessoais</div>
    <div class="info-row"><strong>Nome:</strong> ${pedido.cliente_nome} ${pedido.cliente_sobrenome}</div>
    <div class="info-row"><strong>Telefone:</strong> ${pedido.cliente_telefone}</div>
    
    <div class="section-title">Dados de Entrega</div>
    <div class="info-row"><strong>Tipo:</strong> ${pedido.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}</div>
    ${pedido.entrega_domicilio && pedido.cliente_endereco ? `
    <div class="info-row"><strong>Endereço:</strong> ${pedido.cliente_endereco}, ${pedido.cliente_numero}</div>
    ${pedido.cliente_complemento ? `<div class="info-row"><strong>Complemento:</strong> ${pedido.cliente_complemento}</div>` : ''}
    ${pedido.cliente_bairro ? `<div class="info-row"><strong>Bairro:</strong> ${pedido.cliente_bairro}</div>` : ''}
    ${pedido.cliente_cidade ? `<div class="info-row"><strong>Cidade:</strong> ${pedido.cliente_cidade} - ${pedido.cliente_estado}</div>` : ''}
    ${pedido.cliente_cep ? `<div class="info-row"><strong>CEP:</strong> ${pedido.cliente_cep}</div>` : ''}
    ` : ''}
    
    <div class="section-title">Dados do Pedido</div>
    <div class="info-row"><strong>Data/Hora:</strong> ${formatarHora(pedido.criado_em)}</div>
    ${pedido.forma_pagamento_dividido ? `
    <div class="info-row"><strong>Forma de Pagamento:</strong> Pagamento Dividido</div>
    <div class="info-row" style="margin-left: 4mm;">- ${formatarFormaPagamento(pedido.pagamento_1_tipo || '')}: R$ ${(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}</div>
    <div class="info-row" style="margin-left: 4mm;">- ${formatarFormaPagamento(pedido.pagamento_2_tipo || '')}: R$ ${(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}</div>
    ` : `<div class="info-row"><strong>Forma de Pagamento:</strong> ${formatarFormaPagamento(pedido.forma_pagamento)}</div>`}
    ${pedido.forma_pagamento === 'pix' && pedido.mercado_pago_date_approved ? `<div class="info-row"><strong>Aprovado em:</strong> ${obterDataAprovacao()}</div>` : ''}
    <div class="info-row"><strong>Status:</strong> ${obterStatusPagamento()}</div>
    ${pedido.precisa_troco && pedido.valor_troco ? `<div class="info-row"><strong>Troco para:</strong> R$ ${pedido.valor_troco.toFixed(2).replace('.', ',')}</div>` : ''}
    ${pedido.observacoes && !pedido.observacoes.includes('Pedido criado via PDV') ? `<div class="info-row"><strong>Observações:</strong> ${pedido.observacoes}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="section-title">Itens</div>
  <div class="items">
    ${itensHTML}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="line">
      <div>Subtotal:</div>
      <div>R$ ${pedido.subtotal.toFixed(2).replace('.', ',')}</div>
    </div>
    ${temDesconto ? `
    <div class="line">
      <div>Desconto (${pedido.tipo_desconto === 'percentual' ? `${pedido.desconto}%` : ''}):</div>
      <div>-R$ ${descontoCalculado.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="divider"></div>
    <div class="line">
      <div>Subtotal c/ desc:</div>
      <div>R$ ${subtotalComDesconto.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    ${pedido.taxa_entrega > 0 ? `
    <div class="line">
      <div>Taxa de entrega:</div>
      <div>R$ ${pedido.taxa_entrega.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    ${(pedido as any).taxa_extra_km > 0 ? `
    <div class="line">
      <div>Taxa extra (dist.):</div>
      <div>R$ ${(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    <div class="line total">
      <div>Total:</div>
      <div>R$ ${pedido.total.toFixed(2).replace('.', ',')}</div>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="footer" style="text-align: center; color: #000; padding: 6px; margin: 6px 0; font-weight: bold;">
    Deus abençoe!
  </div>
  
  <div class="divider"></div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={`text-primary hover:text-primary-hover hover:bg-primary/5 ${compact ? 'h-6 px-2' : 'h-9'}`}
    >
      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      {!compact && <span className="ml-1 sm:ml-1.5 text-xs">Imprimir</span>}
    </Button>
  )
}
