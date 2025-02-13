import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StyleGuideGenerator from '../StyleGuideGenerator';
import { anthropicService } from '../../services/anthropic/AnthropicService';

// Mock the AnthropicService
jest.mock('../../services/anthropic/AnthropicService', () => ({
    anthropicService: {
        generateStyleGuide: jest.fn()
    }
}));

// Mock react-tooltip to avoid DOM warnings
jest.mock('react-tooltip', () => ({
    Tooltip: () => null
}));

describe('StyleGuideGenerator', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    /**
     * Tests initial rendering of the component
     * Verifies all UI elements are present and properly configured
     */
    it('renders initial state correctly', () => {
        render(<StyleGuideGenerator />);
        
        // Check for main UI elements
        expect(screen.getByText('AP Style Guide Improver')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Analyze Text' })).toBeInTheDocument();
        
        // Button should be disabled initially (no text)
        expect(screen.getByRole('button')).toBeDisabled();
        
        // Results section should not be present initially
        expect(screen.queryByText('Suggested Improvements')).not.toBeInTheDocument();
    });

    /**
     * Tests successful API response handling
     * Verifies proper parsing and display of changes
     */
    it('handles successful API response correctly', async () => {
        const mockResponse = [
            "This is unchanged text. ",
            {
                "original": "govt",
                "replacement": "government",
                "reason": "AP style avoids abbreviations"
            },
            " more text."
        ];

        anthropicService.generateStyleGuide.mockResolvedValueOnce(JSON.stringify(mockResponse));

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('Suggested Improvements')).toBeInTheDocument();
        });

        // Check that all parts of the response are rendered
        expect(screen.getByText('This is unchanged text.')).toBeInTheDocument();
        expect(screen.getByText('govt')).toBeInTheDocument();
        expect(screen.getByText('government')).toBeInTheDocument();
        expect(screen.getByText('more text.')).toBeInTheDocument();
    });

    /**
     * Tests error handling
     * Verifies proper display of error messages
     */
    it('handles API errors correctly', async () => {
        const errorMessage = 'API Error';
        anthropicService.generateStyleGuide.mockRejectedValueOnce(new Error(errorMessage));

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Error:')).toBeInTheDocument();
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    /**
     * Tests JSON parsing error handling
     * Verifies proper handling of malformed JSON responses
     */
    it('handles malformed JSON responses correctly', async () => {
        // Mock a malformed JSON response
        anthropicService.generateStyleGuide.mockResolvedValueOnce('```json\ninvalid json\n```');

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
        });

        await act(async () => {
            await userEvent.click(button);
        });

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText(/Error:/)).toBeInTheDocument();
        });
    });

    /**
     * Tests loading state
     * Verifies proper display of loading indicators
     */
    it('shows loading state while waiting for API response', async () => {
        anthropicService.generateStyleGuide.mockImplementation(() => 
            new Promise(resolve => setTimeout(resolve, 100))
        );

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button');

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Check loading state
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
        expect(button).toBeDisabled();
    });

    /**
     * Tests markdown cleaning
     * Verifies proper handling of responses with markdown formatting
     */
    it('handles responses with markdown formatting correctly', async () => {
        const mockResponse = '```json\n["text"]\n```';
        anthropicService.generateStyleGuide.mockResolvedValueOnce(mockResponse);

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('text')).toBeInTheDocument();
        });
    });

    /**
     * Tests linebreak preservation
     * Verifies proper handling of multi-paragraph text
     */
    it('preserves linebreaks in text', async () => {
        const mockResponse = [
            "First paragraph.\n\n",
            "Second paragraph."
        ];

        anthropicService.generateStyleGuide.mockResolvedValueOnce(JSON.stringify(mockResponse));

        render(<StyleGuideGenerator />);
        
        // Type multi-paragraph text and analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text\n\nNew paragraph');
            await userEvent.click(button);
        });

        // Wait for results and check formatting
        await waitFor(() => {
            const result = screen.getByText('First paragraph.', { exact: false });
            expect(result.parentElement).toHaveStyle({ whiteSpace: 'pre-wrap' });
        });
    });

    /**
     * Tests tooltip functionality
     * Verifies proper rendering and behavior of tooltips
     */
    it('renders tooltips for changes', async () => {
        const mockResponse = JSON.stringify([
            {
                "original": "test",
                "replacement": "example",
                "reason": "AP style explanation"
            }
        ]);

        anthropicService.generateStyleGuide.mockResolvedValueOnce(mockResponse);

        render(<StyleGuideGenerator />);
        
        // Type text and analyze
        const textarea = screen.getByPlaceholderText('Paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
        });

        await act(async () => {
            await userEvent.click(button);
        });

        // Wait for results and verify tooltip attributes
        await waitFor(() => {
            const tooltipContainer = screen.getByText('test').closest('[data-tooltip-content]');
            expect(tooltipContainer).toHaveAttribute('data-tooltip-content', 'AP style explanation');
            expect(tooltipContainer).toHaveAttribute('data-tooltip-id');
        });
    });
}); 