import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Support redirect parameter for post-login navigation
    const redirect = req.query.redirect as string;
    if (redirect && typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
      // Store safe relative path in session for post-login redirect
      req.session.returnTo = redirect;
      // Save session before redirecting to OIDC provider
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err);
          return next(err);
        }
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      });
    } else {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Check for returnTo in session and redirect there
        const returnTo = req.session.returnTo;
        if (returnTo) {
          delete req.session.returnTo; // Clear it after use
          return res.redirect(returnTo);
        }
        
        // Default redirect to dashboard
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  console.log("[AUTH] isAuthenticated check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userClaims: user?.claims?.sub,
    expiresAt: user?.expires_at,
  });

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("[AUTH] ✗ Not authenticated or missing expires_at");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log("[AUTH] ✓ Token still valid");
    return next();
  }

  console.log("[AUTH] Token expired, attempting refresh");
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("[AUTH] ✗ No refresh token available");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("[AUTH] ✓ Token refreshed successfully");
    return next();
  } catch (error) {
    console.log("[AUTH] ✗ Token refresh failed:", error);
    // Clear the invalid session and require re-login
    req.logout((err) => {
      if (err) console.error("[AUTH] Logout error:", err);
    });
    req.session.destroy((err) => {
      if (err) console.error("[AUTH] Session destroy error:", err);
    });
    res.status(401).json({ 
      message: "Session expired. Please log in again.",
      requireLogin: true 
    });
    return;
  }
};
