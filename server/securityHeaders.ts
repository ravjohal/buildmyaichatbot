import type { Request, Response, NextFunction } from 'express';

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const isWidgetRoute = req.path.startsWith('/widget') || 
                        req.path.startsWith('/api/public/') ||
                        req.path.startsWith('/api/chat/');

  res.setHeader('X-Content-Type-Options', 'nosniff');

  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()');

  if (isWidgetRoute) {
    res.removeHeader('X-Frame-Options');
    
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com wss: ws:",
      "frame-src https://js.stripe.com",
      "frame-ancestors *"
    ].join('; '));
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com wss: ws:",
      "frame-src https://js.stripe.com",
      "frame-ancestors 'self'"
    ].join('; '));
  }

  next();
}
