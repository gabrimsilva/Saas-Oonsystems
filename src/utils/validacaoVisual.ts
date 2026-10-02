import type { EstadoValidacaoCampo } from '@/hooks/useValidacaoCheckout'

/**
 * Retorna classes CSS para estilização de campo baseado no estado de validação
 *
 * @param estadoValidacao - Estado de validação do campo
 * @param classesBase - Classes CSS base a serem sempre aplicadas
 * @returns String com classes CSS combinadas
 *
 * @example
 * ```tsx
 * <Input
 *   className={obterClassesValidacao(estadosValidacao.cpf, "w-full")}
 * />
 * // Resultado: "w-full border-destructive" (se inválido)
 * // Resultado: "w-full border-success" (se válido)
 * // Resultado: "w-full" (se neutro/não validado)
 * ```
 */
export function obterClassesValidacao(
  estadoValidacao: EstadoValidacaoCampo,
  classesBase: string = ''
): string {
  const classes = [classesBase]

  if (estadoValidacao.valido === false) {
    // Campo inválido: borda vermelha
    classes.push('border-destructive focus:border-destructive focus:ring-destructive')
  } else if (estadoValidacao.valido === true) {
    // Campo válido: borda verde
    classes.push('border-success focus:border-success focus:ring-success')
  }
  // Se null, não adiciona classes extras (estado neutro)

  return classes.filter(Boolean).join(' ')
}

/**
 * Retorna o ícone apropriado baseado no estado de validação
 *
 * @param estadoValidacao - Estado de validação do campo
 * @returns String com emoji ou símbolo visual
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <Input ... />
 *   <span className="absolute right-2 top-2">
 *     {obterIconeValidacao(estadosValidacao.email)}
 *   </span>
 * </div>
 * ```
 */
export function obterIconeValidacao(estadoValidacao: EstadoValidacaoCampo): string {
  if (estadoValidacao.valido === false) {
    return '❌'
  } else if (estadoValidacao.valido === true) {
    return '✅'
  }
  return '' // Neutro: sem ícone
}

/**
 * Verifica se deve mostrar a mensagem de erro
 *
 * @param estadoValidacao - Estado de validação do campo
 * @returns true se deve mostrar erro
 */
export function deveMostrarErro(estadoValidacao: EstadoValidacaoCampo): boolean {
  return estadoValidacao.valido === false && !!estadoValidacao.erro
}

/**
 * Obtém a mensagem de erro se houver
 *
 * @param estadoValidacao - Estado de validação do campo
 * @returns Mensagem de erro ou undefined
 *
 * @example
 * ```tsx
 * const erro = obterMensagemErro(estadosValidacao.cpf)
 * {erro && <p className="text-destructive text-xs mt-1">⚠️ {erro}</p>}
 * ```
 */
export function obterMensagemErro(estadoValidacao: EstadoValidacaoCampo): string | undefined {
  if (!deveMostrarErro(estadoValidacao)) {
    return undefined
  }
  return estadoValidacao.erro
}

/**
 * Verifica se o formulário como um todo tem erros
 *
 * @param estadosValidacao - Mapa de estados de validação
 * @returns true se há algum erro de validação
 */
export function formularioTemErros(estadosValidacao: Record<string, EstadoValidacaoCampo>): boolean {
  return Object.values(estadosValidacao).some(estado => estado.valido === false)
}

/**
 * Conta quantos campos têm erros
 *
 * @param estadosValidacao - Mapa de estados de validação
 * @returns Número de campos com erro
 */
export function contarErros(estadosValidacao: Record<string, EstadoValidacaoCampo>): number {
  return Object.values(estadosValidacao).filter(estado => estado.valido === false).length
}

/**
 * Verifica se um campo específico foi validado (não está mais em estado neutro)
 *
 * @param estadoValidacao - Estado de validação do campo
 * @returns true se o campo já foi validado
 */
export function campoFoiValidado(estadoValidacao: EstadoValidacaoCampo): boolean {
  return estadoValidacao.valido !== null
}
