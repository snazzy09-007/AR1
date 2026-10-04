import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le template Python doit être embarqué avec la fonction serverless qui
  // génère l'agent pré-configuré sur Vercel.
  outputFileTracingIncludes: {
    "/api/agent/download": ["./public/agent/sniperfc_agent_v4.py"],
  },

  // Évite d'exposer des informations techniques inutiles dans les réponses.
  poweredByHeader: false,
};

export default nextConfig;
