import { useState, useEffect, useCallback } from 'react'
import { calcularSubtotal, calcularPrecoItem } from '@/utils/calculos'
import { chaveCarrinhoPublico } from '@/services/tenant'

/**
 * Interface para representar um sabor
 */
export interface Sabor {
  id: string
  nome: string
  descricao?: string
  categoria?: 'doce' | 'salgada'
  ingredientes?: string[]
  preco: number
}

/**
 * Interface para representar uma borda
 */
export interface Borda {
  id: string
  nome: string
  preco: number
}

/**
 * Interface para representar um tamanho
 */
export interface Tamanho {
  id: string
  nome: string
  valor: number
  tamanho: string
}

/**
 * Interface para representar um produto
 */
export interface ProdutoCarrinho {
  id: string
  nome: string
  descricao: string
  preco: number
  precoPromocional?: number
  categoria?: string
  urlImagem?: string
  saboresDisponiveis?: boolean
  quantidadeSabores?: number
}

/**
 * Interface para representar um adicional selecionado
 */
export interface AdicionalSelecionado {
  id: string
  nome: string
  valor: number
  quantidade: number
}

/**
 * Interface para representar um item no carrinho
 */
export interface ItemCarrinho {
  produto: ProdutoCarrinho
  quantidade: number
  saboresSelecionados?: Sabor[]
  bordaSelecionada?: Borda
  tamanhoSelecionado?: Tamanho
  adicionaisSelecionados?: AdicionalSelecionado[]
  observacoes?: string
  produtosCombo?: any[] // Produtos individuais do combo personalizado
  variantId?: string
  variantLabel?: string
}

/**
 * Retorno do hook useCarrinho
 */
export interface UseCarrinhoReturn {
  /** Itens no carrinho */
  carrinho: ItemCarrinho[]
  /** Adicionar item ao carrinho */
  adicionarItem: (item: ItemCarrinho) => void
  /** Remover item do carrinho (por índice específico) */
  removerItem: (index: number) => void
  /** Remover produto simples do carrinho (sem personalização) */
  removerProdutoSimples: (produtoId: string) => void
  /** Incrementar quantidade de um item */
  incrementarItem: (index: number) => void
  /** Limpar carrinho completamente */
  limparCarrinho: () => void
  /** Obter quantidade de um produto no carrinho (apenas produtos simples) */
  getQuantidadeProduto: (produtoId: string) => number
  /** Calcular subtotal do carrinho */
  calcularSubtotalCarrinho: () => number
  /** Calcular preço de um item específico */
  calcularPrecoItemCarrinho: (item: ItemCarrinho) => number
}

/**
 * Hook para gerenciar o carrinho de compras
 * Inclui persistência em localStorage e cálculos de preço
 * 
 * @param chaveStorage - Chave para salvar no localStorage (padrão: carrinho do catálogo da loja atual)
 * @returns Objeto com estado e funções do carrinho
 * 
 * @example
 * const {
 *   carrinho,
 *   adicionarItem,
 *   removerItem,
 *   limparCarrinho,
 *   getQuantidadeProduto,
 *   calcularSubtotalCarrinho
 * } = useCarrinho()
 * 
 * // Adicionar produto simples
 * adicionarItem({ produto, quantidade: 1 })
 * 
 * // Adicionar produto com sabores
 * adicionarItem({
 *   produto,
 *   quantidade: 1,
 *   saboresSelecionados: [sabor1, sabor2],
 *   bordaSelecionada: borda
 * })
 */
export function useCarrinho(chaveStorage: string = chaveCarrinhoPublico()): UseCarrinhoReturn {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])

  /**
   * Verifica se um item é "simples" (sem personalização).
   * Trata arrays vazios como ausência de seleção (alguns chamadores passam
   * `saboresSelecionados: []` em vez de `undefined`).
   */
  const semPersonalizacao = (item: Partial<ItemCarrinho>): boolean =>
    (!item.saboresSelecionados || item.saboresSelecionados.length === 0) &&
    !item.tamanhoSelecionado &&
    (!item.adicionaisSelecionados || item.adicionaisSelecionados.length === 0) &&
    !item.observacoes &&
    !item.produtosCombo &&
    !item.variantId

  // Carregar carrinho do localStorage na inicialização
  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem(chaveStorage)
    if (carrinhoSalvo) {
      try {
        const carrinhoData = JSON.parse(carrinhoSalvo)
        setCarrinho(carrinhoData)
      } catch (error) {
        localStorage.removeItem(chaveStorage)
      }
    }
  }, [chaveStorage])

  // Salvar carrinho no localStorage sempre que houver mudanças
  useEffect(() => {
    if (carrinho.length > 0) {
      localStorage.setItem(chaveStorage, JSON.stringify(carrinho))
    } else {
      localStorage.removeItem(chaveStorage)
    }
  }, [carrinho, chaveStorage])

  /**
   * Adiciona um item ao carrinho
   * Se o item já existe (produto simples sem personalização), incrementa a quantidade
   */
  const adicionarItem = useCallback((novoItem: ItemCarrinho) => {
    console.log('ADICIONAR_ITEM', novoItem.produto.id, novoItem.produto.nome)
    
    setCarrinho(prevCarrinho => {
      // Verificar se é um produto simples
      const isProdutoSimples = semPersonalizacao(novoItem)

      if (isProdutoSimples) {
        const itemExistente = prevCarrinho.find(
          item => item.produto.id === novoItem.produto.id && semPersonalizacao(item)
        )

        if (itemExistente) {
          console.log('INCREMENTAR_ITEM', novoItem.produto.id)
          const novoCarrinho = prevCarrinho.map(item =>
            item.produto.id === novoItem.produto.id && semPersonalizacao(item)
              ? { ...item, quantidade: item.quantidade + novoItem.quantidade }
              : item
          )
          
          return novoCarrinho
        }
      }

      // Adicionar novo item
      console.log('NOVO_ITEM_CARRINHO', novoItem.produto.id, novoItem.produto.nome)
      const novoCarrinho = [...prevCarrinho, novoItem]
      
      
      return novoCarrinho
    })
  }, [])

  /**
   * Remove um item específico do carrinho pelo índice
   * Se a quantidade for maior que 1, decrementa. Caso contrário, remove o item.
   */
  const removerItem = useCallback((index: number) => {
    setCarrinho(prevCarrinho => {
      const novoCarrinho = [...prevCarrinho]
      const item = novoCarrinho[index]

      if (item.quantidade > 1) {
        novoCarrinho[index] = { ...item, quantidade: item.quantidade - 1 }
      } else {
        novoCarrinho.splice(index, 1)
      }

      return novoCarrinho
    })
  }, [])

  /**
   * Remove produto simples do carrinho (sem personalização)
   * Se a quantidade for maior que 1, decrementa. Caso contrário, remove o item.
   */
  const removerProdutoSimples = useCallback((produtoId: string) => {
    setCarrinho(prevCarrinho => {
      const itemExistente = prevCarrinho.find(
        item => item.produto.id === produtoId && semPersonalizacao(item)
      )

      if (itemExistente && itemExistente.quantidade > 1) {
        return prevCarrinho.map(item =>
          item.produto.id === produtoId && semPersonalizacao(item)
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
      } else {
        return prevCarrinho.filter(
          item => !(item.produto.id === produtoId && semPersonalizacao(item))
        )
      }
    })
  }, [])

  /**
   * Incrementa a quantidade de um item específico
   */
  const incrementarItem = useCallback((index: number) => {
    setCarrinho(prevCarrinho => {
      const novoCarrinho = [...prevCarrinho]
      novoCarrinho[index] = {
        ...prevCarrinho[index],
        quantidade: prevCarrinho[index].quantidade + 1
      }
      return novoCarrinho
    })
  }, [])

  /**
   * Limpa o carrinho completamente
   */
  const limparCarrinho = useCallback(() => {
    setCarrinho(() => {
      localStorage.removeItem(chaveStorage)
      return []
    })
  }, [chaveStorage])

  /**
   * Obtém a quantidade de um produto no carrinho (apenas produtos simples)
   */
  const getQuantidadeProduto = useCallback((produtoId: string): number => {
    const item = carrinho.find(
      item => item.produto.id === produtoId && semPersonalizacao(item)
    )
    return item ? item.quantidade : 0
  }, [carrinho])

  /**
   * Calcula o subtotal do carrinho
   */
  const calcularSubtotalCarrinho = useCallback((): number => {
    return calcularSubtotal(carrinho as any)
  }, [carrinho])

  /**
   * Calcula o preço de um item específico
   */
  const calcularPrecoItemCarrinho = useCallback((item: ItemCarrinho): number => {
    return calcularPrecoItem(item as any)
  }, [])

  return {
    carrinho,
    adicionarItem,
    removerItem,
    removerProdutoSimples,
    incrementarItem,
    limparCarrinho,
    getQuantidadeProduto,
    calcularSubtotalCarrinho,
    calcularPrecoItemCarrinho
  }
}
