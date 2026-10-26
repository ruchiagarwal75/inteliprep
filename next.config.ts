import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth codes arrive in this query string. Use the sanitized callback event instead.
  logging: { incomingRequests: { ignore: [/\/auth\/callback(?:\?|$)/] } },
};

export default nextConfig;
