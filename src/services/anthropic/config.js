// Anthropic API Configuration
export const ANTHROPIC_CONFIG = {
    API_KEY: process.env.REACT_APP_ANTHROPIC_API_KEY,
    API_URL: process.env.REACT_APP_ANTHROPIC_API_URL,
    MODEL: process.env.REACT_APP_ANTHROPIC_MODEL,
};

// Validate required environment variables
if (!ANTHROPIC_CONFIG.API_KEY) {
    throw new Error('Missing required environment variable: REACT_APP_ANTHROPIC_API_KEY');
}

if (!ANTHROPIC_CONFIG.API_URL) {
    throw new Error('Missing required environment variable: REACT_APP_ANTHROPIC_API_URL');
}

if (!ANTHROPIC_CONFIG.MODEL) {
    throw new Error('Missing required environment variable: REACT_APP_ANTHROPIC_MODEL');
} 