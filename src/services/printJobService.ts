/**
 * Serviço para gerenciamento de jobs de impressão
 */

import { supabase } from '@/lib/supabase'
import { qzTrayService } from '@/lib/qzTrayService'
import { configuracaoService } from './configuracaoService'
import { receiptService } from './receiptService'
import { comTenant } from './tenant'

export type PrintJobStatus = 'PENDING' | 'SENT' | 'PRINTED' | 'FAILED' | 'CANCELED'
export type PrintJobRefType = 'SALE' | 'ORDER'

export interface PrintJob {
  id: string
  ref_type: PrintJobRefType
  ref_id: string
  printer_name?: string
  status: PrintJobStatus
  attempts: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface CreatePrintJobData {
  refType: PrintJobRefType
  refId: string
  receiptHtml?: string
  printerName?: string
  status?: PrintJobStatus
}

class PrintJobService {
  /**
   * Cria um novo job de impressão e salva o HTML do cupom na venda/pedido
   */
  async create(data: CreatePrintJobData): Promise<PrintJob> {
    // Salvar HTML do cupom na tabela correspondente (sales ou pedidos)
    if (data.receiptHtml) {
      try {
        if (data.refType === 'SALE') {
          await supabase
            .from('sales')
            .update({ receipt_html: data.receiptHtml })
            .eq('id', data.refId)
        } else if (data.refType === 'ORDER') {
          await supabase
            .from('pedidos')
            .update({ receipt_html: data.receiptHtml })
            .eq('id', data.refId)
        }
      } catch (error) {
        console.warn('Aviso: Não foi possível salvar HTML do cupom:', error)
      }
    }

    // Criar job de impressão
    const { data: job, error } = await supabase
      .from('print_jobs')
      .insert(comTenant({
        ref_type: data.refType,
        ref_id: data.refId,
        printer_name: data.printerName,
        status: data.status || 'PENDING',
        attempts: 0
      }))
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar print job:', error)
      throw new Error(`Falha ao criar job de impressão: ${error.message}`)
    }

    return job
  }

  /**
   * Atualiza status de um job
   */
  async updateStatus(
    jobId: string, 
    status: PrintJobStatus, 
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('print_jobs')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('Erro ao atualizar print job:', error)
      throw new Error(`Falha ao atualizar job: ${error.message}`)
    }
  }

  /**
   * Incrementa tentativas de impressão
   */
  async incrementAttempts(jobId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_print_job_attempts', {
      job_id: jobId
    })

    if (error) {
      // Fallback: buscar, incrementar e atualizar manualmente
      const { data: job } = await supabase
        .from('print_jobs')
        .select('attempts')
        .eq('id', jobId)
        .single()

      if (job) {
        await supabase
          .from('print_jobs')
          .update({ attempts: job.attempts + 1 })
          .eq('id', jobId)
      }
    }
  }

  /**
   * Busca jobs pendentes
   */
  async getPending(limit: number = 10): Promise<PrintJob[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Erro ao buscar jobs pendentes:', error)
      return []
    }

    return data || []
  }

  /**
   * Busca jobs por referência
   */
  async getByReference(refType: PrintJobRefType, refId: string): Promise<PrintJob[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('ref_type', refType)
      .eq('ref_id', refId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar jobs por referência:', error)
      return []
    }

    return data || []
  }

  /**
   * Marca job como impresso
   */
  async markAsPrinted(jobId: string): Promise<void> {
    await this.updateStatus(jobId, 'PRINTED')
  }

  /**
   * Marca job como falho
   */
  async markAsFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.updateStatus(jobId, 'FAILED', errorMessage)
    await this.incrementAttempts(jobId)
  }

  /**
   * Cancela um job
   */
  async cancel(jobId: string): Promise<void> {
    await this.updateStatus(jobId, 'CANCELED')
  }

  /**
   * Imprime um cupom fiscal (venda ou pedido)
   * Tenta usar QZ Tray se configurado, senão usa impressão do navegador
   */
  async print(refId: string, refType: PrintJobRefType): Promise<{
    success: boolean
    method: 'qz' | 'browser' | 'failed'
    error?: string
  }> {
    console.log('🖨️ [PrintJobService] Iniciando impressão:', { refId, refType })
    
    try {
      // Buscar configurações
      const [configUsarQZ, configImpressora] = await Promise.all([
        configuracaoService.buscarPorChave('usar_qz_tray'),
        configuracaoService.buscarPorChave('impressora_padrao')
      ])

      const usarQZTray = configUsarQZ?.valor === 'true'
      const impressoraPadrao = configImpressora?.valor || ''

      console.log('🖨️ [PrintJobService] Configurações:', {
        usarQZTray,
        impressoraPadrao,
        temImpressora: !!impressoraPadrao
      })

      // Buscar HTML do cupom
      let receiptHtml: string | null = null
      
      if (refType === 'SALE') {
        const { data: sale } = await supabase
          .from('sales')
          .select('*')
          .eq('id', refId)
          .single()
        
        if (!sale) {
          throw new Error('Venda não encontrada')
        }
        
        receiptHtml = sale.receipt_html || null
        
        // Se não tem HTML salvo, gerar agora
        if (!receiptHtml) {
          console.log('📄 [PrintJobService] Gerando HTML do cupom...')
          receiptHtml = await receiptService.generateSaleReceipt(sale)
          // Salvar para próximas impressões
          await supabase
            .from('sales')
            .update({ receipt_html: receiptHtml })
            .eq('id', refId)
          console.log('✅ [PrintJobService] HTML gerado e salvo')
        } else {
          console.log('✅ [PrintJobService] HTML recuperado do banco')
        }
      } else if (refType === 'ORDER') {
        const { data: order } = await supabase
          .from('pedidos')
          .select('*')
          .eq('id', refId)
          .single()
        
        if (!order) {
          throw new Error('Pedido não encontrado')
        }
        
        receiptHtml = order.receipt_html || null
        
        // Se não tem HTML salvo, gerar agora
        if (!receiptHtml) {
          console.log('📄 [PrintJobService] Gerando HTML do cupom...')
          receiptHtml = await receiptService.generateOrderReceipt(order)
          // Salvar para próximas impressões
          await supabase
            .from('pedidos')
            .update({ receipt_html: receiptHtml })
            .eq('id', refId)
          console.log('✅ [PrintJobService] HTML gerado e salvo')
        } else {
          console.log('✅ [PrintJobService] HTML recuperado do banco')
        }
      }

      if (!receiptHtml) {
        throw new Error('Não foi possível obter o cupom para impressão')
      }

      // Tentar imprimir via QZ Tray se configurado
      if (usarQZTray && impressoraPadrao) {
        console.log('🖨️ [PrintJobService] Tentando imprimir via QZ Tray...')
        try {
          const result = await qzTrayService.printHTMLWithFallback(impressoraPadrao, receiptHtml)
          console.log('✅ [PrintJobService] Impressão via QZ Tray concluída:', result)
          return result
        } catch (error) {
          console.warn('⚠️ [PrintJobService] Falha ao imprimir via QZ Tray, usando fallback do navegador:', error)
          // Fallback para impressão do navegador
          qzTrayService['printViaBrowser'](receiptHtml)
          return { success: true, method: 'browser' }
        }
      } else {
        console.log('🖨️ [PrintJobService] Usando impressão do navegador')
        // Usar impressão do navegador diretamente
        this.printViaBrowser(receiptHtml)
        return { success: true, method: 'browser' }
      }
    } catch (error) {
      console.error('❌ [PrintJobService] Erro ao imprimir cupom:', error)
      return {
        success: false,
        method: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Imprime usando o diálogo nativo do navegador
   */
  private printViaBrowser(htmlContent: string): void {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    
    document.body.appendChild(iframe)
    
    const iframeDoc = iframe.contentWindow?.document
    if (iframeDoc) {
      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @media print {
                body { margin: 0; padding: 10px; }
                @page { margin: 0; size: 80mm auto; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `)
      iframeDoc.close()
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print()
          setTimeout(() => {
            document.body.removeChild(iframe)
          }, 1000)
        }, 100)
      }
    }
  }
}

export const printJobService = new PrintJobService()
export default printJobService
