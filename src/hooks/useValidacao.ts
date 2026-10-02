import { useCallback } from 'react'
import {
  validarCPF as validarCPFUtil,
  validarEmail as validarEmailUtil,
  validarTelefone as validarTelefoneUtil,
  validarCEP as validarCEPUtil,
  validarCampoObrigatorio as validarCampoObrigatorioUtil
} from '@/utils/validacao'

/**
 * Hook customizado para validação de formulários
 * 
 * Fornece funções memoizadas para validação de CPF, email, telefone, CEP
 * e campos obrigatórios. Útil para validação em tempo real em formulários.
 * 
 * @returns Objeto com funções de validação
 * 
 * @example
 * ```tsx
 * function FormularioCliente() {
 *   const { validarCPF, validarEmail, validarTelefone } = useValidacao()
 *   const [cpf, setCpf] = useState('')
 *   const [cpfValido, setCpfValido] = useState(true)
 * 
 *   const handleCpfBlur = () => {
 *     const valido = validarCPF(cpf)
 *     setCpfValido(valido)
 *     if (!valido) {
 *       alert('CPF inválido')
 *     }
 *   }
 * 
 *   return (
 *     <input 
 *       value={cpf} 
 *       onChange={(e) => setCpf(e.target.value)}
 *       onBlur={handleCpfBlur}
 *       className={!cpfValido ? 'border-destructive' : ''}
 *     />
 *   )
 * }
 * ```
 */
export function useValidacao() {
  /**
   * Valida um CPF brasileiro
   * @param cpf - String com o CPF (com ou sem formatação)
   * @returns true se o CPF é válido, false caso contrário
   */
  const validarCPF = useCallback((cpf: string): boolean => {
    return validarCPFUtil(cpf)
  }, [])

  /**
   * Valida um endereço de email
   * @param email - String com o email
   * @returns true se o email é válido, false caso contrário
   */
  const validarEmail = useCallback((email: string): boolean => {
    return validarEmailUtil(email)
  }, [])

  /**
   * Valida um número de telefone brasileiro
   * @param telefone - String com o telefone (com ou sem formatação)
   * @returns true se o telefone é válido, false caso contrário
   */
  const validarTelefone = useCallback((telefone: string): boolean => {
    return validarTelefoneUtil(telefone)
  }, [])

  /**
   * Valida um CEP brasileiro
   * @param cep - String com o CEP (com ou sem formatação)
   * @returns true se o CEP é válido, false caso contrário
   */
  const validarCEP = useCallback((cep: string): boolean => {
    return validarCEPUtil(cep)
  }, [])

  /**
   * Valida se um campo obrigatório foi preenchido
   * @param valor - Valor do campo
   * @returns true se o campo está preenchido, false caso contrário
   */
  const validarCampoObrigatorio = useCallback((valor: any): boolean => {
    return validarCampoObrigatorioUtil(valor)
  }, [])

  return {
    validarCPF,
    validarEmail,
    validarTelefone,
    validarCEP,
    validarCampoObrigatorio
  }
}
