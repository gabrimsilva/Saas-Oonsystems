import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { aplicarMascaraMoeda, numeroParaTextoMoeda } from "@/utils/formatacao"

interface InputMoedaProps {
  id?: string
  name?: string
  /** Valor atual em reais (número, não string) */
  value: number
  /** Chamado com o novo valor em reais a cada alteração */
  onChange: (valor: number) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
}

/**
 * Campo de valor monetário com máscara em tempo real (estilo "calculadora"):
 * os dígitos digitados entram da direita para a esquerda formando os
 * centavos, e o campo sempre exibe o valor formatado como "R$ X.XXX,XX".
 *
 * Trabalha internamente com o valor em reais (number) e mantém um estado de
 * texto próprio só para exibição, evitando problemas de cursor que ocorrem
 * ao formatar via `value` controlado diretamente a partir do número.
 */
export function InputMoeda({
  id,
  name,
  value,
  onChange,
  placeholder = "R$ 0,00",
  required,
  disabled,
  className,
  ...rest
}: InputMoedaProps) {
  const [texto, setTexto] = useState<string>(() => numeroParaTextoMoeda(value))

  // Mantém o texto sincronizado quando o valor é alterado externamente
  // (ex: ao carregar um produto para edição).
  useEffect(() => {
    setTexto(numeroParaTextoMoeda(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { texto: novoTexto, numero } = aplicarMascaraMoeda(e.target.value)
    setTexto(novoTexto)
    onChange(numero)
  }

  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={texto}
      onChange={handleChange}
      required={required}
      disabled={disabled}
      className={className}
      {...rest}
    />
  )
}
