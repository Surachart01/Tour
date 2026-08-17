'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { lang, switchLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ['services', 'itineraries', 'planner', 'destinations', 'testimonials', 'why-us'];
      const scrollPos = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 300) {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`luxury-navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container">
          <nav className="luxury-nav-island">
            {/* Brand Monogram & Typography */}
            <a href="#" className="luxury-brand">
              <div className="brand-emblem">
                <svg viewBox="0 0 24 24" className="emblem-svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#goldGradient)" />
                  <defs>
                    <linearGradient id="goldGradient" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FCD34D" />
                      <stop offset="0.5" stopColor="#F59E0B" />
                      <stop offset="1" stopColor="#D97706" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="brand-text-block">
                <span className="brand-title">VERA THAILANDIA</span>
                <span className="brand-subtitle">INBOUND DMC • B2B OPERATOR</span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <ul className="luxury-nav-menu">
              <li>
                <a
                  href="#services"
                  className={`nav-item-link ${activeSection === 'services' ? 'active' : ''}`}
                >
                  {t('nav_services')}
                </a>
              </li>
              <li>
                <a
                  href="#itineraries"
                  className={`nav-item-link ${activeSection === 'itineraries' ? 'active' : ''}`}
                >
                  {t('nav_tours')}
                </a>
              </li>
              <li>
                <a
                  href="#planner"
                  className={`nav-item-link ${activeSection === 'planner' ? 'active' : ''}`}
                >
                  {t('nav_planner')}
                </a>
              </li>
              <li>
                <a
                  href="#destinations"
                  className={`nav-item-link ${activeSection === 'destinations' ? 'active' : ''}`}
                >
                  {t('nav_destinations')}
                </a>
              </li>
              <li>
                <a
                  href="#testimonials"
                  className={`nav-item-link ${activeSection === 'testimonials' ? 'active' : ''}`}
                >
                  {t('nav_testimonials')}
                </a>
              </li>
              <li>
                <a
                  href="#why-us"
                  className={`nav-item-link ${activeSection === 'why-us' ? 'active' : ''}`}
                >
                  {t('nav_why_us')}
                </a>
              </li>
            </ul>

            {/* Right Actions: Language Switcher + Dual B2B Buttons */}
            <div className="luxury-nav-actions">
              {/* Integrated Language Switcher */}
              <div className="nav-lang-pill">
                <button
                  type="button"
                  className={`lang-option ${lang === 'it' ? 'selected' : ''}`}
                  onClick={() => switchLanguage('it')}
                  title="Italiano"
                >
                  <span>🇮🇹</span> IT
                </button>
                <button
                  type="button"
                  className={`lang-option ${lang === 'en' ? 'selected' : ''}`}
                  onClick={() => switchLanguage('en')}
                  title="English"
                >
                  <span>🇬🇧</span> EN
                </button>
              </div>

              {/* Agent Portal Button */}
              <a href="#agent-portal" className="btn-portal-ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <span>{t('btn_agent_portal')}</span>
              </a>

              {/* B2B RFP Action CTA */}
              <a href="#rfp-section" className="btn-gold-action">
                <span>{t('nav_rfp')}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z"/>
                </svg>
              </a>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                className="luxury-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                <span className={`hamburger-bar ${mobileMenuOpen ? 'open-1' : ''}`}></span>
                <span className={`hamburger-bar ${mobileMenuOpen ? 'open-2' : ''}`}></span>
                <span className={`hamburger-bar ${mobileMenuOpen ? 'open-3' : ''}`}></span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Menu */}
      <div className={`luxury-mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="drawer-overlay" onClick={() => setMobileMenuOpen(false)}></div>
        <div className="drawer-panel">
          <div className="drawer-header">
            <div className="brand-text-block">
              <span className="brand-title">VERA THAILANDIA</span>
              <span className="brand-subtitle">INBOUND DMC • B2B</span>
            </div>
            <button className="drawer-close-btn" onClick={() => setMobileMenuOpen(false)}>✕</button>
          </div>

          <div className="drawer-lang-wrap">
            <button
              className={`drawer-lang-btn ${lang === 'it' ? 'active' : ''}`}
              onClick={() => { switchLanguage('it'); setMobileMenuOpen(false); }}
            >
              <span>🇮🇹</span> Italiano
            </button>
            <button
              className={`drawer-lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => { switchLanguage('en'); setMobileMenuOpen(false); }}
            >
              <span>🇬🇧</span> English
            </button>
          </div>

          <ul className="drawer-links">
            <li><a href="#about" onClick={() => setMobileMenuOpen(false)}>{t('nav_about')}</a></li>
            <li><a href="#services" onClick={() => setMobileMenuOpen(false)}>{t('nav_services')}</a></li>
            <li><a href="#itineraries" onClick={() => setMobileMenuOpen(false)}>{t('nav_tours')}</a></li>
            <li><a href="#planner" onClick={() => setMobileMenuOpen(false)}>{t('nav_planner')}</a></li>
            <li><a href="#destinations" onClick={() => setMobileMenuOpen(false)}>{t('nav_destinations')}</a></li>
            <li><a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>{t('nav_testimonials')}</a></li>
            <li><a href="#why-us" onClick={() => setMobileMenuOpen(false)}>{t('nav_why_us')}</a></li>
            <li><a href="#rfp-section" onClick={() => setMobileMenuOpen(false)}>{t('nav_rfp')}</a></li>
          </ul>

          <div className="drawer-actions">
            <a href="#agent-portal" className="btn btn-outline" style={{ width: '100%' }} onClick={() => setMobileMenuOpen(false)}>
              {t('btn_agent_portal')}
            </a>
            <a href="#rfp-section" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setMobileMenuOpen(false)}>
              {t('nav_rfp')}
            </a>
          </div>

          <div className="drawer-footer-info">
            <p>Hotline B2B: +66 2 123 4567</p>
            <p>TAT Tourism License: 11/08924</p>
          </div>
        </div>
      </div>
    </>
  );
}
