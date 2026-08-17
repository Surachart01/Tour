'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Col 1 */}
          <div className="footer-brand">
            <div className="brand-logo" style={{ marginBottom: '14px' }}>
              <div className="logo-badge">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div className="logo-text">
                <span className="logo-main">Vera Thailandia</span>
                <span className="logo-sub">Co., Ltd.</span>
              </div>
            </div>
            <p className="footer-desc">
              {t('footer_about')}
            </p>
            <div className="tat-license-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              <span>{t('footer_tat_license')}</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="footer-col">
            <h3>{t('footer_quick_links')}</h3>
            <ul className="footer-links">
              <li><a href="#about">{t('nav_about')}</a></li>
              <li><a href="#services">{t('nav_services')}</a></li>
              <li><a href="#itineraries">{t('nav_tours')}</a></li>
              <li><a href="#planner">{t('nav_planner')}</a></li>
              <li><a href="#destinations">{t('nav_destinations')}</a></li>
              <li><a href="#testimonials">{t('nav_testimonials')}</a></li>
              <li><a href="#why-us">{t('nav_why_us')}</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="footer-col">
            <h3>{t('footer_b2b_services')}</h3>
            <ul className="footer-links">
              <li><a href="#services">{t('srv_tour_title')}</a></li>
              <li><a href="#services">{t('srv_hotel_title')}</a></li>
              <li><a href="#services">{t('srv_trans_title')}</a></li>
              <li><a href="#services">{t('srv_exc_title')}</a></li>
              <li><a href="#agent-portal">{t('btn_agent_portal')}</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="footer-col">
            <h3>{t('footer_contact_title')}</h3>
            <ul className="contact-info-list">
              <li>
                <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span>{t('footer_address')}</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span>booking@verathailandia.com</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                <span>+66 (0) 2 123 4567 / +66 (0) 81 234 5678</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('footer_rights')}</p>
          <p>Designed for B2B European Travel Partners</p>
        </div>
      </div>
    </footer>
  );
}
