(function () {
  function updateStatementLabel(root) {
    const statementLinks = Array.from(root.querySelectorAll('a[href]')).filter((link) => {
      const href = String(link.getAttribute('href') || '').split(/[?#]/)[0];
      return href.endsWith('/payment.html') || href === 'payment.html';
    });

    statementLinks.forEach((statementLink) => {
      const textNode = Array.from(statementLink.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );

      if (textNode) {
        textNode.textContent = ' Statement';
      } else {
        statementLink.appendChild(document.createTextNode(' Statement'));
      }
    });
  }

  function bindControlPanel(root) {
    const menu = root.querySelector('#controlPanelMenu');
    if (!menu || menu.dataset.sidebarControlBound === 'true') return;

    const trigger = Array.from(menu.children).find((element) => element.matches('a'));
    const submenu = Array.from(menu.children).find((element) => element.matches('ul.child_menu'));
    if (!trigger || !submenu) return;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = menu.classList.toggle('active');
      submenu.style.display = isOpen ? 'block' : 'none';
      const icon = trigger.querySelector('.fa-chevron-down, .fa-chevron-up');
      if (icon) {
        icon.classList.toggle('fa-chevron-down', !isOpen);
        icon.classList.toggle('fa-chevron-up', isOpen);
      }
    });

    menu.dataset.sidebarControlBound = 'true';
  }

  function pageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function analyticsPrefix(menu) {
    const existingLink = menu?.querySelector('a[href$="analytics.html"]');
    const href = existingLink?.getAttribute('href') || '';
    return href.endsWith('../analytics.html') ? '../' : '';
  }

  function ensureAnalyticsMenu(root) {
    const sideMenu = root.querySelector('ul.nav.side-menu');
    if (!sideMenu) return;

    let menu = root.querySelector('#analyticsMenu');
    if (!menu) {
      const analyticsLink = sideMenu.querySelector('a[href$="analytics.html"]');
      menu = analyticsLink?.closest('li') || document.createElement('li');
      menu.id = 'analyticsMenu';
      if (!menu.parentNode) {
        const promoLink = sideMenu.querySelector('a[href$="special_promo.html"]');
        sideMenu.insertBefore(menu, promoLink ? promoLink.closest('li') : null);
      }
    }

    const prefix = analyticsPrefix(menu);
    const current = pageName();
    const analyticsPages = new Set(['analytics.html', 'room_nights.html', 'check_invoices.html']);
    menu.innerHTML = [
      '<a><i class="fa fa-bar-chart"></i> Analytics <span class="fa fa-chevron-down"></span></a>',
      '<ul class="nav child_menu">',
      `<li${current === 'analytics.html' ? ' class="current-page"' : ''}><a href="${prefix}analytics.html">Dashboard</a></li>`,
      `<li${current === 'room_nights.html' ? ' class="current-page"' : ''}><a href="${prefix}room_nights.html">Room Nights</a></li>`,
      `<li${current === 'check_invoices.html' ? ' class="current-page"' : ''}><a href="${prefix}check_invoices.html">Check Invoice</a></li>`,
      '</ul>'
    ].join('');
    menu.classList.toggle('active', analyticsPages.has(current));
    const submenu = menu.querySelector('ul.child_menu');
    submenu.style.display = analyticsPages.has(current) ? 'block' : 'none';
    menu.dataset.analyticsMenuReady = 'true';
  }

  function bindAnalytics(root) {
    const menu = root.querySelector('#analyticsMenu');
    if (!menu || menu.dataset.sidebarAnalyticsBound === 'true') return;
    const trigger = Array.from(menu.children).find((element) => element.matches('a'));
    const submenu = Array.from(menu.children).find((element) => element.matches('ul.child_menu'));
    if (!trigger || !submenu) return;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = submenu.style.display !== 'block';
      menu.classList.toggle('active', isOpen);
      submenu.style.display = isOpen ? 'block' : 'none';
      const icon = trigger.querySelector('.fa-chevron-down, .fa-chevron-up');
      if (icon) {
        icon.classList.toggle('fa-chevron-down', !isOpen);
        icon.classList.toggle('fa-chevron-up', isOpen);
      }
    });
    menu.dataset.sidebarAnalyticsBound = 'true';
  }

  function ensureOperationsLink(root) {
    const sideMenu = root.querySelector('ul.nav.side-menu');
    if (!sideMenu || sideMenu.querySelector('a[href$="operations.html"]')) return;

    const item = document.createElement('li');
    if (window.location.pathname.endsWith('/operations.html')) {
      item.className = 'active current-page';
    }
    item.innerHTML = '<a href="operations.html"><i class="fa fa-tasks"></i> Operations</a>';

    const analyticsItem = root.querySelector('#analyticsMenu');
    if (analyticsItem) {
      sideMenu.insertBefore(item, analyticsItem);
    } else {
      const promoLink = sideMenu.querySelector('a[href$="special_promo.html"]');
      sideMenu.insertBefore(item, promoLink ? promoLink.closest('li') : null);
    }
  }

  function init() {
    const root = document.getElementById('sidebar-menu');
    if (!root) return;

    const refresh = () => {
      bindControlPanel(root);
      updateStatementLabel(root);
      ensureOperationsLink(root);
      const analyticsMenu = root.querySelector('#analyticsMenu');
      if (!analyticsMenu || analyticsMenu.dataset.analyticsMenuReady !== 'true') {
        ensureAnalyticsMenu(root);
      }
      bindAnalytics(root);
    };

    refresh();
    new MutationObserver(refresh).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
