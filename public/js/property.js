/* ============================================================
   LUXE ESTATES — property.js
   Renders the full property detail page into #prop-root.
   Features: multi-image gallery, floor plans, Google Map,
             brochure download, EMI calculator.
   ============================================================ */

(function () {
  'use strict';

  const API  = "https://luxe-estates-ztev.onrender.com";
  const root = document.getElementById('prop-root');

  const AMENITY_ICONS = {
    'Swimming Pool':'🏊','Gym':'🏋️','Clubhouse':'🏛️','Covered Parking':'🚗',
    'Parking':'🚗','Private Parking':'🚗','24/7 Security':'🔒','Security':'🔒',
    'Landscaped Garden':'🌿','Private Garden':'🌿','Organic Garden':'🌿',
    'Children Play Area':'🛝','Power Backup':'⚡','Jogging Track':'🏃',
    'Home Theatre':'🎬','Smart Home':'🏠','Concierge Service':'🛎️','Concierge':'🛎️',
    'Private Pool':'🏊','Private Terrace':'🌇','Open Terrace':'🌇',
    'Private Farm':'🌾','Borewell':'💧','Gated Community':'🔐','Rooftop':'🌇',
    'EV Charging':'🔌','Co-working Space':'💻','Amphitheatre':'🎭',
    'Sky Lounge':'🌆','Meditation Garden':'🧘','Squash Court':'🎾',
    'Indoor Games':'🎮','Pet Park':'🐾','Senior Citizen Zone':'👴',
    'Yoga Deck':'🧘','Infinity Pool':'🏊','Helipad':'🚁','Private Lift':'🛗',
  };
  const amenityIcon = n => AMENITY_ICONS[n] || '✦';

  function getBadgeLabel(p) {
    if (p.status === 'underconstruction') return 'Under Construction';
    const m = { new:'New Launch', featured:'Featured', premium:'Premium' };
    return p.badge ? m[p.badge] : 'For Sale';
  }
  function getBadgeClass(p) {
    if (p.status === 'underconstruction') return 'badge-underconstruction';
    return p.badge ? 'badge-'+p.badge : 'badge-sale';
  }

  function esc(s) {
    return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Skeleton ── */
  function renderSkeleton() {
    root.innerHTML = `
      <div style="height:clamp(320px,55vw,580px);background:var(--bg-card);animation:shimmer 1.4s infinite"></div>
      <div class="container" style="padding-top:2.5rem">
        <div class="skel" style="height:14px;width:160px;margin-bottom:2rem"></div>
        <div class="prop-layout">
          <div>
            <div class="skel" style="height:28px;width:60%;margin-bottom:1rem"></div>
            <div class="skel" style="height:14px;width:40%;margin-bottom:2rem"></div>
            <div class="prop-stats">
              ${[1,2,3,4].map(()=>`<div class="prop-stat"><div class="skel" style="height:30px;margin-bottom:.5rem"></div><div class="skel" style="height:10px;width:60%;margin:0 auto"></div></div>`).join('')}
            </div>
            <div class="prop-block"><div class="skel" style="height:12px;width:30%;margin-bottom:1.5rem"></div><div class="skel" style="height:14px;margin-bottom:.75rem"></div><div class="skel" style="height:14px;width:80%"></div></div>
          </div>
          <div><div class="enquiry-card"><div style="padding:2rem"><div class="skel" style="height:200px"></div></div></div></div>
        </div>
      </div>`;
  }

  /* ── Error ── */
  function renderError(msg) {
    root.innerHTML = `
      <div class="container"><div class="prop-error">
        <div style="font-size:3rem;margin-bottom:1rem">🏚️</div>
        <h2 style="font-family:var(--font-body);font-weight:400;margin-bottom:0.75rem">Property Not Found</h2>
        <p style="color:var(--text-muted);margin-bottom:2rem">${msg||'This property may have been removed.'}</p>
        <a href="listings.html" class="btn btn-gold">Browse All Properties</a>
      </div></div>`;
  }

  /* ════════════════════════════════════════════
     HERO GALLERY
  ════════════════════════════════════════════ */
  function buildGallery(p) {
    let slides = [];
    if (p.images && p.images.length) {
      slides = [...p.images];
      if (p.img && !slides.includes(p.img)) slides.unshift(p.img);
    } else {
      slides = [p.img];
    }
    slides = slides.filter(Boolean);
    if (!slides.length) slides = [p.img];

    const multi = slides.length > 1;

    const slidesHTML = slides.map((src,i) => `
      <div class="gallery-slide">
        <img src="${esc(src)}" alt="${esc(p.title)} photo ${i+1}" loading="${i===0?'eager':'lazy'}">
        <div class="gallery-overlay"></div>
      </div>`).join('');

    return `
      <div class="gallery-wrap" id="gallery-root">
        <div class="gallery-track" id="gal-track">${slidesHTML}</div>
        ${multi?`
        <button class="gallery-arrow prev" id="gal-prev" aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="gallery-arrow next" id="gal-next" aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div class="gallery-dots">${slides.map((_,i)=>`<button class="gallery-dot${i===0?' active':''}" data-idx="${i}" aria-label="Slide ${i+1}"></button>`).join('')}</div>
        <div class="gallery-counter" id="gal-counter">1 / ${slides.length}</div>`:''}
      </div>`;
  }

  /* ════════════════════════════════════════════
     FLOOR PLAN
  ════════════════════════════════════════════ */
  function buildFloorPlan(p) {
    const plans = (p.floorPlanImages||[]).filter(Boolean);
    if (!plans.length) return '';
    const multi = plans.length > 1;
    return `
      <div class="prop-block">
        <div class="prop-block-title">Floor Plan</div>
        ${multi?`<div class="fp-tabs">${plans.map((_,i)=>`<button class="fp-tab${i===0?' active':''}" data-fp="${i}">Plan ${i+1}</button>`).join('')}</div>`:''}
        <div class="fp-viewer"><img id="fp-img" src="${esc(plans[0])}" alt="Floor plan 1"></div>
        ${multi?`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;font-size:0.78rem;color:var(--text-muted)">
          <span id="fp-label">Plan 1 of ${plans.length}</span>
          <div style="display:flex;gap:0.5rem">
            <button id="fp-prev" style="padding:0.3rem 0.75rem;border:1px solid var(--border);border-radius:100px;background:none;color:var(--text-muted);cursor:pointer;font-size:0.78rem">← Prev</button>
            <button id="fp-next" style="padding:0.3rem 0.75rem;border:1px solid var(--border);border-radius:100px;background:none;color:var(--text-muted);cursor:pointer;font-size:0.78rem">Next →</button>
          </div>
        </div>`:''}
      </div>`;
  }

  /* ════════════════════════════════════════════
     LOCATION MAP
  ════════════════════════════════════════════ */
  function buildLocationMap(p) {
    const lat = p.locationLat, lng = p.locationLng;
    const hasCoords = lat != null && lng != null;
    const address   = (p.locality||'') + ', ' + (p.city||'Hyderabad') + ', India';
    const query     = hasCoords ? lat+','+lng : encodeURIComponent(address);
    const mapsLink  = hasCoords
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    return `
      <div class="prop-block">
        <div class="prop-block-title">Location</div>
        <div class="location-map-wrap">
          <iframe src="https://maps.google.com/maps?q=${query}&z=15&output=embed"
            allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            title="Property location"></iframe>
        </div>
        <div class="map-footer">
          <div class="map-address">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${esc(p.locality)}, ${esc(p.city)}${hasCoords?` (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`:''}
          </div>
          <a href="${mapsLink}" target="_blank" rel="noopener" class="map-open-link">Open in Google Maps ↗</a>
        </div>
      </div>`;
  }

  /* ════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════ */
  function renderProperty(p) {
    document.title = `${p.title} — Luxe Estates`;

    const backHref  = document.referrer.includes('listings')?'listings.html':document.referrer.includes('index')?'index.html':'listings.html';
    const backLabel = backHref==='index.html'?'Home':'All Listings';
    const badgeLabel= getBadgeLabel(p);
    const badgeClass= getBadgeClass(p);

    const plans = (p.floorPlanImages||[]).filter(Boolean);

    const amenitiesHTML = (p.amenities&&p.amenities.length) ? `
      <div class="prop-block">
        <div class="prop-block-title">Amenities</div>
        <div class="amenities-grid">
          ${p.amenities.map(a=>`<div class="amenity-chip"><span class="amenity-icon">${amenityIcon(a)}</span><span>${esc(a)}</span></div>`).join('')}
        </div>
      </div>` : '';

    const brochureHTML = p.brochureUrl ? `
      <a href="${esc(p.brochureUrl)}" target="_blank" rel="noopener" download class="brochure-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Brochure (PDF)
      </a>` : '';

    root.innerHTML = `
      <div class="container">
        <div style="padding-top:5.5rem;padding-bottom:0.5rem">
          <a href="${backHref}" class="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to ${backLabel}
          </a>
        </div>

        <div class="prop-layout">
          <div>
            <!-- Title -->
            <div style="margin-bottom:1.5rem">
              <h1 style="font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:0.5rem">${esc(p.title)}</h1>
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.5rem;color:var(--text-muted);font-size:0.88rem">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                ${esc(p.locality)}, ${esc(p.city)}
                <span style="color:var(--border-strong)">·</span>
                <span class="rera-pill">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                  </svg>
                  RERA: ${esc(p.rera)}
                </span>
                <span class="${badgeClass}" style="font-size:0.68rem;padding:0.2rem 0.65rem;border-radius:4px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">${badgeLabel}</span>
              </div>
            </div>

            <!-- Gallery (after title) -->
            ${buildGallery(p)}

            <!-- Stats -->
            <div class="prop-stats">
              <div class="prop-stat"><div class="prop-stat-val">${p.bhk}</div><div class="prop-stat-label">BHK</div></div>
              <div class="prop-stat"><div class="prop-stat-val">${p.baths}</div><div class="prop-stat-label">Bathrooms</div></div>
              <div class="prop-stat"><div class="prop-stat-val">${p.area.toLocaleString()}</div><div class="prop-stat-label">Sq. Ft.</div></div>
              <div class="prop-stat"><div class="prop-stat-val" style="font-size:1.05rem;padding-top:0.3rem">${p.constructionStatus.split(' ').slice(0,2).join(' ')}</div><div class="prop-stat-label">Status</div></div>
            </div>

            <!-- Description -->
            <div class="prop-block">
              <div class="prop-block-title">About this Property</div>
              <p style="line-height:1.85;color:var(--text-secondary);font-size:0.96rem">${esc(p.description)}</p>
            </div>

            ${amenitiesHTML}
            ${buildFloorPlan(p)}
            ${buildLocationMap(p)}

            <!-- EMI Calculator -->
            <div class="prop-block" id="emi-calculator">
              <div class="prop-block-title">EMI Calculator</div>
              <div class="emi-wrap">
                <div class="emi-inputs">
                  <div class="emi-field">
                    <div class="emi-label-row"><label for="emi-loan">Loan Amount</label><span class="emi-val-badge" id="emi-loan-display"></span></div>
                    <input type="number" id="emi-loan" class="emi-number-input" min="500000" max="100000000" step="100000" placeholder="e.g. 5000000">
                    <div class="emi-input-hint">Enter amount in ₹ (₹5L – ₹10Cr)</div>
                  </div>
                  <div class="emi-field">
                    <div class="emi-label-row"><label for="emi-rate">Interest Rate (% p.a.)</label><span class="emi-val-badge" id="emi-rate-display"></span></div>
                    <input type="number" id="emi-rate" class="emi-number-input" min="6" max="20" step="0.1" placeholder="e.g. 8.5">
                    <div class="emi-input-hint">Between 6% and 20%</div>
                  </div>
                  <div class="emi-field">
                    <div class="emi-label-row"><label for="emi-tenure">Loan Tenure (years)</label><span class="emi-val-badge" id="emi-tenure-display"></span></div>
                    <input type="number" id="emi-tenure" class="emi-number-input" min="1" max="30" step="1" placeholder="e.g. 20">
                    <div class="emi-input-hint">Between 1 and 30 years</div>
                  </div>
                </div>
                <div class="emi-results">
                  <div class="emi-pie-wrap">
                    <svg id="emi-pie" viewBox="0 0 200 200" width="170" height="170">
                      <circle cx="100" cy="100" r="80" fill="var(--bg-card)"/>
                      <path id="emi-arc-interest" d="" fill="#c9a96e"/>
                      <path id="emi-arc-principal" d="" fill="#2a3a2a"/>
                      <circle cx="100" cy="100" r="52" fill="var(--bg-card)"/>
                      <text x="100" y="94" text-anchor="middle" fill="var(--gold-light,#e8c97a)" font-size="12" font-family="inherit" opacity="0.7">Monthly</text>
                      <text id="emi-center" x="100" y="116" text-anchor="middle" fill="#e8c97a" font-size="13.5" font-weight="600" font-family="inherit">—</text>
                    </svg>
                    <div class="emi-legend">
                      <div class="emi-legend-item"><span class="emi-legend-dot" style="background:#c9a96e"></span><span>Interest</span></div>
                      <div class="emi-legend-item"><span class="emi-legend-dot" style="background:#2a3a2a;border:1.5px solid #4a7a4a"></span><span>Principal</span></div>
                    </div>
                  </div>
                  <div class="emi-numbers">
                    <div class="emi-num-card accent"><div class="emi-num-label">Monthly EMI</div><div class="emi-num-val" id="emi-monthly">—</div></div>
                    <div class="emi-num-card"><div class="emi-num-label">Total Interest</div><div class="emi-num-val" id="emi-interest">—</div></div>
                    <div class="emi-num-card"><div class="emi-num-label">Total Payment</div><div class="emi-num-val" id="emi-total">—</div></div>
                    <div class="emi-num-card"><div class="emi-num-label">Principal</div><div class="emi-num-val" id="emi-principal-val">—</div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Details table -->
            <div class="prop-block">
              <div class="prop-block-title">Property Details</div>
              <table class="detail-table">
                <tr><td>Property Type</td><td>${esc(p.type.charAt(0).toUpperCase()+p.type.slice(1))}</td></tr>
                <tr><td>Configuration</td><td>${p.bhk} BHK · ${p.baths} Bathrooms</td></tr>
                <tr><td>Carpet Area</td><td>${p.area.toLocaleString()} sq.ft</td></tr>
                <tr><td>Status</td><td>${esc(p.constructionStatus)}</td></tr>
                <tr><td>Price</td><td style="color:var(--gold-light);font-size:1.05rem">${esc(p.price)}</td></tr>
                <tr><td>Price per sq.ft</td><td>₹${Math.round(p.priceRaw/p.area).toLocaleString()}</td></tr>
                <tr><td>Locality</td><td>${esc(p.locality)}, ${esc(p.city)}</td></tr>
                <tr><td>RERA Number</td><td style="font-size:0.8rem;word-break:break-all">${esc(p.rera)}</td></tr>
                ${plans.length?`<tr><td>Floor Plans</td><td>${plans.length} plan${plans.length>1?'s':''} available</td></tr>`:''}
              </table>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="prop-sidebar">
            <div class="enquiry-card">
              <div class="enquiry-card-head">
                <div style="font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-dim);margin-bottom:0.4rem">Listed Price</div>
                <div style="font-family:var(--font-display);font-size:2rem;color:var(--gold-light)">${esc(p.price)}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">₹${Math.round(p.priceRaw/p.area).toLocaleString()} per sq.ft</div>
              </div>
              <div class="enquiry-card-body">
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.25rem;line-height:1.6">
                  Interested in this property? Our agents will get back to you within 2 hours.
                </p>
                <a href="contact.html?property=${encodeURIComponent(p.title)}&id=${p._id}"
                   class="btn btn-gold" style="width:100%;justify-content:center;padding:0.9rem">
                  Enquire About This Property
                </a>
                <a href="tel:+919876543210"
                   class="btn btn-outline" style="width:100%;justify-content:center;padding:0.85rem;margin-top:0.75rem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.72 3.36 2 2 0 0 1 3.72 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  Call +91 98765 43210
                </a>

                ${brochureHTML}

                <button onclick="shareProperty('${esc(p.title).replace(/'/g,"\\'")}','${esc(p.price).replace(/'/g,"\\'")}')"
                        class="btn" style="width:100%;margin-top:0.75rem;padding:0.7rem;font-size:0.82rem;color:var(--text-muted);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all 0.2s"
                        onmouseover="this.style.borderColor='var(--border-strong)';this.style.color='var(--text-primary)'"
                        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Share this Property
                </button>

                <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border)">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;text-align:center">
                    <div>
                      <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--gold-light)">${p.bhk}</div>
                      <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">BHK</div>
                    </div>
                    <div>
                      <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--gold-light)">${p.area.toLocaleString()}</div>
                      <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Sq. Ft.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top:1rem;text-align:center">
              <a href="listings.html?type=${encodeURIComponent(p.type)}&locality=${encodeURIComponent(p.locality)}"
                 style="font-size:0.82rem;color:var(--text-muted);text-decoration:none;transition:color 0.2s"
                 onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--text-muted)'">
                View similar ${esc(p.type)}s in ${esc(p.locality)} →
              </a>
            </div>
          </div>
        </div>
      </div>`;

    /* Wire up interactivity */
    const slides = buildGallery._slides || [];
    const allSlides = (() => {
      let s = [];
      if (p.images && p.images.length) { s = [...p.images]; if (p.img && !s.includes(p.img)) s.unshift(p.img); }
      else s = [p.img];
      return s.filter(Boolean);
    })();
    if (allSlides.length > 1) initGallery(allSlides.length);
    if (plans.length > 1) initFloorPlan(plans);
  }

  /* ════════════════════════════════════════════
     GALLERY CONTROLS
  ════════════════════════════════════════════ */
  function initGallery(count) {
    const track   = document.getElementById('gal-track');
    const counter = document.getElementById('gal-counter');
    const dots    = document.querySelectorAll('.gallery-dot');
    let cur = 0, autoTimer = null;

    function goTo(idx) {
      cur = ((idx % count) + count) % count;
      track.style.transform = `translateX(-${cur*100}%)`;
      if (counter) counter.textContent = `${cur+1} / ${count}`;
      dots.forEach((d,i) => d.classList.toggle('active', i===cur));
    }

    document.getElementById('gal-prev')?.addEventListener('click', () => { goTo(cur-1); resetAuto(); });
    document.getElementById('gal-next')?.addEventListener('click', () => { goTo(cur+1); resetAuto(); });
    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.idx); resetAuto(); }));

    document.addEventListener('keydown', e => {
      if (e.key==='ArrowLeft')  { goTo(cur-1); resetAuto(); }
      if (e.key==='ArrowRight') { goTo(cur+1); resetAuto(); }
    });

    let tx = 0;
    const wrap = document.getElementById('gallery-root');
    wrap?.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
    wrap?.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) { goTo(cur + (dx<0?1:-1)); resetAuto(); }
    }, {passive:true});

    function startAuto() { autoTimer = setInterval(() => goTo(cur+1), 5000); }
    function resetAuto()  { clearInterval(autoTimer); startAuto(); }
    startAuto();
  }

  /* ════════════════════════════════════════════
     FLOOR PLAN CONTROLS
  ════════════════════════════════════════════ */
  function initFloorPlan(plans) {
    const img = document.getElementById('fp-img');
    const lbl = document.getElementById('fp-label');
    let cur = 0;
    function show(i) {
      cur = ((i%plans.length)+plans.length)%plans.length;
      img.src = plans[cur]; img.alt = `Floor plan ${cur+1}`;
      if (lbl) lbl.textContent = `Plan ${cur+1} of ${plans.length}`;
      document.querySelectorAll('.fp-tab').forEach((t,ti) => t.classList.toggle('active', ti===cur));
    }
    document.querySelectorAll('.fp-tab').forEach(t => t.addEventListener('click', ()=>show(+t.dataset.fp)));
    document.getElementById('fp-prev')?.addEventListener('click', ()=>show(cur-1));
    document.getElementById('fp-next')?.addEventListener('click', ()=>show(cur+1));
  }

  /* ── Share ── */
  window.shareProperty = function(title, price) {
    const url = window.location.href;
    if (navigator.share) { navigator.share({title, text:`${title} — ${price} | Luxe Estates`, url}).catch(()=>{}); }
    else { navigator.clipboard.writeText(url).then(()=>showToast('Link copied!','🔗')).catch(()=>prompt('Copy link:',url)); }
  };

  function showToast(msg, icon) {
    if (typeof window.showToast==='function') { window.showToast(msg,icon); return; }
    const t = document.createElement('div');
    t.textContent = `${icon}  ${msg}`;
    Object.assign(t.style,{position:'fixed',bottom:'2rem',right:'2rem',zIndex:'9999',background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text-primary)',padding:'0.75rem 1.25rem',borderRadius:'8px',fontSize:'0.85rem',pointerEvents:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',transition:'opacity 0.3s'});
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),400);},2800);
  }

  /* ── Boot ── */
  async function init() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { renderError('No property ID specified.'); return; }
    renderSkeleton();
    try {
      const res  = await fetch(`${API}/api/properties/${id}`);
      const data = await res.json();
      if (!data.success || !data.property) { renderError(data.error||'Property not found.'); return; }
      renderProperty(data.property);
      initEmiCalculator(data.property.priceRaw);
    } catch { renderError('Could not load property. Is the server running?'); }
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ════════════════════════════════════════════
     EMI CALCULATOR
  ════════════════════════════════════════════ */
  function initEmiCalculator(priceRaw) {
    const ls=document.getElementById('emi-loan'), rs=document.getElementById('emi-rate'), ts=document.getElementById('emi-tenure');
    if (!ls) return;
    ls.value = Math.min(Math.max(Math.round((priceRaw||5e6)*0.8/1e5)*1e5, 5e5), 1e8);
    rs.value = 8.5; ts.value = 20;
    const fmtINR = n => n>=1e7?'₹'+(n/1e7).toFixed(2)+' Cr':n>=1e5?'₹'+(n/1e5).toFixed(2)+' L':'₹'+Math.round(n).toLocaleString('en-IN');
    const calcEMI = (P,r,y) => { const mr=r/12/100,n=y*12; return mr===0?P/n:P*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1); };
    const arc = (cx,cy,r,sa,ea) => { const f=a=>(a-90)*Math.PI/180; return `M ${cx} ${cy} L ${cx+r*Math.cos(f(sa))} ${cy+r*Math.sin(f(sa))} A ${r} ${r} 0 ${ea-sa>180?1:0} 1 ${cx+r*Math.cos(f(ea))} ${cy+r*Math.sin(f(ea))} Z`; };
    function clampInput(el) {
      let v = parseFloat(el.value);
      const mn = parseFloat(el.min), mx = parseFloat(el.max);
      if (isNaN(v)) return;
      if (v < mn) el.value = mn;
      if (v > mx) el.value = mx;
    }
    function update() {
      const P=+ls.value, rate=+rs.value, tenure=+ts.value;
      if (!P || !rate || !tenure) return;
      const emi=calcEMI(P,rate,tenure), total=emi*tenure*12, interest=total-P, ip=(interest/total)*100;
      document.getElementById('emi-loan-display').textContent   = fmtINR(P);
      document.getElementById('emi-rate-display').textContent   = rate.toFixed(1)+'% p.a.';
      document.getElementById('emi-tenure-display').textContent = tenure+(tenure===1?' year':' years');
      document.getElementById('emi-monthly').textContent        = fmtINR(emi);
      document.getElementById('emi-interest').textContent       = fmtINR(interest);
      document.getElementById('emi-total').textContent          = fmtINR(total);
      document.getElementById('emi-principal-val').textContent  = fmtINR(P);
      document.getElementById('emi-center').textContent         = fmtINR(emi);
      const ai=document.getElementById('emi-arc-interest'), ap=document.getElementById('emi-arc-principal');
      if (ip>=99.9)      { ai.setAttribute('d',arc(100,100,80,0,359.99)); ap.setAttribute('d',''); }
      else if (ip<=0.01) { ap.setAttribute('d',arc(100,100,80,0,359.99)); ai.setAttribute('d',''); }
      else { const e=ip*3.6; ai.setAttribute('d',arc(100,100,80,0,e)); ap.setAttribute('d',arc(100,100,80,e,360)); }
    }
    // Clamp only on blur so typing intermediate values (e.g. "8" before "8.5") isn't blocked
    [ls,rs,ts].forEach(s => {
      s.addEventListener('input', update);
      s.addEventListener('blur', () => { clampInput(s); update(); });
    });
    update();
  }
})();