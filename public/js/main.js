/* ============================================================
   LUXE ESTATES — main.js
   ▸ WhatsApp-style chat: Aria left, user answers right
   ▸ Lead capture modal before results
   ============================================================ */

const API = window.location.origin;

let customerName = '';
let userFilters  = {};
let META         = { localities: [], amenities: [] };

const wishlist = {
  get:    ()  => JSON.parse(localStorage.getItem('luxe_wishlist') || '[]'),
  add:    id  => { const w = wishlist.get(); if (!w.includes(id)) { w.push(id); localStorage.setItem('luxe_wishlist', JSON.stringify(w)); } },
  remove: id  => { const w = wishlist.get().filter(x => x !== id); localStorage.setItem('luxe_wishlist', JSON.stringify(w)); },
  toggle: id  => wishlist.get().includes(id) ? wishlist.remove(id) : wishlist.add(id),
  has:    id  => wishlist.get().includes(id)
};

function showToast(msg, icon = '✦') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.innerHTML = `<span class="toast-icon">${icon}</span> ${msg}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
  const hamburger  = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-links');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.style.display === 'flex';
      mobileMenu.style.cssText = open ? '' : 'display:flex;flex-direction:column;position:fixed;top:70px;left:0;right:0;background:rgba(13,13,14,0.97);padding:2rem;gap:1.5rem;border-bottom:1px solid var(--border);z-index:999;backdrop-filter:blur(20px);';
    });
  }
}

/* ════════════════════════════════════════════════════════════
   LEAD CAPTURE MODAL
════════════════════════════════════════════════════════════ */
function showLeadModal(onSuccess) {
  /* If user already verified, skip straight to results */
  if (localStorage.getItem('luxe_otp_verified') === '1') {
    onSuccess();
    return;
  }

  const existing = document.getElementById('lead-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lead-modal-overlay';
  overlay.style.cssText = [
    'position:fixed','inset:0','z-index:10001',
    'background:rgba(0,0,0,0.82)','backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'display:flex','align-items:center','justify-content:center',
    'padding:1rem','opacity:0','transition:opacity 0.3s ease'
  ].join(';');

  overlay.innerHTML = `
    <div id="lead-modal-box" style="
      background:#141416;
      border:1px solid rgba(201,169,110,0.35);
      border-radius:20px;
      padding:2.5rem 2rem;
      max-width:400px;width:100%;
      text-align:center;
      box-shadow:0 48px 120px rgba(0,0,0,0.85);
      transform:scale(0.9) translateY(16px);
      transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    ">
      <div style="
        width:52px;height:52px;border-radius:50%;
        background:#1a1810;border:1.5px solid rgba(201,169,110,0.5);
        display:flex;align-items:center;justify-content:center;
        margin:0 auto 1rem;
        font-family:'Cormorant Garamond',Georgia,serif;
        color:#c9a96e;font-size:1rem;letter-spacing:0.04em;
      ">Aria</div>
      <p style="font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:#5a5752;margin-bottom:1.25rem">
        Luxe<span style="color:#c9a96e">.</span>Estates
      </p>
      <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.65rem;font-weight:300;color:#f0ebe2;line-height:1.25;margin-bottom:0.5rem">
        Almost there!
      </h3>
      <p style="font-size:0.84rem;color:#5a5752;line-height:1.65;margin-bottom:1.75rem">
        Share your details so our agents can reach out with personalised options.
      </p>
      <div id="lead-error" style="display:none;background:rgba(220,60,60,0.12);border:1px solid rgba(220,60,60,0.3);color:#f08080;font-size:0.8rem;border-radius:8px;padding:0.65rem 0.9rem;margin-bottom:0.9rem;text-align:left"></div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem">
        <input id="lead-name"  type="text"  placeholder="Full name *"     maxlength="80"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.22);border-radius:10px;padding:0.85rem 1rem;color:#f0ebe2;font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box;transition:border-color 0.25s">
        <div class="phone-field-wrap" id="phone-field-wrap">
          <select id="lead-phone-country" class="phone-country-select">
            <option value="IN">🇮🇳 +91</option>
            <option value="US">🇺🇸 +1</option>
            <option value="GB">🇬🇧 +44</option>
            <option value="AE">🇦🇪 +971</option>
            <option value="SG">🇸🇬 +65</option>
            <option value="AU">🇦🇺 +61</option>
            <option value="CA">🇨🇦 +1</option>
            <option value="DE">🇩🇪 +49</option>
            <option value="FR">🇫🇷 +33</option>
            <option value="JP">🇯🇵 +81</option>
            <option value="CN">🇨🇳 +86</option>
            <option value="SA">🇸🇦 +966</option>
            <option value="QA">🇶🇦 +974</option>
            <option value="KW">🇰🇼 +965</option>
            <option value="BH">🇧🇭 +973</option>
            <option value="OM">🇴🇲 +968</option>
            <option value="NZ">🇳🇿 +64</option>
            <option value="ZA">🇿🇦 +27</option>
            <option value="NG">🇳🇬 +234</option>
            <option value="KE">🇰🇪 +254</option>
            <option value="MY">🇲🇾 +60</option>
            <option value="ID">🇮🇩 +62</option>
            <option value="PH">🇵🇭 +63</option>
            <option value="TH">🇹🇭 +66</option>
            <option value="BD">🇧🇩 +880</option>
            <option value="PK">🇵🇰 +92</option>
            <option value="LK">🇱🇰 +94</option>
            <option value="NP">🇳🇵 +977</option>
          </select>
          <input id="lead-phone-number" type="tel" placeholder="Phone number *" maxlength="15" autocomplete="tel-national">
        </div>
        <input id="lead-email" type="email" placeholder="Email address *" maxlength="120"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.22);border-radius:10px;padding:0.85rem 1rem;color:#f0ebe2;font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box;transition:border-color 0.25s">
      </div>
      <button id="lead-submit" style="
        width:100%;padding:0.95rem;
        background:#c9a96e;color:#0d0d0e;
        border:none;border-radius:10px;
        font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:600;
        letter-spacing:0.04em;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:0.55rem;
        margin-bottom:0.75rem;
        transition:background 0.25s,transform 0.2s;
      ">
        <span id="lead-btn-text">Show My Properties</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
      <p style="font-size:0.68rem;color:#2e2d2b">Your details are safe with us. No spam, ever.</p>
    </div>`;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    document.getElementById('lead-modal-box').style.transform = 'scale(1) translateY(0)';
  });

  setTimeout(() => document.getElementById('lead-name')?.focus(), 350);

  ['lead-name','lead-email'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('focus', () => { el.style.borderColor = '#c9a96e'; el.style.boxShadow = '0 0 0 3px rgba(201,169,110,0.12)'; });
    el.addEventListener('blur',  () => { el.style.borderColor = 'rgba(201,169,110,0.22)'; el.style.boxShadow = 'none'; });
  });
  const phoneWrap  = document.getElementById('phone-field-wrap');
  const phoneInput = document.getElementById('lead-phone-number');
  phoneInput.addEventListener('focus', () => phoneWrap.classList.add('focused'));
  phoneInput.addEventListener('blur',  () => phoneWrap.classList.remove('focused'));
  /* Only allow digits, spaces, hyphens */
  phoneInput.addEventListener('input', () => { phoneInput.value = phoneInput.value.replace(/[^\d\s\-]/g, ''); });

  async function submitLead() {
    const name    = document.getElementById('lead-name').value.trim();
    const country = document.getElementById('lead-phone-country').value;
    const phoneRaw= document.getElementById('lead-phone-number').value.trim();
    const email   = document.getElementById('lead-email').value.trim();
    const errEl   = document.getElementById('lead-error');
    const btn     = document.getElementById('lead-submit');
    const btnTxt  = document.getElementById('lead-btn-text');

    function shakeField(el) {
      el.style.animation = 'nmShake 0.38s ease';
      setTimeout(() => el.style.animation = '', 400);
    }
    function markError(el) { el.style.borderColor = '#e05a5a'; shakeField(el); }
    function clearError(el) { el.style.borderColor = 'rgba(201,169,110,0.22)'; }

    /* ── Empty check ── */
    if (!name || !phoneRaw || !email) {
      errEl.textContent = 'Please fill in all fields.';
      errEl.style.display = 'block';
      if (!name)     { markError(document.getElementById('lead-name')); setTimeout(() => clearError(document.getElementById('lead-name')), 400); }
      if (!phoneRaw) { document.getElementById('phone-field-wrap').classList.add('error'); shakeField(document.getElementById('lead-phone-number')); setTimeout(() => document.getElementById('phone-field-wrap').classList.remove('error'), 400); }
      if (!email)    { markError(document.getElementById('lead-email')); setTimeout(() => clearError(document.getElementById('lead-email')), 400); }
      return;
    }

    /* ── Email check ── */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.style.display = 'block';
      markError(document.getElementById('lead-email'));
      setTimeout(() => clearError(document.getElementById('lead-email')), 600);
      return;
    }

    /* ── Phone check via libphonenumber-js ── */
    let phone = phoneRaw;
    try {
      const parsed = window.libphonenumber.parsePhoneNumber(phoneRaw, country);
      if (!parsed.isValid()) {
        errEl.textContent = `Please enter a valid phone number for the selected country (e.g. ${window.libphonenumber.getExampleNumber(country)?.formatNational() || '98765 43210'}).`;
        errEl.style.display = 'block';
        document.getElementById('phone-field-wrap').classList.add('error');
        shakeField(document.getElementById('lead-phone-number'));
        setTimeout(() => document.getElementById('phone-field-wrap').classList.remove('error'), 600);
        return;
      }
      phone = parsed.formatInternational(); /* store in E.164-friendly format */
    } catch {
      errEl.textContent = 'Please enter a valid phone number including your area code.';
      errEl.style.display = 'block';
      document.getElementById('phone-field-wrap').classList.add('error');
      shakeField(document.getElementById('lead-phone-number'));
      setTimeout(() => document.getElementById('phone-field-wrap').classList.remove('error'), 600);
      return;
    }

    errEl.style.display = 'none';
    btn.disabled = true;
    btnTxt.textContent = 'Sending OTP…';

    try {
      await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, filters: userFilters })
      });
    } catch (_) { /* non-blocking */ }

    /* ── Transition to OTP screen inside the same modal box ── */
    const box = document.getElementById('lead-modal-box');
    box.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    box.style.opacity    = '0';
    box.style.transform  = 'scale(0.96) translateY(6px)';

    setTimeout(() => {
      box.innerHTML = `
        <div style="
          width:52px;height:52px;border-radius:50%;
          background:#1a1810;border:1.5px solid rgba(201,169,110,0.5);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 1rem;
          font-family:'Cormorant Garamond',Georgia,serif;
          color:#c9a96e;font-size:1rem;letter-spacing:0.04em;
        ">Aria</div>
        <p style="font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:#5a5752;margin-bottom:1.25rem">
          Luxe<span style="color:#c9a96e">.</span>Estates
        </p>
        <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.65rem;font-weight:300;color:#f0ebe2;line-height:1.25;margin-bottom:0.5rem">
          Verify your number
        </h3>
        <p style="font-size:0.84rem;color:#5a5752;line-height:1.65;margin-bottom:0.35rem">
          We've sent a 6-digit OTP to
        </p>
        <p style="font-size:0.9rem;color:#c9a96e;font-weight:500;margin-bottom:1.75rem;letter-spacing:0.03em">
          ${phone}
        </p>

        <div id="otp-error" style="display:none;background:rgba(220,60,60,0.12);border:1px solid rgba(220,60,60,0.3);color:#f08080;font-size:0.8rem;border-radius:8px;padding:0.65rem 0.9rem;margin-bottom:0.9rem;text-align:left"></div>

        <!-- Six individual OTP digit boxes -->
        <div id="otp-boxes" style="display:flex;gap:0.55rem;justify-content:center;margin-bottom:1.5rem">
          ${[0,1,2,3,4,5].map(i => `
            <input
              id="otp-digit-${i}"
              type="text"
              inputmode="numeric"
              maxlength="1"
              data-idx="${i}"
              style="
                width:44px;height:52px;text-align:center;
                background:rgba(255,255,255,0.04);
                border:1px solid rgba(201,169,110,0.25);
                border-radius:10px;
                color:#f0ebe2;font-size:1.35rem;font-weight:600;
                font-family:'DM Sans',sans-serif;
                outline:none;caret-color:#c9a96e;
                transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
              "
            >`).join('')}
        </div>

        <button id="otp-verify-btn" style="
          width:100%;padding:0.95rem;
          background:#c9a96e;color:#0d0d0e;
          border:none;border-radius:10px;
          font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:600;
          letter-spacing:0.04em;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:0.55rem;
          margin-bottom:0.75rem;
          transition:background 0.25s,transform 0.2s;
        ">
          <span id="otp-btn-text">Verify & Show Properties</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        <p style="font-size:0.68rem;color:#2e2d2b">
          Didn't get the code? <button id="otp-resend" style="background:none;border:none;color:#c9a96e;font-size:0.68rem;cursor:pointer;padding:0;font-family:inherit;letter-spacing:inherit">Resend OTP</button>
        </p>`;

      box.style.opacity   = '1';
      box.style.transform = 'scale(1) translateY(0)';

      /* ── Focus first digit ── */
      setTimeout(() => document.getElementById('otp-digit-0')?.focus(), 200);

      /* ── OTP digit box keyboard navigation ── */
      for (let i = 0; i < 6; i++) {
        const inp = document.getElementById(`otp-digit-${i}`);
        inp.addEventListener('focus', () => {
          inp.style.borderColor  = '#c9a96e';
          inp.style.boxShadow    = '0 0 0 3px rgba(201,169,110,0.15)';
          inp.style.background   = 'rgba(201,169,110,0.06)';
        });
        inp.addEventListener('blur', () => {
          inp.style.borderColor  = 'rgba(201,169,110,0.25)';
          inp.style.boxShadow    = 'none';
          inp.style.background   = 'rgba(255,255,255,0.04)';
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !inp.value && i > 0) {
            document.getElementById(`otp-digit-${i-1}`).focus();
          }
          if (e.key === 'ArrowLeft' && i > 0)   { e.preventDefault(); document.getElementById(`otp-digit-${i-1}`).focus(); }
          if (e.key === 'ArrowRight' && i < 5)  { e.preventDefault(); document.getElementById(`otp-digit-${i+1}`).focus(); }
          if (e.key === 'Enter') verifyOtp();
        });
        inp.addEventListener('input', () => {
          /* Allow only digits */
          inp.value = inp.value.replace(/\D/g, '').slice(-1);
          if (inp.value && i < 5) document.getElementById(`otp-digit-${i+1}`).focus();
        });
        inp.addEventListener('paste', e => {
          e.preventDefault();
          const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
          pasted.split('').forEach((ch, j) => {
            const d = document.getElementById(`otp-digit-${j}`);
            if (d) d.value = ch;
          });
          const last = Math.min(pasted.length, 5);
          document.getElementById(`otp-digit-${last}`)?.focus();
        });
      }

      /* ── Verify OTP ── */
      function verifyOtp() {
        const entered = [0,1,2,3,4,5].map(j => document.getElementById(`otp-digit-${j}`).value).join('');
        const errEl2  = document.getElementById('otp-error');
        const verBtn  = document.getElementById('otp-verify-btn');
        const verTxt  = document.getElementById('otp-btn-text');

        if (entered.length < 6) {
          errEl2.textContent = 'Please enter the complete 6-digit OTP.';
          errEl2.style.display = 'block';
          shakeOtpBoxes();
          return;
        }

        const CORRECT_OTP = '123456';
        if (entered !== CORRECT_OTP) {
          errEl2.textContent = 'Incorrect OTP. Please try again.';
          errEl2.style.display = 'block';
          shakeOtpBoxes();
          /* Clear boxes and refocus */
          [0,1,2,3,4,5].forEach(j => {
            const d = document.getElementById(`otp-digit-${j}`);
            d.value = '';
            d.style.borderColor = '#e05a5a';
            setTimeout(() => { d.style.borderColor = 'rgba(201,169,110,0.25)'; }, 600);
          });
          setTimeout(() => document.getElementById('otp-digit-0')?.focus(), 100);
          return;
        }

        /* ── OTP correct ── */
        errEl2.style.display = 'none';
        verBtn.disabled = true;
        verTxt.textContent = 'Verified! ✓';
        verBtn.style.background = '#4caf88';
        localStorage.setItem('luxe_otp_verified', '1');

        /* Show tick animation then close */
        setTimeout(() => {
          overlay.style.opacity = '0';
          box.style.transform   = 'scale(0.92) translateY(8px)';
          setTimeout(() => { overlay.remove(); onSuccess(); }, 300);
        }, 600);
      }

      function shakeOtpBoxes() {
        const wrap = document.getElementById('otp-boxes');
        wrap.style.animation = 'nmShake 0.38s ease';
        setTimeout(() => wrap.style.animation = '', 400);
      }

      document.getElementById('otp-verify-btn').addEventListener('click', verifyOtp);
      document.getElementById('otp-resend').addEventListener('click', () => {
        const resendBtn = document.getElementById('otp-resend');
        resendBtn.textContent = 'Sent!';
        resendBtn.style.color = '#4caf88';
        setTimeout(() => { resendBtn.textContent = 'Resend OTP'; resendBtn.style.color = '#c9a96e'; }, 3000);
      });

    }, 220);
  }

  document.getElementById('lead-submit').addEventListener('click', submitLead);
  ['lead-name','lead-phone','lead-email'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitLead(); });
  });
}

/* ════════════════════════════════════════════════════════════
   CONVERSATION ENGINE
════════════════════════════════════════════════════════════ */
function initConversation() {
  const section = document.getElementById('conversation-section');
  if (!section) return;

  function ariaAvatar() {
    return `<div class="aria-avatar"><span class="aria-avatar-initials">Aria</span></div>`;
  }

  function makeTurn(questionHTML, rightColHTML, isAnswered = false) {
    const turn = document.createElement('div');
    turn.className = 'conv-turn';
    turn.innerHTML = `
      <div class="conv-aria-row">
        ${ariaAvatar()}
        <div class="conv-aria-bubble">
          <div class="aria-label-tag"><span class="aria-dot"></span>Aria · Property Guide</div>
          <div class="conv-question">${questionHTML}</div>
        </div>
      </div>
      <div class="conv-user-row ${isAnswered ? 'is-answered' : ''}">
        <div class="conv-right">${rightColHTML}</div>
      </div>`;
    return turn;
  }

  function appendTurn(questionHTML, rightColHTML, delay = 0) {
    return new Promise(resolve => {
      const typingTurn = document.createElement('div');
      typingTurn.className = 'conv-turn';
      typingTurn.innerHTML = `
        <div class="conv-aria-row">
          ${ariaAvatar()}
          <div class="conv-aria-bubble">
            <div class="aria-label-tag"><span class="aria-dot"></span>Aria · Property Guide</div>
            <div class="conv-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
        <div class="conv-user-row"></div>`;
      section.appendChild(typingTurn);
      requestAnimationFrame(() => requestAnimationFrame(() => typingTurn.classList.add('visible')));
      smoothScrollToBottom();

      setTimeout(() => {
        section.removeChild(typingTurn);
        const turn = makeTurn(questionHTML, rightColHTML);
        section.appendChild(turn);
        requestAnimationFrame(() => requestAnimationFrame(() => turn.classList.add('visible')));
        smoothScrollToBottom();
        resolve(turn);
      }, delay + 650);
    });
  }

  function smoothScrollToBottom() {
    setTimeout(() => {
      const last = section.lastElementChild;
      if (!last) return;
      window.scrollTo({ top: last.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    }, 100);
  }

  function buildOpts(options) {
    return `<div class="conv-opts">${options.map((o, i) =>
      `<button class="conv-opt-btn" data-idx="${i}">
        <span class="opt-label-wrap">
          <span class="opt-label">${o.label}</span>
          ${o.subtext ? `<span class="opt-subtext">${o.subtext}</span>` : ''}
        </span>
        <svg class="opt-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>`
    ).join('')}</div>`;
  }

  function buildMultiSelect(options, submitLabel = 'Continue') {
    const useGrid = options.length > 4;
    return `
      <div class="conv-multi">
        <div class="conv-checks${useGrid ? ' grid-layout' : ''}">${options.map((o, i) =>
          `<button class="conv-toggle-btn" data-value="${o.value || o.label}" data-label="${o.label}" data-idx="${i}" type="button">
            <span class="toggle-label-wrap">
              <span class="toggle-label">${o.label}</span>
            </span>
            <svg class="toggle-check-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </button>`
        ).join('')}</div>
        <button class="conv-multi-submit">
          <span>${submitLabel}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>`;
  }

  function lockTurn(turn, answerHTML) {
    const rightCol = turn.querySelector('.conv-right');
    const userRow  = turn.querySelector('.conv-user-row');
    rightCol.innerHTML = `<div class="conv-user-bubble">${answerHTML}</div>`;
    userRow.classList.add('is-answered');
  }

  /* ── STEP 1: Property Type ── */
  async function step_propertyType() {
    const opts = [
      { label: 'Apartment',   value: 'apartment',  subtext: 'Flats in gated complexes' },
      { label: 'Villa',       value: 'villa',       subtext: 'Independent homes with garden' },
      { label: 'Bungalow',    value: 'villa',       subtext: 'Spacious standalone homes' },
      { label: 'Penthouse',   value: 'penthouse',   subtext: 'Sky-high luxury living' },
      { label: 'Farmhouse',   value: 'farmhouse',   subtext: 'Weekend getaways & estates' },
      { label: 'Surprise Me', value: null,          subtext: 'Show me the best of everything' }
    ];
    const turn = await appendTurn(
      `Welcome, <strong style="color:var(--gold)">${customerName}</strong>!<br>What kind of home are you dreaming of?`,
      buildOpts(opts), 200
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => { userFilters.type = opts[i].value; lockTurn(turn, opts[i].label); step_budget(); });
    });
  }

  /* ── STEP 2: Budget ── */
  async function step_budget() {
    const opts = [
      { label: 'Under ₹70 Lakhs',  value: [0, 7000000],          subtext: 'Great starter options available' },
      { label: '₹70L – ₹1.5 Cr',   value: [7000000, 15000000],   subtext: 'Wide range of quality homes' },
      { label: '₹1.5 Cr – ₹3 Cr',  value: [15000000, 30000000],  subtext: 'Premium & spacious properties' },
      { label: 'Above ₹3 Crores',   value: [30000000, 999999999], subtext: 'Ultra-luxury & exclusive' },
      { label: 'Flexible / Open',   value: null,                  subtext: 'Show me everything' }
    ];
    const turn = await appendTurn(
      `Great choice! Now let's talk numbers.<br>What's your comfortable budget?`,
      buildOpts(opts), 300
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => { userFilters.budget = opts[i].value; lockTurn(turn, opts[i].label); step_location(); });
    });
  }

  /* ── STEP 3: Location ── */
  async function step_location() {
    const localities = META.localities;
    const opts = localities.map(loc => ({ label: loc, value: loc }));
    opts.push({ label: 'Open to all areas', value: null });

    const gridHTML = `
      <div class="conv-multi">
        <div class="conv-checks loc-grid">${opts.map((o, i) =>
          `<button class="conv-toggle-btn loc-toggle" data-value="${o.value !== null ? o.value : ''}" data-label="${o.label}" data-idx="${i}" type="button">
            <span class="toggle-label-wrap"><span class="toggle-label">${o.label}</span></span>
          </button>`
        ).join('')}</div>
      </div>`;

    const turn = await appendTurn(
      `Hyderabad has so many wonderful neighbourhoods.<br>Which area catches your eye?`,
      gridHTML, 300
    );

    turn.querySelectorAll('.loc-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.locked) return;
        turn.querySelectorAll('.loc-toggle').forEach(b => b.dataset.locked = '1');
        turn.querySelectorAll('.loc-toggle').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        setTimeout(() => {
          const rawVal = btn.dataset.value;
          userFilters.locality = rawVal === '' ? null : rawVal;
          lockTurn(turn, btn.dataset.label);
          step_bhk();
        }, 280);
      });
    });
  }

  /* ── STEP 4: BHK ── */
  async function step_bhk() {
    const opts = [
      { label: '2 BHK',    value: 2,    subtext: 'Ideal for couples & small families' },
      { label: '3 BHK',    value: 3,    subtext: 'Most popular choice' },
      { label: '4 BHK',    value: 4,    subtext: 'For larger families' },
      { label: '4+ BHK',   value: 5,    subtext: 'Grand, expansive homes' },
      { label: 'Any size', value: null, subtext: 'Show me all options' }
    ];
    const turn = await appendTurn(
      `How many bedrooms would make this feel like home?`,
      buildOpts(opts), 300
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => { userFilters.bhk = opts[i].value; lockTurn(turn, opts[i].label); step_area(); });
    });
  }

  /* ── STEP 5: Area ── */
  async function step_area() {
    const opts = [
      { label: '1,200 – 1,800 sq ft',   value: [1200, 1800],   subtext: 'Cosy & efficient' },
      { label: '1,800 – 2,500 sq ft',   value: [1800, 2500],   subtext: 'Comfortable family space' },
      { label: '2,500 – 3,500 sq ft',   value: [2500, 3500],   subtext: 'Generous & airy' },
      { label: '3,500 sq ft and above', value: [3500, 99999],  subtext: 'Grand & expansive' },
      { label: 'No preference',          value: null,           subtext: 'Size is flexible' }
    ];
    const turn = await appendTurn(
      `How much space would feel just right for you?`,
      buildOpts(opts), 300
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => { userFilters.area = opts[i].value; lockTurn(turn, opts[i].label); step_amenities(); });
    });
  }

  /* ── STEP 6: Amenities ── */
  async function step_amenities() {
    const opts = META.amenities.map(a => ({ label: a, value: a }));
    const turn = await appendTurn(
      `Which amenities matter most to you?<br><span style="font-size:0.8rem;color:var(--text-muted);font-family:var(--font-body)">Select as many as you like, or skip</span>`,
      buildMultiSelect(opts, 'Continue'),
      300
    );
    turn.querySelectorAll('.conv-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });
    turn.querySelector('.conv-multi-submit').addEventListener('click', () => {
      const selected  = [...turn.querySelectorAll('.conv-toggle-btn.selected')];
      const values    = selected.map(b => b.dataset.value);
      userFilters.amenities = values.length ? values : null;
      const answerText = values.length
        ? selected.map(b => b.dataset.label).slice(0, 3).join(', ') + (values.length > 3 ? ` +${values.length - 3} more` : '')
        : 'No preference';
      lockTurn(turn, answerText);
      step_timeline();
    });
  }

  /* ── STEP 7: Timeline — shows lead modal before results ── */
  async function step_timeline() {
    const opts = [
      { label: 'Immediately',            value: 'sale',              subtext: "I'll show ready-to-move properties" },
      { label: 'In 3 – 6 months',        value: 'underconstruction', subtext: "Includes upcoming launches" },
      { label: 'In 6 – 12 months',       value: 'underconstruction', subtext: "Great options under construction" },
      { label: 'Just exploring for now', value: null,                subtext: "I'll show you the full picture" }
    ];
    const turn = await appendTurn(
      `Almost there! When are you planning to move?`,
      buildOpts(opts), 300
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        userFilters.status = opts[i].value;
        lockTurn(turn, opts[i].label);
        /* ★ Show lead capture modal THEN show results ★ */
        showLeadModal(() => showResults());
      });
    });
  }

  /* ── Results ── */
  async function showResults() {
    const loadTurn = await appendTurn(
      `Give me just a moment, ${customerName}…<br>
       <span style="font-size:0.8rem;color:var(--text-muted);font-family:var(--font-body)">Searching across ${META.localities.length} localities in Hyderabad</span>`,
      `<div class="conv-typing" style="padding-top:0.5rem"><span></span><span></span><span></span></div>`,
      300
    );

    function buildParams(filters, limit) {
      const p = new URLSearchParams({ limit });
      if (filters.type)              p.set('type',     filters.type);
      if (filters.locality)          p.set('locality', filters.locality);
      if (filters.bhk)               p.set('bhk',      filters.bhk);
      if (filters.budget)            { p.set('minPrice', filters.budget[0]); p.set('maxPrice', filters.budget[1]); }
      if (filters.area)              { p.set('minArea',  filters.area[0]);   p.set('maxArea',  filters.area[1]); }
      if (filters.status)            p.set('status',   filters.status);
      if (filters.amenities?.length) p.set('amenities', filters.amenities.join(','));
      return p;
    }

    const params = buildParams(userFilters, 6);
    let properties = [], totalFound = 0, usedFallback = false;

    try {
      const res  = await fetch(`${API}/api/properties?${params}`);
      const data = await res.json();
      if (data.success && data.properties.length > 0) {
        properties = data.properties;
        totalFound = data.pagination.total;
      } else {
        const relaxed = { type: userFilters.type, locality: userFilters.locality, budget: userFilters.budget, status: userFilters.status };
        const fp = buildParams(relaxed, 6);
        const fb = await fetch(`${API}/api/properties?${fp}`);
        const fd = await fb.json();
        properties   = fd.success ? fd.properties : [];
        totalFound   = fd.success ? fd.pagination.total : 0;
        usedFallback = true;
      }
    } catch (e) { console.error('Search failed:', e); }

    section.removeChild(loadTurn);

    if (properties.length === 0) {
      await appendTurn(
        `Nothing matched your exact criteria right now, ${customerName}.`,
        `<div class="conv-info-card">
          <p>Our inventory grows every week. Leave your details and we'll notify you the moment a matching property comes in.</p>
          <a href="contact.html" class="btn btn-gold" style="margin-top:1.25rem;display:inline-flex">Get Notified</a>
        </div>`, 0
      );
      showFollowUp();
      return;
    }

    const headline = usedFallback
      ? `Here are some wonderful options for you, ${customerName}!<br><span class="result-note">We broadened the search slightly to find you more choices</span>`
      : `Found <strong style="color:var(--gold)">${totalFound}</strong> ${totalFound === 1 ? 'property' : 'properties'} matching your preferences`;

    const viewAllHref = `listings.html?${params.toString()}`;
    const cardsHTML   = `
      <div class="result-headline">${headline}</div>
      <div class="result-cards-grid">${properties.map(p => buildPropertyCard(p)).join('')}</div>
      ${totalFound > 6 ? `<a href="${viewAllHref}" class="result-view-all">View all ${totalFound} matching properties</a>` : ''}`;

    const resultTurn = await appendTurn(`Here's what I found for you ✦`, cardsHTML, 0);
    resultTurn.classList.add('result-turn');

    resultTurn.querySelectorAll('.card-wishlist').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        wishlist.toggle(id);
        const inWL = wishlist.has(id);
        btn.classList.toggle('active', inWL);
        btn.innerHTML = inWL ? '♥' : '♡';
        showToast(inWL ? 'Saved to wishlist' : 'Removed from wishlist', '♥');
      });
    });

    resultTurn.querySelectorAll('.property-card').forEach((card, i) => {
      card.addEventListener('click', e => {
        if (e.target.closest('.card-wishlist')) return;
        window.location.href = `property.html?id=${properties[i]._id}`;
      });
    });

    showFollowUp();
  }

  function buildPropertyCard(p) {
    const id           = p._id;
    const inWL         = wishlist.has(id);
    const badgeMap     = { new: 'New Launch', featured: 'Featured', premium: 'Premium' };
    const badgeLabel   = p.badge ? badgeMap[p.badge] : (p.status === 'underconstruction' ? 'Under Construction' : 'For Sale');
    const badgeClass   = p.badge || (p.status === 'underconstruction' ? 'new' : 'sale');
    const topAmenities = (p.amenities || []).slice(0, 3);

    return `
      <div class="property-card">
        <div class="card-image">
          <img src="${p.img}" alt="${p.title}" loading="lazy">
          <div class="card-overlay-gradient"></div>
          <div class="card-badge badge-${badgeClass}">${badgeLabel}</div>
          <button class="card-wishlist${inWL ? ' active' : ''}" data-id="${id}" title="Save to wishlist">${inWL ? '♥' : '♡'}</button>
          <div class="card-price-overlay">${p.price}</div>
        </div>
        <div class="card-body">
          <div class="card-title">${p.title}</div>
          <div class="card-location">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${p.locality}, ${p.city}
          </div>
          <div class="card-divider"></div>
          <div class="card-meta">
            <div class="card-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>${p.bhk} BHK</span>
            </div>
            <div class="card-meta-dot"></div>
            <div class="card-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span>${p.area.toLocaleString()} sq ft</span>
            </div>
            <div class="card-meta-dot"></div>
            <div class="card-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 12h20"/></svg>
              <span>${p.baths} Bath${p.baths > 1 ? 's' : ''}</span>
            </div>
          </div>
          ${topAmenities.length ? `<div class="card-amenity-tags">${topAmenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }

  async function showFollowUp() {
    const opts = [
      { label: 'Start a New Search',     subtext: 'Explore with different preferences', action: 'restart' },
      { label: 'Explore All Properties', subtext: 'Browse our full inventory',           action: 'listings' },
      { label: 'Talk to an Expert',      subtext: 'Get personalised guidance',           action: 'agent' }
    ];
    const turn = await appendTurn(
      `What would you like to do next, ${customerName}?`,
      buildOpts(opts), 400
    );
    turn.querySelectorAll('.conv-opt-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        lockTurn(turn, opts[i].label);
        const a = opts[i].action;
        if (a === 'restart')  { restartConversation(); return; }
        if (a === 'listings') { window.location.href = 'listings.html'; return; }
        if (a === 'agent')    { window.location.href = 'contact.html'; return; }
      });
    });
    setTimeout(() => {
      document.getElementById('page-footer').style.display = '';
      smoothScrollToBottom();
    }, 800);
  }

  /* ── Lifecycle ── */
  function startConversation(name) {
    section.innerHTML = '';
    userFilters = {};
    document.getElementById('page-footer').style.display = 'none';
    step_propertyType();
  }

  function restartConversation() {
    customerName = customerName || localStorage.getItem('customer_name') || '';
    userFilters  = {};
    section.innerHTML = '';
    document.getElementById('page-footer').style.display = 'none';

    if (customerName) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startConversation(customerName);
      return;
    }

    let overlay = document.getElementById('name-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id        = 'name-modal';
      overlay.className = 'name-modal-overlay';
      overlay.innerHTML = `
        <div class="name-modal-box">
          <div class="nm-avatar" style="background:#1a1810;border:1.5px solid rgba(201,169,110,0.5);font-family:'Cormorant Garamond',serif;color:#c9a96e;font-size:1rem;letter-spacing:0.04em;display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;margin:0 auto 1rem;">Aria</div>
          <div class="nm-brand">Luxe<span>.</span>Estates</div>
          <h3 class="nm-title">Welcome back! 👋</h3>
          <p class="nm-sub">Let's find you another perfect home. What should I call you?</p>
          <input id="modal-name-input" class="nm-input" type="text" placeholder="Your name…" autocomplete="given-name" maxlength="40">
          <button id="modal-start-btn" class="nm-btn">
            Start a New Search
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>`;
      document.body.appendChild(overlay);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => initNameModal(), 400);
  }

  function initNameModal() {
    const overlay  = document.getElementById('name-modal');
    const input    = document.getElementById('modal-name-input');
    const startBtn = document.getElementById('modal-start-btn');
    if (!overlay) return;

    const saved = localStorage.getItem('customer_name');
    if (saved) {
      customerName = saved;
      overlay.style.display = 'none';
      startConversation(customerName);
      return;
    }

    overlay.style.display = '';
    requestAnimationFrame(() => overlay.classList.add('visible'));
    setTimeout(() => input?.focus(), 400);

    const newBtn   = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    function submit() {
      const nameVal = document.getElementById('modal-name-input').value.trim();
      if (!nameVal) {
        const inp = document.getElementById('modal-name-input');
        inp.classList.add('shake');
        setTimeout(() => inp.classList.remove('shake'), 400);
        return;
      }
      customerName = nameVal;
      localStorage.setItem('customer_name', nameVal);
      overlay.classList.remove('visible');
      setTimeout(() => { overlay.style.display = 'none'; startConversation(nameVal); }, 350);
    }

    document.getElementById('modal-start-btn').addEventListener('click', submit);
    document.getElementById('modal-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  const _qs       = new URLSearchParams(window.location.search);
  const _locality = _qs.get('locality');
  const _type     = _qs.get('type');
  if (_locality || _type) {
    userFilters  = {};
    customerName = customerName || 'you';
    if (_type)     userFilters.type     = _type;
    if (_locality) userFilters.locality = _locality;
    document.getElementById('page-footer').style.display = 'none';
    showResults();
  } else {
    initNameModal();
  }
}

/* ════════════════════════════════════════════════════════════
   CONTACT FORM
════════════════════════════════════════════════════════════ */
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name    = form.querySelector('[name="name"]')?.value.trim();
    const email   = form.querySelector('[name="email"]')?.value.trim();
    const phone   = form.querySelector('[name="phone"]')?.value.trim();
    const message = form.querySelector('[name="message"]')?.value.trim();
    if (!name || !email || !message) { showToast('Please fill in all required fields', '⚠'); return; }
    const btn  = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Sending…'; btn.disabled = true;
    try {
      const res  = await fetch(`${API}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, message }) });
      const data = await res.json();
      if (data.success) { showToast("Message sent! We'll be in touch shortly.", '✓'); form.reset(); }
      else showToast(data.error || 'Something went wrong', '✗');
    } catch { showToast('Network error — please try again', '✗'); }
    finally { btn.textContent = orig; btn.disabled = false; }
  });
}

/* ════════════════════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

/* ════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initContactForm();
  initScrollReveal();

  if (document.getElementById('conversation-section')) {
    try {
      const res  = await fetch(`${API}/api/properties/meta`);
      const data = await res.json();
      if (data.success) META = { localities: data.localities, amenities: data.amenities };
    } catch {
      META = {
        localities: ['Banjara Hills','Gachibowli','Jubilee Hills','Kokapet','Kondapur','Manikonda','Miyapur','Nallagandla','Puppalaguda','Shankarpally'],
        amenities:  ['24/7 Security','Children Play Area','Clubhouse','Covered Parking','Gym','Jogging Track','Landscaped Garden','Parking','Power Backup','Swimming Pool']
      };
    }
    initConversation();
  }
});