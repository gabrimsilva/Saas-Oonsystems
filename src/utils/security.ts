/**
 * Utilitários de Segurança
 *
 * Módulo com funções para proteção contra ataques comuns, incluindo
 * validação de origem, rate limiting, e validações de segurança.
 *
 * @module utils/security
 */

/**
 * Lista de origens permitidas para o aplicativo
 * Em produção, deve conter apenas o domínio da aplicação
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Desenvolvimento Vite
  'http://localhost:3000', // Desenvolvimento alternativo
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://oonsystems.com.br',
  'https://www.oonsystems.com.br',
]

/**
 * Configuração de rate limiting por tipo de operação
 */
const RATE_LIMITS = {
  PEDIDO: { maxRequests: 5, windowMs: 60000 }, // 5 pedidos por minuto
  CONFIGURACAO: { maxRequests: 10, windowMs: 60000 }, // 10 alterações por minuto
  AUTENTICACAO: { maxRequests: 3, windowMs: 300000 }, // 3 tentativas por 5 minutos
  GERAL: { maxRequests: 100, windowMs: 60000 } // 100 requests gerais por minuto
}

/**
 * Cache para armazenar timestamps de requests (rate limiting)
 */
const requestTimestamps: Map<string, number[]> = new Map()

/**
 * Valida se a origem do request é permitida
 *
 * Previne ataques de sites maliciosos tentando fazer requests
 * para a API em nome do usuário.
 *
 * @param origin - Origem do request (window.location.origin)
 * @returns true se a origem é permitida
 *
 * @example
 * ```ts
 * if (!validateOrigin(window.location.origin)) {
 *   throw new Error('Origem não autorizada')
 * }
 * ```
 */
export function validateOrigin(origin?: string): boolean {
  // Em desenvolvimento, aceitar qualquer localhost
  if (import.meta.env.DEV) {
    return origin?.includes('localhost') || origin?.includes('127.0.0.1') || false
  }

  // Em produção, validar contra lista de origens permitidas
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * Valida se o referer é do próprio domínio
 *
 * @param referer - Referer do request (document.referrer)
 * @returns true se o referer é válido
 */
export function validateReferer(referer?: string): boolean {
  if (!referer) return false

  try {
    const refererUrl = new URL(referer)
    const currentOrigin = window.location.origin

    return refererUrl.origin === currentOrigin
  } catch {
    return false
  }
}

/**
 * Gera um token único para identificar sessão/dispositivo
 *
 * Pode ser usado como proteção adicional contra replay attacks
 *
 * @returns Token único baseado em características do navegador
 */
export function generateDeviceToken(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage
  ]

  // Criar hash simples dos componentes
  const fingerprint = components.join('|')
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return `dt_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`
}

/**
 * Implementa rate limiting simples no lado do cliente
 *
 * Previne múltiplas requisições repetidas em curto período de tempo,
 * que podem indicar comportamento malicioso ou automatizado.
 *
 * @param identifier - Identificador único (ex: userId, operationType)
 * @param operationType - Tipo de operação (PEDIDO, CONFIGURACAO, etc)
 * @returns true se o rate limit foi excedido
 *
 * @example
 * ```ts
 * if (isRateLimited('user123', 'PEDIDO')) {
 *   throw new Error('Muitas tentativas. Aguarde um momento.')
 * }
 * ```
 */
export function isRateLimited(
  identifier: string,
  operationType: keyof typeof RATE_LIMITS = 'GERAL'
): boolean {
  const key = `${identifier}_${operationType}`
  const config = RATE_LIMITS[operationType]
  const now = Date.now()

  // Obter timestamps anteriores
  let timestamps = requestTimestamps.get(key) || []

  // Remover timestamps fora da janela
  timestamps = timestamps.filter(ts => now - ts < config.windowMs)

  // Verificar se excedeu o limite
  if (timestamps.length >= config.maxRequests) {
    return true
  }

  // Adicionar timestamp atual
  timestamps.push(now)
  requestTimestamps.set(key, timestamps)

  return false
}

/**
 * Limpa registros de rate limiting antigos
 *
 * Deve ser chamado periodicamente para evitar memory leaks
 */
export function cleanupRateLimitCache(): void {
  const now = Date.now()
  const maxWindowMs = Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs))

  for (const [key, timestamps] of requestTimestamps.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < maxWindowMs)

    if (validTimestamps.length === 0) {
      requestTimestamps.delete(key)
    } else {
      requestTimestamps.set(key, validTimestamps)
    }
  }
}

/**
 * Middleware de segurança para operações críticas
 *
 * Valida origem, referer e aplica rate limiting
 *
 * @param identifier - Identificador do usuário/sessão
 * @param operationType - Tipo de operação
 * @throws Error se falhar em alguma validação
 *
 * @example
 * ```ts
 * async function criarPedido(dados) {
 *   // Validações de segurança
 *   await securityMiddleware('user123', 'PEDIDO')
 *
 *   // Prosseguir com operação
 *   return await pedidoService.salvar(dados)
 * }
 * ```
 */
export async function securityMiddleware(
  identifier: string,
  operationType: keyof typeof RATE_LIMITS = 'GERAL'
): Promise<void> {
  // 1. Validar origem
  if (!validateOrigin(window.location.origin)) {
    console.error('[SECURITY] Origem não autorizada:', window.location.origin)
    throw new Error('Operação não autorizada: origem inválida')
  }

  // 2. Validar referer (se disponível)
  if (document.referrer && !validateReferer(document.referrer)) {
    console.warn('[SECURITY] Referer suspeito:', document.referrer)
    // Não bloquear por referer, apenas logar warning
  }

  // 3. Rate limiting
  if (isRateLimited(identifier, operationType)) {
    console.error('[SECURITY] Rate limit excedido:', { identifier, operationType })
    throw new Error('Muitas tentativas. Aguarde um momento antes de tentar novamente.')
  }

  // 4. Validar que há uma sessão ativa (para operações autenticadas)
  if (operationType === 'CONFIGURACAO') {
    // Verificar se há token de autenticação
    const hasAuth = !!localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
    if (!hasAuth) {
      throw new Error('Operação requer autenticação')
    }
  }

  // Log de segurança (em produção, enviar para servidor de logs)
  console.debug('[SECURITY] Validação aprovada:', {
    identifier,
    operationType,
    timestamp: new Date().toISOString()
  })
}

/**
 * Valida se um timestamp não está muito no futuro ou passado
 *
 * Previne replay attacks com timestamps manipulados
 *
 * @param timestamp - Timestamp a validar
 * @param maxAgeMs - Idade máxima permitida em ms (padrão: 5 minutos)
 * @returns true se o timestamp é válido
 */
export function validateTimestamp(timestamp: number, maxAgeMs: number = 300000): boolean {
  const now = Date.now()
  const diff = Math.abs(now - timestamp)

  // Não aceitar timestamps muito antigos ou no futuro
  return diff <= maxAgeMs
}

/**
 * Adiciona parâmetros de segurança a uma URL
 *
 * @param url - URL base
 * @param params - Parâmetros adicionais
 * @returns URL com parâmetros de segurança
 */
export function addSecurityParams(url: string, params: Record<string, string> = {}): string {
  const urlObj = new URL(url)

  // Adicionar timestamp para prevenir cache
  urlObj.searchParams.set('_t', Date.now().toString())

  // Adicionar device token
  urlObj.searchParams.set('_dt', generateDeviceToken())

  // Adicionar parâmetros adicionais
  for (const [key, value] of Object.entries(params)) {
    urlObj.searchParams.set(key, value)
  }

  return urlObj.toString()
}

/**
 * Limpa dados sensíveis do localStorage/sessionStorage
 *
 * Deve ser chamado no logout ou quando detectar comportamento suspeito
 */
export function clearSensitiveData(): void {
  // Remover tokens de autenticação
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('session')) {
      localStorage.removeItem(key)
    }
  })

  // Limpar cache de rate limiting
  requestTimestamps.clear()

  console.info('[SECURITY] Dados sensíveis removidos')
}

/**
 * Configurar limpeza automática de cache a cada 10 minutos
 */
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimitCache, 10 * 60 * 1000)
}

/**
 * Exportar configurações para permitir customização
 */
export const SecurityConfig = {
  ALLOWED_ORIGINS,
  RATE_LIMITS
}
