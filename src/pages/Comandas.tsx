// @ts-nocheck
import { useState, useEffect } from "react"
import { ClipboardList, Plus, Trash2, Eye, X, Minus, Printer, MessageSquare, Scan } from "lucide-react"
import toast from "react-hot-toast"
import { useDebounce } from "@/hooks/useDebounce"
import { DEBOUNCE_DELAYS } from "@/constants/timers"
import { Button } from "@/components/ui/button"
import { DangerButton } from "@/components/ui/danger-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { produtoService, categoriaService, tamanhoService, comandaService, comboService, configuracaoService, estoqueService, stockService } from "@/services"
import type { CategoriaSupabase, ComboSupabase } from "@/types/supabase"
import { type ProdutoPDV } from "@/components/pdv/types"
import EscolherSaborModal from "@/components/EscolherSaborModal"
import EscolherComboPersonalizadoModal from "@/components/EscolherComboPersonalizadoModal"
import SelecionarVarianteModal from "@/components/pdv/SelecionarVarianteModal"
import BarcodeScanner from "@/components/BarcodeScanner"
import FiltrosProdutos from "@/components/pdv/FiltrosProdutos"
import GridProdutos from "@/components/pdv/GridProdutos"
import GridCombos from "@/components/pdv/GridCombos"
import { qzTrayService } from "@/lib/qzTrayService"
import { renderizarDetalhesCombo, renderizarDetalhesComboHTML } from "@/utils/comboFormatacao"
import { calcularDescontoEmReais } from "@/utils/descontoCalculation"
import { CarregandoPagina } from '@/components/ui/feedback'
import { Kbd } from '@/components/ui/kbd'
import { useAtalhos } from '@/hooks/useAtalhos'
import { DIVISAO_INICIAL, resolverDivisao } from '@/utils/pagamentoDividido'
import PagamentoDividido from '@/components/PagamentoDividido'

interface ItemComanda {
  id: string
  produto: ProdutoPDV
  quantidade: number
  precoUnitario?: number
  precoTotal?: number
  saboresSelecionados?: any[]
  bordaSelecionada?: any
  tamanhoSelecionado?: any
  adicionaisSelecionados?: any[]
  observacoes?: string
  isCombo?: boolean
  produtosCombo?: any[]
  variantId?: string
  variantLabel?: string
}

interface Comanda {
  numero: number
  itens: ItemComanda[]
  total: number
  aberta: boolean
}

export default function Comandas() {
  // Estado das comandas (24 comandas fixas)
  const [comandas, setComandas] = useState<Comanda[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({
      numero: i + 1,
      itens: [],
      total: 0,
      aberta: false
    }))
  )

  // Estado da comanda selecionada
  const [comandaSelecionada, setComandaSelecionada] = useState<number | null>(null)
  const [visualizandoComanda, setVisualizandoComanda] = useState<number | null>(null)

  // Estados dos produtos
  const [produtos, setProdutos] = useState<ProdutoPDV[]>([])
  const [combos, setCombos] = useState<ComboSupabase[]>([])
  const [categorias, setCategorias] = useState<CategoriaSupabase[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAYS.SEARCH)
  const [loading, setLoading] = useState(true)

  // Estados dos modals
  const [modalSaborAberto, setModalSaborAberto] = useState(false)
  const [modalComboPersonalizadoAberto, setModalComboPersonalizadoAberto] = useState(false)
  const [modalVarianteAberto, setModalVarianteAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoPDV | null>(null)
  const [comboSelecionado, setComboSelecionado] = useState<ComboSupabase | null>(null)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
  const [divisaoComanda, setDivisaoComanda] = useState(DIVISAO_INICIAL)
  const [modalScannerAberto, setModalScannerAberto] = useState(false)


  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [finalizando, setFinalizando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)

  // Estados para mensagens
  const [mensagemDialog, setMensagemDialog] = useState<{ titulo: string; descricao: string; tipo: 'sucesso' | 'erro' } | null>(null)
  const [comandaParaLimpar, setComandaParaLimpar] = useState<number | null>(null)

  // Obter comanda atual
  const comandaAtual = comandaSelecionada !== null
    ? comandas.find(c => c.numero === comandaSelecionada)
    : null

  useEffect(() => {
    carregarDados()
    carregarComandasDoBanco()
  }, [])

  // Carregar comandas do banco de dados
  const carregarComandasDoBanco = async () => {
    try {
      const comandasAbertas = await comandaService.buscarAbertas()

      if (comandasAbertas.length > 0) {
        setComandas(prev => prev.map(comanda => {
          const comandaBanco = comandasAbertas.find(c => c.numero_comanda === comanda.numero)

          if (comandaBanco) {
            return {
              numero: comandaBanco.numero_comanda,
              itens: comandaBanco.itens || [],
              total: comandaBanco.total,
              aberta: true
            }
          }

          return comanda
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar comandas do banco:', error)
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [produtosData, combosData, categoriasData] = await Promise.all([
        produtoService.buscarTodos(),
        comboService.buscarTodos(),
        categoriaService.buscarAtivas()
      ])

      const produtosComAlias = produtosData
        .filter(produto => produto.ativo)
        .map(produto => ({
          ...produto,
          categoria: produto.categoria_nome || 'outros',
          urlImagem: produto.imagem_path || '/placeholder-food.svg',
          precoPromocional: produto.preco_promocional,
          saboresDisponiveis: produto.sabores_disponiveis,
          quantidadeSabores: produto.quantidade_sabores
        }))

      setProdutos(produtosComAlias)
      const combosAtivos = combosData.filter(combo => combo.ativo)
      setCombos(combosAtivos)

      const categoriasAtivas = categoriasData
        .filter(cat => cat.ativa)
        .sort((a, b) => a.ordem - b.ordem)
      setCategorias(categoriasAtivas)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchCategoria = categoriaAtiva === 'todos' || produto.categoria_id === categoriaAtiva
    const matchSearch = produto.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    return matchCategoria && matchSearch
  })

  // Filtrar combos (só mostrar quando não há filtros ativos)
  const combosFiltrados = (categoriaAtiva === 'todos' && debouncedSearchTerm === '') ? combos : []

  // Adicionar produto à comanda
  const handleAdicionarProduto = async (produto: ProdutoPDV) => {
    if (comandaSelecionada === null) {
      toast.error('Selecione uma comanda primeiro!')
      return
    }

    // Verificar se a categoria do produto tem configurações especiais
    const categoria = categorias.find(cat => cat.id === produto.categoria_id)

    // PRIMEIRO: Verificar se produto tem variantes de estoque
    try {
      const stockItem = await stockService.buscarPorProduto(produto.id)
      if (stockItem) {
        const variantes = await stockService.buscarVariantes(stockItem.id)
        if (variantes && variantes.length > 0) {
          // Produto tem variantes - abrir modal de seleção
          setProdutoSelecionado(produto)
          setModalVarianteAberto(true)
          return
        }
      }
    } catch (error) {
      console.error('Erro ao verificar variantes:', error)
    }

    // Verificar se o PRODUTO realmente tem sabores configurados
    const produtoTemSabores = produto.sabores_disponiveis && (
      (produto.quantidade_sabores && produto.quantidade_sabores > 0) ||
      ((produto as any).quantidadeSabores && (produto as any).quantidadeSabores > 0)
    )

    // Verificar se o produto permite adicionais E a categoria tem adicionais
    const produtoTemAdicionais = (produto as any).permite_adicionais && (categoria as any)?.tem_adicionais

    // SEMPRE verificar se tem tamanhos cadastrados no produto
    // Não depender apenas da flag da categoria
    let temTamanhos = false
    try {
      const tamanhos = await tamanhoService.buscarPorProduto(produto.id)
      temTamanhos = tamanhos && tamanhos.length > 0
    } catch (error) {
      console.error('Erro ao verificar tamanhos:', error)
    }

    // Só abre modal se o PRODUTO tiver personalizações, não apenas a categoria
    if (produtoTemSabores || temTamanhos || produtoTemAdicionais) {
      setProdutoSelecionado(produto)
      setModalSaborAberto(true)
    } else {
      // Produto simples - verificar se já existe e incrementar ou criar novo
      if (comandaSelecionada === null) return

      const precoUnitario = Number(produto.preco_promocional || produto.preco)

      setComandas(prev => {
        return prev.map(comanda => {
          if (comanda.numero === comandaSelecionada) {
            // Procurar por item simples (sem personalizações) do mesmo produto
            const itemExistente = comanda.itens.find(item => 
              item.produto.id === produto.id &&
              (!item.saboresSelecionados || item.saboresSelecionados.length === 0) &&
              !item.bordaSelecionada &&
              !item.tamanhoSelecionado &&
              (!item.adicionaisSelecionados || item.adicionaisSelecionados.length === 0) &&
              !item.observacoes &&
              !item.variantId
            )

            if (itemExistente) {
              // Item simples já existe - incrementar quantidade
              const novosItens = comanda.itens.map(item => {
                if (item.id === itemExistente.id) {
                  const novaQuantidade = item.quantidade + 1
                  return {
                    ...item,
                    quantidade: novaQuantidade,
                    precoTotal: (item.precoUnitario || 0) * novaQuantidade
                  }
                }
                return item
              })
              return {
                ...comanda,
                itens: novosItens,
                total: calcularTotalComanda(novosItens),
                aberta: true
              }
            } else {
              // Novo item - criar como antes
              const novoItem: ItemComanda = {
                id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                produto: produto,
                quantidade: 1,
                precoUnitario: Number(precoUnitario),
                precoTotal: Number(precoUnitario),
                observacoes: undefined
              }
              const novosItens = [...comanda.itens, novoItem]
              return {
                ...comanda,
                itens: novosItens,
                total: calcularTotalComanda(novosItens),
                aberta: true
              }
            }
          }
          return comanda
        })
      })
      toast.success('Produto adicionado à comanda!')
    }
  }

  // Handler para adicionar combo ao carrinho
  const handleAdicionarCombo = async (combo: ComboSupabase) => {
    if (comandaSelecionada === null) {
      toast.error('Selecione uma comanda primeiro!')
      return
    }

    try {
      // Verificar se o combo tem produtos que precisam de personalização
      const produtosCombo = await comboService.buscarProdutosCombo(combo.id)

      const temProdutoComPersonalizacao = await Promise.all(
        produtosCombo.map(async (produto) => {
          if (produto.sabores_disponiveis || produto.quantidade_sabores > 0) {
            return true
          }
          try {
            const tamanhos = await tamanhoService.buscarPorProduto(produto.id)
            return tamanhos && tamanhos.length > 0
          } catch (error) {
            console.error('Erro ao verificar tamanhos do produto:', error)
            return false
          }
        })
      )

      const precisaPersonalizacao = temProdutoComPersonalizacao.some(Boolean)

      if (precisaPersonalizacao) {
        setComboSelecionado(combo)
        setModalComboPersonalizadoAberto(true)
      } else {
        // Combo simples - adicionar diretamente sem observações
        adicionarComboSimples(combo, undefined)
      }
    } catch (error) {
      console.error('Erro ao verificar produtos do combo:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao adicionar combo. Tente novamente.',
        tipo: 'erro'
      })
    }
  }

  // Handler para buscar produto por código de barras
  const handleBuscarPorCodigoBarras = async (barcode: string) => {
    try {
      toast.loading('Buscando produto...', { id: 'barcode-search' })

      const resultado = await stockService.buscarPorCodigoBarras(barcode)

      if (!resultado) {
        toast.error('Produto não encontrado', { id: 'barcode-search' })
        return
      }

      toast.success(`Produto encontrado: ${resultado.produto.nome}`, { id: 'barcode-search' })

      // Converter para ProdutoPDV
      const produtoPDV: ProdutoPDV = {
        id: resultado.produto.id,
        nome: resultado.produto.nome,
        descricao: resultado.produto.descricao || '',
        preco: resultado.produto.preco,
        preco_promocional: resultado.produto.preco_promocional,
        categoria_id: resultado.produto.categoria_id,
        categoria_nome: resultado.produto.categoria_nome,
        categoria: resultado.produto.categoria_nome,
        imagem_path: resultado.produto.imagem_path || '',
        urlImagem: resultado.produto.imagem_path || '',
        sabores_disponiveis: resultado.produto.sabores_disponiveis || false,
        saboresDisponiveis: resultado.produto.sabores_disponiveis || false,
        quantidade_sabores: resultado.produto.quantidade_sabores || 0,
        quantidadeSabores: resultado.produto.quantidade_sabores || 0,
        ativo: resultado.produto.ativo,
        criado_em: resultado.produto.criado_em,
        atualizado_em: resultado.produto.atualizado_em
      }

      // Se for variante, adicionar informação
      if (resultado.tipo === 'variante' && resultado.variante) {
        produtoPDV.nome = `${produtoPDV.nome} - ${resultado.variante.label}`
      }

      // Adicionar produto à comanda
      await handleAdicionarProduto(produtoPDV)

      // Fechar modal após adicionar
      setModalScannerAberto(false)
    } catch (error) {
      console.error('Erro ao buscar por código de barras:', error)
      toast.error('Erro ao buscar produto', { id: 'barcode-search' })
    }
  }

  // Adicionar combo simples (sem personalização)
  const adicionarComboSimples = (combo: ComboSupabase, observacoes?: string) => {
    if (comandaSelecionada === null) return

    const precoUnitario = Number(combo.preco_combo || 0)

    setComandas(prev => {
      const novasComandas = prev.map(comanda => {
        if (comanda.numero === comandaSelecionada) {
          const novoItem: ItemComanda = {
            id: `combo-${Date.now()}-${Math.random()}`,
            produto: {
              id: combo.id,
              nome: combo.nome,
              descricao: `${combo.descricao || ''} - Economize ${combo.desconto?.toFixed(1) || 0}%`,
              preco: combo.preco_combo,
              preco_promocional: undefined,
              categoria_id: undefined,
              categoria_nome: 'combo',
              categoria: 'combo',
              imagem_path: combo.url_imagem || '',
              urlImagem: combo.url_imagem || '',
              sabores_disponiveis: false,
              saboresDisponiveis: false,
              quantidade_sabores: 0,
              quantidadeSabores: 0,
              ativo: combo.ativo,
              criado_em: combo.criado_em,
              atualizado_em: combo.atualizado_em
            } as ProdutoPDV,
            quantidade: 1,
            precoUnitario: Number(precoUnitario),
            precoTotal: Number(precoUnitario),
            observacoes,
            isCombo: true
          }

          const novosItens = [...comanda.itens, novoItem]
          const novoTotal = calcularTotalComanda(novosItens)

          return {
            ...comanda,
            itens: novosItens,
            total: novoTotal,
            aberta: true
          }
        }
        return comanda
      })

      return novasComandas
    })

    toast.success('Combo adicionado à comanda!')
  }

  // Adicionar combo personalizado
  const handleAdicionarComboPersonalizado = (produtosPersonalizados: any[], quantidade: number, observacoes?: string) => {
    if (!comboSelecionado || comandaSelecionada === null) return

    const precoUnitario = Number(comboSelecionado.preco_combo || 0)

    setComandas(prev => {
      const novasComandas = prev.map(comanda => {
        if (comanda.numero === comandaSelecionada) {
          const novoItem: ItemComanda = {
            id: `combo-${Date.now()}-${Math.random()}`,
            produto: {
              id: comboSelecionado.id,
              nome: comboSelecionado.nome,
              descricao: `${comboSelecionado.descricao || ''} - Economize ${comboSelecionado.desconto?.toFixed(1) || 0}%`,
              preco: comboSelecionado.preco_combo,
              preco_promocional: undefined,
              categoria_id: undefined,
              categoria_nome: 'combo',
              categoria: 'combo',
              imagem_path: comboSelecionado.url_imagem || '',
              urlImagem: comboSelecionado.url_imagem || '',
              sabores_disponiveis: false,
              saboresDisponiveis: false,
              quantidade_sabores: 0,
              quantidadeSabores: 0,
              ativo: comboSelecionado.ativo,
              criado_em: comboSelecionado.criado_em,
              atualizado_em: comboSelecionado.atualizado_em
            } as ProdutoPDV,
            quantidade,
            precoUnitario: Number(precoUnitario),
            precoTotal: Number(precoUnitario * quantidade),
            observacoes: observacoes, // Observações do combo inteiro
            isCombo: true,
            produtosCombo: produtosPersonalizados
          }

          const novosItens = [...comanda.itens, novoItem]
          const novoTotal = calcularTotalComanda(novosItens)

          return {
            ...comanda,
            itens: novosItens,
            total: novoTotal,
            aberta: true
          }
        }
        return comanda
      })

      return novasComandas
    })

    toast.success('Combo personalizado adicionado à comanda!')
  }

  // Adicionar item com personalização
  const handleAdicionarComPersonalizacao = (
    saboresSelecionados: any[],
    bordaSelecionada: any | null,
    tamanhoSelecionado?: any,
    quantidade: number = 1,
    adicionaisSelecionados?: any[],
    observacoes?: string
  ) => {
    if (!produtoSelecionado || comandaSelecionada === null) return

    let precoBase = Number(tamanhoSelecionado?.valor || produtoSelecionado.preco_promocional || produtoSelecionado.preco)
    const precoBorda = Number(bordaSelecionada?.preco || 0)
    const precoSabores = saboresSelecionados.reduce((total, sabor) => total + Number(sabor.preco || 0), 0)
    const precoAdicionais = adicionaisSelecionados?.reduce((total, adicional) =>
      total + (Number(adicional.valor) * Number(adicional.quantidade)), 0) || 0

    const precoUnitario = precoBase + precoBorda + precoSabores + precoAdicionais

    const novoItem: ItemComanda = {
      id: `${Date.now()}-${Math.random()}`,
      produto: produtoSelecionado,
      quantidade,
      precoUnitario: Number(precoUnitario),
      precoTotal: Number(precoUnitario * quantidade),
      saboresSelecionados,
      bordaSelecionada,
      tamanhoSelecionado,
      adicionaisSelecionados,
      observacoes
    }

    setComandas(prev => {
      const novasComandas = prev.map(comanda => {
        if (comanda.numero === comandaSelecionada) {
          const novosItens = [...comanda.itens, novoItem]
          const novoTotal = calcularTotalComanda(novosItens)

          return {
            ...comanda,
            itens: novosItens,
            total: novoTotal,
            aberta: true
          }
        }
        return comanda
      })

      return novasComandas
    })

    toast.success('Produto adicionado à comanda!')
  }

  // Confirmar seleção de variante
  const handleConfirmarVariante = (variantId: string, variantLabel: string) => {
    if (!produtoSelecionado || comandaSelecionada === null) return

    const precoUnitario = Number(produtoSelecionado.preco_promocional || produtoSelecionado.preco)

    const novoItem: ItemComanda = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      produto: produtoSelecionado,
      quantidade: 1,
      precoUnitario: Number(precoUnitario),
      precoTotal: Number(precoUnitario),
      variantId,
      variantLabel
    }

    setComandas(prev => {
      const novasComandas = prev.map(comanda => {
        if (comanda.numero === comandaSelecionada) {
          const novosItens = [...comanda.itens, novoItem]
          const novoTotal = calcularTotalComanda(novosItens)

          return {
            ...comanda,
            itens: novosItens,
            total: novoTotal,
            aberta: true
          }
        }
        return comanda
      })

      return novasComandas
    })

    // Fechar modal e limpar estado
    setModalVarianteAberto(false)
    setProdutoSelecionado(null)
    
    toast.success(`${produtoSelecionado.nome} - ${variantLabel} adicionado à comanda!`)
  }

  // Remover item da comanda
  const removerItem = (numeroComanda: number, itemId: string) => {
    setComandas(prev => {
      const novasComandas = prev.map(comanda => {
        if (comanda.numero === numeroComanda) {
          const novosItens = comanda.itens.filter(item => item.id !== itemId)
          const novoTotal = calcularTotalComanda(novosItens)
          const aberta = novosItens.length > 0

          return {
            ...comanda,
            itens: novosItens,
            total: novoTotal,
            aberta
          }
        }
        return comanda
      })

      return novasComandas
    })
  }

  // Limpar comanda
  const handleLimparComanda = (numeroComanda: number) => {
    setComandaParaLimpar(numeroComanda)
  }

  const confirmarLimparComanda = async () => {
    if (!comandaParaLimpar) return

    try {
      // Buscar e excluir do banco
      const comandaBanco = await comandaService.buscarAbertaPorNumero(comandaParaLimpar)
      if (comandaBanco) {
        await comandaService.excluir(comandaBanco.id)
      }

      setComandas(prev => prev.map(comanda => {
        if (comanda.numero === comandaParaLimpar) {
          return {
            ...comanda,
            itens: [],
            total: 0,
            aberta: false
          }
        }
        return comanda
      }))

      if (visualizandoComanda === comandaParaLimpar) {
        setVisualizandoComanda(null)
      }
      
      if (comandaSelecionada === comandaParaLimpar) {
        setComandaSelecionada(null)
      }

      setComandaParaLimpar(null)
    } catch (error) {
      console.error('Erro ao limpar comanda:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao limpar comanda. Tente novamente.',
        tipo: 'erro'
      })
      setComandaParaLimpar(null)
    }
  }

  // Calcular total da comanda
  const calcularTotalComanda = (itens: ItemComanda[]) => {
    return itens.reduce((total, item) => {
      const precoItem = Number(item.precoTotal || 0)
      return total + precoItem
    }, 0)
  }

  // Salvar comanda no banco de dados (manual)
  const salvarComanda = async () => {
    if (!comandaSelecionada || !comandaAtual || comandaAtual.itens.length === 0) {
      toast.error('Adicione itens à comanda antes de salvar.')
      return
    }

    // Evitar chamadas duplicadas
    if (salvando) {
      return
    }

    try {
      setSalvando(true)
      await comandaService.salvarOuAtualizar({
        numero_comanda: comandaSelecionada,
        itens: comandaAtual.itens,
        subtotal: comandaAtual.total,
        total: comandaAtual.total
      })
      setMensagemDialog({
        titulo: 'Sucesso!',
        descricao: `Comanda ${comandaSelecionada} salva com sucesso!`,
        tipo: 'sucesso'
      })
    } catch (error) {
      console.error('Erro ao salvar comanda:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao salvar comanda. Tente novamente.',
        tipo: 'erro'
      })
    } finally {
      setSalvando(false)
    }
  }

  // Imprimir comanda
  const imprimirComanda = async (numeroComanda: number) => {
    const comanda = comandas.find(c => c.numero === numeroComanda)
    
    if (!comanda || comanda.itens.length === 0) {
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Comanda vazia ou não encontrada.',
        tipo: 'erro'
      })
      return
    }

    try {
      setImprimindo(true)

      // Buscar configurações de impressão
      const [configUsarQZ, configImpressora, configDensidade,
             fontBase, fontStoreName, fontSectionTitle, fontItemSub, fontTotals, fontTotalFinal] = await Promise.all([
        configuracaoService.buscarPorChave('usar_qz_tray'),
        configuracaoService.buscarPorChave('impressora_padrao'),
        configuracaoService.buscarPorChave('densidade_impressao'),
        configuracaoService.buscarPorChave('font_size_base'),
        configuracaoService.buscarPorChave('font_size_store_name'),
        configuracaoService.buscarPorChave('font_size_section_title'),
        configuracaoService.buscarPorChave('font_size_item_sub'),
        configuracaoService.buscarPorChave('font_size_totals'),
        configuracaoService.buscarPorChave('font_size_total_final')
      ])

      const usarQZTray = configUsarQZ?.valor === 'true'
      const impressoraPadrao = configImpressora?.valor || ''
      const densidadeImpressao = parseInt(configDensidade?.valor || '3')
      
      const fontSizes = {
        base: parseInt(fontBase?.valor || '11'),
        storeName: parseInt(fontStoreName?.valor || '16'),
        sectionTitle: parseInt(fontSectionTitle?.valor || '11'),
        itemSub: parseInt(fontItemSub?.valor || '10'),
        totals: parseInt(fontTotals?.valor || '12'),
        totalFinal: parseInt(fontTotalFinal?.valor || '14')
      }

      // Buscar configurações da loja
      const [configNome, configEndereco, configTelefone] = await Promise.all([
        configuracaoService.buscarPorChave('nome_loja'),
        configuracaoService.buscarPorChave('endereco_loja'),
        configuracaoService.buscarPorChave('telefone_loja')
      ])

      const nomeEstabelecimento = configNome?.valor || 'Estabelecimento'
      const enderecoEstabelecimento = configEndereco?.valor || ''
      const telefoneEstabelecimento = configTelefone?.valor || ''

      // Gerar HTML para impressão
      const htmlThermal = gerarHTMLImpressaoComanda(
        comanda,
        nomeEstabelecimento,
        enderecoEstabelecimento,
        telefoneEstabelecimento,
        densidadeImpressao,
        fontSizes,
        0, // desconto (comandas não finalizadas não têm desconto)
        'valor' // tipo_desconto
      )

      // Tentar imprimir com fallback automático
      if (usarQZTray && impressoraPadrao) {
        const resultado = await qzTrayService.printHTMLWithFallback(impressoraPadrao, htmlThermal)
        
        if (resultado.method === 'qz') {
          setMensagemDialog({
            titulo: 'Sucesso!',
            descricao: `Comanda ${numeroComanda} enviada para impressora térmica!`,
            tipo: 'sucesso'
          })
        } else if (resultado.method === 'browser') {
          setMensagemDialog({
            titulo: 'Sucesso!',
            descricao: `Comanda ${numeroComanda} enviada para impressão. (QZ Tray não disponível, usando impressão do navegador)`,
            tipo: 'sucesso'
          })
        }
      } else {
        // Se QZ Tray não está configurado, usar impressão nativa diretamente
        qzTrayService.printHTMLWithFallback('', htmlThermal)
        setMensagemDialog({
          titulo: 'Sucesso!',
          descricao: `Comanda ${numeroComanda} enviada para impressão do navegador.`,
          tipo: 'sucesso'
        })
      }
    } catch (error) {
      console.error('Erro ao imprimir comanda:', error)
      setMensagemDialog({
        titulo: 'Erro',
        descricao: 'Erro ao processar impressão. Tente novamente.',
        tipo: 'erro'
      })
    } finally {
      setImprimindo(false)
    }
  }

  // Gerar HTML para impressão de comanda
  const gerarHTMLImpressaoComanda = (
    comanda: Comanda,
    nomeEstabelecimento: string,
    enderecoEstabelecimento: string,
    telefoneEstabelecimento: string,
    densidadeImpressao: number,
    fontSizes: {
      base: number
      storeName: number
      sectionTitle: number
      itemSub: number
      totals: number
      totalFinal: number
    },
    desconto: number = 0,
    tipo_desconto: 'valor' | 'percentual' = 'valor'
  ): string => {
    const fontWeight = 200 + (densidadeImpressao * 100)
    
    const formatarHora = (data: Date) => {
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Calcular desconto se houver
    const temDesconto = desconto > 0
    const descontoCalculado = temDesconto 
      ? calcularDescontoEmReais(desconto, tipo_desconto, comanda.total)
      : 0
    const subtotalComDesconto = temDesconto 
      ? comanda.total - descontoCalculado
      : comanda.total

    return `
<html>
<head>
  <style>
    @page { 
      size: 70mm auto; 
      margin: 0; 
    }
    @media print { 
      body { 
        margin: 0; 
        -webkit-print-color-adjust: exact; 
      } 
    }
    body {
      width: 70mm;
      font-family: "Courier New", Courier, monospace;
      font-size: ${fontSizes.base}px;
      color: #000;
      line-height: 1.2;
      word-break: break-word;
      padding: 2mm;
      margin: 0;
      font-weight: ${fontWeight};
    }
    .header { 
      text-align: center; 
      margin-bottom: 6px; 
    }
    .store-name { 
      font-size: ${fontSizes.storeName}px; 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      letter-spacing: 1px; 
    }
    .store-address, .store-contact { 
      font-size: ${fontSizes.itemSub}px; 
    }
    .section-title { 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      font-size: ${fontSizes.sectionTitle}px;
      margin-top: 6px; 
      margin-bottom: 4px; 
    }
    .divider { 
      border-top: 2px solid #000; 
      margin: 6px 0; 
    }
    .info-block { 
      font-size: ${fontSizes.base}px; 
    }
    .info-row { 
      margin-bottom: 2px; 
    }
    .items { 
      margin-top: 4px; 
    }
    .item { 
      display: block; 
      margin-bottom: 4px; 
      width: 100%; 
    }
    .item-head { 
      display:flex; 
      justify-content:space-between; 
      align-items: flex-start;
    }
    .qty-name { 
      flex: 1;
      max-width: 58%; 
      white-space: normal; 
      padding-right: 1mm;
    }
    .price { 
      text-align: right; 
      white-space: nowrap;
      min-width: 32%;
    }
    .item-sub { 
      font-size: ${fontSizes.itemSub}px; 
      margin-left: 2mm; 
      margin-top: 2px; 
    }
    .totals { 
      margin-top: 6px; 
      font-size: ${fontSizes.totals}px; 
    }
    .totals .line { 
      display:flex; 
      justify-content:space-between; 
      align-items: flex-start;
      margin-bottom:2px; 
    }
    .totals .line > div:first-child {
      flex: 1;
      max-width: 58%;
      padding-right: 1mm;
    }
    .totals .line > div:last-child {
      white-space: nowrap;
      text-align: right;
      min-width: 32%;
    }
    .totals .total { 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      font-size: ${fontSizes.totalFinal}px; 
    }
    .footer { 
      text-align:center; 
      margin-top:8px; 
      font-size: ${fontSizes.itemSub}px; 
    }
    .order-id { 
      font-size: ${fontSizes.totalFinal}px; 
      font-weight: ${Math.min(fontWeight + 200, 900)}; 
      text-align:center; 
      margin:6px 0; 
    }
    .warning-box {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
      padding: 2mm;
      margin: 3mm 0;
      text-align: center;
      font-weight: ${Math.min(fontWeight + 200, 900)};
      font-size: ${fontSizes.base}px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${nomeEstabelecimento}</div>
    <div class="store-address">${enderecoEstabelecimento}</div>
    <div class="store-contact">Tel: ${telefoneEstabelecimento}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="order-id">COMANDA #${comanda.numero}</div>
  
  <div class="warning-box">
    ⚠️ COMANDA NÃO FINALIZADA - NÃO PAGO
  </div>
  
  <div class="info-block">
    <div class="info-row"><strong>Data/Hora:</strong> ${formatarHora(new Date())}</div>
    <div class="info-row"><strong>Status:</strong> Em aberto</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="section-title">Itens</div>
  <div class="items">
    ${comanda.itens.map((item: ItemComanda) => {
      const detalhesCombo = renderizarDetalhesComboHTML(item)
      const categoria = item.produto?.categoria_nome || item.produto?.categoria || ''
      
      return `
    <div class="item">
      <div class="item-head">
        <div class="qty-name">${item.quantidade}x ${item.produto.nome}</div>
        <div class="price">R$ ${(item.precoTotal || 0).toFixed(2).replace('.', ',')}</div>
      </div>
      ${detalhesCombo ? detalhesCombo : `
      ${item.variantLabel ? `<div class="item-sub"><strong>Variante:</strong> ${item.variantLabel}</div>` : ''}
      ${categoria ? `<div class="item-sub"><strong>Categoria:</strong> ${categoria}</div>` : ''}
      ${item.tamanhoSelecionado ? `<div class="item-sub"><strong>Tamanho:</strong> ${item.tamanhoSelecionado.nome} (${item.tamanhoSelecionado.tamanho})</div>` : ''}
      ${item.saboresSelecionados && item.saboresSelecionados.length > 0 ? `<div class="item-sub"><strong>Sabores:</strong> ${item.saboresSelecionados.map((s: any) => s.nome).join(', ')}</div>` : ''}
      ${item.bordaSelecionada ? `<div class="item-sub"><strong>Borda:</strong> ${item.bordaSelecionada.nome}</div>` : ''}
      ${item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 ? `<div class="item-sub"><strong>Adicionais:</strong> ${item.adicionaisSelecionados.map((a: any) => `${a.quantidade}x ${a.nome}`).join(', ')}</div>` : ''}
      ${item.observacoes ? `<div class="item-sub"><strong>Obs:</strong> ${item.observacoes}</div>` : ''}
      `}
    </div>
    `
    }).join('')}
  </div>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="line">
      <div>Subtotal:</div>
      <div>R$ ${comanda.total.toFixed(2).replace('.', ',')}</div>
    </div>
    ${temDesconto ? `
    <div class="line">
      <div>Desconto (${tipo_desconto === 'percentual' ? `${desconto}%` : ''}):</div>
      <div>-R$ ${descontoCalculado.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="divider"></div>
    <div class="line">
      <div>Subtotal c/ desc:</div>
      <div>R$ ${subtotalComDesconto.toFixed(2).replace('.', ',')}</div>
    </div>
    ` : ''}
    <div class="line total">
      <div>Total:</div>
      <div>R$ ${(temDesconto ? subtotalComDesconto : comanda.total).toFixed(2).replace('.', ',')}</div>
    </div>
  </div>
  
  <div class="divider"></div>
</body>
</html>
    `
  }

  const comandaComItens = !!comandaSelecionada && !!comandaAtual && comandaAtual.itens.length > 0
  useAtalhos({
    F2: () => { if (comandaComItens && !salvando) salvarComanda() },
    F4: () => { if (comandaComItens) setModalFinalizarAberto(true) },
  })

  // Pagamento dividido começa limpo a cada abertura do modal
  useEffect(() => {
    if (modalFinalizarAberto) setDivisaoComanda(DIVISAO_INICIAL)
  }, [modalFinalizarAberto])

  const comandaDividida = formaPagamento === 'dividido'
  const pagamentoDivididoComanda = comandaDividida && comandaAtual
    ? resolverDivisao(comandaAtual.total, divisaoComanda)
    : null

  // Finalizar comanda (simplificado)
  const finalizarComanda = async () => {
    if (!comandaSelecionada || !comandaAtual) return
    if (comandaDividida && !pagamentoDivididoComanda) {
      toast.error('Confira os valores do pagamento dividido.')
      return
    }

    try {
      setFinalizando(true)

      // Buscar comanda no banco
      const comandaBanco = await comandaService.buscarAbertaPorNumero(comandaSelecionada)

      if (!comandaBanco) {
        toast.error('Comanda não encontrada no banco de dados.')
        return
      }

      // Baixa de estoque dos itens da comanda.
      // Em duas fases: primeiro VALIDA tudo, só depois baixa. Antes a baixa era
      // item a item e, se o terceiro item falhasse, os dois primeiros já tinham
      // sido baixados sem a comanda ser finalizada (baixa parcial).
      if (comandaBanco.itens && Array.isArray(comandaBanco.itens)) {
        const itensEstoque = comandaBanco.itens
          .filter((item: any) => item.produto?.id)
          .map((item: any) => ({
            produtoId: item.produto.id,
            quantidade: item.quantidade || 1,
            variantId: item.variantId || undefined,
            nome: item.produto?.nome
          }))

        // Fase 1 — validar (requires_stock é tratado dentro do service).
        // Lança e bloqueia a finalização se faltar saldo em qualquer item.
        await stockService.validarEstoqueVenda(itensEstoque)

        // Fase 2 — baixar
        for (const item of itensEstoque) {
          try {
            await stockService.darBaixaEmVenda(
              item.produtoId,
              item.quantidade,
              item.variantId,
              'COMANDA',
              comandaBanco.id
            )
          } catch (error) {
            console.error(`❌ Erro ao dar baixa no estoque para ${item.nome}:`, error)

            // Estoque insuficiente aqui é corrida com outra venda: bloquear
            if (error instanceof Error && error.message.includes('insuficiente')) {
              throw new Error(`${item.nome}: ${error.message}`)
            }

            console.warn('⚠️ Continuando apesar do erro no estoque')
          }
        }
      }

      // Atualizar forma de pagamento (sem desconto). No pagamento dividido a
      // forma principal é a 1ª parte e as duas partes vão para o histórico.
      comandaBanco.desconto = 0
      comandaBanco.tipo_desconto = 'valor'
      comandaBanco.total = comandaAtual.total
      if (pagamentoDivididoComanda) {
        comandaBanco.forma_pagamento = pagamentoDivididoComanda.pagamento1Tipo
        comandaBanco.forma_pagamento_dividido = true
        comandaBanco.pagamento_1_tipo = pagamentoDivididoComanda.pagamento1Tipo
        comandaBanco.pagamento_1_valor = pagamentoDivididoComanda.pagamento1Valor
        comandaBanco.pagamento_2_tipo = pagamentoDivididoComanda.pagamento2Tipo
        comandaBanco.pagamento_2_valor = pagamentoDivididoComanda.pagamento2Valor
      } else {
        comandaBanco.forma_pagamento = formaPagamento
        comandaBanco.forma_pagamento_dividido = false
      }

      // Mover para histórico
      await comandaService.moverParaHistorico(comandaBanco)

      // Excluir comanda da tabela principal
      await comandaService.excluir(comandaBanco.id)

      // Limpar comanda da tela
      setComandas(prev => prev.map(comanda => {
        if (comanda.numero === comandaSelecionada) {
          return {
            ...comanda,
            itens: [],
            total: 0,
            aberta: false
          }
        }
        return comanda
      }))

      setModalFinalizarAberto(false)
      setFormaPagamento('dinheiro')
      setComandaSelecionada(null)
      
      setTimeout(() => {
        setMensagemDialog({
          titulo: 'Sucesso!',
          descricao: `Comanda ${comandaSelecionada} finalizada com sucesso!`,
          tipo: 'sucesso'
        })
      }, 100)

    } catch (error) {
      console.error('Erro ao finalizar comanda:', error)
      setModalFinalizarAberto(false)
      
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao finalizar comanda. Tente novamente.'
      
      setTimeout(() => {
        setMensagemDialog({
          titulo: 'Erro',
          descricao: mensagemErro,
          tipo: 'erro'
        })
      }, 100)
    } finally {
      setFinalizando(false)
    }
  }

  const comandaVisualizacao = visualizandoComanda !== null
    ? comandas.find(c => c.numero === visualizandoComanda)
    : null

  if (loading) {
    return <CarregandoPagina variante="cartoes" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gray-50/30 pb-20 md:pb-6">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2 justify-center md:justify-start">
              <ClipboardList className="h-6 w-6" />
              Comandas
            </h1>
            <p className="text-muted-foreground">
              Gerencie os pedidos das mesas do estabelecimento
            </p>
          </div>
          <Button
            onClick={() => setModalScannerAberto(true)}
            className="bg-primary hover:bg-primary-hover text-white flex items-center gap-2"
            disabled={!comandaSelecionada}
          >
            <Scan className="h-5 w-5" />
            <span className="hidden md:inline">Scanner</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de Produtos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seleção de Comanda */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Selecione uma Comanda</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {comandas.map((comanda) => (
                <button
                  key={comanda.numero}
                  onClick={() => setComandaSelecionada(comanda.numero)}
                  className={`relative aspect-square rounded-lg border-2 transition-all ${comandaSelecionada === comanda.numero
                    ? 'border-destructive bg-destructive/5'
                    : comanda.aberta
                      ? 'border-warning bg-warning/10 hover:border-warning'
                      : 'border-border hover:border-input'
                    }`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{comanda.numero}</span>
                    {comanda.aberta && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {comanda.itens.length}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Produtos */}
          {comandaSelecionada && (
            <>
              <FiltrosProdutos
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                categoriaAtiva={categoriaAtiva}
                setCategoriaAtiva={setCategoriaAtiva}
                categorias={categorias}
              />

              <GridProdutos
                produtos={produtosFiltrados}
                onAdicionarAoCarrinho={handleAdicionarProduto}
              />

              {combosFiltrados.length > 0 && (
                <GridCombos
                  combos={combosFiltrados}
                  onAdicionarCombo={handleAdicionarCombo}
                />
              )}
            </>
          )}
        </div>

        {/* Coluna da Comanda Selecionada */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {comandaSelecionada ? `Comanda ${comandaSelecionada}` : 'Nenhuma comanda selecionada'}
              </h2>
              <div className="flex items-center gap-2">
                {comandaSelecionada && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setComandaSelecionada(null)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Fechar comanda"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {comandaAtual && comandaAtual.itens.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imprimirComanda(comandaSelecionada!)}
                      disabled={imprimindo}
                      className="text-primary hover:text-primary-hover hover:bg-primary/5"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <DangerButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLimparComanda(comandaSelecionada!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </DangerButton>
                  </>
                )}
              </div>
            </div>

            {!comandaSelecionada ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Selecione uma comanda para começar</p>
              </div>
            ) : comandaAtual && comandaAtual.itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Adicione produtos à comanda</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {comandaAtual?.itens.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg">
                      <img
                        src={item.produto.urlImagem}
                        alt={item.produto.nome}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-food.svg'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.produto.nome}
                        </p>
                        
                        {/* Exibir variante se houver */}
                        {item.variantLabel && (
                          <p className="text-xs text-muted-foreground font-medium">
                            Variante: {item.variantLabel}
                          </p>
                        )}
                        
                        {/* Renderizar detalhes do combo se for um combo */}
                        {renderizarDetalhesCombo(item)}
                        
                        {/* Renderizar detalhes normais se não for combo */}
                        {!item.produtosCombo && (
                          <>
                            {item.tamanhoSelecionado && (
                              <p className="text-xs text-muted-foreground">
                                Tamanho: {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                              </p>
                            )}
                            {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Sabores: {item.saboresSelecionados.map(s => s.nome).join(', ')}
                              </p>
                            )}
                            {item.bordaSelecionada && (
                              <p className="text-xs text-muted-foreground">
                                Borda: {item.bordaSelecionada.nome}
                              </p>
                            )}
                            {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Adicionais: {item.adicionaisSelecionados.map(a =>
                                  `${a.quantidade}x ${a.nome}`
                                ).join(', ')}
                              </p>
                            )}
                            {item.observacoes && (
                              <p className="text-xs text-muted-foreground italic">
                                <MessageSquare className="inline h-3 w-3 mr-1" />
                                Obs: {item.observacoes}
                              </p>
                            )}
                          </>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          R$ {(item.precoUnitario || 0).toFixed(2).replace('.', ',')} x {item.quantidade}
                        </p>
                        <p className="font-bold text-sm text-[color:var(--price-color)]">
                          R$ {(item.precoTotal || 0).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (item.quantidade > 1) {
                              // Diminuir quantidade
                              setComandas(prev => {
                                const novasComandas = prev.map(comanda => {
                                  if (comanda.numero === comandaSelecionada) {
                                    const novosItens = comanda.itens.map(i => {
                                      if (i.id === item.id) {
                                        const novaQuantidade = i.quantidade - 1
                                        return {
                                          ...i,
                                          quantidade: novaQuantidade,
                                          precoTotal: (i.precoUnitario || 0) * novaQuantidade
                                        }
                                      }
                                      return i
                                    })
                                    const novoTotal = calcularTotalComanda(novosItens)

                                    return {
                                      ...comanda,
                                      itens: novosItens,
                                      total: novoTotal
                                    }
                                  }
                                  return comanda
                                })
                                return novasComandas
                              })
                            } else {
                              // Remover item
                              removerItem(comandaSelecionada!, item.id)
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantidade}</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Aumentar quantidade
                            setComandas(prev => {
                              const novasComandas = prev.map(comanda => {
                                if (comanda.numero === comandaSelecionada) {
                                  const novosItens = comanda.itens.map(i => {
                                    if (i.id === item.id) {
                                      const novaQuantidade = i.quantidade + 1
                                      return {
                                        ...i,
                                        quantidade: novaQuantidade,
                                        precoTotal: (i.precoUnitario || 0) * novaQuantidade
                                      }
                                    }
                                    return i
                                  })
                                  const novoTotal = calcularTotalComanda(novosItens)

                                  return {
                                    ...comanda,
                                    itens: novosItens,
                                    total: novoTotal
                                  }
                                }
                                return comanda
                              })
                              return novasComandas
                            })
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-2xl font-bold text-[color:var(--price-color)]">
                      R$ {comandaAtual?.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={salvarComanda}
                      disabled={salvando}
                      className="flex-1"
                    >
                      {salvando ? 'Salvando...' : 'Salvar Comanda'}
                      {!salvando && <Kbd className="ml-1 hidden md:inline-flex">F2</Kbd>}
                    </Button>
                    <Button
                      onClick={() => setModalFinalizarAberto(true)}
                      className="flex-1 text-white hover:opacity-90"
                      style={{ background: 'var(--sidebar-primary)' }}
                    >
                      Finalizar
                      <Kbd className="ml-1 hidden border-white/30 bg-white/15 text-white md:inline-flex">F4</Kbd>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Comandas Abertas */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Comandas Abertas</h3>
            <div className="space-y-2">
              {comandas.filter(c => c.aberta).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma comanda aberta
                </p>
              ) : (
                comandas
                  .filter(c => c.aberta)
                  .map(comanda => (
                    <div
                      key={comanda.numero}
                      className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => setVisualizandoComanda(comanda.numero)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{comanda.numero}</Badge>
                        <span className="text-sm">{comanda.itens.length} itens</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[color:var(--price-color)]">
                          R$ {comanda.total.toFixed(2).replace('.', ',')}
                        </span>
                        <Eye className="h-4 w-4 text-muted-foreground/70" />
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Personalização */}
      <EscolherSaborModal
        isOpen={modalSaborAberto}
        onClose={() => {
          setModalSaborAberto(false)
          setProdutoSelecionado(null)
        }}
        produto={produtoSelecionado}
        categoria={produtoSelecionado ? categorias.find(cat => cat.id === produtoSelecionado.categoria_id) || null : null}
        onConfirm={handleAdicionarComPersonalizacao}
        variant="default"
      />

      {/* Modal de Combo Personalizado */}
      <EscolherComboPersonalizadoModal
        isOpen={modalComboPersonalizadoAberto}
        combo={comboSelecionado}
        onClose={() => {
          setModalComboPersonalizadoAberto(false)
          setComboSelecionado(null)
        }}
        onConfirm={handleAdicionarComboPersonalizado}
      />

      {/* Modal de Seleção de Variante */}
      <SelecionarVarianteModal
        isOpen={modalVarianteAberto}
        onClose={() => {
          setModalVarianteAberto(false)
          setProdutoSelecionado(null)
        }}
        produto={produtoSelecionado as any}
        onConfirmar={handleConfirmarVariante}
      />

      {/* Modal de Scanner de Código de Barras */}
      <Dialog open={modalScannerAberto} onOpenChange={setModalScannerAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Produto por Código de Barras</DialogTitle>
            <DialogDescription>
              Use o leitor de código de barras ou digite manualmente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner
              onScan={handleBuscarPorCodigoBarras}
              placeholder="Aguardando leitura..."
              autoFocus={true}
              showManualInput={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Finalizar Comanda */}
      <Dialog open={modalFinalizarAberto} onOpenChange={setModalFinalizarAberto}>
        <DialogContent className="max-md:!top-0 max-md:!left-0 max-md:!translate-x-0 max-md:!translate-y-0 max-md:!max-w-full max-md:!w-full max-md:!h-full max-md:!max-h-full max-md:!rounded-none max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Comanda {comandaSelecionada}</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento para finalizar a comanda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forma-pagamento-comanda">Forma de Pagamento</Label>
              <select
                id="forma-pagamento-comanda"
                name="forma-pagamento-comanda"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartaoCredito">Cartão de Crédito</option>
                <option value="cartaoDebito">Cartão de Débito</option>
                <option value="pix">PIX</option>
                <option value="dividido">Dividir em duas formas</option>
              </select>
            </div>

            {comandaDividida && comandaAtual && (
              <PagamentoDividido
                total={comandaAtual.total}
                valor={divisaoComanda}
                onChange={setDivisaoComanda}
                disabled={finalizando}
                idBase="comanda-divisao"
              />
            )}

            {/* Resumo Simplificado */}
            <div className="border-t pt-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {comandaAtual?.total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-success">R$ {comandaAtual?.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalFinalizarAberto(false)}
              disabled={finalizando}
            >
              Cancelar
            </Button>
            <Button
              onClick={finalizarComanda}
              disabled={finalizando || (comandaDividida && !pagamentoDivididoComanda)}
              className="text-white hover:opacity-90"
              style={{ background: 'var(--sidebar-primary)' }}
            >
              {finalizando ? 'Finalizando...' : 'Confirmar Finalização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Flutuante Mobile */}
      {comandaSelecionada && comandaAtual && comandaAtual.itens.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 shadow-lg" style={{ background: 'var(--primary)' }}>
          <div className="flex items-center justify-between px-3 py-2">
            {/* Botão Salvar */}
            <Button
              onClick={salvarComanda}
              disabled={salvando}
              className="flex flex-col items-center justify-center rounded-lg p-1.5 min-w-[60px] h-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-medium mt-0.5">Salvar</span>
            </Button>

            {/* Valor Total */}
            <div className="flex items-center justify-center px-4">
              <span className="text-white text-xl font-bold tracking-tight">
                R$ {comandaAtual.total.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Botão Finalizar */}
            <button
              onClick={() => setModalFinalizarAberto(true)}
              className="flex flex-col items-center justify-center text-white hover:bg-white/10 rounded-lg p-1.5 transition-all min-w-[60px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium mt-0.5">Finalizar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Comanda */}
      <Dialog open={!!comandaVisualizacao} onOpenChange={(aberto) => { if (!aberto) setVisualizandoComanda(null) }}>
        <DialogContent className="sm:max-w-md">
          {comandaVisualizacao && (
          <>
            <div className="flex items-center gap-2 pr-8">
              <DialogTitle className="flex-1">Comanda {comandaVisualizacao.numero}</DialogTitle>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => imprimirComanda(comandaVisualizacao.numero)}
                disabled={imprimindo}
                aria-label="Imprimir comanda"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {comandaVisualizacao.itens.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/60 rounded-lg">
                    <img
                      src={item.produto.urlImagem}
                      alt={item.produto.nome}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-food.svg'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.produto.nome}
                      </p>
                      
                      {/* Exibir variante se houver */}
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground font-medium">
                          Variante: {item.variantLabel}
                        </p>
                      )}
                      
                      {/* Renderizar detalhes do combo se for um combo */}
                      {renderizarDetalhesCombo(item)}
                      
                      {/* Renderizar detalhes normais se não for combo */}
                      {!item.produtosCombo && (
                        <>
                          {item.tamanhoSelecionado && (
                            <p className="text-xs text-muted-foreground">
                              Tamanho: {item.tamanhoSelecionado.nome} ({item.tamanhoSelecionado.tamanho})
                            </p>
                          )}
                          {item.saboresSelecionados && item.saboresSelecionados.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Sabores: {item.saboresSelecionados.map(s => s.nome).join(', ')}
                            </p>
                          )}
                          {item.bordaSelecionada && (
                            <p className="text-xs text-muted-foreground">
                              Borda: {item.bordaSelecionada.nome}
                            </p>
                          )}
                          {item.adicionaisSelecionados && item.adicionaisSelecionados.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Adicionais: {item.adicionaisSelecionados.map(a =>
                                `${a.quantidade}x ${a.nome}`
                              ).join(', ')}
                            </p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground italic">
                              <MessageSquare className="inline h-3 w-3 mr-1" />
                              Obs: {item.observacoes}
                            </p>
                          )}
                        </>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        R$ {(item.precoUnitario || 0).toFixed(2).replace('.', ',')} x {item.quantidade}
                      </p>
                      <p className="font-bold text-sm text-[color:var(--price-color)]">
                        R$ {(item.precoTotal || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-[color:var(--price-color)]">
                  R$ {comandaVisualizacao.total.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <DangerButton
                onClick={() => handleLimparComanda(comandaVisualizacao.numero)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Comanda
              </DangerButton>
            </div>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar limpeza de comanda */}
      <AlertDialog open={!!comandaParaLimpar} onOpenChange={() => setComandaParaLimpar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente limpar a comanda {comandaParaLimpar}? Todos os itens serão removidos e esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <DangerButton onClick={confirmarLimparComanda}>
              Limpar Comanda
            </DangerButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para mensagens de sucesso/erro */}
      <AlertDialog 
        open={!!mensagemDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setMensagemDialog(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mensagemDialog?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {mensagemDialog?.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setMensagemDialog(null)
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
