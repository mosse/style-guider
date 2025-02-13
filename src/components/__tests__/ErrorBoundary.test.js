import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { AnthropicError } from '../../utils/errors/AnthropicError';

// Mock console.error to avoid test noise
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalError;
});

describe('ErrorBoundary', () => {
    const ThrowError = ({ error }) => {
        throw error;
    };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('should render children when there is no error', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <div>Test Content</div>
            </ErrorBoundary>
        );

        expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('should render error UI for general errors', () => {
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should render specific UI for Anthropic errors', () => {
        const error = new AnthropicError('API Error', 429, { details: 'Rate limited' });
        
        render(
            <ErrorBoundary>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.getByText(/429/)).toBeInTheDocument();
    });

    it('should call onReset when Try Again is clicked', () => {
        const onReset = jest.fn();
        const error = new Error('Test error');
        
        render(
            <ErrorBoundary onReset={onReset}>
                <ThrowError error={error} />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByText('Try Again'));
        expect(onReset).toHaveBeenCalled();
    });

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
}); 