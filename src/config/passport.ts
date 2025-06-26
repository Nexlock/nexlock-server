import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../generated/prisma";
import { AuthUserSchema } from "../schemas/auth";

const prisma = new PrismaClient();

// User Local Strategy
passport.use(
  "user-local",
  new LocalStrategy(
    { usernameField: "email" },
    async (email: string, password: string, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const authUser = AuthUserSchema.parse({
          id: user.id,
          email: user.email,
          name: user.name,
          type: "user",
        });

        return done(null, authUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Admin Local Strategy
passport.use(
  "admin-local",
  new LocalStrategy(
    { usernameField: "email" },
    async (email: string, password: string, done) => {
      try {
        const admin = await prisma.admin.findUnique({ where: { email } });

        if (!admin || !admin.email || !admin.password) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const authUser = AuthUserSchema.parse({
          id: admin.id,
          email: admin.email,
          name: admin.name!,
          type: "admin",
        });

        return done(null, authUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    },
    async (payload, done) => {
      try {
        // Validate payload structure
        const validatedPayload = AuthUserSchema.parse(payload);

        if (validatedPayload.type === "user") {
          const user = await prisma.user.findUnique({
            where: { id: validatedPayload.id },
          });
          if (user) {
            const authUser = AuthUserSchema.parse({
              id: user.id,
              email: user.email,
              name: user.name,
              type: "user",
            });
            return done(null, authUser);
          }
        } else if (validatedPayload.type === "admin") {
          const admin = await prisma.admin.findUnique({
            where: { id: validatedPayload.id },
          });
          if (admin && admin.email && admin.name && admin.password) {
            const authUser = AuthUserSchema.parse({
              id: admin.id,
              email: admin.email,
              name: admin.name,
              type: "admin",
            });
            return done(null, authUser);
          }
        }
        return done(null, false);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
