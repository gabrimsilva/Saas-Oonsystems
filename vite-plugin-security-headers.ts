import type { Plugin } from 'vite'

/**
 * Plugin Vite para adicionar headers de segurança
 *
 * Só no servidor de desenvolvimento: em produção os cabeçalhos de segurança
 * (CSP, HSTS...) ficam em public/.htaccess, servido pela Hostinger.
 */
export function securityHeadersPlugin(): Plugin {
  return {
    name: 'vite-plugin-security-headers',

    // Produção: a CSP e os demais cabeçalhos vêm do servidor (public/.htaccess).
    // Não se injeta mais <meta> de CSP: com duas políticas o navegador aplica as
    // duas, e a antiga (mais aberta e desatualizada) barrava ajustes da nova.

    // Para desenvolvimento, adicionar headers ao servidor dev
    // Nota: X-Frame-Options e frame-ancestors só funcionam como HTTP headers, não em meta tags
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // Headers de segurança
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('X-XSS-Protection', '1; mode=block')
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

        // CSP mais permissivo para desenvolvimento (com frame-ancestors que funciona via header)
        const devCsp = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          // Em dev liberamos ws:// e wss:// genéricos para o HMR funcionar
          // ao acessar via IP da rede local (ex.: ws://10.3.11.80:5173)
          "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co",
          "frame-src 'self' blob:",
          "frame-ancestors 'self'"
        ].join('; ')

        res.setHeader('Content-Security-Policy', devCsp)

        next()
      })
    }
  }
}
