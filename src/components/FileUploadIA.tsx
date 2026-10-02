import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2, File, FileText, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/services"
import toast from 'react-hot-toast'

interface FileUploadIAProps {
  onFileUploaded: (file: { name: string; type: string; url: string; size: number }) => void
  disabled?: boolean
}

export default function FileUploadIA({ onFileUploaded, disabled }: FileUploadIAProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ name: string; type: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ].join(',')

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-primary" />
    if (type === 'application/pdf') return <FileText className="h-8 w-8 text-destructive" />
    if (type.includes('sheet') || type.includes('excel') || type === 'text/csv') {
      return <File className="h-8 w-8 text-success" />
    }
    return <File className="h-8 w-8 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB')
      return
    }

    // Validar tipo
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]

    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use imagens, PDF, Excel ou CSV.')
      return
    }

    try {
      setUploading(true)

      // Gerar nome único para o arquivo
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `ia-temp/${fileName}`

      // Upload para o Supabase Storage (usando bucket existente)
      const { data, error } = await supabase.storage
        .from('produtos-imagens')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('produtos-imagens')
        .getPublicUrl(data.path)

      // Definir preview
      setPreview({
        name: file.name,
        type: file.type,
        size: file.size
      })

      // Notificar componente pai
      onFileUploaded({
        name: file.name,
        type: file.type,
        url: publicUrl,
        size: file.size
      })

      toast.success('Arquivo enviado com sucesso!')
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="border-2 border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            {getFileIcon(preview.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{preview.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(preview.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-input rounded-lg p-6">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Arraste um arquivo ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground/70">
              Imagens, PDF, Excel ou CSV (máx. 10MB)
            </p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {preview ? 'Trocar' : 'Selecionar'} Arquivo
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
