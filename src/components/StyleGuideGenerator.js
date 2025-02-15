import React, { useState, useRef } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import ApiErrorBoundary from './ApiErrorBoundary';
import { Tooltip } from 'react-tooltip';
import LoadingSpinner from './LoadingSpinner';
import { getStyleGuidePrompt } from '../services/prompts/styleGuidePrompt';
import { cleanAndParseResponse } from '../utils/responseParser';
import 'react-tooltip/dist/react-tooltip.css';

function StyleGuideGenerator() {
    const [inputText, setInputText] = useState('');
    const [styleGuide, setStyleGuide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [acceptedChanges, setAcceptedChanges] = useState(new Set());
    const [rejectedChanges, setRejectedChanges] = useState(new Set());
    const [visibleTooltips, setVisibleTooltips] = useState(new Set());
    const textareaRef = useRef(null);

    // Auto-resize textarea as content changes
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    // Handle input changes
    const handleInputChange = (e) => {
        setInputText(e.target.value);
        adjustTextareaHeight();
    };

    const generateStyleGuide = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        setError(null);
        setStyleGuide(null);

        try {
            const prompt = getStyleGuidePrompt(inputText);
            const response = await anthropicService.generateStyleGuide(prompt);
            
            try {
                const changes = cleanAndParseResponse(response);
                setStyleGuide(changes);
            } catch (err) {
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
            <>
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
                                display: 'inline'
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
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                        zIndex: 1000
                                    }}
                                />
                            )}
                            {!isAccepted && (
                                <span style={{ 
                                    textDecoration: !isRejected ? 'line-through' : 'none', 
                                    color: isRejected ? 'rgba(0, 0, 0, 0.84)' : 'rgba(0, 0, 0, 0.54)',
                                    cursor: showTooltip ? 'help' : 'default'
                                }}>
                                    {segment.original}
                                </span>
                            )}
                            {!isRejected && (
                                <span style={{ 
                                    color: isAccepted ? 'rgba(0, 0, 0, 0.84)' : 'rgb(26, 137, 23)',
                                    cursor: showTooltip ? 'help' : 'default',
                                    marginLeft: !isAccepted ? '4px' : '0'
                                }}>
                                    {segment.replacement}
                                </span>
                            )}
                            {showTooltip && (
                                <span style={{ 
                                    display: 'inline-block',
                                    marginLeft: '4px',
                                    verticalAlign: 'middle'
                                }}>
                                    <button
                                        onClick={() => handleAcceptChange(index)}
                                        style={{
                                            padding: '2px 6px',
                                            marginRight: '4px',
                                            minWidth: 'unset',
                                            fontSize: '12px',
                                            lineHeight: '1',
                                            verticalAlign: 'middle'
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
                                            padding: '2px 6px',
                                            minWidth: 'unset',
                                            fontSize: '12px',
                                            lineHeight: '1',
                                            verticalAlign: 'middle'
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
            </>
        );
    };

    return (
        <ApiErrorBoundary>
            <div className="style-guide-container">
                <div style={{ 
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    backgroundColor: '#fff',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '500',
                        color: 'rgba(0, 0, 0, 0.84)',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                    }}>
                        Style-Guider
                    </div>
                    <button
                        onClick={generateStyleGuide}
                        disabled={loading || !inputText.trim()}
                        className="primary"
                        style={{
                            fontSize: '15px',
                            padding: '8px 16px',
                            minWidth: '120px',
                            margin: 0
                        }}
                    >
                        {loading ? 'Analyzing...' : 'Analyze Text'}
                    </button>
                </div>

                <div style={{ 
                    padding: '40px 20px', 
                    maxWidth: '728px', 
                    margin: '0 auto',
                    position: 'relative'
                }}>
                    {!loading && !styleGuide && (
                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder="Start writing or paste your text here..."
                            disabled={loading}
                            style={{
                                width: '100%',
                                minHeight: '200px',
                                padding: '20px 0',
                                border: 'none',
                                outline: 'none',
                                fontFamily: 'medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif',
                                fontSize: '21px',
                                lineHeight: '1.6',
                                color: loading ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.84)',
                                resize: 'none',
                                overflow: 'hidden',
                                background: 'transparent',
                                transition: 'color 0.2s ease'
                            }}
                        />
                    )}

                    {loading && (
                        <div style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px 0',
                            fontFamily: 'medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif',
                            fontSize: '21px',
                            lineHeight: '1.6',
                            color: 'rgba(0, 0, 0, 0.4)',
                            position: 'relative',
                            textAlign: 'left'
                        }}>
                            {inputText}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(2px)',
                                zIndex: 10
                            }}>
                                <LoadingSpinner />
                            </div>
                        </div>
                    )}

                    {!loading && styleGuide && (
                        <div style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px 0',
                            fontFamily: 'medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif',
                            fontSize: '21px',
                            lineHeight: '1.6',
                            color: 'rgba(0, 0, 0, 0.84)',
                            textAlign: 'left',
                            whiteSpace: 'pre-wrap',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent'
                        }}>
                            {renderChanges(styleGuide)}
                        </div>
                    )}

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
                </div>
            </div>
        </ApiErrorBoundary>
    );
}

export default StyleGuideGenerator; 