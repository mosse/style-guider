import React, { useState, useRef } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import ApiErrorBoundary from './ApiErrorBoundary';
import { Tooltip } from 'react-tooltip';
import LoadingSpinner from './LoadingSpinner';
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
            
            // Clean the response by removing any markdown formatting and normalizing whitespace
            let cleanedResponse = response
                .replace(/```json\s*/g, '')  // Remove opening markdown
                .replace(/```\s*$/g, '')     // Remove closing markdown
                .replace(/[\u2018\u2019]/g, "'")  // Replace smart quotes
                .replace(/[\u201C\u201D]/g, '"')  // Replace smart double quotes
                .replace(/\u2014/g, '--')         // Replace em dashes
                .replace(/\u2013/g, '-')          // Replace en dashes
                .replace(/\u2026/g, '...')        // Replace ellipsis
                .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width spaces
                .trim();

            // Handle newlines in a way that preserves them in strings but removes them from JSON structure
            cleanedResponse = cleanedResponse
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)  // Remove empty lines
                .join('');

            // Attempt to fix common JSON syntax issues
            if (!cleanedResponse.startsWith('[')) {
                cleanedResponse = '[' + cleanedResponse;
            }
            if (!cleanedResponse.endsWith(']')) {
                cleanedResponse = cleanedResponse + ']';
            }

            try {
                // Parse the cleaned JSON response
                const changes = JSON.parse(cleanedResponse);
                if (!Array.isArray(changes)) {
                    throw new Error('Response is not an array');
                }
                
                // Validate each segment in the array
                changes.forEach((segment, index) => {
                    if (typeof segment !== 'string' && typeof segment !== 'object') {
                        throw new Error(`Invalid segment type at index ${index}`);
                    }
                    if (typeof segment === 'object' && (!segment.original || !segment.replacement || !segment.reason)) {
                        throw new Error(`Missing required fields in change object at index ${index}`);
                    }
                });

                setStyleGuide(changes);
            } catch (err) {
                console.error('JSON Parse Error:', err);
                console.error('Raw Response:', response);
                console.error('Cleaned Response:', cleanedResponse);
                
                // Try to identify the problematic part of the JSON
                const position = parseInt(err.message.match(/position (\d+)/)?.[1]);
                if (!isNaN(position)) {
                    const context = cleanedResponse.substring(Math.max(0, position - 50), Math.min(cleanedResponse.length, position + 50));
                    console.error('Error context:', context);
                    console.error('Error position:', '^'.padStart(51, ' '));
                }
                
                throw new Error(`Failed to parse API response: ${err.message}. Please try again.`);
            }
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
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                fontSize: '18px',
                fontFamily: 'medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif',
                color: 'rgba(0, 0, 0, 0.84)'
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
                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                        color: '#fff',
                                        padding: '12px 16px',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        lineHeight: '1.4',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                    }}
                                />
                            )}
                            {!isAccepted && (
                                <span style={{ 
                                    textDecoration: !isRejected ? 'line-through' : 'none', 
                                    color: isRejected ? 'rgba(0, 0, 0, 0.84)' : 'rgba(0, 0, 0, 0.54)',
                                    marginRight: !isRejected ? '4px' : '0',
                                    cursor: showTooltip ? 'help' : 'default'
                                }}>
                                    {segment.original}
                                </span>
                            )}
                            {!isRejected && (
                                <span style={{ 
                                    color: isAccepted ? 'rgba(0, 0, 0, 0.84)' : 'rgb(26, 137, 23)',
                                    marginRight: !isAccepted ? '4px' : '0',
                                    cursor: showTooltip ? 'help' : 'default'
                                }}>
                                    {segment.replacement}
                                </span>
                            )}
                            {showTooltip && (
                                <span style={{ marginLeft: '6px' }}>
                                    <button
                                        onClick={() => handleAcceptChange(index)}
                                        style={{
                                            padding: '2px 8px',
                                            marginRight: '6px',
                                            minWidth: 'unset',
                                            fontSize: '13px'
                                        }}
                                        className="primary"
                                        title="Accept change"
                                        aria-label="Accept change"
                                    >
                                        <span aria-hidden="true">✓</span>
                                    </button>
                                    <button
                                        onClick={() => handleRejectChange(index)}
                                        style={{
                                            padding: '2px 8px',
                                            minWidth: 'unset',
                                            fontSize: '13px'
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
            <div className="style-guide-container" style={{ 
                padding: '0 20px', 
                maxWidth: '728px', 
                margin: '0 auto'
            }}>
                <h2>AP Style Guide Improver</h2>
                <p style={{
                    fontSize: '1.25rem',
                    color: 'rgba(0, 0, 0, 0.54)',
                    marginBottom: '2rem',
                    textAlign: 'left'
                }}>Paste your text below to get AP style suggestions.</p>
                
                <div style={{ marginBottom: '20px' }}>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your text here..."
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            marginBottom: '20px',
                            borderRadius: '4px',
                            border: '1px solid rgba(0, 0, 0, 0.15)',
                            fontFamily: 'medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif',
                            fontSize: '18px',
                            lineHeight: '1.6',
                            color: 'rgba(0, 0, 0, 0.84)',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                            resize: 'vertical'
                        }}
                    />
                    
                    <button
                        onClick={generateStyleGuide}
                        disabled={loading || !inputText.trim()}
                        className="primary"
                        style={{
                            fontSize: '15px',
                            padding: '8px 16px',
                            minWidth: '120px'
                        }}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Text'}
                    </button>
                </div>

                {error && (
                    <div style={{ 
                        color: 'rgb(201, 75, 75)',
                        marginTop: '20px',
                        padding: '20px',
                        border: '1px solid rgba(201, 75, 75, 0.35)',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(201, 75, 75, 0.05)',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ color: 'rgb(201, 75, 75)', marginBottom: '0.5rem' }}>Error:</h3>
                        <p style={{ margin: 0 }}>{error}</p>
                    </div>
                )}

                {(loading || styleGuide) && (
                    <div style={{ 
                        marginTop: '32px', 
                        padding: '24px', 
                        border: '1px solid rgba(0, 0, 0, 0.15)', 
                        borderRadius: '4px', 
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ 
                            marginBottom: loading ? '1rem' : '1.5rem',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: 'rgba(0, 0, 0, 0.84)',
                            letterSpacing: '-0.02em'
                        }}>Suggested Improvements</h3>
                        {loading ? <LoadingSpinner /> : renderChanges(styleGuide)}
                    </div>
                )}
            </div>
        </ApiErrorBoundary>
    );
}

export default StyleGuideGenerator; 