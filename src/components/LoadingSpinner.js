import React from 'react';

const LoadingSpinner = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                position: 'relative',
                animation: 'spin 3s linear infinite'
            }}>
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '3px solid transparent',
                    borderTop: '3px solid rgba(0, 123, 255, 0.8)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '80%',
                    height: '80%',
                    margin: '10%',
                    border: '3px solid transparent',
                    borderTop: '3px solid rgba(40, 167, 69, 0.8)',
                    borderRadius: '50%',
                    animation: 'spinReverse 1.5s linear infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '60%',
                    height: '60%',
                    margin: '20%',
                    border: '3px solid transparent',
                    borderTop: '3px solid rgba(220, 53, 69, 0.8)',
                    borderRadius: '50%',
                    animation: 'spin 2s linear infinite'
                }} />
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        @keyframes spinReverse {
                            0% { transform: rotate(360deg); }
                            100% { transform: rotate(0deg); }
                        }
                        .loading-text {
                            animation: pulse 1.5s ease-in-out infinite;
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 0.6; }
                            50% { opacity: 0.9; }
                        }
                    `}
                </style>
            </div>
            <p className="loading-text" style={{
                margin: 0,
                fontSize: '14px',
                color: 'rgba(0, 0, 0, 0.6)',
                fontWeight: 500
            }}>
                Analyzing your text with AP style magic... ✨
            </p>
        </div>
    );
};

export default LoadingSpinner; 