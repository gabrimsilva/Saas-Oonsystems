/**
 * Modal de Observações para Delivery
 * 
 * @deprecated Não utilizado no PDV simplificado (desde 31/01/2026)
 * @usage Utilizado em: Delivery
 * @reactivation Para reativar no PDV, consulte PLANO_LIMPEZA_SISTEMA.md seção 5.1
 * 
 * Este componente foi removido do fluxo PDV simplificado para reduzir complexidade.
 * Continua sendo utilizado em Delivery para capturar observações de itens.
 * 
 * Modal para capturar observações específicas de um item do pedido,
 * com validação de caracteres e sanitização de entrada.
 * 
 * @module EscolherObservacoesModal
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import DOMPurify from "isomorphic-dompurify"

/**
 * Props para o componente EscolherObservacoesModal
 * 
 * @interface EscolherObservacoesModalProps
 */
interface EscolherObservacoesModalProps {
  /**
   * Controla se o modal está aberto ou fechado
   * @type {boolean}
   */
  isOpen: boolean
  
  /**
   * Callback chamado quando o modal é fechado (via botão X ou backdrop)
   * @type {() => void}
   */
  onClose: () => void
  
  /**
   * Callback chamado ao confirmar as observações
   * Recebe as observações sanitizadas e com trim aplicado
   * Pode receber string vazia se o usuário clicar em "Pular" ou confirmar sem texto
   * @type {(observacoes: string) => void}
   * @param {string} observacoes - Texto das observações (sanitizado e trimmed)
   */
  onConfirm: (observacoes: string) => void
  
  /**
   * Variante de estilo do botão de confirmação
   * - 'default': Usa a cor primária padrão do tema
   * - 'delivery': Usa cor vermelha (bg-destructive)
   * @type {'default' | 'delivery'}
   * @default 'delivery'
   */
  variant?: 'default' | 'delivery'
}

/**
 * Modal para adicionar observações específicas a um produto individual
 * 
 * Este componente permite que clientes adicionem instruções ou preferências especiais
 * para cada produto no pedido (ex: "Sem cebola", "Bem assada", "Embalagem separada").
 * 
 * ## Características:
 * - Limite de 300 caracteres com contador visual
 * - Sanitização automática de entrada (previne XSS)
 * - Botão "Pular" para não adicionar observações
 * - Botão "Confirmar" sempre habilitado (pode confirmar vazio)
 * - Responsivo: fullscreen em mobile, modal fixo em desktop
 * - Acessível: ARIA labels, navegação por teclado, screen reader friendly
 * 
 * ## Fluxo de Uso:
 * 1. Modal abre após seleção de sabores/adicionais (ou diretamente se produto simples)
 * 2. Cliente digita observações (opcional)
 * 3. Cliente clica em "Pular" (sem observações) ou "Confirmar" (com ou sem observações)
 * 4. Callback onConfirm é chamado com as observações sanitizadas
 * 5. Produto é adicionado ao carrinho com as observações
 * 
 * ## Validações:
 * - Máximo de 300 caracteres (bloqueio na digitação)
 * - Sanitização com DOMPurify (remove HTML/scripts)
 * - Trim de espaços em branco antes de confirmar
 * 
 * ## Comportamento Esperado:
 * - Observações são salvas no campo JSONB do item no carrinho
 * - Observações aparecem no carrinho (delivery e PDV)
 * - Observações aparecem no card do pedido (kanban)
 * - Observações aparecem no recibo impresso
 * 
 * @component
 * @example
 * // Uso básico no fluxo de delivery
 * ```tsx
 * const [modalAberto, setModalAberto] = useState(false)
 * 
 * <EscolherObservacoesModal
 *   isOpen={modalAberto}
 *   onClose={() => setModalAberto(false)}
 *   onConfirm={(observacoes) => {
 *     adicionarAoCarrinho({ ...produto, observacoes })
 *   }}
 *   variant="delivery"
 * />
 * ```
 * 
 * @example
 * // Uso após seleção de adicionais
 * ```tsx
 * const handleConfirmarAdicionais = (adicionais: Adicional[]) => {
 *   setAdicionaisSelecionados(adicionais)
 *   setModalAdicionaisAberto(false)
 *   setModalObservacoesAberto(true) // Abre modal de observações
 * }
 * 
 * const handleConfirmarObservacoes = (observacoes: string) => {
 *   adicionarAoCarrinho({
 *     produto,
 *     sabores: saboresSelecionados,
 *     adicionais: adicionaisSelecionados,
 *     observacoes // Pode ser string vazia
 *   })
 * }
 * 
 * <EscolherObservacoesModal
 *   isOpen={modalObservacoesAberto}
 *   onClose={() => setModalObservacoesAberto(false)}
 *   onConfirm={handleConfirmarObservacoes}
 *   variant="delivery"
 * />
 * ```
 * 
 * @example
 * // Uso no PDV com variante default
 * ```tsx
 * <EscolherObservacoesModal
 *   isOpen={modalAberto}
 *   onClose={() => setModalAberto(false)}
 *   onConfirm={(observacoes) => {
 *     adicionarItemPDV({ ...item, observacoes })
 *   }}
 *   variant="default"
 * />
 * ```
 * 
 * @param {EscolherObservacoesModalProps} props - Props do componente
 * @returns {JSX.Element | null} Modal de observações ou null se não estiver aberto
 */
export default function EscolherObservacoesModal({
  isOpen,
  onClose,
  onConfirm,
  variant = 'delivery'
}: EscolherObservacoesModalProps) {
  /**
   * Estado local para armazenar o texto das observações
   * Resetado automaticamente quando o modal abre
   * @type {string}
   */
  const [observacoes, setObservacoes] = useState('')
  
  /**
   * Limite máximo de caracteres permitidos
   * @constant
   * @type {number}
   */
  const MAX_CARACTERES = 300

  /**
   * Reseta as observações quando o modal abre
   * Garante que o campo sempre inicia vazio em cada abertura
   */
  useEffect(() => {
    if (isOpen) {
      setObservacoes('')
    }
  }, [isOpen])

  /**
   * Handler para mudanças no textarea
   * Valida o limite de caracteres antes de atualizar o estado
   * 
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - Evento de mudança do textarea
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    
    // Validar limite de caracteres
    if (value.length <= MAX_CARACTERES) {
      setObservacoes(value)
    }
  }

  /**
   * Handler para o botão "Pular"
   * Chama onConfirm com string vazia (sem observações)
   * Fecha o modal em seguida
   */
  const handlePular = () => {
    onConfirm('')
    onClose()
  }

  /**
   * Handler para o botão "Confirmar"
   * Sanitiza a entrada para prevenir XSS, aplica trim e chama onConfirm
   * Fecha o modal em seguida
   * 
   * @description
   * Processo de sanitização:
   * 1. Remove espaços em branco do início e fim (trim)
   * 2. Remove todas as tags HTML
   * 3. Remove todos os atributos HTML
   * 4. Retorna apenas texto puro
   */
  const handleConfirmar = () => {
    // Sanitizar entrada para evitar XSS
    const observacoesSanitizadas = DOMPurify.sanitize(observacoes.trim(), {
      ALLOWED_TAGS: [], // Não permitir nenhuma tag HTML
      ALLOWED_ATTR: [] // Não permitir nenhum atributo
    })
    
    onConfirm(observacoesSanitizadas)
    onClose()
  }

  /**
   * Calcula a cor do contador de caracteres baseado na proximidade do limite
   * 
   * @returns {string} Classe CSS do Tailwind para a cor do texto
   * 
   * @description
   * - Vermelho (text-destructive): >= 90% do limite (270+ caracteres)
   * - Laranja (text-warning-foreground): >= 75% do limite (225+ caracteres)
   * - Cinza (text-muted-foreground): < 75% do limite
   */
  const getContadorColor = () => {
    const percentual = (observacoes.length / MAX_CARACTERES) * 100
    if (percentual >= 90) return 'text-destructive'
    if (percentual >= 75) return 'text-warning-foreground'
    return 'text-muted-foreground'
  }

  // Não renderizar nada se o modal não estiver aberto
  if (!isOpen) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="w-[550px] h-[604px] max-w-[calc(100%-2rem)] max-h-[90vh] flex flex-col overflow-hidden max-md:!p-0">
        {/* Botão fechar mobile */}
        <button
          onClick={onClose}
          className="hidden max-md:block absolute right-4 top-4 z-20 rounded-full bg-card p-2 hover:bg-accent transition-colors shadow-md cursor-pointer"
          aria-label="Fechar modal de observações"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <AlertDialogHeader className="flex-shrink-0 max-md:p-4 max-md:pb-2 max-md:sticky max-md:top-0 max-md:bg-card max-md:z-10 max-md:border-b">
          <AlertDialogTitle className="max-md:pr-10">Adicionar Observações</AlertDialogTitle>
          <AlertDialogDescription>
            Alguma observação especial para este produto?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 max-md:px-4 max-md:py-4">
          <div className="space-y-3">
            <Textarea
              value={observacoes}
              onChange={handleChange}
              placeholder="Ex: Sem cebola, bem assada..."
              className="min-h-[120px] resize-none"
              aria-label="Campo de observações do produto"
              aria-describedby="char-count"
              maxLength={MAX_CARACTERES}
            />
            
            <div 
              id="char-count" 
              className={`text-sm text-right ${getContadorColor()}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {observacoes.length}/{MAX_CARACTERES} caracteres
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0 max-md:sticky max-md:bottom-0 max-md:bg-card max-md:p-4 max-md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Button
            type="button"
            variant="outline"
            onClick={handlePular}
            className="w-full sm:w-auto cursor-pointer"
          >
            Pular
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            className={`w-full sm:w-auto cursor-pointer ${
              variant === 'delivery' 
                ? 'bg-primary hover:bg-primary-hover' 
                : ''
            }`}
          >
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
