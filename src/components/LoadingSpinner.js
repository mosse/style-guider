import React from 'react';

const LoadingSpinner = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '20px'
        }}>
            <div style={{
                width: '60px',
                height: '60px',
                position: 'relative',
                animation: 'spin 3s linear infinite'
            }}>
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '4px solid transparent',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '80%',
                    height: '80%',
                    margin: '10%',
                    border: '4px solid transparent',
                    borderTop: '4px solid #28a745',
                    borderRadius: '50%',
                    animation: 'spinReverse 1.5s linear infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '60%',
                    height: '60%',
                    margin: '20%',
                    border: '4px solid transparent',
                    borderTop: '4px solid #dc3545',
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
                            0%, 100% { opacity: 0.5; }
                            50% { opacity: 1; }
                        }
                    `}
                </style>
            </div>
            <p className="loading-text" style={{
                margin: 0,
                fontSize: '16px',
                color: '#666',
                fontWeight: 500
            }}>
                Analyzing your text with AP style magic... ✨
            </p>
        </div>
    );
};

export default LoadingSpinner; 