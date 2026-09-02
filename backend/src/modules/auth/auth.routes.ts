import { Router } from "express";
import { loginHandler, meHandler } from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", loginHandler);
authRouter.get("/me", requireAuth, meHandler);
