import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { AnthropicError } from '../utils/errors/AnthropicError';
import './NetworkErrorBoundary.css';

/**
 * NetworkErrorBoundary Component
 * 
 * A specialized error boundary for network-related errors.
 * It provides more specific error handling and recovery for network issues.
 */
class NetworkErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOffline: false,
            retryCount: 0
        };
        
        // Bind methods
        this.handleOfflineStatus = this.handleOfflineStatus.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        this.handleReset = this.handleReset.bind(this);
    }

    componentDidMount() {
        // Register online/offline event listeners
        window.addEventListener('offline', this.handleOfflineStatus);
        window.addEventListener('online', this.handleOnlineStatus);
    }

    componentWillUnmount() {
        // Clean up event listeners
        window.removeEventListener('offline', this.handleOfflineStatus);
        window.removeEventListener('online', this.handleOnlineStatus);
    }

    handleOfflineStatus() {
        this.setState({ isOffline: true });
    }

    handleOnlineStatus() {
        this.setState({ isOffline: false });
    }

    handleReset(error) {
        const isNetworkError = this.isNetworkRelatedError(error);
        
        if (isNetworkError) {
            this.setState(prevState => ({
                retryCount: prevState.retryCount + 1
            }));
        }
        
        // Call the onReset prop if provided
        if (this.props.onReset) {
            this.props.onReset();
        }
    }

    // Check if an error is network-related
    isNetworkRelatedError(error) {
        if (!error) return false;
        
        // Check for Anthropic API connection errors
        if (error instanceof AnthropicError) {
            const networkErrorCodes = [408, 502, 503, 504, 0]; // 0 is for fetch errors
            return networkErrorCodes.includes(error.code);
        }
        
        // Check for standard network errors
        const networkErrorMessages = [
            'network',
            'connection',
            'offline',
            'failed to fetch',
            'internet',
            'timeout',
            'aborted'
        ];
        
        const errorMessage = (error.message || '').toLowerCase();
        return networkErrorMessages.some(term => errorMessage.includes(term));
    }

    // Custom fallback UI for network errors
    renderNetworkErrorFallback(error, resetErrorBoundary) {
        return (
            <div className="network-error-container">
                <h2>Network Connection Issue</h2>
                <p>
                    {this.state.isOffline 
                        ? "You appear to be offline. Please check your internet connection." 
                        : "There was a problem connecting to the service."}
                </p>
                
                {this.state.retryCount > 0 && (
                    <p className="retry-message">
                        Retried {this.state.retryCount} time{this.state.retryCount !== 1 ? 's' : ''} so far.
                    </p>
                )}
                
                <button 
                    className="retry-button"
                    onClick={resetErrorBoundary}
                    disabled={this.state.isOffline}
                >
                    {this.state.isOffline ? 'Waiting for connection...' : 'Retry Connection'}
                </button>
                
                {!this.state.isOffline && (
                    <div className="network-troubleshooting">
                        <h4>Troubleshooting Tips:</h4>
                        <ul>
                            <li>Check if the server is running and accessible</li>
                            <li>Verify your API keys and credentials</li>
                            <li>Try again in a few minutes</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    render() {
        return (
            <ErrorBoundary
                onReset={this.handleReset}
                fallbackRender={({ error, resetErrorBoundary }) => {
                    // Use custom network error UI for network errors
                    if (this.isNetworkRelatedError(error)) {
                        return this.renderNetworkErrorFallback(error, resetErrorBoundary);
                    }
                    
                    // For non-network errors, use the default fallback
                    return null;
                }}
            >
                {this.props.children}
            </ErrorBoundary>
        );
    }
}

export default NetworkErrorBoundary; 