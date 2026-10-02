/**
 * Componente de Scanner de Código de Barras
 * 
 * Captura entrada de leitores de código de barras (que simulam teclado)
 * e permite entrada manual de códigos.
 * 
 * @module components/BarcodeScanner
 */

import { useState, useEffect, useRef } from 'react'
import { Scan, Keyboard, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  placeholder?: string
  autoFocus?: boolean
  showManualInput?: boolean
  disabled?: boolean
}

export default function BarcodeScanner({
  onScan,
  onClose,
  placeholder = 'Aguardando leitura do código de barras...',
  autoFocus = true,
  showManualInput = true,
  disabled = false
}: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  useEffect(() => {
    if (disabled) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorar se estiver em modo manual ou se o input não estiver focado
      if (manualMode) return
      if (document.activeElement !== inputRef.current) return

      // Enter finaliza a leitura
      if (e.key === 'Enter') {
        e.preventDefault()
        if (scanBufferRef.current.length > 0) {
          processBarcode(scanBufferRef.current)
          scanBufferRef.current = ''
        }
        return
      }

      // Acumular caracteres
      if (e.key.length === 1) {
        scanBufferRef.current += e.key
        setIsScanning(true)

        // Limpar timer anterior
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current)
        }

        // Definir novo timer (scanners são rápidos, ~50ms entre caracteres)
        scanTimerRef.current = setTimeout(() => {
          if (scanBufferRef.current.length > 0) {
            processBarcode(scanBufferRef.current)
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
  }, [manualMode, disabled])

  const processBarcode = (code: string) => {
    const cleanCode = code.trim()
    if (cleanCode.length > 0) {
      setBarcode(cleanCode)
      onScan(cleanCode)
      
      // Feedback sonoro (opcional)
      playBeep()
      
      // Limpar após 2 segundos
      setTimeout(() => {
        setBarcode('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 2000)
    }
  }

  const playBeep = () => {
    // Criar um beep simples usando Web Audio API
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
      // Silenciosamente falhar se áudio não estiver disponível
      console.debug('Áudio não disponível:', error)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcode.trim().length > 0) {
      processBarcode(barcode)
    }
  }

  const handleClear = () => {
    setBarcode('')
    scanBufferRef.current = ''
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Scan className="h-5 w-5 text-primary" />
          Scanner de Código de Barras
        </Label>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-3">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`pr-20 ${isScanning ? 'border-primary ring-2 ring-primary/20' : ''}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {barcode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showManualInput && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualMode(!manualMode)}
              className="flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4" />
              {manualMode ? 'Modo Scanner' : 'Modo Manual'}
            </Button>

            {manualMode && (
              <Button
                type="submit"
                size="sm"
                disabled={!barcode.trim() || disabled}
                className="bg-primary hover:bg-primary-hover"
              >
                Buscar
              </Button>
            )}
          </div>
        )}

        {isScanning && (
          <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
            <Scan className="h-4 w-4" />
            <span>Lendo código de barras...</span>
          </div>
        )}
      </form>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Dica: Aponte o leitor para o código de barras e pressione o gatilho</p>
        <p>⌨️ Ou ative o "Modo Manual" para digitar o código</p>
      </div>
    </div>
  )
}
