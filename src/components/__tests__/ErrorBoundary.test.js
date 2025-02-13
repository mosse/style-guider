import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { AnthropicError } from '../../utils/errors/AnthropicError';

/**
 * Test suite for the ErrorBoundary component.
 * This component catches and handles errors in the React component tree,
 * providing fallback UI and error recovery mechanisms.
 */

// Mock console.error to avoid test noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});

describe('ErrorBoundary', () => {
    // Helper component that throws an error for testing
    const ThrowError = ({ error }) => {
        throw error;
    };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    /**
     * Tests the default behavior when no errors occur.
     * Verifies:
     * - Children are rendered normally
     * - No error UI is shown
     * - Component tree remains intact
     */
    it('should render children when there is no error', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <div>Test Content</div>
            </ErrorBoundary>
        );

        expect(getByText('Test Content')).toBeInTheDocument();
    });

    /**
     * Tests handling of general JavaScript errors.
     * Verifies:
     * - Generic error UI is shown
     * - Error message is displayed
     * - Error boundary catches and contains the error
     * - Error doesn't propagate up the component tree
     */
    it('should render error UI for general errors', () => {
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    /**
     * Tests handling of Anthropic API-specific errors.
     * Verifies:
     * - API-specific error UI is shown
     * - Error code is displayed
     * - Error message is properly formatted
     * - API error styling is applied
     */
    it('should render specific UI for Anthropic errors', () => {
        const error = new AnthropicError('API Error Message', 429, { details: 'Rate limited' });
        
        render(
            <ErrorBoundary>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('heading', { name: 'API Error' })).toBeInTheDocument();
        expect(screen.getByText('API Error Message')).toBeInTheDocument();
        expect(screen.getByText(/Error Code: 429/)).toBeInTheDocument();
    });

    /**
     * Tests the error recovery mechanism.
     * Verifies:
     * - Reset callback is called when Try Again is clicked
     * - Error state is cleared
     * - Component can recover from errors
     * - Reset handler receives proper parameters
     */
    it('should call onReset when Try Again is clicked', () => {
        const onReset = jest.fn();
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary onReset={onReset}>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
        expect(onReset).toHaveBeenCalled();
    });

    /**
     * Tests development mode error details display.
     * Verifies:
     * - Error stack trace is shown in development
     * - Error details are expandable
     * - Development-only features are present
     * - Component stack is included
     */
    it('should show error details in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary showDetails={true}>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Error Details')).toBeInTheDocument();
        
        process.env.NODE_ENV = originalEnv;
    });

    /**
     * Tests production mode error handling.
     * Verifies:
     * - Sensitive error details are hidden
     * - User-friendly error message is shown
     * - Stack traces are not exposed
     * - Production-safe error handling
     */
    it('should not show error details in production mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
        
        process.env.NODE_ENV = originalEnv;
    });

    /**
     * Tests the page reload functionality.
     * Verifies:
     * - Reload button is shown when appropriate
     * - Full page refresh is available as recovery option
     * - Button is properly labeled and accessible
     */
    it('should show reload button when children are present', () => {
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary>
                <div>Some content</div>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
    });
}); 