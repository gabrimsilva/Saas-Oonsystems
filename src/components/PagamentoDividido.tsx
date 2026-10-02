/**
 * Pagamento dividido em duas formas (PDV e comandas).
 *
 * Ao digitar o valor de uma parte, a outra é preenchida com o restante; o
 * botão "Metade" divide o total ao meio. Quando uma das partes é em dinheiro,
 * o caixa pode informar quanto recebeu para ver o troco.
 * As regras ficam em `@/utils/pagamentoDividido`.
 */

import { ArrowLeftRight, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { campoBase } from "@/components/ui/estilos"
import { cn } from "@/lib/utils"
import {
  FORMAS_DIVISIVEIS,
  calcularTroco,
  escreverValor,
  formatarReais,
  lerValor,
  metades,
  parteEmDinheiro,
  restante,
  temParteEmDinheiro,
  validarDivisao,
  type DivisaoPagamento,
  type FormaDivisivel,
} from "@/utils/pagamentoDividido"

interface PagamentoDivididoProps {
  total: number
  valor: DivisaoPagamento
  onChange: (valor: DivisaoPagamento) => void
  disabled?: boolean
  /** Prefixo dos ids dos campos (dois formulários na mesma tela) */
  idBase?: string
}

/** Mantém só dígitos e um separador decimal */
const limparDigitado = (texto: string) => texto.replace(/[^\d,.]/g, "")

export default function PagamentoDividido({ total, valor, onChange, disabled, idBase = "divisao" }: PagamentoDivididoProps) {
  const erro = validarDivisao(total, valor)
  const v1 = lerValor(valor.valor1)
  const v2 = lerValor(valor.valor2)
  const algumValor = v1 > 0 || v2 > 0
  const troco = calcularTroco(valor)

  const alterarValor = (parte: 1 | 2, texto: string) => {
    const digitado = limparDigitado(texto)
    const outro = digitado ? escreverValor(restante(total, lerValor(digitado))) : ""
    onChange(parte === 1 ? { ...valor, valor1: digitado, valor2: outro } : { ...valor, valor2: digitado, valor1: outro })
  }

  const alterarForma = (parte: 1 | 2, forma: FormaDivisivel) => {
    const outra = parte === 1 ? valor.forma2 : valor.forma1
    // Escolher a mesma forma da outra parte troca as duas de lugar
    if (forma === outra) {
      onChange({ ...valor, forma1: valor.forma2, forma2: valor.forma1 })
      return
    }
    onChange(parte === 1 ? { ...valor, forma1: forma } : { ...valor, forma2: forma })
  }

  const dividirAoMeio = () => {
    const [a, b] = metades(total)
    onChange({ ...valor, valor1: escreverValor(a), valor2: escreverValor(b) })
  }

  const inverter = () =>
    onChange({ ...valor, forma1: valor.forma2, forma2: valor.forma1, valor1: valor.valor2, valor2: valor.valor1 })

  const linha = (parte: 1 | 2) => {
    const forma = parte === 1 ? valor.forma1 : valor.forma2
    const texto = parte === 1 ? valor.valor1 : valor.valor2
    return (
      <div className="grid grid-cols-[1fr_8.5rem] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idBase}-forma-${parte}`} className="text-xs">
            {parte === 1 ? "1ª forma" : "2ª forma"}
          </Label>
          <select
            id={`${idBase}-forma-${parte}`}
            className={cn(campoBase, "h-9 px-3")}
            value={forma}
            onChange={(e) => alterarForma(parte, e.target.value as FormaDivisivel)}
            disabled={disabled}
          >
            {FORMAS_DIVISIVEIS.map((f) => (
              <option key={f.valor} value={f.valor}>{f.rotulo}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idBase}-valor-${parte}`} className="text-xs">Valor (R$)</Label>
          <Input
            id={`${idBase}-valor-${parte}`}
            inputMode="decimal"
            placeholder="0,00"
            className="text-right tabular-nums"
            value={texto}
            onChange={(e) => alterarValor(parte, e.target.value)}
            onBlur={() => texto && alterarValor(parte, escreverValor(lerValor(texto)))}
            disabled={disabled}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Total a dividir: <span className="font-semibold text-foreground tabular-nums">{formatarReais(total)}</span>
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={inverter} disabled={disabled} aria-label="Inverter as partes">
            <ArrowLeftRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={dividirAoMeio} disabled={disabled}>
            Metade
          </Button>
        </div>
      </div>

      {linha(1)}
      {linha(2)}

      {temParteEmDinheiro(valor) && (
        <div className="grid grid-cols-[1fr_8.5rem] items-end gap-2">
          <p className="pb-2 text-xs text-muted-foreground">
            Recebido em dinheiro (opcional), para calcular o troco
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-recebido`} className="text-xs">Recebido (R$)</Label>
            <Input
              id={`${idBase}-recebido`}
              inputMode="decimal"
              placeholder={escreverValor(parteEmDinheiro(valor))}
              className="text-right tabular-nums"
              value={valor.recebidoDinheiro}
              onChange={(e) => onChange({ ...valor, recebidoDinheiro: limparDigitado(e.target.value) })}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {algumValor && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
            erro ? "bg-destructive/5 text-destructive" : "bg-success/10 text-success",
          )}
        >
          {erro ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>
            {erro ?? "Valores conferem com o total."}
            {!erro && troco > 0 && (
              <>
                {" "}Troco: <strong className="tabular-nums">{formatarReais(troco)}</strong>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
