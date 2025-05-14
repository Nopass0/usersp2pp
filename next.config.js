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
                        // Allow absolutely everything for Content Security Policy
                        key: 'Content-Security-Policy',
                        value: "default-src * http: https: ws: wss: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * http: https: 'unsafe-inline' 'unsafe-eval'; connect-src * http: https: ws: wss: 'unsafe-inline'; img-src * http: https: data: blob: 'unsafe-inline'; frame-src * http: https:; style-src * http: https: 'unsafe-inline';"
                    }
                ]
            }
        ];
    }
};

export default config;
