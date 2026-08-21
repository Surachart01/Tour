'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Building2, CalendarDays, Check, ChevronDown,
  CircleUserRound, Compass, Headphones, Hotel, Languages,
  LockKeyhole, Mail, Map, MapPin, Menu, Plane, Route, Send,
  Sparkles, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PORTAL_URL = 'https://tour-production-d15f.up.railway.app/production/login.html';

const content = {
  en: {
    nav: ['Services', 'Journeys', 'Destinations', 'Why Vera'],
    proposal: 'Request a proposal', portal: 'Agent portal', desk: 'Bangkok operations desk',
    heroTitle: 'Thailand DMC for travel professionals',
    heroBody: 'One local team for accommodation, touring, transport and guest support across Thailand. Built for agencies that need precise delivery and clear communication.',
    heroPrimary: 'Build a Thailand request', heroSecondary: 'Explore sample journeys',
    fieldTitle: 'Your ground operation, connected.',
    fieldBody: 'From the first airport pickup to the final island transfer, every service is coordinated as one journey and managed by one local team.',
    servicesTitle: 'Everything your Thailand program needs',
    servicesBody: 'Contracting, routing and guest operations are handled together, so your team has fewer handovers and a clearer view of every booking.',
    journeysTitle: 'Routes made for real itineraries',
    journeysBody: 'Use these proven route structures as a starting point. Every program can be adjusted for pace, hotel category, group size and season.',
    plannerTitle: 'Shape an operational brief in under a minute',
    plannerBody: 'Choose the program shape and send our team a cleaner starting point for quotation.',
    plannerCta: 'Use this brief in my request',
    destinationsTitle: 'One team, nationwide coverage',
    destinationsBody: 'City stays, cultural circuits and island programs can be connected without splitting your operation across multiple partners.',
    whyTitle: 'A DMC your operations team can work with',
    whyBody: 'The service is designed around the practical details that protect your client experience and your agency relationship.',
    portalTitle: 'Already working with us?',
    portalBody: 'Open the agent portal to create quotations, manage bookings and access your travel documents.',
    rfpTitle: 'Tell us what you are planning',
    rfpBody: 'Share the essentials. Our operations team will review the routing, service mix and timing with you.',
    formSend: 'Prepare email request', footerLine: 'Inbound operations for travel professionals in Thailand.',
  },
  it: {
    nav: ['Servizi', 'Itinerari', 'Destinazioni', 'Perché Vera'],
    proposal: 'Richiedi una proposta', portal: 'Portale agenti', desk: 'Desk operativo Bangkok',
    heroTitle: 'DMC in Thailandia per professionisti del turismo',
    heroBody: 'Un unico team locale per hotel, tour, trasferimenti e assistenza agli ospiti in tutta la Thailandia. Per agenzie che richiedono precisione e comunicazione chiara.',
    heroPrimary: 'Crea una richiesta Thailandia', heroSecondary: 'Scopri gli itinerari',
    fieldTitle: 'La tua operazione locale, coordinata.',
    fieldBody: 'Dal primo transfer aeroportuale all’ultimo collegamento con le isole, ogni servizio viene gestito come un unico viaggio da un solo team locale.',
    servicesTitle: 'Tutto ciò che serve al tuo programma Thailandia',
    servicesBody: 'Contratti, itinerari e assistenza vengono gestiti insieme, con meno passaggi e una visione più chiara di ogni prenotazione.',
    journeysTitle: 'Percorsi pensati per itinerari reali',
    journeysBody: 'Usa queste rotte collaudate come punto di partenza. Ogni programma può essere adattato per ritmo, categoria hotel, gruppo e stagione.',
    plannerTitle: 'Crea un brief operativo in meno di un minuto',
    plannerBody: 'Definisci il programma e invia al nostro team una base più chiara per la quotazione.',
    plannerCta: 'Usa questo brief nella richiesta',
    destinationsTitle: 'Un solo team, copertura nazionale',
    destinationsBody: 'Soggiorni in città, circuiti culturali e programmi mare collegati senza dividere l’operazione tra più partner.',
    whyTitle: 'Un DMC con cui il tuo team può lavorare bene',
    whyBody: 'Il servizio è costruito intorno ai dettagli pratici che proteggono l’esperienza del cliente e il rapporto con l’agenzia.',
    portalTitle: 'Collabori già con noi?',
    portalBody: 'Accedi al portale agenti per creare preventivi, gestire prenotazioni e consultare i documenti di viaggio.',
    rfpTitle: 'Raccontaci cosa stai pianificando',
    rfpBody: 'Condividi le informazioni essenziali. Il nostro team verificherà itinerario, servizi e tempistiche con te.',
    formSend: 'Prepara la richiesta email', footerLine: 'Operazioni incoming per professionisti del turismo in Thailandia.',
  },
};

const services = [
  { icon: Route, title: 'Tailor-made journeys', copy: 'FIT, groups and series programs shaped around pace, market and season.' },
  { icon: Hotel, title: 'Hotel contracting', copy: 'Accommodation planning from Bangkok city stays to island resorts.' },
  { icon: Plane, title: 'Transport & arrivals', copy: 'Airport assistance, private transfers, coaches, boats and domestic connections.' },
  { icon: Compass, title: 'Guides & experiences', copy: 'Local guides, cultural visits, nature programs and private excursions.' },
];

const journeys = [
  { title: 'Heritage route to the North', route: 'Bangkok · Ayutthaya · Sukhothai · Chiang Mai', duration: '8 days / 7 nights', image: 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?q=85&w=1600&auto=format&fit=crop' },
  { title: 'Andaman island circuit', route: 'Phuket · Phang Nga · Phi Phi · Krabi', duration: '7 days / 6 nights', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=85&w=1400&auto=format&fit=crop' },
  { title: 'Bangkok to the River Kwai', route: 'Bangkok · Kanchanaburi · Erawan', duration: '5 days / 4 nights', image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=85&w=1400&auto=format&fit=crop' },
];

const destinations = [
  ['Bangkok & Central', 'Gateway, city programs and heritage', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=85&w=1000&auto=format&fit=crop'],
  ['Chiang Mai & North', 'Culture, mountains and soft adventure', 'https://images.unsplash.com/photo-1512553353614-82a7370096dc?q=85&w=1000&auto=format&fit=crop'],
  ['Phuket & Andaman', 'Resorts, islands and marine transfers', 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=85&w=1000&auto=format&fit=crop'],
  ['Samui & Gulf', 'Beach programs and island combinations', 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?q=85&w=1000&auto=format&fit=crop'],
];

function Brand({ compact = false }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`}><img src="/brand/vera-thailandia-logo.png" alt="Vera Thailandia" />{!compact && <span><strong>Vera Thailandia</strong><small>Inbound DMC · Thailand</small></span>}</span>;
}

export default function B2BHome() {
  const { lang, switchLanguage } = useLanguage();
  const c = content[lang] || content.en;
  const [menuOpen, setMenuOpen] = useState(false);
  const [program, setProgram] = useState('Tailor-made FIT');
  const [region, setRegion] = useState('Multi-region Thailand');
  const [duration, setDuration] = useState('8–10 days');
  const [party, setParty] = useState('2–6 guests');
  const brief = useMemo(() => `${program} · ${region} · ${duration} · ${party}`, [program, region, duration, party]);

  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return undefined;

    root.classList.add('motion-ready');
    const targets = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      root.classList.remove('motion-ready');
    };
  }, []);

  const useBrief = () => {
    const notes = document.getElementById('request-notes');
    if (notes) notes.value = `Program brief: ${brief}`;
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitRequest = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`B2B Thailand request — ${form.get('agency') || 'Travel agency'}`);
    const body = encodeURIComponent([`Agency: ${form.get('agency') || '-'}`, `Contact: ${form.get('contact') || '-'}`, `Email: ${form.get('email') || '-'}`, `Travel period: ${form.get('period') || '-'}`, `Guests: ${form.get('guests') || '-'}`, '', form.get('notes') || '-'].join('\n'));
    window.location.href = `mailto:reservation@verathailandia.com?subject=${subject}&body=${body}`;
  };

  return (
    <main className="site-shell">
      <div className="scroll-progress" aria-hidden="true" />
      <div className="ops-line"><span><span className="status-dot" /> {c.desk}</span><a href="mailto:reservation@verathailandia.com">reservation@verathailandia.com</a></div>
      <header className="site-header">
        <a href="#top" aria-label="Vera Thailandia home"><Brand /></a>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Primary navigation">
          {['services', 'journeys', 'destinations', 'why-vera'].map((id, index) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{c.nav[index]}</a>)}
        </nav>
        <div className="header-actions">
          <div className="language-control" aria-label="Language"><button className={lang === 'en' ? 'active' : ''} onClick={() => switchLanguage('en')}>EN</button><button className={lang === 'it' ? 'active' : ''} onClick={() => switchLanguage('it')}>IT</button></div>
          <a className="button button-quiet header-portal" href={PORTAL_URL} target="_blank" rel="noreferrer"><LockKeyhole size={16} /> {c.portal}</a>
          <a className="button button-primary header-rfp" href="#request">{c.proposal} <ArrowRight size={17} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <img className="hero-image" src="https://images.unsplash.com/photo-1528181304800-259b08848526?q=90&w=2200&auto=format&fit=crop" alt="Thailand temple landscape" />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-market"><MapPin size={17} /> On-ground across Thailand</div>
          <h1>{c.heroTitle}</h1><p>{c.heroBody}</p>
          <div className="hero-actions"><a className="button button-primary button-large" href="#request">{c.heroPrimary} <ArrowRight size={18} /></a><a className="button button-on-image button-large" href="#journeys">{c.heroSecondary}</a></div>
        </div>
        <div className="hero-operations">
          <div><Map size={20} /><span><strong>Nationwide routing</strong><small>City, coast and islands</small></span></div>
          <div><Languages size={20} /><span><strong>English & Italian</strong><small>Partner communication</small></span></div>
          <div><Headphones size={20} /><span><strong>Local guest support</strong><small>Before and during travel</small></span></div>
        </div>
      </section>

      <section className="field-note" data-reveal="route">
        <div className="field-note-copy"><h2>{c.fieldTitle}</h2><p>{c.fieldBody}</p></div>
        <div className="route-line">{['Arrival', 'Hotel', 'Touring', 'Islands', 'Departure'].map((item, i) => <span key={item}><i>{i + 1}</i>{item}</span>)}</div>
      </section>

      <section className="section services-section" id="services">
        <div className="section-intro"><h2>{c.servicesTitle}</h2><p>{c.servicesBody}</p></div>
        <div className="service-list" data-reveal="services">{services.map(({ icon: Icon, title, copy }, index) => <article className="service-row" style={{ '--motion-order': index }} key={title}><span className="service-index">0{index + 1}</span><Icon size={25} /><h3>{title}</h3><p>{copy}</p><ArrowRight size={20} /></article>)}</div>
      </section>

      <section className="section journeys-section" id="journeys">
        <div className="section-intro section-intro-light" data-reveal="heading"><h2>{c.journeysTitle}</h2><p>{c.journeysBody}</p></div>
        <div className="journey-grid" data-reveal="journeys">{journeys.map((journey, index) => <article className={`journey ${index === 0 ? 'journey-featured' : ''}`} style={{ '--motion-order': index }} key={journey.title}><img src={journey.image} alt={journey.title} /><div className="journey-shade" /><div className="journey-copy"><span>{journey.duration}</span><h3>{journey.title}</h3><p>{journey.route}</p><a href="#request">Adapt this journey <ArrowRight size={16} /></a></div></article>)}</div>
      </section>

      <section className="section planner-section" id="planner">
        <div className="planner-copy" data-reveal="heading"><h2>{c.plannerTitle}</h2><p>{c.plannerBody}</p><div className="planner-points"><span><Check size={17} /> Clearer quotation input</span><span><Check size={17} /> Faster routing review</span><span><Check size={17} /> One local operations team</span></div></div>
        <div className="planner-form" data-reveal="panel">
          <SelectField label="Program type" value={program} setValue={setProgram} options={['Tailor-made FIT', 'Group series', 'Incentive program', 'Beach extension']} />
          <SelectField label="Coverage" value={region} setValue={setRegion} options={['Multi-region Thailand', 'Bangkok & Central', 'Northern Thailand', 'Southern islands']} />
          <SelectField label="Duration" value={duration} setValue={setDuration} options={['4–7 days', '8–10 days', '11–14 days', '15+ days']} />
          <SelectField label="Party size" value={party} setValue={setParty} options={['2–6 guests', '7–15 guests', '16–30 guests', '31+ guests']} />
          <div className="brief-output"><Sparkles size={20} /><span><small>Your starting brief</small><strong>{brief}</strong></span></div>
          <button className="button button-primary" onClick={useBrief}>{c.plannerCta} <ArrowRight size={17} /></button>
        </div>
      </section>

      <section className="section destinations-section" id="destinations">
        <div className="section-intro" data-reveal="heading"><h2>{c.destinationsTitle}</h2><p>{c.destinationsBody}</p></div>
        <div className="destination-strip" data-reveal="destinations">{destinations.map(([name, description, image], index) => <article className="destination" style={{ '--motion-order': index }} key={name}><img src={image} alt={name} /><div><h3>{name}</h3><p>{description}</p></div></article>)}</div>
      </section>

      <section className="why-section" id="why-vera">
        <div className="why-image" data-reveal="image"><img src="https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?q=90&w=1600&auto=format&fit=crop" alt="Thai hospitality experience" /></div>
        <div className="why-copy" data-reveal="heading"><h2>{c.whyTitle}</h2><p>{c.whyBody}</p><div className="commitment-list"><Commitment icon={Building2} title="One accountable local team" copy="Accommodation, transfers and touring managed together." /><Commitment icon={CalendarDays} title="Season-aware planning" copy="Routing and services reviewed against real travel dates." /><Commitment icon={CircleUserRound} title="Built for travel partners" copy="Trade communication, net planning and operational documentation." /></div></div>
      </section>

      <section className="portal-band" id="agent-portal" data-reveal="band"><div><h2>{c.portalTitle}</h2><p>{c.portalBody}</p></div><a className="button button-light button-large" href={PORTAL_URL} target="_blank" rel="noreferrer"><LockKeyhole size={18} /> {c.portal}</a></section>

      <section className="request-section" id="request">
        <div className="request-intro" data-reveal="heading"><h2>{c.rfpTitle}</h2><p>{c.rfpBody}</p><div className="request-contact"><span><Mail size={18} /> reservation@verathailandia.com</span><span><MapPin size={18} /> Bangkok, Thailand</span></div></div>
        <form className="request-form" data-reveal="panel" onSubmit={submitRequest}>
          <label>Agency / tour operator<input name="agency" required placeholder="Company name" /></label><label>Contact person<input name="contact" required placeholder="Full name" /></label><label>Business email<input name="email" required type="email" placeholder="name@agency.com" /></label><label>Indicative travel period<input name="period" placeholder="Month, year or date range" /></label><label>Expected guests<input name="guests" type="number" min="1" placeholder="Number of travellers" /></label><label className="form-wide">Program notes<textarea id="request-notes" name="notes" rows="5" placeholder="Destinations, hotel category, pace, special interests and any operational requirements" /></label><button className="button button-primary form-submit" type="submit"><Send size={17} /> {c.formSend}</button>
        </form>
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><Brand /><p>{c.footerLine}</p></div><div><strong>Contact</strong><a href="mailto:reservation@verathailandia.com">reservation@verathailandia.com</a><span>+66 2 126 6914</span></div><div><strong>Head office</strong><span>ITF Silom Palace, 20th Floor<br />Bangkok 10500, Thailand</span></div><div><strong>Trade credentials</strong><span>TAT license 14/03484</span><a href={PORTAL_URL} target="_blank" rel="noreferrer">Open agent portal</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Verathailandia Co., Ltd.</span><span>For travel trade partners</span></div>
      </footer>
    </main>
  );
}

function SelectField({ label, value, setValue, options }) {
  return <label>{label}<select value={value} onChange={(e) => setValue(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown /></label>;
}

function Commitment({ icon: Icon, title, copy }) {
  return <div><Icon /><span><strong>{title}</strong><small>{copy}</small></span></div>;
}
