/* =====================================================================
   NEW CONCEPT — Simulateur de logiciel de pilotage
   Store local (localStorage) + vues + actions (ajouts / mouvements)
   ===================================================================== */
const KEY = 'nbc_sim_v2';
const $ = s => document.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const sum = (arr, f) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
const pad = (n, l) => String(n).padStart(l, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dkey = d => (d || '').split('/').reverse().join('');
const today = () => { const d = new Date(); return pad(d.getDate(),2)+'/'+pad(d.getMonth()+1,2)+'/'+d.getFullYear(); };
const isoToday = (plus=0) => { const d = new Date(); d.setDate(d.getDate()+plus); return d.getFullYear()+'-'+pad(d.getMonth()+1,2)+'-'+pad(d.getDate(),2); };
const frDate = iso => iso ? iso.split('-').reverse().join('/') : today();
const nowT = () => { const d = new Date(); return pad(d.getHours(),2)+':'+pad(d.getMinutes(),2); };

/* ---------------- STORE ---------------- */
let S;
const LS = {
  ok: (() => { try { const k = '__nbc'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch(e) { return false; } })(),
  get(k){ try { return window.localStorage.getItem(k); } catch(e) { return null; } },
  set(k, v){ try { window.localStorage.setItem(k, v); return true; } catch(e) { return false; } },
  del(k){ try { window.localStorage.removeItem(k); } catch(e) {} }
};
function genStockMv(s){
  const mv = [];
  s.articles.forEach(a => {
    const base = Math.max(1, Math.round(a.min/3));
    s.achats.filter(b => b.statut !== 'En attente').forEach(b => b.lignes.forEach(l => {
      if (l.ref === a.ref) mv.push({date:b.date, ref:a.ref, type:'Entrée — réception achat', doc:b.id+' · '+s.fourn.find(f=>f.id===b.f).nom, q:l.q});
    }));
    s.chantiers.forEach(c => c.mats.forEach(m => { if (m.ref === a.ref) mv.push({date:c.debut, ref:a.ref, type:'Sortie chantier', doc:c.id+' · '+c.court, q:-m.reel}); }));
    mv.push({date:'21/10/2026', ref:a.ref, type:'Vente comptoir', doc:'FA-2026-0234', q:-Math.max(1, Math.round(base/2))});
    mv.push({date:'14/10/2026', ref:a.ref, type:'Transfert dépôt', doc:'Ben Arous → Showroom', q:0});
    mv.push({date:'30/09/2026', ref:a.ref, type:'Ajustement inventaire', doc:'Inventaire mensuel', q:-1});
  });
  mv.sort((x, y) => dkey(y.date).localeCompare(dkey(x.date)));
  return mv;
}
function fresh(){ const s = clone(NBC_SEED); s.stockMv = genStockMv(s); s.savedAt = null; return s; }
function load(){
  try { const r = LS.get(KEY); if (r) { const s = JSON.parse(r); if (s && s.version === NBC_SEED.version) return s; } } catch(e) {}
  return fresh();
}
function save(){
  S.savedAt = new Date().toISOString();
  LS.set(KEY, JSON.stringify(S));
}
S = load();

/* lookups */
const art = r => S.articles.find(a => a.ref === r);
const cli = id => S.clients.find(c => c.id === id);
const fou = id => S.fourn.find(f => f.id === id);
const chan = id => S.chantiers.find(c => c.id === id);
const bc = id => S.achats.find(b => b.id === id);
const doc = n => S.docs.find(d => d.num === n);
const emp = n => S.employes.find(e => e.nom === n);
const cname = id => id === 'COMPTOIR' ? 'Vente comptoir' : (cli(id)?.nom || id);
function nextNum(p){
  S.seq[p] = (S.seq[p] || 0) + 1; const n = S.seq[p], y = new Date().getFullYear();
  if (p === 'C') return 'C' + pad(n, 3);
  if (p === 'E') return 'E' + pad(n, 2);
  if (p === 'CH') return `CH-${y}-${pad(n,3)}`;
  if (p === 'DV') return `DV-${y}-${pad(n,3)}`;
  return `${p}-${y}-${pad(n,4)}`;
}

/* ---------------- CALCULS ---------------- */
function recalc(){
  S.chantiers.forEach(c => {
    c.matR = sum(c.mats, m => m.reel*m.pu); c.matP = sum(c.mats, m => m.prev*m.pu);
    c.moR = sum(c.mo, m => m.h*m.taux); c.moP = sum(c.mo, m => m.hPrev*m.taux);
    const tr = c.autres.filter(a => a.type === 'Transport'), au = c.autres.filter(a => a.type !== 'Transport');
    c.trR = sum(tr, a => a.reel); c.trP = sum(tr, a => a.prev); c.auR = sum(au, a => a.reel); c.auP = sum(au, a => a.prev);
    c.cout = c.matR + c.moR + c.trR + c.auR; c.coutP = c.matP + c.moP + c.trP + c.auP;
    c.benef = c.vente - c.cout; c.marge = (c.cout && c.vente) ? c.benef/c.vente*100 : null;
  });
  S.achats.forEach(b => {
    const v = sum(b.lignes, l => l.q*l.pu);
    if (b.import) { b.valEur = v; b.valDT = v*S.rate; b.totFrais = sum(Object.values(b.frais||{}), x => x); b.total = b.valDT + b.totFrais; b.coef = b.valDT ? b.total/b.valDT : 1; }
    else b.total = v;
  });
  [S.caisse, S.banque].forEach(a => { let s = a.solde; a.mvts.forEach(m => { m.after = s; s -= m.amt; }); });
  S.docs.forEach(d => { if (d.lignes) d.ht = sum(d.lignes, l => l.q*l.pu); });
}
const stStatus = a => a.stock <= 0 ? 'Rupture' : (a.stock < a.min ? 'Stock bas' : 'OK');
const stockValue = () => sum(S.articles, a => Math.max(0,a.stock)*a.pa);
const alerts = () => S.articles.filter(a => stStatus(a) !== 'OK');
const simFact = () => S.docs.filter(d => d.sim && d.type === 'Facture');
const caMois = () => S.caMoisBase + sum(simFact(), d => d.ht);
const caJour = () => S.caJourBase + sum(simFact().filter(d => d.date === today()), d => d.ht);
const achMois = () => sum(S.achats, b => b.total);
const creances = () => sum(S.docs.filter(d => d.type === 'Facture'), d => d.ttc - (d.paye||0));
const dettes = () => sum(S.achats.filter(b => b.statut === 'Reçu'), b => b.total);
const creance = id => sum(S.docs.filter(d => d.type === 'Facture' && d.client === id), d => d.ttc - (d.paye||0));
const caClient = id => sum(S.docs.filter(d => d.type === 'Facture' && d.client === id), d => d.ttc);

/* mutations de base */
function addMvt(k, {lib, cat, amt, date}){ S[k].mvts.unshift({date: date || today(), lib, cat, amt: +(+amt).toFixed(3)}); S[k].solde = +(S[k].solde + amt).toFixed(3); }
function stockMove(ref, q, type, d){ const a = art(ref); a.stock = +(a.stock + q).toFixed(3); S.stockMv.unshift({date: today(), ref, type, doc: d, q}); }
function log(icon, msg, sub=''){ S.log.unshift({date: today(), t: nowT(), user: 'Nabil B.', icon, msg, sub}); }

/* ---------------- HELPERS UI ---------------- */
const fmt = (n, d=3) => Number(n||0).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
const dt = (n, d=3) => fmt(n, d) + ' DT';
const ic = n => `<i data-lucide="${n}"></i>`;
const BCOL = {'En cours':'blue','Terminé':'green','En attente':'amber','Reçu':'blue','Payé':'green','Payée':'green','Partielle':'amber','Échue':'red','Non payée':'red','Livré':'green','Confirmée':'blue','Accepté':'green','Envoyé':'gray','Rupture':'red','Stock bas':'amber','OK':'green','Présent':'green','Annulé':'gray'};
const badge = s => `<span class="badge b-${BCOL[s]||'gray'}">${s}</span>`;
const mCol = m => m === null ? 'var(--muted)' : (m < 0 ? 'var(--red)' : (m < 15 ? 'var(--amber)' : 'var(--green)'));
const mTxt = c => c.marge === null ? `<span class="muted">Prév. ${c.margePrev||0} %</span>` : `<b style="color:${mCol(c.marge)}">${fmt(c.marge,1)} %</b>`;
const initials = n => n.split(/\s+/).filter(Boolean).map(x => x[0]).slice(0,2).join('').toUpperCase();
const ph = (t, s, acts='') => `<div class="ph"><div><h1>${t}</h1>${s ? `<p>${s}</p>` : ''}</div><div class="actions noprint">${acts}</div></div>`;
const backL = (v, l, p) => `<div class="back noprint" onclick="go('${v}'${p?`,'${p}'`:''})">${ic('arrow-left')}${l}</div>`;
let NEWID = null;
const isNew = id => id === NEWID ? ' new' : '';
const stop = 'event.stopPropagation();';
const UI = {stockCat:'Tous', chStat:'Tous', docType:'Tous', caisseTab:'caisse'};
function chips(key, opts){ return `<div class="chips">${opts.map(o => `<span class="chip ${UI[key]===o?'on':''}" onclick="UI['${key}']='${o}';refresh()">${o}</span>`).join('')}</div>`; }
function searchBox(ph){ return `<div class="field">${ic('search')}<input placeholder="${ph}" oninput="filterRows(this)"></div>`; }
function filterRows(inp){ const q = inp.value.toLowerCase().trim(); inp.closest('.card').querySelectorAll('tbody tr').forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }

/* nombres en lettres (montant facture) */
function lettres(n){
  const u = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const t = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  const b100 = n => { if (n < 20) return u[n]; const d = Math.floor(n/10), r = n%10;
    if (d === 7 || d === 9) return t[d] + (d === 7 && r === 1 ? '-et-' : '-') + u[10+r];
    let s = t[d]; if (r === 1 && d !== 8) s += '-et-un'; else if (r > 0) s += '-' + u[r]; else if (d === 8) s += 's'; return s; };
  const b1000 = n => { const c = Math.floor(n/100), r = n%100; let s = '';
    if (c > 0) { s = c === 1 ? 'cent' : u[c] + ' cent'; if (r === 0 && c > 1) s += 's'; }
    if (r > 0) s += (s ? ' ' : '') + b100(r); return s; };
  n = Math.floor(n); if (n === 0) return 'zéro';
  const mi = Math.floor(n/1e6), k = Math.floor((n%1e6)/1000), r = n%1000; let s = '';
  if (mi) s += b1000(mi) + ' million' + (mi > 1 ? 's' : '') + ' ';
  if (k) s += (k === 1 ? 'mille' : b1000(k).replace(/cents$/, 'cent') + ' mille') + ' ';
  if (r) s += b1000(r);
  return s.trim();
}
function montantLettres(x){ const d = Math.floor(x+1e-6), m = Math.round((x-d)*1000); const s = lettres(d); return s.charAt(0).toUpperCase()+s.slice(1) + ' dinar' + (d>1?'s':'') + (m ? ', ' + lettres(m) + ' millime' + (m>1?'s':'') : ', zéro millime'); }

/* toast */
function toast(msg, bad=false){
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' err' : '');
  t.innerHTML = ic(bad ? 'alert-circle' : 'check-circle-2') + '<span>' + msg + '</span>';
  $('#toasts').appendChild(t); lucide.createIcons();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3200);
}

/* ---------------- MODAL ---------------- */
let mHandler = null, PENDING = null, LMODE = 'achat';
function openModal({title, icon='plus', body, submit='Enregistrer', wide=false, onSubmit, onOpen}){
  closeQ();
  $('#mTitle').innerHTML = `<span class="aico">${ic(icon)}</span>${title}`;
  $('#mBody').innerHTML = body + '<div class="merr note err" id="mErr"></div>';
  $('#mSubmit').innerHTML = ic('check') + submit;
  $('#mTot').innerHTML = '';
  $('#modalBox').classList.toggle('wide', wide);
  $('#modal').classList.add('on'); mHandler = onSubmit;
  lucide.createIcons();
  onOpen && onOpen();
  const f = $('#mBody').querySelector('input:not([type=radio]):not([type=checkbox]),select'); f && f.focus();
}
function closeModal(){ $('#modal').classList.remove('on'); mHandler = null; }
function mErr(m){ const e = $('#mErr'); e.innerHTML = ic('alert-circle') + '<span>' + m + '</span>'; e.classList.add('on'); lucide.createIcons(); }
$('#mform').addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  for (const el of f.querySelectorAll('[required]')) {
    if (el.offsetParent !== null && !String(el.value).trim()) { el.focus(); return mErr('Champ obligatoire : ' + (el.closest('.f')?.querySelector('label')?.textContent.replace(' *','') || '')); }
  }
  const fd = Object.fromEntries(new FormData(f));
  f.querySelectorAll('input[type=checkbox]').forEach(c => fd[c.name] = c.checked);
  recalc();
  const r = mHandler && mHandler(fd, f);
  if (typeof r === 'string') return mErr(r);
  closeModal(); recalc(); save();
  if (PENDING) { const p = PENDING; PENDING = null; go(p.v, p.p); } else refresh();
  setTimeout(() => { NEWID = null; }, 2500);
});
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeQ(); } });

/* form helpers */
const F = (label, input, o={}) => `<div class="f ${o.full?'full':''}" ${o.id?`id="${o.id}"`:''} ${o.hide?'style="display:none"':''}><label>${label}${o.req?' *':''}</label>${input}${o.hint?`<span class="hint">${o.hint}</span>`:''}</div>`;
const inp = (name, o={}) => `<input name="${name}" type="${o.type||'text'}" ${o.req?'required':''} ${o.step?`step="${o.step}"`:''} ${o.min!=null?`min="${o.min}"`:''} value="${esc(o.v??'')}" placeholder="${esc(o.ph||'')}" ${o.id?`id="${o.id}"`:''}>`;
const num = (name, o={}) => inp(name, {type:'number', step:o.step||'any', min:o.min??0, ...o});
const sel = (name, opts, v, extra='') => `<select name="${name}" ${extra}>${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val)===String(v)?'selected':''}>${esc(lab)}</option>`; }).join('')}</select>`;
const seg = (name, opts, v) => `<div class="seg">${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<label><input type="radio" name="${name}" value="${esc(val)}" ${val===v?'checked':''}>${lab}</label>`; }).join('')}</div>`;
const chk = (name, label, on=true) => `<label class="check"><input type="checkbox" name="${name}" ${on?'checked':''}>${label}</label>`;
const acctOpts = () => [['banque', `Compte Bancaire · ${dt(S.banque.solde,0)}`], ['caisse', `Caisse Showroom · ${dt(S.caisse.solde,0)}`]];

/* éditeur de lignes (bons, factures, devis) */
function linesEditor(mode){
  return `<div class="lines"><table><thead><tr><th style="width:50%">Article</th><th style="width:13%">Qté</th><th style="width:17%" id="puHead">PU</th><th class="r">Total</th><th></th></tr></thead><tbody id="lbody"></tbody></table><div class="addl" onclick="addLine(LMODE)">${ic('plus')}Ajouter une ligne</div></div>`;
}
function artOpts(mode, fId){
  let list = S.articles; if (fId && mode !== 'vente') { const own = list.filter(a => a.f === fId); list = own.concat(list.filter(a => a.f !== fId)); }
  let o = list.map(a => `<option value="${a.ref}">${esc(a.des)} — ${a.ref} · stock ${fmt(a.stock,0)} ${a.u}</option>`).join('');
  if (mode === 'vente') o += `<option value="__LIB">✎ Prestation libre (main-d'œuvre, transport, pose…)</option>`;
  return o;
}
function addLine(mode, ref){
  const fId = $('#bcF')?.value;
  const tr = document.createElement('tr'); tr.className = 'lrow';
  tr.innerHTML = `<td><select name="l_ref">${artOpts(mode, fId)}</select><input name="l_lib" placeholder="Désignation de la prestation" style="display:none;margin-top:6px"></td><td><input name="l_q" type="number" min="0" step="any" value="1"></td><td><input name="l_pu" type="number" min="0" step="0.001"></td><td class="lt">0</td><td><button type="button" class="rm" title="Supprimer">${ic('trash-2')}</button></td>`;
  $('#lbody').appendChild(tr);
  const s = tr.querySelector('select'); if (ref) s.value = ref;
  const setPu = () => { const a = art(s.value); tr.querySelector('[name=l_lib]').style.display = s.value === '__LIB' ? 'block' : 'none';
    tr.querySelector('[name=l_pu]').value = a ? (mode === 'vente' ? a.pv : (mode === 'import' ? (a.pa/S.rate/1.26).toFixed(2) : a.pa)) : ''; lineTotals(); };
  s.addEventListener('change', setPu); tr.addEventListener('input', lineTotals);
  tr.querySelector('.rm').addEventListener('click', () => { tr.remove(); lineTotals(); });
  setPu(); lucide.createIcons();
}
function lineTotals(){
  let t = 0; document.querySelectorAll('#lbody .lrow').forEach(r => { const q = +r.querySelector('[name=l_q]').value || 0, pu = +r.querySelector('[name=l_pu]').value || 0; r.querySelector('.lt').textContent = fmt(q*pu, LMODE==='import'?2:3); t += q*pu; });
  const h = $('#puHead'); if (h) h.textContent = LMODE === 'import' ? 'PU (€)' : (LMODE === 'vente' ? 'PU vente HT' : 'PU achat HT');
  $('#mTot').innerHTML = LMODE === 'vente' ? `Total HT <b>${dt(t)}</b> <span style="margin-left:8px">TTC ${dt(t ? t*1.19+1 : 0)}</span>` : (LMODE === 'import' ? `Total <b>${fmt(t,2)} €</b> <span style="margin-left:8px">≈ ${dt(t*S.rate)} hors frais</span>` : `Total HT <b>${dt(t)}</b>`);
}
function readLines(){ return [...document.querySelectorAll('#lbody .lrow')].map(r => ({ref: r.querySelector('[name=l_ref]').value, lib: r.querySelector('[name=l_lib]').value.trim(), q: +r.querySelector('[name=l_q]').value || 0, pu: +r.querySelector('[name=l_pu]').value || 0})).filter(l => l.q > 0); }

/* =====================================================================
   ACTIONS (simulateur)
   ===================================================================== */
const A = {};

/* ---- Achats ---- */
A.newBC = (fId) => openModal({
  title: 'Nouveau bon de commande', icon: 'shopping-cart', wide: true, submit: 'Créer le bon de commande',
  body: F('Fournisseur', sel('f', S.fourn.map(f => [f.id, `${f.nom} — ${f.ville}${f.type==='Import'?' · import (€)':''}`]), fId || 'F01', 'id="bcF"'), {req:1})
      + F('Date', inp('date', {type:'date', v:isoToday()}))
      + F('Objet / note', inp('note', {ph:'ex : Réapprovisionnement carrelage pour chantiers Q4'}), {full:1})
      + `<div class="f full" id="impBox" style="display:none"><label>Frais d'importation (DT) — pour le calcul du coût de revient réel</label><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${num('fr_tr',{ph:'Transport'})}${num('fr_as',{ph:'Assurance'})}${num('fr_do',{ph:'Douane'})}${num('fr_ti',{ph:'Transitaire'})}</div><span class="hint">Taux appliqué : 1 € = ${fmt(S.rate,3)} DT</span></div>`
      + linesEditor('achat'),
  onOpen(){ const fs = $('#bcF'); const upd = () => { const imp = fou(fs.value).type === 'Import'; LMODE = imp ? 'import' : 'achat'; $('#impBox').style.display = imp ? 'flex' : 'none'; $('#lbody').innerHTML = ''; addLine(LMODE, S.articles.find(a => a.f === fs.value)?.ref); }; fs.addEventListener('change', upd); upd(); },
  onSubmit(fd){
    const L = readLines(); if (!L.length) return 'Ajoutez au moins une ligne avec une quantité.';
    if (L.some(l => !l.pu)) return 'Chaque ligne doit avoir un prix unitaire.';
    const imp = fou(fd.f).type === 'Import', id = nextNum('BC');
    const b = {id, f: fd.f, date: frDate(fd.date), statut: 'En attente', lignes: L.map(l => ({ref: l.ref, q: l.q, pu: l.pu})), note: fd.note || 'Commande fournisseur'};
    if (imp) { b.import = true; b.frais = {transport: +fd.fr_tr||0, assurance: +fd.fr_as||0, douane: +fd.fr_do||0, transit: +fd.fr_ti||0}; }
    S.achats.unshift(b); log('file-text', `a créé le bon de commande ${id}`, fou(fd.f).nom);
    toast(`Bon de commande <b>${id}</b> créé`); NEWID = id; PENDING = {v:'bc', p:id};
  }
});

A.receiveBC = (id) => { const b = bc(id); recalc(); openModal({
  title: `Réception — ${id}`, icon: 'package-check', submit: 'Valider la réception',
  body: `<div class="preview">Les quantités reçues seront <b>ajoutées au stock</b> et le dernier prix d'achat mis à jour${b.import ? ` avec le <b>coût de revient réel</b> (marchandise + frais, coef. × ${fmt(b.coef,3)})` : ''}.</div>`
      + b.lignes.map((l, i) => { const a = art(l.ref); return F(`${esc(a.des)} <span class="muted">— commandé ${fmt(l.q,0)} ${a.u} · stock actuel ${fmt(a.stock,0)}</span>`, num('q'+i, {v:l.q}), {full:1}); }).join('')
      + F('Dépôt de réception', sel('dep', ['Dépôt Ben Arous','Showroom'], 'Dépôt Ben Arous')) + F('Date', inp('date', {type:'date', v:isoToday()})),
  onSubmit(fd){
    let tot = 0;
    b.lignes.forEach((l, i) => { const q = +fd['q'+i] || 0, a = art(l.ref); if (q > 0) { stockMove(l.ref, q, 'Entrée — réception achat', `${id} · ${fou(b.f).nom}`); tot += q; } a.pa = b.import ? +(l.pu*S.rate*b.coef).toFixed(3) : l.pu; l.recu = q; });
    if (!tot) return 'Aucune quantité reçue.';
    b.statut = 'Reçu'; b.dateRecep = frDate(fd.date);
    log('package-check', `a réceptionné ${id}`, `${fou(b.f).nom} · ${b.lignes.length} article(s) entrés en stock`);
    toast(`Réception validée — <b>stock mis à jour</b>`);
  }
}); };

A.payBC = (id) => { const b = bc(id); recalc(); openModal({
  title: `Paiement fournisseur — ${id}`, icon: 'landmark', submit: 'Enregistrer le paiement',
  body: `<div class="preview">Montant à régler à <b>${esc(fou(b.f).nom)}</b> : <b style="font-size:15px">${dt(b.total)}</b></div>`
      + F('Payer depuis', seg('compte', acctOpts(), 'banque'), {full:1})
      + F('Mode de paiement', sel('mode', ['Virement','Chèque','Espèces','Traite'], 'Virement')) + F('Référence', inp('refp', {ph:'n° chèque / virement'})),
  onSubmit(fd){
    const k = fd.compte; if (S[k].solde < b.total) return `Solde insuffisant sur ${S[k].nom} (${dt(S[k].solde)}).`;
    addMvt(k, {lib: `Paiement ${fou(b.f).nom} — ${id}${fd.refp ? ` (${fd.mode} ${fd.refp})` : ` (${fd.mode})`}`, cat: 'Paiement fournisseur', amt: -b.total});
    b.statut = 'Payé'; b.datePaie = today();
    log('landmark', `a payé ${id}`, `${dt(b.total)} · ${S[k].nom}`);
    toast(`Paiement de <b>${dt(b.total)}</b> enregistré — ${S[k].nom}`);
  }
}); };

/* ---- Chantiers ---- */
A.newChantier = () => openModal({
  title: 'Nouveau chantier / projet', icon: 'hard-hat', submit: 'Créer le chantier',
  body: F('Nom du chantier', inp('nom', {req:1, ph:'ex : Rénovation Villa Mansour — Gammarth'}), {full:1, req:1})
      + F('Client', sel('client', S.clients.map(c => [c.id, c.nom]), S.clients[0].id), {req:1})
      + F('Responsable', sel('resp', S.employes.map(e => e.nom), 'Karim Mejri'))
      + F('Adresse du chantier', inp('adr', {ph:'Adresse'}), {full:1})
      + F('Date de début', inp('debut', {type:'date', v:isoToday()})) + F('Date de fin prévue', inp('fin', {type:'date', v:isoToday(30)}))
      + F('Montant vendu HT (DT)', num('vente', {req:1, ph:'ex : 25000'}), {req:1}) + F('Marge prévue (%)', num('margePrev', {v:30}))
      + F('Statut', seg('statut', ['En attente','En cours'], 'En cours'), {full:1})
      + F('Description des travaux', `<textarea name="desc" placeholder="Nature des travaux…"></textarea>`, {full:1})
      + `<div class="preview">${ic('info')} Une fois créé, ajoutez les <b>matériaux consommés</b> (déduits automatiquement du stock), la <b>main-d'œuvre</b> et les <b>dépenses</b> : la rentabilité se calcule en temps réel.</div>`,
  onSubmit(fd){
    if (!(+fd.vente > 0)) return 'Le montant vendu doit être supérieur à 0.';
    const id = nextNum('CH'), c = cli(fd.client);
    S.chantiers.unshift({id, nom: fd.nom, court: fd.nom.length > 26 ? fd.nom.slice(0, 24) + '…' : fd.nom, client: fd.client, adr: fd.adr || c.adr, debut: frDate(fd.debut), fin: frDate(fd.fin), resp: fd.resp, statut: fd.statut, devis: '—', vente: +fd.vente, avancement: 0, margePrev: +fd.margePrev || 0, desc: fd.desc || 'Travaux', mats: [], mo: [], autres: []});
    log('hard-hat', `a créé le chantier ${id}`, `${fd.nom} · ${c.nom}`);
    toast(`Chantier <b>${id}</b> créé`); NEWID = id; PENDING = {v:'chantier', p:id};
  }
});

A.conso = (chId) => { const c = chan(chId); LMODE = 'x'; openModal({
  title: `Consommation de matériaux — ${c.court}`, icon: 'package-minus', submit: 'Enregistrer la consommation',
  body: F('Article', sel('ref', S.articles.map(a => [a.ref, `${a.des} — stock ${fmt(a.stock,0)} ${a.u}`]), S.articles[0].ref, 'id="cRef"'), {full:1, req:1})
      + F('Quantité prévue', num('prev', {id:'cPrev', v:1})) + F('Quantité réellement utilisée', num('reel', {id:'cReel', v:1, req:1}), {req:1})
      + `<div class="preview" id="cPrevw"></div>`,
  onOpen(){ const upd = () => { const a = art($('#cRef').value), q = +$('#cReel').value || 0, after = a.stock - q;
      $('#cPrevw').innerHTML = `Coût imputé au chantier : <b>${fmt(q,0)} × ${fmt(a.pa)} = ${dt(q*a.pa)}</b><br>Stock ${esc(a.ref)} : ${fmt(a.stock,0)} → <b style="color:${after<0?'var(--red)':(after<a.min?'var(--amber)':'inherit')}">${fmt(after,0)} ${a.u}</b>${after<0?' — stock insuffisant':(after<a.min?' — passera sous le seuil minimum':'')}`; };
    ['cRef','cReel'].forEach(i => $('#'+i).addEventListener('input', upd)); $('#cRef').addEventListener('change', upd); upd(); },
  onSubmit(fd){
    const a = art(fd.ref), q = +fd.reel || 0, p = +fd.prev || 0;
    if (q <= 0) return 'La quantité utilisée doit être supérieure à 0.';
    if (q > a.stock) return `Stock insuffisant : ${fmt(a.stock,0)} ${a.u} disponibles. Créez un bon de commande fournisseur.`;
    const ex = c.mats.find(m => m.ref === a.ref && m.pu === a.pa);
    if (ex) { ex.prev += p; ex.reel += q; } else c.mats.push({ref: a.ref, prev: p, reel: q, pu: a.pa});
    stockMove(a.ref, -q, 'Sortie chantier', `${c.id} · ${c.court}`);
    if (c.statut === 'En attente') c.statut = 'En cours';
    log('package-minus', `a affecté ${fmt(q,0)} ${a.u} de ${a.des} au chantier ${c.id}`, `Coût ${dt(q*a.pa)} · stock déduit`);
    toast(`${fmt(q,0)} ${a.u} déduits du stock — coût ${dt(q*a.pa)} imputé au chantier`);
  }
}); };

A.mo = (chId) => { const c = chan(chId); openModal({
  title: `Main-d'œuvre — ${c.court}`, icon: 'users', submit: 'Ajouter les heures',
  body: F('Employé', sel('nom', S.employes.map(e => [e.nom, `${e.nom} — ${e.poste}`]), c.resp, 'id="moE"'), {full:1})
      + F('Heures prévues', num('hPrev', {v:8})) + F('Heures réalisées', num('h', {v:8, req:1, id:'moH'}), {req:1})
      + F('Tarif horaire (DT)', num('taux', {id:'moT', step:'0.001'})) + `<div class="f"><label>Coût imputé</label><div id="moC" style="padding:9px 0;font-weight:700"></div></div>`,
  onOpen(){ const e = $('#moE'), t = $('#moT'), h = $('#moH'); const setT = () => { t.value = emp(e.value).taux; upd(); }; const upd = () => { $('#moC').textContent = dt((+h.value||0)*(+t.value||0)); };
    e.addEventListener('change', setT); h.addEventListener('input', upd); t.addEventListener('input', upd); setT(); },
  onSubmit(fd){
    const h = +fd.h || 0, taux = +fd.taux || 0; if (h <= 0) return 'Indiquez les heures réalisées.'; if (taux <= 0) return 'Indiquez le tarif horaire.';
    const e = emp(fd.nom), ex = c.mo.find(m => m.nom === fd.nom && m.taux === taux);
    if (ex) { ex.h += h; ex.hPrev += +fd.hPrev || 0; } else c.mo.push({nom: fd.nom, poste: e.poste, hPrev: +fd.hPrev || 0, h, taux});
    e.h += h; e.ch = c.id; if (c.statut === 'En attente') c.statut = 'En cours';
    log('clock', `a pointé ${fmt(h,0)} h pour ${fd.nom}`, `${c.id} · ${dt(h*taux)}`);
    toast(`${fmt(h,0)} h de ${fd.nom} imputées au chantier (${dt(h*taux)})`);
  }
}); };

A.dep = (chId) => { const c = chan(chId); openModal({
  title: `Dépense chantier — ${c.court}`, icon: 'receipt', submit: 'Enregistrer la dépense',
  body: F('Type', sel('type', ['Transport','Carburant','Sous-traitance','Location','Achats supp.','Autres'], 'Transport'))
      + F('Libellé', inp('lib', {req:1, ph:'ex : Livraison camion 10 t'}), {req:1})
      + F('Montant prévu (DT)', num('prev', {v:0})) + F('Montant réel (DT)', num('reel', {req:1}), {req:1})
      + F('Règlement', seg('compte', [['caisse','Payé — Caisse'], ['banque','Payé — Banque'], ['none','À payer plus tard']], 'caisse'), {full:1, hint:'Si payé, un décaissement est créé automatiquement dans Caisse & Banque.'}),
  onSubmit(fd){
    const r = +fd.reel || 0; if (r <= 0) return 'Le montant réel doit être supérieur à 0.';
    if (fd.compte !== 'none' && S[fd.compte].solde < r) return `Solde insuffisant sur ${S[fd.compte].nom}.`;
    c.autres.push({type: fd.type, lib: fd.lib, prev: +fd.prev || 0, reel: r});
    if (fd.compte !== 'none') addMvt(fd.compte, {lib: `${fd.lib} — ${c.id}`, cat: 'Dépense chantier', amt: -r});
    if (c.statut === 'En attente') c.statut = 'En cours';
    log('receipt', `a enregistré une dépense ${fd.type.toLowerCase()} sur ${c.id}`, `${fd.lib} · ${dt(r)}`);
    toast(`Dépense de ${dt(r)} imputée au chantier${fd.compte !== 'none' ? ' et décaissée' : ''}`);
  }
}); };

A.editCh = (chId) => { const c = chan(chId); openModal({
  title: `Statut & avancement — ${c.court}`, icon: 'sliders-horizontal', submit: 'Mettre à jour',
  body: F('Statut', seg('statut', ['En attente','En cours','Terminé'], c.statut), {full:1})
      + F('Avancement (%)', num('av', {v:c.avancement, min:0})) + F('Montant vendu HT (DT)', num('vente', {v:c.vente}))
      + F('Date de fin prévue', inp('fin', {type:'date', v:c.fin.split('/').reverse().join('-')})),
  onSubmit(fd){
    c.statut = fd.statut; c.avancement = Math.min(100, Math.max(0, +fd.av || 0)); if (c.statut === 'Terminé') c.avancement = 100;
    if (+fd.vente > 0) c.vente = +fd.vente; c.fin = frDate(fd.fin);
    log('sliders-horizontal', `a mis à jour le chantier ${c.id}`, `${c.statut} · ${c.avancement} %`); toast('Chantier mis à jour');
  }
}); };

/* ---- Ventes ---- */
A.newDoc = (type='Facture', o={}) => { LMODE = 'vente'; openModal({
  title: type === 'Facture' ? 'Nouvelle facture' : 'Nouveau devis', icon: type === 'Facture' ? 'receipt' : 'file-plus', wide: true, submit: type === 'Facture' ? 'Créer la facture' : 'Créer le devis',
  body: F('Client', sel('client', [['COMPTOIR','Vente comptoir (client de passage)'], ...S.clients.map(c => [c.id, c.nom])], o.client || 'C001', 'id="dCli"'), {req:1})
      + F('Chantier lié', sel('chantier', [['', '— Aucun —'], ...S.chantiers.map(c => [c.id, `${c.id} · ${c.court}`])], o.chantier || '', 'id="dCh"'))
      + F('Date', inp('date', {type:'date', v:isoToday()})) + F(type === 'Facture' ? 'Échéance' : 'Validité', inp('ech', {type:'date', v:isoToday(30)}))
      + linesEditor('vente')
      + (type === 'Facture' ? `<div class="f full">${chk('livrer', 'Livrer maintenant et <b>déduire les articles du stock</b> (bon de livraison automatique)')}</div>` : ''),
  onOpen(){ $('#lbody').innerHTML = ''; addLine('vente'); },
  onSubmit(fd){
    const L = readLines(); if (!L.length) return 'Ajoutez au moins une ligne.';
    if (L.some(l => l.ref === '__LIB' && !l.lib)) return 'Indiquez la désignation des prestations libres.';
    if (L.some(l => !l.pu)) return 'Chaque ligne doit avoir un prix.';
    if (fd.livrer) { for (const l of L) { const a = art(l.ref); if (a) { const need = sum(L.filter(x => x.ref === l.ref), x => x.q); if (need > a.stock) return `Stock insuffisant pour ${a.des} : ${fmt(a.stock,0)} ${a.u} disponibles.`; } } }
    const lignes = L.map(l => { const a = art(l.ref); return {ref: a ? a.ref : 'PREST', des: a ? a.des : l.lib, u: a ? a.u : 'forfait', q: l.q, pu: l.pu}; });
    const ht = sum(lignes, l => l.q*l.pu), ttc = +(ht*1.19 + 1).toFixed(3);
    const n = nextNum(type === 'Facture' ? 'FA' : 'DV');
    const d = {num: n, type, client: fd.client, date: frDate(fd.date), echeance: frDate(fd.ech), ttc, paye: 0, statut: type === 'Facture' ? 'Non payée' : 'Envoyé', lignes, chantier: fd.chantier || '', sim: true, reglements: []};
    if (type === 'Facture' && fd.livrer) { d.bl = 'BL-' + n.slice(3); lignes.forEach(l => { if (art(l.ref)) stockMove(l.ref, -l.q, 'Vente / livraison', `${n} · ${cname(fd.client)}`); }); }
    S.docs.unshift(d);
    log(type === 'Facture' ? 'receipt' : 'file-plus', `a créé ${type === 'Facture' ? 'la facture' : 'le devis'} ${n}`, `${cname(fd.client)} · ${dt(ttc)} TTC`);
    toast(`${type} <b>${n}</b> créé${type === 'Facture' ? 'e' : ''} — ${dt(ttc)} TTC`); NEWID = n; PENDING = {v:'facture', p:n};
  }
}); };

A.toFacture = (dn) => { const dv = doc(dn); openModal({
  title: `Transformer ${dn} en facture`, icon: 'file-check', submit: 'Créer la facture',
  body: `<div class="preview">Le devis <b>${dn}</b> (${esc(cname(dv.client))}, ${dt(dv.ttc)} TTC) sera marqué <b>Accepté</b> et une facture sera générée avec les mêmes lignes.</div><div class="f full">${chk('livrer', 'Livrer maintenant et déduire les articles du stock')}</div>`,
  onSubmit(fd){
    if (fd.livrer) for (const l of dv.lignes) { const a = art(l.ref); if (a && l.q > a.stock) return `Stock insuffisant pour ${a.des}.`; }
    const n = nextNum('FA'); const d = {...clone(dv), num: n, type: 'Facture', date: today(), echeance: frDate(isoToday(30)), paye: 0, statut: 'Non payée', devis: dn, sim: true, reglements: []};
    if (fd.livrer) { d.bl = 'BL-' + n.slice(3); d.lignes.forEach(l => { if (art(l.ref)) stockMove(l.ref, -l.q, 'Vente / livraison', `${n} · ${cname(d.client)}`); }); }
    dv.statut = 'Accepté'; S.docs.unshift(d);
    log('file-check', `a transformé le devis ${dn} en facture ${n}`, `${cname(d.client)} · ${dt(d.ttc)}`);
    toast(`Facture <b>${n}</b> générée depuis ${dn}`); NEWID = n; PENDING = {v:'facture', p:n};
  }
}); };

A.encaisser = (dn) => { const d = doc(dn), reste = +(d.ttc - (d.paye||0)).toFixed(3); openModal({
  title: `Encaissement — ${dn}`, icon: 'banknote', submit: 'Enregistrer l\'encaissement',
  body: `<div class="preview">Client : <b>${esc(cname(d.client))}</b> · Total TTC ${dt(d.ttc)} · Déjà réglé ${dt(d.paye||0)} · <b>Reste ${dt(reste)}</b></div>`
      + F('Montant encaissé (DT)', num('amt', {v:reste, req:1, step:'0.001'}), {req:1}) + F('Mode', sel('mode', ['Espèces','Chèque','Virement','Carte / TPE','Traite'], 'Chèque'))
      + F('Encaisser sur', seg('compte', acctOpts(), 'banque'), {full:1}) + F('Référence', inp('refp', {ph:'n° chèque, virement…'}), {full:1}),
  onSubmit(fd){
    const amt = +fd.amt || 0; if (amt <= 0) return 'Montant invalide.'; if (amt > reste + 0.001) return `Le montant dépasse le reste à payer (${dt(reste)}).`;
    d.paye = +((d.paye||0) + amt).toFixed(3); (d.reglements = d.reglements || []).push({date: today(), mode: fd.mode + (fd.refp ? ' n° ' + fd.refp : ''), compte: fd.compte, amt});
    d.statut = d.paye >= d.ttc - 0.001 ? 'Payée' : 'Partielle';
    addMvt(fd.compte, {lib: `Encaissement ${cname(d.client)} — ${dn}`, cat: 'Encaissement client', amt});
    log('banknote', `a encaissé ${dt(amt)} sur ${dn}`, `${cname(d.client)} · ${S[fd.compte].nom}`);
    toast(`<b>${dt(amt)}</b> encaissés — ${S[fd.compte].nom}`);
  }
}); };

/* ---- Caisse & banque ---- */
A.newMvt = (kind='enc', compte) => openModal({
  title: 'Mouvement de caisse / banque', icon: 'wallet', submit: 'Enregistrer le mouvement',
  body: F('Nature', seg('nat', [['enc','Encaissement'], ['dec','Décaissement'], ['vir','Virement interne']], kind), {full:1})
      + F('Compte', seg('compte', acctOpts(), compte || UI.caisseTab || 'caisse'), {full:1, id:'mvC'})
      + F('Date', inp('date', {type:'date', v:isoToday()})) + F('Montant (DT)', num('amt', {req:1, step:'0.001'}), {req:1})
      + F('Catégorie', sel('cat', [], '', 'id="mvCat"'), {id:'mvCatF'}) + F('Libellé', inp('lib', {ph:'ex : Achat fournitures, apport, vente comptoir…'}), {id:'mvLib'})
      + `<div class="preview" id="mvPrev"></div>`,
  onOpen(){
    const CATS = {enc: ['Vente comptoir','Encaissement client','Apport en compte','Remboursement','Autre recette'], dec: ['Dépense','Fournitures','Carburant','Salaire','Charges fixes','Charges sociales','Impôts & taxes','Autre dépense']};
    const upd = () => { const n = document.querySelector('[name=nat]:checked').value, k = document.querySelector('[name=compte]:checked').value;
      $('#mvCatF').style.display = n === 'vir' ? 'none' : ''; $('#mvLib').style.display = n === 'vir' ? 'none' : '';
      if (n !== 'vir') { const cur = $('#mvCat').value; $('#mvCat').innerHTML = CATS[n].map(c => `<option ${c===cur?'selected':''}>${c}</option>`).join(''); }
      const o = k === 'caisse' ? 'banque' : 'caisse', a = +document.querySelector('[name=amt]').value || 0;
      $('#mvPrev').innerHTML = n === 'vir' ? `Virement de <b>${S[k].nom}</b> vers <b>${S[o].nom}</b> : ${dt(a)}<br>Soldes après : ${S[k].nom} ${dt(S[k].solde - a)} · ${S[o].nom} ${dt(S[o].solde + a)}`
        : `Solde ${S[k].nom} : ${dt(S[k].solde)} → <b>${dt(S[k].solde + (n === 'enc' ? a : -a))}</b>`; };
    document.querySelectorAll('[name=nat],[name=compte]').forEach(r => r.addEventListener('change', upd)); document.querySelector('[name=amt]').addEventListener('input', upd); upd();
  },
  onSubmit(fd){
    const a = +fd.amt || 0; if (a <= 0) return 'Le montant doit être supérieur à 0.';
    const k = fd.compte, o = k === 'caisse' ? 'banque' : 'caisse', date = frDate(fd.date);
    if (fd.nat !== 'enc' && S[k].solde < a) return `Solde insuffisant sur ${S[k].nom} (${dt(S[k].solde)}).`;
    if (fd.nat === 'vir') {
      addMvt(k, {lib: `Virement interne → ${S[o].nom}`, cat: 'Virement interne', amt: -a, date}); addMvt(o, {lib: `Virement interne ← ${S[k].nom}`, cat: 'Virement interne', amt: a, date});
      log('arrow-left-right', `a viré ${dt(a)} de ${S[k].nom} vers ${S[o].nom}`); toast(`Virement de ${dt(a)} effectué`);
    } else {
      if (!fd.lib.trim()) return 'Indiquez un libellé.';
      addMvt(k, {lib: fd.lib, cat: fd.cat, amt: fd.nat === 'enc' ? a : -a, date});
      log(fd.nat === 'enc' ? 'plus-circle' : 'minus-circle', `a enregistré un ${fd.nat === 'enc' ? 'encaissement' : 'décaissement'} de ${dt(a)}`, `${fd.lib} · ${S[k].nom}`);
      toast(`${fd.nat === 'enc' ? 'Encaissement' : 'Décaissement'} de <b>${dt(a)}</b> enregistré`);
    }
    UI.caisseTab = k; NEWID = 'mv0'; PENDING = {v:'caisse'};
  }
});

/* ---- Stock ---- */
A.newArticle = () => openModal({
  title: 'Nouvel article', icon: 'package-plus', submit: 'Créer l\'article',
  body: F('Référence', inp('ref', {req:1, ph:'ex : CAR-3060-GR'}), {req:1}) + F('Catégorie', sel('cat', [...new Set(S.articles.map(a => a.cat)), 'Quincaillerie', 'Menuiserie', 'Autre'], 'Carrelage'))
      + F('Désignation', inp('des', {req:1, ph:'ex : Carrelage 30×60 Gris anthracite'}), {full:1, req:1})
      + F('Marque / fabricant', inp('marque')) + F('Unité', sel('u', ['m²','u','seau','sac','ml','kg','L','rouleau'], 'u'))
      + F('Prix d\'achat HT (DT)', num('pa', {req:1, step:'0.001'}), {req:1}) + F('Prix de vente HT (DT)', num('pv', {req:1, step:'0.001'}), {req:1})
      + F('Stock initial', num('stock', {v:0})) + F('Stock minimum (alerte)', num('min', {v:10}))
      + F('Fournisseur principal', sel('f', S.fourn.map(f => [f.id, f.nom]), 'F01')) + F('Dépôt', sel('dep', ['Dépôt Ben Arous','Showroom'], 'Dépôt Ben Arous'))
      + F('Dimensions / conditionnement', inp('dim', {ph:'ex : 30×60 cm'}), {full:1}),
  onSubmit(fd){
    const ref = fd.ref.trim().toUpperCase(); if (art(ref)) return `La référence ${ref} existe déjà.`;
    if (+fd.pv < +fd.pa) return 'Le prix de vente est inférieur au prix d\'achat.';
    S.articles.push({ref, des: fd.des, cat: fd.cat, marque: fd.marque || '—', u: fd.u, pa: +fd.pa, pv: +fd.pv, stock: 0, min: +fd.min || 0, res: 0, f: fd.f, dep: fd.dep, dim: fd.dim || '—'});
    if (+fd.stock > 0) stockMove(ref, +fd.stock, 'Stock initial', 'Création article');
    log('package-plus', `a créé l'article ${ref}`, fd.des); toast(`Article <b>${ref}</b> créé`); NEWID = ref; PENDING = {v:'article', p:ref};
  }
});

A.stockMvt = (ref) => openModal({
  title: 'Mouvement de stock', icon: 'arrow-left-right', submit: 'Enregistrer le mouvement',
  body: F('Article', sel('ref', S.articles.map(a => [a.ref, `${a.des} — stock ${fmt(a.stock,0)} ${a.u}`]), ref || S.articles[0].ref, 'id="smRef"'), {full:1})
      + F('Type de mouvement', seg('type', [['in','Entrée'], ['out','Sortie'], ['inv','Inventaire (quantité comptée)'], ['loss','Perte / casse'], ['ret','Retour client'], ['tr','Transfert dépôt']], 'in'), {full:1})
      + F('Quantité', num('q', {req:1, id:'smQ'}), {req:1, id:'smQF'}) + F('Motif / document', inp('motif', {ph:'ex : Inventaire du jour, casse livraison…'}))
      + `<div class="preview" id="smPrev"></div>`,
  onOpen(){ const upd = () => { const a = art($('#smRef').value), t = document.querySelector('[name=type]:checked').value, q = +$('#smQ').value || 0;
      const d = {in: q, ret: q, out: -q, loss: -q, inv: q - a.stock, tr: 0}[t];
      $('#smQF').querySelector('label').textContent = t === 'inv' ? 'Quantité comptée *' : (t === 'tr' ? 'Quantité transférée *' : 'Quantité *');
      $('#smPrev').innerHTML = `Stock ${esc(a.ref)} : ${fmt(a.stock,0)} → <b>${fmt(a.stock + d,0)} ${a.u}</b> (${d >= 0 ? '+' : ''}${fmt(d,0)})${t === 'tr' ? ' — transfert entre dépôts, quantité totale inchangée' : ''}`; };
    $('#smRef').addEventListener('change', upd); $('#smQ').addEventListener('input', upd); document.querySelectorAll('[name=type]').forEach(r => r.addEventListener('change', upd)); upd(); },
  onSubmit(fd){
    const a = art(fd.ref), q = +fd.q; if (!(q >= 0) || (q === 0 && fd.type !== 'inv')) return 'Quantité invalide.';
    const d = {in: q, ret: q, out: -q, loss: -q, inv: q - a.stock, tr: 0}[fd.type];
    if (a.stock + d < 0) return `Stock insuffisant (${fmt(a.stock,0)} ${a.u}).`;
    const lab = {in: 'Entrée manuelle', ret: 'Retour client', out: 'Sortie manuelle', loss: 'Perte / casse', inv: 'Ajustement inventaire', tr: 'Transfert dépôt'}[fd.type];
    stockMove(a.ref, d, lab, fd.motif || (fd.type === 'tr' ? 'Ben Arous ↔ Showroom' : '—'));
    log('arrow-left-right', `${lab.toLowerCase()} : ${a.ref}`, `${d >= 0 ? '+' : ''}${fmt(d,0)} ${a.u} · ${fd.motif || ''}`);
    toast(`${lab} enregistré — nouveau stock ${fmt(a.stock,0)} ${a.u}`);
  }
});

/* ---- Clients & employés ---- */
A.newClient = () => openModal({
  title: 'Nouveau client', icon: 'user-plus', submit: 'Créer le client',
  body: F('Nom / raison sociale', inp('nom', {req:1}), {req:1, full:1}) + F('Type', sel('type', ['Particulier','Promoteur','Hôtellerie','Entreprise','Architecte / décorateur'], 'Particulier'))
      + F('Contact', inp('contact', {ph:'Nom du contact'})) + F('Ville', inp('ville', {req:1}), {req:1}) + F('Téléphone', inp('tel', {ph:'+216 …'}))
      + F('Adresse', inp('adr'), {full:1}) + F('E-mail', inp('mail')) + F('Matricule fiscal', inp('mf', {ph:'facultatif'})),
  onSubmit(fd){
    const id = nextNum('C'); S.clients.push({id, nom: fd.nom, contact: fd.contact || fd.nom, type: fd.type, ville: fd.ville, adr: fd.adr || fd.ville, tel: fd.tel || '—', mail: fd.mail || '—', mf: fd.mf || '—', depuis: String(new Date().getFullYear())});
    log('user-plus', `a créé le client ${fd.nom}`, fd.ville); toast(`Client <b>${esc(fd.nom)}</b> créé`); NEWID = id; PENDING = {v:'client', p:id};
  }
});
A.newEmp = () => openModal({
  title: 'Nouvel employé', icon: 'user-plus', submit: 'Créer la fiche',
  body: F('Nom complet', inp('nom', {req:1}), {req:1}) + F('Poste', inp('poste', {req:1, ph:'ex : Carreleur'}), {req:1}) + F('Coût horaire (DT)', num('taux', {req:1, step:'0.001'}), {req:1}),
  onSubmit(fd){ if (emp(fd.nom)) return 'Cet employé existe déjà.'; const cols = ['#8B5E3C','#2458B8','#7C4DCC','#B8862F','#1E8A5A','#C2362F'];
    S.employes.push({id: nextNum('E'), nom: fd.nom, poste: fd.poste, taux: +fd.taux, h: 0, hs: 0, pres: 100, ch: '—', col: cols[S.employes.length % cols.length]});
    log('user-plus', `a créé la fiche employé ${fd.nom}`, fd.poste); toast(`Employé <b>${esc(fd.nom)}</b> ajouté`); NEWID = fd.nom; }
});

/* ---- Données ---- */
A.exportDB = () => { const s = clone(S); const blob = new Blob([JSON.stringify(s, null, 2)], {type: 'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `new-concept-db-${isoToday()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Base de données exportée (JSON)'); };
A.importDB = (input) => { const f = input.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const s = JSON.parse(r.result); if (!s.articles || !s.chantiers || !s.caisse) throw 0; s.version = NBC_SEED.version; s.stockMv = s.stockMv || genStockMv(s); S = s; recalc(); save(); toast('Base de données importée'); go('dashboard'); } catch(e) { toast('Fichier JSON invalide', true); } }; r.readAsText(f); input.value = ''; };
A.reset = () => openModal({
  title: 'Réinitialiser la simulation', icon: 'rotate-ccw', submit: 'Réinitialiser',
  body: `<div class="note warn f full">${ic('alert-triangle')}<span>Toutes les opérations saisies (bons, chantiers, factures, mouvements…) seront effacées et les données de démonstration d'origine restaurées. Pensez à <b>exporter</b> avant si vous souhaitez les conserver.</span></div>`,
  onSubmit(){ S = fresh(); LS.del(KEY); toast('Simulation réinitialisée'); PENDING = {v:'dashboard'}; }
});

/* =====================================================================
   VUES
   ===================================================================== */
const V = {};
const wf = (steps, cur) => `<div class="stepper">${steps.map((s, i) => `<div class="step ${i<cur?'done':(i===cur?'cur':'')}"><div class="circ">${i<cur?ic('check'):ic(s[1])}</div><b>${s[0]}</b>${s[2]?`<span class="ref">${s[2]}</span>`:''}${s[3]?`<small>${s[3]}</small>`:''}</div>`).join('')}</div>`;
const kpi = (lbl, val, unit, sub, icon, tone='') => `<div class="card kpi"><div class="lbl">${lbl}${icon?`<span class="ic" ${tone}>${ic(icon)}</span>`:''}</div><div class="val">${val}${unit?`<small>${unit}</small>`:''}</div>${sub||''}</div>`;
const T_BLUE = 'style="background:var(--blueSoft);color:var(--blue)"', T_AMB = 'style="background:var(--amberSoft);color:var(--amber)"', T_RED = 'style="background:var(--redSoft);color:var(--red)"', T_GRN = 'style="background:var(--greenSoft);color:var(--green)"';

V.dashboard = () => {
  const al = alerts();
  return ph('Tableau de bord', `${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).replace(/^./, c => c.toUpperCase())} · Vue d'ensemble de l'activité`,
    `<button class="btn" onclick="A.newMvt('enc')">${ic('wallet')}Mouvement caisse</button><button class="btn" onclick="A.newBC()">${ic('shopping-cart')}Bon de commande</button><button class="btn pri" onclick="A.newChantier()">${ic('plus')}Nouveau chantier</button>`) +
  `<div class="grid g4 mb">
    ${kpi('CA du jour', fmt(caJour()), 'DT', `<span class="trend up">${ic('trending-up')}+12,4 %</span><span class="sub">vs jeudi dernier</span>`, 'receipt')}
    ${kpi('CA du mois', fmt(caMois(),0), 'DT', `<span class="trend up">${ic('trending-up')}+8,1 %</span><span class="sub">à date vs mois préc.</span>`, 'trending-up')}
    ${kpi('Achats du mois', fmt(achMois(),0), 'DT', `<span class="sub" style="margin:0">${S.achats.length} bons de commande</span>`, 'shopping-cart', T_BLUE)}
    ${kpi('Valeur du stock', fmt(stockValue(),0), 'DT', `<span class="trend ${al.length?'dn':'up'}">${ic(al.length?'alert-triangle':'check')}${al.length} alerte${al.length>1?'s':''}</span><span class="sub">au prix d'achat</span>`, 'package', T_AMB)}
  </div>
  <div class="grid g21 mb">
    <div class="card"><div class="hd"><h3>${ic('bar-chart-3')}Chiffre d'affaires & achats — 12 derniers mois</h3><div class="chips"><span class="chip on">12 mois</span></div></div><div class="bd"><div class="chartbox"><canvas id="chCA"></canvas></div></div></div>
    <div class="card treso"><div class="hd"><h3>${ic('wallet')}Caisse & Banque</h3><span class="lnk" onclick="go('caisse')">Détail ${ic('chevron-right')}</span></div>
      <div class="bd">
        <div class="acct"><div class="aico" style="background:var(--accSoft);color:var(--acc)">${ic('banknote')}</div><div style="flex:1"><small class="muted">Caisse Showroom</small><div class="big">${dt(S.caisse.solde)}</div></div></div>
        <div class="acct"><div class="aico" style="background:var(--blueSoft);color:var(--blue)">${ic('landmark')}</div><div style="flex:1"><small class="muted">Compte Bancaire</small><div class="big">${dt(S.banque.solde)}</div></div></div>
        <div class="total"><div><small>Trésorerie totale</small><b>${dt(S.caisse.solde + S.banque.solde)}</b></div>${ic('wallet')}</div>
        <div style="margin-top:12px"><div class="kv"><span>Créances clients</span><b class="pos">${dt(creances())}</b></div><div class="kv"><span>Dettes fournisseurs</span><b class="neg">${dt(dettes())}</b></div></div>
      </div></div>
  </div>
  <div class="grid g21 mb">
    <div class="card"><div class="hd"><h3>${ic('hard-hat')}Rentabilité par chantier</h3><span class="lnk" onclick="go('chantiers')">Tous les chantiers ${ic('chevron-right')}</span></div>
      <div class="bd np"><table class="tight"><thead><tr><th>Chantier</th><th>Statut</th><th class="r">CA</th><th class="r">Coût total</th><th class="r">Bénéfice</th><th>Marge</th></tr></thead><tbody>
      ${S.chantiers.slice(0,7).map(c => `<tr class="click${isNew(c.id)}" onclick="go('chantier','${c.id}')"><td style="max-width:190px;overflow:hidden;text-overflow:ellipsis"><b>${esc(c.court)}</b><div class="ref muted">${c.id}</div></td><td>${badge(c.statut)}</td><td class="r">${fmt(c.vente,0)}</td><td class="r">${c.cout?fmt(c.cout,0):'—'}</td><td class="r ${c.benef<0?'neg':'pos'}">${c.cout?fmt(c.benef,0):'—'}</td>
      <td style="min-width:120px"><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1;min-width:36px"><i style="width:${c.marge===null?0:Math.max(3,Math.min(100,Math.abs(c.marge)*2))}%;background:${mCol(c.marge)}"></i></div>${mTxt(c)}</div></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="hd"><h3>${ic('alert-triangle')}Alertes stock</h3><span class="lnk" onclick="go('stock')">Stock ${ic('chevron-right')}</span></div>
      <div class="bd np">
      ${al.length ? al.map(a => { const pend = S.achats.find(b => b.statut === 'En attente' && b.lignes.some(l => l.ref === a.ref)); return `<div class="mini" style="cursor:pointer" onclick="go('article','${a.ref}')"><div class="ico" style="background:${a.stock<=0?'var(--redSoft)':'var(--amberSoft)'};color:${a.stock<=0?'var(--red)':'var(--amber)'}">${ic(a.stock<=0?'x-circle':'alert-triangle')}</div><div><b>${esc(a.des)}</b><small>${a.ref} · min. ${a.min} ${a.u}${pend?` · <span style="color:var(--blue)">${pend.id} en attente</span>`:''}</small></div><div class="end"><b style="color:${a.stock<=0?'var(--red)':'var(--amber)'}">${fmt(a.stock,0)} ${a.u}</b><br>${pend?'':`<button class="btn sm" onclick="${stop}A.newBC('${a.f}')">${ic('shopping-cart')}Commander</button>`}</div></div>`; }).join('') : `<div class="empty">${ic('check-circle-2')}Aucune alerte — stock au-dessus des seuils</div>`}
      </div>
      <div class="hd" style="padding-top:8px"><h3>${ic('activity')}Activité récente</h3><span class="lnk" onclick="go('parametres')">Journal ${ic('chevron-right')}</span></div>
      <div class="bd np feed">${S.log.slice(0,4).map(l => `<div class="mini"><div class="ico">${ic(l.icon)}</div><div><b>${esc(l.user)} ${esc(l.msg)}</b><small>${esc(l.sub)} · ${l.date===today()?'':l.date+' '}${l.t}</small></div></div>`).join('')}</div>
    </div>
  </div>`;
};

V.stock = () => {
  const al = alerts(), cats = ['Tous', ...new Set(S.articles.map(a => a.cat))];
  const list = S.articles.filter(a => UI.stockCat === 'Tous' || a.cat === UI.stockCat);
  return ph('Stock & Articles', `${S.articles.length} articles · 2 dépôts (Showroom, Dépôt Ben Arous)`,
    `<button class="btn" onclick="A.stockMvt()">${ic('arrow-left-right')}Mouvement de stock</button><button class="btn" onclick="A.stockMvt(null)">${ic('clipboard-check')}Inventaire</button><button class="btn pri" onclick="A.newArticle()">${ic('plus')}Nouvel article</button>`) +
  `<div class="grid g4 mb">
    ${kpi('Valeur du stock', fmt(stockValue(),0), 'DT', `<span class="sub" style="margin:0">Valorisé au prix d'achat</span>`, 'package')}
    ${kpi('Articles actifs', S.articles.length, '', `<span class="sub" style="margin:0">${cats.length-1} catégories</span>`, 'boxes', T_BLUE)}
    ${kpi('Ruptures / stock bas', `<span style="color:${al.length?'var(--red)':'var(--green)'}">${al.length}</span>`, '', `<span class="sub" style="margin:0">${S.achats.filter(b=>b.statut==='En attente').length} commande(s) fournisseur en attente</span>`, 'alert-triangle', T_RED)}
    ${kpi('Mouvements enregistrés', S.stockMv.length, '', `<span class="sub" style="margin:0">Historique complet</span>`, 'history', T_AMB)}
  </div>
  <div class="card">
    <div class="toolbar">${searchBox('Rechercher une référence, une désignation…')}${chips('stockCat', cats)}</div>
    <table><thead><tr><th>Référence</th><th>Désignation</th><th>Catégorie</th><th class="r">Prix achat</th><th class="r">Prix vente</th><th class="r">Stock actuel</th><th class="r">Stock min</th><th>Statut</th><th></th></tr></thead><tbody>
    ${list.map(a => { const s = stStatus(a); return `<tr class="click${isNew(a.ref)}" onclick="go('article','${a.ref}')"><td class="ref">${a.ref}</td><td><b>${esc(a.des)}</b><div class="muted" style="font-size:12px">${esc(a.marque)} · ${esc(a.dep)}</div></td><td>${esc(a.cat)}</td><td class="r">${fmt(a.pa)}</td><td class="r">${fmt(a.pv)}</td><td class="r"><b style="color:${s==='OK'?'inherit':(s==='Rupture'?'var(--red)':'var(--amber)')}">${fmt(a.stock,0)}</b> <span class="muted">${a.u}</span></td><td class="r muted">${a.min}</td><td>${badge(s)}</td><td class="r"><button class="btn sm" onclick="${stop}A.stockMvt('${a.ref}')" title="Mouvement">${ic('arrow-left-right')}</button></td></tr>`; }).join('')}
    </tbody></table>
  </div>`;
};

V.article = (ref) => {
  const a = art(ref); if (!a) return V.stock(); const s = stStatus(a);
  const mv = S.stockMv.filter(m => m.ref === ref); let st = a.stock; const rows = mv.map(m => { const r = {...m, after: st}; st -= m.q; return r; });
  const pend = S.achats.find(b => b.statut === 'En attente' && b.lignes.some(l => l.ref === ref));
  return backL('stock', 'Retour au stock') + ph(esc(a.des), `<span class="ref">${a.ref}</span> · ${esc(a.cat)} · ${esc(a.marque)}`,
    `<button class="btn" onclick="A.newBC('${a.f}')">${ic('shopping-cart')}Commander</button><button class="btn pri" onclick="A.stockMvt('${a.ref}')">${ic('arrow-left-right')}Mouvement de stock</button>`) +
  `<div class="grid g4 mb">
    ${kpi('Stock actuel', `<span style="color:${s==='OK'?'inherit':'var(--red)'}">${fmt(a.stock,0)}</span>`, a.u, badge(s))}
    ${kpi('Réservé / Disponible', `${fmt(a.res,0)} <small>/ ${fmt(Math.max(0,a.stock-a.res),0)} ${a.u}</small>`, '', `<span class="sub" style="margin:0">Réservations chantiers</span>`)}
    ${kpi('Prix achat → vente', `<span style="font-size:22px">${fmt(a.pa)} → ${fmt(a.pv)}</span>`, 'DT', `<span class="trend up">Marge ${fmt((a.pv-a.pa)/a.pv*100,1)} %</span>`)}
    ${kpi('Valeur en stock', fmt(Math.max(0,a.stock)*a.pa,0), 'DT', `<span class="sub" style="margin:0">TVA 19 %</span>`)}
  </div>
  <div class="grid g12">
    <div class="card"><div class="hd"><h3>${ic('info')}Fiche article</h3></div><div class="bd">
      ${[['Unité',a.u],['Dimensions',a.dim],['Catégorie',a.cat],['Marque / fabricant',a.marque],['Fournisseur principal',fou(a.f)?.nom||'—'],['Dépôt',a.dep],['Stock minimum',a.min+' '+a.u],["Dernier prix d'achat",dt(a.pa)],['TVA','19 %']].map(k => `<div class="kv"><span>${k[0]}</span><b>${esc(k[1])}</b></div>`).join('')}
      ${s !== 'OK' ? `<div class="note warn" style="margin-top:12px">${ic('alert-triangle')}<span>Sous le seuil minimum. ${pend ? `Commande <b style="cursor:pointer" onclick="go('bc','${pend.id}')">${pend.id}</b> en attente de réception.` : `<a style="color:inherit;font-weight:700;cursor:pointer" onclick="A.newBC('${a.f}')">Créer un bon de commande →</a>`}</span></div>` : ''}
    </div></div>
    <div class="card"><div class="hd"><h3>${ic('history')}Historique des mouvements</h3><span class="muted" style="font-size:12px">${rows.length} mouvements</span></div>
      <div class="bd np"><table><thead><tr><th>Date</th><th>Type</th><th>Document / origine</th><th class="r">Quantité</th><th class="r">Stock après</th></tr></thead><tbody>
      ${rows.map((m, i) => `<tr class="${i===0&&m.date===today()?'new':''}"><td class="muted">${m.date}</td><td><b>${esc(m.type)}</b></td><td class="ref">${esc(m.doc)}</td><td class="r ${m.q>0?'pos':(m.q<0?'neg':'muted')}">${m.q>0?'+':''}${m.q===0?'±0':fmt(m.q,0)}</td><td class="r">${fmt(m.after,0)}</td></tr>`).join('')}
      </tbody></table></div></div>
  </div>`;
};

V.achats = () => {
  const att = S.achats.filter(b => b.statut === 'En attente');
  return ph('Achats', 'Commandes fournisseurs, réceptions, importations et paiements', `<button class="btn" onclick="A.newBC('F03')">${ic('globe')}Nouvelle importation</button><button class="btn pri" onclick="A.newBC()">${ic('plus')}Bon de commande</button>`) +
  `<div class="grid g4 mb">
    ${kpi('Achats du mois', fmt(achMois(),0), 'DT', `<span class="sub" style="margin:0">${S.achats.length} bons de commande</span>`)}
    ${kpi('En attente de réception', `<span style="color:var(--amber)">${att.length}</span>`, '', `<span class="sub" style="margin:0">${dt(sum(att, b => b.total),0)}</span>`)}
    ${kpi('Dettes fournisseurs', `<span style="color:var(--red)">${fmt(dettes(),0)}</span>`, 'DT', `<span class="sub" style="margin:0">Reçu, non payé</span>`)}
    ${kpi('Importations', S.achats.filter(b => b.import).length, '', `<span class="sub" style="margin:0">Taux : 1 € = ${fmt(S.rate,3)} DT</span>`)}
  </div>
  <div class="card mb"><div class="hd"><h3>${ic('workflow')}Circuit achat</h3></div>${wf([['Demande','clipboard-list','','Besoin chantier / stock'],['Bon de commande','file-text','','Validé par admin'],['Réception','package-check','','Entrée en stock auto'],['Facture fournisseur','receipt','','Rapprochement'],['Paiement','landmark','','Caisse ou banque']],5)}</div>
  <div class="grid g21">
    <div class="card"><div class="hd"><h3>${ic('file-text')}Bons de commande</h3></div><div class="bd np"><table class="tight"><thead><tr><th>N° BC</th><th>Fournisseur</th><th>Date</th><th class="r">Montant HT</th><th>Statut</th><th class="r">Action</th></tr></thead><tbody>
    ${S.achats.map(b => `<tr class="click${isNew(b.id)}" onclick="go('bc','${b.id}')"><td class="ref">${b.id}</td><td><b>${esc(fou(b.f).nom)}</b>${b.import?' <span class="badge b-brown" style="margin-left:4px">Import</span>':''}<div class="muted" style="font-size:12px;max-width:260px;overflow:hidden;text-overflow:ellipsis">${esc(b.note)}</div></td><td class="muted">${b.date}</td><td class="r strong">${fmt(b.total)}</td><td>${badge(b.statut)}</td>
    <td class="r">${b.statut==='En attente'?`<button class="btn sm" onclick="${stop}A.receiveBC('${b.id}')">${ic('package-check')}Réceptionner</button>`:(b.statut==='Reçu'?`<button class="btn sm" onclick="${stop}A.payBC('${b.id}')">${ic('landmark')}Payer</button>`:`<span class="muted" style="font-size:12px">Soldé</span>`)}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="card"><div class="hd"><h3>${ic('factory')}Fournisseurs</h3></div><div class="bd np">
    ${S.fourn.map(f => { const tot = sum(S.achats.filter(b => b.f === f.id), b => b.total), du = sum(S.achats.filter(b => b.f === f.id && b.statut === 'Reçu'), b => b.total); return `<div class="mini" style="cursor:pointer" onclick="A.newBC('${f.id}')"><div class="ico" style="background:${f.type==='Import'?'var(--blueSoft)':'var(--line2)'};color:${f.type==='Import'?'var(--blue)':'var(--ink2)'}">${ic(f.type==='Import'?'ship':'truck')}</div><div><b>${esc(f.nom)}</b><small>${esc(f.ville)} · ${esc(f.cat)}</small></div><div class="end"><b>${fmt(tot,0)} DT</b><br><small class="${du?'neg':'muted'}">${du?'Dû '+fmt(du,0)+' DT':'À jour'}</small></div></div>`; }).join('')}
    </div></div>
  </div>`;
};

V.bc = (id) => {
  const b = bc(id); if (!b) return V.achats(); const f = fou(b.f);
  const stepIdx = {'En attente':2, 'Reçu':3, 'Payé':5}[b.statut];
  const act = b.statut === 'En attente' ? `<button class="btn pri" onclick="A.receiveBC('${id}')">${ic('package-check')}Réceptionner</button>` : (b.statut === 'Reçu' ? `<button class="btn pri" onclick="A.payBC('${id}')">${ic('landmark')}Enregistrer le paiement</button>` : `<span class="badge b-green" style="padding:8px 12px">Soldé le ${b.datePaie||b.date}</span>`);
  let body;
  if (b.import) {
    body = `<div class="grid g21 mb">
      <div class="card"><div class="hd"><h3>${ic('list')}Lignes de commande (devise : EUR)</h3></div><div class="bd np"><table><thead><tr><th>Article</th><th class="r">Qté</th><th class="r">PU (€)</th><th class="r">Total (€)</th><th class="r">Total (DT)</th><th class="r">Coût de revient unitaire</th></tr></thead><tbody>
      ${b.lignes.map(l => { const a = art(l.ref); return `<tr><td><b>${esc(a.des)}</b><div class="ref muted">${a.ref}</div></td><td class="r">${fmt(l.q,0)} ${a.u}</td><td class="r">${fmt(l.pu,2)}</td><td class="r">${fmt(l.q*l.pu,2)}</td><td class="r">${fmt(l.q*l.pu*S.rate)}</td><td class="r"><b class="pos">${fmt(l.pu*S.rate*b.coef)} DT</b></td></tr>`; }).join('')}
      </tbody><tfoot><tr><td>Total marchandise</td><td></td><td></td><td class="r">${fmt(b.valEur,2)} €</td><td class="r">${fmt(b.valDT)} DT</td><td></td></tr></tfoot></table></div></div>
      <div class="card"><div class="hd"><h3>${ic('calculator')}Coût de revient réel</h3></div><div class="bd">
        <div class="kv"><span>Marchandise (${fmt(b.valEur,2)} € × ${fmt(S.rate,3)})</span><b>${dt(b.valDT)}</b></div>
        <div class="kv"><span>Transport</span><b>${dt(b.frais.transport)}</b></div><div class="kv"><span>Assurance</span><b>${dt(b.frais.assurance)}</b></div>
        <div class="kv"><span>Droits de douane</span><b>${dt(b.frais.douane)}</b></div><div class="kv"><span>Frais transitaire</span><b>${dt(b.frais.transit)}</b></div>
        <div class="treso"><div class="total"><div><small>Coût de revient total</small><b>${dt(b.total)}</b></div><div style="text-align:right"><small>Coefficient</small><b>× ${fmt(b.coef,3)}</b></div></div></div>
        <div class="note ${b.statut==='En attente'?'':'ok'}" style="margin-top:12px">${ic(b.statut==='En attente'?'info':'check-circle')}<span>${b.statut==='En attente'?'À la réception, le prix d\'achat des articles sera mis à jour avec ce coût de revient.':'Prix d\'achat des articles mis à jour avec le coût de revient réel.'}</span></div>
      </div></div></div>`;
  } else {
    body = `<div class="card mb"><div class="hd"><h3>${ic('list')}Lignes de commande</h3></div><div class="bd np"><table><thead><tr><th>Référence</th><th>Désignation</th><th class="r">Quantité</th><th class="r">PU HT</th><th class="r">Total HT</th><th class="r">Stock actuel</th></tr></thead><tbody>
    ${b.lignes.map(l => { const a = art(l.ref); return `<tr class="click" onclick="go('article','${a.ref}')"><td class="ref">${a.ref}</td><td><b>${esc(a.des)}</b></td><td class="r">${fmt(l.q,0)} ${a.u}${l.recu!=null&&l.recu!==l.q?` <span class="muted">(reçu ${fmt(l.recu,0)})</span>`:''}</td><td class="r">${fmt(l.pu)}</td><td class="r strong">${fmt(l.q*l.pu)}</td><td class="r">${fmt(a.stock,0)} ${badge(stStatus(a))}</td></tr>`; }).join('')}
    </tbody><tfoot><tr><td colspan="4">Total HT</td><td class="r">${dt(b.total)}</td><td></td></tr></tfoot></table></div></div>`;
  }
  return backL('achats', 'Retour aux achats') + ph(`Bon de commande ${b.id}`, `${esc(f.nom)} · ${esc(f.ville)} · émis le ${b.date}`, `<button class="btn" onclick="window.print()">${ic('printer')}Imprimer</button>${act}`) +
  `<div class="card mb"><div class="info"><div><span>Fournisseur</span><b>${esc(f.nom)}</b></div><div><span>Type</span><b>${b.import?'Importation (EUR)':'Achat local'}</b></div><div><span>Statut</span>${badge(b.statut)}</div><div><span>Montant</span><b>${dt(b.total)}</b></div></div></div>
  <div class="card mb">${wf([['Demande','clipboard-list'],['Bon de commande','file-text',b.id,b.date],['Réception','package-check','',b.dateRecep||''],['Facture fournisseur','receipt'],['Paiement','landmark','',b.datePaie||'']], stepIdx)}</div>` + body;
};

V.ventes = () => {
  const types = ['Tous','Devis','Commande','Bon de livraison','Facture'];
  const list = S.docs.filter(d => UI.docType === 'Tous' || d.type === UI.docType);
  const env = S.docs.filter(d => d.statut === 'Envoyé'), ech = sum(S.docs.filter(d => d.statut === 'Échue'), d => d.ttc - d.paye);
  return ph('Ventes', 'Devis, commandes, livraisons, factures et encaissements', `<button class="btn" onclick="A.newDoc('Devis')">${ic('file-plus')}Nouveau devis</button><button class="btn pri" onclick="A.newDoc('Facture')">${ic('receipt')}Nouvelle facture</button>`) +
  `<div class="grid g4 mb">
    ${kpi('CA facturé (mois)', fmt(caMois(),0), 'DT', `<span class="trend up">${ic('trending-up')}+8,1 %</span>`)}
    ${kpi('Devis en cours', env.length, '', `<span class="sub" style="margin:0">${dt(sum(env, d => d.ttc),0)} TTC</span>`)}
    ${kpi('Créances clients', `<span style="color:var(--amber)">${fmt(creances(),0)}</span>`, 'DT', `<span class="sub" style="margin:0">dont ${fmt(ech,0)} DT échus</span>`)}
    ${kpi('Factures émises', S.docs.filter(d => d.type === 'Facture').length, '', `<span class="sub" style="margin:0">${S.docs.filter(d => d.type==='Facture' && d.statut==='Payée').length} soldées</span>`)}
  </div>
  <div class="card mb"><div class="hd"><h3>${ic('workflow')}Suivi d'affaire — Villa Lotfi</h3><span class="lnk" onclick="go('facture','FA-2026-0231')">Voir la facture ${ic('chevron-right')}</span></div>
  ${(() => { const d = doc('FA-2026-0231'); const r = d.ttc - d.paye; return wf([['Devis','file-text','DV-2026-081','19/09 · accepté'],['Commande','clipboard-check','CMD-2026-071','26/09'],['Bon de livraison','truck','BL-2026-0309','08/10 · livré'],['Facture','receipt','FA-2026-0231','20/10 · '+fmt(d.ttc,0)+' DT'],['Encaissement','banknote',fmt(d.paye,0)+' / '+fmt(d.ttc,0)+' DT', r>0?'Reste '+fmt(r,0)+' DT':'Soldé']], r>0?4:5); })()}</div>
  <div class="grid g21">
    <div class="card"><div class="toolbar">${searchBox('Rechercher un document, un client…')}${chips('docType', types)}</div>
    <table class="tight"><thead><tr><th>N°</th><th>Type</th><th>Client</th><th>Date</th><th class="r">Montant TTC</th><th>Statut</th><th class="r">Action</th></tr></thead><tbody>
    ${list.map(d => { const click = d.lignes ? `go('facture','${d.num}')` : (d.client !== 'COMPTOIR' ? `go('client','${d.client}')` : ''); const reste = d.type==='Facture' ? d.ttc-(d.paye||0) : 0;
      return `<tr class="click${isNew(d.num)}" onclick="${click}"><td class="ref">${d.num}</td><td>${d.type}</td><td><b>${esc(cname(d.client))}</b></td><td class="muted">${d.date}</td><td class="r strong">${fmt(d.ttc)}</td><td>${badge(d.statut)}</td>
      <td class="r">${reste>0.001?`<button class="btn sm" onclick="${stop}A.encaisser('${d.num}')">${ic('banknote')}Encaisser</button>`:(d.type==='Devis'&&d.statut==='Envoyé'&&d.lignes?`<button class="btn sm" onclick="${stop}A.toFacture('${d.num}')">${ic('file-check')}→ Facture</button>`:'')}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="card"><div class="hd"><h3>${ic('users')}Clients</h3><span class="lnk" onclick="go('clients')">Tous ${ic('chevron-right')}</span></div><div class="bd np">
    ${S.clients.map(c => `<div class="mini" style="cursor:pointer" onclick="go('client','${c.id}')"><div class="empavatar" style="background:var(--side)">${initials(c.nom)}</div><div><b>${esc(c.nom)}</b><small>${esc(c.type)} · ${esc(c.ville)}</small></div><div class="end"><b>${fmt(caClient(c.id),0)} DT</b><br><small class="${creance(c.id)>0?'neg':'muted'}">${creance(c.id)>0?'Dû '+fmt(creance(c.id),0)+' DT':'À jour'}</small></div></div>`).join('')}
    </div></div>
  </div>`;
};

V.facture = (dn) => {
  const d = doc(dn || 'FA-2026-0231');
  if (!d || !d.lignes) return backL('ventes', 'Retour aux ventes') + `<div class="card"><div class="empty">${ic('file-x')}Document non disponible en aperçu.</div></div>`;
  const isDv = d.type === 'Devis';
  const c = d.client === 'COMPTOIR' ? {nom: 'Client de passage', contact: 'Vente comptoir', adr: 'Showroom NEW CONCEPT', tel: '—'} : cli(d.client);
  const ch = d.chantier ? chan(d.chantier) : null;
  const ht = d.ht, tva = ht*0.19, timbre = 1, ttc = ht + tva + timbre, paye = d.paye || 0, reste = ttc - paye;
  const stamp = isDv ? ['DEVIS — VALABLE 30 JOURS','var(--blue)'] : (d.statut === 'Payée' ? ['PAYÉE','var(--green)'] : (d.statut === 'Partielle' ? ['PARTIELLEMENT RÉGLÉE','var(--amber)'] : ['NON RÉGLÉE','var(--red)']));
  const acts = `${!isDv && reste > 0.001 ? `<button class="btn ok" onclick="A.encaisser('${d.num}')">${ic('banknote')}Encaisser</button>` : ''}${isDv && d.statut === 'Envoyé' ? `<button class="btn" onclick="A.toFacture('${d.num}')">${ic('file-check')}Transformer en facture</button>` : ''}<button class="btn pri" onclick="window.print()">${ic('printer')}Imprimer</button>`;
  return `<div class="noprint">${backL('ventes','Retour aux ventes')}${ph(`${d.type} ${d.num}`, `${esc(c.nom)}${ch?' · Chantier '+ch.id:''} · ${badge(d.statut)}`, acts)}</div>
  <div class="inv-wrap"><div id="invoice">
    <div class="stamp" style="color:${stamp[1]};border-color:${stamp[1]}">${stamp[0]}</div>
    <div class="ihead">
      <div><div class="ilogo"><img src="${window.NBC_LOGO||'assets/logo.jpg'}" alt="NEW CONCEPT"><div><b>NEW CONCEPT</b><small>Modern Decor</small>
        <div class="co"><b style="font-size:11.5px;letter-spacing:0;font-family:Inter;color:#1A1D21">SOCIETE NB CONCEPT — SARL</b><br>Zone Industrielle, Route de Mornag — 2013 Ben Arous<br>Tél. +216 71 000 000 · contact@nbconcept.tn<br>MF : 1234567/A/M/000 · RC : B01234562020</div></div></div></div>
      <div class="ititle"><h2>${isDv ? 'DEVIS' : 'FACTURE'}</h2><table>
        <tr><td>N°</td><td><b>${d.num}</b></td></tr><tr><td>Date</td><td>${d.date}</td></tr><tr><td>${isDv?'Validité':'Échéance'}</td><td>${d.echeance||'—'}</td></tr>
        ${ch?`<tr><td>Réf. chantier</td><td>${ch.id}</td></tr>`:''}${d.bl?`<tr><td>Bon de livraison</td><td>${d.bl}</td></tr>`:''}${d.devis&&!isDv?`<tr><td>Devis</td><td>${d.devis}</td></tr>`:''}</table></div>
    </div>
    <div class="parties">
      <div class="party"><span>${isDv?'Client':'Facturé à'}</span><div class="box"><b>${esc(c.nom)}</b><br>${esc(c.contact)}<br>${esc(c.adr)}<br>Tél. ${esc(c.tel)}${c.mf&&c.mf!=='—'?'<br>MF : '+esc(c.mf):''}</div></div>
      <div class="party"><span>${ch?'Chantier':'Livraison'}</span><div class="box">${ch?`<b>${esc(ch.nom)}</b><br>${esc(ch.desc)}<br>Responsable : ${esc(ch.resp)}<br>${esc(ch.adr)}`:`<b>${d.client==='COMPTOIR'?'Retrait showroom':'Livraison à l\'adresse du client'}</b><br>${esc(c.adr)}`}</div></div>
    </div>
    <table class="items"><thead><tr><th>Réf.</th><th>Désignation</th><th class="r">Qté</th><th>Unité</th><th class="r">PU HT</th><th class="r">TVA</th><th class="r">Total HT</th></tr></thead><tbody>
    ${d.lignes.map(l => `<tr><td class="ref" style="font-size:10.5px">${esc(l.ref)}</td><td>${esc(l.des)}</td><td class="r">${fmt(l.q, l.q%1?2:0)}</td><td>${esc(l.u)}</td><td class="r">${fmt(l.pu)}</td><td class="r">19 %</td><td class="r"><b>${fmt(l.q*l.pu)}</b></td></tr>`).join('')}
    </tbody></table>
    <div class="totals">
      <div class="words"><b>Arrêté${isDv?' le présent devis':'e la présente facture'} à la somme de :</b><div class="box">${montantLettres(ttc)} (TTC).</div>
        ${!isDv ? `<div style="margin-top:12px"><b>Règlements reçus :</b> ${(d.reglements||[]).length ? d.reglements.map(r => `${r.mode} du ${r.date} — ${dt(r.amt)}`).join('<br>') : 'aucun'}<br><b>Reste à payer :</b> <span style="color:${reste>0.001?'var(--red)':'var(--green)'};font-weight:700">${dt(Math.max(0,reste))}</span></div>` : '<div style="margin-top:12px">Devis valable 30 jours. Acompte de 30 % à la commande.</div>'}
        <div style="margin-top:10px">Mode de règlement : chèque, espèces ou virement bancaire<br>RIB : 00 000 0000000000000 00 (fictif)</div></div>
      <div class="tt"><div><span>Total HT</span><b>${fmt(ht)}</b></div><div><span>TVA 19 %</span><b>${fmt(tva)}</b></div><div><span>Timbre fiscal</span><b>${fmt(timbre)}</b></div><div class="grand"><span>Net à payer TTC</span><span>${dt(ttc)}</span></div></div>
    </div>
    <div class="sign"><div>Cachet & signature NEW CONCEPT</div><div>Bon pour accord — client</div></div>
    <div class="ifoot"><span>SOCIETE NB CONCEPT — NEW CONCEPT Modern Decor · Ben Arous · Document généré par le logiciel de gestion</span><span>Page 1 / 1</span></div>
  </div></div>`;
};

V.chantiers = () => {
  const list = S.chantiers.filter(c => UI.chStat === 'Tous' || c.statut === UI.chStat);
  const withC = S.chantiers.filter(c => c.cout), totV = sum(withC, c => c.vente), totB = sum(withC, c => c.benef);
  return ph('Chantiers', "Suivi des chantiers, consommations, main-d'œuvre et rentabilité réelle", `<button class="btn pri" onclick="A.newChantier()">${ic('plus')}Nouveau chantier</button>`) +
  `<div class="grid g4 mb">
    ${kpi('Chantiers en cours', S.chantiers.filter(c => c.statut === 'En cours').length, '', `<span class="sub" style="margin:0">${S.chantiers.filter(c=>c.statut==='En attente').length} en attente · ${S.chantiers.filter(c=>c.statut==='Terminé').length} terminé(s)</span>`, 'hard-hat')}
    ${kpi('Montant vendu total', fmt(sum(S.chantiers, c => c.vente),0), 'DT', `<span class="sub" style="margin:0">${S.chantiers.length} chantiers</span>`)}
    ${kpi('Bénéfice réel cumulé', `<span style="color:var(--green)">${fmt(totB,0)}</span>`, 'DT', `<span class="sub" style="margin:0">Marge moyenne ${totV?fmt(totB/totV*100,1):'—'} %</span>`)}
    ${kpi('Dépassements détectés', `<span style="color:var(--red)">${S.chantiers.filter(c => c.cout && c.cout > c.coutP).length}</span>`, '', `<span class="sub" style="margin:0">Coût réel &gt; prévisionnel</span>`)}
  </div>
  <div class="card"><div class="toolbar">${searchBox('Rechercher un chantier, un client…')}${chips('chStat', ['Tous','En cours','En attente','Terminé'])}</div>
  <table><thead><tr><th>N°</th><th>Chantier</th><th>Client</th><th>Statut</th><th>Début → Fin</th><th>Avancement</th><th class="r">Montant vendu</th><th class="r">Bénéfice</th><th>Marge</th></tr></thead><tbody>
  ${list.map(c => `<tr class="click${isNew(c.id)}" onclick="go('chantier','${c.id}')"><td class="ref">${c.id}</td><td><b>${esc(c.nom)}</b><div class="muted" style="font-size:12px">Resp. ${esc(c.resp)}</div></td><td>${esc(cli(c.client)?.nom)}</td><td>${badge(c.statut)}</td><td class="muted" style="white-space:nowrap">${c.debut} → ${c.fin}</td>
  <td style="min-width:120px"><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${c.avancement}%;background:var(--acc)"></i></div><span class="muted" style="font-size:12px">${c.avancement}%</span></div></td>
  <td class="r strong">${fmt(c.vente)}</td><td class="r ${c.benef<0?'neg':'pos'}">${c.cout?fmt(c.benef):'—'}</td><td>${mTxt(c)}</td></tr>`).join('')}
  </tbody></table></div>`;
};

V.chantier = (id) => {
  const c = chan(id); if (!c) return V.chantiers(); const cl = cli(c.client);
  const mx = Math.max(c.vente, c.cout) || 1;
  const rows = [['Matériaux', c.matR, '#2458B8'], ["Main-d'œuvre", c.moR, '#7C4DCC'], ['Transport', c.trR, '#B8862F'], ['Autres dépenses', c.auR, '#736C64']];
  let off = 0;
  const wrows = `<div class="wrow"><span class="lab">Vente chantier</span><div class="track"><i style="left:0;width:${c.vente/mx*100}%;background:var(--acc);opacity:.85"></i></div><span class="amt">${dt(c.vente)}</span></div>` +
    rows.map(r => { const w = r[1]/mx*100; const h = `<div class="wrow"><span class="lab">${r[0]}</span><div class="track"><i style="left:${off}%;width:${w}%;background:${r[2]}"></i></div><span class="amt ${r[1]?'neg':'muted'}">−${fmt(r[1])}</span></div>`; off += w; return h; }).join('') +
    `<div class="wrow res"><span class="lab">Bénéfice réel</span><div class="track"><i style="left:${c.benef>0?off:0}%;width:${Math.abs(c.benef)/mx*100}%;background:${c.benef<0?'var(--red)':'var(--green)'}"></i></div><span class="amt" style="font-size:15px;color:${c.cout?mCol(c.marge):'var(--ink)'}">${dt(c.benef)}</span></div>`;
  const R = 34, C = 2*Math.PI*R, pct = c.marge === null ? 0 : Math.max(0, Math.min(100, c.marge));
  const prevM = c.coutP ? (c.vente - c.coutP)/c.vente*100 : c.margePrev, ecart = c.coutP ? c.benef - (c.vente - c.coutP) : null;
  const addBtn = (fn, lab, icn) => `<button class="btn sm" onclick="A.${fn}('${c.id}')">${ic(icn)}${lab}</button>`;
  return backL('chantiers', 'Retour aux chantiers') + ph(esc(c.nom), `<span class="ref">${c.id}</span> · ${esc(c.desc)}`,
    `<button class="btn" onclick="A.editCh('${c.id}')">${ic('sliders-horizontal')}Statut</button><button class="btn" onclick="A.newDoc('Facture',{client:'${c.client}',chantier:'${c.id}'})">${ic('receipt')}Facturer</button><button class="btn" onclick="A.conso('${c.id}')">${ic('package-minus')}Consommer matériaux</button><button class="btn pri" onclick="A.dep('${c.id}')">${ic('plus')}Dépense</button>`) +
  `<div class="card mb"><div class="info" style="grid-template-columns:repeat(6,1fr)">
    <div><span>Client</span><b style="color:var(--acc);cursor:pointer" onclick="go('client','${cl.id}')">${esc(cl.nom)}</b></div><div><span>Adresse</span><b>${esc(c.adr)}</b></div>
    <div><span>Dates</span><b>${c.debut} → ${c.fin}</b></div><div><span>Responsable</span><b>${esc(c.resp)}</b></div>
    <div><span>Montant vendu HT</span><b>${dt(c.vente,0)}</b></div><div><span>Statut</span>${badge(c.statut)} <span class="muted" style="font-size:12px">${c.avancement}%</span></div>
  </div></div>
  <div class="card mb"><div class="hd"><h3>${ic('calculator')}Calcul de rentabilité du chantier</h3><span class="badge b-brown">Calcul automatique en temps réel</span></div>
    <div class="profit" style="margin-top:12px;border-top:1px solid var(--line)">
      <div class="waterfall">${wrows}</div>
      <div class="result">
        <span class="lab">Bénéfice réel</span>
        <div class="hero" style="color:${c.cout?mCol(c.marge):'var(--ink)'}">${fmt(c.benef,0)} <small>DT</small></div>
        <span class="muted">sur un chiffre d'affaires de ${dt(c.vente,0)}</span>
        ${c.cout ? `<div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="${R}" fill="none" stroke="#E7E3DE" stroke-width="9"/><circle cx="42" cy="42" r="${R}" fill="none" stroke="${mCol(c.marge)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C*pct/100} ${C}" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-size="16" font-weight="800" fill="${mCol(c.marge)}" font-family="Inter">${fmt(c.marge,0)}%</text></svg>
          <div><b>Marge ${fmt(c.marge,1)} %</b><br><span class="muted" style="font-size:12.5px">Prévisionnel : ${fmt(prevM,1)} %</span>${ecart!==null?`<br><span class="${ecart>=0?'pos':'neg'}" style="font-size:12.5px">${ecart>=0?'▲ +':'▼ '}${fmt(ecart,0)} DT vs prévu</span>`:''}</div></div>
        <div class="formula">Bénéfice = CA − matériaux − main-d'œuvre − transport − autres<br><b>${fmt(c.vente,0)} − ${fmt(c.matR,0)} − ${fmt(c.moR,0)} − ${fmt(c.trR,0)} − ${fmt(c.auR,0)} = ${fmt(c.benef,0)} DT</b><br>Marge = bénéfice ÷ CA × 100 = <b>${fmt(c.marge,1)} %</b></div>`
        : `<div class="note" style="margin-top:16px">${ic('info')}<span>Aucun coût enregistré. Marge prévue : <b>${c.margePrev||0} %</b>. Consommez des matériaux, pointez des heures ou ajoutez une dépense : la rentabilité se met à jour instantanément.</span></div>`}
      </div>
    </div></div>
  <div class="card mb"><div class="hd"><h3>${ic('package')}Matériaux utilisés</h3><div style="display:flex;gap:8px;align-items:center"><span class="badge b-green">Déduits automatiquement du stock</span>${addBtn('conso','Consommer','plus')}</div></div><div class="bd np">
  ${c.mats.length ? `<table><thead><tr><th>Produit</th><th class="r">Qté prévue</th><th class="r">Qté réelle</th><th class="r">Écart</th><th class="r">Prix achat</th><th class="r">Coût total</th></tr></thead><tbody>
  ${c.mats.map(m => { const a = art(m.ref); const e = m.reel - m.prev; return `<tr class="click" onclick="go('article','${m.ref}')"><td><b>${esc(a?.des||m.ref)}</b><div class="ref muted">${m.ref}</div></td><td class="r">${fmt(m.prev,0)} ${a?.u||''}</td><td class="r strong">${fmt(m.reel,0)} ${a?.u||''}</td><td class="r ${e>0?'neg':(e<0?'pos':'muted')}">${e>0?'+':''}${fmt(e,0)}</td><td class="r">${fmt(m.pu)}</td><td class="r strong">${fmt(m.reel*m.pu)}</td></tr>`; }).join('')}
  </tbody><tfoot><tr><td colspan="5">Total matériaux</td><td class="r">${dt(c.matR)}</td></tr></tfoot></table>` : `<div class="empty">${ic('package')}Aucun matériau consommé — <a style="color:var(--acc);cursor:pointer;font-weight:600" onclick="A.conso('${c.id}')">ajouter une consommation</a></div>`}</div></div>
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>${ic('users')}Main-d'œuvre</h3>${addBtn('mo','Pointer des heures','plus')}</div><div class="bd np">
    ${c.mo.length ? `<table><thead><tr><th>Employé</th><th class="r">Heures</th><th class="r">Tarif / h</th><th class="r">Coût</th></tr></thead><tbody>
    ${c.mo.map(m => `<tr><td><b>${esc(m.nom)}</b><div class="muted" style="font-size:12px">${esc(m.poste)}</div></td><td class="r">${fmt(m.h,0)} h <span class="muted" style="font-size:11.5px">/ ${fmt(m.hPrev,0)} prév.</span></td><td class="r">${fmt(m.taux)}</td><td class="r strong">${fmt(m.h*m.taux)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">Total main-d'œuvre</td><td class="r">${dt(c.moR)}</td></tr></tfoot></table>` : `<div class="empty">${ic('users')}Aucune heure pointée</div>`}</div></div>
    <div class="card"><div class="hd"><h3>${ic('receipt')}Autres dépenses</h3>${addBtn('dep','Ajouter','plus')}</div><div class="bd np">
    ${c.autres.length ? `<table><thead><tr><th>Type</th><th>Libellé</th><th class="r">Prévu</th><th class="r">Réel</th></tr></thead><tbody>
    ${c.autres.map(a => `<tr><td><span class="badge b-gray">${esc(a.type)}</span></td><td>${esc(a.lib)}</td><td class="r muted">${fmt(a.prev)}</td><td class="r strong">${fmt(a.reel)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">Total transport + autres</td><td class="r">${dt(c.trR+c.auR)}</td></tr></tfoot></table>` : `<div class="empty">${ic('receipt')}Aucune dépense</div>`}</div></div>
  </div>
  ${c.cout ? `<div class="card" style="margin-top:18px"><div class="hd"><h3>${ic('git-compare')}Prévisionnel vs réel</h3></div><div class="bd np"><table><thead><tr><th>Poste</th><th class="r">Prévisionnel</th><th class="r">Réel</th><th class="r">Écart</th><th>Situation</th></tr></thead><tbody>
  ${[['Matériaux',c.matP,c.matR],["Main-d'œuvre",c.moP,c.moR],['Transport',c.trP,c.trR],['Autres dépenses',c.auP,c.auR]].map(r => { const e = r[2]-r[1]; return `<tr><td><b>${r[0]}</b></td><td class="r">${fmt(r[1])}</td><td class="r strong">${fmt(r[2])}</td><td class="r ${e>0.001?'neg':(e<-0.001?'pos':'muted')}">${e>0?'+':''}${fmt(e)}</td><td>${e>0.001?'<span class="badge b-red">Dépassement</span>':(e<-0.001?'<span class="badge b-green">Économie</span>':'<span class="badge b-gray">Conforme</span>')}</td></tr>`; }).join('')}
  </tbody><tfoot><tr><td>Coût total</td><td class="r">${fmt(c.coutP)}</td><td class="r">${fmt(c.cout)}</td><td class="r ${c.cout>c.coutP?'neg':'pos'}">${c.cout>c.coutP?'+':''}${fmt(c.cout-c.coutP)}</td><td></td></tr></tfoot></table></div></div>` : ''}`;
};

V.caisse = (tab) => {
  if (tab) UI.caisseTab = tab; tab = UI.caisseTab;
  const Ac = S[tab], enc = sum(Ac.mvts.filter(m => m.amt > 0), m => m.amt), dec = sum(Ac.mvts.filter(m => m.amt < 0), m => -m.amt);
  const cardSel = k => UI.caisseTab === k ? 'border-color:var(--acc);box-shadow:0 0 0 3px var(--accSoft)' : '';
  return ph('Caisse & Banque', 'Entrées, sorties, encaissements clients, paiements fournisseurs, virements et chèques',
    `<button class="btn" onclick="A.newMvt('vir')">${ic('arrow-left-right')}Virement interne</button><button class="btn" onclick="A.newMvt('dec','${tab}')">${ic('minus-circle')}Décaissement</button><button class="btn pri" onclick="A.newMvt('enc','${tab}')">${ic('plus-circle')}Encaissement</button>`) +
  `<div class="grid g3 mb">
    <div class="card kpi" style="cursor:pointer;${cardSel('caisse')}" onclick="go('caisse','caisse')"><div class="lbl">Caisse Showroom<span class="ic">${ic('banknote')}</span></div><div class="val">${fmt(S.caisse.solde)}<small>DT</small></div><span class="sub" style="margin:0">Espèces · ${S.caisse.mvts.length} mouvements</span></div>
    <div class="card kpi" style="cursor:pointer;${cardSel('banque')}" onclick="go('caisse','banque')"><div class="lbl">Compte Bancaire<span class="ic" ${T_BLUE}>${ic('landmark')}</span></div><div class="val">${fmt(S.banque.solde)}<small>DT</small></div><span class="sub" style="margin:0">${S.banque.mvts.length} mouvements</span></div>
    <div class="card kpi" style="background:var(--side);border-color:var(--side);color:#fff"><div class="lbl" style="color:#A8A096">Trésorerie totale<span class="ic" style="background:#2E2722;color:var(--goldL)">${ic('wallet')}</span></div><div class="val">${fmt(S.caisse.solde + S.banque.solde)}<small style="color:#A8A096">DT</small></div><span class="sub" style="margin:0;color:#A8A096">Caisse + banque</span></div>
  </div>
  <div class="tabs"><div class="tab ${tab==='caisse'?'on':''}" onclick="go('caisse','caisse')">${ic('banknote')}Caisse Showroom</div><div class="tab ${tab==='banque'?'on':''}" onclick="go('caisse','banque')">${ic('landmark')}Compte Bancaire</div></div>
  <div class="card">
    <div class="account-hero"><div style="display:flex;align-items:center;gap:16px"><div class="ico" style="background:${tab==='caisse'?'var(--accSoft)':'var(--blueSoft)'};color:${tab==='caisse'?'var(--acc)':'var(--blue)'}">${ic(tab==='caisse'?'banknote':'landmark')}</div><div><span class="muted">Solde actuel — ${Ac.nom}</span><div class="big">${dt(Ac.solde)}</div></div></div>
      <div style="display:flex;gap:28px"><div><span class="muted" style="font-size:12px">Encaissements</span><div class="pos" style="font-size:18px">+${fmt(enc)}</div></div><div><span class="muted" style="font-size:12px">Décaissements</span><div class="neg" style="font-size:18px">−${fmt(dec)}</div></div></div></div>
    <div class="toolbar">${searchBox('Rechercher un mouvement…')}</div>
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th class="r">Encaissement</th><th class="r">Décaissement</th><th class="r">Solde</th></tr></thead><tbody>
    ${Ac.mvts.map((m, i) => `<tr class="${i===0&&NEWID==='mv0'?'new':''}"><td class="muted">${m.date}</td><td><b>${esc(m.lib)}</b></td><td><span class="badge b-gray">${esc(m.cat)}</span></td><td class="r pos">${m.amt>0?'+'+fmt(m.amt):''}</td><td class="r neg">${m.amt<0?'−'+fmt(-m.amt):''}</td><td class="r strong">${fmt(m.after)}</td></tr>`).join('')}
    </tbody></table></div>`;
};

V.clients = () => ph('Clients', `${S.clients.length} clients actifs · particuliers, promoteurs, hôtellerie`, `<button class="btn pri" onclick="A.newClient()">${ic('user-plus')}Nouveau client</button>`) +
  `<div class="card"><div class="toolbar">${searchBox('Rechercher un client…')}</div><table><thead><tr><th>Client</th><th>Type</th><th>Ville</th><th>Contact</th><th class="r">CA cumulé (TTC)</th><th class="r">Solde dû</th><th>Chantiers</th></tr></thead><tbody>
  ${S.clients.map(c => `<tr class="click${isNew(c.id)}" onclick="go('client','${c.id}')"><td><div style="display:flex;align-items:center;gap:10px"><div class="empavatar" style="background:var(--side)">${initials(c.nom)}</div><div><b>${esc(c.nom)}</b><div class="ref muted">${c.id}</div></div></div></td><td>${esc(c.type)}</td><td>${esc(c.ville)}</td><td class="muted">${esc(c.tel)}</td><td class="r strong">${fmt(caClient(c.id))}</td><td class="r ${creance(c.id)>0?'neg':'muted'}">${creance(c.id)>0?fmt(creance(c.id)):'—'}</td><td>${S.chantiers.filter(x => x.client === c.id).map(x => `<span class="badge b-gray" style="margin-right:4px">${x.id}</span>`).join('')}</td></tr>`).join('')}
  </tbody></table></div>`;

V.client = (id) => {
  const c = cli(id || 'C001'); if (!c) return V.clients();
  const docs = S.docs.filter(d => d.client === c.id), chs = S.chantiers.filter(x => x.client === c.id), cr = creance(c.id);
  return backL('clients', 'Retour aux clients') + `<div class="ph"><div style="display:flex;align-items:center;gap:16px"><div class="empavatar" style="width:54px;height:54px;font-size:18px;background:var(--acc)">${initials(c.nom)}</div><div><h1>${esc(c.nom)}</h1><p>${esc(c.type)} · ${esc(c.ville)} · client depuis ${c.depuis}</p></div></div><div class="actions"><button class="btn" onclick="A.newDoc('Devis',{client:'${c.id}'})">${ic('file-plus')}Nouveau devis</button><button class="btn" onclick="A.newDoc('Facture',{client:'${c.id}'})">${ic('receipt')}Nouvelle facture</button><button class="btn pri" onclick="A.newChantier()">${ic('hard-hat')}Nouveau chantier</button></div></div>
  <div class="grid g4 mb">
    ${kpi('CA cumulé (TTC)', fmt(caClient(c.id),0), 'DT')}
    ${kpi('Solde dû (créances)', `<span style="color:${cr>0?'var(--red)':'var(--green)'}">${fmt(cr,0)}</span>`, 'DT', `<span class="sub" style="margin:0">${cr>0?'À relancer':'À jour'}</span>`)}
    ${kpi('Chantiers liés', chs.length, '')}
    ${kpi('Documents', docs.length, '', `<span class="sub" style="margin:0">devis, commandes, BL, factures</span>`)}
  </div>
  <div class="grid g12">
    <div><div class="card mb"><div class="hd"><h3>${ic('contact')}Coordonnées</h3></div><div class="bd">
      ${[['Contact',c.contact],['Adresse',c.adr],['Téléphone',c.tel],['E-mail',c.mail],['Matricule fiscal',c.mf],['Conditions','30 jours fin de mois']].map(k => `<div class="kv"><span>${k[0]}</span><b style="text-align:right">${esc(k[1])}</b></div>`).join('')}
    </div></div>
    <div class="card"><div class="hd"><h3>${ic('hard-hat')}Chantiers liés</h3></div><div class="bd np">
      ${chs.map(x => `<div class="mini" style="cursor:pointer" onclick="go('chantier','${x.id}')"><div class="ico" style="background:var(--accSoft);color:var(--acc)">${ic('hard-hat')}</div><div><b>${esc(x.court)}</b><small>${x.id} · ${fmt(x.vente,0)} DT</small></div><div class="end">${badge(x.statut)}<br>${mTxt(x)}</div></div>`).join('') || `<div class="empty">${ic('hard-hat')}Aucun chantier</div>`}
    </div></div></div>
    <div class="card"><div class="hd"><h3>${ic('history')}Historique commandes & factures</h3></div><div class="bd np">${docs.length ? `<table class="tight"><thead><tr><th>N°</th><th>Type</th><th>Date</th><th class="r">Montant TTC</th><th class="r">Réglé</th><th class="r">Reste</th><th>Statut</th><th></th></tr></thead><tbody>
    ${docs.map(d => { const f = d.type === 'Facture', reste = f ? d.ttc - (d.paye||0) : 0; return `<tr class="${d.lignes?'click':''}${isNew(d.num)}" ${d.lignes?`onclick="go('facture','${d.num}')"`:''}><td class="ref">${d.num}</td><td>${d.type}</td><td class="muted">${d.date}</td><td class="r strong">${fmt(d.ttc)}</td><td class="r">${f?fmt(d.paye||0):'—'}</td><td class="r ${reste>0.001?'neg':'muted'}">${f?fmt(reste):'—'}</td><td>${badge(d.statut)}</td><td class="r">${reste>0.001?`<button class="btn sm" onclick="${stop}A.encaisser('${d.num}')">${ic('banknote')}</button>`:''}</td></tr>`; }).join('')}
    </tbody></table>` : `<div class="empty">${ic('files')}Aucun document — créez un devis ou une facture</div>`}</div></div>
  </div>`;
};

V.employes = () => ph('Employés', "Présence, heures travaillées et affectation automatique du coût aux chantiers", `<button class="btn pri" onclick="A.newEmp()">${ic('user-plus')}Nouvel employé</button>`) +
  `<div class="grid g4 mb">
    ${kpi('Effectif', S.employes.length, '', `<span class="sub" style="margin:0">terrain, showroom & dépôt</span>`)}
    ${kpi('Heures (mois)', fmt(sum(S.employes, e => e.h),0), 'h', `<span class="sub" style="margin:0">+ ${sum(S.employes, e => e.hs)} h supplémentaires</span>`)}
    ${kpi("Coût main-d'œuvre (mois)", fmt(sum(S.employes, e => (e.h + e.hs*1.25)*e.taux),0), 'DT', `<span class="sub" style="margin:0">Heures sup. majorées 25 %</span>`)}
    ${kpi('Taux de présence', '97,5 %', '', `<span class="sub" style="margin:0">2 absences ce mois</span>`)}
  </div>
  <div class="note mb">${ic('info')}<span>Les heures pointées depuis une fiche chantier sont ajoutées ici automatiquement et leur coût est imputé au chantier concerné.</span></div>
  <div class="card"><table><thead><tr><th>Employé</th><th>Poste</th><th class="r">Coût horaire</th><th class="r">Heures</th><th class="r">Heures sup.</th><th>Présence</th><th>Chantier affecté</th><th>Aujourd'hui</th></tr></thead><tbody>
  ${S.employes.map(e => `<tr class="${isNew(e.nom).trim()}"><td><div style="display:flex;align-items:center;gap:10px"><div class="empavatar" style="background:${e.col}">${initials(e.nom)}</div><b>${esc(e.nom)}</b></div></td><td>${esc(e.poste)}</td><td class="r">${fmt(e.taux)} DT</td><td class="r strong">${fmt(e.h,0)} h</td><td class="r">${e.hs} h</td><td style="min-width:120px"><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${e.pres}%;background:var(--green)"></i></div><span class="muted" style="font-size:12px">${e.pres}%</span></div></td>
  <td>${e.ch === '—' || !chan(e.ch) ? '<span class="muted">Showroom / dépôt</span>' : `<span style="color:var(--acc);font-weight:600;cursor:pointer" onclick="go('chantier','${e.ch}')">${e.ch} · ${esc(chan(e.ch).court)}</span>`}</td><td>${badge('Présent')}</td></tr>`).join('')}
  </tbody></table></div>`;

V.rapports = () => {
  const R = [['trending-up',"Chiffre d'affaires",'Journalier, mensuel, annuel — par produit, client et période'],['package','Stock & valorisation','Quantités, ruptures, valeur du stock, mouvements par dépôt'],['shopping-cart','Achats','Par fournisseur et période, importations, historique des prix'],['file-text','Ventes & créances','Factures, encaissements, impayés et échéances clients'],['hard-hat','Rentabilité chantiers','Bénéfice et marge par chantier, prévu vs réel'],['users',"Main-d'œuvre",'Heures, coûts et affectations par employé et chantier'],['wallet','Trésorerie','Caisse, banque, encaissements et décaissements'],['percent','Marges produits','Marge brute et nette par article et catégorie']];
  return ph('Rapports & exports', 'Tous les états de pilotage, exportables en Excel, PDF et CSV', `<button class="btn pri" onclick="A.exportDB()">${ic('download')}Export complet des données</button>`) +
  `<div class="grid g2 mb">
    <div class="card"><div class="hd"><h3>${ic('pie-chart')}Répartition du CA par catégorie — 2026</h3></div><div class="bd"><div class="chartbox"><canvas id="chCat"></canvas></div></div></div>
    <div class="card"><div class="hd"><h3>${ic('hard-hat')}Marge réelle par chantier</h3></div><div class="bd"><div class="chartbox"><canvas id="chMarge"></canvas></div></div></div>
  </div>
  <div class="grid g4">${R.map(r => `<div class="card exp"><div class="top2"><div class="ic">${ic(r[0])}</div><b>${r[1]}</b></div><p>${r[2]}</p><div class="fmt"><span class="x" onclick="toast('Export Excel — disponible dans la version finale')">${ic('file-spreadsheet')}Excel</span><span class="p" onclick="toast('Export PDF — disponible dans la version finale')">${ic('file-text')}PDF</span><span class="v" onclick="toast('Export CSV — disponible dans la version finale')">${ic('file')}CSV</span></div></div>`).join('')}</div>`;
};

V.parametres = () => {
  const size = (JSON.stringify(S).length/1024).toFixed(1);
  const stats = [['Chantiers', S.chantiers.length], ['Bons de commande', S.achats.length], ['Documents de vente', S.docs.length], ['Articles', S.articles.length], ['Mouvements de stock', S.stockMv.length], ['Mouvements caisse + banque', S.caisse.mvts.length + S.banque.mvts.length], ['Clients', S.clients.length], ['Opérations journalisées', S.log.length]];
  return ph('Paramètres & données', 'Base de données de la simulation, sauvegarde, utilisateurs et journal des opérations') +
  `<div class="grid g21 mb">
    <div class="card"><div class="hd"><h3>${ic('database')}Base de données de la simulation</h3>${LS.ok?`<span class="badge b-green">${size} Ko · enregistrée</span>`:`<span class="badge b-amber">${size} Ko · mode mémoire</span>`}</div><div class="bd">
      <div class="note mb">${ic('info')}<span>Chaque opération (bon, chantier, facture, mouvement…) est enregistrée <b>instantanément dans ce navigateur</b>. Les données persistent après rechargement.${LS.ok?'':' <b>(Stockage local indisponible dans cet aperçu : les données sont conservées jusqu\'au rechargement — hébergé sur le serveur, elles sont persistantes.)</b>'} Exportez-les en JSON pour les conserver ou les transférer sur un autre poste.</span></div>
      <div class="grid g4" style="gap:10px">${stats.map(s => `<div style="background:#FBFAF8;border:1px solid var(--line);border-radius:10px;padding:12px"><div class="muted" style="font-size:11.5px">${s[0]}</div><div style="font-size:20px;font-weight:750">${s[1]}</div></div>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn pri" onclick="A.exportDB()">${ic('download')}Exporter la base (JSON)</button><label class="btn" style="cursor:pointer">${ic('upload')}Importer un fichier JSON<input type="file" accept=".json,application/json" style="display:none" onchange="A.importDB(this)"></label><button class="btn danger" onclick="A.reset()">${ic('rotate-ccw')}Réinitialiser la démo</button></div>
      <div class="muted" style="font-size:12px;margin-top:10px">Dernier enregistrement : ${S.savedAt ? new Date(S.savedAt).toLocaleString('fr-FR') : 'données d\'origine (aucune opération)'}</div>
    </div></div>
    <div class="card"><div class="hd"><h3>${ic('shield-check')}Utilisateurs & droits</h3></div><div class="bd np">
      ${[['Nabil B.','Administrateur','Accès complet'],['Nadia Hamdi','Commerciale','Ventes, clients, devis'],['Mourad Jlassi','Magasinier','Stock, réceptions'],['Cabinet comptable','Comptable','Lecture, exports, caisse']].map(u => `<div class="mini"><div class="empavatar" style="background:var(--side);color:var(--goldL)">${initials(u[0])}</div><div><b>${u[0]}</b><small>${u[2]}</small></div><div class="end"><span class="badge b-brown">${u[1]}</span></div></div>`).join('')}
      <div style="padding:10px 18px"><div class="sync" style="color:var(--muted)">${ic('hard-drive')}Sauvegarde auto quotidienne 03:00 + hebdomadaire externe</div></div>
    </div></div>
  </div>
  <div class="card"><div class="hd"><h3>${ic('scroll-text')}Journal des opérations</h3><span class="muted" style="font-size:12px">Utilisateur · date · heure · opération</span></div><div class="toolbar" style="margin-top:12px">${searchBox('Filtrer le journal…')}</div>
    <table><thead><tr><th>Date</th><th>Heure</th><th>Utilisateur</th><th>Opération</th><th>Détail</th></tr></thead><tbody>
    ${S.log.map(l => `<tr><td class="muted">${l.date}</td><td class="muted">${l.t}</td><td><b>${esc(l.user)}</b></td><td><span style="display:inline-flex;align-items:center;gap:8px">${ic(l.icon)}${esc(l.msg)}</span></td><td class="muted">${esc(l.sub)}</td></tr>`).join('')}
    </tbody></table></div>`;
};

/* =====================================================================
   GRAPHIQUES
   ===================================================================== */
let charts = [];
if (window.Chart) { Chart.defaults.font.family = 'Inter'; Chart.defaults.color = '#736C64'; Chart.defaults.font.size = 11.5; }
const kfmt = v => (v/1000).toLocaleString('fr-FR') + ' k';
function drawCharts(v){
  if (!window.Chart) return;
  if (v === 'dashboard') {
    const MOIS = ['Nov','Déc','Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct'];
    const ca = [...S.ca12, caMois()], ach = [...S.ach12, achMois()];
    charts.push(new Chart(document.getElementById('chCA'), {data: {labels: MOIS, datasets: [
      {type:'bar', label:"Chiffre d'affaires", data: ca, backgroundColor: ca.map((_, i) => i === 11 ? '#8B5E3C' : '#8B5E3C2E'), borderRadius: 6, maxBarThickness: 34, order: 2},
      {type:'line', label:'Achats', data: ach, borderColor:'#B8955A', backgroundColor:'#B8955A', tension:.35, pointRadius:3, borderWidth:2, order:1}]},
      options: {maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{usePointStyle:true, boxWidth:8}}, tooltip:{callbacks:{label: c => c.dataset.label + ' : ' + fmt(c.raw,0) + ' DT'}}}, scales:{y:{grid:{color:'#F1EEEA'}, border:{display:false}, ticks:{callback:kfmt}}, x:{grid:{display:false}}}}}));
  }
  if (v === 'rapports') {
    charts.push(new Chart(document.getElementById('chCat'), {type:'doughnut', data:{labels:['Carrelage & faïence','Sanitaire','Peinture','Luminaire','Parquet','Plâtrerie','Consommables'], datasets:[{data:[36,18,14,12,10,6,4], backgroundColor:['#8B5E3C','#2458B8','#B8955A','#7C4DCC','#5E3D24','#A8A096','#C2362F'], borderWidth:2, borderColor:'#fff'}]},
      options:{maintainAspectRatio:false, cutout:'64%', plugins:{legend:{position:'right', labels:{usePointStyle:true, boxWidth:8, padding:12}}, tooltip:{callbacks:{label: c => c.label + ' : ' + c.raw + ' %'}}}}}));
    const cs = S.chantiers.filter(c => c.cout);
    charts.push(new Chart(document.getElementById('chMarge'), {type:'bar', data:{labels: cs.map(c => c.court), datasets:[{label:'Marge %', data: cs.map(c => +c.marge.toFixed(1)), backgroundColor: cs.map(c => c.marge < 0 ? '#C2362F' : (c.marge < 15 ? '#B06A00' : '#1E8A5A')), borderRadius:6, maxBarThickness:28}]},
      options:{indexAxis:'y', maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label: c => 'Marge : ' + fmt(c.raw,1) + ' %'}}}, scales:{x:{grid:{color:'#F1EEEA'}, border:{display:false}, ticks:{callback: v => v + ' %'}}, y:{grid:{display:false}}}}}));
  }
}

/* =====================================================================
   NAVIGATION SPA
   ===================================================================== */
const PARENT = {article:'stock', bc:'achats', facture:'ventes', chantier:'chantiers', client:'clients'};
const TITLES = {dashboard:'Tableau de bord', stock:'Stock & Articles', article:'Fiche article', achats:'Achats', bc:'Bon de commande', ventes:'Ventes', facture:'Document', chantiers:'Chantiers', chantier:'Fiche chantier', caisse:'Caisse & Banque', clients:'Clients', client:'Fiche client', employes:'Employés', rapports:'Rapports', parametres:'Paramètres & données'};
const view = $('#view'), scroller = $('#scroll');
let CUR = {v:'dashboard', p:null}, first = true;
function updateChrome(){
  const n = alerts().length; $('#alertCnt').textContent = n; $('#alertCnt').style.display = n ? '' : 'none'; $('#bellPip').style.display = n ? '' : 'none';
  $('#lastSave').textContent = S.savedAt ? 'Enregistré · ' + new Date(S.savedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : 'Sauvegarde auto : 03:00';
}
function render(keepScroll){
  recalc();
  charts.forEach(c => c.destroy()); charts = [];
  const st = scroller.scrollTop;
  view.innerHTML = V[CUR.v](CUR.p);
  if (window.lucide) lucide.createIcons();
  drawCharts(CUR.v); updateChrome();
  scroller.scrollTop = keepScroll ? st : 0;
}
function refresh(){ render(true); }
function go(v, p){
  closeQ(); CUR = {v, p};
  const nav = PARENT[v] || v;
  document.querySelectorAll('#nav a[data-v]').forEach(a => a.classList.toggle('active', a.dataset.v === nav));
  const par = PARENT[v];
  $('#crumbs').innerHTML = `<span>NEW CONCEPT</span>${ic('chevron-right')}` + (par ? `<span style="cursor:pointer" onclick="go('${par}')">${TITLES[par]}</span>${ic('chevron-right')}` : '') + `<b>${TITLES[v]}${p && v !== 'caisse' ? ' · ' + esc(p) : ''}</b>`;
  if (first) { first = false; render(); return; }
  view.classList.add('out');
  setTimeout(() => { render(); requestAnimationFrame(() => view.classList.remove('out')); }, 150);
}
function closeQ(){ $('#qmenu').classList.remove('on'); }
$('#qbtn').addEventListener('click', e => { e.stopPropagation(); $('#qmenu').classList.toggle('on'); });
document.addEventListener('click', e => { if (!e.target.closest('#qmenu')) closeQ(); });
document.querySelectorAll('#nav a[data-v]').forEach(a => a.addEventListener('click', () => go(a.dataset.v)));
if (window.NBC_MARK) { document.querySelector('.brand .mark').style.backgroundImage = `url(${NBC_MARK})`; const l = document.createElement('link'); l.rel = 'icon'; l.href = NBC_MARK; document.head.appendChild(l); }
if (window.lucide) lucide.createIcons();
go('dashboard');
