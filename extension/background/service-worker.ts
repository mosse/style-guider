/**
 * Background Service Worker
 *
 * Handles all API communication, storage management, and coordination
 * between the content script and side panel.
 */

const DEFAULT_BACKEND_URL = 'https://style-guider.vercel.app';

interface StorageData {
  deviceToken: string;
  activeGuideId: string | null;
  backendUrl: string;
}

// Generate a device token on first install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['deviceToken']);
  if (!data.deviceToken) {
    await chrome.storage.local.set({
      deviceToken: crypto.randomUUID(),
      activeGuideId: null,
      backendUrl: DEFAULT_BACKEND_URL,
    });
  }
});

// Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Message handler for content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => {
    sendResponse({ error: error.message });
  });
  return true; // Keep the message channel open for async response
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  const storage = (await chrome.storage.local.get([
    'deviceToken',
    'activeGuideId',
    'backendUrl',
  ])) as StorageData;

  const baseUrl = storage.backendUrl || DEFAULT_BACKEND_URL;

  switch (message.type) {
    case 'ANALYZE':
      return handleAnalyze(message.text, storage, baseUrl);

    case 'LIST_GUIDES':
      return handleListGuides(storage.deviceToken, baseUrl);

    case 'UPLOAD_GUIDE':
      return handleUploadGuide(message.name, message.text, storage.deviceToken, baseUrl);

    case 'DELETE_GUIDE':
      return handleDeleteGuide(message.guideId, baseUrl);

    case 'SET_ACTIVE_GUIDE':
      await chrome.storage.local.set({ activeGuideId: message.guideId });
      return { success: true };

    case 'GET_ACTIVE_GUIDE':
      return { activeGuideId: storage.activeGuideId };

    case 'SET_BACKEND_URL':
      await chrome.storage.local.set({ backendUrl: message.url });
      return { success: true };

    case 'GET_SETTINGS':
      return {
        backendUrl: storage.backendUrl || DEFAULT_BACKEND_URL,
        deviceToken: storage.deviceToken,
        activeGuideId: storage.activeGuideId,
      };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function handleAnalyze(text: string, storage: StorageData, baseUrl: string) {
  if (!storage.activeGuideId) {
    throw new Error('No style guide selected. Open the side panel to choose one.');
  }

  const response = await fetchWithRetry(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      guideId: storage.activeGuideId,
      deviceToken: storage.deviceToken,
    }),
  });

  return response;
}

async function handleListGuides(deviceToken: string, baseUrl: string) {
  const response = await fetchWithRetry(
    `${baseUrl}/api/styleguides?deviceToken=${encodeURIComponent(deviceToken)}`
  );
  return response;
}

async function handleUploadGuide(name: string, text: string, deviceToken: string, baseUrl: string) {
  const response = await fetchWithRetry(`${baseUrl}/api/styleguides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, text, deviceToken }),
  });
  return response;
}

async function handleDeleteGuide(guideId: string, baseUrl: string) {
  const response = await fetchWithRetry(`${baseUrl}/api/styleguides/${guideId}`, {
    method: 'DELETE',
  });
  return response;
}

/**
 * Fetch with exponential backoff retry for network errors.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          (errorBody as any).error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;

      // Only retry on network errors, not HTTP errors
      if (error.message?.includes('HTTP')) throw error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}
