import React from "react";
import { NextResponse, NextRequest } from "next/server";

// Lista de dominios permitidos para CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://arquitec-one.vercel.app" // Dominio de desarrollo
];

// Lista de métodos HTTP permitidos
const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

// Lista de encabezados permitidos en las solicitudes
const allowedHeaders = ["Content-Type", "Authorization"];

// Lista de encabezados que se expondrán al cliente
const exposedHeaders = ["X-Nonce"];

// Rutas que no deben ser afectadas por el rate limiting (recursos estáticos)
const staticRoutes = [
  "/favicon.ico",
  "/css/",
  "/js/",
  "/images/",
  "/_next/static/",
  "/_next/image",
];

export function middleware(request: NextRequest) {
  try {
    // Obtener el token de autenticación
    const token = request.cookies.get("token")?.value;
    const userAgent = request.headers.get("user-agent") || "";
    const ip = getClientIp(request);
    const origin = request.headers.get("origin");
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Generar un nonce para el CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    

    // Bloquear agentes maliciosos
    const blockedAgents = ["BurpSuite", "curl", "sqlmap", "python-requests"];
    if (blockedAgents.some((agent) => userAgent.includes(agent))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Rate limiting (desactivado en desarrollo y para recursos estáticos)
    const isStaticRoute = staticRoutes.some((route) => pathname.startsWith(route));
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment && !isStaticRoute && checkRateLimit(ip)) {
      // Redirigir a una página de error en lugar de devolver JSON
      const errorUrl = new URL("/error?message=Demasiadas solicitudes, por favor intenta de nuevo en un minuto", request.url);
      return NextResponse.redirect(errorUrl);
    }

    // Redirigir a /login si no hay token y se intenta acceder a /interfaz
    if (!token && pathname.startsWith("/interfaz")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Manejar solicitudes OPTIONS (preflight para CORS)
    if (method === "OPTIONS") {
      const response = NextResponse.next();
      setCorsHeaders(response, origin);
      return response;
    }

    // Crear la respuesta
    const response = NextResponse.next();

    // Configurar encabezados CORS
    setCorsHeaders(response, origin);

    // Configurar Content-Security-Policy    /strict-dynamic
    response.headers.set(
      "Content-Security-Policy",
      `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'unsafe-inline'; /
        style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
        img-src 'self' data:;
        font-src 'self';
        connect-src 'self' https://gatito027.vercel.app https://prueba-moleculer.vercel.app;
        frame-src 'self';
        frame-ancestors 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s{2,}/g, " ").trim()
    );
    response.headers.set("X-Nonce", nonce);

    // Agregar encabezados de seguridad adicionales
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Evitar la divulgación de información innecesaria
    response.headers.delete("Server");
    response.headers.delete("X-Powered-By");

    // Configurar Cache-Control para recursos estáticos
    if (pathname.startsWith("/css") || pathname.startsWith("/js")) {
      response.headers.set("Cache-Control", "public, max-age=604800"); // Cachear por 7 días
    }

    // Configurar Cache-Control para recursos sensibles
    if (pathname.startsWith("/api")) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }

    return response;
  } catch (error) {
    console.error("Error en el middleware:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Función para configurar los encabezados CORS
function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
    response.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    response.headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Timing-Allow-Origin", origin);
  }
  response.headers.set("Vary", "Origin");
}

// Función para obtener la IP del cliente
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
}

// Rate limiting
const requestCounts: Record<string, number> = {};
function checkRateLimit(ip: string): boolean {
  if (!ip) return false;
  requestCounts[ip] = (requestCounts[ip] || 0) + 1;
  setTimeout(() => delete requestCounts[ip], 60000); // Limpiar después de 1 minuto
  return requestCounts[ip] > 200; // Aumentar el límite a 200 solicitudes por minuto
}

export const config = {
  matcher: ["/:path*"],
};