// Anthropic API Configuration
// NOTE: The API key is intentionally NOT read here. It is a server-only secret
// consumed by server.js at runtime. Reading it with a REACT_APP_ prefix would
// inline it into the public client bundle. Only non-secret config belongs here.
export const ANTHROPIC_CONFIG = {
    API_URL: process.env.REACT_APP_ANTHROPIC_API_URL,
    MODEL: process.env.REACT_APP_ANTHROPIC_MODEL,
};

// Validate required environment variables
if (!ANTHROPIC_CONFIG.API_URL) {
    throw new Error('Missing required environment variable: REACT_APP_ANTHROPIC_API_URL');
}

if (!ANTHROPIC_CONFIG.MODEL) {
    throw new Error('Missing required environment variable: REACT_APP_ANTHROPIC_MODEL');
} 