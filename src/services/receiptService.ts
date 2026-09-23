/**
 * Serviço para geração de cupom fiscal (recibo)
 * Suporta vendas PDV e pedidos delivery
 */

import { configuracaoService } from './configuracaoService'
import type { ReceiptData, ReceiptConfig } from '@/types/receipt'
import type { Sale } from './vendaService'

class ReceiptService {
  /**
   * Gera HTML do cupom fiscal para uma venda PDV
   */
  async generateSaleReceipt(sale: Sale): Promise<string> {
    // Buscar configurações da loja
    const [nomeLoja, enderecoLoja, telefoneLoja] = await Promise.all([
      configuracaoService.buscarPorChave('nome_loja'),
      configuracaoService.buscarPorChave('endereco'),
      configuracaoService.buscarPorChave('telefone')
    ])

    // Calcular desconto total somando descontos dos itens
    const descontoTotal = sale.items.reduce((acc, item) => {
      const desconto = item.desconto || 0
      const tipoDesconto = item.tipoDesconto || 'valor'
      
      if (desconto > 0) {
        if (tipoDesconto === 'percentual') {
          // Calcular desconto percentual
          const precoOriginal = item.precoUnitario * item.quantidade
          return acc + (precoOriginal * desconto) / 100
        } else {
          // Desconto em valor direto
          return acc + desconto
        }
      }
      return acc
    }, 0)

    // Calcular subtotal SEM desconto (preço original)
    const subtotalOriginal = sale.items.reduce((acc, item) => {
      const precoOriginal = item.precoOriginal || item.precoUnitario
      return acc + (precoOriginal * item.quantidade)
    }, 0)

    // Preparar dados do cupom
    const receiptData: ReceiptData = {
      tipo: 'SALE',
      numero: sale.sale_number,
      data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nomeLoja: nomeLoja?.valor || 'Sua Empresa',
      enderecoLoja: enderecoLoja?.valor,
      telefoneLoja: telefoneLoja?.valor,
      itens: this.mapSaleItems(sale.items),
      subtotal: subtotalOriginal, // Subtotal ANTES do desconto
      desconto: descontoTotal > 0 ? descontoTotal : undefined, // Desconto total
      total: sale.total_amount, // Total DEPOIS do desconto
      formaPagamento: this.formatPaymentMethod(sale.payment_method),
      precisaTroco: sale.needs_change,
      valorTroco: sale.change_amount,
      observacoes: sale.notes
    }

    return this.generateHTML(receiptData)
  }

  /**
   * Gera HTML do cupom fiscal para um pedido delivery
   */
  async generateOrderReceipt(order: any): Promise<string> {
    // Buscar configurações da loja
    const [nomeLoja, enderecoLoja, telefoneLoja] = await Promise.all([
      configuracaoService.buscarPorChave('nome_loja'),
      configuracaoService.buscarPorChave('endereco'),
      configuracaoService.buscarPorChave('telefone')
    ])

    // Preparar dados do cupom
    const receiptData: ReceiptData = {
      tipo: 'ORDER',
      numero: order.codigo_pedido || `#${order.pedido_id?.slice(-6)}`,
      data: new Date(order.created_at).toLocaleDateString('pt-BR'),
      hora: new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      nomeLoja: nomeLoja?.valor || 'Sua Empresa',
      enderecoLoja: enderecoLoja?.valor,
      telefoneLoja: telefoneLoja?.valor,
      clienteNome: `${order.cliente_nome || ''} ${order.cliente_sobrenome || ''}`.trim(),
      clienteTelefone: order.cliente_telefone,
      clienteEndereco: this.formatAddress(order),
      itens: this.mapOrderItems(order.itens),
      subtotal: order.subtotal || order.total,
      taxaEntrega: order.taxa_entrega,
      total: order.total,
      formaPagamento: this.formatPaymentMethod(order.forma_pagamento),
      precisaTroco: order.precisa_troco,
      valorTroco: order.valor_troco,
      observacoes: order.observacoes,
      status: order.status
    }

    return this.generateHTML(receiptData)
  }

  /**
   * Gera HTML do cupom com base nos dados fornecidos
   */
  private async generateHTML(data: ReceiptData): Promise<string> {
    // Buscar configurações de impressão
    const [fontBase, fontStoreName, fontSectionTitle, fontItemSub, fontTotals, fontTotalFinal, densidade] = await Promise.all([
      configuracaoService.buscarPorChave('font_size_base'),
      configuracaoService.buscarPorChave('font_size_store_name'),
      configuracaoService.buscarPorChave('font_size_section_title'),
      configuracaoService.buscarPorChave('font_size_item_sub'),
      configuracaoService.buscarPorChave('font_size_totals'),
      configuracaoService.buscarPorChave('font_size_total_final'),
      configuracaoService.buscarPorChave('densidade_impressao')
    ])

    const config: ReceiptConfig = {
      fontSizeBase: parseInt(fontBase?.valor || '10'),
      fontSizeStoreName: parseInt(fontStoreName?.valor || '16'),
      fontSizeSectionTitle: parseInt(fontSectionTitle?.valor || '12'),
      fontSizeItemSub: parseInt(fontItemSub?.valor || '9'),
      fontSizeTotals: parseInt(fontTotals?.valor || '11'),
      fontSizeTotalFinal: parseInt(fontTotalFinal?.valor || '14'),
      densidade: parseInt(densidade?.valor || '3'),
      paperWidth: 80 // mm
    }

    return this.buildHTMLTemplate(data, config)
  }

  /**
   * Constrói o template HTML do cupom
   */
  private buildHTMLTemplate(data: ReceiptData, config: ReceiptConfig): string {
    const isSale = data.tipo === 'SALE'
    const title = isSale ? 'CUPOM FISCAL' : 'PEDIDO DELIVERY'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${data.numero}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: ${config.fontSizeBase}px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    
    .receipt-container {
      max-width: ${config.paperWidth}mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px dashed #000;
    }
    
    .store-name {
      font-size: ${config.fontSizeStoreName}px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #000;
    }
    
    .store-info {
      font-size: ${config.fontSizeItemSub}px;
      margin: 2px 0;
    }
    
    .receipt-title {
      font-size: ${config.fontSizeSectionTitle}px;
      font-weight: bold;
      margin: 10px 0;
      text-align: center;
    }
    
    .receipt-number {
      font-size: ${config.fontSizeTotals}px;
      font-weight: bold;
      text-align: center;
      margin: 5px 0;
    }
    
    .datetime {
      text-align: center;
      font-size: ${config.fontSizeItemSub}px;
      margin: 5px 0;
    }
    
    .section {
      margin: 15px 0;
      padding: 10px 0;
      border-top: 1px dashed #000;
    }
    
    .section-title {
      font-size: ${config.fontSizeSectionTitle}px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #000;
    }
    
    .customer-info {
      font-size: ${config.fontSizeBase}px;
      margin: 3px 0;
    }
    
    .items {
      margin: 10px 0;
    }
    
    .item {
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px dotted #ccc;
    }
    
    .item-name {
      font-weight: bold;
      font-size: ${config.fontSizeBase}px;
    }
    
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: ${config.fontSizeItemSub}px;
      margin-top: 2px;
    }
    
    .item-obs {
      font-size: ${config.fontSizeItemSub}px;
      font-style: italic;
      color: #666;
      margin-top: 2px;
    }
    
    .totals {
      margin: 15px 0;
      padding: 10px 0;
      border-top: 2px solid #000;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: ${config.fontSizeTotals}px;
    }
    
    .total-final {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      font-size: ${config.fontSizeTotalFinal}px;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    
    .payment-info {
      margin: 10px 0;
      font-size: ${config.fontSizeBase}px;
    }
    
    .notes {
      margin: 10px 0;
      padding: 8px;
      background: #f5f5f5;
      border-left: 3px solid #000;
      font-size: ${config.fontSizeItemSub}px;
    }
    
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 2px dashed #000;
      font-size: ${config.fontSizeItemSub}px;
    }
    
    .thank-you {
      font-size: ${config.fontSizeSectionTitle}px;
      font-weight: bold;
      margin: 10px 0;
      color: #000;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .receipt-container {
        padding: 10px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <!-- Cabeçalho -->
  <div class="header">
    <div class="store-name">${data.nomeLoja}</div>
    ${data.enderecoLoja ? `<div class="store-info">${data.enderecoLoja}</div>` : ''}
    ${data.telefoneLoja ? `<div class="store-info">Tel: ${data.telefoneLoja}</div>` : ''}
  </div>
  
  <!-- Título e Número -->
  <div class="receipt-title">${title}</div>
  <div class="receipt-number">${data.numero}</div>
  <div class="datetime">${data.data} às ${data.hora}</div>
  
  ${!isSale && data.clienteNome ? `
  <!-- Informações do Cliente -->
  <div class="section">
    <div class="section-title">CLIENTE</div>
    <div class="customer-info"><strong>Nome:</strong> ${data.clienteNome}</div>
    ${data.clienteTelefone ? `<div class="customer-info"><strong>Telefone:</strong> ${data.clienteTelefone}</div>` : ''}
    ${data.clienteEndereco ? `<div class="customer-info"><strong>Endereço:</strong> ${data.clienteEndereco}</div>` : ''}
    ${data.status ? `<div class="customer-info"><strong>Status:</strong> ${data.status}</div>` : ''}
  </div>
  ` : ''}
  
  <!-- Itens -->
  <div class="section">
    <div class="section-title">ITENS</div>
    <div class="items">
      ${data.itens.map(item => `
        <div class="item">
          <div class="item-name">${item.nome}${item.desconto || ''}</div>
          <div class="item-details">
            <span>${item.quantidade}x R$ ${this.formatCurrency(item.precoUnitario)}</span>
            <span>R$ ${this.formatCurrency(item.precoTotal)}</span>
          </div>
          ${item.observacoes ? `<div class="item-obs">Obs: ${item.observacoes}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
  
  <!-- Totais -->
  <div class="totals">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>R$ ${this.formatCurrency(data.subtotal)}</span>
    </div>
    
    ${data.desconto ? `
    <div class="total-line">
      <span>Desconto:</span>
      <span>- R$ ${this.formatCurrency(data.desconto)}</span>
    </div>
    ` : ''}
    
    ${data.taxaEntrega ? `
    <div class="total-line">
      <span>Taxa de Entrega:</span>
      <span>R$ ${this.formatCurrency(data.taxaEntrega)}</span>
    </div>
    ` : ''}
    
    <div class="total-final">
      <span>TOTAL:</span>
      <span>R$ ${this.formatCurrency(data.total)}</span>
    </div>
  </div>
  
  <!-- Pagamento -->
  <div class="payment-info">
    <strong>Forma de Pagamento:</strong> ${data.formaPagamento}
    ${data.precisaTroco && data.valorTroco ? `
    <br><strong>Troco para:</strong> R$ ${this.formatCurrency(data.valorTroco)}
    <br><strong>Troco:</strong> R$ ${this.formatCurrency(data.valorTroco - data.total)}
    ` : ''}
  </div>
  
  ${data.observacoes ? `
  <!-- Observações -->
  <div class="notes">
    <strong>Observações:</strong><br>
    ${data.observacoes}
  </div>
  ` : ''}
  
  <!-- Rodapé -->
  <div class="footer">
    <div class="thank-you">Deus abençoe!</div>
  </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Mapeia itens de venda para formato do cupom
   */
  private mapSaleItems(items: any[]): any[] {
    if (!Array.isArray(items)) return []
    
    return items.map(item => {
      const precoOriginal = item.precoOriginal || item.precoUnitario
      const desconto = item.desconto || 0
      const tipoDesconto = item.tipoDesconto || 'valor'
      
      let descontoInfo = ''
      if (desconto > 0) {
        if (tipoDesconto === 'percentual') {
          descontoInfo = ` (Desc: ${desconto}%)`
        } else {
          descontoInfo = ` (Desc: R$ ${this.formatCurrency(desconto)})`
        }
      }
      
      return {
        nome: item.produto?.nome || 'Produto',
        quantidade: item.quantidade || 1,
        precoUnitario: precoOriginal,
        precoTotal: item.precoTotal || 0,
        observacoes: item.observacoes,
        desconto: descontoInfo
      }
    })
  }

  /**
   * Mapeia itens de pedido para formato do cupom
   */
  private mapOrderItems(items: any[]): any[] {
    if (!Array.isArray(items)) return []
    
    return items.map(item => ({
      nome: item.produto?.nome || item.nome || 'Produto',
      quantidade: item.quantidade || 1,
      precoUnitario: item.preco_unitario || item.precoUnitario || 0,
      precoTotal: item.preco_total || item.precoTotal || 0,
      observacoes: item.observacoes
    }))
  }

  /**
   * Formata endereço do pedido
   */
  private formatAddress(order: any): string {
    const parts = []
    
    if (order.endereco_rua) parts.push(order.endereco_rua)
    if (order.endereco_numero) parts.push(`nº ${order.endereco_numero}`)
    if (order.endereco_complemento) parts.push(order.endereco_complemento)
    if (order.endereco_bairro) parts.push(order.endereco_bairro)
    if (order.endereco_cidade) parts.push(order.endereco_cidade)
    
    return parts.join(', ')
  }

  /**
   * Formata forma de pagamento
   */
  private formatPaymentMethod(method: string): string {
    const map: { [key: string]: string } = {
      'CASH': 'Dinheiro',
      'DEBIT': 'Cartão de Débito',
      'CREDIT': 'Cartão de Crédito',
      'PIX': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartaoDebito': 'Cartão de Débito',
      'cartaoCredito': 'Cartão de Crédito',
      'pix': 'PIX'
    }
    
    return map[method] || method
  }

  /**
   * Formata valor monetário
   */
  private formatCurrency(value: number): string {
    return value.toFixed(2).replace('.', ',')
  }
}

export const receiptService = new ReceiptService()
export default receiptService
