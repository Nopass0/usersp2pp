# UserSP2P Platform

A secure platform for managing user transactions with Telegram bot integration.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## Environment Variables

This application requires specific environment variables to be set for proper operation:

### Telegram API Configuration

The application integrates with a Telegram Bot API service. You must set the following environment variables:

#### For Client-Side Access (Browser)
- `NEXT_PUBLIC_TELEGRAM_API_KEY`: API key for the Telegram Bot API
- `NEXT_PUBLIC_TELEGRAM_API_URL`: URL of the Telegram Bot API (e.g., `https://api.example.com:8000`)

#### For Server-Side Access
- `TELEGRAM_API_KEY`: Same API key for server-side operations
- `TELEGRAM_API_URL`: Same URL for server-side operations

### Setting Up Environment Variables

1. Create a `.env` file in the root directory based on `.env.example`
2. Fill in the required environment variables with your values
3. Make sure to use HTTPS URLs for production environments

Example:
```
# Telegram Bot API Configuration
NEXT_PUBLIC_TELEGRAM_API_KEY="your-telegram-api-key"
NEXT_PUBLIC_TELEGRAM_API_URL="https://your-telegram-api-domain:8000"
TELEGRAM_API_KEY="your-telegram-api-key"
TELEGRAM_API_URL="https://your-telegram-api-domain:8000"
```

### Security Notes

- **Never commit** your `.env` file to version control
- All API requests are made through a secure server-side proxy to prevent exposing credentials
- HTTPS is strongly recommended for all API endpoints

## How do I deploy this?

Follow these steps for deployment:

1. Set up your environment variables as described above
2. Build the application with `npm run build`
3. Start the server with `npm start`

For platform-specific guides, see [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) documentation.
