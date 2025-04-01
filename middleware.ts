import React from "react";
import { NextResponse, NextRequest } from "next/server";

// Lista de dominios permitidos para CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://arquitec-one.vercel.app",
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

// Rate limiting
const requestCounts: Record<string, number> = {};

function checkRateLimit(ip: string): boolean {
  if (!ip) return false;
  requestCounts[ip] = (requestCounts[ip] || 0) + 1;
  setTimeout(() => delete requestCounts[ip], 60000); // Limpiar después de 1 minuto
  return requestCounts[ip] > 200; // Aumentar el límite a 200 solicitudes por minuto
}

// Función para obtener la IP del cliente
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
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

// Función para configurar encabezados de seguridad
function setSecurityHeaders(response: NextResponse, nonce: string) {
  // Configurar Content-Security-Policy
  response.headers.set(
    "Content-Security-Policy",
    `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'unsafe-inline';
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
}

// Función para configurar Cache-Control
function setCacheControlHeaders(response: NextResponse, pathname: string) {
  if (pathname.startsWith("/css") || pathname.startsWith("/js")) {
    response.headers.set("Cache-Control", "public, max-age=604800"); // Cachear por 7 días
  } else if (pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
}

// Función para manejar la autenticación y redirecciones
function handleAuthentication(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  if (!token && pathname.startsWith("/interfaz")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return null;
}

// Función para manejar el bloqueo de agentes maliciosos
function blockMaliciousAgents(userAgent: string) {
  const blockedAgents = ["BurpSuite", "curl", "sqlmap", "python-requests"];
  if (blockedAgents.some((agent) => userAgent.includes(agent))) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return null;
}

// Función para manejar el rate limiting
function handleRateLimit(request: NextRequest, ip: string) {
  const pathname = request.nextUrl.pathname;
  const isStaticRoute = staticRoutes.some((route) => pathname.startsWith(route));
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!isDevelopment && !isStaticRoute && checkRateLimit(ip)) {
    const errorUrl = new URL("/error?message=Demasiadas solicitudes, por favor intenta de nuevo en un minuto", request.url);
    return NextResponse.redirect(errorUrl);
  }
  return null;
}

export function middleware(request: NextRequest) {
  try {
    // Obtener información de la solicitud
    const userAgent = request.headers.get("user-agent") || "";
    const ip = getClientIp(request);
    const origin = request.headers.get("origin");
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Generar un nonce para el CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    // Bloquear agentes maliciosos
    const blockResponse = blockMaliciousAgents(userAgent);
    if (blockResponse) return blockResponse;

    // Rate limiting
    const rateLimitResponse = handleRateLimit(request, ip);
    if (rateLimitResponse) return rateLimitResponse;

    // Manejar autenticación
    const authResponse = handleAuthentication(request);
    if (authResponse) return authResponse;

    // Manejar solicitudes OPTIONS (preflight para CORS)
    if (method === "OPTIONS") {
      const response = NextResponse.next();
      setCorsHeaders(response, origin);
      return response;
    }

    // Crear la respuesta
    const response = NextResponse.next();

    // Configurar encabezados
    setCorsHeaders(response, origin);
    setSecurityHeaders(response, nonce);
    setCacheControlHeaders(response, pathname);

    return response;
  } catch (error) {
    console.error("Error en el middleware:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export const config = {
  matcher: ["/:path*"],
};