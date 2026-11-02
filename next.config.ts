import type { NextConfig } from 'next';

const config: NextConfig = {
  logging: {
    incomingRequests: { ignore: [/^\/api\/auth\/verify-email(?:\?|$)/, /^\/reset-password(?:\?|$)/] },
  },
};

export default config;
