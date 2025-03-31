import './globals.css';
import Script from 'next/script';

// Definir metadatos para SEO y accesibilidad
export const metadata = {
  title: 'Planeación de Producción',
  description: 'Aplicación para la planeación de producción de tu empresa.',
  keywords: 'planeación, producción, sucursales, gestión, industria',
  author: 'Tu Nombre o Empresa',
  openGraph: {
    title: 'Planeación de Producción',
    description: 'Aplicación para la planeación de producción de tu empresa.',
    url: 'https://arquitec-one.vercel.app', // Dominio de producción
    siteName: 'Planeación de Producción',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Planeación de Producción',
    description: 'Aplicación para la planeación de producción de tu empresa.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Metadatos básicos (Next.js los agrega automáticamente desde metadata, pero los dejamos por compatibilidad) */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Cargar Bootstrap CSS localmente */}
        <link rel="stylesheet" href="/css/bootstrap.min.css" />
      </head>
      <body>
        {children}
        {/* Cargar Bootstrap JS localmente con next/script */}
        <Script
          src="/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
  
}