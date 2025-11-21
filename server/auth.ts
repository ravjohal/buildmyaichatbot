import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getUncachableResendClient } from "./emails/resend-client";
import { stripe } from "./stripe-config";

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
      sameSite: 'lax',
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

  // Helper function to sanitize user data before sending to client
  // SECURITY: Never expose password hashes or sensitive internal fields
  const sanitizeUser = (user: any) => {
    if (!user) return null;
    const { password, googleId, ...safeUser } = user;
    return safeUser;
  };

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
      
      // Create user with consent timestamps
      const now = new Date();
      await storage.upsertUser({
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      });
      
      // Get the created user
      const newUserResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const newUser = newUserResult[0];
      
      // Send notification to admin users about new signup
      (async () => {
        try {
          const { notificationService } = await import('./emails/notification-service');
          
          // Get all admin users
          const adminUsers = await db.select().from(users).where(eq(users.isAdmin, "true"));
          
          // Send email to each admin
          for (const admin of adminUsers) {
            await notificationService.sendNewUserSignupNotification(
              admin.email,
              {
                userName: `${newUser.firstName} ${newUser.lastName}`.trim() || 'Unknown',
                userEmail: newUser.email,
                signupDate: new Date().toLocaleString('en-US', { 
                  dateStyle: 'long', 
                  timeStyle: 'short' 
                }),
              }
            );
          }
        } catch (emailError) {
          // Log error but don't fail registration
          console.error('[EMAIL] Failed to send admin signup notification:', emailError);
        }
      })();
      
      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.status(201).json({ message: 'Registration successful', user: sanitizeUser(newUser) });
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
        console.error('[AUTH] Login error:', err);
        return res.status(500).json({ message: 'An error occurred during login. Please try again.' });
      }
      
      if (!user) {
        // Return clear error message for invalid credentials
        const errorMessage = info?.message || 'Incorrect email or password';
        console.log('[AUTH] Login failed:', errorMessage);
        return res.status(401).json({ message: errorMessage });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('[AUTH] Session creation error:', err);
          return res.status(500).json({ message: 'Login failed. Please try again.' });
        }
        console.log('[AUTH] Login successful for user:', user.email);
        return res.json({ message: 'Login successful', user: sanitizeUser(user) });
      });
    })(req, res, next);
  });


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

  // Forgot password - request reset link
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user by email
      const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = userResult[0];

      // For security, always return success even if user doesn't exist
      if (!user) {
        return res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent.' });
      }

      // Generate secure reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send reset email
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;

        await client.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Reset Your Password - BuildMyChatbot.Ai',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0EA5E9;">Reset Your Password</h2>
              <p>You requested to reset your password for your BuildMyChatbot.Ai account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0EA5E9; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="color: #666; word-break: break-all;">${resetUrl}</p>
              <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't reveal to user that email sending failed for security
      }

      res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify reset token
  app.post('/api/auth/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      // Find valid token
      const tokenResult = await db.select()
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, 'false')
        ))
        .limit(1);

      const resetToken = tokenResult[0];

      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: 'Token has expired' });
      }

      res.status(200).json({ message: 'Token is valid' });
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Find valid token
      const tokenResult = await db.select()
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, 'false')
        ))
        .limit(1);

      const resetToken = tokenResult[0];

      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: 'Token has expired' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db.update(passwordResetTokens)
        .set({ used: 'true' })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Change password (for authenticated users)
  app.post('/api/auth/change-password', isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req.user as any).id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }

      // Get user
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userResult[0];

      if (!user || !user.password) {
        return res.status(400).json({ message: 'Unable to change password' });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);

      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, userId));

      res.status(200).json({ message: 'Password has been changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete account (for authenticated users)
  app.post('/api/auth/delete-account', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { password } = req.body;

      console.log(`[DELETE ACCOUNT] User ${userId} requested account deletion`);

      // Get user
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userResult[0];

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // ALWAYS require password verification for accounts with passwords
      // OAuth accounts without passwords can proceed, but we still verify session
      if (user.password) {
        if (!password) {
          return res.status(400).json({ message: 'Password is required to delete your account' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(400).json({ message: 'Incorrect password. Please try again.' });
        }
        console.log(`[DELETE ACCOUNT] Password verified for user ${userId}`);
      } else {
        console.log(`[DELETE ACCOUNT] OAuth account - no password verification needed for user ${userId}`);
      }

      // Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId && stripe) {
        try {
          console.log(`[DELETE ACCOUNT] Canceling Stripe subscription ${user.stripeSubscriptionId}`);
          const canceledSubscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          
          if (canceledSubscription.status !== 'canceled') {
            console.warn(`[DELETE ACCOUNT] Stripe subscription status is ${canceledSubscription.status}, not canceled`);
          } else {
            console.log(`[DELETE ACCOUNT] Stripe subscription canceled successfully`);
          }
        } catch (stripeError) {
          console.error('[DELETE ACCOUNT] Error canceling Stripe subscription:', stripeError);
          return res.status(500).json({ 
            message: 'Failed to cancel subscription. Please contact support or cancel manually before deleting your account.' 
          });
        }
      }

      // Delete user (CASCADE will automatically delete all related data:
      // chatbots, conversations, leads, analytics, etc.)
      const deleteResult = await db.delete(users).where(eq(users.id, userId));
      console.log(`[DELETE ACCOUNT] User ${userId} and all related data deleted successfully`);

      // Logout user
      req.logout((err) => {
        if (err) {
          console.error('[DELETE ACCOUNT] Error logging out user:', err);
        }
      });

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('[DELETE ACCOUNT] Error destroying session:', err);
        }
      });

      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ 
        message: 'Failed to delete account. Please try again or contact support if the problem persists.' 
      });
    }
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
