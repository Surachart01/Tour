'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function WhyUsSection() {
  const { t } = useLanguage();

  return (
    <section id="why-us" className="section section-dark reveal">
      <div className="container">
        <div className="why-us-wrap">
          <div className="why-us-content">
            <span className="section-tag">{t('why_tag')}</span>
            <h2 className="section-title">{t('why_title')}</h2>
            <p className="section-desc">{t('why_desc')}</p>

            <div className="features-list">
              <div className="feature-box">
                <div className="feature-box-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <div>
                  <h3>{t('why_f1_title')}</h3>
                  <p>{t('why_f1_desc')}</p>
                </div>
              </div>

              <div className="feature-box">
                <div className="feature-box-icon">
                  <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                </div>
                <div>
                  <h3>{t('why_f2_title')}</h3>
                  <p>{t('why_f2_desc')}</p>
                </div>
              </div>

              <div className="feature-box">
                <div className="feature-box-icon">
                  <svg viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
                </div>
                <div>
                  <h3>{t('why_f3_title')}</h3>
                  <p>{t('why_f3_desc')}</p>
                </div>
              </div>

              <div className="feature-box">
                <div className="feature-box-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                </div>
                <div>
                  <h3>{t('why_f4_title')}</h3>
                  <p>{t('why_f4_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="why-us-card-showcase">
            <img
              className="showcase-main-img"
              src="https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1000&auto=format&fit=crop"
              alt="Vera Thailandia Quality"
            />
            <div className="floating-b2b-badge">
              <div className="floating-badge-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div className="floating-badge-text">
                <h4>{t('badge_quote_b2b')}</h4>
                <p>{t('badge_quote_sub')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
