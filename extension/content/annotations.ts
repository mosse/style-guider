/**
 * Annotation Renderer
 *
 * Renders inline style guide annotations on the page using Shadow DOM
 * to prevent CSS conflicts with the host page.
 */

import type { Segment, Change } from '../../lib/parser/types.js';
import { isChange } from '../../lib/parser/types.js';

let annotationHost: HTMLElement | null = null;
let annotationOverlay: HTMLElement | null = null;

const ANNOTATION_STYLES = `
  .sg-annotation-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2147483646;
    max-height: 40vh;
    overflow-y: auto;
    background: white;
    border-top: 2px solid #1a8917;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 16px;
    line-height: 1.6;
    color: #333;
    padding: 20px 24px;
    animation: sg-slideUp 0.3s ease;
  }

  @keyframes sg-slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .sg-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .sg-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #1a8917;
  }

  .sg-close-btn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  }

  .sg-close-btn:hover {
    background: #f5f5f5;
  }

  .sg-text-content {
    max-width: 728px;
    margin: 0 auto;
  }

  .sg-change {
    display: inline;
    position: relative;
    cursor: pointer;
  }

  .sg-original {
    text-decoration: line-through;
    color: rgba(0,0,0,0.4);
  }

  .sg-replacement {
    color: #1a8917;
    font-weight: 500;
  }

  .sg-change-actions {
    display: inline-flex;
    gap: 2px;
    margin: 0 2px;
    vertical-align: middle;
  }

  .sg-accept-btn, .sg-reject-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    padding: 0;
  }

  .sg-accept-btn:hover { background: #e8f5e9; border-color: #1a8917; }
  .sg-reject-btn:hover { background: #ffebee; border-color: #d32f2f; }

  .sg-accepted .sg-original { display: none; }
  .sg-accepted .sg-replacement { color: inherit; font-weight: inherit; }
  .sg-accepted .sg-change-actions { display: none; }

  .sg-rejected .sg-replacement { display: none; }
  .sg-rejected .sg-original { text-decoration: none; color: inherit; }
  .sg-rejected .sg-change-actions { display: none; }

  .sg-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 10px 14px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    max-width: 350px;
    width: max-content;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
  }

  .sg-tooltip.visible { display: block; }

  .sg-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #333;
  }

  .sg-reason {
    margin-bottom: 8px;
  }

  .sg-citation {
    border-left: 3px solid #1a8917;
    padding-left: 10px;
    margin-top: 6px;
    font-style: italic;
    font-size: 12px;
    color: #ccc;
  }

  .sg-citation-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #999;
    font-style: normal;
    margin-bottom: 4px;
  }

  .sg-stats {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    color: #999;
    text-align: center;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }
`;

/**
 * Renders the analysis results as an annotation panel at the bottom of the page.
 */
export function renderAnnotations(segments: Segment[], originalText: string): void {
  // Remove any existing annotations first
  removeAnnotations();

  // Create host element with Shadow DOM
  annotationHost = document.createElement('div');
  annotationHost.id = 'style-guider-annotations';

  const shadow = annotationHost.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = ANNOTATION_STYLES;
  shadow.appendChild(style);

  // Create panel
  const panel = document.createElement('div');
  panel.className = 'sg-annotation-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'sg-panel-header';

  const title = document.createElement('div');
  title.className = 'sg-panel-title';
  const changeCount = segments.filter(isChange).length;
  title.textContent = `Style Guider — ${changeCount} suggestion${changeCount !== 1 ? 's' : ''}`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'sg-close-btn';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', removeAnnotations);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'sg-text-content';

  for (const segment of segments) {
    if (typeof segment === 'string') {
      const textNode = document.createElement('span');
      textNode.textContent = segment;
      content.appendChild(textNode);
    } else if (isChange(segment)) {
      content.appendChild(createChangeElement(segment));
    }
  }

  panel.appendChild(content);
  shadow.appendChild(panel);
  document.body.appendChild(annotationHost);
}

/**
 * Creates a change annotation element with accept/reject buttons and tooltip.
 */
function createChangeElement(change: Change): HTMLElement {
  const container = document.createElement('span');
  container.className = 'sg-change';

  // Original text (strikethrough)
  const original = document.createElement('span');
  original.className = 'sg-original';
  original.textContent = change.original;

  // Replacement text (green)
  const replacement = document.createElement('span');
  replacement.className = 'sg-replacement';
  replacement.textContent = change.replacement;

  // Accept/reject buttons
  const actions = document.createElement('span');
  actions.className = 'sg-change-actions';

  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'sg-accept-btn';
  acceptBtn.textContent = '\u2713';
  acceptBtn.title = 'Accept';
  acceptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.add('sg-accepted');
    container.classList.remove('sg-rejected');
  });

  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'sg-reject-btn';
  rejectBtn.textContent = '\u2717';
  rejectBtn.title = 'Reject';
  rejectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.add('sg-rejected');
    container.classList.remove('sg-accepted');
  });

  actions.appendChild(acceptBtn);
  actions.appendChild(rejectBtn);

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'sg-tooltip';

  const reason = document.createElement('div');
  reason.className = 'sg-reason';
  reason.textContent = change.reason;
  tooltip.appendChild(reason);

  if (change.citation) {
    const citationBlock = document.createElement('div');
    citationBlock.className = 'sg-citation';

    const label = document.createElement('div');
    label.className = 'sg-citation-label';
    label.textContent = 'From the style guide:';

    const citationText = document.createElement('div');
    citationText.textContent = change.citation;

    citationBlock.appendChild(label);
    citationBlock.appendChild(citationText);
    tooltip.appendChild(citationBlock);
  }

  // Show/hide tooltip on hover
  container.addEventListener('mouseenter', () => tooltip.classList.add('visible'));
  container.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));

  container.appendChild(original);
  container.appendChild(replacement);
  container.appendChild(actions);
  container.appendChild(tooltip);

  return container;
}

/**
 * Removes all annotations from the page.
 */
export function removeAnnotations(): void {
  annotationHost?.remove();
  annotationHost = null;
}
