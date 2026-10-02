import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Skeleton loader para formulário de dados do cliente
 *
 * Simula os campos de input do formulário de checkout
 */
export function FormularioClienteSkeleton() {
  return (
    <div className="space-y-4">
      {/* Nome e Sobrenome */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Telefone e CPF */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* CEP */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Endereço e Número */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Bairro */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Cidade e Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader para resumo do pedido
 *
 * Simula a estrutura do resumo com itens e totais
 */
export function ResumoPedidoSkeleton({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Itens do pedido */}
        <div className="space-y-3">
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-16 h-16 rounded flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        <Separator />

        {/* Totais */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Separator />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader para opções de pagamento
 *
 * Simula os cards de formas de pagamento
 */
export function FormasPagamentoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />

      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton loader completo para página de checkout
 *
 * Combina todos os skeletons em um layout de checkout completo
 *
 * @param step - Etapa atual do checkout (1 ou 2)
 *
 * @example
 * ```tsx
 * {carregando ? (
 *   <CheckoutSkeleton step={1} />
 * ) : (
 *   <CheckoutContent />
 * )}
 * ```
 */
export function CheckoutSkeleton({ step = 1 }: { step?: number }) {
  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header skeleton */}
      <div className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stepper skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-1 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 ? (
              <>
                {/* Tipo de entrega skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </CardContent>
                </Card>

                {/* Formulário de dados */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <FormularioClienteSkeleton />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Formas de pagamento skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <FormasPagamentoSkeleton />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Coluna lateral - Resumo */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ResumoPedidoSkeleton />
            </div>
          </div>
        </div>

        {/* Botões de navegação */}
        <div className="mt-8 flex justify-between">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    </div>
  )
}
