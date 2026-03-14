import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig = {
  transpilePackages: ["@ai-todo/shared"],
};

export default withSerwist(nextConfig);
