'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function DestinationsSection() {
  const { t } = useLanguage();

  return (
    <section id="destinations" className="section reveal">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{t('dest_tag')}</span>
          <h2 className="section-title">{t('dest_title')}</h2>
          <p className="section-desc">{t('dest_desc')}</p>
        </div>

        <div className="destinations-grid">
          {/* Bangkok */}
          <div className="dest-card large">
            <img
              className="dest-bg"
              src="https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop"
              alt="Bangkok"
            />
            <div className="dest-overlay">
              <h3 className="dest-title">{t('dest_bkk_title')}</h3>
              <p className="dest-subtitle">{t('dest_bkk_sub')}</p>
              <p className="dest-desc">{t('dest_bkk_desc')}</p>
            </div>
          </div>

          {/* Chiang Mai */}
          <div className="dest-card large">
            <img
              className="dest-bg"
              src="https://images.unsplash.com/photo-1512553353614-82a7370096dc?q=80&w=1200&auto=format&fit=crop"
              alt="Chiang Mai"
            />
            <div className="dest-overlay">
              <h3 className="dest-title">{t('dest_cm_title')}</h3>
              <p className="dest-subtitle">{t('dest_cm_sub')}</p>
              <p className="dest-desc">{t('dest_cm_desc')}</p>
            </div>
          </div>

          {/* Phuket */}
          <div className="dest-card small">
            <img
              className="dest-bg"
              src="https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=800&auto=format&fit=crop"
              alt="Phuket"
            />
            <div className="dest-overlay">
              <h3 className="dest-title">{t('dest_pkt_title')}</h3>
              <p className="dest-subtitle">{t('dest_pkt_sub')}</p>
              <p className="dest-desc">{t('dest_pkt_desc')}</p>
            </div>
          </div>

          {/* Koh Samui */}
          <div className="dest-card small">
            <img
              className="dest-bg"
              src="https://images.unsplash.com/photo-1537956965359-7573183d1f57?q=80&w=800&auto=format&fit=crop"
              alt="Koh Samui"
            />
            <div className="dest-overlay">
              <h3 className="dest-title">{t('dest_smu_title')}</h3>
              <p className="dest-subtitle">{t('dest_smu_sub')}</p>
              <p className="dest-desc">{t('dest_smu_desc')}</p>
            </div>
          </div>

          {/* Kanchanaburi */}
          <div className="dest-card small">
            <img
              className="dest-bg"
              src="https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=800&auto=format&fit=crop"
              alt="Kanchanaburi"
            />
            <div className="dest-overlay">
              <h3 className="dest-title">{t('dest_kan_title')}</h3>
              <p className="dest-subtitle">{t('dest_kan_sub')}</p>
              <p className="dest-desc">{t('dest_kan_desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
