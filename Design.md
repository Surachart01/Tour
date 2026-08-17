# Design System & UI Specification: Vera Thailandia B2B Website
**Project:** Vera Thailandia - Inbound Tour Operator & Destination Management Company (DMC)  
**Target Platform:** Web (Desktop 1440px, Tablet 768px, Mobile 375px)  
**Target Audience:** B2B European Travel Agencies, Tour Operators, MICE Organizers (Specialized in the Italian & International Markets)  
**Supported Languages:** Italiano (`it-IT`), English (`en-US`)

---

## 1. Brand Identity & Design Principles

### 1.1 Brand Concept & Personality
* **Personality:** Sophisticated, Trustworthy, Local Destination Expert, Warm & Hospitable, Professional B2B Partner.
* **Aesthetic Direction:** Modern Editorial Travel & Mediterranean-Thai Tropical Elegance. Combines high-contrast deep marine tones with rich golden accents and airy white surfaces.
* **Core Value Proposition:** Direct local contracting (no middleman), Italian-speaking guides and management, 24/7 on-ground assistance in Thailand, proprietary B2B tariff and quotation tools.

---

## 2. Design Tokens & System

### 2.1 Color Palette

| Token Name | Hex Code | HSL / RGB | Usage |
| :--- | :--- | :--- | :--- |
| `--color-primary-deep` | `#081C2E` | `rgb(8, 28, 46)` | Topbar, dark hero backgrounds, footer, high-contrast text |
| `--color-primary-navy` | `#0E2A47` | `rgb(14, 42, 71)` | Main brand color, section headings, card headers |
| `--color-primary-blue` | `#134074` | `rgb(19, 64, 116)` | Accent borders, secondary buttons, badge gradients |
| `--color-accent-gold` | `#E5A93C` | `rgb(229, 169, 60)` | Primary CTAs, active highlights, badges, star icons |
| `--color-accent-gold-hover` | `#C98E28` | `rgb(201, 142, 40)` | Hover state for gold buttons and links |
| `--color-accent-gold-light` | `#FFF8EB` | `rgb(255, 248, 235)` | Badge backgrounds, icon container fills, highlight boxes |
| `--color-accent-teal` | `#0D9488` | `rgb(13, 148, 136)` | Route icons, success badges, checkmark icons |
| `--color-bg-main` | `#F8FAFC` | `rgb(248, 250, 252)` | Main page canvas background |
| `--color-bg-surface` | `#FFFFFF` | `rgb(255, 255, 255)` | Card backgrounds, modals, input fields |
| `--color-bg-subtle` | `#F1F5F9` | `rgb(241, 245, 249)` | Form containers, secondary background sections |
| `--color-text-main` | `#1E293B` | `rgb(30, 41, 59)` | Body paragraphs, primary labels |
| `--color-text-muted` | `#64748B` | `rgb(100, 116, 139)` | Subtitles, helper text, secondary info |
| `--color-border-subtle` | `#E2E8F0` | `rgba(226, 232, 240, 0.8)` | Card borders, dividers, form borders |

---

### 2.2 Typography Scale

* **Headings Font (Serif):** `Playfair Display`, Georgia, serif  
* **Body & UI Font (Sans-serif):** `Plus Jakarta Sans`, `Inter`, -apple-system, sans-serif

| Style Name | Font Family | Size (Desktop) | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | Playfair Display | `56px` (`3.5rem`) | Bold (700) | `1.15` | `-0.5px` |
| **H1 Section Title** | Playfair Display | `40px` (`2.5rem`) | Bold (700) | `1.25` | `-0.25px` |
| **H2 Card Title** | Playfair Display | `28px` (`1.75rem`) | SemiBold (600) | `1.3` | `0px` |
| **H3 Subheader** | Plus Jakarta Sans | `20px` (`1.25rem`) | Bold (700) | `1.4` | `0px` |
| **Subtitle / Tagline**| Plus Jakarta Sans | `13px` (`0.81rem`) | Bold (700) | `1.4` | `2px` (Uppercase) |
| **Body Large** | Plus Jakarta Sans | `18px` (`1.12rem`) | Regular (400) | `1.7` | `0px` |
| **Body Regular** | Plus Jakarta Sans | `15px` (`0.94rem`) | Regular (400) | `1.6` | `0px` |
| **Body Small / Meta**| Plus Jakarta Sans | `13px` (`0.81rem`) | Medium (500) | `1.5` | `0px` |
| **Button Text** | Plus Jakarta Sans | `14px` (`0.88rem`) | Bold (700) | `1.0` | `0.5px` |

---

### 2.3 Spacing, Grid & Elevations

* **Base Unit:** `8px`
* **Container Max Width:** `1280px` (Desktop 1440px canvas)
* **Section Padding:** `90px 0` (Desktop), `60px 0` (Mobile)
* **Corner Radius Tokens:**
  * `--radius-sm`: `8px` (Inputs, Pills, Small Badges)
  * `--radius-md`: `16px` (Cards, Service Boxes, Notification Banners)
  * `--radius-lg`: `24px` (Hero Containers, RFP Form Box, Large Cards)
  * `--radius-full`: `9999px` (Buttons, Language Switcher, Duration Pills)
* **Shadows:**
  * `elevation-card`: `0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`
  * `elevation-hover`: `0 20px 35px -5px rgba(15, 23, 42, 0.12), 0 10px 15px -5px rgba(15, 23, 42, 0.06)`
  * `elevation-gold`: `0 10px 25px -3px rgba(229, 169, 60, 0.35)`

---

## 3. Screen & Section Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ 01. Top Announcement & Language Switcher Bar                           │
├────────────────────────────────────────────────────────────────────────┤
│ 02. Sticky Main Header & Navigation                                    │
├────────────────────────────────────────────────────────────────────────┤
│ 03. Hero Section (Visual Background + Value Proposition + 4 Key Stats) │
├────────────────────────────────────────────────────────────────────────┤
│ 04. Floating B2B Rate Inquiry Bar                                      │
├────────────────────────────────────────────────────────────────────────┤
│ 05. Core B2B Services (4 Pillars: Tours, Hotels, Transfers, Day Trips) │
├────────────────────────────────────────────────────────────────────────┤
│ 06. Signature Multi-Day Itineraries (3 Featured Route Cards)          │
├────────────────────────────────────────────────────────────────────────┤
│ 07. Top Destination Showcase (Asymmetrical Visual Grid)                │
├────────────────────────────────────────────────────────────────────────┤
│ 08. Why Partner With Vera Thailandia (DMC Advantages & Certifications) │
├────────────────────────────────────────────────────────────────────────┤
│ 09. B2B Agent Portal Gateway Banner                                    │
├────────────────────────────────────────────────────────────────────────┤
│ 10. Interactive B2B RFP / Custom Proposal Form                         │
├────────────────────────────────────────────────────────────────────────┤
│ 11. Footer & Regulatory Tourism License (TAT Thailand)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### Component 01: Top Announcement Bar
* **Dimensions:** Full width, Height `40px`.
* **Background:** `--color-primary-deep` (`#081C2E`).
* **Left Elements:**
  * Pin Icon + Location: `"Bangkok & Phuket Operations"` / `"Sedi Operative: Bangkok & Phuket"`
  * Badge Icon + Tagline: `"Premier Inbound DMC in Thailand"` / `"DMC Ufficiale & Tour Operator"`
* **Right Elements:**
  * Phone Icon + Helpline: `"B2B Hotline: +66 2 123 4567"`
  * **Language Switcher Capsule:** Pill container with 2 toggle states:
    * `🇮🇹 IT` (Active: Gold background `#E5A93C`, Navy text `#081C2E`)
    * `🇬🇧 EN` (Inactive: Transparent, White text)

---

### Component 02: Sticky Header & Navigation
* **Dimensions:** Full width, Height `80px`, Sticky with blur background (`rgba(255,255,255,0.96)`).
* **Brand Logo:** 
  * Icon Badge (`44x44px`, Navy-to-Blue gradient) with Golden Palm/Temple monogram.
  * Primary Text: `"Vera Thailandia"` (`Playfair Display`, Bold, `22px`).
  * Sub-label: `"DMC & TOUR OPERATOR"` (`10px`, Gold, uppercase tracking `2.5px`).
* **Navigation Links (Horizontal gap `28px`):**
  * `Chi Siamo` / `About DMC`
  * `Servizi B2B` / `B2B Services`
  * `Itinerari` / `Itineraries`
  * `Destinazioni` / `Destinations`
  * `Perché Vera` / `Why Vera`
  * `Tariffe Net` / `B2B Tariffs` (Highlighted Gold text)
* **Action CTAs:**
  * Secondary Button: `"Portale Agenti"` / `"Agent Portal"` (Outline Navy, pill shape).
  * Primary Button: `"Richiedi Tariffe B2B"` / `"Get B2B Rates"` (Solid Gold `#E5A93C`, Navy text).

---

### Component 03: Hero Section
* **Dimensions:** Full width, Min-height `720px`.
* **Background:** High-res cinematic imagery of Thailand (Wat Arun / Limestone Karsts) with dark deep navy gradient overlay (`85%` opacity).
* **Content Stack:**
  * **Trust Badge:** Pill container with gold star icon: `"✦ DMC Ufficiale & Tour Operator Incoming in Thailandia"`
  * **Headline (H1):** `"Il Tuo Partner di Fiducia per Viaggi su Misura in Thailandia"` (with `"Viaggi su Misura"` highlighted in Gold).
  * **Subheadline:** Clear explanation of direct hotel contracts, Italian-speaking guides, 24/7 on-ground assistance.
  * **CTA Row:** Dual button layout (`"Scopri i Servizi B2B"` + `"Richiedi Preventivo Gruppi"`).
  * **4 Metrics Counter Grid (Border Top Divider):**
    * `12+` Anni di Esperienza sul Campo
    * `65.000+` Viaggiatori Italiani Accolti
    * `24/7` Assistenza in Lingua Italiana
    * `100%` Licenza Ufficiale TAT Thailandia

---

### Component 04: Floating B2B Rate Inquiry Bar
* **Placement:** Positioned with `-45px` top margin overlapping the bottom of the hero section.
* **Container:** White card, `Border-radius: 20px`, `Box-shadow: elevation-card`, `Padding: 28px 36px`.
* **4-Column Layout:**
  1. **Select 1 - Service Type:** Tour Multi-Giorno, Viaggio su Misura FIT, Serie di Gruppo GIT, MICE & Incentive.
  2. **Select 2 - Destination:** Tutte le Regioni, Nord (Chiang Mai/Rai), Sud (Phuket/Samui), Centro (Bangkok).
  3. **Select 3 - Duration:** 1-4 Giorni, 5-8 Giorni, 9-14 Giorni, 15+ Giorni.
  4. **Action Button:** `"Verifica Tariffe Net"` (Full height button with search icon).

---

### Component 05: Core B2B Services (4 Pillars)
* **Grid:** 4 Equal Columns (`Width: 290px` each, Gap `24px`).
* **Card Design:** White surface, border `1px solid #E2E8F0`, hover lift effect `-8px` with top gradient line indicator.
* **4 Cards:**
  1. 🗺️ **Tour su Misura & Pacchetti:** Itinerari esclusivi, partenze garantite, guide parlanti italiano.
  2. 🏨 **Allotment & Contratti Hotel:** Tariffe nette B2B esclusive con i migliori resort e boutique hotel.
  3. 🚐 **Trasferimenti VIP & Flotta:** Van moderni di lusso, pullman per gruppi e motoscafi charter.
  4. 🎡 **Escursioni & Esperienze:** Santuari etici, lezioni di cucina, crociere e gite culturali.

---

### Component 06: Signature Multi-Day Itineraries
* **Grid:** 3 Cards (`Width: 390px` each, Gap `28px`).
* **Card Anatomy:**
  * **Image Container (`Height: 230px`):** Top left pill badge (`Best Seller` / `Tropical` / `Eco`), Bottom right pill duration badge (`8G / 7N`).
  * **Route Breadcrumb:** Teal color icon + route path (e.g. `Bangkok → Ayutthaya → Chiang Mai → Chiang Rai`).
  * **Title & Description:** Editorial typography with route summary.
  * **Highlight Pills:** 3 tag chips representing tour milestones.
  * **Footer Action:** Confidential B2B Rate indicator (`🔒 Tariffe Nette nel Portale`) + `"Scarica Scheda B2B (PDF)"` button.

---

### Component 07: Destination Showcase
* **Layout:** Asymmetric 5-card Bento-Grid:
  * Card 1 (Large - 6 cols): **Bangkok & Pianura Centrale**
  * Card 2 (Large - 6 cols): **Chiang Mai & Il Nord**
  * Card 3 (Small - 4 cols): **Phuket & Costa Andamane**
  * Card 4 (Small - 4 cols): **Koh Samui & Isole del Golfo**
  * Card 5 (Small - 4 cols): **Kanchanaburi & Fiume Kwai**
* **Interaction:** Dark gradient overlay on bottom with title and subtitle always visible; description slides up on hover.

---

### Component 08: Why Partner With Us
* **Layout:** 2-Column Split:
  * **Left Column:** Section header + 4 Feature blocks with custom gold icon containers:
    1. *Staff & Guide Ufficiali Parlanti Italiano*
    2. *Preventivi Rapidi Entro 24 Ore*
    3. *Piattaforma B2B Dedicata agli Agenti*
    4. *Assistenza Locale Diretta 24/7*
  * **Right Column:** Visual showcase with floating glassmorphic badge: `"Garanzia Partner B2B - Tariffe Dirette Senza Intermediari"`.

---

### Component 09: B2B RFP & Quotation Request Form
* **Container:** Max-width `900px`, centered, background `#FFFFFF`, rounded `24px`, shadow `elevation-card`.
* **Form Grid (2 Columns):**
  * Field 1: Nome Agenzia / Tour Operator
  * Field 2: Nome Referente
  * Field 3: Email Aziendale
  * Field 4: Paese / Mercato
  * Field 5: Numero Passeggeri (FIT / GIT)
  * Field 6: Periodo di Viaggio Indicativo
  * Field 7 (Full width): **Interactive Service Pills Checkboxes** (Multi-day Tour, Hotel Rates, Private Transfers, Day Excursions, Italian Guide).
  * Field 8 (Full width): Textarea for itinerary notes and custom requirements.
  * Submit Button: Centered Gold Button `"Invia Richiesta B2B"`.

---

### Component 10: Footer & Compliance
* **Background:** `--color-primary-deep` (`#081C2E`), text color `#A0AEC0`.
* **4 Columns:**
  * **Col 1 (Brand):** Logo, company description, official TAT Tourism License badge (`Licenza TAT N. 11/08924`).
  * **Col 2 (Quick Links):** About DMC, B2B Services, Itineraries, Destinations, Why Us.
  * **Col 3 (Services):** Tailor-Made, Allotment, Transfers, Excursions, Agent Portal.
  * **Col 4 (Contacts):** Office Address in Bangkok, Direct Booking Email, WhatsApp 24/7 Line.
* **Bottom Bar:** Copyright notice and B2B dedicated operator credentials.

---

## 5. Bilingual Copy Matrix (Italiano & English)

| Section | Key | Italiano (`it-IT`) | English (`en-US`) |
| :--- | :--- | :--- | :--- |
| **Top Bar** | `tagline` | DMC & Tour Operator Leader in Thailandia | Premier Inbound DMC & Tour Operator in Thailand |
| **Hero** | `headline` | Il Tuo Partner di Fiducia per Viaggi su Misura in Thailandia | Your Trusted Partner for Tailor-Made Thailand Journeys |
| **Hero** | `cta_primary` | Scopri i Servizi B2B | Explore B2B Services |
| **Hero** | `cta_secondary`| Richiedi Preventivo Gruppi | Request Group / FIT Quote |
| **Stats** | `stat_1` | 12+ Anni di Esperienza | 12+ Years of Excellence |
| **Stats** | `stat_2` | 65.000+ Ospiti Italiani Accolti | 65,000+ European Guests Hosted |
| **Stats** | `stat_3` | 24/7 Assistenza in Lingua Italiana | 24/7 Native On-Ground Care |
| **Stats** | `stat_4` | 100% Licenza Ufficiale TAT | 100% TAT Licensed Operator |
| **Services**| `srv_title` | Servizi DMC a 360° per Agenzie di Viaggio | Full-Spectrum DMC Services in Thailand |
| **Portal** | `portal_cta` | Accedi al Portale Agenti B2B | Access Our B2B Agent Management System |
| **RFP** | `rfp_title` | Richiedi Tariffe B2B o Progetto Gruppo | Request a Custom B2B Tariff or Proposal |
| **Footer** | `license` | Licenza Ufficiale TAT: 11/08924 | Official TAT License No: 11/08924 |

---

## 6. Implementation & Generation Instructions for Stitch

1. **Hierarchy & Auto Layout:** All cards and sections must use structured vertical/horizontal Auto Layout with strict padding and spacing tokens (`8px`, `16px`, `24px`, `32px`, `48px`, `80px`).
2. **Typography Hierarchy:** Strictly pair `Playfair Display` for headlines and `Plus Jakarta Sans` / `Inter` for functional UI components.
3. **Contrast Ratio:** Ensure all text passes WCAG AA contrast (Gold `#E5A93C` on Dark Navy `#081C2E`, White text on Dark Navy, and `#1E293B` on `#FFFFFF` / `#F8FAFC`).
4. **Interactive States:** Provide Default, Hover, Active, and Focus states for Buttons, Dropdowns, and Form inputs.
