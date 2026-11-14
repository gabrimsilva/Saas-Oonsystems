import { useState, useEffect } from "react"
import ConfiguracaoImpressao from "@/components/ConfiguracaoImpressao"
import TestePrintOrder from "@/components/TestePrintOrder"
import { configuracaoService } from "@/services"

export default function ConfiguracoesImpressaoPage() {
  const [fontSizes, setFontSizes] = useState({
    base: 11,
    storeName: 16,
    sectionTitle: 11,
    itemSub: 10,
    totals: 12,
    totalFinal: 14
  })

  // Carregar tamanhos iniciais do banco
  useEffect(() => {
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
  }, [])

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Impressão</h2>
        <p className="text-muted-foreground">
          Configure a impressora térmica e impressão automática
        </p>
      </div>

      <ConfiguracaoImpressao fontSizes={fontSizes} onFontSizesChange={setFontSizes} />
      
      <TestePrintOrder fontSizes={fontSizes} />
    </div>
  )
}
