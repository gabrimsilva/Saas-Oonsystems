/**
 * Componente de Busca Unificada para PDV
 * 
 * Campo inteligente que aceita:
 * - Busca por nome do produto (filtra grid)
 * - Código de barras digitado manualmente (adiciona ao carrinho)
 * - Código de barras lido por leitor físico/BIP (adiciona ao carrinho)
 * 
 * @module components/pdv/BuscaUnificadaPDV
 */

import { useState, useEffect, useRef } from 'react'
import { Search, Scan, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BuscaUnificadaPDVProps {
  onBuscarPorNome: (termo: string) => void
  onBuscarPorBarcode: (barcode: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function BuscaUnificadaPDV({
  onBuscarPorNome,
  onBuscarPorBarcode,
  placeholder = 'Buscar por nome ou código de barras...',
  disabled = false
}: BuscaUnificadaPDVProps) {
  const [valor, setValor] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastChangeTimeRef = useRef<number>(0)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (disabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Só processar se o input estiver focado
      if (document.activeElement !== inputRef.current) return

      const now = Date.now()
      const timeSinceLastKey = now - lastChangeTimeRef.current
      lastChangeTimeRef.current = now

      // Enter finaliza a leitura do scanner ou busca manual
      if (e.key === 'Enter') {
        e.preventDefault()
        
        // Se tem buffer do scanner, processar como código de barras
        if (scanBufferRef.current.length > 0) {
          processarCodigoBarras(scanBufferRef.current)
          scanBufferRef.current = ''
          setIsScanning(false)
          return
        }
        
        // Se digitou manualmente e pressionou Enter, verificar se é código de barras
        if (valor.trim().length > 0) {
          // Códigos de barras geralmente têm apenas números e são longos (8-13 dígitos)
          const apenasNumeros = /^\d+$/.test(valor.trim())
          const tamanhoCodigoBarras = valor.trim().length >= 8
          
          if (apenasNumeros && tamanhoCodigoBarras) {
            processarCodigoBarras(valor.trim())
          }
        }
        return
      }

      // Detectar leitura rápida do scanner (< 50ms entre teclas)
      if (e.key.length === 1 && timeSinceLastKey < 50) {
        setIsScanning(true)
        scanBufferRef.current += e.key

        // Limpar timer anterior
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current)
        }

        // Timer para processar código após pausa
        scanTimerRef.current = setTimeout(() => {
          if (scanBufferRef.current.length > 0) {
            processarCodigoBarras(scanBufferRef.current)
            scanBufferRef.current = ''
          }
          setIsScanning(false)
        }, 100)
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current)
      }
    }
  }, [valor, disabled])

  const processarCodigoBarras = (code: string) => {
    const cleanCode = code.trim()
    if (cleanCode.length > 0) {
      onBuscarPorBarcode(cleanCode)
      
      // Feedback sonoro
      playBeep()
      
      // Limpar campo após 1 segundo
      setTimeout(() => {
        setValor('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1000)
    }
  }

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.debug('Áudio não disponível:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = e.target.value
    setValor(novoValor)
    
    // Buscar por nome em tempo real (se não estiver escaneando)
    if (!isScanning) {
      onBuscarPorNome(novoValor)
    }
  }

  const handleClear = () => {
    setValor('')
    scanBufferRef.current = ''
    onBuscarPorNome('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 z-10">
          {isScanning ? (
            <Scan className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          id="busca-pdv"
          aria-keyshortcuts="F2"
          type="text"
          value={valor}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-10 pr-10 ${isScanning ? 'border-primary ring-2 ring-primary/20' : ''}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        
        {valor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isScanning && (
        <div className="text-xs text-primary animate-pulse flex items-center gap-1">
          <Scan className="h-3 w-3" />
          <span>Lendo código de barras...</span>
        </div>
      )}
    </div>
  )
}
