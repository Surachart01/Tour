'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function TestimonialsSection() {
  const { t } = useLanguage();

  const testimonials = [
    {
      quote: t('testi_1_quote'),
      author: t('testi_1_author'),
      role: t('testi_1_role'),
      agency: t('testi_1_agency'),
      rating: '★★★★★',
    },
    {
      quote: t('testi_2_quote'),
      author: t('testi_2_author'),
      role: t('testi_2_role'),
      agency: t('testi_2_agency'),
      rating: '★★★★★',
    },
    {
      quote: t('testi_3_quote'),
      author: t('testi_3_author'),
      role: t('testi_3_role'),
      agency: t('testi_3_agency'),
      rating: '★★★★★',
    },
  ];

  return (
    <section id="testimonials" className="section reveal" style={{ backgroundColor: 'var(--bg-subtle)' }}>
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{t('testi_tag')}</span>
          <h2 className="section-title">{t('testi_title')}</h2>
          <p className="section-desc">{t('testi_desc')}</p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((item, idx) => (
            <div key={idx} className="testimonial-card">
              <div className="testimonial-stars">{item.rating}</div>
              <p className="testimonial-quote">{item.quote}</p>
              <div className="testimonial-author-wrap">
                <div className="author-avatar">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <h4 className="author-name">{item.author}</h4>
                  <p className="author-role">{item.role}</p>
                  <p className="author-agency">{item.agency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
