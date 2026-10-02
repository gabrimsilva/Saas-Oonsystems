import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldOff, LogOut } from "lucide-react"
import { authService } from "@/services"
import { useConfig } from "@/contexts/ConfigContext"

export default function UsuarioBloqueado() {
  const { nomeEstabelecimento } = useConfig()

  useEffect(() => {
    // Fazer logout automático após 5 segundos
    const timer = setTimeout(() => {
      handleLogout()
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <ShieldOff className="h-10 w-10 text-destructive" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Acesso Bloqueado
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Seu acesso ao sistema foi bloqueado
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
            <p className="text-sm text-destructive text-center">
              Seu usuário foi bloqueado pelo administrador do sistema.
              <br />
              Entre em contato com {nomeEstabelecimento || 'o estabelecimento'} para mais informações.
            </p>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Você será desconectado automaticamente em 5 segundos...
          </div>

          <Button 
            onClick={handleLogout}
            className="w-full bg-slate-900 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair Agora
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
