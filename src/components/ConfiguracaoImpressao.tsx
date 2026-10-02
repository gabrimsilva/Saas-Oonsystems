import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Save, Printer, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { configuracaoService } from "@/services"
import { qzTrayService } from "@/lib/qzTrayService"

export default function ConfiguracaoImpressao({ fontSizes: propFontSizes, onFontSizesChange }: {
  fontSizes?: {
    base: number
    storeName: number
    sectionTitle: number
    itemSub: number
    totals: number
    totalFinal: number
  }
  onFontSizesChange?: (fontSizes: any) => void
}) {
  const [configuracoes, setConfiguracoes] = useState({
    nomeEstabelecimento: '',
    endereco: '',
    telefone: '',
    email: '',
    usarQZTray: false,
    impressoraPadrao: '',
    densidadeImpressao: 3,
    impressaoAutomatica: false,
    impressaoAutomaticaPDV: false,
    fontSizeBase: propFontSizes?.base || 11,
    fontSizeStoreName: propFontSizes?.storeName || 16,
    fontSizeSectionTitle: propFontSizes?.sectionTitle || 11,
    fontSizeItemSub: propFontSizes?.itemSub || 10,
    fontSizeTotals: propFontSizes?.totals || 12,
    fontSizeTotalFinal: propFontSizes?.totalFinal || 14
  })
  const [impressoras, setImpressoras] = useState<string[]>([])
  const [buscandoImpressoras, setBuscandoImpressoras] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<'sucesso' | 'erro'>('sucesso')
  const [dialogMensagem, setDialogMensagem] = useState('')

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const configs = await Promise.all([
        configuracaoService.buscarPorChave('nomeEstabelecimento'),
        configuracaoService.buscarPorChave('endereco'),
        configuracaoService.buscarPorChave('telefone'),
        configuracaoService.buscarPorChave('email'),
        configuracaoService.buscarPorChave('usar_qz_tray'),
        configuracaoService.buscarPorChave('impressora_padrao'),
        configuracaoService.buscarPorChave('densidade_impressao'),
        configuracaoService.buscarPorChave('impressao_automatica_pedidos'),
        configuracaoService.buscarPorChave('impressao_automatica_pdv'),
        configuracaoService.buscarPorChave('font_size_base'),
        configuracaoService.buscarPorChave('font_size_store_name'),
        configuracaoService.buscarPorChave('font_size_section_title'),
        configuracaoService.buscarPorChave('font_size_item_sub'),
        configuracaoService.buscarPorChave('font_size_totals'),
        configuracaoService.buscarPorChave('font_size_total_final')
      ])

      const [nome, endereco, telefone, email, usarQZ, impressora, densidade, impressaoAuto, impressaoAutoPDV,
             fontBase, fontStoreName, fontSectionTitle, fontItemSub, fontTotals, fontTotalFinal] = configs

      setConfiguracoes({
        nomeEstabelecimento: nome?.valor || '',
        endereco: endereco?.valor || '',
        telefone: telefone?.valor || '',
        email: email?.valor || '',
        usarQZTray: usarQZ?.valor === 'true',
        impressoraPadrao: impressora?.valor || '',
        densidadeImpressao: parseInt(densidade?.valor || '3'),
        impressaoAutomatica: impressaoAuto?.valor === 'true',
        impressaoAutomaticaPDV: impressaoAutoPDV?.valor === 'true',
        fontSizeBase: parseInt(fontBase?.valor || '11'),
        fontSizeStoreName: parseInt(fontStoreName?.valor || '16'),
        fontSizeSectionTitle: parseInt(fontSectionTitle?.valor || '11'),
        fontSizeItemSub: parseInt(fontItemSub?.valor || '10'),
        fontSizeTotals: parseInt(fontTotals?.valor || '12'),
        fontSizeTotalFinal: parseInt(fontTotalFinal?.valor || '14')
      })
    } catch (error) {
      // Erro ao carregar configurações
    } finally {
      setLoading(false)
    }
  }

  const buscarImpressoras = async () => {
    setBuscandoImpressoras(true)
    try {
      // Primeiro, fazer diagnóstico
      const diagnostico = await qzTrayService.diagnosticar()
      
      if (!diagnostico.qzCarregado) {
        setDialogTipo('erro')
        setDialogMensagem('O QZ Tray não está carregado. Recarregue a página e certifique-se de que o QZ Tray está instalado.')
        setDialogAberto(true)
        return
      }

      if (!diagnostico.conectado) {
        setDialogTipo('erro')
        setDialogMensagem(
          diagnostico.erro || 
          'Não foi possível conectar ao QZ Tray. Certifique-se de que o aplicativo está rodando.\n\n' +
          'Download: https://qz.io/download/'
        )
        setDialogAberto(true)
        return
      }

      // Se conectado, buscar impressoras
      const printers = await qzTrayService.getPrinters()
      setImpressoras(printers)
      
      if (printers.length === 0) {
        setDialogTipo('erro')
        setDialogMensagem('Nenhuma impressora encontrada. Verifique se há impressoras instaladas no sistema.')
        setDialogAberto(true)
      } else if (!configuracoes.impressoraPadrao) {
        setConfiguracoes(prev => ({
          ...prev,
          impressoraPadrao: printers[0]
        }))
      }
    } catch (error: any) {
      setImpressoras([])
      setDialogTipo('erro')
      
      // Mensagem de erro mais específica
      let mensagemErro = 'Erro ao buscar impressoras. '
      
      if (error?.message?.includes('não está carregado')) {
        mensagemErro += 'O QZ Tray não está carregado. Certifique-se de que está instalado e rodando.'
      } else if (error?.message?.includes('conectar')) {
        mensagemErro += 'Não foi possível conectar ao QZ Tray. Verifique se o aplicativo está rodando.'
      } else if (error?.message?.includes('NullPointerException')) {
        mensagemErro += 'Erro de comunicação com o QZ Tray. Tente reiniciar o aplicativo QZ Tray.'
      } else {
        mensagemErro += error?.message || 'Erro desconhecido.'
      }
      
      setDialogMensagem(mensagemErro)
      setDialogAberto(true)
    } finally {
      setBuscandoImpressoras(false)
    }
  }

  const salvarConfiguracoes = async () => {
    setSalvando(true)
    try {
      await Promise.all([
        configuracaoService.salvar(
          'nomeEstabelecimento',
          configuracoes.nomeEstabelecimento,
          'Nome do estabelecimento para impressão',
          'texto',
          'impressao'
        ),
        configuracaoService.salvar(
          'endereco',
          configuracoes.endereco,
          'Endereço para impressão',
          'texto',
          'impressao'
        ),
        configuracaoService.salvar(
          'telefone',
          configuracoes.telefone,
          'Telefone para impressão',
          'texto',
          'impressao'
        ),
        configuracaoService.salvar(
          'email',
          configuracoes.email,
          'Email para impressão',
          'texto',
          'impressao'
        ),
        configuracaoService.salvar(
          'usar_qz_tray',
          configuracoes.usarQZTray.toString(),
          'Usar QZ Tray para impressão automática',
          'booleano',
          'impressao'
        ),
        configuracaoService.salvar(
          'impressora_padrao',
          configuracoes.impressoraPadrao,
          'Impressora padrão para QZ Tray',
          'texto',
          'impressao'
        ),
        configuracaoService.salvar(
          'densidade_impressao',
          configuracoes.densidadeImpressao.toString(),
          'Densidade/intensidade da impressão (1-5)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'impressao_automatica_pedidos',
          configuracoes.impressaoAutomatica.toString(),
          'Ativar impressão automática dos pedidos ao serem criados',
          'booleano',
          'impressao'
        ),
        configuracaoService.salvar(
          'impressao_automatica_pdv',
          configuracoes.impressaoAutomaticaPDV.toString(),
          'Ativar impressão automática de cupom fiscal ao finalizar venda no PDV',
          'booleano',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_base',
          configuracoes.fontSizeBase.toString(),
          'Tamanho base do texto da impressão (px)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_store_name',
          configuracoes.fontSizeStoreName.toString(),
          'Tamanho do nome da loja na impressão (px)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_section_title',
          configuracoes.fontSizeSectionTitle.toString(),
          'Tamanho dos títulos de seção na impressão (px)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_item_sub',
          configuracoes.fontSizeItemSub.toString(),
          'Tamanho dos subtítulos/detalhes na impressão (px)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_totals',
          configuracoes.fontSizeTotals.toString(),
          'Tamanho dos valores de subtotal e taxas (px)',
          'numero',
          'impressao'
        ),
        configuracaoService.salvar(
          'font_size_total_final',
          configuracoes.fontSizeTotalFinal.toString(),
          'Tamanho do valor total final na impressão (px)',
          'numero',
          'impressao'
        )
      ])

      setDialogTipo('sucesso')
      setDialogMensagem('Configurações de impressão salvas com sucesso!')
      setDialogAberto(true)
    } catch (error) {
      setDialogTipo('erro')
      setDialogMensagem('Erro ao salvar configurações. Tente novamente.')
      setDialogAberto(true)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configurações de Impressão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Configurações de Impressão
        </CardTitle>
        <CardDescription>
          Configure as informações que aparecerão nos comprovantes impressos dos pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nomeEstabelecimento">Nome do Estabelecimento</Label>
            <Input
              id="nomeEstabelecimento"
              name="nomeEstabelecimento"
              autoComplete="organization"
              value={configuracoes.nomeEstabelecimento}
              onChange={(e) => setConfiguracoes(prev => ({
                ...prev,
                nomeEstabelecimento: e.target.value
              }))}
              placeholder="Ex: PIZZARIA DELIVERY"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              name="telefone"
              autoComplete="tel"
              value={configuracoes.telefone}
              onChange={(e) => setConfiguracoes(prev => ({
                ...prev,
                telefone: e.target.value
              }))}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              name="endereco"
              autoComplete="street-address"
              value={configuracoes.endereco}
              onChange={(e) => setConfiguracoes(prev => ({
                ...prev,
                endereco: e.target.value
              }))}
              placeholder="Ex: Rua das Pizzas, 123 - Centro"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={configuracoes.email}
              onChange={(e) => setConfiguracoes(prev => ({
                ...prev,
                email: e.target.value
              }))}
              placeholder="Ex: contato@pizzaria.com"
            />
          </div>
        </div>

        {/* Configurações de Densidade e Tamanhos de Fonte - Sempre Visíveis */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Configurações de Impressão</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Estas configurações afetam tanto a impressão via QZ Tray quanto a impressão normal do navegador
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="densidadeImpressao">
                Densidade da Impressão: <strong>{configuracoes.densidadeImpressao}</strong>
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Claro</span>
                <input
                  id="densidadeImpressao"
                  name="densidadeImpressao"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={configuracoes.densidadeImpressao}
                  onChange={(e) => setConfiguracoes(prev => ({
                    ...prev,
                    densidadeImpressao: parseInt(e.target.value)
                  }))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm text-muted-foreground">Escuro</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste a intensidade da impressão (1 = mais claro, 5 = mais escuro)
              </p>
            </div>

            {/* Tamanhos de Fonte */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Tamanhos de Fonte (px)</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultSizes = {
                      fontSizeBase: 11,
                      fontSizeStoreName: 16,
                      fontSizeSectionTitle: 11,
                      fontSizeItemSub: 10,
                      fontSizeTotals: 12,
                      fontSizeTotalFinal: 14
                    }
                    setConfiguracoes(prev => ({
                      ...prev,
                      ...defaultSizes
                    }))
                    onFontSizesChange?.({
                      base: 11,
                      storeName: 16,
                      sectionTitle: 11,
                      itemSub: 10,
                      totals: 12,
                      totalFinal: 14
                    })
                  }}
                  className="h-7 text-xs"
                >
                  Restaurar Padrão
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fontSizeBase" className="text-xs">Texto Base</Label>
                  <Input
                    id="fontSizeBase"
                    type="number"
                    min="8"
                    max="20"
                    value={configuracoes.fontSizeBase}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 11
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeBase: newValue
                      }))
                      onFontSizesChange?.({
                        base: newValue,
                        storeName: configuracoes.fontSizeStoreName,
                        sectionTitle: configuracoes.fontSizeSectionTitle,
                        itemSub: configuracoes.fontSizeItemSub,
                        totals: configuracoes.fontSizeTotals,
                        totalFinal: configuracoes.fontSizeTotalFinal
                      })
                    }}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fontSizeStoreName" className="text-xs">Nome da Loja</Label>
                  <Input
                    id="fontSizeStoreName"
                    type="number"
                    min="12"
                    max="24"
                    value={configuracoes.fontSizeStoreName}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 16
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeStoreName: newValue
                      }))
                      onFontSizesChange?.({
                        base: configuracoes.fontSizeBase,
                        storeName: newValue,
                        sectionTitle: configuracoes.fontSizeSectionTitle,
                        itemSub: configuracoes.fontSizeItemSub,
                        totals: configuracoes.fontSizeTotals,
                        totalFinal: configuracoes.fontSizeTotalFinal
                      })
                    }}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fontSizeSectionTitle" className="text-xs">Títulos de Seção</Label>
                  <Input
                    id="fontSizeSectionTitle"
                    type="number"
                    min="8"
                    max="18"
                    value={configuracoes.fontSizeSectionTitle}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 11
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeSectionTitle: newValue
                      }))
                      onFontSizesChange?.({
                        base: configuracoes.fontSizeBase,
                        storeName: configuracoes.fontSizeStoreName,
                        sectionTitle: newValue,
                        itemSub: configuracoes.fontSizeItemSub,
                        totals: configuracoes.fontSizeTotals,
                        totalFinal: configuracoes.fontSizeTotalFinal
                      })
                    }}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fontSizeItemSub" className="text-xs">Detalhes/Subtítulos</Label>
                  <Input
                    id="fontSizeItemSub"
                    type="number"
                    min="7"
                    max="16"
                    value={configuracoes.fontSizeItemSub}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 10
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeItemSub: newValue
                      }))
                      onFontSizesChange?.({
                        base: configuracoes.fontSizeBase,
                        storeName: configuracoes.fontSizeStoreName,
                        sectionTitle: configuracoes.fontSizeSectionTitle,
                        itemSub: newValue,
                        totals: configuracoes.fontSizeTotals,
                        totalFinal: configuracoes.fontSizeTotalFinal
                      })
                    }}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fontSizeTotals" className="text-xs">Subtotais/Taxas</Label>
                  <Input
                    id="fontSizeTotals"
                    type="number"
                    min="9"
                    max="18"
                    value={configuracoes.fontSizeTotals}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 12
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeTotals: newValue
                      }))
                      onFontSizesChange?.({
                        base: configuracoes.fontSizeBase,
                        storeName: configuracoes.fontSizeStoreName,
                        sectionTitle: configuracoes.fontSizeSectionTitle,
                        itemSub: configuracoes.fontSizeItemSub,
                        totals: newValue,
                        totalFinal: configuracoes.fontSizeTotalFinal
                      })
                    }}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fontSizeTotalFinal" className="text-xs">Total Final</Label>
                  <Input
                    id="fontSizeTotalFinal"
                    type="number"
                    min="10"
                    max="20"
                    value={configuracoes.fontSizeTotalFinal}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 14
                      setConfiguracoes(prev => ({
                        ...prev,
                        fontSizeTotalFinal: newValue
                      }))
                      onFontSizesChange?.({
                        base: configuracoes.fontSizeBase,
                        storeName: configuracoes.fontSizeStoreName,
                        sectionTitle: configuracoes.fontSizeSectionTitle,
                        itemSub: configuracoes.fontSizeItemSub,
                        totals: configuracoes.fontSizeTotals,
                        totalFinal: newValue
                      })
                    }}
                    className="h-8"
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Ajuste os tamanhos das fontes para personalizar a aparência da impressão
              </p>
            </div>
          </div>
        </div>

        {/* Configurações QZ Tray */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-4">Impressão Automática (QZ Tray)</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Usar QZ Tray</span>
                <p className="text-sm text-muted-foreground">
                  Ative para impressão automática em impressora térmica
                </p>
              </div>
              <Switch
                checked={configuracoes.usarQZTray}
                onChange={(checked) => setConfiguracoes(prev => ({
                  ...prev,
                  usarQZTray: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Impressão Automática de Pedidos</span>
                <p className="text-sm text-muted-foreground">
                  Imprime automaticamente quando um novo pedido delivery é criado
                </p>
              </div>
              <Switch
                checked={configuracoes.impressaoAutomatica}
                onChange={(checked) => setConfiguracoes(prev => ({
                  ...prev,
                  impressaoAutomatica: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Impressão Automática no PDV</span>
                <p className="text-sm text-muted-foreground">
                  Imprime cupom fiscal automaticamente ao finalizar venda no PDV
                </p>
              </div>
              <Switch
                checked={configuracoes.impressaoAutomaticaPDV}
                onChange={(checked) => setConfiguracoes(prev => ({
                  ...prev,
                  impressaoAutomaticaPDV: checked
                }))}
              />
            </div>

            {configuracoes.usarQZTray && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="impressora-padrao">Impressora Padrão</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={buscarImpressoras}
                      disabled={buscandoImpressoras}
                      className="flex items-center gap-2"
                    >
                      {buscandoImpressoras ? (
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Buscar Impressoras
                    </Button>
                  </div>
                  
                  {impressoras.length > 0 ? (
                    <select
                      id="impressora-padrao"
                      name="impressora-padrao"
                      value={configuracoes.impressoraPadrao}
                      onChange={(e) => setConfiguracoes(prev => ({
                        ...prev,
                        impressoraPadrao: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="">Selecione uma impressora</option>
                      {impressoras.map((impressora) => (
                        <option key={impressora} value={impressora}>
                          {impressora}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Clique em "Buscar Impressoras" para listar as impressoras disponíveis.
                      Certifique-se de que o QZ Tray está rodando.
                    </p>
                  )}
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm text-primary">
                    <strong>Importante:</strong> O QZ Tray deve estar instalado e rodando no computador.
                    <br />
                    Download: <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="underline">https://qz.io/download/</a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <ActionButton 
            onClick={salvarConfiguracoes}
            loading={salvando}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Configurações
          </ActionButton>
        </div>
      </CardContent>

      {/* Dialog de Sucesso/Erro */}
      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {dialogTipo === 'sucesso' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  Sucesso!
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Erro
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMensagem}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialogAberto(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}