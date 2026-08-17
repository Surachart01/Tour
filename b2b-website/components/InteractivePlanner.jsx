'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function InteractivePlanner() {
  const { t, lang } = useLanguage();
  const [days, setDays] = useState(8);
  const [pax, setPax] = useState(2);
  const [hotelCat, setHotelCat] = useState('4star');

  const handleApplyConfig = () => {
    const rfpSection = document.getElementById('rfp-section');
    if (rfpSection) {
      rfpSection.scrollIntoView({ behavior: 'smooth' });
      const notesField = document.getElementById('rfp-notes');
      if (notesField) {
        const catName = hotelCat === '4star' ? '4★ Boutique/Superior' : '5★ Luxury Beach Resort';
        const prefix = lang === 'it' ? 'Configurazione B2B Planner:' : 'B2B Planner Configuration:';
        notesField.value = `${prefix} ${days} ${t('planner_duration_days')} | ${pax} ${t('planner_pax_label')} | Hotel: ${catName}`;
        notesField.focus();
      }
    }
  };

  return (
    <section id="planner" className="section reveal" style={{ backgroundColor: '#ffffff' }}>
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{t('planner_tag')}</span>
          <h2 className="section-title">{t('planner_title')}</h2>
          <p className="section-desc">{t('planner_desc')}</p>
        </div>

        <div className="planner-card">
          <div className="planner-grid">
            {/* Controls */}
            <div className="planner-controls">
              <div className="planner-control-group">
                <div className="control-header">
                  <label>{t('planner_duration')}</label>
                  <span className="control-value-badge">{days} {t('planner_duration_days')}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="21"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="range-slider"
                />
                <div className="range-labels">
                  <span>3 {t('planner_duration_days')}</span>
                  <span>10 {t('planner_duration_days')}</span>
                  <span>21 {t('planner_duration_days')}</span>
                </div>
              </div>

              <div className="planner-control-group">
                <div className="control-header">
                  <label>{t('planner_pax')}</label>
                  <span className="control-value-badge">{pax} {t('planner_pax_label')}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={pax}
                  onChange={(e) => setPax(Number(e.target.value))}
                  className="range-slider"
                />
                <div className="range-labels">
                  <span>FIT (1-2 Pax)</span>
                  <span>Small Group (8-15)</span>
                  <span>Series Group (40)</span>
                </div>
              </div>

              <div className="planner-control-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.86rem' }}>
                  {t('planner_category')}
                </label>
                <div className="hotel-cat-toggle">
                  <button
                    type="button"
                    className={`cat-btn ${hotelCat === '4star' ? 'active' : ''}`}
                    onClick={() => setHotelCat('4star')}
                  >
                    {t('planner_cat_4star')}
                  </button>
                  <button
                    type="button"
                    className={`cat-btn ${hotelCat === '5star' ? 'active' : ''}`}
                    onClick={() => setHotelCat('5star')}
                  >
                    {t('planner_cat_5star')}
                  </button>
                </div>
              </div>
            </div>

            {/* Inclusions summary preview */}
            <div className="planner-summary">
              <div className="summary-badge">
                <span>{pax <= 4 ? 'FIT Tailor-Made' : 'GIT Series Allocation'}</span>
              </div>
              <h3 className="summary-title">{t('planner_includes_title')}</h3>
              
              <ul className="planner-inclusion-list">
                <li>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{t('planner_inc_1')}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{days - 1} Nights ({hotelCat === '4star' ? '4★ Superior' : '5★ Luxury'}) — {t('planner_inc_2')}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{t('planner_inc_3')}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{t('planner_inc_4')}</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>{t('planner_inc_5')}</span>
                </li>
              </ul>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={handleApplyConfig}
              >
                {t('planner_cta_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
