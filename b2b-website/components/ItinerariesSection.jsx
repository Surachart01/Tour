'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function ItinerariesSection() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');

  const tourData = [
    {
      id: 1,
      category: 'culture',
      tag: t('tour1_tag'),
      duration: t('tour1_dur'),
      route: t('tour1_route'),
      title: t('tour1_title'),
      desc: t('tour1_desc'),
      highlights: [t('tour1_h1'), t('tour1_h2'), t('tour1_h3')],
      img: 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: 2,
      category: 'islands',
      tag: t('tour2_tag'),
      duration: t('tour2_dur'),
      route: t('tour2_route'),
      title: t('tour2_title'),
      desc: t('tour2_desc'),
      highlights: [t('tour2_h1'), t('tour2_h2'), t('tour2_h3')],
      img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: 3,
      category: 'nature',
      tag: t('tour3_tag'),
      duration: t('tour3_dur'),
      route: t('tour3_route'),
      title: t('tour3_title'),
      desc: t('tour3_desc'),
      highlights: [t('tour3_h1'), t('tour3_h2'), t('tour3_h3')],
      img: 'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: 4,
      category: 'culture',
      tag: t('tour4_tag'),
      duration: t('tour4_dur'),
      route: t('tour4_route'),
      title: t('tour4_title'),
      desc: t('tour4_desc'),
      highlights: [t('tour4_h1'), t('tour4_h2'), t('tour4_h3')],
      img: 'https://images.unsplash.com/photo-1512553353614-82a7370096dc?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: 5,
      category: 'islands',
      tag: t('tour5_tag'),
      duration: t('tour5_dur'),
      route: t('tour5_route'),
      title: t('tour5_title'),
      desc: t('tour5_desc'),
      highlights: [t('tour5_h1'), t('tour5_h2'), t('tour5_h3')],
      img: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?q=80&w=1000&auto=format&fit=crop',
    },
  ];

  const filteredTours = activeTab === 'all'
    ? tourData
    : tourData.filter((item) => item.category === activeTab);

  return (
    <section id="itineraries" className="section reveal" style={{ backgroundColor: 'var(--bg-subtle)' }}>
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{t('tours_tag')}</span>
          <h2 className="section-title">{t('tours_title')}</h2>
          <p className="section-desc">{t('tours_desc')}</p>

          {/* Interactive Category Filter Tabs */}
          <div className="tour-tabs-container">
            <button
              className={`tour-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              {t('tour_tab_all')}
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'culture' ? 'active' : ''}`}
              onClick={() => setActiveTab('culture')}
            >
              {t('tour_tab_culture')}
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'islands' ? 'active' : ''}`}
              onClick={() => setActiveTab('islands')}
            >
              {t('tour_tab_islands')}
            </button>
            <button
              className={`tour-tab-btn ${activeTab === 'nature' ? 'active' : ''}`}
              onClick={() => setActiveTab('nature')}
            >
              {t('tour_tab_nature')}
            </button>
          </div>
        </div>

        <div className="tours-grid">
          {filteredTours.map((tour) => (
            <div key={tour.id} className="tour-card animate-fade-in">
              <div className="tour-image-wrap">
                <img
                  className="tour-image"
                  src={tour.img}
                  alt={tour.title}
                />
                <span className="tour-tag">{tour.tag}</span>
                <span className="tour-duration">{tour.duration}</span>
              </div>
              <div className="tour-body">
                <div className="tour-route">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <span>{tour.route}</span>
                </div>
                <h3 className="tour-title">{tour.title}</h3>
                <p className="tour-desc">{tour.desc}</p>
                <div className="tour-highlights">
                  {tour.highlights.map((h, idx) => (
                    <span key={idx} className="highlight-pill">{h}</span>
                  ))}
                </div>
                <div className="tour-footer">
                  <span className="b2b-rate-note">{t('b2b_confidential_rate')}</span>
                  <a href="#rfp-section" className="btn btn-outline btn-sm">{t('btn_view_itinerary')}</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
