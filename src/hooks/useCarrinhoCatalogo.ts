import { useCallback, useEffect, useState } from "react"
import { chaveLocalDoEstabelecimento } from "@/services/tenant"
import type { TipoVenda } from "@/services/lojaOnlineService"

export interface ItemCarrinhoCatalogo {
  produtoId: string
  varianteId: string | null
  varianteNome: string | null
  quantidade: number
}

export const chaveItem = (item: Pick<ItemCarrinhoCatalogo, "produtoId" | "varianteId">) =>
  `${item.produtoId}:${item.varianteId ?? ""}`

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* navegador sem storage: carrinho vive só na memória */
  }
}

/**
 * Carrinho do catálogo público de UMA loja (guardado por estabelecimento no
 * navegador). Guarda só IDs e quantidades; os preços são sempre calculados a
 * partir dos produtos carregados — e recalculados no servidor.
 */
export function useCarrinhoCatalogo(estabelecimentoId: string | null) {
  const chaveStorage = chaveLocalDoEstabelecimento("carrinho_catalogo", estabelecimentoId)
  const [itens, setItens] = useState<ItemCarrinhoCatalogo[]>(() => {
    const salvos = ler<ItemCarrinhoCatalogo[]>(chaveStorage, [])
    return Array.isArray(salvos) ? salvos.filter(i => i?.produtoId && i.quantidade > 0) : []
  })

  const chaveModo = chaveLocalDoEstabelecimento("modo_venda", estabelecimentoId)
  const [modo, setModo] = useState<TipoVenda>(() => (ler<TipoVenda>(chaveModo, "varejo") === "atacado" ? "atacado" : "varejo"))

  useEffect(() => gravar(chaveStorage, itens), [chaveStorage, itens])
  useEffect(() => gravar(chaveModo, modo), [chaveModo, modo])

  const adicionar = useCallback((novo: ItemCarrinhoCatalogo) => {
    setItens(atuais => {
      const chave = chaveItem(novo)
      const existente = atuais.find(i => chaveItem(i) === chave)
      if (existente) {
        return atuais.map(i => (chaveItem(i) === chave ? { ...i, quantidade: i.quantidade + novo.quantidade } : i))
      }
      return [...atuais, novo]
    })
  }, [])

  const alterarQuantidade = useCallback((chave: string, quantidade: number) => {
    setItens(atuais =>
      quantidade <= 0
        ? atuais.filter(i => chaveItem(i) !== chave)
        : atuais.map(i => (chaveItem(i) === chave ? { ...i, quantidade } : i))
    )
  }, [])

  const remover = useCallback((chave: string) => {
    setItens(atuais => atuais.filter(i => chaveItem(i) !== chave))
  }, [])

  const limpar = useCallback(() => setItens([]), [])

  /** Remove itens de produtos que saíram do catálogo */
  const manterApenas = useCallback((produtoIds: Set<string>) => {
    setItens(atuais => {
      const filtrados = atuais.filter(i => produtoIds.has(i.produtoId))
      return filtrados.length === atuais.length ? atuais : filtrados
    })
  }, [])

  const quantidadeTotal = itens.reduce((soma, i) => soma + i.quantidade, 0)

  return { itens, modo, setModo, adicionar, alterarQuantidade, remover, limpar, manterApenas, quantidadeTotal }
}
