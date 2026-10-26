const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const mobileNavigation = document.querySelector('.mobile-navigation');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  mobileNavigation.hidden = true;
}
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
  mobileNavigation.hidden = expanded;
});
mobileNavigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNavigation.hidden) { closeMenu(); menuButton.focus(); }
});
document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
matchMedia('(min-width: 801px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
function syncScroll() { header.classList.toggle('is-scrolled', scrollY > 30); }
addEventListener('scroll', syncScroll, { passive: true });
syncScroll();
const links = document.querySelectorAll('.nav-link');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(link => {
      const active = link.hash === '#' + entry.target.id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
document.querySelectorAll('main>section[id]').forEach(section => observer.observe(section));
document.querySelectorAll('svg.icon').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
