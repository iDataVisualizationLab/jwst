/** @type {import('next').NextConfig} */
const isProduction = process.env.NEXT_PUBLIC_DEPLOYMENT === 'PRODUCTION';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

// Default values
let assetPrefix = '';
let basePath = '';

if (isProduction || isGithubActions) {
  const repo = process.env.GITHUB_REPOSITORY ?.replace(/.*?\//, '') || process.env.NEXT_PUBLIC_REPO_NAME;

  // // Get the version from environment variable (set in GitHub Actions)
  // const version = process.env.NEXT_PUBLIC_VERSION || 'latest';

  // // Ensure correct paths for each version
  // assetPrefix = `/${repo}/${version}/`;
  // basePath = `/${repo}/${version}`;
  assetPrefix = `/${repo}`;
  basePath = `/${repo}`;
}

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  assetPrefix: assetPrefix,
  trailingSlash: true,
  env: {
    BASE_PATH: basePath,
  },

  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Access-Control-Allow-Origin',
        value: '*',
      }, ],
    }, ];
  },
  async redirects() {
    return [{
      source: '/home',
      destination: '/',
      permanent: true,
    }, ];
  },
};

export default nextConfig;