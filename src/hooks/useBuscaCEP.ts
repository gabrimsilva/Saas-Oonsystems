import { useState, useCallback } from 'react'

/**
 * Interface para o endereço retornado pela API ViaCEP
 */
interface EnderecoViaCEP {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

/**
 * Interface para o endereço formatado retornado pelo hook
 */
export interface Endereco {
  cep: string
  endereco: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

/**
 * Hook customizado para busca de endereço via CEP usando a API ViaCEP
 * 
 * Gerencia estados de loading, erro e dados do endereço. Realiza a busca
 * automaticamente quando um CEP válido é fornecido.
 * 
 * @returns Objeto com função de busca, dados do endereço e estados
 * 
 * @example
 * ```tsx
 * function FormularioEndereco() {
 *   const { buscarCEP, endereco, loading, erro } = useBuscaCEP()
 *   const [cep, setCep] = useState('')
 * 
 *   const handleCepBlur = async () => {
 *     if (cep.replace(/\D/g, '').length === 8) {
 *       const enderecoEncontrado = await buscarCEP(cep)
 *       if (enderecoEncontrado) {
 *         // Preencher campos do formulário
 *         setEndereco(enderecoEncontrado.endereco)
 *         setBairro(enderecoEncontrado.bairro)
 *         setCidade(enderecoEncontrado.cidade)
 *         setEstado(enderecoEncontrado.estado)
 *       }
 *     }
 *   }
 * 
 *   return (
 *     <div>
 *       <input 
 *         value={cep} 
 *         onChange={(e) => setCep(e.target.value)}
 *         onBlur={handleCepBlur}
 *       />
 *       {loading && <span>Buscando CEP...</span>}
 *       {erro && <span className="text-destructive">{erro}</span>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useBuscaCEP() {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [endereco, setEndereco] = useState<Endereco | null>(null)

  /**
   * Busca o endereço completo a partir de um CEP
   * @param cep - CEP a ser buscado (com ou sem formatação)
   * @returns Endereço encontrado ou null em caso de erro
   */
  const buscarCEP = useCallback(async (cep: string): Promise<Endereco | null> => {
    // Remove formatação do CEP
    const cepLimpo = cep.replace(/\D/g, '')

    // Valida se o CEP tem 8 dígitos
    if (cepLimpo.length !== 8) {
      setErro('CEP deve ter 8 dígitos')
      return null
    }

    setLoading(true)
    setErro(null)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP')
      }

      const data: EnderecoViaCEP = await response.json()

      // Verifica se o CEP foi encontrado
      if (data.erro) {
        setErro('CEP não encontrado')
        setEndereco(null)
        return null
      }

      // Formata o endereço
      const enderecoFormatado: Endereco = {
        cep: data.cep,
        endereco: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }

      setEndereco(enderecoFormatado)
      return enderecoFormatado

    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      setErro('Erro ao buscar CEP. Tente novamente.')
      setEndereco(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Limpa os dados do endereço e erros
   */
  const limpar = useCallback(() => {
    setEndereco(null)
    setErro(null)
    setLoading(false)
  }, [])

  return {
    buscarCEP,
    limpar,
    endereco,
    loading,
    erro
  }
}
