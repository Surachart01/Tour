(function () {
  function updateStatementLabel(root) {
    const statementLink = root.querySelector('a[href="payment.html"]');
    if (!statementLink) return;
    const textNode = Array.from(statementLink.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode && textNode.textContent.trim() !== 'Statement') textNode.textContent = ' Statement';
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

  function init() {
    const root = document.getElementById('sidebar-menu');
    if (!root) return;

    const refresh = () => {
      bindControlPanel(root);
      updateStatementLabel(root);
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
