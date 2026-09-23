import { useState } from 'react'
import { type ItemCarrinhoPDV, type ProdutoPDV, type TipoDescontoItem } from '@/components/pdv/types'
import { type CategoriaSupabase, type ComboSupabase } from "@/services"
import toast from 'react-hot-toast'

/**
 * Hook customizado para gerenciar o carrinho do PDV
 * 
 * Gerencia a adição, remoção e cálculo de preços de itens no carrinho,
 * incluindo produtos com personalizações (sabores, bordas, tamanhos).
 * 
 * ✨ PERSISTÊNCIA: O carrinho é salvo automaticamente no localStorage
 * e restaurado quando o componente monta, garantindo que o carrinho
 * não seja perdido ao trocar de aba, atualizar a página, etc.
 * 
 * @example
 * ```tsx
 * const {
 *   carrinho,
 *   adicionarAoCarrinho,
 *   removerDoCarrinho,
 *   limparCarrinho,
 *   calcularSubtotal
 * } = useCarrinhoPDV(categorias)
 * ```
 */
export function useCarrinhoPDV(categorias: CategoriaSupabase[]) {
  // 🔄 CARRINHO PERSISTENTE
  // Carrega do localStorage na primeira renderização
  const [carrinho, setCarrinho] = useState<ItemCarrinhoPDV[]>(() => {
    try {
      const carrinhoSalvo = localStorage.getItem('liri_carrinho_pdv')
      if (carrinhoSalvo) {
        return JSON.parse(carrinhoSalvo)
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error)
    }
    return []
  })

  // ✅ Salva automaticamente no localStorage sempre que o carrinho mudar
  const atualizarCarrinho = (novoCarrinho: ItemCarrinhoPDV[]) => {
    setCarrinho(novoCarrinho)
    try {
      localStorage.setItem('liri_carrinho_pdv', JSON.stringify(novoCarrinho))
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error)
    }
  }

  /**
   * Preço unitário do item antes de qualquer desconto
   * (itens antigos sem precoUnitarioOriginal derivam de precoOriginal)
   */
  const obterPrecoUnitarioOriginal = (item: ItemCarrinhoPDV) => {
    if (item.precoUnitarioOriginal) return item.precoUnitarioOriginal
    if (item.desconto && item.precoOriginal) return item.precoOriginal / item.quantidade
    return item.precoUnitario
  }

  /**
   * Recalcula os preços do item para uma quantidade, mantendo o desconto aplicado
   */
  const recalcularItem = (item: ItemCarrinhoPDV, quantidade: number): ItemCarrinhoPDV => {
    if (!item.desconto || item.desconto <= 0) {
      return { ...item, quantidade, precoTotal: item.precoUnitario * quantidade }
    }

    const precoUnitarioOriginal = obterPrecoUnitarioOriginal(item)
    const precoOriginal = precoUnitarioOriginal * quantidade

    let precoTotal: number
    if (item.tipoDesconto === 'percentual') {
      precoTotal = precoOriginal - (precoOriginal * item.desconto) / 100
    } else if (item.tipoDesconto === 'preco_fixo') {
      precoTotal = item.desconto * quantidade
    } else {
      precoTotal = precoOriginal - item.desconto
    }
    precoTotal = Math.max(0, precoTotal)

    return {
      ...item,
      quantidade,
      precoUnitarioOriginal,
      precoOriginal,
      precoTotal,
      precoUnitario: precoTotal / quantidade
    }
  }

  /**
   * Adiciona um produto ao carrinho ou incrementa quantidade de item existente
   *
   * Se o produto requer personalização (sabores, bordas, tamanhos, adicionais),
   * retorna true para indicar que um modal deve ser aberto. Caso contrário,
   * adiciona o produto diretamente ao carrinho ou incrementa a quantidade se
   * já existir um item idêntico.
   *
   * @param produto - Produto a ser adicionado ao carrinho
   * @param index - Índice do item no carrinho para incrementar quantidade (opcional)
   * @returns true se precisa abrir modal de personalização, false caso contrário
   *
   * @example
   * ```tsx
   * // Adicionar produto simples
   * const precisaModal = adicionarAoCarrinho(produto)
   * if (precisaModal) {
   *   abrirModalPersonalizacao(produto)
   * }
   *
   * // Incrementar item existente
   * adicionarAoCarrinho(produto, indexNoCarrinho)
   * ```
   */
  const adicionarAoCarrinho = (produto: ProdutoPDV, index?: number): boolean => {
    // Se foi passado um índice, incrementar o item específico
    if (index !== undefined) {
      const item = carrinho[index]
      const novoCarrinho = [...carrinho]
      novoCarrinho[index] = recalcularItem(item, item.quantidade + 1)
      atualizarCarrinho(novoCarrinho)
      return false
    }

    // Verificar se o PRODUTO realmente tem sabores configurados
    // produto.saboresDisponiveis indica se o produto tem sabores habilitados
    // produto.quantidade_sabores > 0 indica se há sabores cadastrados
    const produtoTemSabores = produto.saboresDisponiveis && (
      (produto.quantidade_sabores && produto.quantidade_sabores > 0) ||
      (produto.quantidadeSabores && produto.quantidadeSabores > 0)
    )

    // Verificar se a categoria do produto tem configurações especiais
    const categoriaDoProduto = categorias.find(cat => cat.id === produto.categoria_id)

    // Verificar se o produto permite adicionais E a categoria tem adicionais
    // Usando optional chaining em vez de as any para segurança de tipos
    type ProdutoComExtras = ProdutoPDV & { permite_adicionais?: boolean }
    type CategoriaComExtras = typeof categoriaDoProduto & { tem_adicionais?: boolean }
    const produtoTemAdicionais = (produto as ProdutoComExtras).permite_adicionais &&
      (categoriaDoProduto as CategoriaComExtras)?.tem_adicionais

    // Se o produto tem sabores configurados OU permite adicionais, retornar true
    // Nota: tamanhos são verificados de forma assíncrona no componente que chama este hook
    if (produtoTemSabores || produtoTemAdicionais) {
      return true // Indica que precisa abrir modal
    }

    // Para produtos sem sabores e sem tamanhos, adicionar diretamente
    const itemExistente = carrinho.find(
      item =>
        item.produto.id === produto.id &&
        !item.saboresSelecionados &&
        !item.tamanhoSelecionado &&
        !item.bordaSelecionada
    )
    const precoUnitario = produto.precoPromocional || produto.preco

    if (itemExistente) {
      atualizarCarrinho(
        carrinho.map(item =>
          item.produto.id === produto.id &&
          !item.saboresSelecionados &&
          !item.tamanhoSelecionado &&
          !item.bordaSelecionada
            ? recalcularItem(item, item.quantidade + 1)
            : item
        )
      )
    } else {
      const novoItem: ItemCarrinhoPDV = {
        produto,
        quantidade: 1,
        precoUnitario,
        precoTotal: precoUnitario
      }
      atualizarCarrinho([...carrinho, novoItem])
    }

    return false
  }

  /**
   * Remove um produto do carrinho ou decrementa sua quantidade
   */
  const removerDoCarrinho = (produtoId: string, index?: number) => {
    if (index !== undefined) {
      // Remover item específico do carrinho (para produtos com sabores/tamanhos/bordas)
      const item = carrinho[index]

      if (item.quantidade > 1) {
        const novoCarrinho = [...carrinho]
        novoCarrinho[index] = recalcularItem(item, item.quantidade - 1)
        atualizarCarrinho(novoCarrinho)
      } else {
        atualizarCarrinho(carrinho.filter((_, i) => i !== index))
      }
    } else {
      // Lógica original para produtos simples (sem personalizações)
      const itemExistente = carrinho.find(
        item =>
          item.produto.id === produtoId &&
          !item.saboresSelecionados &&
          !item.tamanhoSelecionado &&
          !item.bordaSelecionada
      )

      if (itemExistente && itemExistente.quantidade > 1) {
        atualizarCarrinho(
          carrinho.map(item =>
            item.produto.id === produtoId &&
            !item.saboresSelecionados &&
            !item.tamanhoSelecionado &&
            !item.bordaSelecionada
              ? recalcularItem(item, item.quantidade - 1)
              : item
          )
        )
      } else {
        atualizarCarrinho(
          carrinho.filter(
            item =>
              !(
                item.produto.id === produtoId &&
                !item.saboresSelecionados &&
                !item.tamanhoSelecionado &&
                !item.bordaSelecionada
              )
          )
        )
      }
    }
  }

  /**
   * Adiciona um produto com personalizações (sabores, bordas, tamanhos, adicionais) ao carrinho
   */
  const adicionarComPersonalizacao = (
    produto: ProdutoPDV,
    saboresSelecionados: any[],
    bordaSelecionada: any | null,
    tamanhoSelecionado?: any,
    quantidade: number = 1,
    adicionaisSelecionados?: any[],
    observacoes?: string,
    variantId?: string,
    variantLabel?: string
  ) => {
    // Calcular preço base do produto
    // Se tem tamanho selecionado, usar o valor do tamanho como preço base (substitui o preço do produto)
    // Caso contrário, usar o preço normal ou promocional do produto
    let precoBase = tamanhoSelecionado && tamanhoSelecionado.valor !== undefined
      ? tamanhoSelecionado.valor
      : (produto.precoPromocional || produto.preco)

    // Adicionar preço dos sabores premium se houver
    let precoSabores = 0
    if (saboresSelecionados && saboresSelecionados.length > 0) {
      precoSabores = saboresSelecionados.reduce((total: number, sabor: any) => {
        return total + (sabor.preco || 0)
      }, 0)
    }

    // Adicionar preço da borda se selecionada
    let precoBorda = 0
    if (bordaSelecionada && bordaSelecionada.preco) {
      precoBorda = bordaSelecionada.preco
    }

    // Adicionar preço dos adicionais se houver
    let precoAdicionais = 0
    if (adicionaisSelecionados && adicionaisSelecionados.length > 0) {
      precoAdicionais = adicionaisSelecionados.reduce((total: number, adicional: any) => {
        return total + (adicional.valor * adicional.quantidade)
      }, 0)
    }

    const precoUnitarioFinal = precoBase + precoSabores + precoBorda + precoAdicionais

    console.log('🔍 [useCarrinhoPDV.adicionarComPersonalizacao] Criando item:', {
      produtoNome: produto.nome,
      variantId,
      variantLabel,
      precoUnitarioFinal,
      quantidade
    })

    const novoItem: ItemCarrinhoPDV = {
      produto,
      quantidade,
      saboresSelecionados,
      bordaSelecionada: bordaSelecionada || undefined,
      tamanhoSelecionado: tamanhoSelecionado || undefined,
      adicionaisSelecionados: adicionaisSelecionados || undefined,
      observacoes,
      variantId,
      variantLabel,
      precoUnitario: precoUnitarioFinal,
      precoTotal: precoUnitarioFinal * quantidade
    }

    console.log('✅ [useCarrinhoPDV] Item criado:', novoItem)
    atualizarCarrinho([...carrinho, novoItem])
    toast.success('Produto adicionado ao carrinho!')
  }

  /**
   * Adiciona um combo simples (sem personalização) ao carrinho
   */
  const adicionarComboSimples = (combo: ComboSupabase, observacoes?: string) => {
    const comboProduto: ProdutoPDV = {
      id: combo.id,
      nome: combo.nome,
      descricao: `${combo.descricao} - Economize ${combo.desconto.toFixed(1)}%`,
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
    }

    const itemExistente = carrinho.find(
      item =>
        item.produto.id === combo.id &&
        !item.saboresSelecionados &&
        !item.tamanhoSelecionado &&
        !item.bordaSelecionada &&
        item.observacoes === observacoes
    )
    const precoUnitario = combo.preco_combo

    if (itemExistente) {
      atualizarCarrinho(
        carrinho.map(item =>
          item.produto.id === combo.id &&
          !item.saboresSelecionados &&
          !item.tamanhoSelecionado &&
          !item.bordaSelecionada &&
          item.observacoes === observacoes
            ? recalcularItem(item, item.quantidade + 1)
            : item
        )
      )
    } else {
      const novoItem: ItemCarrinhoPDV = {
        produto: comboProduto,
        quantidade: 1,
        observacoes,
        precoUnitario,
        precoTotal: precoUnitario
      }
      atualizarCarrinho([...carrinho, novoItem])
    }
    toast.success('Combo adicionado ao carrinho!')
  }

  /**
   * Adiciona um combo personalizado ao carrinho
   */
  const adicionarComboPersonalizado = (
    combo: ComboSupabase,
    produtosPersonalizados: any[],
    quantidade: number,
    observacoes?: string
  ) => {
    // Calcular preço base do combo
    let precoBase = combo.preco_combo

    // Adicionar preço adicional das personalizações
    let precoAdicional = 0
    produtosPersonalizados.forEach(produto => {
      if (produto.saboresSelecionados) {
        precoAdicional += produto.saboresSelecionados.reduce(
          (total: number, sabor: any) => total + (sabor.preco || 0),
          0
        )
      }
      if (produto.bordaSelecionada) {
        precoAdicional += produto.bordaSelecionada.preco || 0
      }
      if (produto.tamanhoSelecionado) {
        precoAdicional += produto.tamanhoSelecionado.valor || 0
      }
    })

    const precoUnitarioFinal = precoBase + precoAdicional

    const comboProduto: ProdutoPDV = {
      id: `${combo.id}-${Date.now()}`,
      nome: combo.nome,
      descricao: `${combo.descricao} - Personalizado - Economize ${combo.desconto.toFixed(1)}%`,
      preco: precoUnitarioFinal,
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
    }

    const novoItem: ItemCarrinhoPDV = {
      produto: comboProduto,
      quantidade,
      produtosCombo: produtosPersonalizados, // Adicionar produtos do combo
      saboresSelecionados: produtosPersonalizados.flatMap(p => p.saboresSelecionados || []),
      bordaSelecionada: produtosPersonalizados.find(p => p.bordaSelecionada)?.bordaSelecionada,
      tamanhoSelecionado: produtosPersonalizados.find(p => p.tamanhoSelecionado)?.tamanhoSelecionado,
      observacoes: observacoes, // Observações do combo inteiro
      precoUnitario: precoUnitarioFinal,
      precoTotal: precoUnitarioFinal * quantidade
    }

    atualizarCarrinho([...carrinho, novoItem])
    toast.success('Combo personalizado adicionado ao carrinho!')
  }

  /**
   * Limpa todos os itens do carrinho
   */
  const limparCarrinho = () => {
    atualizarCarrinho([])
  }

  /**
   * Calcula o subtotal do carrinho (soma de todos os itens)
   */
  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + item.precoTotal, 0)
  }

  /**
   * Calcula o total do pedido incluindo taxa de entrega
   */
  const calcularTotal = (taxaEntrega: number = 0) => {
    return calcularSubtotal() + taxaEntrega
  }

  /**
   * Aplica desconto a um item específico do carrinho
   */
  const aplicarDescontoItem = (
    itemIndex: number,
    desconto: number,
    tipoDesconto: TipoDescontoItem
  ) => {
    const item = carrinho[itemIndex]
    if (!item) return

    const novoCarrinho = [...carrinho]
    novoCarrinho[itemIndex] = recalcularItem(
      {
        ...item,
        precoUnitarioOriginal: obterPrecoUnitarioOriginal(item),
        desconto,
        tipoDesconto
      },
      item.quantidade
    )

    atualizarCarrinho(novoCarrinho)
    toast.success('Desconto aplicado!')
  }

  /**
   * Altera a quantidade de um item específico do carrinho
   */
  const alterarQuantidadeItem = (itemIndex: number, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    const item = carrinho[itemIndex]
    if (!item) return

    const novoCarrinho = [...carrinho]
    novoCarrinho[itemIndex] = recalcularItem(item, novaQuantidade)

    atualizarCarrinho(novoCarrinho)
    toast.success('Quantidade atualizada!')
  }

  return {
    carrinho,
    adicionarAoCarrinho,
    removerDoCarrinho,
    adicionarComPersonalizacao,
    adicionarComboSimples,
    adicionarComboPersonalizado,
    limparCarrinho,
    calcularSubtotal,
    calcularTotal,
    aplicarDescontoItem,
    alterarQuantidadeItem
  }
}
