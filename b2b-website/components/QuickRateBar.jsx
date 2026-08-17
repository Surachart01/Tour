'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function QuickRateBar() {
  const { t, lang } = useLanguage();
  const [serviceType, setServiceType] = useState('Multi-Day Tour Package');
  const [destination, setDestination] = useState('All Thailand Regions');
  const [duration, setDuration] = useState('5 - 8 Days (Classic Itinerary)');

  const handleQuickCheck = () => {
    const rfpSection = document.getElementById('rfp-section');
    if (rfpSection) {
      rfpSection.scrollIntoView({ behavior: 'smooth' });
      const notesField = document.getElementById('rfp-notes');
      if (notesField) {
        const prefix = lang === 'it' ? 'Richiesta rapida:' : 'Quick inquiry:';
        notesField.value = `${prefix} ${serviceType} | Dest: ${destination} | Durata: ${duration}`;
        notesField.focus();
      }
    }
  };

  return (
    <div className="container quick-inquiry-bar">
      <div className="quick-bar-card">
        <div className="quick-bar-grid">
          <div className="form-group">
            <label>{t('qb_type_label')}</label>
            <select
              className="form-control"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="Multi-Day Tour Package">{t('qb_type_opt_pkg')}</option>
              <option value="Custom FIT / Tailor-Made">{t('qb_type_opt_fit')}</option>
              <option value="Group Series / GIT">{t('qb_type_opt_git')}</option>
              <option value="MICE & Corporate Incentive">{t('qb_type_opt_mice')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('qb_dest_label')}</label>
            <select
              className="form-control"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="All Thailand Regions">{t('qb_dest_opt_all')}</option>
              <option value="North (Chiang Mai, Chiang Rai)">{t('qb_dest_opt_north')}</option>
              <option value="South (Phuket, Krabi, Samui)">{t('qb_dest_opt_south')}</option>
              <option value="Central (Bangkok, Ayutthaya)">{t('qb_dest_opt_central')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('qb_duration_label')}</label>
            <select
              className="form-control"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="1 - 4 Days (Excursions/Short)">{t('qb_duration_opt_1')}</option>
              <option value="5 - 8 Days (Classic Itinerary)">{t('qb_duration_opt_2')}</option>
              <option value="9 - 14 Days (Grand Thailand)">{t('qb_duration_opt_3')}</option>
              <option value="15+ Days (Complete In-Depth)">{t('qb_duration_opt_4')}</option>
            </select>
          </div>
          <button
            className="btn btn-primary"
            style={{ height: '44px' }}
            onClick={handleQuickCheck}
          >
            {t('qb_btn_search')}
          </button>
        </div>
      </div>
    </div>
  );
}
