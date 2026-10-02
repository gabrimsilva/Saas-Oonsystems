import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
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
import EscolherSaborModal from "@/components/EscolherSaborModal"
import EscolherComboPersonalizadoModal from "@/components/EscolherComboPersonalizadoModal"
import InformacoesEstabelecimentoModal from "@/components/InformacoesEstabelecimentoModal"
import DetalhesProdutoModal from "@/components/DetalhesProdutoModal"
import SelecionarVarianteModal from "@/components/pdv/SelecionarVarianteModal"
import CombosSection from "@/components/CombosSection"
import Header from "@/components/Header"
import CarrinhoSheet from "@/components/CarrinhoSheet"
import Footer from "@/components/Footer"
import FiltroCategorias from "@/components/delivery/FiltroCategorias"
import GridProdutos from "@/components/delivery/GridProdutos"
import SecaoCategoria from "@/components/delivery/SecaoCategoria"
import BotoesFlutantes from "@/components/delivery/BotoesFlutantes"
import { ProdutoCardSkeletonGrid } from "@/components/skeletons/ProdutoCardSkeleton"
import { useCarrinho } from "@/hooks/useCarrinho"
import { useFiltrosProdutos } from "@/hooks/useFiltrosProdutos"
import type { Produto } from '@/components/delivery/ProdutoCard'
import type { Sabor, Borda, Tamanho } from '@/hooks/useCarrinho'
import { produtoService, categoriaService, configuracaoService, comboService, tamanhoService, type CategoriaSupabase, type ComboSupabase } from "@/services"

interface DeliveryPageProps {
  onNavigateToCheckout: () => void
}

// Helper para criar produto a partir de combo
const criarProdutoCombo = (combo: ComboSupabase, precoAdicional: number = 0, personalizado: boolean = false): Produto => ({
  id: personalizado ? `${combo.id}-${Date.now()}` : combo.id,
  nome: combo.nome,
  descricao: `${combo.descricao}${personalizado ? ' - Personalizado' : ` - Economize ${combo.desconto.toFixed(1)}%`}`,
  preco: combo.preco_combo + precoAdicional,
  categoria: 'combo',
  urlImagem: combo.url_imagem || '',
  saboresDisponiveis: false,
  quantidadeSabores: 0
})

export default function DeliveryPage({ onNavigateToCheckout }: DeliveryPageProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [combos, setCombos] = useState<ComboSupabase[]>([])
  const [categorias, setCategorias] = useState<CategoriaSupabase[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'Sua Empresa',
    logoUrl: '',
    bannerUrl: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [modalSaborAberto, setModalSaborAberto] = useState(false)
  const [modalComboPersonalizadoAberto, setModalComboPersonalizadoAberto] = useState(false)
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modalVarianteAberto, setModalVarianteAberto] = useState(false)
  const [dialogLimparAberto, setDialogLimparAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [comboSelecionado, setComboSelecionado] = useState<ComboSupabase | null>(null)

  const {
    carrinho,
    adicionarItem,
    removerProdutoSimples,
    limparCarrinho,
    getQuantidadeProduto,
    incrementarItem,
    removerItem
  } = useCarrinho()

  const { produtosFiltrados, produtosAgrupados, obterNomeCategoria } = useFiltrosProdutos(produtos, categorias, categoriaAtiva)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Otimizado: buscar configurações em uma única query em vez de 5 queries separadas
      const [produtosData, combosData, categoriasData, configsMap] = await Promise.all([
        produtoService.buscarTodos(),
        comboService.buscarTodos(),
        categoriaService.buscarAtivas(),
        configuracaoService.buscarMultiplas([
          'nome_loja',
          'logo_url',
          'banner_url'
        ])
      ])

      // 🆕 Verificar estoque de cada produto
      const produtosComEstoque = await Promise.all(
        produtosData.map(async (p) => {
          let estoqueDisponivel = true
          let quantidadeEstoque = 0

          try {
            // Verificar se o produto requer controle de estoque
            const requiresStock = (p as any).requires_stock ?? true
            
            if (requiresStock) {
              // Importar stockService dinamicamente para evitar circular dependency
              const { stockService } = await import('@/services')
              const stockItem = await stockService.buscarPorProduto(p.id)
              
              if (stockItem) {
                quantidadeEstoque = stockItem.quantidade
                estoqueDisponivel = stockItem.quantidade > 0
              } else {
                // Se requires_stock = true mas não tem stock_item, considerar indisponível
                estoqueDisponivel = false
                quantidadeEstoque = 0
              }
            } else {
              // Se não requer estoque, sempre disponível
              estoqueDisponivel = true
              quantidadeEstoque = 999 // Valor simbólico para "sem controle"
            }
          } catch (error) {
            console.warn(`Não foi possível verificar estoque do produto ${p.nome}:`, error)
            // Se não conseguir verificar, assume que está disponível
            estoqueDisponivel = true
          }

          return {
            ...p,
            categoria: p.categoria_nome || 'outros',
            urlImagem: p.imagem_path || '/placeholder-food.svg',
            precoPromocional: p.preco_promocional,
            saboresDisponiveis: p.sabores_disponiveis,
            quantidadeSabores: p.quantidade_sabores,
            permite_adicionais: (p as any).permite_adicionais,
            estoqueDisponivel, // 🆕 Flag de disponibilidade
            quantidadeEstoque  // 🆕 Quantidade em estoque
          }
        })
      )

      setProdutos(produtosComEstoque)
      setCombos(combosData)
      setCategorias(categoriasData.filter(c => c.ativa).sort((a, b) => a.ordem - b.ordem))

      // Extrair valores do Map com fallbacks
      setConfiguracao({
        nomeEstabelecimento: configsMap.get('nome_loja')?.valor || 'Sua Empresa',
        logoUrl: configsMap.get('logo_url')?.valor || '',
        bannerUrl: configsMap.get('banner_url')?.valor || ''
      })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do sistema')
    } finally {
      setLoading(false)
    }
  }

  // Funções de gerenciamento de carrinho (memoizadas com useCallback)
  const abrirDetalhes = useCallback((produto: Produto) => {
    setProdutoSelecionado(produto)
    setModalDetalhesAberto(true)
  }, [])

  const adicionarAoCarrinho = useCallback(async (produto: any) => {
    console.log('CLICK_ADICIONAR', produto.id, produto.nome)
    
    // 🆕 VALIDAR ESTOQUE ANTES DE ADICIONAR
    if (produto.estoqueDisponivel === false) {
      toast.error(`${produto.nome} está indisponível no momento`)
      return
    }
    
    const categoriaDoProduto = categorias.find(cat => cat.id === produto.categoria_id)

    // PRIMEIRO: Verificar se produto tem variantes de estoque
    try {
      const { stockService } = await import('@/services')
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

    // SEMPRE verificar se o produto tem tamanhos cadastrados
    let produtoTemTamanhos = false
    try {
      const tamanhos = await tamanhoService.buscarPorProduto(produto.id)
      produtoTemTamanhos = tamanhos && tamanhos.length > 0
    } catch (error) {
      console.error('❌ Erro ao buscar tamanhos:', error)
      produtoTemTamanhos = false
    }

    const produtoTemSabores = produto.saboresDisponiveis && produto.quantidade_sabores > 0

    // Verificar se precisa abrir modal de personalização
    if (
      produtoTemSabores ||
      produtoTemTamanhos ||
      (produto.permite_adicionais && (categoriaDoProduto as any)?.tem_adicionais)
    ) {
      console.log('ABRINDO_MODAL', produto.id)
      setProdutoSelecionado(produto)
      setModalDetalhesAberto(false)
      setModalSaborAberto(true)
      return
    }

    console.log('ADICIONANDO_DIRETO', produto.id, produto.nome)
    // Produto simples - adicionar diretamente sem observações
    adicionarItem({
      produto: {
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        precoPromocional: produto.precoPromocional,
        categoria: produto.categoria,
        urlImagem: produto.urlImagem,
        saboresDisponiveis: produto.saboresDisponiveis,
        quantidadeSabores: produto.quantidadeSabores
      },
      quantidade: 1,
      observacoes: undefined,
      saboresSelecionados: undefined,
      adicionaisSelecionados: undefined,
      tamanhoSelecionado: undefined,
      bordaSelecionada: undefined
    })
    toast.success('Produto adicionado ao carrinho!')
  }, [categorias, adicionarItem])

  const adicionarComSabores = useCallback((
    saboresSelecionados: Sabor[],
    bordaSelecionada: Borda | null,
    tamanhoSelecionado?: Tamanho,
    quantidade: number = 1,
    adicionais?: any[],
    observacoes?: string
  ) => {
    if (!produtoSelecionado) return

    adicionarItem({
      produto: {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        descricao: produtoSelecionado.descricao,
        preco: produtoSelecionado.preco,
        precoPromocional: produtoSelecionado.precoPromocional,
        categoria: produtoSelecionado.categoria,
        urlImagem: produtoSelecionado.urlImagem,
        saboresDisponiveis: produtoSelecionado.saboresDisponiveis,
        quantidadeSabores: produtoSelecionado.quantidadeSabores
      },
      quantidade,
      saboresSelecionados,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado,
      adicionaisSelecionados: adicionais,
      observacoes
    })

    setProdutoSelecionado(null) // Limpar o estado após adicionar
  }, [produtoSelecionado, adicionarItem])

  const adicionarComboAoCarrinho = useCallback(async (combo: ComboSupabase) => {
    console.error(`%c🟠 adicionarComboAoCarrinho - ${combo.nome}`, 'color: orange; font-size: 12px')
    
    // PROTEÇÃO: Verificar que só está adicionando UM combo
    if (!combo || !combo.id) {
      console.error('❌ COMBO INVÁLIDO!')
      return
    }
    
    try {
      const produtosCombo = await comboService.buscarProdutosCombo(combo.id)
      
      const temPersonalizacao = await Promise.all(
        produtosCombo.map(async (p) => {
          if (p.sabores_disponiveis || p.quantidade_sabores > 0) return true
          try {
            const tamanhos = await tamanhoService.buscarPorProduto(p.id)
            return tamanhos?.length > 0
          } catch {
            return false
          }
        })
      )

      if (temPersonalizacao.some(Boolean)) {
        console.log('✅ Abrindo modal de personalização do combo')
        setComboSelecionado(combo)
        setModalComboPersonalizadoAberto(true)
        return
      }

      console.log('✅ Adicionando combo simples:', combo.nome)
      adicionarItem({ 
        produto: criarProdutoCombo(combo), 
        quantidade: 1,
        observacoes: undefined
      })
      toast.success('Combo adicionado ao carrinho!')
    } catch (error) {
      console.error('❌ Erro ao adicionar combo:', error)
    }
  }, [adicionarItem])

  const adicionarComboPersonalizadoAoCarrinho = useCallback((produtosPersonalizados: any[], quantidade: number, observacoes?: string) => {
    if (!comboSelecionado) return

    const precoAdicional = produtosPersonalizados.reduce((total, p) => {
      let preco = 0
      if (p.saboresSelecionados) preco += p.saboresSelecionados.reduce((sum: number, s: any) => sum + (s.preco || 0), 0)
      if (p.bordaSelecionada) preco += p.bordaSelecionada.preco || 0
      if (p.tamanhoSelecionado) preco += p.tamanhoSelecionado.valor || 0
      return total + preco
    }, 0)

    adicionarItem({
      produto: criarProdutoCombo(comboSelecionado, precoAdicional, true),
      quantidade,
      produtosCombo: produtosPersonalizados, // Adicionar produtos do combo
      saboresSelecionados: produtosPersonalizados.flatMap(p => p.saboresSelecionados || []),
      bordaSelecionada: produtosPersonalizados.find(p => p.bordaSelecionada)?.bordaSelecionada,
      tamanhoSelecionado: produtosPersonalizados.find(p => p.tamanhoSelecionado)?.tamanhoSelecionado,
      observacoes: observacoes // Observações do combo inteiro
    })

    setComboSelecionado(null) // Limpar o estado após adicionar
  }, [comboSelecionado, adicionarItem])

  const confirmarLimparCarrinho = useCallback(() => {
    limparCarrinho()
    setDialogLimparAberto(false)
  }, [limparCarrinho])

  const temPromocoes = produtos.some(p => p.precoPromocional && p.precoPromocional > 0)
  const tituloCategoria = categoriaAtiva === 'todos' ? 'Todos os Produtos' :
    categoriaAtiva === 'promocoes' ? 'Promoções' :
      categorias.find(c => c.id === categoriaAtiva)?.nome || categoriaAtiva

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header
          nomeEstabelecimento={configuracao.nomeEstabelecimento}
          logoUrl={configuracao.logoUrl}
          bannerUrl={configuracao.bannerUrl}
          onMaisInformacoes={() => {}}
        />

        <div className="max-w-6xl mx-auto px-4 py-6 pb-0">
          <div className="mb-6">
            <div className="h-10 bg-muted rounded-md animate-pulse w-full max-w-md" />
          </div>

          <div className="pb-8">
            <div className="h-7 bg-muted rounded-md animate-pulse w-48 mb-4" />
            <ProdutoCardSkeletonGrid count={8} />
          </div>
        </div>

        <Footer nomeEstabelecimento={configuracao.nomeEstabelecimento} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={carregarDados} variant="outline">Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        nomeEstabelecimento={configuracao.nomeEstabelecimento}
        logoUrl={configuracao.logoUrl}
        bannerUrl={configuracao.bannerUrl}
        onMaisInformacoes={() => setModalInfoAberto(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-0">
        <FiltroCategorias
          categorias={categorias}
          categoriaAtiva={categoriaAtiva}
          onCategoriaChange={setCategoriaAtiva}
          mostrarTodos
          mostrarPromocoes
          temPromocoes={temPromocoes}
        />

        <div className="pb-8">
          <h2 className="text-xl font-bold mb-4">{tituloCategoria}</h2>

          {categoriaAtiva === 'todos' && produtosAgrupados ? (
            <div className="space-y-8">
              <CombosSection
                combos={combos}
                getQuantidadeNoCarrinho={getQuantidadeProduto}
                onAdicionarCombo={adicionarComboAoCarrinho}
                onRemoverCombo={removerProdutoSimples}
              />

              {Object.entries(produtosAgrupados).map(([categoria, produtos]) =>
                produtos.length > 0 && (
                  <SecaoCategoria
                    key={categoria}
                    nomeCategoria={obterNomeCategoria(categoria)}
                    produtos={produtos as Produto[]}
                    getQuantidadeNoCarrinho={getQuantidadeProduto}
                    onAdicionarProduto={adicionarAoCarrinho}
                    onRemoverProduto={removerProdutoSimples}
                    onAbrirDetalhes={abrirDetalhes}
                  />
                )
              )}
            </div>
          ) : (
            <GridProdutos
              produtos={produtosFiltrados as Produto[]}
              getQuantidadeNoCarrinho={getQuantidadeProduto}
              onAdicionarProduto={adicionarAoCarrinho}
              onRemoverProduto={removerProdutoSimples}
              onAbrirDetalhes={abrirDetalhes}
            />
          )}
        </div>
      </div>

      <BotoesFlutantes />

      <Footer nomeEstabelecimento={configuracao.nomeEstabelecimento} />


      <CarrinhoSheet
        carrinho={carrinho as any}
        carrinhoAberto={carrinhoAberto}
        setCarrinhoAberto={setCarrinhoAberto}
        onRemoverDoCarrinho={(produtoId, index) => index !== undefined ? removerItem(index) : removerProdutoSimples(produtoId)}
        onIncrementarItem={incrementarItem}
        onNavigateToCheckout={onNavigateToCheckout}
        onLimparCarrinho={limparCarrinho}
      />

      <EscolherSaborModal
        isOpen={modalSaborAberto}
        onClose={() => {
          setModalSaborAberto(false)
          setProdutoSelecionado(null)
        }}
        produto={produtoSelecionado}
        categoria={produtoSelecionado ? categorias.find(c => c.id === (produtoSelecionado as any).categoria_id) || null : null}
        onConfirm={(sabores, borda, tamanho, qtd, adicionais, observacoes) => adicionarComSabores(sabores, borda, tamanho || undefined, qtd, adicionais, observacoes)}
      />

      <EscolherComboPersonalizadoModal
        isOpen={modalComboPersonalizadoAberto}
        onClose={() => {
          setModalComboPersonalizadoAberto(false)
          setComboSelecionado(null)
        }}
        combo={comboSelecionado}
        onConfirm={adicionarComboPersonalizadoAoCarrinho}
      />

      <InformacoesEstabelecimentoModal
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
      />

      <DetalhesProdutoModal
        isOpen={modalDetalhesAberto}
        onClose={() => {
          setModalDetalhesAberto(false)
          setProdutoSelecionado(null)
        }}
        produto={produtoSelecionado}
        onAdicionar={adicionarAoCarrinho}
      />

      <SelecionarVarianteModal
        isOpen={modalVarianteAberto}
        onClose={() => {
          setModalVarianteAberto(false)
          setProdutoSelecionado(null)
        }}
        produto={produtoSelecionado as any}
        onConfirmar={(variantId: string, variantLabel: string) => {
          if (!produtoSelecionado) return
          
          adicionarItem({
            produto: {
              id: produtoSelecionado.id,
              nome: produtoSelecionado.nome,
              descricao: produtoSelecionado.descricao,
              preco: produtoSelecionado.preco,
              precoPromocional: produtoSelecionado.precoPromocional,
              categoria: produtoSelecionado.categoria,
              urlImagem: produtoSelecionado.urlImagem,
              saboresDisponiveis: produtoSelecionado.saboresDisponiveis,
              quantidadeSabores: produtoSelecionado.quantidadeSabores
            },
            quantidade: 1,
            variantId,
            variantLabel,
            observacoes: undefined
          })

          setModalVarianteAberto(false)
          setProdutoSelecionado(null)
          toast.success(`${produtoSelecionado.nome} - ${variantLabel} adicionado ao carrinho!`)
        }}
      />

      <AlertDialog open={dialogLimparAberto} onOpenChange={setDialogLimparAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todos os itens do carrinho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarLimparCarrinho}>Limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
