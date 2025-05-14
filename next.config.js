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
    // Unrestricted Content Security Policy to allow all connections
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
                    }
                ]
            }
        ];
    },
    // Allow cross-origin requests via proxy
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: 'http://192.168.1.106:8000/:path*'
            }
        ];
    }
};

export default config;
