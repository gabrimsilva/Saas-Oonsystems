import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2 } from "lucide-react"
import { useImageUpload } from "@/hooks/useImageUpload"
import toast from 'react-hot-toast'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
  bucketName: string
  folder: string
  acceptedTypes?: string
  maxSizeMB?: number
  recommendedSize?: string
  placeholder?: string
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  bucketName,
  folder,
  acceptedTypes = "image/*",
  maxSizeMB = 5,
  recommendedSize,
  placeholder = "Clique para fazer upload"
}: ImageUploadProps) {
  const { uploading, uploadImage, deleteImage, error } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Usar currentImageUrl como preview
  const previewUrl = currentImageUrl || null

  // Mostrar erro se houver
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho do arquivo
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`)
      return
    }

    // Validar tipo do arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem')
      return
    }

    try {
      // Usar o hook para fazer upload
      const publicUrl = await uploadImage(file, folder, bucketName)

      // Notificar componente pai
      onImageUploaded(publicUrl)
    } catch (error) {
      // O erro já é tratado pelo hook e mostrado via useEffect
    }
  }

  const handleRemoveImage = async () => {
    if (currentImageUrl && currentImageUrl.includes(bucketName)) {
      try {
        // Usar o hook para deletar a imagem
        await deleteImage(currentImageUrl, bucketName)
      } catch (error) {
        // Erro ao remover imagem do storage
      }
    }

    // Notificar componente pai
    onImageUploaded('')
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-input rounded-lg p-4">
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-32 mx-auto rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/70 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">{placeholder}</p>
            {recommendedSize && (
              <p className="text-xs text-muted-foreground/70">Recomendado: {recommendedSize}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? 'Alterar' : 'Selecionar'} Imagem
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveImage}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: {maxSizeMB}MB
      </p>
    </div>
  )
}