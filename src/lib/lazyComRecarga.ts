import { lazy, type ComponentType } from 'react'

const CHAVE = 'oonsystems_recarga_versao'

/**
 * `lazy` que se recupera de publicação nova: quem estava com o painel aberto
 * ainda tem os nomes dos arquivos da versão anterior; se um deles não existir
 * mais, recarrega a página uma vez para pegar a versão nova. Se falhar de novo
 * logo após recarregar, deixa o erro seguir (a tela de erro mostra a mensagem).
 */
export function lazyComRecarga<T extends ComponentType<any>>(importar: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const modulo = await importar()
      try { sessionStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
      return modulo
    } catch (erro) {
      let jaRecarregou = false
      try {
        jaRecarregou = sessionStorage.getItem(CHAVE) === '1'
        if (!jaRecarregou) sessionStorage.setItem(CHAVE, '1')
      } catch {
        jaRecarregou = true // sem armazenamento: não arrisca recarregar em laço
      }
      if (!jaRecarregou) {
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw erro
    }
  })
}
