import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"
import ImageUpload from "@/components/ImageUpload"

interface ConfiguracoesVisuaisProps {
  logoUrl: string
  bannerUrl: string
  onLogoChange: (url: string) => void
  onBannerChange: (url: string) => void
}

/**
 * Componente para configurações visuais do sistema
 *
 * Permite configurar logo e banner.
 */
export function ConfiguracoesVisuais({
  logoUrl,
  bannerUrl,
  onLogoChange,
  onBannerChange
}: ConfiguracoesVisuaisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configurações Visuais
        </CardTitle>
        <CardDescription>
          Configure logo e banner do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Logo da Loja</label>
          <ImageUpload
            currentImageUrl={logoUrl}
            onImageUploaded={onLogoChange}
            bucketName="sistema-imagens"
            folder="logos"
            recommendedSize="200x200px"
            placeholder="Clique para fazer upload do logo"
            maxSizeMB={2}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Banner Principal</label>
          <ImageUpload
            currentImageUrl={bannerUrl}
            onImageUploaded={onBannerChange}
            bucketName="sistema-imagens"
            folder="banners"
            recommendedSize="1400x200px"
            placeholder="Clique para fazer upload do banner"
            maxSizeMB={5}
          />
          <p className="text-xs text-muted-foreground">Banner principal do header (recomendado: 1400x200px)</p>
        </div>
      </CardContent>
    </Card>
  )
}
