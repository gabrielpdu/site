// Theme management for CamargoTech (Dark / Light mode)
export function initTheme() {
  const STORAGE_KEY = 'camargotech_theme';
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);

  const toggleBtns = document.querySelectorAll('[data-theme-toggle]');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      updateThemeIcons(next);
    });
  });

  updateThemeIcons(currentTheme);
}

function updateThemeIcons(theme: string) {
  const sunIcons = document.querySelectorAll('.theme-sun');
  const moonIcons = document.querySelectorAll('.theme-moon');

  if (theme === 'dark') {
    sunIcons.forEach(el => el.classList.remove('hidden'));
    moonIcons.forEach(el => el.classList.add('hidden'));
  } else {
    sunIcons.forEach(el => el.classList.add('hidden'));
    moonIcons.forEach(el => el.classList.remove('hidden'));
  }
}
