import { useState, useEffect } from 'react'
import Footer from "@/components/Footer"
import CookieConsent from "@/components/CookieConsent"
import FiltroCategorias from "@/components/delivery/FiltroCategorias"
import BotaoVoltarTopo from "@/components/delivery/BotaoVoltarTopo"
import CatalogoProdutoCard, { type ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import CatalogoProdutoModal from "@/components/CatalogoProdutoModal"
import ModalInformacoesEstabelecimento from "@/components/ModalInformacoesEstabelecimento"
import LojaStatusBadge from "@/components/LojaStatusBadge"
import { ProdutoCardSkeletonGrid } from "@/components/skeletons/ProdutoCardSkeleton"
import { configuracaoService, supabase, type CategoriaSupabase } from "@/services"
import { Info } from "lucide-react"
import { chaveTelefoneLoja } from '@/services/tenant'

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([])
  const [categorias, setCategorias] = useState<CategoriaSupabase[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [configuracao, setConfiguracao] = useState({
    nomeEstabelecimento: 'LIRI E-Commerce',
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
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar produtos diretamente - SEM filtro de estabelecimento para catálogo público
      console.log('🔍 Buscando produtos ativos (catálogo público)')
      
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('categoria_nome', { ascending: true })
        .order('nome', { ascending: true })

      if (produtosError) {
        console.error('❌ Erro ao buscar produtos:', produtosError)
        throw produtosError
      }

      console.log('✅ Produtos retornados do Supabase:', produtosData?.length || 0)

      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true)
        .order('nome', { ascending: true })

      if (categoriasError) {
        console.error('❌ Erro ao buscar categorias:', categoriasError)
        throw categoriasError
      }

      console.log('✅ Categorias retornadas do Supabase:', categoriasData?.length || 0)

      // Buscar estoque de todos os produtos
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('stock_items')
        .select('product_id, quantidade')

      if (estoqueError) {
        console.warn('⚠️ Erro ao buscar estoque:', estoqueError)
      }

      // Criar mapa de estoque por product_id
      const estoqueMap = new Map<string, number>()
      estoqueData?.forEach(e => {
        // quantidade é string no banco, converter para número
        const qtd = parseFloat(e.quantidade) || 0
        estoqueMap.set(e.product_id, qtd)
      })

      const configsMap = await configuracaoService.buscarMultiplas([
        'nome_estabelecimento',
        'logo_url',
        'banner_url',
        'telefone',
        'email',
        'horario_funcionamento'
      ])

      // Converter produtos para formato do catálogo
      const produtosCatalogo: ProdutoCatalogo[] = (produtosData || [])
        .filter(p => p.ativo)
        .map(p => {
          const requiresStock = !!p.requires_stock
          const saldoEstoque = estoqueMap.get(p.id) ?? 0
          return {
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || '',
            preco: p.preco,
            precoPromocional: p.preco_promocional,
            categoria: p.categoria_nome || 'Outros',
            urlImagem: p.imagem_path || '/placeholder-food.svg',
            // Produtos sem controle de estoque são sempre considerados disponíveis
            estoqueDisponivel: requiresStock ? saldoEstoque > 0 : true,
            quantidadeEstoque: saldoEstoque,
            requiresStock
          }
        })

      console.log('📦 Produtos carregados:', produtosCatalogo.length)
      console.log('🏷️ Categorias carregadas:', categoriasData.length)
      console.log('Produtos:', produtosCatalogo)
      console.log('Categorias:', categoriasData)
      
      setProdutos(produtosCatalogo)
      setCategorias(categoriasData || [])

      // Configurações
      const nomeEstab = configsMap.get('nome_estabelecimento')?.valor || 'LIRI E-Commerce'
      const logoUrl = configsMap.get('logo_url')?.valor || ''
      const bannerUrl = configsMap.get('banner_url')?.valor || ''
      const telefone = configsMap.get('telefone')?.valor || ''
      const email = configsMap.get('email')?.valor || ''
      const horarioFuncionamento = configsMap.get('horario_funcionamento')?.valor || ''

      console.log('📞 Telefone WhatsApp carregado:', telefone)
      console.log('🔄 Configuração completa:', { telefone, email, horarioFuncionamento })
      
      // Salvar telefone no localStorage para fallback em caso de erro
      if (telefone && telefone.trim() !== '') {
        localStorage.setItem(chaveTelefoneLoja(), telefone)
        console.log('💾 Telefone salvo no localStorage para fallback')
      }

      setConfiguracao({
        nomeEstabelecimento: nomeEstab,
        logoUrl,
        bannerUrl,
        telefone,
        email,
        horarioFuncionamento
      })

    } catch (err) {
      console.error('Erro ao carregar catálogo:', err)
      setError('Erro ao carregar o catálogo. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirDetalhes = (produto: ProdutoCatalogo) => {
    setProdutoSelecionado(produto)
    setModalDetalhesAberto(true)
  }

  const handleFecharModal = () => {
    setModalDetalhesAberto(false)
    setProdutoSelecionado(null)
  }

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
      />

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
