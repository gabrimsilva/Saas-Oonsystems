import { useEffect } from 'react'

const DEFAULT_FAVICON = '/favicon.png'

export const useFavicon = (faviconUrl?: string) => {
  useEffect(() => {
    // Encontrar o link do favicon atual
    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    
    // Se não existir, criar um novo
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      faviconLink.type = 'image/png'
      document.head.appendChild(faviconLink)
    }

    // Usar favicon personalizado se disponível, senão usar o padrão
    const urlToUse = faviconUrl && faviconUrl.trim() !== '' ? faviconUrl : DEFAULT_FAVICON
    
    // Atualizar o href do favicon apenas se for diferente
    if (faviconLink.href !== urlToUse) {
      faviconLink.href = urlToUse
      
      // Atualizar o tipo baseado na extensão do arquivo
      if (urlToUse.endsWith('.ico')) {
        faviconLink.type = 'image/x-icon'
      } else if (urlToUse.endsWith('.png')) {
        faviconLink.type = 'image/png'
      } else if (urlToUse.endsWith('.svg')) {
        faviconLink.type = 'image/svg+xml'
      }
    }
  }, [faviconUrl])
}