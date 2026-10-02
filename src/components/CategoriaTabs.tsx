import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Pizza, 
  Sandwich, 
  Wine, 
  Beer, 
  Package2,
  Flame,
  Grid3x3,
  type LucideIcon
} from "lucide-react"
import type { CategoriaSupabase } from "@/types/supabase"

interface CategoriaTabsProps {
  categorias: CategoriaSupabase[]
  categoriaAtiva: string
  onCategoriaChange: (categoria: string) => void
  mostrarPromocoes?: boolean
  mostrarTodas?: boolean
}

/**
 * Mapeamento de ícones por categoria
 */
const iconesCategoria: Record<string, LucideIcon> = {
  'pizzas': Pizza,
  'pizza': Pizza,
  'lanches': Sandwich,
  'lanche': Sandwich,
  'bebidas': Wine,
  'bebida': Wine,
  'cervejas': Beer,
  'cerveja': Beer,
  'combo': Package2,
  'combos': Package2,
}

/**
 * Retorna o ícone apropriado para uma categoria
 */
const getIconeCategoria = (nomeCategoria: string): LucideIcon => {
  const nome = nomeCategoria.toLowerCase()
  return iconesCategoria[nome] || Grid3x3
}

/**
 * Componente de tabs para filtrar produtos por categoria
 */
export default function CategoriaTabs({
  categorias,
  categoriaAtiva,
  onCategoriaChange,
  mostrarPromocoes = true,
  mostrarTodas = true,
}: CategoriaTabsProps) {
  return (
    <Tabs value={categoriaAtiva} onValueChange={onCategoriaChange} className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-2 bg-muted/50 p-2">
        {mostrarTodas && (
          <TabsTrigger 
            value="todas" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">Todas</span>
          </TabsTrigger>
        )}
        
        {mostrarPromocoes && (
          <TabsTrigger 
            value="promocoes" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Promoções</span>
          </TabsTrigger>
        )}

        {categorias
          .filter(cat => cat.ativa)
          .map((categoria) => {
            const Icone = getIconeCategoria(categoria.nome)
            return (
              <TabsTrigger
                key={categoria.id}
                value={categoria.nome.toLowerCase()}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icone className="h-4 w-4" />
                <span className="hidden sm:inline">{categoria.nome}</span>
              </TabsTrigger>
            )
          })}
      </TabsList>
    </Tabs>
  )
}
