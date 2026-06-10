// Mythos Gallery — GitHub Pages Comic Viewer
(function() {
  'use strict';

  const BASE = document.querySelector('base')?.href || window.location.pathname.replace(/\/[^/]*$/, '/');
  const APP = document.getElementById('app');
  const TITLE = document.getElementById('page-title');

  // ── Router ──
  function getRoute() {
    const hash = window.location.hash.slice(1) || '';
    const parts = hash.split('/').filter(Boolean);
    return { project: parts[0] || null, chapter: parts[1] || null, page: parts[2] || null };
  }

  function navigate(hash) {
    window.location.hash = hash;
    render();
  }

  // ── Helpers ──
  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return res.json();
  }

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  // ── Screens ──
  function renderHome(projects) {
    const list = el('div', { className: 'project-list' });
    for (const p of projects) {
      const chapters = el('div', { className: 'chapter-list' });
      for (const ch of p.chapters || []) {
        chapters.appendChild(
          el('a', { className: 'chapter-link', href: `#/${p.slug}/${ch.slug}` }, ch.title)
        );
      }
      list.appendChild(
        el('div', { className: 'project-card' },
          el('h2', {}, p.name),
          el('p', {}, p.description || ''),
          chapters
        )
      );
    }
    APP.innerHTML = '';
    APP.appendChild(list);
    TITLE.textContent = 'Mythos Gallery';
  }

  function renderChapter(projects, projectSlug, chapterSlug, pageNum) {
    const project = projects.find(p => p.slug === projectSlug);
    if (!project) { renderHome(projects); return; }
    const chapter = project.chapters?.find(c => c.slug === chapterSlug);
    if (!chapter) { renderHome(projects); return; }

    const pageIndex = Math.max(0, Math.min((parseInt(pageNum) || 1) - 1, chapter.pages.length - 1));
    const page = chapter.pages[pageIndex];
    const total = chapter.pages.length;

    TITLE.textContent = `${chapter.title} — Page ${pageIndex + 1}`;
    APP.innerHTML = '';

    // Breadcrumb
    APP.appendChild(
      el('div', { className: 'breadcrumb' },
        el('a', { href: '#/' }, 'Gallery'),
        ` / ${project.name} / ${el('a', { href: `#/${projectSlug}` }, chapter.title)}`
      )
    );

    // Viewer
    const viewer = el('div', { className: 'viewer-container' });

    // Navigation bar
    const navBar = el('div', { className: 'nav-bar' },
      el('button', {
        className: 'nav-btn',
        disabled: pageIndex === 0,
        onClick: () => navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex}`)
      }, '◀ Prev'),
      el('span', { className: 'page-info' }, `Page ${pageIndex + 1} of ${total}`),
      el('button', {
        className: 'nav-btn',
        disabled: pageIndex >= total - 1,
        onClick: () => navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex + 2}`)
      }, 'Next ▶')
    );
    viewer.appendChild(navBar);

    // Page image
    const img = el('img', {
      className: 'page-image',
      src: page.image,
      alt: `Page ${pageIndex + 1}: ${page.caption || ''}`,
      onClick: () => window.open(page.imageFull || page.image, '_blank')
    });
    viewer.appendChild(img);

    // Caption
    if (page.caption) {
      viewer.appendChild(el('p', { className: 'page-info' }, page.caption));
    }

    // Page dots
    const dots = el('div', { className: 'page-nav' });
    for (let i = 0; i < total; i++) {
      dots.appendChild(
        el('button', {
          className: 'page-dot' + (i === pageIndex ? ' active' : ''),
          onClick: () => navigate(`#/${projectSlug}/${chapterSlug}/${i + 1}`)
        }, `${i + 1}`)
      );
    }
    viewer.appendChild(dots);

    // Share link
    const shareUrl = window.location.href;
    viewer.appendChild(
      el('div', {},
        el('input', {
          className: 'share-link',
          type: 'text',
          value: shareUrl,
          readOnly: true,
          onClick: function() { this.select(); navigator.clipboard?.writeText(this.value); }
        })
      )
    );

    APP.appendChild(viewer);
  }

  function renderChapterThumbs(projects, projectSlug) {
    const project = projects.find(p => p.slug === projectSlug);
    if (!project) { renderHome(projects); return; }
    const chapters = project.chapters || [];

    APP.innerHTML = '';
    APP.appendChild(
      el('div', { className: 'breadcrumb' },
        el('a', { href: '#/' }, 'Gallery'),
        ` / ${project.name}`
      )
    );

    const grid = el('div', { className: 'project-list' });
    for (const ch of chapters) {
      const thumbGrid = el('div', { className: 'thumb-grid' });
      const previews = ch.pages.slice(0, 4);
      for (const pg of previews) {
        thumbGrid.appendChild(
          el('a', { className: 'thumb-item', href: `#/${projectSlug}/${ch.slug}/1` },
            el('img', { src: pg.thumb || pg.image, alt: '', loading: 'lazy' }),
            el('span', {}, `Page ${pg.num}`)
          )
        );
      }
      grid.appendChild(
        el('div', { className: 'project-card' },
          el('h2', {}, ch.title),
          el('p', {}, `${ch.pages.length} pages`),
          thumbGrid,
          el('div', { style: { marginTop: '8px' } },
            el('a', { className: 'chapter-link', href: `#/${projectSlug}/${ch.slug}/1` }, 'Read Full Chapter →')
          )
        )
      );
    }
    APP.appendChild(grid);
    TITLE.textContent = project.name;
  }

  // ── Main render ──
  async function render() {
    try {
      const data = await fetchJSON('projects.json');
      const projects = data.projects || [];
      const route = getRoute();

      if (!route.project) {
        renderHome(projects);
      } else if (route.project && !route.chapter) {
        renderChapterThumbs(projects, route.project);
      } else {
        renderChapter(projects, route.project, route.chapter, route.page);
      }
    } catch (err) {
      APP.innerHTML = `<p style="color:var(--accent);padding:24px;">Error loading gallery: ${err.message}</p>`;
      TITLE.textContent = 'Error';
    }
  }

  // ── Boot ──
  window.addEventListener('hashchange', render);
  render();
})();
