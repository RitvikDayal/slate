import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS
  ? process.env.NEXT_DEV_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [];

const nextConfig = {
  transpilePackages: ["@ai-todo/shared"],
  turbopack: {},
  allowedDevOrigins,
};

export default withSerwist(nextConfig);
