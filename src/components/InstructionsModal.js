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

  const handleClose = () => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenInstructions', 'true');
    }
  };

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
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
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