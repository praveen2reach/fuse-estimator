import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fuse-default-secret-change-me");

export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("fuse_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function setSession(payload: any) {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set("fuse_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("fuse_token");
}
