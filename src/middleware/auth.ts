import type { Request, Response, NextFunction } from "express";
import passport from "../config/passport";
import type { AuthUser } from "../schemas/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: any, user: AuthUser) => {
      if (err) {
        return next(err);
      }

      if (!user || user.type !== "user") {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      req.user = user;
      next();
    }
  )(req, res, next);
};

export const authenticateAny = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: any, user: AuthUser) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      req.user = user;
      next();
    }
  )(req, res, next);
};
