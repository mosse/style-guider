import React, { useState, useRef, useEffect } from 'react';
import { anthropicService } from '../services/anthropic/AnthropicService';
import ApiErrorBoundary from './ApiErrorBoundary';
import NetworkErrorBoundary from './NetworkErrorBoundary';
import { Tooltip } from 'react-tooltip';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import { getStyleGuidePrompt } from '../services/prompts/styleGuidePrompt';
import { cleanAndParseResponse, getParserTelemetry } from '../utils/responseParser';
import { loadingPhrases } from '../utils/loadingPhrases';
import 'react-tooltip/dist/react-tooltip.css';

function StyleGuideGenerator() {
    const [inputText, setInputText] = useState('');
    const [styleGuide, setStyleGuide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [acceptedChanges, setAcceptedChanges] = useState(new Set());
    const [rejectedChanges, setRejectedChanges] = useState(new Set());
    const [parserStats, setParserStats] = useState(null);
    const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const textareaRef = useRef(null);

    // Example text constant
    const EXAMPLE_TEXT = `A report from the Labor Department yesterday showed that inflation has dropped again, falling back to 2.4%, the same rate as it was just before the coronavirus pandemic. Today the Dow Jones Industrial Average jumped 400 points to a record high, while the S&P 500 closed above 5,800 for the first time. 

Washington Post economics columnist Heather Long noted that "[b]y just about every measure, the U.S. economy is in good shape." Inflation is back down, growth remains strong at 3%, unemployment is low at 4.1% with the U.S. having created almost 7 million more jobs than it had before the pandemic. The stock market is hitting all-time highs. Long adds that "many Americans are getting sizable pay raises, and middle-class wealth has surged to record levels." The Federal Reserve has begun to cut interest rates, and foreign leaders are talking about the U.S. economy with envy. 

Democratic presidential nominee and sitting vice president Kamala Harris has promised to continue the economic policies of the Biden-Harris administration and focus on cutting costs for families. She has called for a federal law against price gouging on groceries during times of crisis, cutting taxes for families, and enabling Medicare to pay for home health aides. She has proposed $25,000 in down payment assistance for first-time homebuyers and promised to work with the private sector to build 3 million new housing units by the end of her first term. 

The Committee for a Responsible Federal Budget, which focuses on the direct effect of policies on the federal debt, estimated that Harris's plans would add $3.5 trillion to the debt.`;

    // Get random index from the loadingPhrases array, excluding the first null item
    const getRandomPhraseIndex = () => {
        // Start from index 1 to skip the null
        return Math.floor(Math.random() * (loadingPhrases.length - 1)) + 1;
    };

    // Effect to rotate loading phrases randomly
    useEffect(() => {
        let intervalId;
        
        if (loading) {
            // Start with index 0 (null) for default message
            setLoadingPhraseIndex(0);
            
            // Set up interval to change phrases randomly every 5 seconds
            intervalId = setInterval(() => {
                setLoadingPhraseIndex(getRandomPhraseIndex());
            }, 5000);
        } else {
            // Reset phrase index when loading stops
            setLoadingPhraseIndex(0);
        }
        
        // Cleanup function to clear interval
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [loading]);

    // Effect to detect touch device
    useEffect(() => {
        const checkTouchDevice = () => {
            const hasTouch = 'ontouchstart' in window || 
                            navigator.maxTouchPoints > 0 || 
                            navigator.msMaxTouchPoints > 0;
            setIsTouchDevice(hasTouch);
        };
        
        checkTouchDevice();
        window.addEventListener('resize', checkTouchDevice);
        
        return () => window.removeEventListener('resize', checkTouchDevice);
    }, []);

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

    const handleExampleText = () => {
        setInputText(EXAMPLE_TEXT);
        // Wait for state update then adjust height
        setTimeout(adjustTextareaHeight, 0);
    };

    const generateStyleGuide = async () => {
        if (!inputText.trim()) return;

        setLoading(true);
        setError(null);
        setStyleGuide(null);
        setParserStats(null);

        try {
            const prompt = getStyleGuidePrompt(inputText);
            const response = await anthropicService.generateStyleGuide(prompt);
            
            try {
                console.log('Raw API response:', response);
                const changes = cleanAndParseResponse(response);
                setStyleGuide(changes);
                
                // Capture parser statistics
                setParserStats(getParserTelemetry());
            } catch (err) {
                console.error('Parse error details:', {
                    error: err.message,
                    responseLength: response?.length,
                    responsePreview: response?.substring(0, 300) + '...',
                    position: err.message.match(/position (\d+)/)?.[1]
                });
                throw err; // Pass the error as is to be handled by the error state
            }
        } catch (err) {
            setError(err);
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
    };

    const resetState = () => {
        setInputText('');
        setStyleGuide(null);
        setError(null);
        setAcceptedChanges(new Set());
        setRejectedChanges(new Set());
        setParserStats(null);
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    // Reset error and retry the operation
    const resetError = () => {
        setError(null);
        // Keep the input text so the user can retry
    };

    const renderChanges = (changes) => {
        if (!Array.isArray(changes)) return null;

        return (
            <>
                {changes.map((segment, index) => {
                    if (typeof segment === 'string') {
                        // Handle newline characters properly
                        if (segment === "\n") {
                            return <br key={index} />;
                        }
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
                                    positionStrategy="fixed"
                                    offset={isTouchDevice ? 10 : 20}
                                    delayShow={isTouchDevice ? 0 : 100}
                                    float={!isTouchDevice}
                                    openOnClick={isTouchDevice}
                                    closeEvents={isTouchDevice ? "click" : null}
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
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    marginLeft: '4px',
                                    position: 'relative',
                                    top: '-4px'
                                }}>
                                    <button
                                        onClick={() => handleAcceptChange(index)}
                                        style={{
                                            padding: '2px 6px',
                                            marginRight: '4px',
                                            minWidth: 'unset',
                                            fontSize: '12px',
                                            lineHeight: '1',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
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
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
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
        <NetworkErrorBoundary>
            <ApiErrorBoundary>
                <div className="style-guide-container">
                    <div style={{
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                        background: 'white',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        width: '100%',
                    }}>
                        <div style={{
                            maxWidth: '1024px',
                            margin: '0 auto',
                            padding: '12px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '300',
                                color: 'rgba(0, 0, 0, 0.84)',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
                                fontVariant: 'small-caps',
                                letterSpacing: '0.03em'
                            }}>
                                Style Guider
                            </div>
                            <button
                                onClick={styleGuide || error ? resetState : generateStyleGuide}
                                disabled={loading || (!styleGuide && !error && !inputText.trim())}
                                className={styleGuide || error ? '' : 'primary'}
                                style={{
                                    fontSize: '15px',
                                    padding: '8px 16px',
                                    minWidth: '120px',
                                    margin: 0,
                                    ...(styleGuide || error ? {
                                        backgroundColor: 'white',
                                        color: 'rgb(26, 137, 23)',
                                        border: '1px solid rgb(26, 137, 23)',
                                        cursor: 'pointer'
                                    } : {})
                                }}
                            >
                                {loading ? 'Analyzing...' : (styleGuide || error ? 'Reset' : 'Analyze Text')}
                            </button>
                        </div>
                    </div>

                    <div style={{ 
                        padding: '40px 20px', 
                        maxWidth: '728px', 
                        margin: '0 auto',
                        position: 'relative'
                    }}>
                        {!loading && !styleGuide && (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
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
                                {!inputText.trim() && (
                                    <button
                                        onClick={handleExampleText}
                                        style={{
                                            marginTop: '8px',
                                            padding: '8px 16px',
                                            fontSize: '15px',
                                            backgroundColor: 'white',
                                            color: 'rgb(26, 137, 23)',
                                            border: '1px solid rgb(26, 137, 23)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <span>Try an example</span>
                                    </button>
                                )}
                            </div>
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
                                textAlign: 'left',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {inputText}
                                <div style={{
                                    position: 'fixed',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    display: 'flex',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(2px)',
                                    zIndex: 10,
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <LoadingSpinner message={loadingPhrases[loadingPhraseIndex]} />
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
                            <ErrorDisplay error={error} resetError={resetError} />
                        )}

                        {/* Parser statistics display in development mode */}
                        {process.env.NODE_ENV === 'development' && parserStats && (
                            <div style={{
                                marginTop: '40px',
                                padding: '15px',
                                backgroundColor: '#f5f9ff',
                                border: '1px solid #d0e1fd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#2c5282' }}>Parser Stats</h4>
                                <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                                    <li>Success Rate: {parserStats.successRate}</li>
                                    <li>Primary Success: {parserStats.primarySuccessRate}</li>
                                    <li>Fallback Success: {parserStats.fallbackSuccessRate}</li>
                                    <li>Total Attempts: {parserStats.totalAttempts}</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </ApiErrorBoundary>
        </NetworkErrorBoundary>
    );
}

export default StyleGuideGenerator; 