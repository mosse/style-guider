import React, { useState, useRef } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import ApiErrorBoundary from './ApiErrorBoundary';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

function StyleGuideGenerator() {
    const [inputText, setInputText] = useState('');
    const [styleGuide, setStyleGuide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [acceptedChanges, setAcceptedChanges] = useState(new Set());
    const [rejectedChanges, setRejectedChanges] = useState(new Set());
    const [visibleTooltips, setVisibleTooltips] = useState(new Set());

    const generateStyleGuide = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        setError(null);
        setStyleGuide(null);

        try {
            const prompt = `You are tasked with improving a draft document by applying your knowledge of the Associated Press Style Guide (AP Style Guide). Analyze the text and return a JSON array of segments.

Each segment should be either:
1. A string containing unchanged text (including any linebreaks)
2. An object representing a change, with the following structure:
   {
     "original": "the original text",
     "replacement": "the suggested improvement",
     "reason": "brief explanation of why this change improves AP style adherence"
   }

IMPORTANT: 
- Make changes at the most granular level possible. Instead of changing entire sentences, identify specific words or phrases that need improvement.
- Preserve all linebreaks (\\n) in the unchanged text segments. Do not combine paragraphs.
- Each paragraph should start with its own text segment.
- Return ONLY the raw JSON array. Do not include any markdown formatting, code block syntax, or explanation text.

Example input with multiple paragraphs:
"Abraham Lincoln grew up to become the nation's sixteenth president.

He led the country from March 1861 until his assassination in April 1865, a little over a month into his second term."

Your response should be exactly like this (no additional text or formatting):
[
    "Abraham Lincoln grew up ",
    {
        "original": "to",
        "replacement": "and",
        "reason": "AP style prefers more direct language"
    },
    " become the nation's ",
    {
        "original": "sixteenth",
        "replacement": "16th",
        "reason": "AP style uses numerals for ordinal numbers above ninth"
    },
    " president.\\n\\n",
    "He led the country from March 1861 until his assassination in April 1865, a little ",
    {
        "original": "over",
        "replacement": "more than",
        "reason": "AP style prefers 'more than' over 'over' when referring to time periods"
    },
    " a month into his second term."
]

Guidelines:
1. Preserve all whitespace, linebreaks, and punctuation in unchanged segments
2. Make changes that align with AP Style Guide, focusing on:
   - Numbers (when to use numerals vs. words)
   - Punctuation rules
   - Preferred word choices and phrases
   - Abbreviations and acronyms
   - Date and time formatting
3. Each change must be at the most specific word or phrase level possible
4. Provide clear, concise reasons that reference specific AP style rules
5. Maintain the original meaning and intent of the text
6. Keep paragraphs separate - do not combine them into a single segment

Here is the text to analyze:
${inputText}

Remember: Return ONLY the raw JSON array with no additional formatting or explanation.`;

            const response = await anthropicService.generateStyleGuide(prompt);
            
            // Clean the response by removing any markdown formatting
            const cleanedResponse = response
                .replace(/```json\s*/g, '')
                .replace(/```\s*$/g, '')
                .trim();
            
            // Parse the cleaned JSON response
            const changes = JSON.parse(cleanedResponse);
            setStyleGuide(changes);
        } catch (err) {
            setError(err.message || 'An error occurred while generating the style guide');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptChange = (index) => {
        setAcceptedChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
        });
        setRejectedChanges(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
        setVisibleTooltips(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
    };

    const handleRejectChange = (index) => {
        setRejectedChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(index);
            return newSet;
        });
        setAcceptedChanges(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
        setVisibleTooltips(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
    };

    const renderChanges = (changes) => {
        if (!Array.isArray(changes)) return null;

        return (
            <div style={{ 
                textAlign: 'left', 
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
            }}>
                {changes.map((segment, index) => {
                    if (typeof segment === 'string') {
                        return <span key={index}>{segment}</span>;
                    }
                    
                    const tooltipId = `change-${index}`;
                    const isAccepted = acceptedChanges.has(index);
                    const isRejected = rejectedChanges.has(index);
                    const showTooltip = !isAccepted && !isRejected;

                    return (
                        <span 
                            key={index} 
                            style={{ 
                                position: 'relative',
                                display: 'inline-block'
                            }}
                            data-tooltip-id={showTooltip ? tooltipId : undefined}
                            data-tooltip-content={showTooltip ? segment.reason : undefined}
                        >
                            {showTooltip && (
                                <Tooltip 
                                    id={tooltipId}
                                    place="top"
                                    style={{
                                        maxWidth: '300px',
                                        backgroundColor: '#333',
                                        color: 'white',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        lineHeight: '1.4'
                                    }}
                                />
                            )}
                            {!isAccepted && (
                                <span style={{ 
                                    textDecoration: !isRejected ? 'line-through' : 'none', 
                                    color: isRejected ? '#000' : '#666',
                                    marginRight: !isRejected ? '4px' : '0',
                                    cursor: showTooltip ? 'help' : 'default'
                                }}>
                                    {segment.original}
                                </span>
                            )}
                            {!isRejected && (
                                <span style={{ 
                                    color: isAccepted ? '#000' : '#28a745',
                                    marginRight: !isAccepted ? '4px' : '0',
                                    cursor: showTooltip ? 'help' : 'default'
                                }}>
                                    {segment.replacement}
                                </span>
                            )}
                            {showTooltip && (
                                <span style={{ marginLeft: '4px' }}>
                                    <button
                                        onClick={() => handleAcceptChange(index)}
                                        style={{
                                            padding: '2px 6px',
                                            marginRight: '4px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                        title="Accept change"
                                        aria-label="Accept change"
                                    >
                                        <span aria-hidden="true">✓</span>
                                    </button>
                                    <button
                                        onClick={() => handleRejectChange(index)}
                                        style={{
                                            padding: '2px 6px',
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                        title="Reject change"
                                        aria-label="Reject change"
                                    >
                                        <span aria-hidden="true">✕</span>
                                    </button>
                                </span>
                            )}
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