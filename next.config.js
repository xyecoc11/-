/** @type {import('next').NextConfig} */
let withWhopAppConfig;
try {
  ({ withWhopAppConfig } = require('@whop/react/next.config'));
} catch (e) {
  console.warn('[Whop] withWhopAppConfig not found, proceeding without it.');
}

const baseConfig = {
  typedRoutes: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    // Whop App Credentials (доступны на клиенте через NEXT_PUBLIC_*)
    NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    NEXT_PUBLIC_WHOP_AGENT_USER_ID: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    NEXT_PUBLIC_WHOP_COMPANY_ID: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://whop.com https://*.whop.com *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
          },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Access-Control-Allow-Origin", value: "https://whop.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

module.exports = withWhopAppConfig ? withWhopAppConfig(baseConfig) : baseConfig;
