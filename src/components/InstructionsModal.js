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
        data-visible={isVisible}
      >
        <h2 id="modal-title">Welcome to Style Guider</h2>
        <div className="modal-body">
          <p>Style Guider is a proof of concept project that uses AI to copyedit writing based on <a href="https://cdn.static-economist.com/sites/default/files/store/Style_Guide_2015.pdf" target="_blank" rel="noopener noreferrer">The Economist's Style Guide</a>. Built by <a href="https://markm.ac" target="_blank" rel="noopener noreferrer">Mark Macdonald</a>, it explores how AI can enhance editing workflows.</p>
          
          <p>Paste your text and receive style suggestions that you can review and apply individually. Tap or hover over each suggestion to see an explanation of the recommended changes.</p>

          <p>As an early prototype, you may encounter occasional weirdness. The app uses Claude's understanding of The Economist's style guide and is perfectly capable of pumping out slop. LLMs... need I say more?</p>

          <p>Future improvements may include custom style guide support and enhanced suggestion accuracy. Questions or feedback? <a href="mailto:hello@markm.ac">Get in touch</a>. I'd love to hear from you.</p>
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