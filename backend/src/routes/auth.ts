import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { authenticateToken, type AuthRequest } from "../middleware/auth";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
  alias: z.string().trim().max(60).optional(),
});

const publicUser = (user: {
  id: string;
  email: string;
  name: string;
  alias: string | null;
  profilePhoto: string | null;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  alias: user.alias,
  profilePhoto: user.profilePhoto,
});

const createToken = (userId: string) =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLocaleLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Ya existe una cuenta con ese email" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        alias: data.alias || null,
        password: await bcrypt.hash(data.password, 12),
      },
    });

    return res.status(201).json({
      token: createToken(user.id),
      user: publicUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Los datos de registro no son validos" });
    }
    console.error("Register error:", error);
    return res.status(500).json({ error: "No se pudo crear la cuenta" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLocaleLowerCase() },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ error: "Email o contrasena incorrectos" });
    }

    return res.json({
      token: createToken(user.id),
      user: publicUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Email o contrasena no validos" });
    }
    console.error("Login error:", error);
    return res.status(500).json({ error: "No se pudo iniciar sesion" });
  }
});

router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  return res.json({ user: publicUser(user) });
});

export default router;
