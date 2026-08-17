/**
 * ============================================================================
 * VERA THAILANDIA - FIGMA CANVAS AUTO-GENERATOR SCRIPT
 * ============================================================================
 * วิธีใช้งานใน Figma:
 * 1. เปิดไฟล์ Figma ที่ต้องการ (ตามหน้าจอที่คุณเปิดอยู่)
 * 2. กดปุ่มเมนู Figma (มุมซ้ายบน) -> Plugins -> Development -> Open Console (หรือกด Cmd+Option+I บน Mac)
 *    หรือใช้เมนู Plugins -> Development -> New Plugin (เลือก Scripter หรือ Default)
 * 3. วางโค้ดทั้งหมดนี้ลงใน Console หรือ Plugin Code แล้วกด Enter / Run
 * 4. หน้าจอ UX/UI ทั้งหมดของ Vera Thailandia B2B จะถูกวาดลงบน Canvas ในทันที!
 * ============================================================================
 */

async function generateVeraThailandiaUI() {
  // 1. โหลดฟอนต์มาตรฐาน
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // 2. กำหนดสีหลัก (Design Tokens)
  const COLOR = {
    navyDeep: { r: 8/255, g: 28/255, b: 46/255 },
    navyLight: { r: 14/255, g: 42/255, b: 71/255 },
    gold: { r: 229/255, g: 169/255, b: 60/255 },
    goldLight: { r: 255/255, g: 248/255, b: 235/255 },
    teal: { r: 13/255, g: 148/255, b: 136/255 },
    white: { r: 1, g: 1, b: 1 },
    bgLight: { r: 248/255, g: 250/255, b: 252/255 },
    bgSubtle: { r: 241/255, g: 245/255, b: 249/255 },
    textMain: { r: 30/255, g: 41/255, b: 59/255 },
    textMuted: { r: 100/255, g: 116/255, b: 139/255 },
    border: { r: 226/255, g: 232/255, b: 240/255 }
  };

  // Helper สร้าง Text
  function createText(characters, size, style = "Regular", color = COLOR.textMain) {
    const text = figma.createText();
    text.fontName = { family: "Inter", style: style };
    text.characters = characters;
    text.fontSize = size;
    text.fills = [{ type: "SOLID", color: color }];
    return text;
  }

  // 3. สร้าง Main Canvas Artboard (Desktop 1440px)
  const mainFrame = figma.createFrame();
  mainFrame.name = "🖥️ Vera Thailandia - B2B Homepage (IT / EN)";
  mainFrame.resize(1440, 4800);
  mainFrame.layoutMode = "VERTICAL";
  mainFrame.itemSpacing = 0;
  mainFrame.paddingLeft = 0;
  mainFrame.paddingRight = 0;
  mainFrame.paddingTop = 0;
  mainFrame.paddingBottom = 0;
  mainFrame.fills = [{ type: "SOLID", color: COLOR.bgLight }];

  // -------------------------------------------------------------
  // [SECTION 1] TOP ANNOUNCEMENT BAR
  // -------------------------------------------------------------
  const topBar = figma.createFrame();
  topBar.name = "01_Top_Bar";
  topBar.resize(1440, 40);
  topBar.layoutMode = "HORIZONTAL";
  topBar.primaryAxisAlignItems = "SPACE_BETWEEN";
  topBar.counterAxisAlignItems = "CENTER";
  topBar.paddingLeft = 80;
  topBar.paddingRight = 80;
  topBar.fills = [{ type: "SOLID", color: COLOR.navyDeep }];

  const topBarLeft = figma.createFrame();
  topBarLeft.layoutMode = "HORIZONTAL";
  topBarLeft.itemSpacing = 24;
  topBarLeft.fills = [];
  topBarLeft.appendChild(createText("📍 Sedi Operative: Bangkok & Phuket", 12, "Medium", { r: 0.8, g: 0.85, b: 0.9 }));
  topBarLeft.appendChild(createText("⭐ DMC Ufficiale & Tour Operator Incoming", 12, "Medium", COLOR.gold));

  const topBarRight = figma.createFrame();
  topBarRight.layoutMode = "HORIZONTAL";
  topBarRight.itemSpacing = 20;
  topBarRight.fills = [];
  topBarRight.appendChild(createText("📞 B2B Hotline: +66 2 123 4567", 12, "Medium", { r: 0.9, g: 0.9, b: 0.9 }));
  topBarRight.appendChild(createText("🇮🇹 IT | 🇬🇧 EN", 12, "Bold", COLOR.gold));

  topBar.appendChild(topBarLeft);
  topBar.appendChild(topBarRight);
  mainFrame.appendChild(topBar);

  // -------------------------------------------------------------
  // [SECTION 2] NAVIGATION HEADER
  // -------------------------------------------------------------
  const navHeader = figma.createFrame();
  navHeader.name = "02_Header_Nav";
  navHeader.resize(1440, 80);
  navHeader.layoutMode = "HORIZONTAL";
  navHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
  navHeader.counterAxisAlignItems = "CENTER";
  navHeader.paddingLeft = 80;
  navHeader.paddingRight = 80;
  navHeader.fills = [{ type: "SOLID", color: COLOR.white }];
  navHeader.effects = [{
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.05 },
    offset: { x: 0, y: 4 },
    radius: 12,
    visible: true,
    blendMode: "NORMAL"
  }];

  // Logo
  const logoGroup = figma.createFrame();
  logoGroup.layoutMode = "VERTICAL";
  logoGroup.fills = [];
  logoGroup.appendChild(createText("VERA THAILANDIA", 20, "Bold", COLOR.navyDeep));
  logoGroup.appendChild(createText("DMC & TOUR OPERATOR", 10, "Semi Bold", COLOR.gold));

  // Menu Links
  const navMenu = figma.createFrame();
  navMenu.layoutMode = "HORIZONTAL";
  navMenu.itemSpacing = 32;
  navMenu.fills = [];
  navMenu.appendChild(createText("Chi Siamo", 14, "Semi Bold", COLOR.textMain));
  navMenu.appendChild(createText("Servizi B2B", 14, "Semi Bold", COLOR.textMain));
  navMenu.appendChild(createText("Itinerari", 14, "Semi Bold", COLOR.textMain));
  navMenu.appendChild(createText("Destinazioni", 14, "Semi Bold", COLOR.textMain));
  navMenu.appendChild(createText("Perché Vera", 14, "Semi Bold", COLOR.textMain));
  navMenu.appendChild(createText("Tariffe Net", 14, "Semi Bold", COLOR.gold));

  // Actions
  const navActions = figma.createFrame();
  navActions.layoutMode = "HORIZONTAL";
  navActions.itemSpacing = 16;
  navActions.fills = [];

  const btnPortal = figma.createFrame();
  btnPortal.layoutMode = "HORIZONTAL";
  btnPortal.paddingLeft = 20;
  btnPortal.paddingRight = 20;
  btnPortal.paddingTop = 10;
  btnPortal.paddingBottom = 10;
  btnPortal.cornerRadius = 24;
  btnPortal.fills = [{ type: "SOLID", color: COLOR.white }];
  btnPortal.strokes = [{ type: "SOLID", color: COLOR.navyDeep }];
  btnPortal.strokeWeight = 1.5;
  btnPortal.appendChild(createText("Portale Agenti", 13, "Semi Bold", COLOR.navyDeep));

  const btnRFP = figma.createFrame();
  btnRFP.layoutMode = "HORIZONTAL";
  btnRFP.paddingLeft = 22;
  btnRFP.paddingRight = 22;
  btnRFP.paddingTop = 10;
  btnRFP.paddingBottom = 10;
  btnRFP.cornerRadius = 24;
  btnRFP.fills = [{ type: "SOLID", color: COLOR.gold }];
  btnRFP.appendChild(createText("Richiedi Tariffe B2B", 13, "Bold", COLOR.navyDeep));

  navActions.appendChild(btnPortal);
  navActions.appendChild(btnRFP);

  navHeader.appendChild(logoGroup);
  navHeader.appendChild(navMenu);
  navHeader.appendChild(navActions);
  mainFrame.appendChild(navHeader);

  // -------------------------------------------------------------
  // [SECTION 3] HERO BANNER & METRICS
  // -------------------------------------------------------------
  const hero = figma.createFrame();
  hero.name = "03_Hero_Section";
  hero.resize(1440, 680);
  hero.layoutMode = "VERTICAL";
  hero.primaryAxisAlignItems = "CENTER";
  hero.paddingLeft = 80;
  hero.paddingRight = 80;
  hero.paddingTop = 80;
  hero.paddingBottom = 60;
  hero.fills = [{ type: "SOLID", color: COLOR.navyDeep }];

  // Badge
  const heroBadge = figma.createFrame();
  heroBadge.layoutMode = "HORIZONTAL";
  heroBadge.paddingLeft = 18;
  heroBadge.paddingRight = 18;
  heroBadge.paddingTop = 6;
  heroBadge.paddingBottom = 6;
  heroBadge.cornerRadius = 20;
  heroBadge.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  heroBadge.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.15 }];
  heroBadge.appendChild(createText("✦ DMC Ufficiale & Tour Operator Incoming in Thailandia", 13, "Semi Bold", COLOR.gold));
  hero.appendChild(heroBadge);

  // Title
  const heroTitle = createText("Il Tuo Partner di Fiducia per Viaggi\nsu Misura in Thailandia", 46, "Bold", COLOR.white);
  heroTitle.textAlignHorizontal = "CENTER";
  hero.appendChild(heroTitle);

  // Desc
  const heroDesc = createText("Forniamo alle agenzie di viaggio italiane ed europee itinerari su misura, allotment alberghieri diretti,\nguide autorizzate in lingua italiana e assistenza locale continua 24/7.", 16, "Regular", { r: 0.85, g: 0.9, b: 0.95 });
  heroDesc.textAlignHorizontal = "CENTER";
  hero.appendChild(heroDesc);

  // Hero CTAs
  const heroButtons = figma.createFrame();
  heroButtons.layoutMode = "HORIZONTAL";
  heroButtons.itemSpacing = 20;
  heroButtons.fills = [];
  
  const cta1 = figma.createFrame();
  cta1.paddingLeft = 28; cta1.paddingRight = 28; cta1.paddingTop = 14; cta1.paddingBottom = 14;
  cta1.cornerRadius = 30; cta1.fills = [{ type: "SOLID", color: COLOR.gold }];
  cta1.appendChild(createText("Scopri i Servizi B2B", 15, "Bold", COLOR.navyDeep));

  const cta2 = figma.createFrame();
  cta2.paddingLeft = 28; cta2.paddingRight = 28; cta2.paddingTop = 14; cta2.paddingBottom = 14;
  cta2.cornerRadius = 30; cta2.fills = [{ type: "SOLID", color: COLOR.white }];
  cta2.appendChild(createText("Richiedi Preventivo Gruppi", 15, "Bold", COLOR.navyDeep));

  heroButtons.appendChild(cta1);
  heroButtons.appendChild(cta2);
  hero.appendChild(heroButtons);

  // Stats Grid (4 Cols)
  const statsFrame = figma.createFrame();
  statsFrame.resize(1280, 100);
  statsFrame.layoutMode = "HORIZONTAL";
  statsFrame.primaryAxisAlignItems = "SPACE_BETWEEN";
  statsFrame.paddingTop = 40;
  statsFrame.fills = [];

  const stats = [
    { num: "12+", label: "Anni di Esperienza sul Campo" },
    { num: "65.000+", label: "Viaggiatori Italiani Accolti" },
    { num: "24/7", label: "Assistenza in Lingua Italiana" },
    { num: "100%", label: "Licenza Ufficiale TAT Thailandia" }
  ];

  stats.forEach(st => {
    const sBox = figma.createFrame();
    sBox.layoutMode = "VERTICAL";
    sBox.itemSpacing = 4;
    sBox.fills = [];
    sBox.appendChild(createText(st.num, 32, "Bold", COLOR.gold));
    sBox.appendChild(createText(st.label, 12, "Medium", { r: 0.8, g: 0.85, b: 0.9 }));
    statsFrame.appendChild(sBox);
  });

  hero.appendChild(statsFrame);
  mainFrame.appendChild(hero);

  // -------------------------------------------------------------
  // [SECTION 4] CORE 4 SERVICES PILLARS
  // -------------------------------------------------------------
  const servicesSection = figma.createFrame();
  servicesSection.name = "04_Core_B2B_Services";
  servicesSection.resize(1440, 600);
  servicesSection.layoutMode = "VERTICAL";
  servicesSection.paddingLeft = 80;
  servicesSection.paddingRight = 80;
  servicesSection.paddingTop = 70;
  servicesSection.paddingBottom = 70;
  servicesSection.itemSpacing = 40;
  servicesSection.fills = [{ type: "SOLID", color: COLOR.bgLight }];

  // Section Header
  const srvHead = figma.createFrame();
  srvHead.layoutMode = "VERTICAL";
  srvHead.itemSpacing = 8;
  srvHead.fills = [];
  srvHead.appendChild(createText("SOLUZIONI INCOMING COMPLETE", 12, "Bold", COLOR.gold));
  srvHead.appendChild(createText("Servizi DMC a 360° per Agenzie di Viaggio", 28, "Bold", COLOR.navyDeep));
  servicesSection.appendChild(srvHead);

  // 4 Cards Grid
  const srvGrid = figma.createFrame();
  srvGrid.resize(1280, 360);
  srvGrid.layoutMode = "HORIZONTAL";
  srvGrid.itemSpacing = 24;
  srvGrid.fills = [];

  const serviceData = [
    { title: "Tour su Misura & Pacchetti", desc: "Itinerari studiati per il mercato italiano, partenze garantite e guide ufficiali in italiano.", icon: "🗺️" },
    { title: "Allotment & Contratti Hotel", desc: "Tariffe nette B2B esclusive con i migliori resort a Bangkok, Chiang Mai, Phuket e isole.", icon: "🏨" },
    { title: "Trasferimenti VIP & Flotta", desc: "Moderni van di lusso, pullman per gruppi e motoscafi con autisti professionisti.", icon: "🚐" },
    { title: "Escursioni & Esperienze", desc: "Santuari etici degli elefanti, corsi di cucina, crociere e immersioni culturali uniche.", icon: "🎡" }
  ];

  serviceData.forEach(sd => {
    const card = figma.createFrame();
    card.resize(302, 340);
    card.layoutMode = "VERTICAL";
    card.paddingLeft = 24; card.paddingRight = 24; card.paddingTop = 30; card.paddingBottom = 30;
    card.itemSpacing = 16;
    card.cornerRadius = 16;
    card.fills = [{ type: "SOLID", color: COLOR.white }];
    card.strokes = [{ type: "SOLID", color: COLOR.border }];
    card.strokeWeight = 1;
    card.effects = [{
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.04 },
      offset: { x: 0, y: 6 },
      radius: 16,
      visible: true,
      blendMode: "NORMAL"
    }];

    card.appendChild(createText(sd.icon, 36, "Regular"));
    card.appendChild(createText(sd.title, 18, "Bold", COLOR.navyDeep));
    card.appendChild(createText(sd.desc, 13, "Regular", COLOR.textMuted));
    
    const fLink = createText("Dettagli servizio →", 13, "Semi Bold", COLOR.teal);
    card.appendChild(fLink);

    srvGrid.appendChild(card);
  });

  servicesSection.appendChild(srvGrid);
  mainFrame.appendChild(servicesSection);

  // -------------------------------------------------------------
  // [SECTION 5] SIGNATURE MULTI-DAY ITINERARIES
  // -------------------------------------------------------------
  const tourSection = figma.createFrame();
  tourSection.name = "05_Signature_Itineraries";
  tourSection.resize(1440, 680);
  tourSection.layoutMode = "VERTICAL";
  tourSection.paddingLeft = 80; tourSection.paddingRight = 80; tourSection.paddingTop = 70;
  tourSection.itemSpacing = 36;
  tourSection.fills = [{ type: "SOLID", color: COLOR.bgSubtle }];

  const tourHead = figma.createFrame();
  tourHead.layoutMode = "VERTICAL";
  tourHead.itemSpacing = 8;
  tourHead.fills = [];
  tourHead.appendChild(createText("ISPIRAZIONI D'ITINERARIO", 12, "Bold", COLOR.gold));
  tourHead.appendChild(createText("I Nostri Tour Multi-Giorno di Punta", 28, "Bold", COLOR.navyDeep));
  tourSection.appendChild(tourHead);

  const toursGrid = figma.createFrame();
  toursGrid.resize(1280, 460);
  toursGrid.layoutMode = "HORIZONTAL";
  toursGrid.itemSpacing = 24;
  toursGrid.fills = [];

  const tours = [
    { tag: "PIÙ VENDUTO", dur: "8G / 7N", title: "Il Grande Nord: Storia, Templi e Triangolo d'Oro", route: "Bangkok → Ayutthaya → Chiang Mai → Chiang Rai", desc: "L'itinerario classico completo con guida italiana, visite ai templi storici UNESCO e natura lussureggiante." },
    { tag: "ISOLE & RELAX", dur: "6G / 5N", title: "Odissea nell'Andamano: Isole e Scogliere Mozzafiato", route: "Phuket → Phang Nga → Phi Phi → Krabi", desc: "Motoscafo privato, acque cristalline, escursioni a Maya Bay e soggiorni nei migliori resort fronte mare." },
    { tag: "ECO & CULTURA", dur: "10G / 9N", title: "Thailandia Completa: Giungla, Elefanti e Mare", route: "Bangkok → Fiume Kwai → Chiang Mai → Samui", desc: "Un'esperienza a 360° che unisce resort galleggianti sul Fiume Kwai, santuari etici e spiagge a Koh Samui." }
  ];

  tours.forEach(t => {
    const tCard = figma.createFrame();
    tCard.resize(410, 440);
    tCard.layoutMode = "VERTICAL";
    tCard.cornerRadius = 16;
    tCard.fills = [{ type: "SOLID", color: COLOR.white }];
    tCard.strokes = [{ type: "SOLID", color: COLOR.border }];
    tCard.paddingLeft = 24; tCard.paddingRight = 24; tCard.paddingTop = 24; tCard.paddingBottom = 24;
    tCard.itemSpacing = 12;

    const tHeader = figma.createFrame();
    tHeader.layoutMode = "HORIZONTAL";
    tHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
    tHeader.fills = [];
    tHeader.appendChild(createText(t.tag, 11, "Bold", COLOR.gold));
    tHeader.appendChild(createText(t.dur, 11, "Bold", COLOR.navyDeep));
    tCard.appendChild(tHeader);

    tCard.appendChild(createText(t.route, 12, "Semi Bold", COLOR.teal));
    tCard.appendChild(createText(t.title, 18, "Bold", COLOR.navyDeep));
    tCard.appendChild(createText(t.desc, 13, "Regular", COLOR.textMuted));

    const btnPdf = figma.createFrame();
    btnPdf.paddingLeft = 16; btnPdf.paddingRight = 16; btnPdf.paddingTop = 10; btnPdf.paddingBottom = 10;
    btnPdf.cornerRadius = 8;
    btnPdf.fills = [{ type: "SOLID", color: COLOR.bgSubtle }];
    btnPdf.appendChild(createText("📥 Scarica Scheda B2B (PDF)", 12, "Semi Bold", COLOR.navyDeep));
    tCard.appendChild(btnPdf);

    toursGrid.appendChild(tCard);
  });

  tourSection.appendChild(toursGrid);
  mainFrame.appendChild(tourSection);

  // -------------------------------------------------------------
  // [SECTION 6] AGENT PORTAL & B2B RFP FORM
  // -------------------------------------------------------------
  const rfpSection = figma.createFrame();
  rfpSection.name = "06_B2B_Tariff_Request";
  rfpSection.resize(1440, 700);
  rfpSection.layoutMode = "VERTICAL";
  rfpSection.primaryAxisAlignItems = "CENTER";
  rfpSection.paddingLeft = 80; rfpSection.paddingRight = 80; rfpSection.paddingTop = 60;
  rfpSection.itemSpacing = 30;
  rfpSection.fills = [{ type: "SOLID", color: COLOR.white }];

  const rfpHead = figma.createFrame();
  rfpHead.layoutMode = "VERTICAL";
  rfpHead.itemSpacing = 8;
  rfpHead.fills = [];
  rfpHead.appendChild(createText("COLLABORAZIONE B2B", 12, "Bold", COLOR.gold));
  rfpHead.appendChild(createText("Richiedi Listino Tariffe Nette o Progetto Gruppo", 28, "Bold", COLOR.navyDeep));
  rfpSection.appendChild(rfpHead);

  const formBox = figma.createFrame();
  formBox.resize(900, 480);
  formBox.layoutMode = "VERTICAL";
  formBox.paddingLeft = 40; formBox.paddingRight = 40; formBox.paddingTop = 36; formBox.paddingBottom = 36;
  formBox.itemSpacing = 20;
  formBox.cornerRadius = 20;
  formBox.fills = [{ type: "SOLID", color: COLOR.bgSubtle }];
  formBox.strokes = [{ type: "SOLID", color: COLOR.border }];

  formBox.appendChild(createText("Compila i dettagli dell'agenzia per ricevere l'accesso al Portale B2B entro 24 ore:", 14, "Medium", COLOR.textMain));

  const inputs = [
    "Nome Agenzia / Tour Operator",
    "Nome Referente & Email Aziendale",
    "Tipologia Richiesta (Tour Serie / FIT su Misura / Allotment Mare)",
    "Note sull'Itinerario o Periodo di Viaggio"
  ];

  inputs.forEach(placeholder => {
    const fInput = figma.createFrame();
    fInput.resize(820, 46);
    fInput.paddingLeft = 16; fInput.paddingRight = 16;
    fInput.layoutMode = "HORIZONTAL";
    fInput.counterAxisAlignItems = "CENTER";
    fInput.cornerRadius = 8;
    fInput.fills = [{ type: "SOLID", color: COLOR.white }];
    fInput.strokes = [{ type: "SOLID", color: COLOR.border }];
    fInput.appendChild(createText(placeholder, 13, "Regular", COLOR.textMuted));
    formBox.appendChild(fInput);
  });

  const submitBtn = figma.createFrame();
  submitBtn.resize(820, 50);
  submitBtn.layoutMode = "HORIZONTAL";
  submitBtn.primaryAxisAlignItems = "CENTER";
  submitBtn.counterAxisAlignItems = "CENTER";
  submitBtn.cornerRadius = 10;
  submitBtn.fills = [{ type: "SOLID", color: COLOR.gold }];
  submitBtn.appendChild(createText("Invia Richiesta B2B", 15, "Bold", COLOR.navyDeep));
  formBox.appendChild(submitBtn);

  rfpSection.appendChild(formBox);
  mainFrame.appendChild(rfpSection);

  // -------------------------------------------------------------
  // [SECTION 7] FOOTER
  // -------------------------------------------------------------
  const footer = figma.createFrame();
  footer.name = "07_Footer";
  footer.resize(1440, 320);
  footer.layoutMode = "VERTICAL";
  footer.paddingLeft = 80; footer.paddingRight = 80; footer.paddingTop = 60;
  footer.itemSpacing = 24;
  footer.fills = [{ type: "SOLID", color: COLOR.navyDeep }];

  const fContent = figma.createFrame();
  fContent.resize(1280, 180);
  fContent.layoutMode = "HORIZONTAL";
  fContent.primaryAxisAlignItems = "SPACE_BETWEEN";
  fContent.fills = [];

  const fBrand = figma.createFrame();
  fBrand.layoutMode = "VERTICAL";
  fBrand.itemSpacing = 10;
  fBrand.fills = [];
  fBrand.appendChild(createText("VERA THAILANDIA CO., LTD.", 18, "Bold", COLOR.white));
  fBrand.appendChild(createText("Tour Operator Incoming & DMC Thailandia", 12, "Medium", COLOR.gold));
  fBrand.appendChild(createText("Sede: Sukhumvit Rd, Khlong Toei, Bangkok 10110", 12, "Regular", { r: 0.7, g: 0.75, b: 0.8 }));
  fBrand.appendChild(createText("Licenza TAT N. 11/08924", 12, "Bold", COLOR.gold));
  fContent.appendChild(fBrand);

  const fContact = figma.createFrame();
  fContact.layoutMode = "VERTICAL";
  fContact.itemSpacing = 10;
  fContact.fills = [];
  fContact.appendChild(createText("CONTATTI B2B", 14, "Bold", COLOR.white));
  fContact.appendChild(createText("📧 booking@verathailandia.com", 13, "Regular", { r: 0.8, g: 0.85, b: 0.9 }));
  fContact.appendChild(createText("📞 +66 (0) 2 123 4567", 13, "Regular", { r: 0.8, g: 0.85, b: 0.9 }));
  fContact.appendChild(createText("💬 Assistenza WhatsApp 24/7 attiva", 13, "Semi Bold", COLOR.teal));
  fContent.appendChild(fContact);

  footer.appendChild(fContent);

  const fBottom = createText("© 2026 Vera Thailandia Co., Ltd. Tutti i diritti riservati. Piattaforma dedicata alle agenzie di viaggio partner.", 12, "Regular", { r: 0.6, g: 0.65, b: 0.7 });
  footer.appendChild(fBottom);
  mainFrame.appendChild(footer);

  // Focus view on created frame
  figma.viewport.scrollAndZoomIntoView([mainFrame]);
  figma.notify("🎉 Vera Thailandia B2B UI Frame สร้างเสร็จเรียบร้อยบน Figma Canvas!");
}

// Execute
generateVeraThailandiaUI();
