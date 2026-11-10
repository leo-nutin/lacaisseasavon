/* La Caisse à Savon — mini-jeu « vitre recouverte de mousse » (popup d'accueil)
   Chargé avec <script src="jeu.js" defer>. Si ce fichier est absent, le site fonctionne normalement. */
(function () {
  'use strict';

  var KEY_SEEN = 'lcas_game_seen';   // le visiteur a fermé / rejeté : on ne le redérange plus
  var KEY_DISC = 'lcas_discount';    // 'active' = remise gagnée et acceptée, 'used' = déjà utilisée
  var W = 720, H = 480;              // résolution interne des canvas
  var THRESHOLD = 0.35;              // vitre révélée quand il reste moins de 35 % de mousse
  var DELAY_MS = 10000;              // la popup apparaît 10 s après l'arrivée

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  var force = false;
  try { force = new URLSearchParams(window.location.search).get('jeu') === '1'; } catch (e) {}
  if (force) { lsDel(KEY_SEEN); lsDel(KEY_DISC); }       // ?jeu=1 dans l'adresse : pour tester
  if (lsGet(KEY_SEEN) || lsGet(KEY_DISC)) return;

  setTimeout(function () {
    // on ne dérange pas quelqu'un qui est déjà en train de réserver
    try { if (!force && typeof S !== 'undefined' && S.vehicle) return; } catch (e) {}
    if (document.getElementById('lcas-game')) return;
    openGame();
  }, force ? 500 : DELAY_MS);

  var CSS = [
    '.lg-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(2,4,10,.84);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .3s}',
    '.lg-overlay.lg-on{opacity:1}',
    '.lg-overlay [hidden]{display:none !important}',
    '.lg-card{position:relative;width:100%;max-width:540px;background:linear-gradient(160deg,#0b1228,#080d1a);border:1px solid rgba(26,111,255,.5);border-radius:22px;box-shadow:0 20px 70px rgba(0,0,0,.6),0 0 40px rgba(26,111,255,.2);color:#f0f6ff;font-family:Barlow,Arial,sans-serif;text-align:center}',
    '.lg-body{max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px);overflow-y:auto;overflow-x:hidden;padding:34px 20px 22px;border-radius:22px;-webkit-overflow-scrolling:touch}',
    '.lg-close{position:absolute;top:-10px;right:-6px;width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#d32020;color:#fff;font-size:1.35rem;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(211,32,32,.6);z-index:5;padding:0}',
    '.lg-close:hover{background:#f03a3a}',
    '.lg-close:focus-visible,.lg-btn:focus-visible,.lg-link:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.lg-kicker{font-size:.78rem;letter-spacing:4px;text-transform:uppercase;color:#2adaff;margin:0 0 .6rem}',
    '.lg-title{font-family:"Bebas Neue",Impact,sans-serif;font-weight:400;font-size:clamp(1.9rem,7vw,2.6rem);line-height:1.05;letter-spacing:1px;margin:0 0 .6rem;color:#fff}',
    '.lg-text{font-size:1rem;line-height:1.6;color:#d4e0f4;margin:0 0 1rem}',
    '.lg-small{font-size:.82rem;color:#b8c8e0;margin:.8rem 0 0}',
    '.lg-btn{font-family:inherit;font-size:.92rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:50px;padding:14px 26px;cursor:pointer;border:2px solid transparent;transition:all .25s}',
    '.lg-primary{background:#1a6fff;color:#fff}',
    '.lg-primary:hover{background:#00a8e0;box-shadow:0 0 26px rgba(26,111,255,.55)}',
    '.lg-ghost{background:transparent;color:#d4e0f4;border-color:rgba(160,190,230,.55)}',
    '.lg-ghost:hover{border-color:#fff;color:#fff}',
    '.lg-link{background:none;border:none;color:#9fdcff;text-decoration:underline;font-family:inherit;font-size:.85rem;cursor:pointer;margin-top:.7rem}',
    '.lg-glass{position:relative;width:100%;max-width:460px;margin:12px auto 0;aspect-ratio:3/2;border-radius:14px;padding:10px;background:linear-gradient(145deg,#3b4b6d,#1b2540);box-shadow:inset 0 0 0 2px rgba(255,255,255,.14),0 8px 26px rgba(0,0,0,.5);box-sizing:border-box}',
    '.lg-pane{position:relative;width:100%;height:100%;border-radius:7px;overflow:hidden;background:linear-gradient(135deg,#dff3ff 0%,#a9d8ff 55%,#cdeaff 100%)}',
    '.lg-pane:before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(115deg,rgba(255,255,255,.55) 0 11%,transparent 11% 19%,rgba(255,255,255,.3) 19% 23%,transparent 23%);pointer-events:none}',
    '.lg-prize{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 8px}',
    '.lg-prize-big{font-family:"Bebas Neue",Impact,sans-serif;font-size:clamp(3.4rem,19vw,6.2rem);line-height:1;color:#0b3fa8;text-shadow:0 2px 0 #fff}',
    '.lg-prize-sub{font-weight:700;color:#0b1a3a;font-size:clamp(.8rem,3.8vw,1.05rem)}',
    '.lg-won .lg-prize-big{animation:lgPop .6s ease}',
    '@keyframes lgPop{0%{transform:scale(.7)}60%{transform:scale(1.12)}100%{transform:scale(1)}}',
    '.lg-foam{position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none;cursor:none;transition:opacity .9s;-webkit-user-select:none;user-select:none}',
    '.lg-fx{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}',
    '.lg-gun{position:absolute;left:0;top:0;width:96px;height:72px;pointer-events:none;display:none;z-index:3;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}',
    '.lg-progress{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px auto 0;max-width:460px;font-size:.85rem;color:#c8d8f0}',
    '.lg-bar{flex:1;height:8px;border-radius:8px;background:rgba(255,255,255,.14);overflow:hidden}',
    '.lg-bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#1a6fff,#2adaff);transition:width .15s}',
    '.lg-confirm{margin:.2rem 0 1rem;padding:.7rem 1rem;border-radius:12px;background:rgba(211,32,32,.14);border:1px solid rgba(255,120,120,.55);color:#ffd9d9;font-size:.92rem;line-height:1.5}',
    '.lg-actions{display:flex;flex-direction:column;gap:10px;margin-top:.4rem}',
    '@media(min-width:520px){.lg-actions{flex-direction:row;justify-content:center}}',
    '@supports not (aspect-ratio:3/2){.lg-glass{height:260px}}',
    '@media(prefers-reduced-motion:reduce){.lg-overlay,.lg-foam{transition:none}.lg-won .lg-prize-big{animation:none}}'
  ].join('\n');

  var GUN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="96" height="72">' +
    '<path d="M104 26 C120 22 119 56 98 66" fill="none" stroke="#2b3550" stroke-width="5" stroke-linecap="round"/>' +
    '<line x1="16" y1="76" x2="72" y2="36" stroke="#9aa7bf" stroke-width="7" stroke-linecap="round"/>' +
    '<line x1="15" y1="75" x2="71" y2="35" stroke="#e3ebf8" stroke-width="2" stroke-linecap="round" opacity=".75"/>' +
    '<line x1="6" y1="84" x2="17" y2="76" stroke="#1a6fff" stroke-width="11" stroke-linecap="round"/>' +
    '<g transform="rotate(-30 88 30)"><rect x="66" y="16" width="44" height="26" rx="9" fill="#223153" stroke="#00c8ff" stroke-width="2"/>' +
    '<rect x="72" y="21" width="14" height="6" rx="3" fill="#00c8ff" opacity=".85"/></g>' +
    '<path d="M86 40 L95 70 L83 72 L77 44 Z" fill="#1b2744" stroke="#00c8ff" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M79 47 L77 58 L84 58 Z" fill="#00c8ff"/></svg>';
  var GUN_TIP_X = 4.8, GUN_TIP_Y = 67.2;   // pointe de la lance (en px, pour un pistolet de 96×72)

  var HTML =
    '<div class="lg-card">' +
      '<button type="button" class="lg-close" aria-label="Fermer la fenêtre">✕</button>' +
      '<div class="lg-body">' +
        '<div id="lg-intro">' +
          '<p class="lg-kicker">🎁 Offre de bienvenue</p>' +
          '<h2 class="lg-title" id="lg-title">Découvrez quelle réduction vous gagnez</h2>' +
          '<p class="lg-text">Une vitre recouverte de mousse cache votre surprise. Nettoyez-la au jet haute pression pour la révéler !</p>' +
          '<button type="button" class="lg-btn lg-primary" id="lg-start">Jouer maintenant</button>' +
          '<p class="lg-small">Jeu gratuit · sans inscription</p>' +
        '</div>' +
        '<div id="lg-game" hidden>' +
          '<h2 class="lg-title" id="lg-gtitle" aria-live="polite">Nettoyez la vitre !</h2>' +
          '<p class="lg-text" id="lg-hint">Maintenez le clic et glissez sur la mousse pour la retirer. Sur mobile, glissez simplement le doigt.</p>' +
          '<div class="lg-glass" id="lg-glass">' +
            '<div class="lg-pane" id="lg-pane">' +
              '<div class="lg-prize"><div class="lg-prize-big">-10%</div><div class="lg-prize-sub">sur votre première prestation</div></div>' +
              '<canvas class="lg-foam" id="lg-foam" width="' + W + '" height="' + H + '" role="img" aria-label="Vitre recouverte de mousse"></canvas>' +
              '<canvas class="lg-fx" id="lg-fx" width="' + W + '" height="' + H + '" aria-hidden="true"></canvas>' +
            '</div>' +
            '<div class="lg-gun" id="lg-gun" aria-hidden="true">' + GUN_SVG + '</div>' +
          '</div>' +
          '<div class="lg-progress" id="lg-progress" aria-hidden="true"><div class="lg-bar"><span id="lg-barfill"></span></div><span id="lg-pct">0 % nettoyé</span></div>' +
          '<button type="button" class="lg-link" id="lg-skip" hidden>Je n\'arrive pas à jouer : révéler la réduction</button>' +
          '<div id="lg-result" hidden>' +
            '<p class="lg-text">Utilisable sur la formule de votre choix. La remise s\'applique à la formule, pas aux options.</p>' +
            '<p class="lg-confirm" id="lg-confirm" role="alert" hidden></p>' +
            '<div class="lg-actions">' +
              '<button type="button" class="lg-btn lg-primary" id="lg-take">Profiter de la remise</button>' +
              '<button type="button" class="lg-btn lg-ghost" id="lg-reject">Rejeter la remise</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function paintFoam(ctx) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#e6f2ff';
    ctx.fillRect(0, 0, W, H);
    var i, n = Math.floor(W * H / 170);
    for (i = 0; i < n; i++) {                       // gros paquets de mousse
      var r = 10 + Math.random() * 30, x = Math.random() * W, y = Math.random() * H;
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(240,248,255,1)');
      g.addColorStop(1, 'rgba(190,217,242,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    n = Math.floor(W * H / 700);
    for (i = 0; i < n; i++) {                       // petites bulles brillantes
      var rr = 2 + Math.random() * 6, bx = Math.random() * W, by = Math.random() * H;
      ctx.strokeStyle = 'rgba(140,185,225,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(bx, by, rr * 0.6, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    }
  }

  function openGame() {
    var prevFocus = document.activeElement;
    var style = document.createElement('style');
    style.id = 'lcas-game-css'; style.textContent = CSS; document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.id = 'lcas-game'; ov.className = 'lg-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'lg-title');
    ov.innerHTML = HTML;
    document.body.appendChild(ov);
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { ov.classList.add('lg-on'); });

    function $(id) { return ov.querySelector('#' + id); }
    var cv = $('lg-foam'), fx = $('lg-fx'), glass = $('lg-glass'), gun = $('lg-gun');
    var ctx = cv.getContext('2d'), fctx = fx.getContext('2d');
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var down = false, won = false, last = null, chk = null, raf = null, skipTimer = null, confirming = false;
    var parts = [];

    paintFoam(ctx);
    var sc = document.createElement('canvas'); sc.width = 48; sc.height = 32;
    var sctx = sc.getContext('2d');

    function remaining() {                           // part de mousse restante (0 à 1)
      sctx.clearRect(0, 0, 48, 32);
      sctx.drawImage(cv, 0, 0, 48, 32);
      var d = sctx.getImageData(0, 0, 48, 32).data, s = 0, i;
      for (i = 3; i < d.length; i += 4) s += d[i];
      return s / (48 * 32 * 255);
    }
    function check() {
      chk = null;
      if (won) return;
      var rem = remaining();
      var p = Math.max(0, Math.min(1, (1 - rem) / (1 - THRESHOLD)));
      $('lg-barfill').style.width = Math.round(p * 100) + '%';
      $('lg-pct').textContent = Math.round(p * 100) + ' % nettoyé';
      if (rem < THRESHOLD) win();
    }
    function scheduleCheck() { if (!chk && !won) chk = setTimeout(check, 120); }

    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height), s: W / r.width };
    }
    function erase(a, b) {
      var rad = Math.max(26, 24 * b.s);               // ≈ 24 px à l'écran, quelle que soit la taille
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = rad * 2; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    function moveGun(e) {                              // la pointe du pistolet suit le doigt / la souris
      var gr = glass.getBoundingClientRect();
      gun.style.display = 'block';
      gun.style.transform = 'translate(' + (e.clientX - gr.left - GUN_TIP_X) + 'px,' + (e.clientY - gr.top - GUN_TIP_Y) + 'px)';
    }

    function emit(p) {                                 // gouttelettes d'eau
      var n = reduce ? 2 : 6, k;
      for (k = 0; k < n; k++) {
        var a = 2.35 + (Math.random() - 0.5) * 2.2;     // jet vers le bas-gauche + éclaboussures
        var v = 2 + Math.random() * 6;
        parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 16 + Math.random() * 18, max: 34, r: 1.5 + Math.random() * 3.2 });
      }
    }
    function loop() {
      fctx.clearRect(0, 0, W, H);
      if (down && last && !won) emit(last);
      var i;
      for (i = parts.length - 1; i >= 0; i--) {
        var q = parts[i];
        q.x += q.vx; q.y += q.vy; q.vy += 0.25; q.life -= 1;
        if (q.life <= 0) { parts.splice(i, 1); continue; }
        fctx.fillStyle = 'rgba(150,215,255,' + Math.min(0.85, q.life / q.max + 0.1) + ')';
        fctx.beginPath(); fctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); fctx.fill();
      }
      raf = (down || parts.length) && !won ? requestAnimationFrame(loop) : null;
    }
    function startLoop() { if (!raf && !won) raf = requestAnimationFrame(loop); }

    cv.addEventListener('pointerdown', function (e) {
      if (won) return;
      down = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      last = pos(e); erase(last, last); moveGun(e); startLoop(); scheduleCheck();
      if (e.cancelable) e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (won) return;
      moveGun(e);
      if (!down) return;
      var p = pos(e); erase(last, p); last = p; scheduleCheck();
    });
    function up(e) {
      down = false;
      if (e && e.pointerType && e.pointerType !== 'mouse') gun.style.display = 'none';
      scheduleCheck();
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function (e) { if (!down) gun.style.display = 'none'; });

    function win() {
      if (won) return;
      won = true; down = false;
      if (chk) { clearTimeout(chk); chk = null; }
      if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }
      fctx.clearRect(0, 0, W, H); parts.length = 0;
      gun.style.display = 'none';
      cv.style.opacity = '0';
      setTimeout(function () { if (cv) { cv.style.display = 'none'; fx.style.display = 'none'; } }, 950);
      $('lg-pane').classList.add('lg-won');
      $('lg-gtitle').textContent = 'Bravo ! Vous gagnez -10 % 🎉';
      $('lg-hint').hidden = true; $('lg-progress').hidden = true; $('lg-skip').hidden = true;
      $('lg-result').hidden = false;
      try { $('lg-take').focus(); } catch (err) {}
    }

    function destroy(markSeen) {
      if (markSeen) lsSet(KEY_SEEN, '1');
      if (chk) clearTimeout(chk);
      if (skipTimer) clearTimeout(skipTimer);
      if (raf) cancelAnimationFrame(raf);
      won = true;
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (style.parentNode) style.parentNode.removeChild(style);
      try { if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) prevFocus.focus(); } catch (err) {}
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); destroy(true); return; }
      if (e.key !== 'Tab') return;
      var f = ov.querySelectorAll('button:not([hidden])'), items = [], i;
      for (i = 0; i < f.length; i++) { if (f[i].offsetParent !== null || f[i] === document.activeElement) items.push(f[i]); }
      if (!items.length) return;
      var first = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);

    // croix rouge : ferme tout, immédiatement, à tout moment
    ov.querySelector('.lg-close').addEventListener('click', function () { destroy(true); });

    $('lg-start').addEventListener('click', function () {
      $('lg-intro').hidden = true; $('lg-game').hidden = false;
      skipTimer = setTimeout(function () { if (!won) $('lg-skip').hidden = false; }, 8000);
    });
    $('lg-skip').addEventListener('click', win);

    $('lg-take').addEventListener('click', function () {
      lsSet(KEY_DISC, 'active');
      destroy(false);
      try { window.dispatchEvent(new Event('lcas-discount')); } catch (err) {}
      var b = document.getElementById('booking');
      if (b && b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('lg-reject').addEventListener('click', function () {
      if (!confirming) {                                // 1er clic : on demande confirmation
        confirming = true;
        var c = $('lg-confirm');
        c.textContent = 'Êtes-vous sûr ? Cette remise n\'est valable qu\'une seule fois.';
        c.hidden = false;
        $('lg-reject').textContent = 'Oui, rejeter la remise';
      } else {                                          // 2e clic : la fenêtre disparaît sans laisser de trace
        destroy(true);
      }
    });

    try { $('lg-start').focus(); } catch (err) {}
  }
})();
