import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// Session configuration (30 days)
export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for session store");
  }
  
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  sessionStore.on('error', (error: Error) => {
    console.error('Session store error:', error);
  });
  
  return session({
    secret: process.env.SESSION_SECRET,
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

// Setup authentication
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy (Email/Password)
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = userResult[0];
        
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }
        
        if (!user.password) {
          return done(null, false, { message: 'Please use Google sign-in for this account.' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Passport Google OAuth Strategy (if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/auth/google/callback`,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find user by Google ID
          let userResult = await db.select().from(users).where(eq(users.googleId, profile.id)).limit(1);
          let user = userResult[0];
          
          if (!user) {
            // Check if email already exists
            const emailResult = await db.select().from(users).where(eq(users.email, profile.emails?.[0]?.value || '')).limit(1);
            
            if (emailResult[0]) {
              // Update existing user with Google ID
              await db.update(users)
                .set({ googleId: profile.id })
                .where(eq(users.email, profile.emails?.[0]?.value || ''));
              user = emailResult[0];
            } else {
              // Create new user
              const newUser = {
                email: profile.emails?.[0]?.value || '',
                googleId: profile.id,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
              };
              
              await storage.upsertUser(newUser);
              
              userResult = await db.select().from(users).where(eq(users.email, newUser.email)).limit(1);
              user = userResult[0];
            }
          }
          
          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    ));
  }

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser[0]) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      await storage.upsertUser({
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
      });
      
      // Get the created user
      const newUserResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const newUser = newUserResult[0];
      
      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.status(201).json({ message: 'Registration successful', user: newUser });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login route
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        return res.json({ message: 'Login successful', user });
      });
    })(req, res, next);
  });

  // Google OAuth routes (if configured)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
      (req, res) => {
        // Success - redirect to dashboard
        const returnTo = (req.session as any)?.returnTo || '/';
        delete (req.session as any)?.returnTo;
        res.redirect(returnTo);
      }
    );
  }

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destroy error:', err);
          }
        });
      }
      
      res.json({ message: 'Logout successful' });
    });
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log("[AUTH] isAuthenticated check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID,
  });

  // Check if session exists
  if (!req.session) {
    console.log("[AUTH] ✗ No session available");
    return res.status(401).json({ 
      message: "Session unavailable. Please log in again.",
      requireLogin: true 
    });
  }

  if (!req.isAuthenticated() || !req.user) {
    console.log("[AUTH] ✗ Not authenticated");
    return res.status(401).json({ 
      message: "Unauthorized. Please log in.",
      requireLogin: true 
    });
  }

  console.log("[AUTH] ✓ Authenticated");
  return next();
};
