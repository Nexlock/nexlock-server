import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export const validateBody = <T extends z.ZodType<any, any>>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Validating request body:", req.body); // ✅ Add debug logging
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", error.errors); // ✅ Add debug logging
        res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            received: "received" in err ? err.received : "not provided", // ✅ Safe access to received
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = <T extends z.ZodType<any, any>>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid parameters",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = <T extends z.ZodType<any, any>>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid query parameters",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
