// @ts-nocheck
import { useState, useEffect } from "react"
import { Calculator } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"
import { DEBOUNCE_DELAYS } from "@/constants/timers"
import { produtoService, categoriaService, tamanhoService, comboService, stockService, type CategoriaSupabase } from "@/services"
import FiltrosProdutos from "@/components/pdv/FiltrosProdutos"
import GridProdutos from "@/components/pdv/GridProdutos"
import GridCombos from "@/components/pdv/GridCombos"
import CarrinhoPDV from "@/components/pdv/CarrinhoPDV"
import ModalFinalizarPedido from "@/components/pdv/ModalFinalizarPedido"
import EscolherSaborModal from "@/components/EscolherSaborModal"
import EscolherComboPersonalizadoModal from "@/components/EscolherComboPersonalizadoModal"
import BuscaUnificadaPDV from "@/components/pdv/BuscaUnificadaPDV"
import SelecionarVarianteModal from "@/components/pdv/SelecionarVarianteModal"
import ModalDescontoItem from "@/components/pdv/ModalDescontoItem"
import { type ProdutoPDV, type DadosClientePDV, type TipoDescontoItem } from "@/components/pdv/types"
import { useCarrinhoPDV } from "@/hooks/useCarrinhoPDV"
import { useFinalizarVendaPDV } from "@/hooks/useFinalizarVendaPDV"
import toast from "react-hot-toast"

/**
 * Página PDV (Ponto de Venda)
 * 
 * Permite registrar pedidos diretamente pelo sistema, com suporte a:
 * - Busca e filtro de produtos por categoria
 * - Adição de produtos simples e com personalizações (sabores, bordas, tamanhos)
 * - Gerenciamento de carrinho
 * - Combos promocionais
 * - Dados do cliente e finalização de pedido
 */
export default function PDV() {
    const [produtos, setProdutos] = useState<ProdutoPDV[]>([])
    const [combos, setCombos] = useState<any[]>([])
    const [categorias, setCategorias] = useState<CategoriaSupabase[]>([])
    const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAYS.SEARCH)
    const [loading, setLoading] = useState(true)

    // Estados do pedido (simplificado - sem dados de cliente)
    const [, setTaxaEntrega] = useState(5.00)

    // Estados dos modals (sem modal de cliente)
    const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
    const [modalSaborAberto, setModalSaborAberto] = useState(false)
    const [modalComboPersonalizadoAberto, setModalComboPersonalizadoAberto] = useState(false)
    const [modalVarianteAberto, setModalVarianteAberto] = useState(false)
    const [modalDescontoAberto, setModalDescontoAberto] = useState(false)
    const [itemDescontoIndex, setItemDescontoIndex] = useState<number>(0)
    const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoPDV | null>(null)
    const [comboSelecionado, setComboSelecionado] = useState<any>(null)
    
    // Estado para mensagens
    const [mensagemDialog, setMensagemDialog] = useState<{ titulo: string; descricao: string } | null>(null)

    // Hooks customizados
    const {
        carrinho,
        adicionarAoCarrinho,
        removerDoCarrinho,
        adicionarComPersonalizacao,
        adicionarComboSimples,
        adicionarComboPersonalizado,
        limparCarrinho,
        calcularSubtotal,
        aplicarDescontoItem,
        alterarQuantidadeItem
    } = useCarrinhoPDV(categorias)

    const { processando, finalizarVenda } = useFinalizarVendaPDV()

    // 🐛 DEBUG: Log para verificar remontagem do componente
    useEffect(() => {
        console.log('🔄 [PDV] Componente montado/atualizado')
        return () => {
            console.log('❌ [PDV] Componente desmontado')
        }
    }, [])

    // 🐛 DEBUG: Log para verificar mudanças no estado do modal
    useEffect(() => {
        console.log('🔔 [PDV] Estado do modal mudou:', modalFinalizarAberto)
    }, [modalFinalizarAberto])

    useEffect(() => {
        carregarDados()
        carregarTaxaEntrega()
    }, [])

    const carregarDados = async () => {
        try {
            setLoading(true)

            const [produtosData, categoriasData, combosData] = await Promise.all([
                produtoService.buscarTodos(),
                categoriaService.buscarAtivas(),
                comboService.buscarTodos()
            ])

            // Mapear produtos para incluir aliases
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
            setCombos(combosData.filter(combo => combo.ativo))

            // Filtrar e ordenar categorias ativas
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

    const carregarTaxaEntrega = async () => {
        try {
            const { supabase } = await import('@/lib/supabase')
            const { data } = await supabase
                .from('configuracoes')
                .select('valor')
                .eq('chave', 'taxa_entrega')
                .single()

            if (data?.valor) {
                setTaxaEntrega(parseFloat(data.valor))
            }
        } catch (error) {
            console.error('Erro ao carregar taxa de entrega:', error)
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

    // Helper: Encontrar índice de um item simples (sem personalizações) no carrinho
    const encontrarItemSimples = (produtoId: string): number => {
        return carrinho.findIndex(item => 
            item.produto.id === produtoId &&
            (!item.saboresSelecionados || item.saboresSelecionados.length === 0) &&
            !item.bordaSelecionada &&
            !item.tamanhoSelecionado &&
            (!item.adicionaisSelecionados || item.adicionaisSelecionados.length === 0) &&
            !item.observacoes &&
            !item.variantId
        )
    }

    // Handler para adicionar produto ao carrinho
    const handleAdicionarProduto = async (produto: ProdutoPDV, index?: number, fromBarcode: boolean = false) => {
        // Se foi passado um índice, apenas incrementar (não precisa verificar personalizações)
        if (index !== undefined) {
            adicionarAoCarrinho(produto, index)
            return
        }

        // Se veio de código de barras, verificar se já existe item simples
        if (fromBarcode) {
            const indexExistente = encontrarItemSimples(produto.id)
            if (indexExistente !== -1) {
                // Produto já existe no carrinho como item simples - incrementar
                adicionarAoCarrinho(produto, indexExistente)
                return
            }
            // Adicionar diretamente ao carrinho sem verificar variantes
            adicionarComPersonalizacao(
                produto, 
                [], // sem sabores
                null, // sem borda
                undefined, // sem tamanho
                1, // quantidade
                [], // sem adicionais
                undefined // sem observações
            )
            return
        }

        // FLUXO MANUAL (clique no produto) - verificar variantes e abrir modal
        
        // Verificar se produto tem variantes de estoque
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

        // SEMPRE verificar se o produto tem tamanhos cadastrados
        // Não depender apenas da flag da categoria
        let produtoTemTamanhos = false
        try {
            const tamanhos = await tamanhoService.buscarPorProduto(produto.id)
            produtoTemTamanhos = tamanhos && tamanhos.length > 0
        } catch (error) {
            console.error('Erro ao verificar tamanhos:', error)
        }

        // Se tem tamanhos, abrir modal
        if (produtoTemTamanhos) {
            setProdutoSelecionado(produto)
            setModalSaborAberto(true)
            return
        }

        // Verificar se o PRODUTO realmente tem sabores configurados
        const produtoTemSabores = produto.saboresDisponiveis && (
            (produto.quantidade_sabores && produto.quantidade_sabores > 0) ||
            (produto.quantidadeSabores && produto.quantidadeSabores > 0)
        )

        // Verificar se a categoria do produto tem configurações especiais
        const categoriaDoProduto = categorias.find(cat => cat.id === produto.categoria_id)

        // Verificar se o produto permite adicionais E a categoria tem adicionais
        type ProdutoComExtras = ProdutoPDV & { permite_adicionais?: boolean }
        type CategoriaComExtras = typeof categoriaDoProduto & { tem_adicionais?: boolean }
        const produtoTemAdicionais = (produto as ProdutoComExtras).permite_adicionais &&
            (categoriaDoProduto as CategoriaComExtras)?.tem_adicionais

        // Se o produto tem sabores ou adicionais, abrir modal de personalização
        if (produtoTemSabores || produtoTemAdicionais) {
            setProdutoSelecionado(produto)
            setModalSaborAberto(true)
        } else {
            // Produto simples - verificar se já existe no carrinho
            const indexExistente = encontrarItemSimples(produto.id)
            if (indexExistente !== -1) {
                // Produto já existe como item simples - incrementar quantidade
                adicionarAoCarrinho(produto, indexExistente)
            } else {
                // Novo item - adicionar ao carrinho
                adicionarComPersonalizacao(
                    produto, 
                    [], // sem sabores
                    null, // sem borda
                    undefined, // sem tamanho
                    1, // quantidade
                    [], // sem adicionais
                    undefined // sem observações
                )
            }
        }
    }

    // Handler para adicionar produto com personalizações
    const handleAdicionarComPersonalizacao = (
        saboresSelecionados: any[],
        bordaSelecionada: any | null,
        tamanhoSelecionado?: any,
        quantidade: number = 1,
        adicionaisSelecionados?: any[],
        observacoes?: string
    ) => {
        if (!produtoSelecionado) return
        adicionarComPersonalizacao(
            produtoSelecionado, 
            saboresSelecionados, 
            bordaSelecionada, 
            tamanhoSelecionado, 
            quantidade, 
            adicionaisSelecionados, 
            observacoes
        )
    }

    // Handler para confirmar seleção de variante
    const handleConfirmarVariante = (variantId: string, variantLabel: string) => {
        console.log('🔍 [PDV.handleConfirmarVariante] Recebido:', { variantId, variantLabel })
        if (!produtoSelecionado) return
        
        // Adicionar produto com variante ao carrinho
        adicionarComPersonalizacao(
            produtoSelecionado,
            [], // sem sabores
            null, // sem borda
            undefined, // sem tamanho
            1, // quantidade
            [], // sem adicionais
            undefined, // sem observações
            variantId,
            variantLabel
        )
        console.log('✅ [PDV.handleConfirmarVariante] Produto adicionado ao carrinho com variante:', variantLabel)
    }

    // Handler para adicionar combo ao carrinho
    const handleAdicionarCombo = async (combo: ComboSupabase) => {
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
                descricao: 'Erro ao adicionar combo. Tente novamente.'
            })
        }
    }

    // Handler para adicionar combo personalizado
    const handleAdicionarComboPersonalizado = (produtosPersonalizados: any[], quantidade: number, observacoes?: string) => {
        if (!comboSelecionado) return
        adicionarComboPersonalizado(comboSelecionado, produtosPersonalizados, quantidade, observacoes)
    }

    // Handler para abrir modal de desconto
    const handleAbrirModalDesconto = (index: number) => {
        setItemDescontoIndex(index)
        setModalDescontoAberto(true)
    }

    // Handler para aplicar desconto no item
    const handleAplicarDesconto = (itemIndex: number, desconto: number, tipoDesconto: TipoDescontoItem) => {
        aplicarDescontoItem(itemIndex, desconto, tipoDesconto)
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

            // Se for VARIANTE específica, adicionar com a variante
            if (resultado.tipo === 'variante' && resultado.variante) {
                toast.success(`${resultado.produto.nome} - ${resultado.variante.label}`, { id: 'barcode-search' })
                
                // Adicionar diretamente ao carrinho com a variante selecionada
                adicionarComPersonalizacao(
                    produtoPDV,
                    [], // sem sabores
                    null, // sem borda
                    undefined, // sem tamanho
                    1, // quantidade
                    [], // sem adicionais
                    undefined, // sem observações
                    resultado.variante.id, // variantId
                    resultado.variante.label // variantLabel
                )
                return
            }

            // Se for produto (código genérico), adicionar direto também
            // DIFERENÇA: fromBarcode = true para pular modal de variantes
            toast.success(`${resultado.produto.nome}`, { id: 'barcode-search' })
            
            // Adicionar produto ao carrinho DIRETO (sem modal, mesmo com variantes)
            await handleAdicionarProduto(produtoPDV, undefined, true)
        } catch (error) {
            console.error('Erro ao buscar por código de barras:', error)
            toast.error('Erro ao buscar produto', { id: 'barcode-search' })
        }
    }

    // Cálculos simplificados (sem entrega domicilio)
    const subtotal = calcularSubtotal()
    const total = subtotal // Sem taxa de entrega e sem desconto manual

    // Handler para iniciar finalização do pedido (simplificado)
    const handleFinalizarPedido = () => {
        if (carrinho.length === 0) {
            setMensagemDialog({
                titulo: 'Atenção',
                descricao: 'Adicione itens ao carrinho antes de finalizar o pedido.'
            })
            return
        }
        
        setModalFinalizarAberto(true)
    }

    // Handler para confirmar venda (simplificado - sem dados de cliente)
    const handleConfirmarPedido = async (dadosPagamento: {
        formaPagamento: string
        precisaTroco: boolean
        valorTroco?: number
        consumoInterno?: boolean
    }) => {
        const resultado = await finalizarVenda({
            carrinho,
            subtotal,
            dadosPagamento,
            // Sem desconto, sem entrega e sem pagamento dividido (simplificado)
            desconto: 0,
            tipoDesconto: 'valor',
            formaPagamentoDividido: false,
            consumoInterno: dadosPagamento.consumoInterno || false
        })

        if (resultado.sucesso) {
            limparCarrinho()
            setModalFinalizarAberto(false)
            setMensagemDialog({
                titulo: 'Venda Finalizada!',
                descricao: `${dadosPagamento.consumoInterno ? 'Consumo Interno registrado' : 'Venda #' + resultado.numeroVenda} com sucesso!`
            })
        } else {
            setMensagemDialog({
                titulo: 'Erro',
                descricao: resultado.erro || 'Erro ao finalizar venda. Tente novamente.'
            })
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando produtos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6 bg-gray-50/30 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Calculator className="h-6 w-6" />
                        PDV - Ponto de Venda
                    </h1>
                    <p className="text-gray-600">
                        Registre pedidos diretamente pelo sistema
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Coluna de Produtos */}
                <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                    {/* Busca Unificada - Nome ou Código de Barras */}
                    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
                        <BuscaUnificadaPDV
                            onBuscarPorNome={setSearchTerm}
                            onBuscarPorBarcode={handleBuscarPorCodigoBarras}
                            placeholder="Buscar por nome ou código de barras..."
                        />
                        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                            <p className="flex items-start gap-2">
                                <span className="text-base">💡</span>
                                <span>Digite o nome do produto para filtrar</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-base">📱</span>
                                <span>Use o leitor de código de barras (BIP) para adicionar direto ao carrinho</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-base">⌨️</span>
                                <span>Ou digite o código e pressione Enter</span>
                            </p>
                        </div>
                    </div>

                    {/* Filtros de Categoria */}
                    <div className="bg-white rounded-lg border shadow-sm p-4">
                        <h3 className="text-sm font-semibold mb-3 text-gray-700">Categorias</h3>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                            <Button
                                variant={categoriaAtiva === 'todos' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCategoriaAtiva('todos')}
                                className="text-xs md:text-sm px-2 md:px-3"
                            >
                                Todos
                            </Button>
                            {categorias.map((categoria) => (
                                <Button
                                    key={categoria.id}
                                    variant={categoriaAtiva === categoria.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoriaAtiva(categoria.id)}
                                    className="text-xs md:text-sm px-2 md:px-3"
                                >
                                    {categoria.nome}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {combosFiltrados.length > 0 && (
                        <GridCombos
                            combos={combosFiltrados}
                            onAdicionarCombo={handleAdicionarCombo}
                        />
                    )}

                    <GridProdutos
                        produtos={produtosFiltrados}
                        onAdicionarAoCarrinho={handleAdicionarProduto}
                    />
                </div>

                {/* Coluna do Carrinho (simplificado) */}
                <CarrinhoPDV
                    carrinho={carrinho}
                    onAdicionarItem={(produtoId, index) => {
                        if (index !== undefined) {
                            handleAdicionarProduto(carrinho[index].produto, index)
                        } else {
                            const produto = produtos.find(p => p.id === produtoId)
                            if (produto) handleAdicionarProduto(produto)
                        }
                    }}
                    onRemoverItem={removerDoCarrinho}
                    onLimparCarrinho={limparCarrinho}
                    entregaDomicilio={false} // Sempre false (simplificado)
                    setEntregaDomicilio={() => {}} // Função vazia (simplificado)
                    taxaEntrega={0} // Sempre 0 (simplificado)
                    taxaExtraKm={0} // Sempre 0 (simplificado)
                    dadosCliente={{} as DadosClientePDV} // Objeto vazio (simplificado)
                    onAbrirModalCliente={() => {}} // Função vazia (simplificado)
                    onFinalizarPedido={handleFinalizarPedido}
                    simplified={true}
                    onAbrirModalDesconto={handleAbrirModalDesconto}
                    onAlterarQuantidade={alterarQuantidadeItem}
                />
            </div>

            {/* Modals (sem modal de cliente) */}
            <ModalFinalizarPedido
                isOpen={modalFinalizarAberto}
                onClose={() => setModalFinalizarAberto(false)}
                onConfirmar={handleConfirmarPedido}
                subtotal={subtotal}
                taxaEntrega={0} // Sempre 0 (simplificado)
                taxaExtraKm={0} // Sempre 0 (simplificado)
                total={total}
                entregaDomicilio={false} // Sempre false (simplificado)
                processando={processando}
                simplified={true}
                carrinhoVazio={carrinho.length === 0}
            />

            {/* Modal de Seleção de Variante */}
            <SelecionarVarianteModal
                isOpen={modalVarianteAberto}
                onClose={() => {
                    setModalVarianteAberto(false)
                    setProdutoSelecionado(null)
                }}
                produto={produtoSelecionado}
                onConfirmar={handleConfirmarVariante}
            />

            {/* Modal de Seleção de Sabores */}
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
                variant="default"
            />

            {/* Modal de Desconto do Item */}
            <ModalDescontoItem
                isOpen={modalDescontoAberto}
                onClose={() => setModalDescontoAberto(false)}
                item={carrinho[itemDescontoIndex]}
                itemIndex={itemDescontoIndex}
                onAplicarDesconto={handleAplicarDesconto}
            />

            {/* Menu Flutuante Mobile (simplificado - apenas total e finalizar) */}
            {carrinho.length > 0 && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 shadow-lg" style={{ background: 'var(--primary)' }}>
                    <div className="flex items-center justify-between px-6 py-3">
                        {/* Valor Total */}
                        <div className="flex items-center justify-center">
                            <span className="text-white text-xl font-bold tracking-tight">
                                R$ {total.toFixed(2).replace('.', ',')}
                            </span>
                        </div>

                        {/* Botão Finalizar */}
                        <button
                            onClick={handleFinalizarPedido}
                            className="flex items-center justify-center text-white bg-white/20 hover:bg-white/30 rounded-lg px-6 py-2 transition-all"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Finalizar</span>
                        </button>
                    </div>
                </div>
            )}

            {/* AlertDialog para mensagens */}
            <AlertDialog open={!!mensagemDialog} onOpenChange={() => setMensagemDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{mensagemDialog?.titulo}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {mensagemDialog?.descricao}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setMensagemDialog(null)}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}