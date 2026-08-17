/**
 * Vera Thailandia - Main Application Logic
 * Language Switching, Form handling, Navigation & Animations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current active language (default 'it' or 'en' from localStorage / browser)
  let currentLang = localStorage.getItem('vera_lang') || 'it';

  // 1. Language Initialization & Switching
  function applyLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('vera_lang', lang);

    // Update Text Content
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    // Update Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang][key]) {
        el.setAttribute('placeholder', translations[lang][key]);
      }
    });

    // Update Language Buttons Active State
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang === 'it' ? 'it-IT' : 'en-US';
  }

  // Attach event listeners to language switcher buttons
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetLang = e.currentTarget.getAttribute('data-lang');
      applyLanguage(targetLang);
    });
  });

  // Apply initial language
  applyLanguage(currentLang);

  // 2. Sticky Header Scroll Effect
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 3. Mobile Navigation Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const isVisible = navLinks.style.display === 'flex';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '80px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = '#ffffff';
        navLinks.style.padding = '24px';
        navLinks.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
      }
    });
  }

  // 4. Quick Inquiry Bar to RFP Auto-Scroll & Fill
  const quickSearchBtn = document.getElementById('quick-search-btn');
  if (quickSearchBtn) {
    quickSearchBtn.addEventListener('click', () => {
      const serviceType = document.getElementById('quick-service-type').value;
      const destination = document.getElementById('quick-destination').value;
      const duration = document.getElementById('quick-duration').value;

      const rfpSection = document.getElementById('rfp-section');
      if (rfpSection) {
        rfpSection.scrollIntoView({ behavior: 'smooth' });
        
        // Auto-populate notes
        const notesField = document.getElementById('rfp-notes');
        if (notesField) {
          const prefix = currentLang === 'it' ? 'Richiesta rapida:' : 'Quick inquiry:';
          notesField.value = `${prefix} ${serviceType} | Dest: ${destination} | Durata: ${duration}`;
          notesField.focus();
        }
      }
    });
  }

  // 5. Custom Checkboxes
  document.querySelectorAll('.custom-checkbox').forEach((box) => {
    box.addEventListener('click', () => {
      box.classList.toggle('selected');
      const hiddenInput = box.querySelector('input[type="checkbox"]');
      if (hiddenInput) {
        hiddenInput.checked = box.classList.contains('selected');
      }
    });
  });

  // 6. RFP Form Submission Simulation
  const rfpForm = document.getElementById('b2b-rfp-form');
  if (rfpForm) {
    rfpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = rfpForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      submitBtn.disabled = true;
      submitBtn.textContent = currentLang === 'it' ? 'Invio in corso...' : 'Submitting...';

      setTimeout(() => {
        alert(translations[currentLang].form_success_msg);
        rfpForm.reset();
        document.querySelectorAll('.custom-checkbox').forEach(cb => cb.classList.remove('selected'));
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }, 1000);
    });
  }
});
