import { useCallback, useState } from 'react'
import { useValidacao } from './useValidacao'
import type { DadosCliente } from '@/components/checkout/types'

/**
 * Interface para o resultado da validação
 */
interface ResultadoValidacao {
  valido: boolean
  mensagem?: string
}

/**
 * Estado de validação de um campo individual
 */
export interface EstadoValidacaoCampo {
  valido: boolean | null // null = não validado ainda, true = válido, false = inválido
  erro?: string
}

/**
 * Mapa de estados de validação para todos os campos
 */
export interface EstadosValidacao {
  nome: EstadoValidacaoCampo
  sobrenome: EstadoValidacaoCampo
  cpf: EstadoValidacaoCampo
  telefone: EstadoValidacaoCampo
  email: EstadoValidacaoCampo
  cep: EstadoValidacaoCampo
  endereco: EstadoValidacaoCampo
  numero: EstadoValidacaoCampo
  bairro: EstadoValidacaoCampo
  cidade: EstadoValidacaoCampo
  estado: EstadoValidacaoCampo
  formaPagamento: EstadoValidacaoCampo
  valorTroco: EstadoValidacaoCampo
}

/**
 * Hook customizado para validação específica do checkout
 *
 * Fornece funções de validação para os dados do cliente no processo de checkout,
 * incluindo validação de campos obrigatórios, formato de dados e regras de negócio.
 *
 * **NOVO:** Agora suporta validação em tempo real com feedback visual!
 *
 * @param entregaDomicilio - Se é entrega a domicílio (afeta validações de endereço)
 * @returns Objeto com funções de validação e estados de validação em tempo real
 *
 * @example
 * ```tsx
 * function Checkout() {
 *   const [dadosCliente, setDadosCliente] = useState<DadosCliente>(...)
 *   const {
 *     validarDadosCliente,
 *     validarFormularioCompleto,
 *     validarCampoEmTempoReal,
 *     estadosValidacao
 *   } = useValidacaoCheckout(entregaDomicilio)
 *
 *   return (
 *     <Input
 *       value={dadosCliente.cpf}
 *       onChange={(e) => {
 *         setDadosCliente({ ...dadosCliente, cpf: e.target.value })
 *         validarCampoEmTempoReal('cpf', e.target.value, dadosCliente)
 *       }}
 *       className={estadosValidacao.cpf.valido === false ? 'border-destructive' : ''}
 *     />
 *     {estadosValidacao.cpf.erro && <span className="text-destructive">{estadosValidacao.cpf.erro}</span>}
 *   )
 * }
 * ```
 */
export function useValidacaoCheckout(entregaDomicilio: boolean = true) {
  const { validarCPF, validarEmail, validarTelefone, validarCEP, validarCampoObrigatorio } = useValidacao()

  // Estado inicial - todos os campos começam como não validados (null)
  const estadoInicial: EstadosValidacao = {
    nome: { valido: null },
    sobrenome: { valido: null },
    cpf: { valido: null },
    telefone: { valido: null },
    email: { valido: null },
    cep: { valido: null },
    endereco: { valido: null },
    numero: { valido: null },
    bairro: { valido: null },
    cidade: { valido: null },
    estado: { valido: null },
    formaPagamento: { valido: null },
    valorTroco: { valido: null }
  }

  const [estadosValidacao, setEstadosValidacao] = useState<EstadosValidacao>(estadoInicial)

  /**
   * Valida um campo específico em tempo real e atualiza o estado visual
   * @param campo - Nome do campo a ser validado
   * @param valor - Valor atual do campo
   * @param dadosCompletos - Dados completos do cliente (usado para validações contextuais)
   */
  const validarCampoEmTempoReal = useCallback((
    campo: keyof DadosCliente,
    valor: string | boolean,
    dadosCompletos: DadosCliente
  ) => {
    let resultado: EstadoValidacaoCampo = { valido: true }

    const valorStr = typeof valor === 'boolean' ? '' : valor.toString()

    switch (campo) {
      case 'nome':
        if (!validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Nome é obrigatório' }
        } else if (valorStr.length < 2) {
          resultado = { valido: false, erro: 'Nome deve ter no mínimo 2 caracteres' }
        }
        break

      case 'sobrenome':
        if (!validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Sobrenome é obrigatório' }
        } else if (valorStr.length < 2) {
          resultado = { valido: false, erro: 'Sobrenome deve ter no mínimo 2 caracteres' }
        }
        break

      case 'cpf':
        if (valorStr.trim()) {
          const cpfLimpo = valorStr.replace(/\D/g, '')
          if (cpfLimpo.length < 11) {
            resultado = { valido: null } // Ainda digitando, não mostrar erro
          } else if (!validarCPF(valorStr)) {
            resultado = { valido: false, erro: 'CPF inválido' }
          }
        }
        break

      case 'telefone':
        if (!validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Telefone é obrigatório' }
        } else {
          const telefoneLimpo = valorStr.replace(/\D/g, '')
          if (telefoneLimpo.length < 10) {
            resultado = { valido: null } // Ainda digitando
          } else if (!validarTelefone(valorStr)) {
            resultado = { valido: false, erro: 'Telefone inválido' }
          }
        }
        break

      case 'email':
        if (valorStr.trim() && !validarEmail(valorStr)) {
          resultado = { valido: false, erro: 'Email inválido' }
        } else if (valorStr.trim()) {
          resultado = { valido: true }
        } else {
          resultado = { valido: null } // Email é opcional
        }
        break

      case 'cep':
        if (entregaDomicilio) {
          if (!validarCampoObrigatorio(valorStr)) {
            resultado = { valido: false, erro: 'CEP é obrigatório' }
          } else {
            const cepLimpo = valorStr.replace(/\D/g, '')
            if (cepLimpo.length < 8) {
              resultado = { valido: null } // Ainda digitando
            } else if (!validarCEP(valorStr)) {
              resultado = { valido: false, erro: 'CEP inválido' }
            }
          }
        }
        break

      case 'endereco':
        if (entregaDomicilio && !validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Endereço é obrigatório' }
        }
        break

      case 'numero':
        if (entregaDomicilio && !validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Número é obrigatório' }
        }
        break

      case 'bairro':
        if (entregaDomicilio && !validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Bairro é obrigatório' }
        }
        break

      case 'cidade':
        if (entregaDomicilio && !validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Cidade é obrigatória' }
        }
        break

      case 'estado':
        if (entregaDomicilio) {
          if (!validarCampoObrigatorio(valorStr)) {
            resultado = { valido: false, erro: 'Estado é obrigatório' }
          } else if (valorStr.length !== 2) {
            resultado = { valido: false, erro: 'Use sigla do estado (UF)' }
          }
        }
        break

      case 'formaPagamento':
        if (!validarCampoObrigatorio(valorStr)) {
          resultado = { valido: false, erro: 'Selecione uma forma de pagamento' }
        }
        break

      case 'valorTroco':
        if (dadosCompletos.precisaTroco) {
          if (!validarCampoObrigatorio(valorStr)) {
            resultado = { valido: false, erro: 'Valor do troco é obrigatório' }
          } else {
            const valor = parseFloat(valorStr.replace(',', '.'))
            if (isNaN(valor) || valor <= 0) {
              resultado = { valido: false, erro: 'Valor inválido' }
            }
          }
        }
        break
    }

    setEstadosValidacao(prev => ({
      ...prev,
      [campo]: resultado
    }))
  }, [entregaDomicilio, validarCPF, validarTelefone, validarCEP, validarEmail, validarCampoObrigatorio])

  /**
   * Limpa os estados de validação (reseta para neutro)
   */
  const limparEstadosValidacao = useCallback(() => {
    setEstadosValidacao(estadoInicial)
  }, [])

  /**
   * Valida os dados pessoais do cliente
   * @param dadosCliente - Dados do cliente a serem validados
   * @param entregaDomicilio - Se é entrega a domicílio (valida campos de endereço)
   * @returns Resultado da validação com flag e mensagem de erro
   */
  const validarDadosCliente = useCallback((
    dadosCliente: DadosCliente,
    entregaDomicilio: boolean
  ): ResultadoValidacao => {
    // Validar nome
    if (!validarCampoObrigatorio(dadosCliente.nome)) {
      return { valido: false, mensagem: 'Por favor, preencha seu nome.' }
    }

    // Validar sobrenome
    if (!validarCampoObrigatorio(dadosCliente.sobrenome)) {
      return { valido: false, mensagem: 'Por favor, preencha seu sobrenome.' }
    }

    // Validar telefone
    if (!validarCampoObrigatorio(dadosCliente.telefone)) {
      return { valido: false, mensagem: 'Por favor, preencha o telefone.' }
    }
    if (!validarTelefone(dadosCliente.telefone)) {
      return { valido: false, mensagem: 'Telefone inválido. Use o formato (XX) X XXXX-XXXX.' }
    }

    // Validar CPF se preenchido
    if (dadosCliente.cpf && !validarCPF(dadosCliente.cpf)) {
      return { valido: false, mensagem: 'CPF inválido.' }
    }

    // Validar email se preenchido
    if (dadosCliente.email && !validarEmail(dadosCliente.email)) {
      return { valido: false, mensagem: 'E-mail inválido.' }
    }

    // Validar campos de endereço apenas se for entrega a domicílio
    if (entregaDomicilio) {
      if (!validarCampoObrigatorio(dadosCliente.cep)) {
        return { valido: false, mensagem: 'Por favor, preencha o CEP.' }
      }
      if (!validarCEP(dadosCliente.cep)) {
        return { valido: false, mensagem: 'CEP inválido. Use o formato XXXXX-XXX.' }
      }

      if (!validarCampoObrigatorio(dadosCliente.endereco)) {
        return { valido: false, mensagem: 'Por favor, preencha o endereço.' }
      }

      if (!validarCampoObrigatorio(dadosCliente.numero)) {
        return { valido: false, mensagem: 'Por favor, preencha o número da residência.' }
      }

      if (!validarCampoObrigatorio(dadosCliente.bairro)) {
        return { valido: false, mensagem: 'Por favor, preencha o bairro.' }
      }

      if (!validarCampoObrigatorio(dadosCliente.cidade)) {
        return { valido: false, mensagem: 'Por favor, preencha a cidade.' }
      }

      if (!validarCampoObrigatorio(dadosCliente.estado)) {
        return { valido: false, mensagem: 'Por favor, preencha o estado.' }
      }
    }

    return { valido: true }
  }, [validarCampoObrigatorio, validarTelefone, validarCPF, validarEmail, validarCEP])

  /**
   * Valida a forma de pagamento selecionada
   * @param dadosCliente - Dados do cliente incluindo forma de pagamento
   * @returns Resultado da validação com flag e mensagem de erro
   */
  const validarPagamento = useCallback((dadosCliente: DadosCliente): ResultadoValidacao => {
    if (!validarCampoObrigatorio(dadosCliente.formaPagamento)) {
      return { valido: false, mensagem: 'Por favor, selecione uma forma de pagamento.' }
    }

    // Validar valor do troco se necessário
    if (dadosCliente.formaPagamento === 'dinheiro' && dadosCliente.precisaTroco) {
      if (!validarCampoObrigatorio(dadosCliente.valorTroco)) {
        return { valido: false, mensagem: 'Por favor, informe o valor para o troco.' }
      }

      // Validar se o valor do troco é numérico e maior que zero
      const valorTroco = parseFloat(dadosCliente.valorTroco.replace(',', '.'))
      if (isNaN(valorTroco) || valorTroco <= 0) {
        return { valido: false, mensagem: 'Valor do troco inválido.' }
      }
    }

    return { valido: true }
  }, [validarCampoObrigatorio])

  /**
   * Valida o formulário completo do checkout
   * @param dadosCliente - Dados do cliente
   * @param entregaDomicilio - Se é entrega a domicílio
   * @returns Resultado da validação com flag e mensagem de erro
   */
  const validarFormularioCompleto = useCallback((
    dadosCliente: DadosCliente,
    entregaDomicilio: boolean
  ): ResultadoValidacao => {
    // Validar dados do cliente
    const validacaoDados = validarDadosCliente(dadosCliente, entregaDomicilio)
    if (!validacaoDados.valido) {
      return validacaoDados
    }

    // Validar pagamento
    const validacaoPagamento = validarPagamento(dadosCliente)
    if (!validacaoPagamento.valido) {
      return validacaoPagamento
    }

    return { valido: true }
  }, [validarDadosCliente, validarPagamento])

  /**
   * Valida se o valor mínimo do pedido foi atingido
   * @param subtotal - Subtotal do pedido
   * @param valorMinimo - Valor mínimo configurado
   * @returns Resultado da validação com flag e mensagem de erro
   */
  const validarValorMinimo = useCallback((
    subtotal: number,
    valorMinimo: string
  ): ResultadoValidacao => {
    const valorMinimoNum = parseFloat(valorMinimo || '0')
    
    if (valorMinimoNum > 0 && subtotal < valorMinimoNum) {
      return {
        valido: false,
        mensagem: `Valor mínimo do pedido é R$ ${valorMinimoNum.toFixed(2).replace('.', ',')}. Adicione mais itens ao carrinho.`
      }
    }

    return { valido: true }
  }, [])

  return {
    // Validação em tempo real (novo!)
    validarCampoEmTempoReal,
    estadosValidacao,
    limparEstadosValidacao,
    // Validação no submit (mantido para compatibilidade)
    validarDadosCliente,
    validarPagamento,
    validarFormularioCompleto,
    validarValorMinimo
  }
}
