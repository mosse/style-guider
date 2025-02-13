import React, { useState } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import ApiErrorBoundary from './ApiErrorBoundary';

function StyleGuideGenerator() {
    const [inputText, setInputText] = useState('');
    const [styleGuide, setStyleGuide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateStyleGuide = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        setError(null);
        setStyleGuide(null);

        try {
            const prompt = `You are tasked with improving a draft document by applying your knowledge of the Associated Press Style Guide (AP Style Guide). Analyze the text and return a JSON array of segments.

Each segment should be either:
1. A string containing unchanged text
2. An object representing a change, with the following structure:
   {
     "original": "the original text",
     "replacement": "the suggested improvement",
     "reason": "brief explanation of why this change improves AP style adherence"
   }

Example response format:
[
    "This is unchanged text at the start. ",
    {
        "original": "The meeting will be held by the committee",
        "replacement": "The committee will hold the meeting",
        "reason": "Changed to active voice per AP style"
    },
    ". More unchanged text. ",
    {
        "original": "govt.",
        "replacement": "government",
        "reason": "AP style avoids abbreviations in regular text"
    },
    " Final unchanged text."
]

Guidelines:
1. Preserve all whitespace and punctuation in unchanged segments
2. Make changes that align with AP Style Guide, focusing on:
   - Active vs. passive voice
   - Clear, concise language
   - Proper formatting and punctuation
   - Appropriate terminology
   - Standard AP style conventions
3. Each change should be as specific as possible (word or phrase level rather than full sentences when appropriate)
4. Provide clear, concise reasons for each change
5. Maintain the original meaning and intent of the text

Here is the text to analyze:
${inputText}

Return only valid JSON that matches the format described above.`;

            const response = await anthropicService.generateStyleGuide(prompt);
            // Parse the JSON response
            const changes = JSON.parse(response);
            setStyleGuide(changes);
        } catch (err) {
            setError(err.message || 'An error occurred while generating the style guide');
        } finally {
            setLoading(false);
        }
    };

    const renderChanges = (changes) => {
        if (!Array.isArray(changes)) return null;

        return (
            <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
                {changes.map((segment, index) => {
                    if (typeof segment === 'string') {
                        return <span key={index}>{segment}</span>;
                    }
                    
                    return (
                        <span key={index} style={{ position: 'relative' }}>
                            <span style={{ 
                                textDecoration: 'line-through', 
                                color: '#666',
                                marginRight: '4px'
                            }}>
                                {segment.original}
                            </span>
                            <span style={{ 
                                color: '#28a745',
                                marginRight: '4px'
                            }}>
                                → {segment.replacement}
                            </span>
                            <span style={{ 
                                fontSize: '0.8em',
                                color: '#666',
                                display: 'block',
                                marginLeft: '20px',
                                marginBottom: '0.5em'
                            }}>
                                ({segment.reason})
                            </span>
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <ApiErrorBoundary>
            <div className="style-guide-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                <h2>AP Style Guide Improver</h2>
                <p>Paste your text below to get AP style suggestions.</p>
                
                <div style={{ marginBottom: '20px' }}>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your text here..."
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '10px',
                            marginBottom: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit'
                        }}
                    />
                    
                    <button
                        onClick={generateStyleGuide}
                        disabled={loading || !inputText.trim()}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading || !inputText.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !inputText.trim() ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Text'}
                    </button>
                </div>

                {error && (
                    <div style={{ color: 'red', marginTop: '20px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
                        <h3>Error:</h3>
                        <p>{error}</p>
                    </div>
                )}

                {styleGuide && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '20px', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px', 
                        backgroundColor: '#f9f9f9' 
                    }}>
                        <h3>Suggested Improvements</h3>
                        {renderChanges(styleGuide)}
                    </div>
                )}
            </div>
        </ApiErrorBoundary>
    );
}

export default StyleGuideGenerator; 