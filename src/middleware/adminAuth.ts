import type { Request, Response, NextFunction } from "express";
import passport from "../config/passport";
import type { AuthUser } from "../types/auth";

export const authenticateAdmin = (
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

      if (!user || user.type !== "admin") {
        res.status(401).json({ error: "Admin access required" });
        return;
      }

      req.user = user;
      next();
    }
  )(req, res, next);
};
