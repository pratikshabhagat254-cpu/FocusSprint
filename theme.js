// theme.js
// handles switching between night mode and day mode
// saves preference so it sticks after refresh

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEYS.theme, theme);

  // show the right icon on the toggle button
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.title = theme === 'night' ? 'Switch to Day Mode' : 'Switch to Night Mode';
  }
}

function loadTheme() {
  const saved = localStorage.getItem(KEYS.theme) || 'night';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'night';
  applyTheme(current === 'night' ? 'day' : 'night');
}

// wire up the button once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  const btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', toggleTheme);
});