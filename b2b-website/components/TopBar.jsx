'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function TopBar() {
  const { lang, switchLanguage, t } = useLanguage();
  const [times, setTimes] = useState({ bkk: '', rome: '' });

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      const bkkTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now);
      const romeTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now);
      setTimes({ bkk: bkkTime, rome: romeTime });
    };
    updateClocks();
    const interval = setInterval(updateClocks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="top-bar-luxury">
      <div className="container">
        <div className="top-bar-content">
          <div className="top-bar-info-group">
            <span className="top-info-pill">
              <span className="live-status-dot"></span>
              <span>{lang === 'it' ? 'Desk Operativo Bangkok & Phuket Attivo' : 'Bangkok & Phuket Operations Active'}</span>
            </span>
            <span className="top-info-divider">•</span>
            <span className="top-clock-item">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span>Rome: {times.rome || '06:00'} | Bangkok: {times.bkk || '11:00'}</span>
            </span>
          </div>

          <div className="top-bar-contact-group">
            <a href="tel:+6621234567" className="top-hotline-link">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              <span>B2B Direct: +66 2 123 4567</span>
            </a>
            <span className="top-tat-badge">
              <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              <span>TAT 11/08924</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
