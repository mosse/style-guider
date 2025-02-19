const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Debug logging
console.log('Environment variables loaded:');
console.log('ANTHROPIC_API_KEY:', process.env.REACT_APP_ANTHROPIC_API_KEY ? 'Present (starts with: ' + process.env.REACT_APP_ANTHROPIC_API_KEY.substring(0, 15) + '...)' : 'Missing');
console.log('ANTHROPIC_API_URL:', process.env.REACT_APP_ANTHROPIC_API_URL || 'Missing');
console.log('ANTHROPIC_MODEL:', process.env.REACT_APP_ANTHROPIC_MODEL || 'Missing');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React build directory in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));
}

// Proxy endpoint for Anthropic API
app.post('/api/anthropic/messages', async (req, res) => {
    try {
        // Transform the request body to match Anthropic's expected format
        const anthropicBody = {
            model: req.body.model,
            max_tokens: req.body.max_tokens,
            messages: req.body.messages,
            system: "You are a helpful AI assistant that applies style guides to writing projects."
        };

        console.log('Sending request to Anthropic:', JSON.stringify(anthropicBody, null, 2));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${process.env.REACT_APP_ANTHROPIC_API_KEY}`,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(anthropicBody),
        });

        if (!response.ok) {
            // Get detailed error information from Anthropic
            const errorData = await response.json();
            console.error('Anthropic API error details:', errorData);
            throw new Error(errorData.error?.message || `Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Anthropic:', error);
        // Send appropriate status code based on the error
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({ 
            error: error.message,
            details: error.response?.data
        });
    }
});

// Serve React app for any other routes in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('API Key present:', !!process.env.REACT_APP_ANTHROPIC_API_KEY);
}); 