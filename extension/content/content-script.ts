/**
 * Content Script
 *
 * Detects text selection on web pages, shows a floating "Style Check" button,
 * and renders inline annotations using Shadow DOM for style isolation.
 */

import { renderAnnotations, removeAnnotations } from './annotations.js';

const MIN_SELECTION_LENGTH = 10;
let floatingButton: HTMLElement | null = null;
let loadingIndicator: HTMLElement | null = null;
let selectedText = '';

/**
 * Creates the floating "Style Check" button element.
 */
function createFloatingButton(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'style-guider-button-host';

  const shadow = container.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .sg-button {
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #1a8917;
      color: white;
      border: none;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: background 0.15s, transform 0.15s;
      white-space: nowrap;
    }
    .sg-button:hover {
      background: #157a13;
      transform: scale(1.03);
    }
    .sg-button.visible {
      display: flex;
    }
    .sg-loading {
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #333;
      color: white;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .sg-loading.visible {
      display: flex;
    }
    .sg-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: sg-spin 0.8s linear infinite;
    }
    @keyframes sg-spin {
      to { transform: rotate(360deg); }
    }
  `;

  const button = document.createElement('button');
  button.className = 'sg-button';
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
    Style Check
  `;

  const loading = document.createElement('div');
  loading.className = 'sg-loading';
  loading.innerHTML = `<div class="sg-spinner"></div> Analyzing...`;

  shadow.appendChild(style);
  shadow.appendChild(button);
  shadow.appendChild(loading);

  button.addEventListener('click', handleStyleCheck);

  document.body.appendChild(container);

  floatingButton = button;
  loadingIndicator = loading;
  return container;
}

/**
 * Positions and shows the floating button near the text selection.
 */
function showButton(x: number, y: number) {
  if (!floatingButton) createFloatingButton();
  if (!floatingButton) return;

  floatingButton.style.left = `${x}px`;
  floatingButton.style.top = `${y + 10}px`;
  floatingButton.classList.add('visible');
}

function hideButton() {
  floatingButton?.classList.remove('visible');
}

function showLoading(x: number, y: number) {
  if (!loadingIndicator) return;
  loadingIndicator.style.left = `${x}px`;
  loadingIndicator.style.top = `${y + 10}px`;
  loadingIndicator.classList.add('visible');
}

function hideLoading() {
  loadingIndicator?.classList.remove('visible');
}

/**
 * Handles the "Style Check" button click.
 * Sends selected text to the background service worker for analysis.
 */
async function handleStyleCheck() {
  if (!selectedText) return;

  hideButton();

  // Get button position for loading indicator
  const rect = floatingButton?.getBoundingClientRect();
  if (rect) {
    showLoading(rect.left, rect.top);
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE',
      text: selectedText,
    });

    hideLoading();

    if (response.error) {
      console.error('Style Guider analysis error:', response.error);
      showTemporaryMessage(response.error, 'error');
      return;
    }

    if (response.segments && response.segments.length > 0) {
      renderAnnotations(response.segments, selectedText);
    } else {
      showTemporaryMessage('No style suggestions found.', 'info');
    }
  } catch (error: any) {
    hideLoading();
    console.error('Style Guider error:', error);
    showTemporaryMessage('Failed to analyze text. Check your connection.', 'error');
  }
}

/**
 * Shows a temporary toast message.
 */
function showTemporaryMessage(text: string, type: 'info' | 'error') {
  const toast = document.createElement('div');
  const shadow = toast.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .sg-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      padding: 12px 20px;
      background: ${type === 'error' ? '#d32f2f' : '#333'};
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: sg-fadeIn 0.2s ease;
    }
    @keyframes sg-fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const msg = document.createElement('div');
  msg.className = 'sg-toast';
  msg.textContent = text;

  shadow.appendChild(style);
  shadow.appendChild(msg);
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

/**
 * Listen for text selection.
 */
document.addEventListener('mouseup', (event) => {
  // Ignore clicks on our own UI
  const target = event.target as HTMLElement;
  if (target.closest('#style-guider-button-host') || target.closest('#style-guider-annotations')) {
    return;
  }

  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? '';

  if (text.length >= MIN_SELECTION_LENGTH) {
    selectedText = text;
    showButton(event.clientX, event.clientY);
  } else {
    hideButton();
    selectedText = '';
  }
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', (event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('#style-guider-button-host')) {
    hideButton();
  }
});

// Listen for messages from background (e.g., dismiss annotations)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CLEAR_ANNOTATIONS') {
    removeAnnotations();
  }
});
