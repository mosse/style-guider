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

// Mock react-tooltip
jest.mock('react-tooltip', () => ({
    Tooltip: jest.fn(({ id }) => <div data-testid={`tooltip-${id}`} />)
}));

describe('StyleGuideGenerator', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Reset all mocks after each test
        jest.resetAllMocks();
    });

    /**
     * Tests initial rendering of the component
     * Verifies all UI elements are present and properly configured
     */
    it('renders initial state correctly', () => {
        render(<StyleGuideGenerator />);
        
        // Check for main UI elements
        expect(screen.getByText('Style-Guider')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Start writing or paste your text here...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Analyze Text' })).toBeInTheDocument();
        
        // Button should be disabled initially (no text)
        expect(screen.getByRole('button')).toBeDisabled();
        
        // Verify critical textarea styling
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        
        // Test only the most important styles individually
        expect(textarea).toHaveStyle('resize: none');
        expect(textarea).toHaveStyle('overflow: hidden');
        expect(textarea).toHaveStyle('outline: none');
        expect(textarea).toHaveStyle('background: transparent');
        expect(textarea).toHaveStyle('width: 100%');
        expect(textarea).toHaveStyle('padding: 20px 0');
        
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('This is unchanged text.')).toBeInTheDocument();
        });

        // Check that all parts of the response are rendered
        const originalText = screen.getByText('govt');
        const replacementText = screen.getByText('government');
        
        // Verify styling of original and replacement text
        expect(originalText).toHaveStyle({
            textDecoration: 'line-through',
            color: 'rgba(0, 0, 0, 0.54)'
        });
        expect(replacementText).toHaveStyle({
            color: 'rgb(26, 137, 23)'
        });
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for error message with the specific error we expect from our parser
        await waitFor(() => {
            expect(screen.getByText(/Error:/)).toBeInTheDocument();
            expect(screen.getByText(/Failed to parse API response/)).toBeInTheDocument();
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        const button = screen.getByRole('button');

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Check loading state
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
        expect(button).toBeDisabled();
        expect(screen.getByText('Analyzing your text with AP style magic... ✨')).toBeInTheDocument();
        
        // Verify textarea is disabled and greyed out during loading
        expect(textarea).toBeDisabled();
        expect(textarea).toHaveStyle({ color: 'rgba(0, 0, 0, 0.4)' });
    });

    /**
     * Tests markdown cleaning
     * Verifies proper handling of responses with markdown formatting
     */
    it('handles responses with markdown formatting correctly', async () => {
        const mockResponse = [
            "This is valid JSON text"
        ];
        anthropicService.generateStyleGuide.mockResolvedValueOnce('```json\n' + JSON.stringify(mockResponse) + '\n```');

        render(<StyleGuideGenerator />);
        
        // Type some text and click analyze
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        const button = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(button);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('This is valid JSON text')).toBeInTheDocument();
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
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

    /**
     * Tests accept/reject functionality for changes
     * Verifies:
     * - Accept button shows/works correctly
     * - Reject button shows/works correctly
     * - UI updates appropriately after actions
     */
    it('handles accepting and rejecting changes', async () => {
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
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        const analyzeButton = screen.getByRole('button', { name: 'Analyze Text' });

        await act(async () => {
            await userEvent.type(textarea, 'Test text');
            await userEvent.click(analyzeButton);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('test')).toBeInTheDocument();
            expect(screen.getByText('example')).toBeInTheDocument();
        });

        // Find and click accept button using aria-label
        const acceptButton = screen.getByRole('button', { name: /accept change/i });
        await act(async () => {
            await userEvent.click(acceptButton);
        });

        // After accepting, original text should be gone
        expect(screen.queryByText('test')).not.toBeInTheDocument();
        // Replacement should still be there but in normal color
        const replacement = screen.getByText('example');
        expect(replacement).toHaveStyle({ color: 'rgba(0, 0, 0, 0.84)' });

        // Buttons should be gone
        expect(screen.queryByRole('button', { name: /accept change/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /reject change/i })).not.toBeInTheDocument();
    });

    it('handles rejecting changes', async () => {
        const mockResponse = JSON.stringify([
            {
                "original": "test",
                "replacement": "example",
                "reason": "AP style explanation"
            }
        ]);

        anthropicService.generateStyleGuide.mockResolvedValueOnce(mockResponse);

        render(<StyleGuideGenerator />);
        
        // Set up initial state
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        fireEvent.change(textarea, { target: { value: 'Test text' } });
        
        const analyzeButton = screen.getByText('Analyze Text');
        await act(async () => {
            fireEvent.click(analyzeButton);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('test')).toBeInTheDocument();
        });

        // Initial state check
        const original = screen.getByText('test');
        const replacement = screen.getByText('example');
        
        // Reject the change
        const rejectButton = screen.getByRole('button', { name: /reject change/i });
        await act(async () => {
            fireEvent.click(rejectButton);
        });

        // Original text should still be there without strikethrough
        const originalAfterReject = screen.getByText('test');
        expect(originalAfterReject).toBeInTheDocument();
        expect(originalAfterReject).not.toHaveStyle({ textDecoration: 'line-through' });
        expect(originalAfterReject).toHaveStyle({ color: 'rgba(0, 0, 0, 0.84)' });

        // Replacement text should be gone
        expect(screen.queryByText('example')).not.toBeInTheDocument();

        // Buttons should be gone
        expect(screen.queryByRole('button', { name: /accept change/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /reject change/i })).not.toBeInTheDocument();
    });

    it('removes tooltip when accepting changes', async () => {
        const mockResponse = JSON.stringify([
            {
                "original": "test",
                "replacement": "example",
                "reason": "AP style explanation"
            }
        ]);

        anthropicService.generateStyleGuide.mockResolvedValueOnce(mockResponse);

        render(<StyleGuideGenerator />);
        
        // Set up initial state
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        fireEvent.change(textarea, { target: { value: 'Test text' } });
        
        const analyzeButton = screen.getByText('Analyze Text');
        await act(async () => {
            fireEvent.click(analyzeButton);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('test')).toBeInTheDocument();
        });

        // Check initial tooltip attributes
        const tooltipContainer = screen.getByText('test').closest('[data-tooltip-content]');
        expect(tooltipContainer).toHaveAttribute('data-tooltip-content', 'AP style explanation');
        expect(tooltipContainer).toHaveAttribute('data-tooltip-id', 'change-0');

        // Accept the change
        const acceptButton = screen.getByRole('button', { name: /accept change/i });
        await act(async () => {
            fireEvent.click(acceptButton);
        });

        // Verify tooltip attributes are removed
        const textElement = screen.getByText('example');
        const container = textElement.closest('span');
        expect(container).not.toHaveAttribute('data-tooltip-content');
        expect(container).not.toHaveAttribute('data-tooltip-id');
    });

    it('removes tooltip when rejecting changes', async () => {
        const mockResponse = JSON.stringify([
            {
                "original": "test",
                "replacement": "example",
                "reason": "AP style explanation"
            }
        ]);

        anthropicService.generateStyleGuide.mockResolvedValueOnce(mockResponse);

        render(<StyleGuideGenerator />);
        
        // Set up initial state
        const textarea = screen.getByPlaceholderText('Start writing or paste your text here...');
        fireEvent.change(textarea, { target: { value: 'Test text' } });
        
        const analyzeButton = screen.getByText('Analyze Text');
        await act(async () => {
            fireEvent.click(analyzeButton);
        });

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('test')).toBeInTheDocument();
        });

        // Check initial tooltip attributes
        const tooltipContainer = screen.getByText('test').closest('[data-tooltip-content]');
        expect(tooltipContainer).toHaveAttribute('data-tooltip-content', 'AP style explanation');
        expect(tooltipContainer).toHaveAttribute('data-tooltip-id', 'change-0');

        // Reject the change
        const rejectButton = screen.getByRole('button', { name: /reject change/i });
        await act(async () => {
            fireEvent.click(rejectButton);
        });

        // Verify tooltip attributes are removed
        const textElement = screen.getByText('test');
        const container = textElement.closest('span');
        expect(container).not.toHaveAttribute('data-tooltip-content');
        expect(container).not.toHaveAttribute('data-tooltip-id');
    });
}); 