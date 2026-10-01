import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { ActionButton } from "@/components/ui/action-button"
import { Save, Loader2, CheckCircle, Store, Globe } from "lucide-react"
import { configuracaoService } from "@/services"
import { moduloService } from "@/services/moduloService"
import { FormasPagamentoConfig } from "@/components/configuracoes/FormasPagamentoConfig"
import { PagamentoOnlineConfig } from "@/components/configuracoes/PagamentoOnlineConfig"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type AbaPagamento = 'balcao' | 'online'

export default function ConfiguracoesPagamentoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const aba: AbaPagamento = searchParams.get('aba') === 'online' ? 'online' : 'balcao'

  const [formasPagamento, setFormasPagamento] = useState({
    dinheiro: true,
    cartaoDebito: true,
    cartaoCredito: true,
    pix: true
  })
  // null = não foi possível ler os módulos (não mostra aviso)
  const [modulos, setModulos] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  useEffect(() => {
    carregarConfiguracoes()
    moduloService.meusModulos().then(setModulos)
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const configuracoes = await configuracaoService.buscarTodas()

      configuracoes.forEach(cfg => {
        if (cfg.chave === 'metodos_pagamento') {
          try {
            const metodos = JSON.parse(cfg.valor)
            setFormasPagamento({
              dinheiro: metodos.includes('dinheiro'),
              cartaoDebito: metodos.includes('cartao_debito'),
              cartaoCredito: metodos.includes('cartao_credito'),
              pix: metodos.includes('pix')
            })
          } catch (e) {
            console.error('Erro ao parsear métodos de pagamento:', e)
          }
        }
      })
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    try {
      setSaving(true)

      const metodosPagamento = [
        ...(formasPagamento.dinheiro ? ['dinheiro'] : []),
        ...(formasPagamento.cartaoDebito ? ['cartao_debito'] : []),
        ...(formasPagamento.cartaoCredito ? ['cartao_credito'] : []),
        ...(formasPagamento.pix ? ['pix'] : [])
      ]

      await configuracaoService.salvar('metodos_pagamento', JSON.stringify(metodosPagamento), 'Métodos de pagamento aceitos', 'json', 'pagamento')

      setShowSuccessDialog(true)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleFormasPagamentoChange = (forma: keyof typeof formasPagamento, value: boolean) => {
    setFormasPagamento({ ...formasPagamento, [forma]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pagamentos</h2>
        <p className="text-muted-foreground">
          Formas aceitas na retirada/entrega e pedidos pelo catálogo online
        </p>
      </div>

      <Tabs
        value={aba}
        onValueChange={(valor) => setSearchParams(valor === 'online' ? { aba: 'online' } : {}, { replace: true })}
      >
        <TabsList className="h-auto">
          <TabsTrigger value="balcao" className="gap-2 px-4 py-2">
            <Store className="h-4 w-4" /> Balcão / Retirada
          </TabsTrigger>
          <TabsTrigger value="online" className="gap-2 px-4 py-2">
            <Globe className="h-4 w-4" /> Loja online (catálogo)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balcao" className="space-y-6 mt-6">
          <FormasPagamentoConfig
            formasPagamento={formasPagamento}
            onFormasPagamentoChange={handleFormasPagamentoChange}
          />

          <div className="flex justify-end">
            <ActionButton onClick={handleSalvar} loading={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </ActionButton>
          </div>
        </TabsContent>

        <TabsContent value="online" className="mt-6">
          <PagamentoOnlineConfig moduloContratado={modulos === null || modulos.includes('pedidos_online')} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Formas de pagamento salvas com sucesso!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
