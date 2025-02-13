import React from 'react';
import { AnthropicError } from '../utils/errors/AnthropicError';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { 
            hasError: true,
            error: error
        };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            errorInfo: errorInfo
        });
        
        // Log the error
        console.error('Error caught by boundary:', error);
        console.error('Component stack:', errorInfo.componentStack);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null,
            errorInfo: null 
        });
        
        // Call the onReset prop if provided
        if (this.props.onReset) {
            this.props.onReset();
        }
    }

    render() {
        if (this.state.hasError) {
            const isAnthropicError = this.state.error instanceof AnthropicError;
            const containerClassName = `error-container ${isAnthropicError ? 'api-error' : ''}`;

            if (isAnthropicError) {
                return (
                    <div className={containerClassName}>
                        <h2>API Error</h2>
                        <p>{this.state.error.message}</p>
                        {this.state.error.code && (
                            <p>Error Code: {this.state.error.code}</p>
                        )}
                        {this.state.error.timestamp && (
                            <p>Time: {new Date(this.state.error.timestamp).toLocaleString()}</p>
                        )}
                        <button onClick={this.handleReset}>
                            Try Again
                        </button>
                        {this.props.children && (
                            <button onClick={() => window.location.reload()}>
                                Reload Page
                            </button>
                        )}
                    </div>
                );
            }

            return (
                <div className={containerClassName}>
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
                    {this.props.showDetails && this.state.errorInfo && (
                        <details>
                            <summary>Error Details</summary>
                            <pre>{this.state.errorInfo.componentStack}</pre>
                        </details>
                    )}
                    <button onClick={this.handleReset}>
                        Try Again
                    </button>
                    {this.props.children && (
                        <button onClick={() => window.location.reload()}>
                            Reload Page
                        </button>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 