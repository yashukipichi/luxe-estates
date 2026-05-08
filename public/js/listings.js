/* ============================================================
   LUXE ESTATES — listings.js
   Fetches properties from /api/properties with:
   ▸ Filters: type, bhk, status, badge, locality, budget, q
   ▸ Sort: price-asc | price-desc | area-desc | newest
   ▸ Pagination: server-side, 9 per page
   ▸ Grid / List view toggle
   ▸ Property cards are clickable — navigate to property.html?id=:id
   No hardcoded property data.
   ============================================================ */

(function () {
  'use strict';

  const API       = window.location.origin;
  const PER_PAGE  = 9;

  /* ── State ── */
  let currentPage   = 1;
  let currentView   = 'grid';
  let activeStatus  = 'all';   // all | sale | underconstruction
  let activeBadge   = 'all';   // all | new | featured | premium
  let isLoading     = false;

  /* ── DOM refs — assigned after DOMContentLoaded ── */
  let grid, emptyState, resultCount, paginationEl;
  let searchInput, filterType, filterBhk, filterBudget, filterSort;

  /* ── Read URL params on first load ── */
  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      q:      p.get('q')      || '',
      type:   p.get('type')   || '',
      status: p.get('status') || '',   // for-sale / underconstruction
      badge:  p.get('badge')  || ''    // new / featured / premium
    };
  }

  /* ── Build query string from current UI state ── */
  function buildQuery() {
    const q      = searchInput.value.trim();
    const type   = filterType.value;
    const bhk    = filterBhk.value;
    const budget = filterBudget.value;
    const sort   = filterSort.value || 'newest';

    const params = new URLSearchParams();
    params.set('page',  currentPage);
    params.set('limit', PER_PAGE);
    params.set('sort',  sort);

    if (q)    params.set('q',    q);
    if (type) params.set('type', type);
    if (bhk)  params.set('bhk',  bhk);

    /* Status filter (sale / underconstruction) — sent as 'status' to API */
    if (activeStatus !== 'all') params.set('status', activeStatus);

    /* Badge filter (new / featured / premium) — sent as 'badge' to API */
    if (activeBadge !== 'all') params.set('badge', activeBadge);

    if (budget) {
      const parts = budget.split('-');
      params.set('minPrice', parts[0]);
      params.set('maxPrice', parts[1]);
    }

    return params;
  }

  /* ── Fetch & render ── */
  async function loadProperties() {
    if (isLoading) return;
    isLoading = true;
    showSkeleton();

    try {
      const res  = await fetch(`${API}/api/properties?${buildQuery()}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      render(data.properties, data.pagination);
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:1rem">⚠️</div>
        <p>Could not load properties. Is the server running?</p>
        <p style="font-size:0.78rem;margin-top:0.5rem">${err.message}</p>
      </div>`;
      paginationEl.innerHTML = '';
      resultCount.textContent = '';
    } finally {
      isLoading = false;
    }
  }

  /* ── Render cards ── */
  function render(properties, pagination) {
    /* Result count */
    resultCount.textContent = `Showing ${pagination.total} propert${pagination.total === 1 ? 'y' : 'ies'}`;

    emptyState.style.display = 'none';

    if (!properties.length) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      paginationEl.innerHTML   = '';
      return;
    }

    if (currentView === 'list') {
      grid.style.gridTemplateColumns = '1fr';
      grid.innerHTML = properties.map(renderListCard).join('');
    } else {
      grid.style.gridTemplateColumns = '';
      grid.innerHTML = properties.map(p => renderGridCard(p)).join('');
    }

    renderPagination(pagination);
  }

  /* ── Badge label helper ── */
  function getBadgeLabel(p) {
    if (p.status === 'underconstruction') return 'Under Construction';
    if (p.badge === 'new')               return 'New Launch';
    if (p.badge === 'featured')          return 'Featured';
    if (p.badge === 'premium')           return 'Premium';
    return 'For Sale';
  }

  function getBadgeClass(p) {
    if (p.status === 'underconstruction') return 'badge-underconstruction';
    if (p.badge)                          return `badge-${p.badge}`;
    return 'badge-sale';
  }

  /* ── Grid-view card (clickable — navigates to property detail page) ── */
  function renderGridCard(p) {
    const badgeLabel = getBadgeLabel(p);
    const badgeClass = getBadgeClass(p);
    const propId = p._id || p.id;

    const amenitiesHtml = (p.amenities && p.amenities.length)
      ? `<div class="card-amenities">
          ${p.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('')}
        </div>`
      : '';

    return `
    <div class="property-card" style="cursor:pointer" data-id="${propId}"
         onclick="window.location.href='property.html?id=${propId}'"
         onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.5)'"
         onmouseleave="this.style.transform='';this.style.boxShadow=''"
         role="link" tabindex="0" aria-label="View ${p.title}"
         onkeydown="if(event.key==='Enter'||event.key===' ')window.location.href='property.html?id=${propId}'"
         style="cursor:pointer;transition:transform 0.22s ease,box-shadow 0.22s ease">
      <div class="card-image">
        <img src="${p.img}" alt="${p.title}" loading="lazy">
        <span class="card-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="card-body">
        <div class="card-price">${p.price}</div>
        <div class="card-title">${p.title}</div>
        <div class="card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21c-4-4-7-7.75-7-11a7 7 0 0 1 14 0c0 3.25-3 7-7 11z"/>
            <circle cx="12" cy="10" r="2"/>
          </svg>
          ${p.locality}, ${p.city}
        </div>
        <div class="card-meta">
          <div class="card-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            ${p.bhk} BHK
          </div>
          <div class="card-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
            ${p.baths} Bath
          </div>
          <div class="card-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            ${p.area} sq.ft
          </div>
        </div>
        ${amenitiesHtml}
      </div>
    </div>`;
  }

  /* ── List-view card (clickable — navigates to property detail page) ── */
  function renderListCard(p) {
    const badgeLabel = getBadgeLabel(p);
    const badgeClass = getBadgeClass(p);
    const propId = p._id || p.id;

    return `
    <div class="property-card"
         style="display:grid;grid-template-columns:260px 1fr;min-height:160px;cursor:pointer;transition:transform 0.22s ease,box-shadow 0.22s ease"
         data-id="${propId}"
         onclick="window.location.href='property.html?id=${propId}'"
         onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 32px rgba(0,0,0,0.45)'"
         onmouseleave="this.style.transform='';this.style.boxShadow=''"
         role="link" tabindex="0" aria-label="View ${p.title}"
         onkeydown="if(event.key==='Enter'||event.key===' ')window.location.href='property.html?id=${propId}'">
      <div class="card-image" style="height:160px">
        <img src="${p.img}" alt="${p.title}" loading="lazy" style="height:100%;object-fit:cover">
        <span class="card-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="card-price">${p.price}</div>
          <div class="card-title" style="white-space:normal">${p.title}</div>
          <div class="card-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21c-4-4-7-7.75-7-11a7 7 0 0 1 14 0c0 3.25-3 7-7 11z"/>
              <circle cx="12" cy="10" r="2"/>
            </svg>
            ${p.locality}, ${p.city}
          </div>
        </div>
        <div class="card-meta">
          <div class="card-meta-item">${p.bhk} BHK</div>
          <div class="card-meta-item">${p.baths} Bath</div>
          <div class="card-meta-item">${p.area} sq.ft</div>
        </div>
      </div>
    </div>`;
  }

  /* ── Skeleton loader ── */
  function showSkeleton() {
    const skeletons = Array(PER_PAGE).fill(0).map(() => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;animation:shimmer 1.4s infinite">
        <div style="height:200px;background:rgba(255,255,255,0.04)"></div>
        <div style="padding:1.25rem">
          <div style="height:0.9rem;background:rgba(255,255,255,0.06);border-radius:4px;margin-bottom:0.6rem;width:40%"></div>
          <div style="height:1.1rem;background:rgba(255,255,255,0.06);border-radius:4px;margin-bottom:0.4rem;width:75%"></div>
          <div style="height:0.8rem;background:rgba(255,255,255,0.04);border-radius:4px;width:55%"></div>
        </div>
      </div>`).join('');

    grid.style.gridTemplateColumns = '';
    grid.innerHTML = skeletons;
  }

  /* ── Pagination ── */
  function renderPagination(p) {
    if (p.totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const btns = [];

    btns.push(`<button class="page-btn ${!p.hasPrev ? 'disabled' : ''}"
      onclick="goToPage(${p.page - 1})" ${!p.hasPrev ? 'disabled' : ''}>
      ‹ Prev
    </button>`);

    const range = buildPageRange(p.page, p.totalPages);
    range.forEach(n => {
      if (n === '…') {
        btns.push(`<span class="page-ellipsis">…</span>`);
      } else {
        btns.push(`<button class="page-btn ${n === p.page ? 'active' : ''}" onclick="goToPage(${n})">${n}</button>`);
      }
    });

    btns.push(`<button class="page-btn ${!p.hasNext ? 'disabled' : ''}"
      onclick="goToPage(${p.page + 1})" ${!p.hasNext ? 'disabled' : ''}>
      Next ›
    </button>`);

    paginationEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:0.4rem;flex-wrap:wrap;margin-top:3rem">
        ${btns.join('')}
      </div>
      <p style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem">
        Page ${p.page} of ${p.totalPages} · ${p.total} properties
      </p>`;
  }

  function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const range = [1];
    if (current > 3) range.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) range.push(i);
    if (current < total - 2) range.push('…');
    range.push(total);
    return range;
  }

  window.goToPage = function (n) {
    currentPage = n;
    loadProperties();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Filter change ── */
  function onFilterChange() {
    currentPage = 1;
    loadProperties();
  }

  /* ── Clear all filters ── */
  window.clearFilters = function () {
    searchInput.value  = '';
    filterType.value   = '';
    filterBhk.value    = '';
    filterBudget.value = '';
    filterSort.value   = '';
    activeStatus       = 'all';
    activeBadge        = 'all';
    currentPage        = 1;
    document.querySelectorAll('[data-badge]').forEach(t =>
      t.classList.toggle('active', t.dataset.badge === 'all'));
    history.replaceState({}, '', 'listings.html');
    loadProperties();
  };

  /* ── Update active tag highlights ── */
  function updateTagHighlight() {
    document.querySelectorAll('[data-badge]').forEach(t => {
      const val = t.dataset.badge;
      let isActive = false;
      if (val === 'all')               isActive = activeStatus === 'all' && activeBadge === 'all';
      else if (val === 'sale')         isActive = activeStatus === 'sale';
      else if (val === 'underconstruction') isActive = activeStatus === 'underconstruction';
      else                             isActive = activeBadge === val;
      t.classList.toggle('active', isActive);
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', () => {
    grid         = document.getElementById('listings-grid');
    emptyState   = document.getElementById('empty-state');
    resultCount  = document.getElementById('result-count');
    paginationEl = document.getElementById('pagination');
    searchInput  = document.getElementById('search-input');
    filterType   = document.getElementById('filter-type');
    filterBhk    = document.getElementById('filter-bhk');
    filterBudget = document.getElementById('filter-budget');
    filterSort   = document.getElementById('filter-sort');

    if (!grid) return; /* Not on listings page */

    /* Apply URL params */
    const params = getParams();
    if (params.q)    searchInput.value = params.q;
    if (params.type) filterType.value  = params.type;

    /* Handle ?status= param (from footer links like "For Sale", "Under Construction") */
    if (params.status) {
      activeStatus = params.status;
      activeBadge  = 'all';
      updateTagHighlight();
    }

    /* Handle ?badge= param (from footer links like "New Launches") */
    if (params.badge) {
      activeBadge  = params.badge;
      activeStatus = 'all';
      updateTagHighlight();
    }

    /* Default highlight if nothing set */
    if (!params.status && !params.badge) {
      updateTagHighlight();
    }

    /* Event listeners */
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(onFilterChange, 350);
    });

    [filterType, filterBhk, filterBudget, filterSort].forEach(el =>
      el.addEventListener('change', onFilterChange));

    /* Badge / Status filter tag clicks */
    document.querySelectorAll('[data-badge]').forEach(tag =>
      tag.addEventListener('click', function () {
        const val = this.dataset.badge;

        /* Reset both */
        activeStatus = 'all';
        activeBadge  = 'all';

        if (val === 'sale')               activeStatus = 'sale';
        else if (val === 'underconstruction') activeStatus = 'underconstruction';
        else if (val !== 'all')           activeBadge  = val;

        updateTagHighlight();
        onFilterChange();
      })
    );

    /* View toggle */
    document.querySelectorAll('.view-btn').forEach(btn =>
      btn.addEventListener('click', function () {
        currentView = this.dataset.view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadProperties();
      })
    );

    /* Initial load */
    loadProperties();
  });
})();