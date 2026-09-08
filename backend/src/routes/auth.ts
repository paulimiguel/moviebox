import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { authenticateToken, type AuthRequest } from "../middleware/auth";

const router = Router();
const GOOGLE_STATE_COOKIE = "movieboxGoogleOAuthState";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

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

const getGoogleRedirectUri = (req: Request) =>
  env.googleRedirectUri || `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

const getSafeReturnTo = (candidate?: string) => {
  const fallback = new URL("/", env.frontendUrl).toString();

  try {
    const url = new URL(candidate || fallback);
    const configuredOrigin = new URL(env.frontendUrl).origin;
    const isLocalDevelopment =
      env.nodeEnv !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    return url.origin === configuredOrigin || isLocalDevelopment
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
};

const addQueryParam = (url: string, key: string, value: string) => {
  const target = new URL(url);
  target.searchParams.set(key, value);
  return target.toString();
};

router.get("/google", (req, res) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    return res
      .status(503)
      .json({ error: "El inicio de sesion con Google no esta configurado" });
  }

  const returnTo = getSafeReturnTo(
    typeof req.query.returnTo === "string" ? req.query.returnTo : undefined,
  );
  const state = jwt.sign(
    { nonce: crypto.randomBytes(24).toString("hex"), returnTo },
    env.jwtSecret,
    { expiresIn: "10m", audience: "moviebox-google-oauth" },
  );

  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60 * 1000,
  });

  const authorizationUrl = new URL(GOOGLE_AUTH_URL);
  authorizationUrl.search = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: getGoogleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  return res.redirect(authorizationUrl.toString());
});

router.get("/google/callback", async (req, res) => {
  const fallback = getSafeReturnTo();
  const receivedState = typeof req.query.state === "string" ? req.query.state : "";
  const storedState = req.cookies?.[GOOGLE_STATE_COOKIE];
  const code = typeof req.query.code === "string" ? req.query.code : "";

  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/api/auth/google" });

  if (req.query.error) {
    return res.redirect(addQueryParam(fallback, "google_error", "access_denied"));
  }
  if (!receivedState || !storedState || receivedState !== storedState || !code) {
    return res.redirect(addQueryParam(fallback, "google_error", "invalid_state"));
  }

  try {
    const statePayload = jwt.verify(receivedState, env.jwtSecret, {
      audience: "moviebox-google-oauth",
    }) as { returnTo?: string };
    const returnTo = getSafeReturnTo(statePayload.returnTo);

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getGoogleRedirectUri(req),
      }),
    });
    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("Google OAuth token exchange failed:", tokens.error, tokens.error_description);
      return res.redirect(addQueryParam(returnTo, "google_error", "token_exchange"));
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleProfile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profileResponse.ok || !googleProfile.email || googleProfile.email_verified !== true) {
      return res.redirect(addQueryParam(returnTo, "google_error", "unverified_email"));
    }

    const email = googleProfile.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: googleProfile.name?.trim() || email.split("@")[0],
          password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
          profilePhoto: googleProfile.picture || null,
        },
      });
    } else if (!user.profilePhoto && googleProfile.picture) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profilePhoto: googleProfile.picture },
      });
    }

    res.cookie("authToken", createToken(user.id), {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(addQueryParam(returnTo, "google_login", "success"));
  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.redirect(addQueryParam(fallback, "google_error", "oauth_failed"));
  }
});

router.get("/google/session", authenticateToken, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  res.clearCookie("authToken", { path: "/" });
  return res.json({ token: createToken(user.id), user: publicUser(user) });
});

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
