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
   LEAD CAPTURE MODAL  (Step 1: details  →  Step 2: WhatsApp OTP)
════════════════════════════════════════════════════════════ */
function showLeadModal(onSuccess) {
  const existing = document.getElementById('lead-modal-overlay');
  if (existing) existing.remove();

  /* ── shared styles injected once ── */
  if (!document.getElementById('lead-modal-css')) {
    const s = document.createElement('style');
    s.id = 'lead-modal-css';
    s.textContent = `
      #lead-modal-overlay {
        position:fixed;inset:0;z-index:10001;
        background:rgba(0,0,0,0.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
        display:flex;align-items:center;justify-content:center;padding:1rem;
        opacity:0;transition:opacity 0.3s ease;
      }
      #lead-modal-box {
        background:#141416;border:1px solid rgba(201,169,110,0.35);border-radius:20px;
        padding:2.5rem 2rem;max-width:400px;width:100%;text-align:center;
        box-shadow:0 48px 120px rgba(0,0,0,0.85);
        transform:scale(0.9) translateY(16px);
        transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }
      .lm-aria-badge {
        width:52px;height:52px;border-radius:50%;
        background:#1a1810;border:1.5px solid rgba(201,169,110,0.5);
        display:flex;align-items:center;justify-content:center;
        margin:0 auto 1rem;
        font-family:'Cormorant Garamond',Georgia,serif;
        color:#c9a96e;font-size:1rem;letter-spacing:0.04em;
      }
      .lm-brand { font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:#5a5752;margin-bottom:1.25rem; }
      .lm-brand span { color:#c9a96e; }
      .lm-title { font-family:'Cormorant Garamond',Georgia,serif;font-size:1.65rem;font-weight:300;color:#f0ebe2;line-height:1.25;margin-bottom:0.5rem; }
      .lm-sub  { font-size:0.84rem;color:#5a5752;line-height:1.65;margin-bottom:1.75rem; }
      .lm-error {
        display:none;background:rgba(220,60,60,0.12);border:1px solid rgba(220,60,60,0.3);
        color:#f08080;font-size:0.8rem;border-radius:8px;padding:0.65rem 0.9rem;
        margin-bottom:0.9rem;text-align:left;
      }
      .lm-input {
        width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.22);
        border-radius:10px;padding:0.85rem 1rem;color:#f0ebe2;
        font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;
        box-sizing:border-box;transition:border-color 0.25s,box-shadow 0.25s;
      }
      .lm-input:focus { border-color:#c9a96e;box-shadow:0 0 0 3px rgba(201,169,110,0.12); }
      .lm-input-wrap { display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem; }
      .lm-btn {
        width:100%;padding:0.95rem;background:#c9a96e;color:#0d0d0e;border:none;border-radius:10px;
        font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:600;letter-spacing:0.04em;
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.55rem;
        margin-bottom:0.75rem;transition:background 0.25s,transform 0.2s,opacity 0.2s;
      }
      .lm-btn:hover:not(:disabled) { background:#e0c898;transform:translateY(-1px); }
      .lm-btn:disabled { opacity:0.55;cursor:not-allowed; }
      .lm-note { font-size:0.68rem;color:#2e2d2b; }

      /* OTP digit row */
      .lm-otp-row {
        display:flex;gap:0.55rem;justify-content:center;margin-bottom:1.25rem;
      }
      .lm-otp-digit {
        width:46px;height:56px;
        background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.28);
        border-radius:10px;color:#f0ebe2;
        font-family:'Cormorant Garamond',Georgia,serif;font-size:1.5rem;font-weight:600;
        text-align:center;outline:none;caret-color:#c9a96e;
        transition:border-color 0.2s,box-shadow 0.2s;
        -moz-appearance:textfield;
      }
      .lm-otp-digit::-webkit-outer-spin-button,
      .lm-otp-digit::-webkit-inner-spin-button { -webkit-appearance:none; }
      .lm-otp-digit:focus { border-color:#c9a96e;box-shadow:0 0 0 3px rgba(201,169,110,0.12); }
      .lm-otp-digit.filled { border-color:rgba(201,169,110,0.55); }
      .lm-otp-digit.error  { border-color:#e05a5a;animation:lmShake 0.35s ease; }
      @keyframes lmShake {
        0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)}
        50%{transform:translateX(5px)} 80%{transform:translateX(-3px)}
      }
      .lm-resend-row { display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:1.25rem; }
      .lm-resend-btn {
        background:none;border:none;color:#c9a96e;font-family:'DM Sans',sans-serif;
        font-size:0.8rem;cursor:pointer;padding:0;text-decoration:underline;
        transition:color 0.2s;
      }
      .lm-resend-btn:hover { color:#e0c898; }
      .lm-resend-btn:disabled { color:#2e2d2b;cursor:not-allowed;text-decoration:none; }
      .lm-countdown { font-size:0.8rem;color:#5a5752; }
      .lm-wa-badge {
        display:inline-flex;align-items:center;gap:0.35rem;
        font-size:0.72rem;color:#25d366;margin-bottom:1.25rem;
      }
      .lm-step { transition:opacity 0.25s,transform 0.25s; }
      .lm-step.hidden { display:none; }
    `;
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'lead-modal-overlay';
  overlay.innerHTML = `
    <div id="lead-modal-box">
      <div class="lm-aria-badge">Aria</div>
      <p class="lm-brand">Luxe<span>.</span>Estates</p>

      <!-- ── STEP 1: Details ── -->
      <div id="lm-step1" class="lm-step">
        <h3 class="lm-title">Almost there!</h3>
        <p class="lm-sub">Share your details so our agents can reach out with personalised options.</p>
        <div id="lm-error1" class="lm-error"></div>
        <div class="lm-input-wrap">
          <input id="lead-name"  class="lm-input" type="text"  placeholder="Full name *"    maxlength="80" autocomplete="name">
          <div style="display:flex;gap:0.6rem;align-items:center">
            <select id="lead-cc" style="background:rgba(255,255,255,0.04);border:1px solid rgba(201,169,110,0.22);border-radius:10px;padding:0.85rem 0.75rem;color:#f0ebe2;font-family:'DM Sans',sans-serif;font-size:0.9rem;outline:none;flex-shrink:0;cursor:pointer;transition:border-color 0.25s">
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+61">🇦🇺 +61</option>
            </select>
            <input id="lead-phone" class="lm-input" type="tel" placeholder="Phone number *" maxlength="15" autocomplete="tel-national" style="flex:1">
          </div>
          <input id="lead-email" class="lm-input" type="email" placeholder="Email address *" maxlength="120" autocomplete="email">
        </div>
        <button id="lead-submit" class="lm-btn">
          <span id="lead-btn-text">Send WhatsApp OTP</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.72 3.36 2 2 0 0 1 3.72 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </button>
        <p class="lm-note">Your details are safe with us. No spam, ever.</p>
      </div>

      <!-- ── STEP 2: OTP ── -->
      <div id="lm-step2" class="lm-step hidden">
        <h3 class="lm-title">Check WhatsApp</h3>
        <p class="lm-sub" id="lm-otp-sub">We sent a 6-digit code to your WhatsApp number.</p>
        <div class="lm-wa-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.853L0 24l6.335-1.524A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.005-1.374l-.359-.213-3.72.895.912-3.628-.234-.372A9.818 9.818 0 0 1 2.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/></svg>
          Sent via WhatsApp
        </div>
        <div id="lm-error2" class="lm-error"></div>
        <div class="lm-otp-row" id="lm-otp-row">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="0">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="1">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="2">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="3">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="4">
          <input class="lm-otp-digit" type="number" min="0" max="9" maxlength="1" inputmode="numeric" data-idx="5">
        </div>
        <button id="lm-verify-btn" class="lm-btn">
          <span id="lm-verify-text">Verify & Show Properties</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="lm-resend-row">
          <button id="lm-resend-btn" class="lm-resend-btn" disabled>Resend OTP</button>
          <span class="lm-countdown" id="lm-countdown">in <strong id="lm-countdown-num">60</strong>s</span>
        </div>
        <button id="lm-back-btn" style="background:none;border:none;color:#5a5752;font-family:'DM Sans',sans-serif;font-size:0.78rem;cursor:pointer;padding:0;letter-spacing:0.05em;transition:color 0.2s" onmouseover="this.style.color='#c9a96e'" onmouseout="this.style.color='#5a5752'">← Change phone number</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    document.getElementById('lead-modal-box').style.transform = 'scale(1) translateY(0)';
  });

  setTimeout(() => document.getElementById('lead-name')?.focus(), 350);

  /* ── Focus/blur styles for detail inputs ── */
  ['lead-name','lead-phone','lead-email','lead-cc'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { el.style.borderColor='#c9a96e'; el.style.boxShadow='0 0 0 3px rgba(201,169,110,0.12)'; });
    el.addEventListener('blur',  () => { el.style.borderColor='rgba(201,169,110,0.22)'; el.style.boxShadow='none'; });
  });

  /* ── Helpers ── */
  function showError(step, msg) {
    const el = document.getElementById(`lm-error${step}`);
    el.textContent = msg;
    el.style.display = 'block';
  }
  function clearError(step) {
    const el = document.getElementById(`lm-error${step}`);
    el.textContent = '';
    el.style.display = 'none';
  }
  function setStep(n) {
    document.getElementById('lm-step1').classList.toggle('hidden', n !== 1);
    document.getElementById('lm-step2').classList.toggle('hidden', n !== 2);
    if (n === 2) setTimeout(() => document.querySelector('.lm-otp-digit')?.focus(), 200);
  }

  /* ── OTP digit UX ── */
  const digits = Array.from(document.querySelectorAll('.lm-otp-digit'));
  digits.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const v = inp.value.replace(/\D/g, '').slice(-1);
      inp.value = v;
      inp.classList.toggle('filled', !!v);
      if (v && i < 5) digits[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) { digits[i - 1].focus(); digits[i - 1].value = ''; digits[i - 1].classList.remove('filled'); }
    });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      text.split('').forEach((ch, j) => { if (digits[j]) { digits[j].value = ch; digits[j].classList.add('filled'); } });
      const next = Math.min(text.length, 5);
      digits[next].focus();
    });
  });

  function getOtpValue() { return digits.map(d => d.value).join(''); }

  function shakeDigits() {
    digits.forEach(d => { d.classList.add('error'); setTimeout(() => d.classList.remove('error'), 400); });
  }

  /* ── Countdown timer ── */
  let countdownTimer = null;
  function startCountdown(secs = 60) {
    const numEl   = document.getElementById('lm-countdown-num');
    const countEl = document.getElementById('lm-countdown');
    const resend  = document.getElementById('lm-resend-btn');
    resend.disabled = true;
    countEl.style.display = '';
    let remaining = secs;
    numEl.textContent = remaining;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      remaining--;
      numEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        resend.disabled = false;
        countEl.style.display = 'none';
      }
    }, 1000);
  }

  /* ── STEP 1: Submit details + send OTP ── */
  let verifiedPhone = '';

  async function submitDetails() {
    const name  = document.getElementById('lead-name').value.trim();
    const cc    = document.getElementById('lead-cc').value;
    const phone = document.getElementById('lead-phone').value.trim();
    const email = document.getElementById('lead-email').value.trim();

    clearError(1);

    if (!name || !phone || !email) {
      showError(1, 'Please fill in all fields.');
      ['lead-name','lead-phone','lead-email'].forEach(id => {
        const el = document.getElementById(id);
        if (!el.value.trim()) { el.style.borderColor = '#e05a5a'; setTimeout(() => { el.style.borderColor = 'rgba(201,169,110,0.22)'; }, 600); }
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError(1, 'Please enter a valid email address.'); return; }
    if (!/^\d{7,14}$/.test(phone.replace(/\s/g, ''))) { showError(1, 'Please enter a valid phone number.'); return; }

    const fullPhone = cc + phone.replace(/\s/g, '');
    verifiedPhone   = fullPhone;

    const btn  = document.getElementById('lead-submit');
    const txt  = document.getElementById('lead-btn-text');
    btn.disabled = true; txt.textContent = 'Sending OTP…';

    try {
      const res  = await fetch(`${API}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, name })
      });
      const data = await res.json();

      if (!data.success) {
        showError(1, data.error || 'Failed to send OTP. Please try again.');
        btn.disabled = false; txt.textContent = 'Send WhatsApp OTP';
        return;
      }

      /* Save lead details to server (non-blocking) */
      fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: fullPhone, email, filters: userFilters })
      }).catch(() => {});

      document.getElementById('lm-otp-sub').textContent =
        `We sent a 6-digit code to ${fullPhone} on WhatsApp.`;

      setStep(2);
      startCountdown(60);
    } catch (_) {
      showError(1, 'Network error. Please check your connection.');
      btn.disabled = false; txt.textContent = 'Send WhatsApp OTP';
    }
  }

  /* ── STEP 2: Verify OTP ── */
  async function verifyOtp() {
    const otp = getOtpValue();
    clearError(2);

    if (otp.length < 6) { shakeDigits(); showError(2, 'Please enter the complete 6-digit code.'); return; }

    const btn = document.getElementById('lm-verify-btn');
    const txt = document.getElementById('lm-verify-text');
    btn.disabled = true; txt.textContent = 'Verifying…';

    try {
      const res  = await fetch(`${API}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone, otp })
      });
      const data = await res.json();

      if (!data.success) {
        shakeDigits();
        showError(2, data.error || 'Incorrect OTP. Please try again.');
        digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
        digits[0].focus();
        btn.disabled = false; txt.textContent = 'Verify & Show Properties';
        return;
      }

      /* ✓ Verified — close and show results */
      clearInterval(countdownTimer);
      overlay.style.opacity = '0';
      document.getElementById('lead-modal-box').style.transform = 'scale(0.93) translateY(8px)';
      setTimeout(() => { overlay.remove(); onSuccess(); }, 300);

    } catch (_) {
      showError(2, 'Network error. Please try again.');
      btn.disabled = false; txt.textContent = 'Verify & Show Properties';
    }
  }

  /* ── Resend OTP ── */
  async function resendOtp() {
    clearError(2);
    const name = document.getElementById('lead-name').value.trim();
    const btn  = document.getElementById('lm-resend-btn');
    btn.disabled = true;

    try {
      const res  = await fetch(`${API}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone, name })
      });
      const data = await res.json();
      if (data.success) {
        digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
        digits[0].focus();
        startCountdown(60);
        showToast('New OTP sent via WhatsApp', '📲');
      } else {
        showError(2, data.error || 'Could not resend OTP.');
        btn.disabled = false;
      }
    } catch (_) {
      showError(2, 'Network error. Please try again.');
      btn.disabled = false;
    }
  }

  /* ── Wire events ── */
  document.getElementById('lead-submit').addEventListener('click', submitDetails);
  ['lead-name','lead-phone','lead-email'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitDetails(); });
  });

  document.getElementById('lm-verify-btn').addEventListener('click', verifyOtp);
  document.getElementById('lm-resend-btn').addEventListener('click', resendOtp);
  document.getElementById('lm-back-btn').addEventListener('click', () => {
    clearError(2); clearError(1); setStep(1);
    const btn = document.getElementById('lead-submit');
    const txt = document.getElementById('lead-btn-text');
    btn.disabled = false; txt.textContent = 'Send WhatsApp OTP';
  });

  /* Allow Enter key on last OTP digit to submit */
  digits[5].addEventListener('keydown', e => { if (e.key === 'Enter') verifyOtp(); });
}
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
    localStorage.removeItem('customer_name');
    customerName = '';
    userFilters  = {};
    section.innerHTML = '';
    document.getElementById('page-footer').style.display = 'none';

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