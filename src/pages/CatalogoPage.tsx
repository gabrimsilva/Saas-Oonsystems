import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from "react-hot-toast"
import Footer from "@/components/Footer"
import CookieConsent from "@/components/CookieConsent"
import FiltroCategorias from "@/components/delivery/FiltroCategorias"
import BotaoVoltarTopo from "@/components/delivery/BotaoVoltarTopo"
import CatalogoProdutoCard, { type ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import CatalogoProdutoModal from "@/components/CatalogoProdutoModal"
import ModalInformacoesEstabelecimento from "@/components/ModalInformacoesEstabelecimento"
import LojaStatusBadge from "@/components/LojaStatusBadge"
import { ProdutoCardSkeletonGrid } from "@/components/skeletons/ProdutoCardSkeleton"
import CarrinhoCatalogoSheet from "@/components/catalogo/CarrinhoCatalogoSheet"
import SeletorModoVenda from "@/components/catalogo/SeletorModoVenda"
import { formatarReais, precoUnitario } from "@/components/catalogo/precos"
import { configuracaoService, supabase, type CategoriaSupabase } from "@/services"
import {
  lojaOnlineService,
  CONFIG_PUBLICA_PADRAO,
  type ConfigCatalogoPublica,
  type FormaPagamentoPedido
} from "@/services/lojaOnlineService"
import { useEstabelecimentoPublico } from "@/contexts/EstabelecimentoPublicoContext"
import { useCarrinhoCatalogo, chaveItem, type ItemCarrinhoCatalogo } from "@/hooks/useCarrinhoCatalogo"
import { Info, ShoppingCart } from "lucide-react"
import { chaveTelefoneLoja } from '@/services/tenant'

const FORMAS_NA_ENTREGA: FormaPagamentoPedido[] = ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito']

/** Formas aceitas na retirada/entrega a partir de `metodos_pagamento` (sem configuração: todas) */
function formasNaEntrega(metodosPagamento: string | undefined): FormaPagamentoPedido[] {
  try {
    const lista = JSON.parse(metodosPagamento ?? '')
    if (Array.isArray(lista)) {
      const aceitas = FORMAS_NA_ENTREGA.filter(f => lista.includes(f))
      if (aceitas.length > 0) return aceitas
    }
  } catch {
    /* sem configuração */
  }
  return FORMAS_NA_ENTREGA
}

export default function CatalogoPage() {
  const { estabelecimento } = useEstabelecimentoPublico()
  const estabelecimentoId = estabelecimento?.id ?? null
  const [lojaConfig, setLojaConfig] = useState<ConfigCatalogoPublica>(CONFIG_PUBLICA_PADRAO)
  const [formasEntrega, setFormasEntrega] = useState<FormaPagamentoPedido[]>(FORMAS_NA_ENTREGA)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const carrinho = useCarrinhoCatalogo(estabelecimentoId)
  const pedidosAtivos = lojaConfig.pedidos_ativos
  const modo = pedidosAtivos && lojaConfig.atacado_ativo ? carrinho.modo : 'varejo'
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([])
  const [categorias, setCategorias] = useState<CategoriaSupabase[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: '',
    logoUrl: '',
    bannerUrl: '',
    telefone: '',
    email: '',
    horarioFuncionamento: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modalInfoAberto, setModalInfoAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCatalogo | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    if (estabelecimentoId) carregarDados(estabelecimentoId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estabelecimentoId])

  const carregarDados = async (estabId: string) => {
    try {
      setLoading(true)
      setError(null)

      // O visitante enxerga produtos e categorias de todas as lojas: filtrar
      // sempre pela loja do slug.
      const [produtosResult, categoriasResult, estoque, configLoja, configsMap] = await Promise.all([
        // Colunas explícitas: o visitante não tem acesso ao custo
        supabase
          .from('produtos')
          .select('id, nome, descricao, preco, preco_promocional, preco_online, preco_atacado, categoria_nome, imagem_path, requires_stock, ativo')
          .eq('estabelecimento_id', estabId)
          .eq('ativo', true)
          .order('categoria_nome', { ascending: true })
          .order('nome', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .eq('ativa', true)
          .order('nome', { ascending: true }),
        lojaOnlineService.buscarEstoquePublico(estabId),
        lojaOnlineService.buscarConfigPublica(estabId),
        configuracaoService.buscarMultiplas([
          'nome_estabelecimento',
          'logo_url',
          'banner_url',
          'telefone',
          'email',
          'horario_funcionamento',
          'metodos_pagamento'
        ])
      ])

      if (produtosResult.error) throw produtosResult.error
      if (categoriasResult.error) throw categoriasResult.error

      // Saldo e variantes por produto
      const estoquePorProduto = new Map<string, { quantidade: number; variantes: Array<{ id: string; nome: string; quantidade: number }> }>()
      estoque.forEach(linha => {
        const atual = estoquePorProduto.get(linha.produto_id) ?? { quantidade: linha.quantidade, variantes: [] }
        if (linha.variante_id) {
          atual.variantes.push({
            id: linha.variante_id,
            nome: linha.variante_nome || 'Opção',
            quantidade: Math.max(linha.variante_quantidade, 0)
          })
        }
        estoquePorProduto.set(linha.produto_id, atual)
      })

      // Converter produtos para formato do catálogo
      const produtosCatalogo: ProdutoCatalogo[] = (produtosResult.data || []).map(p => {
        const estoqueProduto = estoquePorProduto.get(p.id)
        // Mesma regra do servidor: sem item de estoque ou requires_stock = false não controla
        const controlaEstoque = p.requires_stock !== false && !!estoqueProduto
        const saldo = Math.max(estoqueProduto?.quantidade ?? 0, 0)
        return {
          id: p.id,
          nome: p.nome,
          descricao: p.descricao || '',
          preco: Number(p.preco),
          precoPromocional: p.preco_promocional != null ? Number(p.preco_promocional) : undefined,
          precoOnline: p.preco_online != null ? Number(p.preco_online) : null,
          precoAtacado: p.preco_atacado != null ? Number(p.preco_atacado) : null,
          categoria: p.categoria_nome || 'Outros',
          urlImagem: p.imagem_path || '/placeholder-food.svg',
          estoqueDisponivel: controlaEstoque ? saldo > 0 : true,
          quantidadeEstoque: controlaEstoque ? saldo : undefined,
          requiresStock: controlaEstoque,
          controlaEstoque,
          variantes: estoqueProduto?.variantes.length ? estoqueProduto.variantes : undefined
        }
      })

      setProdutos(produtosCatalogo)
      setCategorias(categoriasResult.data || [])
      setLojaConfig(configLoja)
      setFormasEntrega(formasNaEntrega(configsMap.get('metodos_pagamento')?.valor))
      carrinho.manterApenas(new Set(produtosCatalogo.map(p => p.id)))

      // Configurações
      const telefone = configsMap.get('telefone')?.valor || ''
      if (telefone.trim() !== '') {
        localStorage.setItem(chaveTelefoneLoja(), telefone)
      }

      setConfiguracao({
        nomeEstabelecimento: configsMap.get('nome_estabelecimento')?.valor || estabelecimento?.nome || '',
        logoUrl: configsMap.get('logo_url')?.valor || '',
        bannerUrl: configsMap.get('banner_url')?.valor || '',
        telefone,
        email: configsMap.get('email')?.valor || '',
        horarioFuncionamento: configsMap.get('horario_funcionamento')?.valor || ''
      })
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err)
      setError('Erro ao carregar o catálogo. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirDetalhes = useCallback((produto: ProdutoCatalogo) => {
    setProdutoSelecionado(produto)
    setModalDetalhesAberto(true)
  }, [])

  const handleFecharModal = () => {
    setModalDetalhesAberto(false)
    setProdutoSelecionado(null)
  }

  // ---- Pedidos online (carrinho) ----
  const produtosPorId = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos])

  const totalCarrinho = useMemo(
    () =>
      carrinho.itens.reduce((soma, item) => {
        const produto = produtosPorId.get(item.produtoId)
        return produto ? soma + precoUnitario(produto, modo) * item.quantidade : soma
      }, 0),
    [carrinho.itens, produtosPorId, modo]
  )

  const { adicionar } = carrinho
  const handleAdicionarAoCarrinho = useCallback((item: ItemCarrinhoCatalogo) => {
    adicionar(item)
    const produto = produtosPorId.get(item.produtoId)
    toast.success(`${item.quantidade}x ${produto?.nome ?? 'produto'} adicionado ao carrinho`)
  }, [adicionar, produtosPorId])

  const quantidadeNoCarrinho = useCallback(
    (varianteId: string | null) => {
      if (!produtoSelecionado) return 0
      const chave = chaveItem({ produtoId: produtoSelecionado.id, varianteId })
      return carrinho.itens.find(i => chaveItem(i) === chave)?.quantidade ?? 0
    },
    [carrinho.itens, produtoSelecionado]
  )

  // Filtrar produtos por categoria
  const produtosFiltrados = categoriaAtiva === 'todos'
    ? produtos
    : produtos.filter(p => {
        // Buscar nome da categoria pelo ID
        const categoria = categorias.find(c => c.id === categoriaAtiva)
        return categoria ? p.categoria.toLowerCase() === categoria.nome.toLowerCase() : false
      })

  // Agrupar produtos por categoria
  const produtosAgrupados = categorias.reduce((acc, cat) => {
    const produtosCategoria = produtos.filter(p =>
      p.categoria.toLowerCase() === cat.nome.toLowerCase()
    )
    if (produtosCategoria.length > 0) {
      acc.push({
        categoria: cat,
        produtos: produtosCategoria
      })
    }
    return acc
  }, [] as { categoria: CategoriaSupabase; produtos: ProdutoCatalogo[] }[])

  const obterNomeCategoria = (categoriaId: string): string => {
    if (categoriaId === 'todos') return 'Todos os Produtos'
    const cat = categorias.find(c => c.id === categoriaId)
    return cat?.nome || 'Categoria'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Banner com controles sobrepostos */}
      {configuracao.bannerUrl && (
        <div className="w-full h-48 md:h-64 bg-gradient-to-r from-purple-600 to-pink-600 relative overflow-hidden">
          <img
            src={configuracao.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />

          {/* Controles sobrepostos */}
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <LojaStatusBadge className="bg-white bg-opacity-95 shadow-md" />
            <button
              onClick={() => setModalInfoAberto(true)}
              className="flex items-center gap-2 bg-white bg-opacity-95 px-4 py-2 rounded-full shadow-md text-purple-600 hover:text-purple-700 font-medium transition-colors cursor-pointer text-sm"
            >
              <Info className="h-4 w-4" />
              <span>Mais informações</span>
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Varejo / Atacado */}
        {pedidosAtivos && lojaConfig.atacado_ativo && (
          <SeletorModoVenda
            modo={modo}
            onMudar={carrinho.setModo}
            pedidoMinimoAtacado={lojaConfig.atacado_pedido_minimo}
          />
        )}

        {/* Filtro de Categorias */}
        <FiltroCategorias
          categorias={categorias}
          categoriaAtiva={categoriaAtiva}
          onCategoriaChange={setCategoriaAtiva}
        />

        {/* Loading */}
        {loading && <ProdutoCardSkeletonGrid count={6} />}

        {/* Grid de Produtos - Visualização por Categoria Ativa */}
        {!loading && categoriaAtiva === 'todos' && (
          <div className="space-y-8 mt-6">
            {produtosAgrupados.map(({ categoria, produtos: produtosCategoria }) => (
              <section key={categoria.id} id={`categoria-${categoria.id}`}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  {categoria.nome}
                  <span className="text-sm font-normal text-gray-500">
                    ({produtosCategoria.length} {produtosCategoria.length === 1 ? 'produto' : 'produtos'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {produtosCategoria.map(produto => (
                    <CatalogoProdutoCard
                      key={produto.id}
                      produto={produto}
                      onAbrirDetalhes={handleAbrirDetalhes}
                      modoVenda={pedidosAtivos ? modo : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Grid de Produtos - Categoria Específica */}
        {!loading && categoriaAtiva !== 'todos' && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {obterNomeCategoria(categoriaAtiva)}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto' : 'produtos'})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtosFiltrados.map(produto => (
                <CatalogoProdutoCard
                  key={produto.id}
                  produto={produto}
                  onAbrirDetalhes={handleAbrirDetalhes}
                  modoVenda={pedidosAtivos ? modo : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mensagem vazia */}
        {!loading && produtosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Botão Voltar ao Topo */}
      <BotaoVoltarTopo />

      {/* Modal de Detalhes */}
      <CatalogoProdutoModal
        isOpen={modalDetalhesAberto}
        onClose={handleFecharModal}
        produto={produtoSelecionado}
        whatsapp={configuracao.telefone}
        compra={pedidosAtivos ? { modo, quantidadeNoCarrinho, onAdicionar: handleAdicionarAoCarrinho } : undefined}
      />

      {/* Carrinho (loja recebendo pedidos pelo catálogo) */}
      {pedidosAtivos && estabelecimento && (
        <>
          {carrinho.quantidadeTotal > 0 && (
            <button
              type="button"
              onClick={() => setCarrinhoAberto(true)}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white pl-4 pr-5 py-3 rounded-full shadow-xl cursor-pointer max-w-[calc(100%-2rem)]"
              aria-label={`Abrir carrinho com ${carrinho.quantidadeTotal} itens`}
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2.5 bg-white text-purple-700 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {carrinho.quantidadeTotal}
                </span>
              </span>
              <span className="font-semibold whitespace-nowrap">Ver carrinho</span>
              <span className="font-bold tabular-nums whitespace-nowrap">{formatarReais(totalCarrinho)}</span>
            </button>
          )}
          <CarrinhoCatalogoSheet
            aberto={carrinhoAberto}
            onMudarAberto={setCarrinhoAberto}
            estabelecimentoId={estabelecimento.id}
            slug={estabelecimento.slug}
            itens={carrinho.itens}
            produtos={produtosPorId}
            modo={modo}
            config={lojaConfig}
            formasNaEntrega={formasEntrega}
            whatsappLoja={configuracao.telefone}
            onAlterarQuantidade={carrinho.alterarQuantidade}
            onRemover={carrinho.remover}
            onPedidoCriado={carrinho.limpar}
          />
        </>
      )}

      {/* Modal de Informações */}
      <ModalInformacoesEstabelecimento
        isOpen={modalInfoAberto}
        onClose={() => setModalInfoAberto(false)}
        nomeEstabelecimento={configuracao.nomeEstabelecimento}
        telefone={configuracao.telefone}
        email={configuracao.email}
        horarioFuncionamento={configuracao.horarioFuncionamento}
      />

      {/* Cookie Consent */}
      <CookieConsent />
    </div>
  )
}
