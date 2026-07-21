(() => {
  'use strict';

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('is-open', !open);
    });
    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        navToggle.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });
  }

  const documentRoot = document.querySelector('.document[data-pdf]');
  const pdfAction = document.querySelector('.pdf-download');
  if (documentRoot && pdfAction) {
    const pdfPath = documentRoot.dataset.pdf;
    pdfAction.href = pdfPath;
    pdfAction.setAttribute('download', pdfPath.split('/').pop());
  }
})();
