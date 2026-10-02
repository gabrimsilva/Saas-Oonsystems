/**
 * Vitrine do design system (somente em desenvolvimento: /dev/ui).
 * Monta o layout real do sistema com dados de exemplo e todos os estados dos
 * componentes, para revisão visual e referência dos padrões.
 */

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Eye,
  Filter,
  Inbox,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { EstabelecimentoContext, type EstabelecimentoContextType } from '@/contexts/EstabelecimentoContext'
import { MarcaDaLoja } from '@/components/layout/AppLayout'
import MenuLateral from '@/components/layout/MenuLateral'
import MenuUsuario from '@/components/layout/MenuUsuario'
import { GRUPOS_MENU } from '@/components/layout/navegacao'
import SeletorEstabelecimento from '@/components/estabelecimento/SeletorEstabelecimento'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Alerta, CabecalhoPagina, EstadoVazio, Spinner } from '@/components/ui/feedback'
import { CartaoIndicador } from '@/components/ui/indicador'
import { textoAjuda, textoErro } from '@/components/ui/estilos'
import toast from 'react-hot-toast'
import { useTabelaResponsiva } from '@/hooks/useTabelaResponsiva'

const ESTAB = { id: 'e1', nome: 'Loja Centro', slug: 'loja-centro', descricao: null, cor_tema: '#2563EB', ativo: true, criado_em: '' }
const CONTEXTO: EstabelecimentoContextType = {
  estabelecimentoAtual: ESTAB,
  estabelecimentosAutorizados: [ESTAB, { ...ESTAB, id: 'e2', nome: 'Loja Shopping', cor_tema: '#059669' }],
  perfil: 'administrador_geral',
  usuario: {
    id: 'u1', user_id: 'u1', nome: 'Mariana Souza', email: 'mariana@empresa.com.br', perfil: 'administrador_geral',
    estabelecimento_id: null, ativo: true, ultimo_estabelecimento_id: 'e1', criado_em: '',
  },
  podeTrocar: true,
  loading: false,
  erro: null,
  trocarEstabelecimento: async () => undefined,
  recarregar: async () => undefined,
}

const PRODUTOS = [
  { nome: 'Camiseta básica', categoria: 'Roupas', preco: 'R$ 59,90', estoque: 42, status: 'ok' },
  { nome: 'Calça jeans slim', categoria: 'Roupas', preco: 'R$ 189,90', estoque: 4, status: 'baixo' },
  { nome: 'Tênis casual', categoria: 'Calçados', preco: 'R$ 249,00', estoque: 0, status: 'zerado' },
  { nome: 'Boné aba curva', categoria: 'Acessórios', preco: 'R$ 79,90', estoque: 18, status: 'ok' },
] as const

const STATUS_ESTOQUE = {
  ok: <Badge variant="success">Em estoque</Badge>,
  baixo: <Badge variant="warning">Estoque baixo</Badge>,
  zerado: <Badge variant="destructive">Sem estoque</Badge>,
}

export default function VitrineUI() {
  const tabelaRef = useTabelaResponsiva()
  const [pagina, setPagina] = useState('produtos')
  const [recolhido, setRecolhido] = useState(false)
  const [ativo, setAtivo] = useState(true)

  return (
    <EstabelecimentoContext.Provider value={CONTEXTO}>
      <div className="flex h-screen w-full bg-background">
        <aside className={`hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ${recolhido ? 'w-16' : 'w-64'}`}>
          <div className={`flex h-14 shrink-0 items-center border-b border-sidebar-border ${recolhido ? 'justify-center px-2' : 'px-4'}`}>
            <MarcaDaLoja logoUrl="" nome="Loja Centro" compacta={recolhido} />
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto py-4 ${recolhido ? 'px-2' : 'px-3'}`}>
            <MenuLateral grupos={GRUPOS_MENU} paginaAtual={pagina} onNavegar={setPagina} recolhido={recolhido} />
          </div>
          <div className="border-t border-sidebar-border p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setRecolhido(!recolhido)}>
              {recolhido ? 'Expandir' : 'Recolher menu'}
            </Button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
            <div>
              <nav className="flex items-center gap-1 text-xs text-muted-foreground">Catálogo e estoque</nav>
              <p className="text-[15px] font-semibold leading-tight text-foreground">Produtos</p>
            </div>
            <div className="flex items-center gap-2">
              <SeletorEstabelecimento />
              <div className="mx-1 h-6 w-px bg-border" />
              <MenuUsuario onSair={() => toast('Sair')} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-6 p-6">
              <CabecalhoPagina
                icone={Package}
                titulo="Produtos"
                descricao="Cadastro de produtos, preços e controle de estoque."
                acoes={
                  <>
                    <Button variant="outline"><Download /> Exportar</Button>
                    <Button><Plus /> Novo produto</Button>
                  </>
                }
              />

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <CartaoIndicador titulo="Faturamento do mês" valor="R$ 48.320,50" descricao="+12% vs. mês anterior" icone={DollarSign} tom="primario" />
                <CartaoIndicador titulo="Lucro" valor="R$ 14.210,00" descricao="29,4% de margem" icone={TrendingUp} tom="sucesso" colorirValor />
                <CartaoIndicador titulo="Vendas" valor="1.284" descricao="últimos 30 dias" icone={ShoppingCart} tom="info" />
                <CartaoIndicador titulo="Estoque baixo" valor="8" descricao="produtos para repor" icone={Package} tom="atencao" />
              </div>

              <Alerta tipo="atencao" titulo="8 produtos com estoque baixo" acao={<Button variant="outline" size="sm">Ver produtos</Button>}>
                Reponha antes do fim de semana para não perder vendas.
              </Alerta>

              <Card className="gap-0 py-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                  <div className="relative min-w-[220px] flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar por nome ou código..." />
                  </div>
                  <Select defaultValue="todas">
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as categorias</SelectItem>
                      <SelectItem value="roupas">Roupas</SelectItem>
                      <SelectItem value="calcados">Calçados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline"><Filter /> Filtros</Button>
                </div>
                <div ref={tabelaRef} className="tabela-responsiva"><Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PRODUTOS.map((p) => (
                      <TableRow key={p.nome}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.preco}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.estoque}</TableCell>
                        <TableCell>{STATUS_ESTOQUE[p.status]}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon-sm" aria-label="Ver"><Eye /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Editar"><Pencil /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Excluir" className="text-destructive hover:bg-destructive/5 hover:text-destructive"><Trash2 /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table></div>
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  <span>Mostrando 1–4 de 312</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" aria-label="Anterior" disabled><ChevronLeft /></Button>
                    <Button variant="outline" size="sm" className="border-primary/30 bg-primary/5 text-primary">1</Button>
                    <Button variant="ghost" size="sm">2</Button>
                    <Button variant="ghost" size="sm">3</Button>
                    <Button variant="outline" size="icon-sm" aria-label="Próxima"><ChevronRight /></Button>
                  </div>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Formulário</CardTitle>
                    <CardDescription>Estados de campos: padrão, foco, erro, sucesso e desabilitado.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="v-nome">Nome do produto</Label>
                      <Input id="v-nome" placeholder="Ex.: Camiseta básica" />
                      <p className={textoAjuda}>Aparece no catálogo e no PDV.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="v-erro">Preço</Label>
                        <Input id="v-erro" defaultValue="0,00" aria-invalid />
                        <p className={textoErro}>Informe um preço maior que zero.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="v-ok">Código de barras</Label>
                        <Input id="v-ok" defaultValue="7891234567890" data-valid="true" />
                        <p className="text-xs font-medium text-success">Código válido.</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-dis">Estabelecimento</Label>
                      <Input id="v-dis" defaultValue="Loja Centro" disabled />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-obs">Descrição</Label>
                      <Textarea id="v-obs" placeholder="Detalhes do produto..." rows={3} />
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Controlar estoque</label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="v" defaultChecked /> Varejo</label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="v" /> Atacado</label>
                    </div>
                    <Switch checked={ativo} onChange={setAtivo} label="Produto ativo" description="Desativado, o produto some do catálogo e do PDV." />
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Botões</CardTitle>
                      <CardDescription>Hierarquia e estados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button>Primário</Button>
                        <Button variant="secondary">Secundário</Button>
                        <Button variant="outline">Contorno</Button>
                        <Button variant="ghost">Fantasma</Button>
                        <Button variant="destructive">Excluir</Button>
                        <Button variant="link">Link</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button loading>Salvando</Button>
                        <Button disabled>Desabilitado</Button>
                        <Button size="sm">Pequeno</Button>
                        <Button size="lg">Grande</Button>
                        <Button variant="outline" size="icon" aria-label="Editar"><Pencil /></Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Feedback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge>Novo</Badge>
                        <Badge variant="secondary">Rascunho</Badge>
                        <Badge variant="success">Pago</Badge>
                        <Badge variant="warning">Pendente</Badge>
                        <Badge variant="destructive">Cancelado</Badge>
                        <Badge variant="info">Em trânsito</Badge>
                        <Badge variant="outline">Neutro</Badge>
                      </div>
                      <Alerta tipo="sucesso">Pedido #1042 confirmado.</Alerta>
                      <Alerta tipo="erro" titulo="Não foi possível salvar">Verifique a conexão e tente novamente.</Alerta>
                      <Alerta tipo="info">O catálogo é atualizado em tempo real.</Alerta>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast.success('Produto salvo')}>Toast de sucesso</Button>
                        <Button variant="outline" size="sm" onClick={() => toast.error('Falha ao salvar')}>Toast de erro</Button>
                        <Dialog>
                          <DialogTrigger asChild><Button variant="outline" size="sm">Abrir modal</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Excluir produto</DialogTitle>
                              <DialogDescription>O produto sai do catálogo e do PDV. Esta ação não pode ser desfeita.</DialogDescription>
                            </DialogHeader>
                            <Alerta tipo="atencao">Existem 3 pedidos em aberto com este produto.</Alerta>
                            <DialogFooter>
                              <Button variant="outline">Cancelar</Button>
                              <Button variant="destructive">Excluir</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Spinner />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card>
                <Tabs defaultValue="vazio" className="px-5">
                  <TabsList>
                    <TabsTrigger value="vazio">Estado vazio</TabsTrigger>
                    <TabsTrigger value="cards">Cards clicáveis</TabsTrigger>
                  </TabsList>
                  <TabsContent value="vazio">
                    <EstadoVazio
                      icone={Inbox}
                      titulo="Nenhum pedido por aqui"
                      descricao="Quando um cliente fizer um pedido pelo catálogo, ele aparece nesta lista."
                      acao={<Button variant="outline">Ver catálogo</Button>}
                    />
                  </TabsContent>
                  <TabsContent value="cards" className="grid gap-4 py-4 sm:grid-cols-3">
                    {['PDV', 'Comandas', 'Pedidos'].map((t) => (
                      <Card key={t} interativo className="py-4">
                        <CardContent className="px-4">
                          <p className="font-semibold">{t}</p>
                          <p className="text-sm text-muted-foreground">Passe o mouse para ver a resposta.</p>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </EstabelecimentoContext.Provider>
  )
}
