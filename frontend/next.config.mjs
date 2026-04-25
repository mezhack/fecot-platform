/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deixamos o build falhar se houver erro de TS — melhor descobrir bugs aqui.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Evita que warnings do eslint bloqueiem build em produção.
    ignoreDuringBuilds: true,
  },
  images: {
    // Hostinger costuma não ter a API de otimização de imagens nativa.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com" },
    ],
  },
  // Útil para desacoplar da URL pública nas builds.
  output: "standalone",
}

export default nextConfig
