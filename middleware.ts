import { NextResponse, NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(200, "1 m"),
});

// Dominios permitidos para CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://arquitec-one.vercel.app"
];

// Métodos HTTP permitidos
const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

// Cabeceras permitidas
const allowedHeaders = ["Content-Type", "Authorization"];

// Rutas estáticas
const staticRoutes = [
  "/favicon.ico",
  "/_next/static/",
  "/_next/image",
  "/css/",
  "/js/",
];

export async function middleware(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    const ip = request.ip ?? "127.0.0.1";

    // Generar nonce único
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const response = NextResponse.next();

    // 1. Configurar CORS
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
      response.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // 2. Manejar preflight (OPTIONS)
    if (method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers
      });
    }

    // 3. Rate Limiting (solo para rutas no estáticas)
    if (!staticRoutes.some(route => pathname.startsWith(route))) {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.redirect(new URL("/error?code=429", request.url));
      }
    }

    // 4. Configurar CSP con nonce
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self';
       script-src 'self' 'nonce-${nonce}';
       style-src 'self' 'nonce-${nonce}';
       img-src 'self' data:;
       connect-src 'self' https://*.vercel.app;
       frame-ancestors 'none';`
       .replace(/\n/g, ' ')
    );

    // 5. Inyectar nonce en cookie para el layout
    response.cookies.set("nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    // 6. Cabeceras de seguridad adicionales
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.delete("X-Powered-By");

    return response;

  } catch (error) {
    console.error("Middleware Error:", error);
    return NextResponse.redirect(new URL("/error", request.url));
  }
}

export const config = {
  matcher: ["/((?!api/|_next/|static/|public/).*)"],
};