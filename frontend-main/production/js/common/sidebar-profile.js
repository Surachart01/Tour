/**
 * Minimal sidebar identity helper for pages that do not contain the full
 * profile form. It intentionally uses only locally stored display values.
 */
document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username') || 'User';

  ['profileName', 'navProfileName'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = username;
  });
});
