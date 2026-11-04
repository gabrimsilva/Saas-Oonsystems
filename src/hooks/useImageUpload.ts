import { useState } from 'react'
import { supabase } from "@/services"
import { caminhoNoBucket, pastaDoEstabelecimento } from "@/services/tenant"

export interface UseImageUploadReturn {
  uploading: boolean
  uploadImage: (file: File, folder?: string, bucketName?: string) => Promise<string>
  deleteImage: (path: string, bucketName?: string) => Promise<void>
  error: string | null
}

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadImage = async (file: File, folder: string = 'produtos', bucketName: string = 'produtos-imagens'): Promise<string> => {
    try {
      setUploading(true)
      setError(null)

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Arquivo deve ser uma imagem')
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Imagem deve ter no máximo 5MB')
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${pastaDoEstabelecimento(folder)}/${fileName}`

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Retornar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path)

      return publicUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload da imagem'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (path: string, bucketName: string = 'produtos-imagens'): Promise<void> => {
    try {
      setError(null)
      
      // Extrair o caminho do arquivo da URL
      const filePath = caminhoNoBucket(path, bucketName)
      if (!filePath) return

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath])

      if (error) {
        throw error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir imagem'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    uploading,
    uploadImage,
    deleteImage,
    error
  }
}