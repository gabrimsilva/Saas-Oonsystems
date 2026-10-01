import type { ProdutoCatalogo } from "@/components/delivery/CatalogoProdutoCard"
import type { TipoVenda } from "@/services/lojaOnlineService"

/**
 * Preço unitário no catálogo. Mesma regra da Edge Function `catalogo-pedidos`
 * (o servidor recalcula tudo):
 * - varejo: preço online do produto; sem ele, o promocional ou o preço do PDV
 * - atacado: preço de atacado; sem ele, o preço de varejo do catálogo
 */
export function precoUnitario(produto: ProdutoCatalogo, modo: TipoVenda = "varejo"): number {
  if (modo === "atacado" && Number(produto.precoAtacado) > 0) return Number(produto.precoAtacado)
  if (Number(produto.precoOnline) > 0) return Number(produto.precoOnline)
  const promocional = Number(produto.precoPromocional)
  return promocional > 0 ? promocional : Number(produto.preco) || 0
}

/** Preço "de" riscado: o preço de varejo quando o preço cobrado é menor */
export function precoAnterior(produto: ProdutoCatalogo, modo: TipoVenda = "varejo"): number | null {
  const atual = precoUnitario(produto, modo)
  const referencia = modo === "atacado"
    ? precoUnitario(produto, "varejo")
    : Number(produto.precoOnline) > 0 ? Number(produto.precoOnline) : Number(produto.preco) || 0
  return referencia > atual ? referencia : null
}

/** Quantidade disponível para compra (null = sem controle de estoque) */
export function disponivelParaCompra(produto: ProdutoCatalogo, varianteId?: string | null): number | null {
  if (produto.controlaEstoque === false) return null
  if (varianteId) {
    const variante = produto.variantes?.find(v => v.id === varianteId)
    return variante ? variante.quantidade : 0
  }
  return produto.quantidadeEstoque ?? 0
}

export const formatarReais = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
