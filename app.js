(() => {
  'use strict';

  // Retire the standalone founder decision artifact everywhere, including older document markup.
  const retiredArtifactName = ['Founder', 'Operating', 'Contract'].join(' ');
  const retiredArtifactRoute = ['founder', 'operating', 'contract.html'].join('-');
  document.querySelectorAll(`a[href="${retiredArtifactRoute}"]`).forEach((link) => {
    link.href = 'interview-brief.html';
    link.textContent = 'Open the interview thesis';
  });

  document.querySelectorAll('p, li, strong, span').forEach((node) => {
    if (!node.childElementCount && node.textContent.includes(retiredArtifactName)) {
      node.textContent = node.textContent.replaceAll(retiredArtifactName, 'decision-rights charter');
    }
  });

  const artifactParagraph = Array.from(document.querySelectorAll('.letter-body p')).find((node) =>
    node.textContent.includes(`proposed ${retiredArtifactName}`) || node.textContent.includes('proposed decision-rights charter')
  );
  if (artifactParagraph) {
    artifactParagraph.innerHTML = 'I created a role-specific candidate vision at <a href="https://russelldudek.github.io/MDC/">https://russelldudek.github.io/MDC/</a>. It makes my reasoning visible through a continuously running Operating Attractor Field, an operating stress test, a first-year scorecard, and a 120-day entry plan. These are hypotheses for discovery, not claims about the confidential client\'s undisclosed processes.';
  }

  ['campaign-polish.css', 'document-screen.css'].forEach((href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.media = 'screen';
    link.href = href;
    document.head.appendChild(link);
  });

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

  const pageName = document.body.dataset.route || window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.doc-actions a').forEach((link) => {
    const href = link.getAttribute('href');
    if (pageName === 'resume.html' && href === 'cover-letter.html') link.textContent = 'View cover letter';
    if (pageName === 'cover-letter.html' && href === 'resume.html') link.textContent = 'View resume';
    if ((pageName === 'resume.html' && href === 'resume.html') || (pageName === 'cover-letter.html' && href === 'cover-letter.html')) link.remove();
  });

  const questionList = document.querySelector('.questions-list');
  if (questionList) {
    Array.from(questionList.children).forEach((item, index) => {
      if (item.classList.contains('question-card')) return;
      const number = item.querySelector('span')?.textContent?.trim() || String(index + 1).padStart(2, '0');
      const text = item.textContent.replace(number, '').trim();
      const article = document.createElement('article');
      article.className = 'question-card';
      const marker = document.createElement('span');
      marker.className = 'question-number';
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = number;
      const copy = document.createElement('p');
      copy.textContent = text;
      article.append(marker, copy);
      item.replaceWith(article);
    });
  }

})();
