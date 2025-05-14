/** @type {import("next").NextConfig} */
const config = {
    // Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
    // for Docker builds.
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Allow mixed content for local development (not recommended for production)
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws:;"
                    }
                ]
            }
        ];
    }
};

export default config;
