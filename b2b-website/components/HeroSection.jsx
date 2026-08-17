'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="hero-section">
      <div className="hero-bg-layer"></div>
      <div className="hero-overlay"></div>
      <div className="container">
        <div className="hero-content">
          <div className="hero-badges-row animate-fade-up">
            <div className="hero-badge">
              <span className="pulsating-dot"></span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>{t('hero_badge')}</span>
            </div>
            <div className="hero-rating-badge">
              <span>{t('hero_rating')}</span>
            </div>
          </div>

          <h1 className="hero-title animate-fade-up delay-100">
            <span>{t('hero_title_prefix')}</span><br />
            <span className="gold-gradient-text">{t('hero_title_highlight')}</span><br />
            <span>{t('hero_title_suffix')}</span>
          </h1>

          <p className="hero-description animate-fade-up delay-200">
            {t('hero_desc')}
          </p>

          <div className="hero-actions animate-fade-up delay-300">
            <a href="#services" className="btn btn-primary btn-lg">{t('hero_btn_explore')}</a>
            <a href="#rfp-section" className="btn btn-white btn-lg">{t('hero_btn_quote')}</a>
          </div>

          <div className="hero-quick-routes animate-fade-up delay-300">
            <span className="quick-routes-label">{t('hero_quick_routes_label')}</span>
            <a href="#itineraries" className="route-chip">Bangkok & Ayutthaya</a>
            <a href="#itineraries" className="route-chip">Chiang Mai & Golden Triangle</a>
            <a href="#itineraries" className="route-chip">Phuket & Andaman Coast</a>
            <a href="#itineraries" className="route-chip">Koh Samui Archipelago</a>
          </div>
          
          <div className="hero-stats animate-fade-up delay-400">
            <div className="stat-item">
              <h2>{t('stat_years_num')}</h2>
              <p>{t('stat_years_label')}</p>
            </div>
            <div className="stat-item">
              <h2>{t('stat_travelers_num')}</h2>
              <p>{t('stat_travelers_label')}</p>
            </div>
            <div className="stat-item">
              <h2>{t('stat_support_num')}</h2>
              <p>{t('stat_support_label')}</p>
            </div>
            <div className="stat-item">
              <h2>{t('stat_licensed_num')}</h2>
              <p>{t('stat_licensed_label')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
