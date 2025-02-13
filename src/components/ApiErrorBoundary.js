import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { AnthropicError } from '../utils/errors/AnthropicError';

class ApiErrorBoundary extends React.Component {
    handleReset = () => {
        // Clear any API-related state or cache here
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    shouldComponentUpdate(nextProps) {
        // Only update if the children or onReset prop changes
        return (
            this.props.children !== nextProps.children ||
            this.props.onReset !== nextProps.onReset
        );
    }

    render() {
        return (
            <ErrorBoundary
                onReset={this.handleReset}
                showDetails={process.env.NODE_ENV === 'development'}
            >
                {this.props.children}
            </ErrorBoundary>
        );
    }
}

export default ApiErrorBoundary; 