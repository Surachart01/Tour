'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function FloatingContact() {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const whatsappMessage = encodeURIComponent(
    lang === 'it'
      ? 'Buongiorno Vera Thailandia, desidero richiedere informazioni sulle tariffe B2B per la mia agenzia di viaggi.'
      : 'Hello Vera Thailandia, I would like to request B2B incoming tariff information for my travel agency.'
  );

  return (
    <div className="floating-concierge">
      {expanded && (
        <div className="concierge-popup animate-fade-up">
          <div className="popup-header">
            <div className="popup-avatar">
              <span>🇹🇭</span>
            </div>
            <div>
              <h4>{t('float_b2b_desk')}</h4>
              <p>Online 24/7 • WhatsApp Direct</p>
            </div>
            <button className="popup-close-btn" onClick={() => setExpanded(false)}>✕</button>
          </div>
          <div className="popup-body">
            <p>
              {lang === 'it'
                ? 'Hai una richiesta urgente per un gruppo o un cliente VIP? Parla subito con il nostro desk in italiano.'
                : 'Need immediate rates for a group series or VIP FIT client? Connect directly with our on-ground team.'}
            </p>
            <a
              href={`https://wa.me/66812345678?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
              </svg>
              <span>{t('float_chat_whatsapp')}</span>
            </a>
          </div>
        </div>
      )}

      <button
        className="floating-concierge-btn"
        onClick={() => setExpanded(!expanded)}
        aria-label="B2B Concierge WhatsApp"
      >
        <span className="concierge-pulse"></span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.15c-.24.68-1.4 1.28-1.92 1.35-.49.07-1.12.1-3.26-.78-2.73-1.13-4.48-3.9-4.61-4.08-.14-.18-1.1-1.46-1.1-2.78 0-1.32.69-1.97.94-2.24.24-.26.54-.33.72-.33.18 0 .36 0 .52.01.17.01.39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.31.02.49-.09.18-.14.29-.28.45-.14.16-.29.35-.41.47-.13.13-.27.27-.12.52.16.26.69 1.13 1.48 1.83 1.02.9 1.87 1.18 2.14 1.31.26.13.42.11.57-.07.16-.18.66-.77.84-1.03.18-.26.36-.22.61-.13.25.09 1.58.74 1.85.88.27.14.45.2.52.31.06.12.06.68-.18 1.36z"/>
        </svg>
        <span className="concierge-btn-text">{t('float_b2b_desk')}</span>
      </button>
    </div>
  );
}
