import { beforeEach, describe, expect, it, vi } from 'vitest'

const { insert, eqUpdate, from } = vi.hoisted(() => {
  const single = vi.fn().mockResolvedValue({ data: { id: 'job-1' }, error: null })
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn((_: Record<string, unknown>) => ({ select }))
  const eqUpdate = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq: eqUpdate }))
  const from = vi.fn(() => ({ insert, update }))
  return { insert, eqUpdate, from }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/lib/qzTrayService', () => ({ qzTrayService: {} }))
vi.mock('./configuracaoService', () => ({ configuracaoService: {} }))
vi.mock('./receiptService', () => ({ receiptService: {} }))

import { printJobService } from './printJobService'
import { EstabelecimentoNaoSelecionadoError, setEstabelecimentoAtivo } from './tenant'

describe('printJobService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEstabelecimentoAtivo(null)
  })

  it('grava o job no estabelecimento ativo', async () => {
    setEstabelecimentoAtivo('estab-1')

    await printJobService.create({ refType: 'SALE', refId: 'venda-1' })

    expect(from).toHaveBeenCalledWith('print_jobs')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        estabelecimento_id: 'estab-1',
        ref_type: 'SALE',
        ref_id: 'venda-1',
        status: 'PENDING',
        attempts: 0,
      }),
    )
  })

  it('salva o cupom na venda antes de criar o job', async () => {
    setEstabelecimentoAtivo('estab-1')

    await printJobService.create({ refType: 'SALE', refId: 'venda-1', receiptHtml: '<p>cupom</p>' })

    expect(from).toHaveBeenCalledWith('sales')
    expect(eqUpdate).toHaveBeenCalledWith('id', 'venda-1')
  })

  it('não cria job sem estabelecimento ativo', async () => {
    await expect(printJobService.create({ refType: 'ORDER', refId: 'pedido-1' })).rejects.toThrow(
      EstabelecimentoNaoSelecionadoError,
    )
    expect(insert).not.toHaveBeenCalled()
  })
})
