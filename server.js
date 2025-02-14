const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Debug logging
console.log('Environment variables loaded:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Present (starts with: ' + process.env.ANTHROPIC_API_KEY.substring(0, 15) + '...)' : 'Missing');
console.log('ANTHROPIC_API_URL:', process.env.ANTHROPIC_API_URL || 'Missing');
console.log('ANTHROPIC_MODEL:', process.env.ANTHROPIC_MODEL || 'Missing');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint for Anthropic API
app.post('/api/anthropic/messages', async (req, res) => {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
                'anthropic-version': '2023-01-01',
            },
            body: JSON.stringify(req.body),
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
}); 