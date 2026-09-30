/**
 * Valida o header x-signature do Mercado Pago.
 * Manifest documentado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * (partes ausentes são omitidas; data.id alfanumérico vai em minúsculas).
 */
export async function assinaturaValida(
  secret: string,
  xSignature: string,
  xRequestId: string | null,
  dataId: string | null,
): Promise<boolean> {
  const partes = Object.fromEntries(
    xSignature.split(',').map((parte) => {
      const [chave, ...valor] = parte.trim().split('=')
      return [chave, valor.join('=')]
    }),
  )
  const ts = partes['ts']
  const v1 = partes['v1']
  if (!ts || !v1) return false

  let manifest = ''
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(manifest))
  const esperado = Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Comparação em tempo constante
  if (esperado.length !== v1.length) return false
  let diferenca = 0
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= esperado.charCodeAt(i) ^ v1.charCodeAt(i)
  }
  return diferenca === 0
}
