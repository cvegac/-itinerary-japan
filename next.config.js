/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sitio 100% estático: sin server Node, se sube tal cual a S3.
  output: "export",
  // Cada ruta exporta como carpeta/index.html (ej: out/japan/index.html)
  // en vez de japan.html, para que S3 + CloudFront puedan servirla como "directorio".
  trailingSlash: true,
};

module.exports = nextConfig;
