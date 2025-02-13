import React from 'react';
import ErrorBoundary from './ErrorBoundary';

class RootErrorBoundary extends React.Component {
    handleReset = () => {
        // Reload the entire app on reset at root level
        window.location.reload();
    };

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

export default RootErrorBoundary; 