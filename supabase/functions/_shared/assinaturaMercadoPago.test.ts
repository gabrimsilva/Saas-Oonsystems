import { assertEquals } from 'jsr:@std/assert@1'
import { assinaturaValida } from './assinaturaMercadoPago.ts'

// HMAC-SHA256("segredo-teste", "id:123456;request-id:req-abc;ts:1704908010;")
// calculado de forma independente (Python hmac/hashlib)
const V1 = '14cbb96983bcd6c603cf74623e7ddb74729f40d9072c289973490a0cc41df3e0'
const HEADER = `ts=1704908010,v1=${V1}`

Deno.test('aceita assinatura correta', async () => {
  assertEquals(await assinaturaValida('segredo-teste', HEADER, 'req-abc', '123456'), true)
})

Deno.test('rejeita segredo errado', async () => {
  assertEquals(await assinaturaValida('outro-segredo', HEADER, 'req-abc', '123456'), false)
})

Deno.test('rejeita pagamento trocado (data.id diferente)', async () => {
  assertEquals(await assinaturaValida('segredo-teste', HEADER, 'req-abc', '999999'), false)
})

Deno.test('rejeita timestamp adulterado', async () => {
  assertEquals(
    await assinaturaValida('segredo-teste', `ts=1704908011,v1=${V1}`, 'req-abc', '123456'),
    false,
  )
})

Deno.test('rejeita header sem v1', async () => {
  assertEquals(await assinaturaValida('segredo-teste', 'ts=1704908010', 'req-abc', '123456'), false)
})
