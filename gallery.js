// Mythos Gallery — GitHub Pages Comic Viewer
// Supports LTR (American comic) and RTL (manga) reading directions
(function() {
  'use strict';

  const BASE = document.querySelector('base')?.href || window.location.pathname.replace(/\/[^/]*$/, '/');
  const APP = document.getElementById('app');
  const TITLE = document.getElementById('page-title');

  // ── Reading direction state ──
  // Can be overridden per-chapter by data in projects.json, or toggled by user
  let globalReadingDir = 'ltr'; // default: American comics LTR

  // ── Router ──
  function getRoute() {
    const hash = window.location.hash.slice(1) || '';
    const parts = hash.split('/').filter(Boolean);
    return { project: parts[0] || null, chapter: parts[1] || null, page: parts[2] || null };
  }

  function navigate(hash) {
    window.location.hash = hash;
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
      else if (k === 'disabled' || k === 'readOnly') { e[k] = v; }
      else e.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  function createArrow(direction, readingDir) {
    // direction: 'prev' or 'next'
    // readingDir: 'ltr' or 'rtl'
    // For LTR: prev = left arrow, next = right arrow
    // For RTL: prev = right arrow, next = left arrow
    const isLTR = readingDir === 'ltr';
    const isPrev = direction === 'prev';
    // In LTR: prev on left, next on right. In RTL: reversed
    const onLeft = isLTR ? isPrev : !isPrev;
    const label = isPrev ? 'Previous page' : 'Next page';

    const arrow = el('div', {
      className: `page-arrow ${direction} ${onLeft ? 'left' : 'right'}`,
      title: label,
      'aria-label': label
    });

    // SVG arrow
    arrow.innerHTML = onLeft
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,4 7,12 15,20"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9,4 17,12 9,20"/></svg>`;

    return arrow;
  }

  function createDirToggle(currentDir, onChange) {
    const isLTR = currentDir === 'ltr';
    const toggle = el('button', {
      className: 'dir-toggle',
      title: `Reading direction: ${isLTR ? 'Left-to-Right' : 'Right-to-Left'} (click to switch)`,
      'aria-label': 'Toggle reading direction',
      onClick: onChange
    });

    toggle.appendChild(el('span', { className: 'dir-label' }, isLTR ? 'LTR' : 'RTL'));

    // Direction arrows
    const arrowRow = el('span', { className: 'dir-arrows' });
    if (isLTR) {
      arrowRow.innerHTML = `<span class="dir-arr">→</span>`;
    } else {
      arrowRow.innerHTML = `<span class="dir-arr">←</span>`;
    }
    toggle.appendChild(arrowRow);

    return toggle;
  }

  // ── Screens ──
  function renderHome(projects) {
    const list = el('div', { className: 'project-list' });
    for (const p of projects) {
      const chapters = el('div', { className: 'chapter-list' });
      for (const ch of p.chapters || []) {
        // Determine reading direction from chapter data
        const dir = ch.readingDirection || 'ltr';
        const dirIcon = dir === 'ltr' ? '→' : '←';
        chapters.appendChild(
          el('a', { className: 'chapter-link', href: `#/${p.slug}/${ch.slug}` },
            `${ch.title} ${dirIcon}`
          )
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

    // Use chapter's reading direction, fallback to global default
    const readingDir = chapter.readingDirection || globalReadingDir;

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

    // Navigation bar with direction toggle
    const navBar = el('div', { className: 'nav-bar' },
      el('button', {
        className: 'nav-btn',
        disabled: pageIndex === 0,
        onClick: () => navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex}`)
      }, readingDir === 'ltr' ? '◀ Prev' : 'Next ▶'),
      el('span', { className: 'page-info' }, `Page ${pageIndex + 1} of ${total}`),
      el('button', {
        className: 'nav-btn',
        disabled: pageIndex >= total - 1,
        onClick: () => navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex + 2}`)
      }, readingDir === 'ltr' ? 'Next ▶' : '◀ Prev')
    );
    viewer.appendChild(navBar);

    // Direction toggle
    viewer.appendChild(
      createDirToggle(readingDir, () => {
        // Toggle reading direction for this chapter
        chapter.readingDirection = readingDir === 'ltr' ? 'rtl' : 'ltr';
        // Re-render at same page
        renderChapter(projects, projectSlug, chapterSlug, pageIndex + 1);
      })
    );

    // Image wrapper with click zones and arrows
    const imgWrapper = el('div', { className: 'img-wrapper' });

    const img = el('img', {
      className: 'page-image',
      src: page.image,
      alt: `Page ${pageIndex + 1}: ${page.caption || ''}`,
      draggable: false
    });
    imgWrapper.appendChild(img);

    // Arrow overlays (visible on hover)
    if (pageIndex > 0) {
      imgWrapper.appendChild(createArrow('prev', readingDir));
    }
    if (pageIndex < total - 1) {
      imgWrapper.appendChild(createArrow('next', readingDir));
    }

    // Click zones on the image itself
    imgWrapper.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const third = width / 3;
      const isLTR = readingDir === 'ltr';

      if (x < third) {
        // Left third
        const prevTarget = isLTR ? pageIndex : pageIndex + 2;
        if (isLTR && pageIndex > 0) {
          navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex}`);
        } else if (!isLTR && pageIndex < total - 1) {
          navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex + 2}`);
        }
      } else if (x > width - third) {
        // Right third
        if (isLTR && pageIndex < total - 1) {
          navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex + 2}`);
        } else if (!isLTR && pageIndex > 0) {
          navigate(`#/${projectSlug}/${chapterSlug}/${pageIndex}`);
        }
      }
    });

    viewer.appendChild(imgWrapper);

    // Caption
    if (page.caption) {
      viewer.appendChild(el('p', { className: 'page-caption' }, page.caption));
    }

    // Reading direction badge
    const dirBadge = el('div', { className: 'dir-badge' },
      `Reading: ${readingDir === 'ltr' ? 'Left→Right' : 'Right→Left'}`
    );
    viewer.appendChild(dirBadge);

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
      const dir = ch.readingDirection || 'ltr';
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
          el('p', {}, `${ch.pages.length} pages — ${dir === 'ltr' ? 'LTR' : 'RTL'}`),
          thumbGrid,
          el('div', { style: { marginTop: '8px' } },
            el('a', { className: 'chapter-link', href: `#/${projectSlug}/${ch.slug}/1` }, `Read Full Chapter ${dir === 'ltr' ? '→' : '←'}`)
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
