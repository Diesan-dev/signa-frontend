// src/components/signRecognition/ParticipantSignsDisplay.jsx

import { useEffect, useState } from 'react';

const ParticipantSignsDisplay = ({ 
  participantSigns = {}, 
  currentUserId 
}) => {
  const [displaySigns, setDisplaySigns] = useState({});

  useEffect(() => {
    // Filtrar señas del usuario actual
    const filtered = Object.entries(participantSigns)
      .filter(([userId]) => userId !== currentUserId)
      .reduce((acc, [userId, data]) => {
        acc[userId] = data;
        return acc;
      }, {});

    setDisplaySigns(filtered);
  }, [participantSigns, currentUserId]);

  if (Object.keys(displaySigns).length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 100,
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto'
    }}>
      {Object.entries(displaySigns).map(([userId, data]) => (
        <div 
          key={userId}
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '12px',
            padding: '12px 16px',
            borderLeft: '4px solid #00ff88',
            animation: 'slideInRight 0.3s ease-out',
            minWidth: '140px'
          }}
        >
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '4px'
          }}>
            {data.userName || `Usuario ${userId.slice(0, 6)}...`}
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#00ff88',
            textAlign: 'center',
            margin: '4px 0'
          }}>
            {data.sign}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#fff',
            opacity: 0.7,
            textAlign: 'center'
          }}>
            {(data.confidence * 100).toFixed(0)}%
            {data.isDummy && ' (Test)'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ParticipantSignsDisplay;