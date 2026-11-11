/* ===== B2 First – motor común: navegación, audio (TTS), ejercicios, puntuación ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const L = 'ABCDEFGHIJ';

/* ---------- Navegación ---------- */
const NAV = [
  ['index.html', 'Inicio'],
  ['guia.html', 'El examen'],
  ['gramatica.html', 'Gramática'],
  ['vocabulario.html', 'Vocabulario'],
  ['use-of-english.html', 'Use of English'],
  ['reading.html', 'Reading'],
  ['writing.html', 'Writing'],
  ['listening.html', 'Listening'],
  ['speaking.html', 'Speaking'],
  ['plan.html', 'Plan 50 días'],
  ['examenes.html', '50 Exámenes'],
];
function renderNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `<div class="in"><a class="logo" href="index.html">B2 <span>First</span></a>
    <button class="btn ghost sm menu-btn" aria-label="Menú">☰ Menú</button>
    <nav class="nav">${NAV.map(([h, t]) => `<a href="${h}" class="${here === h || (here === 'examen.html' && h === 'examenes.html') ? 'on' : ''}">${t}</a>`).join('')}
    <a href="#" id="themeBtn" title="Cambiar tema">◐</a></nav></div>`;
  document.body.prepend(bar);
  $('.menu-btn', bar).onclick = () => $('.nav', bar).classList.toggle('open');
  const saved = store.get('theme');
  if (saved) document.documentElement.dataset.theme = saved;
  $('#themeBtn').onclick = e => {
    e.preventDefault();
    const cur = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nx; store.set('theme', nx);
  };
  const f = document.createElement('footer');
  f.innerHTML = 'Preparación B2 First (Cambridge) · Material original de práctica, no oficial · Tu progreso se guarda solo en este navegador.';
  document.body.append(f);
}

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('b2f.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('b2f.' + k, JSON.stringify(v)); } catch { } },
};

/* ---------- Utilidades ---------- */
const norm = s => (s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim();
const paras = t => t.split(/\n\s*\n/).map(p => `<p>${p.trim()}</p>`).join('');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- Audio con síntesis de voz ---------- */
const TTS = {
  voices: [], rate: store.get('rate', 0.95), token: 0,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); };
    load(); speechSynthesis.onvoiceschanged = load;
  },
  pools() {
    const male = /male(?!.*female)|daniel|george|ryan|guy|david|arthur|oliver|thomas|alex|fred|james|brian|eric|mark|rishi/i;
    const female = /female|hazel|susan|libby|sonia|zira|samantha|serena|kate|karen|moira|tessa|emma|aria|jenny|amy|fiona|victoria|martha/i;
    const sort = a => a.sort((x, y) => (/GB/i.test(y.lang) - /GB/i.test(x.lang)));
    const v = this.voices;
    return { m: sort(v.filter(x => male.test(x.name) && !/female/i.test(x.name))), f: sort(v.filter(x => female.test(x.name))), all: sort([...v]) };
  },
  voiceFor(who) {
    const p = this.pools(); const g = (who || 'N')[0]; const second = /2$/.test(who || '');
    if (g === 'M') { const v = p.m[second ? 1 : 0] || p.m[0]; return { voice: v || p.all[second ? 1 : 0] || null, pitch: v ? (second ? 0.95 : 1) : (second ? 0.85 : 0.7) }; }
    if (g === 'W') { const v = p.f[second ? 1 : 0] || p.f[0]; return { voice: v || p.all[second ? 1 : 0] || null, pitch: v ? (second ? 1.08 : 1) : (second ? 1.35 : 1.2) }; }
    return { voice: p.f[0] || p.all[0] || null, pitch: 1 };
  },
  play(lines, onDone) {
    if (!('speechSynthesis' in window)) { alertBox('Tu navegador no tiene síntesis de voz. Usa Chrome, Edge o Safari, o lee la transcripción.'); return; }
    speechSynthesis.cancel();
    const my = ++this.token;
    const queue = [];
    lines.forEach(([who, text]) => text.split(/(?<=[.!?])\s+(?=[A-Z"'‘])/).forEach(s => s.trim() && queue.push([who, s])));
    let i = 0, prev = null;
    const next = () => {
      if (my !== this.token) return;
      if (i >= queue.length) { onDone && onDone(); return; }
      const [who, text] = queue[i++];
      const u = new SpeechSynthesisUtterance(text);
      const v = this.voiceFor(who);
      if (v.voice) { u.voice = v.voice; u.lang = v.voice.lang; } else u.lang = 'en-GB';
      u.pitch = v.pitch; u.rate = this.rate;
      u.onend = () => setTimeout(next, prev !== null && prev !== who ? 250 : 120);
      u.onerror = () => setTimeout(next, 50);
      prev = who;
      speechSynthesis.speak(u);
    };
    setTimeout(next, 150);
  },
  stop() { this.token++; if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};
TTS.init();
function alertBox(msg) { const d = document.createElement('div'); d.className = 'warn'; d.textContent = msg; document.querySelector('.wrap')?.prepend(d); }

/* Barra de audio: lines = [[voz, texto],...]; maxPlays: null = ilimitado */
function audioBar(lines, maxPlays = null, label = 'Escuchar') {
  const bar = document.createElement('div');
  bar.className = 'audio-bar';
  let plays = 0;
  bar.innerHTML = `<button class="btn sm play">▶ ${label}</button><button class="btn ghost sm stop">■ Parar</button>
   <span class="plays">${maxPlays ? `Escuchas: 0/${maxPlays}` : ''}</span>
   <label class="small muted">Velocidad <select class="rate"><option value="0.8">lenta</option><option value="0.95">normal</option><option value="1.05">examen</option></select></label>`;
  $('.rate', bar).value = String(TTS.rate);
  $('.rate', bar).onchange = e => { TTS.rate = +e.target.value; store.set('rate', TTS.rate); };
  $('.play', bar).onclick = () => {
    if (maxPlays && plays >= maxPlays) return;
    plays++;
    if (maxPlays) $('.plays', bar).textContent = `Escuchas: ${plays}/${maxPlays}` + (plays >= maxPlays ? ' (como en el examen: solo 2)' : '');
    if (maxPlays && plays >= maxPlays) $('.play', bar).disabled = true;
    TTS.play(lines);
  };
  $('.stop', bar).onclick = () => TTS.stop();
  bar.unlock = () => { $('.play', bar).disabled = false; maxPlays = null; $('.plays', bar).textContent = 'Corregido: puedes volver a escucharlo libremente'; };
  return bar;
}
function transcriptHTML(lines, names = {}) {
  return `<details class="transcript"><summary>📄 Transcripción</summary>${lines.map(([w, t]) => `<p><b>${names[w] || ({ M: 'Man', W: 'Woman', M2: 'Man 2', W2: 'Woman 2', N: 'Narrator' }[w] || w)}:</b> ${esc(t)}</p>`).join('')}</details>`;
}

/* ---------- Marcado de respuestas ---------- */
function markEl(el, ok, correct, onAccept, explain) {
  el.classList.add(ok ? 'is-ok' : 'is-bad');
  if (el.matches('input,select,textarea')) el.disabled = true;
  const host = el.closest('.gap') || el.parentElement;
  if (!ok && correct != null) {
    const s = document.createElement('span'); s.className = 'fix'; s.textContent = '→ ' + correct;
    el.after(s);
    if (onAccept) {
      const b = document.createElement('button'); b.className = 'accept'; b.textContent = 'mi respuesta también vale';
      b.title = 'Si tu respuesta es equivalente y correcta, márcala como buena';
      b.onclick = () => { onAccept(); b.remove(); el.classList.remove('is-bad'); el.classList.add('is-ok'); s.textContent = '(aceptada) ' + s.textContent; };
      s.after(b);
    }
  }
  if (explain) {
    const x = document.createElement('span'); x.className = 'explain'; x.innerHTML = '💡 ' + explain;
    (el.closest('.gap') ? el.closest('.gap') : el).after(x);
  }
}
const okAny = (val, list) => list.some(a => norm(a) === norm(val));

/* ---------- Renderizadores (cada uno devuelve {check(), score()}) ---------- */
const R = {};

/* Part 1: Multiple-choice cloze. d = {text, opts:[[4]], ans:[idx], exp?:[]} */
/* Orden de opciones: en los exámenes (window.SHUFFLE) se barajan de forma fija por pregunta */
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function order(n, key) {
  const a = [...Array(n).keys()]; if (!window.SHUFFLE) return a;
  let h = hashStr(key);
  for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
R.p1 = (el, d, pts = 1) => { let k = 0; const ords = d.opts.map((o, i) => order(o.length, o.join('|') + i));
  el.innerHTML = `<div class="ex-text">${paras(d.text.replace(/\[(\d+)\]/g, (m, n) =>
    `<span class="gap"><b>${n}</b><select data-i="${k}"><option value="">—</option>${ords[k].map((j, pos) => `<option value="${j}">${L[pos]} · ${d.opts[k][j]}</option>`).join('')}</select></span>${(k++, '')}`))}</div>`;
  let s = 0;
  return {
    check() { s = 0; $$('select[data-i]', el).forEach(x => { const i = +x.dataset.i, ok = x.value !== '' && +x.value === d.ans[i]; if (ok) s += pts; markEl(x, ok, `${L[ords[i].indexOf(d.ans[i])]} ${d.opts[i][d.ans[i]]}`, null, d.exp && d.exp[i]); }); },
    score: () => ({ score: s, max: d.ans.length * pts }),
  };
};

/* Part 2 / Part 3 / gaps abiertos. d = {text, ans:[[...]], stems?:[], exp?:[]} */
R.open = (el, d, pts = 1) => { let k = 0;
  el.innerHTML = `<div class="ex-text">${paras(d.text.replace(/\[(\d+)\]/g, (m, n) =>
    `<span class="gap"><b>${n}</b><input type="text" data-i="${k}" autocomplete="off" autocapitalize="off" spellcheck="false">${d.stems ? `<span class="stem">(${d.stems[k]})</span>` : ''}</span>${(k++, '')}`))}</div>`;
  let s = 0;
  return {
    check() { s = 0; $$('input', el).forEach(x => { const i = +x.dataset.i, ok = okAny(x.value, d.ans[i]); if (ok) s += pts; markEl(x, ok, d.ans[i].join(' / '), () => { s += pts; rescore(); }, d.exp && d.exp[i]); }); },
    score: () => ({ score: s, max: d.ans.length * pts }),
  };
};
R.p2 = R.open;
R.p3 = R.open;

/* Part 4: Key word transformations. d = [{s1, key, s2 (con ___), ans:[...], exp?}] */
R.p4 = (el, d, pts = 2) => {
  el.innerHTML = `<div class="p4">${d.map((t, i) => `<div class="p4item"><div><b>${i + 1}.</b> ${t.s1}</div>
    <div style="margin:.3rem 0"><span class="kw">${t.key}</span></div>
    <div>${t.s2.replace('___', `<input type="text" data-i="${i}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="2–5 palabras">`)}</div></div>`).join('')}</div>`;
  let s = 0;
  return {
    check() {
      s = 0; $$('input', el).forEach(x => {
        const i = +x.dataset.i, t = d[i], v = x.value; let ok = okAny(v, t.ans);
        const words = norm(v).split(' ').filter(Boolean).length;
        let note = t.exp || '';
        if (words > 5) note = '⚠ Has usado más de 5 palabras (las contracciones cuentan como 2). ' + note;
        if (v && !norm(v).split(' ').includes(norm(t.key))) note = '⚠ No has usado la palabra clave sin cambiarla. ' + note;
        if (ok) s += pts;
        markEl(x, ok, t.ans[0], () => { s += pts; rescore(); }, note);
      });
    },
    score: () => ({ score: s, max: d.length * pts }),
  };
};

/* Preguntas de opción múltiple genéricas. qs=[{q, o:[...], a, exp?}] */
function mcqHTML(qs, base, start = 1) {
  return qs.map((q, i) => `<div class="q" data-i="${i}"><div class="qt">${start + i}. ${q.q}</div>${optsHTML(q, `${base}-${i}`)}</div>`).join('');
}
function optsHTML(q, name) {
  return order(q.o.length, q.q + '|' + q.o.join('|')).map((j, pos) =>
    `<label class="opt"><input type="radio" name="${name}" value="${j}"><span><b>${L[pos]}</b> ${q.o[j]}</span></label>`).join('');
}
function mcqCheck(el, qs, pts) {
  let s = 0;
  $$('.q', el).forEach(qd => {
    const i = +qd.dataset.i, q = qs[i];
    const sel = $('input:checked', qd); const v = sel ? +sel.value : -1;
    $$('input', qd).forEach(x => x.disabled = true);
    const lab = j => $$('.opt', qd).find(l => +$('input', l).value === j);
    lab(q.a).classList.add('is-ok');
    if (v === q.a) s += pts; else if (v >= 0) lab(v).classList.add('is-bad');
    if (v < 0) { const n = document.createElement('div'); n.className = 'fix'; n.textContent = 'Sin responder → ' + $('b', lab(q.a)).textContent; qd.append(n); }
    if (q.exp) { const x = document.createElement('div'); x.className = 'explain'; x.innerHTML = '💡 ' + q.exp; qd.append(x); }
  });
  return s;
}
let uid = 0;

/* Part 5: texto + preguntas. d = {title, text, q:[...]} */
R.p5 = (el, d, pts = 2, start = 1) => {
  const b = 'q' + (++uid);
  el.innerHTML = `<div class="two-col"><div class="ex-text sticky" style="line-height:1.7"><h3 style="margin-top:0">${d.title || ''}</h3>${paras(d.text)}</div><div>${mcqHTML(d.q, b, start)}</div></div>`;
  let s = 0;
  return { check() { s = mcqCheck(el, d.q, pts); }, score: () => ({ score: s, max: d.q.length * pts }) };
};

/* Part 6: gapped text. d = {title, text con [n], sents:[7], ans:[idx de sents], exp?} */
R.p6 = (el, d, pts = 2) => { let k = 0;
  el.innerHTML = `<div class="two-col"><div class="ex-text" style="line-height:1.7"><h3 style="margin-top:0">${d.title || ''}</h3>${paras(d.text.replace(/\[(\d+)\]/g, (m, n) =>
    `<span class="gapline gap"><b>${n}</b><select data-i="${k++}"><option value="">—</option>${d.sents.map((x, j) => `<option value="${j}">${L[j]}</option>`).join('')}</select></span>`))}</div>
    <div class="card sticky"><b>Frases eliminadas</b> <span class="small muted">(sobra una)</span><ol type="A" class="sents">${d.sents.map(x => `<li>${x}</li>`).join('')}</ol></div></div>`;
  let s = 0;
  return {
    check() { s = 0; $$('select[data-i]', el).forEach(x => { const i = +x.dataset.i, ok = x.value !== '' && +x.value === d.ans[i]; if (ok) s += pts; markEl(x, ok, L[d.ans[i]], null, d.exp && d.exp[i]); }); },
    score: () => ({ score: s, max: d.ans.length * pts }),
  };
};

/* Part 7: multiple matching. d = {title, intro, sections:[{h,t}], q:[...], ans:[idx]} */
R.p7 = (el, d, pts = 1, start = 1) => {
  el.innerHTML = `<div class="two-col"><div class="ex-text sticky" style="line-height:1.7"><h3 style="margin-top:0">${d.title || ''}</h3>${d.intro ? `<p class="muted">${d.intro}</p>` : ''}
    ${d.sections.map((s, j) => `<p><span class="sec-h">${L[j]}</span> <b>${s.h}</b></p>${paras(s.t)}`).join('')}</div>
    <div>${d.q.map((q, i) => `<div class="q"><div class="qt">${start + i}. ${q}</div><span class="gap"><select data-i="${i}"><option value="">—</option>${d.sections.map((s, j) => `<option value="${j}">${L[j]} · ${s.h}</option>`).join('')}</select></span></div>`).join('')}</div></div>`;
  let s = 0;
  return {
    check() { s = 0; $$('select[data-i]', el).forEach(x => { const i = +x.dataset.i, ok = x.value !== '' && +x.value === d.ans[i]; if (ok) s += pts; markEl(x, ok, `${L[d.ans[i]]} (${d.sections[d.ans[i]].h})`, null, d.exp && d.exp[i]); }); },
    score: () => ({ score: s, max: d.ans.length * pts }),
  };
};

/* Listening Part 1: d = [{ctx, q, o:[3], a, script:[[voz,txt]]}] */
R.l1 = (el, d, maxPlays = 2) => {
  const b = 'l' + (++uid); const bars = [];
  el.innerHTML = d.map((x, i) => `<div class="q" data-i="${i}"><div class="qt">${i + 1}. <span class="muted">${x.ctx}</span><br>${x.q}</div><div class="slot"></div>${optsHTML(x, `${b}-${i}`)}<div class="tr"></div></div>`).join('');
  $$('.q', el).forEach((qd, i) => { const ab = audioBar([['N', d[i].ctx], ...d[i].script], maxPlays); bars.push(ab); $('.slot', qd).append(ab); });
  let s = 0;
  return {
    check() { s = mcqCheck(el, d, 1); $$('.q', el).forEach((qd, i) => { bars[i].unlock(); $('.tr', qd).innerHTML = transcriptHTML(d[i].script); }); },
    score: () => ({ score: s, max: d.length }),
  };
};

/* Listening Part 2: d = {intro, g:'M'|'W', script, sents:["... ___ ..."], ans:[[...]]} */
R.l2 = (el, d, maxPlays = 2) => {
  const lines = [['N', d.intro], [d.g || 'W', d.script]];
  el.innerHTML = `<p class="instr">${d.intro}</p><div class="slot"></div><div class="l2">${d.sents.map((t, i) =>
    `<div class="q"><b>${i + 1}.</b> ${t.replace('___', `<span class="gap"><input type="text" data-i="${i}" autocomplete="off" spellcheck="false"></span>`)}</div>`).join('')}</div><div class="tr"></div>`;
  const ab = audioBar(lines, maxPlays); $('.slot', el).append(ab);
  let s = 0;
  return {
    check() { s = 0; $$('input', el).forEach(x => { const i = +x.dataset.i, ok = okAny(x.value, d.ans[i]); if (ok) s++; markEl(x, ok, d.ans[i].join(' / '), () => { s++; rescore(); }); }); ab.unlock(); $('.tr', el).innerHTML = transcriptHTML([[d.g || 'W', d.script]], { M: 'Speaker', W: 'Speaker' }); },
    score: () => ({ score: s, max: d.ans.length }),
  };
};

/* Listening Part 3: d = {intro, opts:[8], speakers:[{g, t}], ans:[idx]} */
R.l3 = (el, d, maxPlays = 2) => {
  const lines = [['N', d.intro]];
  d.speakers.forEach((sp, i) => { lines.push(['N', 'Speaker ' + (i + 1) + '.']); lines.push([sp.g, sp.t]); });
  el.innerHTML = `<p class="instr">${d.intro}</p><div class="slot"></div>
   <div class="card"><ol type="A" class="sents">${d.opts.map(o => `<li>${o}</li>`).join('')}</ol></div>
   ${d.speakers.map((sp, i) => `<div class="q"><b>Speaker ${i + 1}</b> <span class="gap"><select data-i="${i}"><option value="">—</option>${d.opts.map((o, j) => `<option value="${j}">${L[j]}</option>`).join('')}</select></span></div>`).join('')}<div class="tr"></div>`;
  const ab = audioBar(lines, maxPlays); $('.slot', el).append(ab);
  let s = 0;
  return {
    check() {
      s = 0; $$('select[data-i]', el).forEach(x => { const i = +x.dataset.i, ok = x.value !== '' && +x.value === d.ans[i]; if (ok) s++; markEl(x, ok, `${L[d.ans[i]]} ${d.opts[d.ans[i]]}`, null, d.exp && d.exp[i]); });
      ab.unlock(); $('.tr', el).innerHTML = transcriptHTML(d.speakers.map((sp, i) => ['Speaker ' + (i + 1), sp.t]));
    },
    score: () => ({ score: s, max: d.ans.length }),
  };
};

/* Listening Part 4: d = {intro, names:{M:'Interviewer',...}, script:[[voz,txt]], q:[...]} */
R.l4 = (el, d, maxPlays = 2) => {
  const b = 'l4' + (++uid);
  el.innerHTML = `<p class="instr">${d.intro}</p><div class="slot"></div>${mcqHTML(d.q, b)}<div class="tr"></div>`;
  const ab = audioBar([['N', d.intro], ...d.script], maxPlays); $('.slot', el).append(ab);
  let s = 0;
  return { check() { s = mcqCheck(el, d.q, 1); ab.unlock(); $('.tr', el).innerHTML = transcriptHTML(d.script, d.names || {}); }, score: () => ({ score: s, max: d.q.length }) };
};

/* ---------- Writing: área de texto con contador ---------- */
function writingBox(key, min = 140, max = 190) {
  const w = document.createElement('div');
  const saved = store.get('w.' + key, '');
  w.innerHTML = `<textarea placeholder="Escribe aquí tu respuesta (${min}–${max} palabras)…"></textarea><div class="wc"></div>`;
  const ta = $('textarea', w), wc = $('.wc', w);
  ta.value = saved;
  const upd = () => { const n = (ta.value.match(/\b[\w'’-]+\b/g) || []).length; wc.textContent = `${n} palabras` + (n < min ? ` · faltan ${min - n} para el mínimo` : n > max ? ` · te pasas ${n - max}: recorta` : ' · ✓ longitud correcta'); store.set('w.' + key, ta.value); };
  ta.oninput = upd; upd();
  return w;
}

/* ---------- Grabadora (Speaking) ---------- */
function recorder() {
  const d = document.createElement('div'); d.className = 'rec';
  d.innerHTML = `<button class="btn sm ghost">🎙 Grabarme</button><span class="small muted"></span><audio controls style="display:none;max-width:100%"></audio>`;
  const btn = $('button', d), info = $('span', d), au = $('audio', d);
  let mr = null, chunks = [];
  btn.onclick = async () => {
    if (mr && mr.state === 'recording') { mr.stop(); return; }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      mr = new MediaRecorder(st); chunks = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { st.getTracks().forEach(t => t.stop()); au.src = URL.createObjectURL(new Blob(chunks)); au.style.display = ''; btn.textContent = '🎙 Grabar de nuevo'; info.textContent = 'Escúchate: ¿fluidez, pausas, errores?'; };
      mr.start(); btn.textContent = '⏹ Parar grabación'; info.textContent = 'Grabando…';
    } catch { info.textContent = 'No hay acceso al micrófono (da permiso en el navegador).'; }
  };
  return d;
}

/* ---------- Temporizador ---------- */
function timer(seconds, label = '') {
  const d = document.createElement('span'); d.className = 'row';
  d.innerHTML = `<button class="btn sm ghost">⏱ ${label || fmt(seconds)}</button><span class="timer">${fmt(seconds)}</span>`;
  let left = seconds, iv = null;
  const t = $('.timer', d);
  $('button', d).onclick = () => {
    if (iv) { clearInterval(iv); iv = null; return; }
    left = seconds; t.classList.remove('late');
    iv = setInterval(() => { left--; t.textContent = fmt(Math.abs(left)); if (left <= 0) { t.classList.add('late'); t.textContent = '-' + fmt(-left); } }, 1000);
  };
  return d;
}
function fmt(s) { s = Math.max(0, s); const m = Math.floor(s / 60), x = s % 60; return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }

/* ---------- Escala Cambridge (aproximada) ---------- */
function toScale(pct) {
  const pts = [[0, 100], [0.4, 140], [0.6, 160], [0.82, 180], [1, 190]];
  for (let i = 1; i < pts.length; i++) if (pct <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return Math.round(y0 + (y1 - y0) * (pct - x0) / (x1 - x0)); }
  return 190;
}
function grade(sc) {
  if (sc >= 180) return ['Grade A · nivel C1', 'good'];
  if (sc >= 173) return ['Grade B · B2 aprobado', 'good'];
  if (sc >= 160) return ['Grade C · B2 aprobado', 'good'];
  if (sc >= 140) return ['Nivel B1 · aún no aprobado', 'mid'];
  return ['Por debajo de B1', 'low'];
}

/* Recalcular puntuaciones visibles (cuando aceptas respuestas) */
const scoreHooks = [];
function rescore() { scoreHooks.forEach(f => f()); }

/* Montar un ejercicio de práctica con botón de corregir */
function practice(container, type, data, opts = {}) {
  const box = document.createElement('div');
  const body = document.createElement('div');
  const foot = document.createElement('div');
  foot.className = 'row'; foot.style.marginTop = '.6rem';
  foot.innerHTML = `<button class="btn">Corregir</button><button class="btn ghost">Reiniciar</button><span class="sc"></span>`;
  box.append(body, foot); container.append(box);
  let r = R[type](body, data, ...(opts.args || []));
  const show = () => { const { score, max } = r.score(); $('.sc', foot).innerHTML = `<b>${score}/${max}</b>`; };
  const [c, x] = $$('button', foot);
  c.onclick = () => { r.check(); c.disabled = true; show(); };
  x.onclick = () => { TTS.stop(); r = R[type](body, data, ...(opts.args || [])); c.disabled = false; $('.sc', foot).textContent = ''; };
  scoreHooks.push(() => c.disabled && show());
}

/* ---------- Pestañas ---------- */
function tabs(root) {
  const btns = $$('.tabs button', root), panels = $$('.tabpanel', root);
  btns.forEach((b, i) => b.onclick = () => { btns.forEach(x => x.classList.remove('on')); panels.forEach(x => x.classList.remove('on')); b.classList.add('on'); panels[i].classList.add('on'); TTS.stop(); if (root.id) store.set('tab.' + root.id, i); });
  const s = root.id ? store.get('tab.' + root.id, 0) : 0;
  (btns[s] || btns[0])?.click();
}

/* ---------- Flashcards ---------- */
function flashcards(el, cards) {
  let i = 0, order = cards.map((c, j) => j);
  el.innerHTML = `<div class="card flash"><div class="front"></div><div class="back"></div></div>
   <div class="row"><button class="btn ghost sm prev">◀</button><span class="small muted pos"></span><button class="btn ghost sm next">▶</button><button class="btn ghost sm shuf">🔀 Mezclar</button><button class="btn ghost sm say">🔊</button></div>`;
  const show = (flip = false) => { const c = cards[order[i]]; $('.front', el).innerHTML = c[0]; $('.back', el).innerHTML = flip ? c[1] : '<span class="small">(toca para ver)</span>'; $('.pos', el).textContent = `${i + 1}/${cards.length}`; };
  let flipped = false;
  $('.flash', el).onclick = () => { flipped = !flipped; show(flipped); };
  $('.next', el).onclick = () => { i = (i + 1) % cards.length; flipped = false; show(); };
  $('.prev', el).onclick = () => { i = (i - 1 + cards.length) % cards.length; flipped = false; show(); };
  $('.shuf', el).onclick = () => { order.sort(() => Math.random() - .5); i = 0; flipped = false; show(); };
  $('.say', el).onclick = () => TTS.play([['W', cards[order[i]][0].replace(/<[^>]+>/g, '')]]);
  show();
}

/* Botón 🔊 para leer en voz alta cualquier elemento con data-say */
function speakables(root = document) {
  $$('[data-say]', root).forEach(e => { const txt = e.dataset.say || e.textContent; const b = document.createElement('button'); b.className = 'accept'; b.textContent = '🔊'; b.title = 'Escuchar'; b.onclick = () => TTS.play([['W', txt]]); e.append(b); });
}

document.addEventListener('DOMContentLoaded', () => { renderNav(); speakables(); $$('.tabs-root').forEach(tabs); });
