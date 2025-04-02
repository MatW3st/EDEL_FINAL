import { NextResponse, NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Configuración de Rate Limiting
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(200, "1 m"),
});

// Dominios permitidos para CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://arquitec-one.vercel.app",
];

// Métodos HTTP permitidos
const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

// Cabeceras permitidas
const allowedHeaders = ["Content-Type", "Authorization"];

// Cabeceras expuestas
const exposedHeaders = ["X-Nonce"];

// Rutas estáticas que no requieren middleware ni rate limiting
const staticRoutes = [
  "/favicon.ico",
  "/_next/static/",
  "/_next/image",
  "/css/",
  "/js/",
  "/images/",
  "/public/",
];

// Función para configurar los encabezados CORS
function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
    response.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
  }
  response.headers.set("Vary", "Origin");
}

// Función para configurar los encabezados de seguridad y CSP
function setSecurityHeaders(response: NextResponse, nonce: string) {
  // Configurar Content-Security-Policy con nonce
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; 
     script-src 'self' 'nonce-${nonce}'; 
     style-src 'self' 'nonce-${nonce}'; 
     img-src 'self' data:; 
     connect-src 'self' https://*.vercel.app; 
     frame-ancestors 'none'; 
     object-src 'none'; 
     base-uri 'self'; 
     form-action 'self';`
      .replace(/\n/g, " ")
      .trim()
  );

  // Cabeceras de seguridad adicionales
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.delete("X-Powered-By");
}

// Función para manejar el rate limiting
async function handleRateLimit(ip: string, pathname: string) {
  const isStaticRoute = staticRoutes.some((route) => pathname.startsWith(route));
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment || isStaticRoute) {
    return true; // No aplicar rate limiting en desarrollo o para rutas estáticas
  }

  const { success } = await ratelimit.limit(ip);
  return success;
}

export async function middleware(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  
    // Generar nonce único
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    // Manejar preflight (OPTIONS)
    if (method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      setCorsHeaders(response, origin);
      return response;
    }

    // Rate Limiting
    const rateLimitSuccess = await handleRateLimit(ip, pathname);
    if (!rateLimitSuccess) {
      return NextResponse.redirect(new URL("/error?code=429", request.url));
    }

    // Crear la respuesta
    const response = NextResponse.next();

    // Configurar encabezados
    setCorsHeaders(response, origin);
    setSecurityHeaders(response, nonce);

    // Inyectar nonce en cookie para el layout
    response.cookies.set("nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Middleware Error:", error);
    return NextResponse.redirect(
      new URL(`/error?message=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

export const config = {
  matcher: [
    "/((?!api/|_next/|static/|public/|favicon.ico|images/|css/|js/).*)",
  ],
};
