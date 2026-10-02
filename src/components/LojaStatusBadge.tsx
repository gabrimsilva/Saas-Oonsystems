import { useLojaStatus } from '@/hooks/useLojaStatus'

interface LojaStatusBadgeProps {
  className?: string
}

export default function LojaStatusBadge({ className = '' }: LojaStatusBadgeProps) {
  const { isAberta, loading } = useLojaStatus()

  if (loading) {
    return (
      <div className={`text-xs px-2 py-1 rounded bg-muted text-muted-foreground ${className}`}>
        Carregando...
      </div>
    )
  }

  return (
    <div 
      className={`
        text-xs px-2 py-1 rounded font-medium transition-colors
        ${isAberta 
          ? 'bg-success/10 text-success border border-success/30' 
          : 'bg-destructive/10 text-destructive border border-destructive/30'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        <div 
          className={`
            w-2 h-2 rounded-full
            ${isAberta ? 'bg-success' : 'bg-destructive'}
          `}
        />
        {isAberta ? 'Loja Aberta' : 'Loja Fechada'}
      </div>
    </div>
  )
}