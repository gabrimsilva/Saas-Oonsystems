// Declarar tipo global para qz
declare global {
  interface Window {
    qz: any
  }
}

/**
 * Serviço para gerenciar impressão via QZ Tray
 */
class QZTrayService {
  private connected = false
  private get qz() {
    if (!window.qz) {
      throw new Error('QZ Tray não está carregado. Certifique-se de que o QZ Tray está rodando.')
    }
    return window.qz
  }

  /**
   * Conecta ao QZ Tray com timeout
   */
  async connect(timeoutMs: number = 3000): Promise<boolean> {
    try {
      // Criar promise com timeout
      const connectPromise = new Promise<boolean>(async (resolve) => {
        try {
          if (!this.qz.websocket.isActive()) {
            await this.qz.websocket.connect()
            this.connected = true
            resolve(true)
          } else {
            this.connected = true
            resolve(true)
          }
        } catch (error) {
          console.error('❌ Erro ao conectar ao QZ Tray:', error)
          this.connected = false
          resolve(false)
        }
      })

      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          this.connected = false
          resolve(false)
        }, timeoutMs)
      })

      // Retorna a primeira promise que resolver
      return await Promise.race([connectPromise, timeoutPromise])
    } catch (error) {
      console.error('❌ Erro ao conectar ao QZ Tray:', error)
      this.connected = false
      return false
    }
  }

  /**
   * Desconecta do QZ Tray
   */
  async disconnect(): Promise<void> {
    try {
      if (this.qz.websocket.isActive()) {
        await this.qz.websocket.disconnect()
        this.connected = false
      }
    } catch (error) {
      console.error('❌ Erro ao desconectar do QZ Tray:', error)
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    try {
      if (!window.qz) {
        return false
      }
      return this.connected && this.qz.websocket.isActive()
    } catch (error) {
      return false
    }
  }

  /**
   * Verifica o status do QZ Tray e retorna informações de diagnóstico
   */
  async diagnosticar(): Promise<{
    qzCarregado: boolean
    versao: string | null
    conectado: boolean
    erro: string | null
  }> {
    const diagnostico = {
      qzCarregado: false,
      versao: null as string | null,
      conectado: false,
      erro: null as string | null
    }

    try {
      // Verificar se QZ está carregado
      if (!window.qz) {
        diagnostico.erro = 'QZ Tray não está carregado no navegador'
        return diagnostico
      }

      diagnostico.qzCarregado = true

      // Tentar obter versão
      try {
        diagnostico.versao = await this.qz.api.getVersion()
      } catch (error) {
        diagnostico.erro = 'Não foi possível obter a versão do QZ Tray'
      }

      // Verificar conexão
      try {
        if (this.qz.websocket.isActive()) {
          diagnostico.conectado = true
        } else {
          const connected = await this.connect(3000)
          diagnostico.conectado = connected
          if (!connected) {
            diagnostico.erro = 'Não foi possível conectar ao QZ Tray'
          }
        }
      } catch (error: any) {
        diagnostico.erro = `Erro ao conectar: ${error.message}`
      }

      return diagnostico
    } catch (error: any) {
      diagnostico.erro = `Erro no diagnóstico: ${error.message}`
      return diagnostico
    }
  }

  /**
   * Lista impressoras disponíveis
   */
  async getPrinters(): Promise<string[]> {
    try {
      // Verificar se QZ Tray está disponível
      if (!window.qz) {
        throw new Error('QZ Tray não está carregado. Certifique-se de que o QZ Tray está instalado e rodando.')
      }

      // Tentar conectar se não estiver conectado
      if (!this.isConnected()) {
        const connected = await this.connect(5000) // Timeout de 5 segundos
        if (!connected) {
          throw new Error('Não foi possível conectar ao QZ Tray. Verifique se o aplicativo está rodando.')
        }
      }

      // Buscar impressoras
      const printers = await this.qz.printers.find()
      
      // Validar resultado
      if (!printers || !Array.isArray(printers)) {
        throw new Error('Resposta inválida do QZ Tray ao buscar impressoras.')
      }

      console.log('🖨️ Impressoras encontradas:', printers)
      return printers
    } catch (error) {
      console.error('❌ Erro ao listar impressoras:', error)
      // Re-lançar o erro para que o componente possa tratá-lo adequadamente
      throw error
    }
  }

  /**
   * Imprime conteúdo HTML em impressora térmica
   */
  async printHTML(printerName: string, htmlContent: string): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        const connected = await this.connect(3000) // Timeout de 3 segundos
        if (!connected) {
          throw new Error('Não foi possível conectar ao QZ Tray')
        }
      }

      const config = this.qz.configs.create(printerName)

      const data = [{
        type: 'html' as const,
        format: 'plain' as const,
        data: htmlContent
      }]

      await this.qz.print(config, data)
      return true
    } catch (error) {
      console.error('❌ Erro ao imprimir:', error)
      return false
    }
  }

  /**
   * Tenta imprimir via QZ Tray, se falhar usa impressão nativa do navegador
   */
  async printHTMLWithFallback(printerName: string, htmlContent: string): Promise<{ success: boolean; method: 'qz' | 'browser' | 'failed' }> {
    try {
      // Tentar QZ Tray primeiro (com timeout curto)
      const qzSuccess = await this.printHTML(printerName, htmlContent)

      if (qzSuccess) {
        return { success: true, method: 'qz' }
      }

      // Se falhou, usar impressão nativa do navegador
      this.printViaBrowser(htmlContent)
      return { success: true, method: 'browser' }

    } catch (error) {
      console.error('❌ Erro ao tentar imprimir via QZ Tray:', error)

      // Fallback para impressão nativa
      this.printViaBrowser(htmlContent)
      return { success: true, method: 'browser' }
    }
  }

  /**
   * Imprime usando o diálogo nativo do navegador
   */
  private printViaBrowser(htmlContent: string): void {
    // Criar iframe oculto para impressão
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
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `)
      iframeDoc.close()
      
      // Aguardar carregamento e imprimir
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print()
          
          // Remover iframe após impressão
          setTimeout(() => {
            document.body.removeChild(iframe)
          }, 1000)
        }, 100)
      }
    }
  }

  /**
   * Imprime comandos ESC/POS diretos (para impressoras térmicas)
   */
  async printRaw(printerName: string, commands: string): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        const connected = await this.connect()
        if (!connected) {
          throw new Error('Não foi possível conectar ao QZ Tray')
        }
      }

      const config = this.qz.configs.create(printerName)

      const data = [{
        type: 'raw' as const,
        format: 'command' as const,
        data: commands
      }]

      await this.qz.print(config, data)
      return true
    } catch (error) {
      console.error('❌ Erro ao imprimir:', error)
      return false
    }
  }
}

export const qzTrayService = new QZTrayService()
