import type { Plugin } from 'vite'

/**
 * Plugin Vite para adicionar headers de segurança
 *
 * Este plugin injeta headers de segurança no HTML durante o build,
 * incluindo Content Security Policy (CSP) e outros headers importantes.
 *
 * Nota: Headers HTTP reais devem ser configurados no servidor de hospedagem.
 * Este plugin adiciona meta tags como fallback e para desenvolvimento.
 */
export function securityHeadersPlugin(): Plugin {
  return {
    name: 'vite-plugin-security-headers',

    transformIndexHtml(html, ctx) {
      // Em desenvolvimento (dev server) NÃO injetamos a meta CSP estrita.
      // O 'upgrade-insecure-requests' quebra o acesso via IP da rede local
      // (http://192.168.x:5173), pois força os scripts para https sem TLS,
      // resultando em tela branca. Em dev, o CSP é aplicado via header HTTP
      // (configureServer) de forma mais permissiva.
      if (ctx.server) {
        return html
      }

      // Content Security Policy (apenas para o build de produção)
      // Nota: frame-ancestors não funciona em meta tag, apenas em HTTP header
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://maps.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: http:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://viacep.com.br https://wa.me https://api.openai.com ws://localhost:* wss://localhost.qz.io:* http://localhost:*",
        "frame-src 'self' https://maps.googleapis.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; ')

      // Adicionar meta tag CSP logo após o charset
      const cspMetaTag = `  <meta http-equiv="Content-Security-Policy" content="${csp}" />`

      // Inserir após a primeira meta tag
      html = html.replace(
        /<meta charset="UTF-8" \/>/,
        `<meta charset="UTF-8" />\n${cspMetaTag}`
      )

      return html
    },

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
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://maps.googleapis.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          // Em dev liberamos ws:// e wss:// genéricos para o HMR funcionar
          // ao acessar via IP da rede local (ex.: ws://10.3.11.80:5173)
          "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://viacep.com.br https://wa.me https://api.openai.com",
          "frame-src 'self' https://maps.googleapis.com",
          "frame-ancestors 'self'"
        ].join('; ')

        res.setHeader('Content-Security-Policy', devCsp)

        next()
      })
    }
  }
}
