import { useState, useEffect } from "react"
import { type PedidoSupabase } from "@/services"
import { useConfiguracoesLoja } from "@/hooks/useConfiguracoesLoja"
import { configuracaoService } from "@/services"

interface PrintOrderPreviewProps {
  pedido: PedidoSupabase
  fontSizes?: {
    base: number
    storeName: number
    sectionTitle: number
    itemSub: number
    totals: number
    totalFinal: number
  }
}

export default function PrintOrderPreview({ pedido, fontSizes: propFontSizes }: PrintOrderPreviewProps) {
  const { configuracoes } = useConfiguracoesLoja()
  const [fontSizes, setFontSizes] = useState({
    base: 11,
    storeName: 16,
    sectionTitle: 11,
    itemSub: 10,
    totals: 12,
    totalFinal: 14
  })

  useEffect(() => {
    // Se recebeu fontSizes como prop, usa eles
    if (propFontSizes) {
      setFontSizes(propFontSizes)
      return
    }

    // Caso contrário, carrega do banco
    const carregarFontSizes = async () => {
      try {
        const [base, storeName, sectionTitle, itemSub, totals, totalFinal] = await Promise.all([
          configuracaoService.buscarPorChave('font_size_base'),
          configuracaoService.buscarPorChave('font_size_store_name'),
          configuracaoService.buscarPorChave('font_size_section_title'),
          configuracaoService.buscarPorChave('font_size_item_sub'),
          configuracaoService.buscarPorChave('font_size_totals'),
          configuracaoService.buscarPorChave('font_size_total_final')
        ])

        setFontSizes({
          base: parseInt(base?.valor || '11'),
          storeName: parseInt(storeName?.valor || '16'),
          sectionTitle: parseInt(sectionTitle?.valor || '11'),
          itemSub: parseInt(itemSub?.valor || '10'),
          totals: parseInt(totals?.valor || '12'),
          totalFinal: parseInt(totalFinal?.valor || '14')
        })
      } catch (error) {
        // Usar valores padrão em caso de erro
      }
    }

    carregarFontSizes()
  }, [propFontSizes])

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
    
    if (item.produto.categoria === 'combo') {
      return precoItem * item.quantidade
    }
    
    if (item.tamanhoSelecionado?.valor) precoItem = item.tamanhoSelecionado.valor
    if (item.bordaSelecionada?.valor) precoItem += item.bordaSelecionada.valor
    if (item.adicionaisSelecionados?.length > 0) {
      precoItem += item.adicionaisSelecionados.reduce((sum: number, a: any) => sum + (a.valor * a.quantidade), 0)
    }
    return precoItem * item.quantidade
  }

  const idCurto = pedido.codigo_pedido || pedido.pedido_id.split('-').pop()?.slice(-4) || pedido.pedido_id.slice(-4)

  return (
    <div className="w-full max-w-[280px] mx-auto bg-card border-2 border-input rounded-lg overflow-hidden shadow-lg">
      <style>{`
        .thermal-preview {
          font-family: "Courier New", Courier, monospace;
          font-size: ${fontSizes.base}px;
          line-height: 1.2;
          padding: 8px;
          color: #000;
        }
        .thermal-header {
          text-align: center;
          margin-bottom: 6px;
        }
        .thermal-store-name {
          font-size: ${fontSizes.storeName}px;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .thermal-store-info {
          font-size: ${fontSizes.itemSub}px;
        }
        .thermal-divider {
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        .thermal-section-title {
          font-weight: bold;
          font-size: ${fontSizes.sectionTitle}px;
          margin-top: 6px;
          margin-bottom: 4px;
        }
        .thermal-info-row {
          margin-bottom: 2px;
          word-break: break-word;
        }
        .thermal-item {
          margin-bottom: 4px;
        }
        .thermal-item-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .thermal-qty-name {
          flex: 1;
          max-width: 58%;
          padding-right: 4px;
        }
        .thermal-price {
          text-align: right;
          white-space: nowrap;
          min-width: 32%;
        }
        .thermal-item-sub {
          font-size: ${fontSizes.itemSub}px;
          margin-left: 8px;
          margin-top: 2px;
        }
        .thermal-totals {
          margin-top: 6px;
          font-size: ${fontSizes.totals}px;
        }
        .thermal-total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .thermal-total-line.total {
          font-weight: bold;
          font-size: ${fontSizes.totalFinal}px;
        }
        .thermal-footer {
          text-align: center;
          margin-top: 8px;
          font-size: ${fontSizes.itemSub}px;
        }
        .thermal-order-id {
          font-size: ${fontSizes.totalFinal}px;
          font-weight: bold;
          text-align: center;
          margin: 6px 0;
        }
      `}</style>
      
      <div className="thermal-preview">
        <div className="thermal-header">
          <div className="thermal-store-name">{configuracoes.nome}</div>
          <div className="thermal-store-info">{configuracoes.endereco}</div>
          <div className="thermal-store-info">Tel: {configuracoes.telefone}</div>
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-order-id">Detalhes do Pedido #{idCurto}</div>
        
        <div>
          <div className="thermal-section-title">Dados Pessoais</div>
          <div className="thermal-info-row"><strong>Nome:</strong> {pedido.cliente_nome} {pedido.cliente_sobrenome}</div>
          <div className="thermal-info-row"><strong>Telefone:</strong> {pedido.cliente_telefone}</div>
          
          <div className="thermal-section-title">Dados de Entrega</div>
          <div className="thermal-info-row"><strong>Tipo:</strong> {pedido.entrega_domicilio ? 'Entrega a Domicílio' : 'Retirada no Local'}</div>
          {pedido.entrega_domicilio && pedido.cliente_endereco && (
            <>
              <div className="thermal-info-row"><strong>Endereço:</strong> {pedido.cliente_endereco}, {pedido.cliente_numero}</div>
              {pedido.cliente_complemento && (
                <div className="thermal-info-row"><strong>Complemento:</strong> {pedido.cliente_complemento}</div>
              )}
              {pedido.cliente_bairro && (
                <div className="thermal-info-row"><strong>Bairro:</strong> {pedido.cliente_bairro}</div>
              )}
              {pedido.cliente_cidade && (
                <div className="thermal-info-row"><strong>Cidade:</strong> {pedido.cliente_cidade} - {pedido.cliente_estado}</div>
              )}
              {pedido.cliente_cep && (
                <div className="thermal-info-row"><strong>CEP:</strong> {pedido.cliente_cep}</div>
              )}
            </>
          )}
          
          <div className="thermal-section-title">Dados do Pedido</div>
          <div className="thermal-info-row"><strong>Data/Hora:</strong> {formatarHora(pedido.criado_em)}</div>
          {pedido.forma_pagamento_dividido ? (
            <>
              <div className="thermal-info-row"><strong>Forma de Pagamento:</strong> Pagamento Dividido</div>
              <div className="thermal-info-row" style={{ marginLeft: '8px' }}>- {formatarFormaPagamento(pedido.pagamento_1_tipo || '')}: R$ {(pedido.pagamento_1_valor || 0).toFixed(2).replace('.', ',')}</div>
              <div className="thermal-info-row" style={{ marginLeft: '8px' }}>- {formatarFormaPagamento(pedido.pagamento_2_tipo || '')}: R$ {(pedido.pagamento_2_valor || 0).toFixed(2).replace('.', ',')}</div>
            </>
          ) : (
            <div className="thermal-info-row"><strong>Forma de Pagamento:</strong> {formatarFormaPagamento(pedido.forma_pagamento)}</div>
          )}
          {pedido.forma_pagamento === 'pix' && pedido.mercado_pago_date_approved && (
            <div className="thermal-info-row"><strong>Aprovado em:</strong> {obterDataAprovacao()}</div>
          )}
          <div className="thermal-info-row"><strong>Status:</strong> {obterStatusPagamento()}</div>
          {pedido.precisa_troco && pedido.valor_troco && (
            <div className="thermal-info-row"><strong>Troco para:</strong> R$ {pedido.valor_troco.toFixed(2).replace('.', ',')}</div>
          )}
          {pedido.observacoes && !pedido.observacoes.includes('Pedido criado via PDV') && (
            <div className="thermal-info-row"><strong>Observações:</strong> {pedido.observacoes}</div>
          )}
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-section-title">Itens</div>
        <div>
          {pedido.itens.map((item: any, index: number) => {
            const precoTotal = calcularPrecoItem(item).toFixed(2).replace('.', ',')
            return (
              <div key={index} className="thermal-item">
                <div className="thermal-item-head">
                  <div className="thermal-qty-name">{item.quantidade}x {item.produto.nome}</div>
                  <div className="thermal-price">R$ {precoTotal}</div>
                </div>
                {item.produto.categoria && (
                  <div className="thermal-item-sub"><strong>Categoria:</strong> {item.produto.categoria}</div>
                )}
                {item.tamanhoSelecionado && (
                  <div className="thermal-item-sub"><strong>Tamanho:</strong> {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})</div>
                )}
                {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                  <div className="thermal-item-sub"><strong>Sabores:</strong> {item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>
                )}
                {item.bordaSelecionada && (
                  <div className="thermal-item-sub"><strong>Borda:</strong> {item.bordaSelecionada.nome}</div>
                )}
                {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                  <div className="thermal-item-sub">
                    <strong>Adicionais:</strong> {item.adicionaisSelecionados.map((a: any) => 
                      `${a.quantidade}x ${a.nome} (+R$ ${(a.valor * a.quantidade).toFixed(2).replace('.', ',')})`
                    ).join(', ')}
                  </div>
                )}
                {item.observacoes && (
                  <div className="thermal-item-sub"><strong>Obs:</strong> {item.observacoes}</div>
                )}
              </div>
            )
          })}
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-totals">
          <div className="thermal-total-line">
            <div>Subtotal:</div>
            <div>R$ {pedido.subtotal.toFixed(2).replace('.', ',')}</div>
          </div>
          {pedido.taxa_entrega > 0 && (
            <div className="thermal-total-line">
              <div>Taxa de entrega:</div>
              <div>R$ {pedido.taxa_entrega.toFixed(2).replace('.', ',')}</div>
            </div>
          )}
          {(pedido as any).taxa_extra_km > 0 && (
            <div className="thermal-total-line">
              <div>Taxa extra (dist.):</div>
              <div>R$ {(pedido as any).taxa_extra_km.toFixed(2).replace('.', ',')}</div>
            </div>
          )}
          <div className="thermal-total-line total">
            <div>Total:</div>
            <div>R$ {pedido.total.toFixed(2).replace('.', ',')}</div>
          </div>
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-footer" style={{ textAlign: 'center', color: '#000', padding: '6px', margin: '6px 0', fontWeight: 'bold' }}>
          Deus abençoe!
        </div>
        
        <div className="thermal-divider"></div>
      </div>
    </div>
  )
}
