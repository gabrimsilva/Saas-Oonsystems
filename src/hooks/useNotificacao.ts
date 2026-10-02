import { useEffect, useState } from 'react'
import { audioService } from '@/lib/audioService'
import { configuracaoService } from "@/services"

interface NotificacaoOptions {
  titulo: string
  corpo: string
  icone?: string
  som?: boolean
}

export const useNotificacao = () => {
  const [permissao, setPermissao] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      setPermissao(Notification.permission)
    }
  }, [])

  const solicitarPermissao = async (): Promise<NotificationPermission> => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setPermissao(permission)
      return permission
    }
    return 'denied'
  }

  const mostrarNotificacao = (options: NotificacaoOptions) => {
    // Verificar se temos permissão
    if (permissao !== 'granted') {
      return
    }

    // Criar notificação
    const notification = new Notification(options.titulo, {
      body: options.corpo,
      icon: options.icone || '/icon-192.png',
      badge: '/favicon.png',
      tag: 'novo-pedido', // Evita múltiplas notificações
      requireInteraction: false,
      silent: !options.som
    })

    // Auto-fechar após 5 segundos
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  }

  const tocarSom = async () => {
    try {
      // Buscar configurações de som
      const [somConfig, volumeConfig] = await Promise.all([
        configuracaoService.buscarPorChave('som_notificacao'),
        configuracaoService.buscarPorChave('volume_notificacao')
      ])

      const somSelecionado = somConfig?.valor || 'ding1'
      const volume = volumeConfig?.valor ? parseInt(volumeConfig.valor) / 100 : 0.7

      // Não tocar se som estiver desabilitado
      if (somSelecionado === 'none') {
        return
      }

      // Configurar volume e tocar som
      audioService.setVolume(volume)
      await audioService.playNotification(somSelecionado)
    } catch (error) {
      // Não foi possível tocar o som de notificação
    }
  }

  const notificarNovoPedido = async (numeroPedidos: number = 1) => {
    // Tocar som configurado
    await tocarSom()
    
    // Mostrar notificação do navegador
    mostrarNotificacao({
      titulo: 'Novo Pedido Recebido!',
      corpo: numeroPedidos === 1 
        ? 'Um novo pedido foi recebido e precisa de atenção.'
        : `${numeroPedidos} novos pedidos foram recebidos.`,
      som: false // Som já foi tocado acima
    })
  }

  return {
    permissao,
    solicitarPermissao,
    mostrarNotificacao,
    tocarSom,
    notificarNovoPedido
  }
}