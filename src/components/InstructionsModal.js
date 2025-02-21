import React, { useState, useEffect, useCallback, useRef } from 'react';
import './InstructionsModal.css';

const InstructionsModal = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem('hasSeenInstructions');
    if (hasSeenModal) {
      setIsVisible(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenInstructions', 'true');
    }
  }, [dontShowAgain]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isVisible) {
      // Focus the close button when modal opens
      closeButtonRef.current?.focus();
      
      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => e.target.className === 'modal-overlay' && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="modal-content"
        ref={modalRef}
        role="document"
      >
        <h2 id="modal-title">Welcome to Style Guider</h2>
        <div className="modal-body">
          <p>Welcome! Style Guider is a proof of concept project built by <a href="https://markm.ac" target="_blank" rel="noopener noreferrer">Mark Macdonald</a> that explores the integration of Large Language Models (LLMs) with text editing workflows.</p>
          
          <p>Submit your text, and the app will suggest edits to align your writing with <a href="https://cdn.static-economist.com/sites/default/files/store/Style_Guide_2015.pdf" target="_blank" rel="noopener noreferrer">The Economist's Style Guide</a>. Each suggestion can be reviewed and applied individually.</p>

          <p>Please note that this is an early prototype with some known limitations. The app occasionally encounters issues when processing responses from the Anthropic API, and the style suggestions are currently based on the LLM's pre-existing knowledge of The Economist style guide.</p>

          <p>Looking ahead, planned improvements include support for custom style guide uploads, enhanced prompting for more accurate and helpful edit suggestions, and improved reliability and error handling.</p>

          <p>Have feedback or suggestions? Please email <a href="mailto:hello@markm.ac">hello@markm.ac</a></p>
        </div>
        <div className="modal-footer">
          <label className="dont-show-again">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              aria-label="Don't show this message again"
            />
            Don't show again
          </label>
          <button 
            onClick={handleClose}
            ref={closeButtonRef}
            aria-label="Close welcome message"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal; 