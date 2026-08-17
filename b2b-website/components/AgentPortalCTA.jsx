'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function AgentPortalCTA() {
  const { t } = useLanguage();

  return (
    <section id="agent-portal" className="agent-portal-section reveal">
      <div className="container">
        <div className="agent-portal-box">
          <div className="portal-text">
            <h2>{t('portal_title')}</h2>
            <p>{t('portal_desc')}</p>
          </div>
          <div className="portal-buttons">
            <a href="/portal/login" className="btn btn-primary btn-lg">{t('btn_portal_login')}</a>
            <a href="#rfp-section" className="btn btn-white btn-lg">{t('btn_portal_register')}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
