'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function RfpFormSection() {
  const { t, lang } = useLanguage();
  const [selectedServices, setSelectedServices] = useState(['tour', 'hotel', 'guide']);
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (key) => {
    if (selectedServices.includes(key)) {
      setSelectedServices(selectedServices.filter(s => s !== key));
    } else {
      setSelectedServices([...selectedServices, key]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      alert(t('form_success_msg'));
      e.target.reset();
      setSubmitting(false);
    }, 1000);
  };

  return (
    <section id="rfp-section" className="section reveal">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{t('rfp_tag')}</span>
          <h2 className="section-title">{t('rfp_title')}</h2>
          <p className="section-desc">{t('rfp_desc')}</p>
        </div>

        <div className="rfp-card">
          <form id="b2b-rfp-form" onSubmit={handleSubmit}>
            <div className="rfp-grid">
              <div className="form-group">
                <label>{t('form_agency_name')}</label>
                <input type="text" className="form-control" required placeholder="e.g. Viaggi d'Oro S.r.l." />
              </div>
              <div className="form-group">
                <label>{t('form_contact_person')}</label>
                <input type="text" className="form-control" required placeholder="e.g. Marco Rossi" />
              </div>
              <div className="form-group">
                <label>{t('form_email')}</label>
                <input type="email" className="form-control" required placeholder="booking@agency.com" />
              </div>
              <div className="form-group">
                <label>{t('form_country')}</label>
                <input type="text" className="form-control" required placeholder="e.g. Italy / Switzerland / UK" />
              </div>
              <div className="form-group">
                <label>{t('form_pax_count')}</label>
                <input type="text" className="form-control" placeholder="e.g. 2 Adults (FIT) or 25 Pax (GIT)" />
              </div>
              <div className="form-group">
                <label>{t('form_travel_dates')}</label>
                <input type="text" className="form-control" placeholder="e.g. Nov 2026 - Jan 2027" />
              </div>

              <div className="form-group full-width">
                <label>{t('form_services_needed')}</label>
                <div className="checkbox-group">
                  <span
                    className={`custom-checkbox ${selectedServices.includes('tour') ? 'selected' : ''}`}
                    onClick={() => toggleService('tour')}
                  >
                    {t('form_cb_tour')}
                  </span>
                  <span
                    className={`custom-checkbox ${selectedServices.includes('hotel') ? 'selected' : ''}`}
                    onClick={() => toggleService('hotel')}
                  >
                    {t('form_cb_hotel')}
                  </span>
                  <span
                    className={`custom-checkbox ${selectedServices.includes('transfer') ? 'selected' : ''}`}
                    onClick={() => toggleService('transfer')}
                  >
                    {t('form_cb_transfer')}
                  </span>
                  <span
                    className={`custom-checkbox ${selectedServices.includes('excursion') ? 'selected' : ''}`}
                    onClick={() => toggleService('excursion')}
                  >
                    {t('form_cb_excursion')}
                  </span>
                  <span
                    className={`custom-checkbox ${selectedServices.includes('guide') ? 'selected' : ''}`}
                    onClick={() => toggleService('guide')}
                  >
                    {t('form_cb_guide')}
                  </span>
                </div>
              </div>

              <div className="form-group full-width">
                <label>{t('form_message')}</label>
                <textarea
                  id="rfp-notes"
                  className="form-control"
                  rows={4}
                  placeholder="Mention preferred routing, hotel star rating (4* / 5*), special requirements, etc."
                />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? (lang === 'it' ? 'Invio in corso...' : 'Submitting...') : t('form_btn_submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
