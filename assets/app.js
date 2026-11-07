/* श्रीराम वैदिक ज्योतिष केंद्र: साइट का मुख्य कोड।
   सारी सामग्री data/content.js से आती है। उसे एडमिन पैनल (admin.html) से बदलें। */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var C = null;
var cleanups = [];
var firstRender = true;
var globalBound = false;

/* ---------- helpers ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
function paras(s) { return String(s || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return '<p>' + rich(p) + '</p>'; }).join(''); }
function href(u) { u = String(u || '').trim(); return /^(#[\w-]*|https?:\/\/|tel:|mailto:)/i.test(u) ? u : '#'; }
function lk(u) { u = href(u); return ' href="' + esc(u) + '"' + (/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''); }
function src(u) {
  u = String(u || '').trim();
  if (/^data:image\//i.test(u)) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w\-./%]+$/.test(u) && u.indexOf('..') < 0) return u;
  return '';
}
function el(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function polar(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function waNum() { return String((C.site && C.site.waNumber) || '').replace(/\D/g, ''); }
function waLink(text) { return 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(text); }
var toastT;
function toast(msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

/* ---------- fixed knowledge data ---------- */
var RASHI = [
  { n: 'मेष', sw: 'मंगल', el: 'अग्नि', sym: 'मेढ़ा' }, { n: 'वृषभ', sw: 'शुक्र', el: 'पृथ्वी', sym: 'बैल' },
  { n: 'मिथुन', sw: 'बुध', el: 'वायु', sym: 'युगल' }, { n: 'कर्क', sw: 'चंद्र', el: 'जल', sym: 'केकड़ा' },
  { n: 'सिंह', sw: 'सूर्य', el: 'अग्नि', sym: 'सिंह' }, { n: 'कन्या', sw: 'बुध', el: 'पृथ्वी', sym: 'कन्या' },
  { n: 'तुला', sw: 'शुक्र', el: 'वायु', sym: 'तराजू' }, { n: 'वृश्चिक', sw: 'मंगल', el: 'जल', sym: 'बिच्छू' },
  { n: 'धनु', sw: 'गुरु', el: 'अग्नि', sym: 'धनुर्धर' }, { n: 'मकर', sw: 'शनि', el: 'पृथ्वी', sym: 'मगर' },
  { n: 'कुंभ', sw: 'शनि', el: 'वायु', sym: 'घड़ा' }, { n: 'मीन', sw: 'गुरु', el: 'जल', sym: 'मछली' }
];
var GRAHA = [
  { k: 'सू', n: 'सूर्य', c: '#FFC24A', r: 78, s: 7, p: 30 }, { k: 'चं', n: 'चंद्र', c: '#E7E2FF', r: 78, s: -20, p: 200 },
  { k: 'मं', n: 'मंगल', c: '#FF7A6B', r: 108, s: 5, p: 120 }, { k: 'बु', n: 'बुध', c: '#7FE0A6', r: 108, s: -9, p: 300 },
  { k: 'गु', n: 'गुरु', c: '#FFD86B', r: 138, s: 3.2, p: 60 }, { k: 'शु', n: 'शुक्र', c: '#FFA8D2', r: 138, s: -6.5, p: 240 },
  { k: 'श', n: 'शनि', c: '#8FA8FF', r: 108, s: 2.2, p: 210 }, { k: 'रा', n: 'राहु', c: '#B8B3C9', r: 138, s: -1.8, p: 150 },
  { k: 'के', n: 'केतु', c: '#B8B3C9', r: 78, s: -1.8, p: 330 }
];
var BH = [
  ['तनु भाव', 'स्वयं, शरीर, स्वभाव एवं व्यक्तित्व का भाव। इसे लग्न भी कहते हैं।'],
  ['धन भाव', 'संचित धन, कुटुंब, वाणी एवं भोजन का भाव।'],
  ['सहज भाव', 'पराक्रम, प्रयास, छोटे भाई-बहन एवं साहस का भाव।'],
  ['सुख भाव', 'माता, घर, वाहन, भूमि एवं मन की शांति का भाव।'],
  ['पुत्र भाव', 'संतान, विद्या, बुद्धि एवं प्रेम संबंधों का भाव।'],
  ['रिपु भाव', 'ऋण, रोग, शत्रु एवं सेवा का भाव।'],
  ['जाया भाव', 'जीवनसाथी, दांपत्य एवं साझेदारी का भाव।'],
  ['आयु भाव', 'आयु, अचानक होने वाले परिवर्तन एवं गूढ़ विद्या का भाव।'],
  ['भाग्य भाव', 'भाग्य, धर्म, गुरु एवं लंबी यात्राओं का भाव।'],
  ['कर्म भाव', 'कर्म, पद-प्रतिष्ठा एवं आजीविका का भाव।'],
  ['लाभ भाव', 'आय, लाभ, इच्छापूर्ति एवं मित्र-मंडली का भाव।'],
  ['व्यय भाव', 'व्यय, विदेश, एकांत एवं मोक्ष का भाव।']
];
var NK = [['अश्विनी', 'D', 'A'], ['भरणी', 'M', 'M'], ['कृत्तिका', 'R', 'N'], ['रोहिणी', 'M', 'N'], ['मृगशिरा', 'D', 'M'], ['आर्द्रा', 'M', 'A'], ['पुनर्वसु', 'D', 'A'], ['पुष्य', 'D', 'M'], ['आश्लेषा', 'R', 'N'], ['मघा', 'R', 'N'], ['पूर्वा फाल्गुनी', 'M', 'M'], ['उत्तरा फाल्गुनी', 'M', 'A'], ['हस्त', 'D', 'A'], ['चित्रा', 'R', 'M'], ['स्वाति', 'D', 'N'], ['विशाखा', 'R', 'N'], ['अनुराधा', 'D', 'M'], ['ज्येष्ठा', 'R', 'A'], ['मूल', 'R', 'A'], ['पूर्वाषाढ़ा', 'M', 'M'], ['उत्तराषाढ़ा', 'M', 'N'], ['श्रवण', 'D', 'N'], ['धनिष्ठा', 'R', 'M'], ['शतभिषा', 'R', 'A'], ['पूर्वाभाद्रपद', 'M', 'A'], ['उत्तराभाद्रपद', 'M', 'M'], ['रेवती', 'D', 'N']];

/* ---------- theme ---------- */
var HEX = /^#[0-9a-fA-F]{6}$/;
function themeVars(t) {
  if (!t) return '';
  var map = { bg: '--bg', bg2: '--bg-2', surface: '--surface', surface2: '--surface-2', line: '--line', ink: '--ink', ink2: '--ink-2', accent: '--accent', accentInk: '--accent-ink', accent2: '--accent-2', star: '--star' };
  var out = '';
  for (var k in map) if (HEX.test(t[k] || '')) out += map[k] + ':' + t[k] + ';';
  return out;
}
function applyTheme(th) {
  th = th || {};
  var d = themeVars(th.dark), l = themeVars(th.light);
  var css = ':root{' + d + '}' +
    '@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){' + l + '}}' +
    ':root[data-theme="light"]{' + l + '}' +
    ':root[data-theme="dark"]{' + d + '}';
  $('#theme-override').textContent = css;
  if (firstRender && (th.mode === 'dark' || th.mode === 'light')) document.documentElement.setAttribute('data-theme', th.mode);
  var meta = $('meta[name="theme-color"]');
  if (meta && HEX.test((th.dark || {}).bg || '')) meta.setAttribute('content', th.dark.bg);
}
function isDark() {
  var t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}

/* ---------- templates ---------- */
function sec(id, title, cls, inner) {
  return '<section id="' + esc(id) + '" class="' + cls + '" data-title="' + esc(title) + '">' + inner + '</section>';
}
function head(d, alt) { /* eyebrow + heading + lead */
  return (d.eyebrow ? '<p class="eyebrow">' + esc(d.eyebrow) + '</p>' : '') + '<h2>' + esc(d.heading) + '</h2>' + (d.lead ? '<p class="lead">' + rich(d.lead) + '</p>' : '');
}
function ticks(a) { return '<ul class="ticks">' + (a || []).map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>'; }
function goBtn(cls, text, service, note) {
  return '<button class="btn ' + cls + '" type="button" data-go="' + esc(service || '') + '" data-note="' + esc(note || '') + '">' + esc(text) + '</button>';
}

function tHome(h, S, title) {
  var wheel = h.showWheel === false ? '' :
    '<div class="wheel-wrap"><svg id="wheel" viewBox="0 0 540 540" role="group" aria-label="बारह राशियों का चक्र। किसी राशि को चुनकर उसका विवरण देखें।"></svg><div class="rashi-card" id="rashiCard" aria-live="polite"></div><ul class="legend" id="legend" aria-label="नवग्रह"></ul></div>';
  var quick = (h.quick || []).map(function (q) { return '<a class="chip"' + lk(q.href) + '>' + esc(q.text) + '</a>'; }).join('');
  var av = src(h.avatar);
  var inner = '<canvas id="stars" aria-hidden="true"></canvas><div class="wrap"><div class="hero-grid"><div>' +
    (h.om ? '<p class="om">' + esc(h.om) + '</p>' : '') +
    '<h1>' + esc(h.titleBefore) + '<em>' + esc(h.titleEm) + '</em>' + esc(h.titleAfter) + '</h1>' +
    (h.tagline ? '<p class="tagline">' + esc(h.tagline) + '</p>' : '') +
    (h.lead ? '<p class="lead">' + rich(h.lead) + '</p>' : '') +
    '<div class="actions">' +
    (h.btn1Text ? '<a class="btn btn-primary"' + lk(h.btn1Href) + '>' + esc(h.btn1Text) + '</a>' : '') +
    (h.btn2Text ? '<a class="btn btn-ghost"' + lk(h.btn2Href) + '>' + esc(h.btn2Text) + '</a>' : '') + '</div>' +
    (quick ? '<div class="quick" aria-label="त्वरित लिंक">' + quick + '</div>' : '') +
    (h.founderName ? '<div class="founder">' + (av ? '<img src="' + esc(av) + '" width="56" height="56" alt="">' : '') + (h.founderRole ? '<span>' + esc(h.founderRole) + '</span>' : '') + '<b>' + esc(h.founderName) + '</b></div>' : '') +
    (h.showToday === false ? '' : '<div class="today" id="today" aria-live="polite"></div>') +
    '</div>' + wheel + '</div></div>';
  return sec('home', title, 'hero' + (h.showWheel === false ? ' no-wheel' : ''), inner);
}
function tAbout(a, alt, title) {
  var photo = src(a.photo), who = (C.home && C.home.founderName) || '';
  var inner = '<div class="wrap about-grid"><div class="portrait' + (photo ? '' : ' no-photo') + '"><svg class="medal" id="medal" viewBox="0 0 400 400" aria-hidden="true"></svg>' +
    (photo ? '<img src="' + esc(photo) + '" width="640" height="879" alt="' + esc(who) + '" loading="lazy">' : '') + '</div>' +
    '<div class="about-copy">' + head(a).replace('<p class="lead">', '<p class="lead" style="max-width:none">') +
    (a.para1 ? '<p class="lead" style="max-width:none">' + rich(a.para1) + '</p>' : '') +
    (a.para2 ? '<p>' + rich(a.para2) + '</p>' : '') +
    '<div class="aims">' + (a.aims || []).map(function (x) { return '<div><h3>' + esc(x.title) + '</h3><p>' + rich(x.text) + '</p></div>'; }).join('') + '</div></div></div>';
  return sec('about', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tKundali(k, alt, title) {
  var left = '<div>' + head(k) + ticks(k.bullets) + '</div>';
  var form = '<form class="panel" id="kForm" novalidate><h3>' + esc(k.formTitle) + '</h3><p class="hint">' + esc(k.formHint) + '</p>' +
    '<div class="form-grid">' +
    '<div class="field"><label for="k-name">नाम</label><input id="k-name" type="text" autocomplete="name" placeholder="जैसे: रमेश कुमार"></div>' +
    '<div class="field"><label for="k-dob">जन्मतिथि</label><input id="k-dob" type="date"></div>' +
    '<div class="field"><label for="k-tob">जन्म का सही समय</label><input id="k-tob" type="time"></div>' +
    '<div class="field"><label for="k-pob">जन्म स्थान</label><input id="k-pob" type="text" placeholder="शहर, जिला, राज्य"></div>' +
    '<div class="field full"><label for="k-topic">परामर्श का विषय</label><select id="k-topic">' + (k.topics || []).map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field full"><label for="k-q">आपका प्रश्न या समस्या</label><textarea id="k-q" placeholder="अपना प्रश्न संक्षेप में लिखें"></textarea></div></div>' +
    (k.photoNote ? '<p class="fine">' + esc(k.photoNote) + '</p>' : '') +
    '<p class="err" id="k-err" role="alert"></p><div class="form-actions"><button class="btn btn-primary" type="submit">संदेश तैयार करें</button></div>' + outbox('k') + '</form>';
  var bhava = '<div class="bhava"><svg id="chart" viewBox="-6 -6 312 312" role="group" aria-label="उत्तर भारतीय शैली की कुंडली। किसी भाव को चुनकर उसका अर्थ देखें।"></svg>' +
    '<div class="bhava-info">' + (k.chartEyebrow ? '<p class="eyebrow">' + esc(k.chartEyebrow) + '</p>' : '') + '<h3 id="bh-title"></h3><p id="bh-text" aria-live="polite"></p>' +
    '<div class="bhava-pick"><div class="field"><label for="lagna">उदाहरण के लिए लग्न राशि चुनें</label><select id="lagna"></select></div></div>' +
    (k.chartNote ? '<p class="fine">' + esc(k.chartNote) + '</p>' : '') + '</div></div>';
  return sec('kundali', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap"><div class="split">' + left + form + '</div>' + bhava + '</div>');
}
function outbox(p) {
  return '<div class="outbox" id="' + p + '-out" hidden><p>संदेश तैयार है। WhatsApp में “भेजें” दबाने तक यह कहीं नहीं जाता।</p><textarea id="' + p + '-out-text" readonly></textarea>' +
    '<div class="actions"><a class="btn btn-primary" id="' + p + '-out-link" target="_blank" rel="noopener" href="#">WhatsApp में खोलें</a><button class="btn btn-ghost" type="button" data-copy="' + p + '-out-text">संदेश कॉपी करें</button></div></div>';
}
function tMilan(m, alt, title) {
  var left = '<div>' + head(m) + ticks(m.bullets) + '</div>';
  var panel = '<div class="panel" id="milanPanel"><h3>' + esc(m.panelTitle) + '</h3><p class="hint">' + esc(m.panelHint) + '</p>' +
    '<div class="pair"><fieldset><legend>वर</legend><div class="field"><label for="b-nk">जन्म नक्षत्र</label><select id="b-nk"></select></div><div class="field"><label for="b-rs">चंद्र राशि</label><select id="b-rs"></select></div></fieldset>' +
    '<fieldset><legend>वधू</legend><div class="field"><label for="g-nk">जन्म नक्षत्र</label><select id="g-nk"></select></div><div class="field"><label for="g-rs">चंद्र राशि</label><select id="g-rs"></select></div></fieldset></div>' +
    '<div class="form-actions" style="margin-top:18px"><button class="btn btn-primary" type="button" id="milanGo">मिलान देखें</button></div>' +
    '<div class="result" id="milanRes" hidden><div class="result-top"><svg class="gauge" viewBox="0 0 132 132" role="img" aria-label="कुल अंक"><circle class="bg" cx="66" cy="66" r="54"/><circle class="fg" id="gFg" cx="66" cy="66" r="54" transform="rotate(-90 66 66)" stroke-dasharray="339.29" stroke-dashoffset="339.29"/><text id="gTxt" x="66" y="62"></text><text class="sm" x="66" y="88">24 में से</text></svg>' +
    '<div class="verdict"><b id="vTitle"></b><p id="vText"></p></div></div><ul class="kuts" id="kuts"></ul><div class="flags" id="flags"></div>' +
    (m.fine ? '<p class="fine">' + esc(m.fine) + '</p>' : '') +
    (m.ctaText ? '<div class="actions" style="margin-top:14px">' + goBtn('btn-ghost btn-small', m.ctaText, m.ctaService, m.ctaNote) + '</div>' : '') + '</div></div>';
  return sec('milan', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap split">' + left + panel + '</div>');
}
function tPrem(p, alt, title) {
  var inner = '<div class="wrap">' + head(p) +
    '<div class="pills" aria-label="विचार के विषय">' + (p.pills || []).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
    '<div class="sutra">' + (p.sutras || []).map(function (s) { return '<div><b>' + esc(s.title) + '</b><span>' + rich(s.text) + '</span></div>'; }).join('') + '</div>' +
    (p.ctaText ? '<div class="actions" style="margin-top:30px">' + goBtn('btn-primary', p.ctaText, p.ctaService, p.ctaNote) + '</div>' : '') + '</div>';
  return sec('prem', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tCareer(c, alt, title) {
  var left = '<div>' + head(c) + (c.ctaText ? '<div class="actions" style="margin-top:26px">' + goBtn('btn-primary', c.ctaText, c.ctaService, c.ctaNote) + '</div>' : '') + '</div>';
  var rows = '<div class="rows">' + (c.rows || []).map(function (r, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(r.title) + '</summary><div class="body">' + rich(r.body) + '</div></details>'; }).join('') + '</div>';
  return sec('career', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap split">' + left + rows + '</div>');
}
function tDosh(d, alt, title) {
  return sec('dosh', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(d) + '<div class="tabs" role="tablist" id="doshTabs" aria-label="ग्रह दोष के विषय"></div><div class="panel tabpanel" id="doshPanel" role="tabpanel" aria-live="polite"></div></div>');
}
function tPuja(p, alt, title) {
  return sec('puja', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(p) + '<div class="tabs" id="pujaChips" style="margin-top:24px" aria-label="पूजा की श्रेणी"></div><div class="puja-grid" id="pujaGrid"></div></div>');
}
function tKatha(k, alt, title) {
  var arches = (k.items || []).map(function (i) {
    return '<article class="arch"><span class="glyph" aria-hidden="true">' + esc(i.glyph) + '</span><h3>' + esc(i.title) + '</h3><p>' + rich(i.text) + '</p>' + goBtn('btn-ghost btn-small', k.btnText || 'संपर्क करें', i.service, i.title) + '</article>';
  }).join('');
  var note = k.noteText ? '<div class="note-big"><p>' + rich(k.noteText) + '</p>' + (k.noteBtn ? goBtn('btn-primary', k.noteBtn, k.noteService, k.noteNote) : '') + '</div>' : '';
  return sec('katha', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(k) + '<div class="arches">' + arches + '</div>' + note + '</div>');
}
function tGallery(g, alt, title) {
  var items = (g.items || []).filter(function (i) { return src(i.img); });
  var body = items.length ? '<div class="gallery">' + items.map(function (i) { return '<figure><img loading="lazy" src="' + esc(src(i.img)) + '" alt="' + esc(i.caption || '') + '">' + (i.caption ? '<figcaption>' + esc(i.caption) + '</figcaption>' : '') + '</figure>'; }).join('') + '</div>' : '<p class="empty-note">अभी कोई तस्वीर नहीं जोड़ी गई है। एडमिन पैनल के “गैलरी” भाग से तस्वीरें जोड़ें।</p>';
  return sec('gallery', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(g) + body + '</div>');
}
function tContact(c, alt, title) {
  var S = C.site || {};
  var card = '<div class="panel contact-card">' + (c.eyebrow ? '<p class="eyebrow">' + esc(c.eyebrow) + '</p>' : '') + '<h2>' + esc(c.heading) + '</h2><dl>' +
    (c.name ? '<div><dt>' + esc(c.roleLabel) + '</dt><dd>' + esc(c.name) + '</dd></div>' : '') +
    '<div><dt>' + esc(c.phoneLabel) + '</dt><dd><span class="num" id="phone">' + esc(S.phone) + '</span></dd></div>' +
    (c.address ? '<div><dt>पता</dt><dd>' + rich(c.address) + '</dd></div>' : '') +
    (c.hours ? '<div><dt>परामर्श का समय</dt><dd>' + rich(c.hours) + '</dd></div>' : '') + '</dl>' +
    (c.intro ? '<p style="margin-top:18px;color:var(--ink-2)">' + rich(c.intro) + '</p>' : '') +
    '<div class="actions"><a class="btn btn-primary" href="https://wa.me/' + esc(waNum()) + '" target="_blank" rel="noopener">WhatsApp पर बात करें</a><button class="btn btn-ghost" type="button" data-copy="phone">नंबर कॉपी करें</button><a class="btn btn-ghost" href="tel:+' + esc(waNum()) + '">कॉल करें</a></div></div>';
  var form = '<form class="panel" id="cForm" novalidate><h3>' + esc(c.formTitle) + '</h3><p class="hint">' + esc(c.formHint) + '</p><div class="form-grid">' +
    '<div class="field full"><label for="c-service">सेवा</label><select id="c-service">' + (c.services || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="c-name">नाम</label><input id="c-name" type="text" autocomplete="name"></div>' +
    '<div class="field"><label for="c-city">शहर</label><input id="c-city" type="text" autocomplete="address-level2"></div>' +
    '<div class="field full"><label for="c-msg">आपका संदेश</label><textarea id="c-msg" placeholder="अपनी आवश्यकता संक्षेप में लिखें"></textarea></div></div>' +
    '<p class="err" id="c-err" role="alert"></p><div class="form-actions"><button class="btn btn-primary" type="submit">संदेश तैयार करें</button></div>' + outbox('c') + '</form>';
  return sec('contact', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap split">' + card + form + '</div>');
}
function tCustom(x, id, alt, title) {
  var img = src(x.image);
  var copy = '<div class="custom-copy">' + head(x) + paras(x.text) + (x.btnText ? '<div class="actions"><a class="btn btn-primary"' + lk(x.btnHref) + '>' + esc(x.btnText) + '</a></div>' : '') + '</div>';
  var inner = '<div class="wrap"><div class="custom-grid' + (img ? '' : ' solo') + '">' + copy + (img ? '<img src="' + esc(img) + '" alt="' + esc(x.heading || '') + '" loading="lazy">' : '') + '</div></div>';
  return sec(id, title, 'band' + (alt ? ' alt' : ''), inner);
}
/* ---------- पंचांग, मुहूर्त, राशिफल, व्रत-त्यौहार ---------- */
function tPanchang(k, alt, title) {
  var cities = (k.cities || []).map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + '</option>'; }).join('');
  var info = (k.info || []).map(function (x, i) {
    return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(x.title) + '</summary><div class="body">' + paras(x.text) + '</div></details>';
  }).join('');
  var inner = '<div class="wrap">' + head(k) +
    '<div class="pc-bar">' +
      '<button class="icon-btn" type="button" id="pcPrev" aria-label="पिछला दिन">‹</button>' +
      '<div class="field"><label for="pcDate">दिनांक</label><input id="pcDate" type="date"></div>' +
      '<button class="icon-btn" type="button" id="pcNext" aria-label="अगला दिन">›</button>' +
      '<div class="field"><label for="pcCity">नगर</label><select id="pcCity">' + cities + '</select></div>' +
      '<button class="btn btn-ghost btn-small" type="button" id="pcToday">आज</button>' +
      '<button class="btn btn-ghost btn-small" type="button" id="pcHere">मेरा स्थान</button>' +
    '</div>' +
    '<div class="pc-grid"><div class="panel pc-main" id="pcMain" aria-live="polite"></div><div class="panel pc-side" id="pcSide"></div></div>' +
    '<div class="actions pc-share">' +
      '<button class="btn btn-primary" type="button" id="pcShare">पंचांग की तस्वीर बनाएँ</button>' +
      (k.shareNote ? '<span class="hint">' + esc(k.shareNote) + '</span>' : '') +
    '</div>' +
    '<div class="pc-img" id="pcImgBox" hidden><img id="pcImg" alt="आज के पंचांग की तस्वीर"><div class="actions">' +
      '<a class="btn btn-primary" id="pcDl" download="panchang.png" href="#">तस्वीर डाउनलोड करें</a>' +
      '<button class="btn btn-ghost" type="button" id="pcSend">WhatsApp पर भेजें</button>' +
      '<button class="btn btn-ghost" type="button" id="pcImgClose">बंद करें</button></div></div>' +
    (info ? '<h3 class="pc-info-h">पंचांग को समझें</h3><div class="rows pc-info">' + info + '</div>' : '') +
    (k.fine ? '<p class="fine">' + rich(k.fine) + '</p>' : '') + '</div>';
  return sec('panchang', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tMuhurat(k, alt, title) {
  var inner = '<div class="wrap">' + head(k) +
    '<p class="pc-for" id="muFor"></p>' +
    '<div class="kaal-grid" id="muKaal"></div>' +
    '<h3 class="mu-h">दिन के चौघड़िया</h3><div class="cho-grid" id="muChoD"></div>' +
    '<h3 class="mu-h">रात्रि के चौघड़िया</h3><div class="cho-grid" id="muChoN"></div>' +
    '<div class="tabs" role="tablist" id="muTabs" aria-label="और सारणियाँ"></div>' +
    '<div class="panel tabpanel" id="muPanel" role="tabpanel" aria-live="polite"></div>' +
    (k.fine ? '<p class="fine">' + rich(k.fine) + '</p>' : '') +
    (k.ctaText ? '<div class="actions" style="margin-top:20px">' + goBtn('btn-primary', k.ctaText, k.ctaService, k.ctaNote) + '</div>' : '') +
    '</div>';
  return sec('muhurat', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tRashifal(k, alt, title) {
  var inner = '<div class="wrap">' + head(k) +
    '<p class="pc-for" id="rfFor"></p><div class="rf-grid" id="rfGrid"></div>' +
    (k.fine ? '<p class="fine">' + rich(k.fine) + '</p>' : '') +
    (k.ctaText ? '<div class="actions" style="margin-top:20px">' + goBtn('btn-primary', k.ctaText, k.ctaService, k.ctaNote) + '</div>' : '') +
    '</div>';
  return sec('rashifal', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tVrat(k, alt, title) {
  var inner = '<div class="wrap">' + head(k) +
    '<div class="tabs" id="vrFilter" aria-label="किस प्रकार के पर्व"></div>' +
    '<div class="vr-list" id="vrList" aria-live="polite"></div>' +
    (k.fine ? '<p class="fine">' + rich(k.fine) + '</p>' : '') +
    (k.ctaText ? '<div class="actions" style="margin-top:20px">' + goBtn('btn-primary', k.ctaText, k.ctaService, k.ctaNote) + '</div>' : '') +
    '</div>';
  return sec('vrat', title, 'band' + (alt ? ' alt' : ''), inner);
}
function tVratkatha(k, alt, title) {
  var rows = (k.items || []).map(function (x, i) {
    return '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + esc(x.title) + '</span>' +
      (x.when ? '<em class="vk-when">' + esc(x.when) + '</em>' : '') + '</summary><div class="body">' + paras(x.text) +
      (k.askText ? '<div class="actions" style="margin-top:16px">' + goBtn('btn-ghost btn-small', k.askText, k.service, x.title) + '</div>' : '') +
      '</div></details>';
  }).join('');
  return sec('vratkatha', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(k) + '<div class="rows vk-rows">' + rows + '</div></div>');
}
function ytId(s) {
  s = String(s || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}
function tVideos(k, alt, title) {
  var items = (k.items || []).map(function (x) { return { id: ytId(x.url || x.id), t: x.title, n: x.note }; }).filter(function (x) { return x.id; });
  var body = items.length
    ? '<div class="vd-grid">' + items.map(function (x) {
        return '<article class="vd" data-yt="' + esc(x.id) + '">' +
          '<button class="vd-play" type="button" aria-label="वीडियो चलाएँ: ' + esc(x.t || '') + '">' +
          '<img loading="lazy" src="https://i.ytimg.com/vi/' + esc(x.id) + '/hqdefault.jpg" alt=""><span class="vd-btn" aria-hidden="true"></span></button>' +
          '<div class="vd-txt"><h3>' + esc(x.t || 'वीडियो') + '</h3>' + (x.n ? '<p>' + rich(x.n) + '</p>' : '') + '</div></article>';
      }).join('') + '</div>'
    : '<p class="empty-note">अभी कोई वीडियो नहीं जोड़ा गया है। एडमिन पैनल के “वीडियो” भाग से YouTube का लिंक जोड़ें।</p>';
  var cta = /^https?:\/\//i.test(k.channelUrl || '') ? '<div class="actions" style="margin-top:24px"><a class="btn btn-primary"' + lk(k.channelUrl) + '>' + esc(k.channelText || 'चैनल देखें') + '</a></div>' : '';
  return sec('videos', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(k) + body + cta + '</div>');
}
var SOCIAL_ICON = {
  'youtube': '<path d="M23 12s0-3.5-.45-5.17a2.9 2.9 0 0 0-2.04-2.05C18.84 4.33 12 4.33 12 4.33s-6.84 0-8.51.45A2.9 2.9 0 0 0 1.45 6.83C1 8.5 1 12 1 12s0 3.5.45 5.17a2.9 2.9 0 0 0 2.04 2.05c1.67.45 8.51.45 8.51.45s6.84 0 8.51-.45a2.9 2.9 0 0 0 2.04-2.05C23 15.5 23 12 23 12z"/><path d="M9.75 15.5v-7l6 3.5z" fill="var(--surface)"/>',
  'facebook': '<path d="M14 9h3V5.5h-3c-2 0-3.5 1.6-3.5 3.6V11H8v3.5h2.5V22H14v-7.5h2.7l.3-3.5H14V9.4c0-.3.2-.4.4-.4z"/>',
  'instagram': '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.3"/>',
  'whatsapp': '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  'telegram': '<path d="M21.5 4.3 2.9 11.4c-.9.3-.9 1.5.1 1.7l4.7 1.3 1.8 5.4c.3.8 1.3 1 1.9.3l2.5-2.6 4.6 3.4c.7.5 1.7.1 1.9-.8l3-14c.2-1-.8-1.8-1.9-1.4z"/>',
  'twitter': '<path d="M3 3h4.6l4.6 6.2L17.7 3H21l-7.1 8.1L21.4 21h-4.6l-4.9-6.6L6.1 21H3l7.5-8.6z"/>',
  'default': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18A14 14 0 0 1 12 3z" fill="none" stroke="currentColor" stroke-width="1.6"/>'
};
function socialIcon(label, url) {
  var s = (label + ' ' + url).toLowerCase(), k;
  for (k in SOCIAL_ICON) if (k !== 'default' && s.indexOf(k) >= 0) return SOCIAL_ICON[k];
  if (s.indexOf('wa.me') >= 0) return SOCIAL_ICON.whatsapp;
  if (s.indexOf('fb.com') >= 0) return SOCIAL_ICON.facebook;
  if (s.indexOf('t.me') >= 0) return SOCIAL_ICON.telegram;
  if (s.indexOf(' x') >= 0 || s.indexOf('x.com') >= 0) return SOCIAL_ICON.twitter;
  return SOCIAL_ICON['default'];
}
function tSocial(k, alt, title) {
  var items = (k.items || []).filter(function (x) { return /^https?:\/\//i.test(x.url || ''); });
  var body = items.length
    ? '<div class="so-grid">' + items.map(function (x) {
        return '<a class="so"' + lk(x.url) + '><span class="so-ic"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + socialIcon(x.label || '', x.url) + '</svg></span>' +
          '<span class="so-tx"><b>' + esc(x.label || 'लिंक') + '</b>' + (x.handle ? '<small>' + esc(x.handle) + '</small>' : '') + '</span></a>';
      }).join('') + '</div>'
    : '<p class="empty-note">अभी कोई सोशल मीडिया लिंक नहीं जोड़ा गया है। एडमिन पैनल के “सोशल मीडिया” भाग से जोड़ें।</p>';
  return sec('socialSec', title, 'band' + (alt ? ' alt' : ''), '<div class="wrap">' + head(k) + body + '</div>');
}

function tHeader(first) {
  return '<header class="top"><div class="wrap"><a class="brand" href="#' + esc(first) + '" aria-label="' + esc(C.site.brandName) + ', मुख्य पृष्ठ">' +
    '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent)" stroke-width="2"/><path d="M20 7 33 29H7z" fill="none" stroke="var(--accent)" stroke-width="1.8"/><path d="M20 33 7 11h26z" fill="none" stroke="var(--accent-2)" stroke-width="1.8"/><circle cx="20" cy="20" r="2.4" fill="var(--accent)"/></svg>' +
    '<b>' + esc(C.site.brandName) + '</b></a><span class="cur" id="cur" aria-hidden="true"></span>' +
    '<button class="icon-btn" id="themeBtn" type="button" aria-label="थीम बदलें (दिन / रात)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg></button>' +
    '<button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu"><i aria-hidden="true"></i>मेन्यू</button></div><div class="progress" id="prog"></div></header>';
}
function tMenu(items) {
  return '<nav class="menu" id="menu" aria-label="मुख्य मेन्यू" inert><div class="wrap"><div class="menu-head"><span>॥ ' + esc(C.site.brandName) + ' ॥</span>' +
    '<button class="icon-btn" id="menuClose" type="button" aria-label="मेन्यू बंद करें"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>' +
    '<ul class="menu-list" id="menuList">' + items.map(function (m) { return '<li><a href="#' + esc(m.id) + '" data-id="' + esc(m.id) + '"><b>' + esc(m.title) + '</b><small>' + esc(m.sub) + '</small></a></li>'; }).join('') + '</ul>' +
    '<p class="menu-foot">' + esc(C.site.footerJai) + '</p></div></nav>';
}
function tFooter() {
  var S = C.site, so = S.social || {}, labels = { youtube: 'YouTube', facebook: 'Facebook', instagram: 'Instagram', other: 'अन्य लिंक' };
  var links = Object.keys(labels).filter(function (k) { return /^https?:\/\//i.test(so[k] || ''); }).map(function (k) { return '<a class="chip"' + lk(so[k]) + '>' + labels[k] + '</a>'; }).join('');
  return '<footer><div class="wrap">' + (links ? '<div class="social">' + links + '</div>' : '') + '<p class="jai">' + esc(S.footerJai) + '</p><p>' + esc(S.footerLine) + '</p>' + (S.disclaimer ? '<p>' + esc(S.disclaimer) + '</p>' : '') + '</div></footer>' +
    '<a class="fab" href="https://wa.me/' + esc(waNum()) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>WhatsApp</a><div class="toast" id="toast" role="status" aria-live="polite"></div>';
}
function tAnnounce() {
  var a = (C.site && C.site.announcement) || {};
  if (!a.enabled || !a.text) return '';
  return '<div class="announce">' + (a.link ? '<a' + lk(a.link) + '>' + esc(a.text) + '</a>' : esc(a.text)) + '</div>';
}

/* ---------- render ---------- */
function render(content, isPreview) {
  C = content || {};
  C.site = C.site || {}; C.home = C.home || {}; C.custom = C.custom || {};
  cleanups.forEach(function (f) { try { f(); } catch (e) { } });
  cleanups = [];
  var sy = window.scrollY;
  applyTheme(C.theme);
  document.title = C.site.metaTitle || C.site.brandName || 'वेबसाइट';
  var md = $('meta[name="description"]'); if (md) md.setAttribute('content', C.site.metaDescription || '');

  var items = (C.menu || []).filter(function (m) { return m.visible !== false && /^[\w-]+$/.test(m.id || ''); });
  var builders = {
    about: tAbout, kundali: tKundali, milan: tMilan, prem: tPrem, career: tCareer, dosh: tDosh,
    puja: tPuja, katha: tKatha, gallery: tGallery, contact: tContact,
    panchang: tPanchang, muhurat: tMuhurat, rashifal: tRashifal, vrat: tVrat,
    vratkatha: tVratkatha, videos: tVideos, socialSec: tSocial
  };
  var html = tAnnounce() + tHeader(items.length ? items[0].id : 'home') + tMenu(items) + '<main>';
  var k = 0;
  items.forEach(function (m) {
    if (m.id === 'home') { html += tHome(C.home, C.site, m.title); return; }
    var alt = (k % 2 === 0); k++;
    if (builders[m.id]) html += builders[m.id](C[m.id] || {}, alt, m.title);
    else if (/^x-/.test(m.id) && C.custom[m.id]) html += tCustom(C.custom[m.id], m.id, alt, m.title);
  });
  html += '</main>' + tFooter();
  $('#app').innerHTML = html;

  initChrome(items);
  initToday(); initStars(); initWheel(); initYantra();
  initForms(); initBhava(); initMilan(); initDosh(); initPuja();
  initPanchang(); initMuhuratTabs(); initVrat(); initVideos();
  refreshPanchang();
  firstRender = false;
  if (isPreview) window.scrollTo(0, sy);
}

/* ---------- interactions ---------- */
function onScroll() {
  var prog = $('#prog'); if (!prog) return;
  var h = document.documentElement.scrollHeight - window.innerHeight;
  prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
}
var scrollTick = false;
function bindGlobal() {
  if (globalBound) return; globalBound = true;
  window.addEventListener('scroll', function () { if (scrollTick) return; scrollTick = true; requestAnimationFrame(function () { onScroll(); scrollTick = false; }); }, { passive: true });
  document.addEventListener('keydown', function (e) { var m = $('#menu'); if (e.key === 'Escape' && m && m.classList.contains('open')) closeMenu(); });
  document.addEventListener('click', function (e) {
    var cb = e.target.closest('[data-copy]');
    if (cb) {
      var src0 = document.getElementById(cb.dataset.copy); if (!src0) return;
      var txt = src0.tagName === 'TEXTAREA' ? src0.value : src0.textContent;
      var fallback = function () {
        if (src0.tagName === 'TEXTAREA') { src0.focus(); src0.select(); } else { var r = document.createRange(); r.selectNodeContents(src0); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        toast('चुन लिया गया है, कॉपी करने के लिए दबाकर रखें');
      };
      try { navigator.clipboard.writeText(txt).then(function () { toast('कॉपी हो गया'); }, fallback); } catch (err) { fallback(); }
      return;
    }
    var go = e.target.closest('[data-go]');
    if (go) goContact(go.dataset.go, go.dataset.note);
  });
  if (window.parent !== window) {
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data) return;
      if (e.data.type === 'sj-preview') render(e.data.content, true);
      if (e.data.type === 'sj-goto') { var t = document.getElementById(e.data.id); if (t) t.scrollIntoView(); }
    });
    try { window.parent.postMessage({ type: 'sj-ready' }, '*'); } catch (e) { }
  }
}
function openMenu() {
  var menu = $('#menu'), btn = $('#menuBtn');
  menu.inert = false; menu.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
  setTimeout(function () { var f = $('#menuList a'); if (f) f.focus(); }, 60);
}
function closeMenu(restore) {
  var menu = $('#menu'), btn = $('#menuBtn'); if (!menu) return;
  menu.classList.remove('open'); menu.inert = true; btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  if (restore !== false) btn.focus();
}
function initChrome(items) {
  bindGlobal();
  $('#menuBtn').addEventListener('click', openMenu);
  $('#menuClose').addEventListener('click', function () { closeMenu(); });
  $$('#menuList a').forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
  $('#themeBtn').addEventListener('click', function () { document.documentElement.setAttribute('data-theme', isDark() ? 'light' : 'dark'); });
  onScroll();
  var cur = $('#cur');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        $$('#menuList a').forEach(function (a) { if (a.dataset.id === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        cur.textContent = id === 'home' ? '' : e.target.dataset.title;
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main > section').forEach(function (s) { io.observe(s); });
    cleanups.push(function () { io.disconnect(); });
  }
}
function goContact(service, note) {
  var sel = $('#c-service'), m = $('#c-msg');
  if (!sel) { window.open(waLink((C.site.waGreeting || '') + '\nआचार्य जी, नमस्ते।' + (note ? '\nमुझे ' + note + ' के बारे में जानकारी चाहिए।' : '')), '_blank', 'noopener'); return; }
  for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].text === service) { sel.selectedIndex = i; break; } }
  if (note && m.value.indexOf(note) < 0) m.value = (m.value ? m.value + '\n' : '') + 'मुझे ' + note + ' के बारे में जानकारी चाहिए।';
  $('#contact').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  setTimeout(function () { var n = $('#c-name'); if (n) n.focus({ preventScroll: true }); }, 500);
}

/* today strip */
function initToday() {
  var t = $('#today'); if (!t) return;
  var d = new Date();
  var days = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  var lords = ['सूर्य', 'चंद्र', 'मंगल', 'बुध', 'गुरु (बृहस्पति)', 'शुक्र', 'शनि'];
  var months = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  t.innerHTML = '<span>आज</span> <b>' + days[d.getDay()] + '</b><span>' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + '</span><span>वार के स्वामी ग्रह: <b>' + lords[d.getDay()] + '</b></span>';
}

/* star canvas */
function initStars() {
  var cv = $('#stars'); if (!cv) return;
  var ctx = cv.getContext('2d'), stars = [], W = 0, H = 0, vis = true, n = 0, col = '#fff', op = 1, alive = true;
  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = []; var count = Math.round(W * H / 9000);
    for (var i = 0; i < count; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6.28, s: Math.random() * 1.4 + .4 });
  }
  function draw(t) {
    if (n++ % 20 === 0) { var cs = getComputedStyle(document.documentElement); col = cs.getPropertyValue('--star').trim() || '#fff'; op = parseFloat(cs.getPropertyValue('--star-op')) || 1; }
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = col;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = reduce ? .7 : .35 + .65 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
      ctx.globalAlpha = a * op; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
  }
  function loop(t) { if (!alive) return; if (vis) draw(t); if (!reduce) requestAnimationFrame(loop); }
  size();
  var ro = null, io = null;
  if (window.ResizeObserver) { ro = new ResizeObserver(function () { size(); if (reduce) draw(0); }); ro.observe(cv); }
  if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }); io.observe(cv); }
  if (reduce) draw(0); else requestAnimationFrame(loop);
  cleanups.push(function () { alive = false; if (ro) ro.disconnect(); if (io) io.disconnect(); });
}

/* rashi wheel */
function initWheel() {
  var svg = $('#wheel'); if (!svg) return;
  var Cc = 270;
  var spin = el('g', { 'class': 'spin' }, svg);
  el('circle', { cx: Cc, cy: Cc, r: 258, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1 }, spin);
  var dots = el('g', { 'class': 'ring-dots' }, spin);
  for (var i = 0; i < 48; i++) { var p = polar(Cc, Cc, 258, i * 7.5); el('circle', { cx: p[0], cy: p[1], r: i % 4 === 0 ? 3.2 : 1.5 }, dots); }
  function sector(r1, r2, a1, a2) {
    var A = polar(Cc, Cc, r2, a1), B = polar(Cc, Cc, r2, a2), Cn = polar(Cc, Cc, r1, a2), D = polar(Cc, Cc, r1, a1);
    return 'M' + A[0] + ' ' + A[1] + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + B[0] + ' ' + B[1] + 'L' + Cn[0] + ' ' + Cn[1] + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + D[0] + ' ' + D[1] + 'Z';
  }
  var segs = [];
  RASHI.forEach(function (r, i) {
    var g = el('g', { 'class': 'seg', tabindex: 0, role: 'button', 'aria-label': r.n + ' राशि' }, svg);
    el('path', { d: sector(168, 238, i * 30 + .6, i * 30 + 29.4) }, g);
    var m = polar(Cc, Cc, 203, i * 30 + 15), t = el('text', { x: m[0], y: m[1] }, g); t.textContent = r.n;
    g.addEventListener('click', function () { select(i); });
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
    segs.push(g);
  });
  [78, 108, 138].forEach(function (r) { el('circle', { 'class': 'orbit', cx: Cc, cy: Cc, r: r }, svg); });
  el('circle', { 'class': 'core', cx: Cc, cy: Cc, r: 46 }, svg);
  var om = el('text', { 'class': 'core-t', x: Cc, y: Cc + 2 }, svg); om.textContent = 'ॐ';
  var pls = GRAHA.map(function (g) { var pg = el('g', { 'class': 'pl' }, svg); el('circle', { r: 14, fill: g.c }, pg); var t = el('text', { x: 0, y: 1 }, pg); t.textContent = g.k; return pg; });
  function place(t) { GRAHA.forEach(function (g, i) { var a = g.p + g.s * t, q = polar(Cc, Cc, g.r, a); pls[i].setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')'); }); }
  var vis = true, alive = true, io = null;
  function loop(ts) { if (!alive) return; if (vis) place(ts / 1000); requestAnimationFrame(loop); }
  place(0);
  if (!reduce) { requestAnimationFrame(loop); if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }); io.observe(svg); } }
  cleanups.push(function () { alive = false; if (io) io.disconnect(); });
  var card = $('#rashiCard');
  function select(i) {
    segs.forEach(function (s, j) { s.classList.toggle('on', i === j); });
    var r = RASHI[i];
    card.innerHTML = '<b></b><span></span><span></span>';
    card.children[0].textContent = r.n;
    card.children[1].textContent = 'स्वामी ग्रह: ' + r.sw + ' · तत्व: ' + r.el;
    card.children[2].textContent = 'राशि चिह्न: ' + r.sym + ' · चक्र में ' + (i + 1) + ' नंबर की राशि';
  }
  select(0);
  var lg = $('#legend');
  GRAHA.forEach(function (g) { var li = document.createElement('li'); li.innerHTML = '<i style="background:' + g.c + '"></i><span></span>'; li.lastChild.textContent = g.n; lg.appendChild(li); });
}

/* about medallion */
function initYantra() {
  var svg = $('#medal'); if (!svg) return;
  var Cc = 200;
  el('circle', { cx: Cc, cy: Cc, r: 188, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 2 }, svg);
  for (var i = 0; i < 12; i++) { var g = el('g', { transform: 'rotate(' + (i * 30) + ' ' + Cc + ' ' + Cc + ')' }, svg); el('ellipse', { cx: Cc, cy: Cc - 150, rx: 20, ry: 34, fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 1.6 }, g); }
  el('circle', { cx: Cc, cy: Cc, r: 112, fill: 'var(--bg)', stroke: 'var(--line)', 'stroke-width': 1.5 }, svg);
  el('path', { d: 'M200 98 292 258H108z', fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
  el('path', { d: 'M200 302 108 142h184z', fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
  el('circle', { cx: Cc, cy: Cc, r: 42, fill: 'var(--surface)', stroke: 'var(--accent)', 'stroke-width': 1.6 }, svg);
  var t = el('text', { x: Cc, y: Cc + 3, 'font-size': 46 }, svg); t.textContent = 'ॐ';
}

/* forms */
function showOut(prefix, text) {
  $('#' + prefix + '-out-text').value = text;
  $('#' + prefix + '-out-link').href = waLink(text);
  var box = $('#' + prefix + '-out'); box.hidden = false;
  box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}
function fmtDate(v) { if (!v) return ''; var p = v.split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : v; }
function greet() { return (C.site.waGreeting ? C.site.waGreeting + '\n' : '') + 'आचार्य जी, नमस्ते।'; }
function initForms() {
  var kf = $('#kForm');
  if (kf) kf.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#k-name').value.trim(), dob = $('#k-dob').value, tob = $('#k-tob').value, pob = $('#k-pob').value.trim(), q = $('#k-q').value.trim(), err = $('#k-err');
    if (!name || !dob || !pob) { err.textContent = 'कृपया नाम, जन्मतिथि और जन्म स्थान भरें।'; return; }
    err.textContent = '';
    showOut('k', greet() + ' मुझे ऑनलाइन ज्योतिष परामर्श चाहिए।\n\nनाम: ' + name + '\nजन्मतिथि: ' + fmtDate(dob) + '\nजन्म का समय: ' + (tob || 'ठीक समय ज्ञात नहीं') + '\nजन्म स्थान: ' + pob + '\nविषय: ' + $('#k-topic').value + (q ? '\nप्रश्न: ' + q : ''));
  });
  var cf = $('#cForm');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#c-name').value.trim(), city = $('#c-city').value.trim(), m = $('#c-msg').value.trim(), err = $('#c-err');
    if (!name) { err.textContent = 'कृपया अपना नाम लिखें।'; return; }
    err.textContent = '';
    showOut('c', greet() + '\n\nनाम: ' + name + (city ? '\nशहर: ' + city : '') + '\nसेवा: ' + $('#c-service').value + (m ? '\nसंदेश: ' + m : ''));
  });
}

/* bhava chart */
function initBhava() {
  var svg = $('#chart'); if (!svg) return;
  var POLY = { 1: '150,0 225,75 150,150 75,75', 2: '0,0 150,0 75,75', 3: '0,0 75,75 0,150', 4: '0,150 75,75 150,150 75,225', 5: '0,150 75,225 0,300', 6: '0,300 75,225 150,300', 7: '150,300 75,225 150,150 225,225', 8: '150,300 225,225 300,300', 9: '300,300 225,225 300,150', 10: '300,150 225,225 150,150 225,75', 11: '300,150 225,75 300,0', 12: '300,0 225,75 150,0' };
  var POS = { 1: [150, 60], 2: [75, 22], 3: [22, 75], 4: [66, 146], 5: [22, 222], 6: [75, 268], 7: [150, 232], 8: [225, 268], 9: [278, 222], 10: [234, 146], 11: [278, 75], 12: [225, 22] };
  var SAMPLE = { 1: ['मं'], 4: ['चं', 'बु'], 5: ['रा'], 7: ['शु'], 8: ['श'], 9: ['गु'], 10: ['सू'], 11: ['के'] };
  var sel = $('#lagna');
  RASHI.forEach(function (r, i) { var o = document.createElement('option'); o.value = i + 1; o.textContent = r.n + ' लग्न'; sel.appendChild(o); });
  sel.value = '1';
  el('rect', { 'class': 'frame', x: 0, y: 0, width: 300, height: 300 }, svg);
  var hs = [], rns = [], h;
  for (h = 1; h <= 12; h++) {
    var p = el('polygon', { 'class': 'hs', points: POLY[h], tabindex: 0, role: 'button', 'aria-label': 'भाव ' + h + ', ' + BH[h - 1][0] }, svg);
    (function (n, poly) {
      poly.addEventListener('click', function () { pick(n); });
      poly.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n); } });
    })(h, p);
    hs.push(p);
  }
  for (h = 1; h <= 12; h++) {
    var ps = POS[h], rn = el('text', { 'class': 'rn', x: ps[0], y: ps[1] }, svg); rns.push(rn);
    var pl = SAMPLE[h];
    if (pl) { var pt = el('text', { 'class': 'pn', x: ps[0], y: ps[1] + (h === 1 || h === 7 ? 20 : 18) }, svg); pt.textContent = pl.join(' '); }
  }
  function paint() { var l = parseInt(sel.value, 10); rns.forEach(function (t, i) { t.textContent = ((l - 1 + i) % 12) + 1; }); }
  function pick(n) {
    hs.forEach(function (q, i) { q.classList.toggle('on', i === n - 1); });
    $('#bh-title').textContent = n + '. ' + BH[n - 1][0];
    var l = parseInt(sel.value, 10), r = RASHI[(l - 1 + n - 1) % 12];
    $('#bh-text').textContent = BH[n - 1][1] + ' इस उदाहरण में इस भाव में ' + r.n + ' राशि है (स्वामी ' + r.sw + ').';
  }
  sel.addEventListener('change', function () { paint(); var cur = hs.findIndex(function (q) { return q.classList.contains('on'); }); pick(cur < 0 ? 1 : cur + 1); });
  paint(); pick(1);
}

/* milan */
function initMilan() {
  if (!$('#milanPanel')) return;
  var GT = { D: { D: 6, M: 6, R: 1 }, M: { D: 5, M: 6, R: 0 }, R: { D: 1, M: 0, R: 6 } };
  var GN = { D: 'देव', M: 'मनुष्य', R: 'राक्षस' }, ND = { A: 'आदि', M: 'मध्य', N: 'अंत्य' };
  ['b-nk', 'g-nk'].forEach(function (id) { var s = $('#' + id); NK.forEach(function (n, i) { var o = document.createElement('option'); o.value = i; o.textContent = n[0]; s.appendChild(o); }); });
  ['b-rs', 'g-rs'].forEach(function (id) { var s = $('#' + id); RASHI.forEach(function (r, i) { var o = document.createElement('option'); o.value = i; o.textContent = r.n; s.appendChild(o); }); });
  $('#b-nk').value = 3; $('#b-rs').value = 1; $('#g-nk').value = 13; $('#g-rs').value = 5;
  function fmt(v) { return String(v).replace('.5', '½'); }
  function calc() {
    var bn = +$('#b-nk').value, gn = +$('#g-nk').value, br = +$('#b-rs').value, gr = +$('#g-rs').value;
    var nadi = NK[bn][2] === NK[gn][2] ? 0 : 8;
    var d = ((gr - br + 12) % 12) + 1, bad = [2, 12, 5, 9, 6, 8].indexOf(d) >= 0, bhk = bad ? 0 : 7;
    var gana = GT[NK[bn][1]][NK[gn][1]];
    var t1 = (((bn - gn + 27) % 27) + 1) % 9, t2 = (((gn - bn + 27) % 27) + 1) % 9;
    var b1 = [3, 5, 7].indexOf(t1) >= 0, b2 = [3, 5, 7].indexOf(t2) >= 0;
    var tara = (!b1 && !b2) ? 3 : (b1 && b2) ? 0 : 1.5;
    var total = nadi + bhk + gana + tara;
    var rows = [['नाड़ी', nadi, 8], ['भकूट', bhk, 7], ['गण', gana, 6], ['तारा', tara, 3]];
    $('#gTxt').textContent = fmt(total);
    $('#gFg').style.strokeDashoffset = 339.29 * (1 - total / 24);
    var vt, vx;
    if (total >= 18) { vt = 'शुभ संकेत'; vx = 'इन चार कूटों में अच्छा तालमेल दिखता है।'; }
    else if (total >= 12) { vt = 'मध्यम तालमेल'; vx = 'कुछ बिंदुओं पर आगे विचार करना उचित रहेगा।'; }
    else { vt = 'विस्तृत विचार आवश्यक'; vx = 'इन कूटों में अंक कम हैं, पूर्ण कुंडली देखकर ही निर्णय लें।'; }
    $('#vTitle').textContent = vt + ' · ' + fmt(total) + '/24'; $('#vText').textContent = vx;
    var ul = $('#kuts'); ul.innerHTML = '';
    rows.forEach(function (r) {
      var li = document.createElement('li'); li.innerHTML = '<span></span><div class="bar"><i></i></div><em></em>';
      li.children[0].textContent = r[0]; li.children[2].textContent = fmt(r[1]) + ' / ' + r[2]; ul.appendChild(li);
      var bar = li.querySelector('i'); requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = (r[1] / r[2] * 100) + '%'; }); });
    });
    var fl = $('#flags'); fl.innerHTML = '';
    function flag(t) { var p = document.createElement('p'); p.textContent = t; fl.appendChild(p); }
    if (nadi === 0) flag('दोनों की नाड़ी ' + ND[NK[bn][2]] + ' है, इसलिए नाड़ी दोष की स्थिति बनती है। परिहार के नियम पूरी कुंडली देखकर तय होते हैं।');
    if (bhk === 0) flag('चंद्र राशियों के बीच भकूट दोष की स्थिति बनती है। इसका विचार भी दोनों कुंडलियों के अनुसार होता है।');
    flag('गण: वर ' + GN[NK[bn][1]] + ', वधू ' + GN[NK[gn][1]] + '।');
    $('#milanRes').hidden = false;
  }
  $('#milanGo').addEventListener('click', calc);
}

/* dosh tabs */
function initDosh() {
  var tabs = $('#doshTabs'), panel = $('#doshPanel'); if (!tabs) return;
  var D = (C.dosh && C.dosh.items) || [], btns = [];
  D.forEach(function (d, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'tab'); b.textContent = d.title;
    b.addEventListener('click', function () { show(i); });
    b.addEventListener('keydown', function (e) { var k = e.key, n = null; if (k === 'ArrowRight') n = (i + 1) % D.length; if (k === 'ArrowLeft') n = (i + D.length - 1) % D.length; if (n !== null) { e.preventDefault(); show(n); btns[n].focus(); } });
    tabs.appendChild(b); btns.push(b);
  });
  function show(i) {
    btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
    var d = D[i]; if (!d) { panel.innerHTML = ''; return; }
    var fine = (C.dosh && C.dosh.fine) || '';
    panel.innerHTML = '<h3></h3><div class="cols"><div><h4>क्या है</h4><p></p></div><div><h4>विचार का आधार</h4><p></p></div><div><h4>सामान्य शास्त्रोक्त मार्ग</h4><p></p></div></div>' + (fine ? '<p class="fine"></p>' : '') + '<div class="actions"></div>';
    panel.querySelector('h3').textContent = d.title;
    var ps = panel.querySelectorAll('.cols p'); ps[0].innerHTML = rich(d.what); ps[1].innerHTML = rich(d.basis); ps[2].innerHTML = rich(d.path);
    if (fine) panel.querySelector('.fine').textContent = fine;
    if (C.dosh.ctaText) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-primary btn-small'; b.textContent = C.dosh.ctaText;
      b.addEventListener('click', function () { goContact(C.dosh.ctaService, d.title + ' के विचार'); });
      panel.querySelector('.actions').appendChild(b);
    }
  }
  if (D.length) show(0);
}

/* puja */
function initPuja() {
  var chips = $('#pujaChips'), grid = $('#pujaGrid'); if (!chips) return;
  var P = (C.puja && C.puja.items) || [];
  var cats = ['सभी']; P.forEach(function (p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  var cbtn = [];
  if (cats.length > 2) cats.forEach(function (c, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', function () { cbtn.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); $$('.puja', grid).forEach(function (card) { card.hidden = !(c === 'सभी' || card.dataset.cat === c); }); });
    chips.appendChild(b); cbtn.push(b);
  }); else chips.hidden = true;
  P.forEach(function (p) {
    var a = document.createElement('article'); a.className = 'puja'; a.dataset.cat = p.cat || '';
    a.innerHTML = '<small></small><h3></h3><p></p><div><button class="btn btn-ghost btn-small" type="button"></button></div>';
    a.querySelector('small').textContent = p.cat || ''; a.querySelector('h3').textContent = p.title; a.querySelector('p').innerHTML = rich(p.text);
    var b = a.querySelector('button'); b.textContent = (C.puja && C.puja.askText) || 'पूछें';
    b.addEventListener('click', function () { goContact(C.puja.service, p.title); });
    grid.appendChild(a);
  });
}

/* ---------- पंचांग का दृश्य ---------- */
var PV = null, vrCache = {};
function P() { return window.Panchang; }
function pcCfg() { return C.panchang || {}; }
function num(v, dflt) { var n = parseFloat(v); return isFinite(n) ? n : dflt; }
function cityList() {
  var k = pcCfg(), raw = (k.cities && k.cities.length) ? k.cities : [{ name: 'उदयपुर', lat: 24.5854, lon: 73.7125 }];
  var out = raw.map(function (c) { return { name: c.name, lat: num(c.lat, NaN), lon: num(c.lon, NaN) }; })
    .filter(function (c) { return c.name && isFinite(c.lat) && isFinite(c.lon) && Math.abs(c.lat) <= 89 && Math.abs(c.lon) <= 180; });
  return out.length ? out : [{ name: 'उदयपुर', lat: 24.5854, lon: 73.7125 }];
}
function pcTz() { return num(pcCfg().tzOffset, 330); }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
function initPanchang() {
  if (!$('#pcDate') || !P()) return;
  var k = pcCfg(), list = cityList();
  var saved = store('sj-city'), idx = 0, i;
  for (i = 0; i < list.length; i++) if (list[i].name === (saved || k.defaultCity)) { idx = i; break; }
  var now = new Date(Date.now() + (pcTz() - (-new Date().getTimezoneOffset())) * 60000);
  PV = {
    y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(),
    tz: pcTz(), mode: k.sunriseMode || 'center',
    name: list[idx].name, lat: list[idx].lat, lon: list[idx].lon
  };
  $('#pcCity').value = String(idx);
  function setDate(y, m, d) { PV.y = y; PV.m = m; PV.d = d; refreshPanchang(); }
  function syncInput() { $('#pcDate').value = PV.y + '-' + (PV.m < 10 ? '0' : '') + PV.m + '-' + (PV.d < 10 ? '0' : '') + PV.d; }
  syncInput();
  $('#pcDate').addEventListener('change', function () {
    var p = this.value.split('-');
    if (p.length === 3 && p[0].length === 4) setDate(+p[0], +p[1], +p[2]); else syncInput();
  });
  function shift(n) {
    var t = new Date(Date.UTC(PV.y, PV.m - 1, PV.d) + n * 86400000);
    PV.y = t.getUTCFullYear(); PV.m = t.getUTCMonth() + 1; PV.d = t.getUTCDate(); syncInput(); refreshPanchang();
  }
  $('#pcPrev').addEventListener('click', function () { shift(-1); });
  $('#pcNext').addEventListener('click', function () { shift(1); });
  $('#pcToday').addEventListener('click', function () {
    var t = new Date(Date.now() + (PV.tz - (-new Date().getTimezoneOffset())) * 60000);
    PV.y = t.getFullYear(); PV.m = t.getMonth() + 1; PV.d = t.getDate(); syncInput(); refreshPanchang();
  });
  $('#pcCity').addEventListener('change', function () {
    var c = list[+this.value]; if (!c) return;
    PV.name = c.name; PV.lat = c.lat; PV.lon = c.lon; store('sj-city', c.name); refreshPanchang();
  });
  $('#pcHere').addEventListener('click', function () {
    var b = this;
    if (!navigator.geolocation) { toast('यह ब्राउज़र स्थान नहीं बता सकता।'); return; }
    b.disabled = true; b.textContent = 'खोज रहा है…';
    navigator.geolocation.getCurrentPosition(function (p) {
      b.disabled = false; b.textContent = 'मेरा स्थान';
      PV.lat = p.coords.latitude; PV.lon = p.coords.longitude; PV.name = 'आपका स्थान';
      refreshPanchang(); toast('आपके स्थान के अनुसार पंचांग बन गया।');
    }, function () { b.disabled = false; b.textContent = 'मेरा स्थान'; toast('स्थान नहीं मिल सका। सूची से नगर चुनें।'); }, { timeout: 10000 });
  });
  $('#pcShare').addEventListener('click', shareCard);
  var cl = $('#pcImgClose'); if (cl) cl.addEventListener('click', function () { $('#pcImgBox').hidden = true; });
  var sd = $('#pcSend'); if (sd) sd.addEventListener('click', sharePng);
}
function kv(label, value, sub) {
  return '<div class="kv"><dt>' + esc(label) + '</dt><dd>' + value + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</dd></div>';
}
function refreshPanchang() {
  if (!PV || !P() || !$('#pcMain')) { refreshRashifal(null); return; }
  var pp = P(), tz = PV.tz;
  var pc;
  try { pc = pp.compute({ y: PV.y, m: PV.m, d: PV.d, lat: PV.lat, lon: PV.lon, tz: tz, sunriseMode: PV.mode }); }
  catch (e) { $('#pcMain').innerHTML = '<p class="hint">इस दिनांक का पंचांग नहीं बन सका।</p>'; return; }
  PV.pc = pc;
  var N = pp.names, dateTxt = PV.d + ' ' + N.MONTH_HI[PV.m - 1] + ' ' + PV.y;
  var el = function (j) { return pp.endLabel(j, tz, pc.sunrise || 0); };

  $('#pcMain').innerHTML =
    '<div class="pc-head"><div><b>' + esc(dateTxt) + '</b><span>' + esc(pc.vaar) + ' · ' + esc(PV.name) + '</span></div>' +
    '<div class="pc-tithi"><b>' + esc(pc.tithi.paksha + ' ' + pc.tithi.name) + '</b><span>' + esc(pc.maas.purnimanta) + ' मास' + (pc.maas.adhik ? ' (अधिक)' : '') + '</span></div></div>' +
    '<dl class="kv-list">' +
      kv('तिथि', esc(pc.tithi.paksha + ' ' + pc.tithi.name), 'समाप्ति ' + el(pc.tithi.end)) +
      kv('वार', esc(pc.vaar), 'स्वामी ग्रह ' + pc.vaarLord) +
      kv('नक्षत्र', esc(pc.nakshatra.name), 'स्वामी ' + pc.nakshatra.lord + ' · समाप्ति ' + el(pc.nakshatra.end)) +
      kv('योग', esc(pc.yoga.name), 'समाप्ति ' + el(pc.yoga.end)) +
      kv('करण', esc(pc.karan.name), 'समाप्ति ' + el(pc.karan.end)) +
    '</dl>';

  $('#pcSide').innerHTML =
    '<dl class="kv-list tight">' +
      kv('सूर्योदय', pp.hhmm(pc.sunrise, tz)) + kv('सूर्यास्त', pp.hhmm(pc.sunset, tz)) +
      kv('चंद्रोदय', pp.hhmm(pc.moonrise, tz)) + kv('चंद्रास्त', pp.hhmm(pc.moonset, tz)) +
      kv('विक्रम संवत', String(pc.samvat.vikram)) + kv('शक संवत', String(pc.samvat.shaka)) +
      kv('मास', esc(pc.maas.purnimanta), 'पूर्णिमांत · अमांत ' + pc.maas.amanta) +
      kv('ऋतु', esc(pc.ritu)) +
      kv('सूर्य राशि', esc(pc.sunRashi)) + kv('चंद्र राशि', esc(pc.moonRashi)) +
    '</dl>';

  refreshMuhurat(pc); refreshRashifal(pc);
}
/* ---------- मुहूर्त ---------- */
var muTab = 0;
function timeRange(a, b) { var pp = P(); return pp.hhmm(a, PV.tz) + ' – ' + pp.hhmm(b, PV.tz); }
function refreshMuhurat(pc) {
  if (!$('#muKaal') || !pc) return;
  var pp = P(), N = pp.names;
  $('#muFor').textContent = PV.d + ' ' + N.MONTH_HI[PV.m - 1] + ' ' + PV.y + ' · ' + pc.vaar + ' · ' + PV.name;
  $('#muKaal').innerHTML = pp.kaal(pc).map(function (k) {
    return '<div class="kaal ' + (k.nature === 'शुभ' ? 'good' : 'bad') + '"><b>' + esc(k.name) + '</b>' +
      '<span class="t">' + esc(timeRange(k.from, k.to)) + '</span><small>' + esc(k.note) + '</small></div>';
  }).join('');
  var ch = pp.choghadiya(pc);
  function choHtml(a) {
    return a.map(function (c) {
      var cls = c.nature === 'शुभ' ? 'good' : c.nature === 'मध्यम' ? 'mid' : 'bad';
      return '<div class="cho ' + cls + '"><b>' + esc(c.name) + '</b><span>' + esc(timeRange(c.from, c.to)) + '</span><em>' + esc(c.nature) + '</em></div>';
    }).join('');
  }
  $('#muChoD').innerHTML = choHtml(ch.day);
  $('#muChoN').innerHTML = choHtml(ch.night);
  showMuTab(muTab);
}
function initMuhuratTabs() {
  var t = $('#muTabs'); if (!t) return;
  ['होरा सारणी', 'लग्न सारणी'].forEach(function (n, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'tab'); b.textContent = n;
    b.addEventListener('click', function () { showMuTab(i); });
    t.appendChild(b);
  });
}
function showMuTab(i) {
  muTab = i;
  var t = $('#muTabs'), panel = $('#muPanel'); if (!t || !panel || !PV || !PV.pc) return;
  $$('button', t).forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
  var pp = P(), pc = PV.pc, html;
  if (i === 0) {
    var h = pp.hora(pc);
    function rows(a) { return a.map(function (x) { return '<tr><td>' + esc(x.lord) + '</td><td>' + esc(timeRange(x.from, x.to)) + '</td><td>' + esc(x.use) + '</td></tr>'; }).join(''); }
    html = '<p class="hint">होरा के लिए दिन और रात की अवधि को 12-12 भागों में बाँटा जाता है और इनके नाम ग्रहों पर रखे जाते हैं।</p>' +
      '<div class="tbl-wrap"><table class="tbl"><caption>दिन की होरा</caption><thead><tr><th>होरा</th><th>समय</th><th>किन कार्यों के लिए</th></tr></thead><tbody>' + rows(h.day) + '</tbody></table></div>' +
      '<div class="tbl-wrap"><table class="tbl"><caption>रात्रि की होरा</caption><thead><tr><th>होरा</th><th>समय</th><th>किन कार्यों के लिए</th></tr></thead><tbody>' + rows(h.night) + '</tbody></table></div>';
  } else {
    var lg = pp.lagnaTable(pc);
    html = '<p class="hint">लग्न वह राशि है जो उस समय क्षितिज पर उदय हो रही होती है। सूर्योदय से अगले सूर्योदय तक बारह लग्न आते हैं।</p>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>लग्न</th><th>आरंभ</th><th>समाप्ति</th></tr></thead><tbody>' +
      lg.map(function (l) { return '<tr><td>' + esc(l.rashi) + '</td><td>' + pp.hhmm(l.from, PV.tz) + '</td><td>' + pp.hhmm(l.to, PV.tz) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  panel.innerHTML = html;
}
/* ---------- राशिफल ---------- */
function refreshRashifal(pc) {
  var g = $('#rfGrid'); if (!g) return;
  var k = C.rashifal || {}, own = {}, pp = P();
  (k.items || []).forEach(function (x) { if (x.rashi) own[x.rashi] = x; });
  if (!pc || !pp) {
    g.innerHTML = (k.items || []).map(function (x) {
      return '<article class="rf"><h3>' + esc(x.rashi) + '</h3>' + (x.text ? '<p>' + rich(x.text) + '</p>' : '') + '</article>';
    }).join('');
    return;
  }
  var N = pp.names;
  var f = $('#rfFor');
  if (f) f.textContent = PV.d + ' ' + N.MONTH_HI[PV.m - 1] + ' ' + PV.y + ' · चंद्रमा ' + pc.moonRashi + ' राशि एवं ' + pc.nakshatra.name + ' नक्षत्र में';
  g.innerHTML = pp.gochar(pc).map(function (x) {
    var o = own[x.rashi] || {}, good = x.shubh === 'शुभ';
    return '<article class="rf ' + (good ? 'good' : 'bad') + '">' +
      '<div class="rf-h"><h3>' + esc(x.rashi) + '</h3><span class="pill">' + esc(x.shubh) + '</span></div>' +
      (k.showGochar === false ? '' : '<p class="rf-pos">चंद्रमा आपकी राशि से <b>' + x.pos + 'वें</b> स्थान पर</p><p>' + esc(x.text) + '</p>') +
      (o.text ? '<div class="rf-own"><small>' + esc(k.acharyaLabel || 'आचार्य जी का संदेश') + '</small><p>' + rich(o.text) + '</p></div>' : '') +
      '</article>';
  }).join('');
}
/* ---------- व्रत एवं त्यौहार ---------- */
var vrFilter = 'सभी';
function initVrat() {
  var f = $('#vrFilter'); if (!f) return;
  ['सभी', 'बड़े पर्व', 'व्रत'].forEach(function (n) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = n;
    b.setAttribute('aria-pressed', n === vrFilter ? 'true' : 'false');
    b.addEventListener('click', function () {
      vrFilter = n;
      $$('button', f).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      drawVrat();
    });
    f.appendChild(b);
  });
  drawVrat();
}
function drawVrat() {
  var box = $('#vrList'); if (!box || !P()) return;
  var k = C.vrat || {}, pp = P(), N = pp.names;
  var tz = pcTz();
  var city = PV || { lat: cityList()[0].lat, lon: cityList()[0].lon, name: cityList()[0].name };
  var now = new Date(Date.now() + (tz - (-new Date().getTimezoneOffset())) * 60000);
  var days = Math.max(7, Math.min(num(k.days, 180), 400));
  var key = city.lat.toFixed(3) + ',' + city.lon.toFixed(3) + ',' + days + ',' + now.toDateString();
  if (!vrCache[key]) {
    try {
      vrCache[key] = pp.festivals({
        y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(),
        lat: city.lat, lon: city.lon, tz: tz, days: days,
        monthly: k.showMonthly !== false, sunriseMode: (C.panchang || {}).sunriseMode || 'center'
      });
    } catch (e) { vrCache[key] = []; }
  }
  var list = vrCache[key].slice();
  (k.extra || []).forEach(function (x) {
    var p = String(x.date || '').split('-');
    if (p.length !== 3) return;
    var jd0 = pp.jdFromLocal(+p[0], +p[1], +p[2], 0, tz);
    list.push({ jd: jd0, y: +p[0], m: +p[1], d: +p[2], wd: pp.localParts(jd0 + 0.25, tz).wd, name: x.title, kind: x.kind || 'सामान्य', note: x.note || '', tithi: '', maas: '', own: true });
  });
  list.sort(function (a, b) { return a.jd - b.jd; });
  if (vrFilter === 'बड़े पर्व') list = list.filter(function (x) { return x.kind === 'बड़ा'; });
  else if (vrFilter === 'व्रत') list = list.filter(function (x) { return x.kind === 'व्रत'; });
  if (!list.length) { box.innerHTML = '<p class="empty-note">इस अवधि में कोई पर्व नहीं मिला।</p>'; return; }
  var html = '', lastKey = '';
  list.forEach(function (x) {
    var mk = x.y + '-' + x.m;
    if (mk !== lastKey) { lastKey = mk; html += '<h3 class="vr-m">' + esc(N.MONTH_HI[x.m - 1] + ' ' + x.y) + '</h3>'; }
    html += '<div class="vr ' + (x.kind === 'बड़ा' ? 'big' : x.kind === 'व्रत' ? 'vrat' : '') + '">' +
      '<div class="vr-d"><b>' + x.d + '</b><span>' + esc(N.VAAR[x.wd].replace('वार', '')) + '</span></div>' +
      '<div class="vr-t"><b>' + esc(x.name) + '</b>' +
      (x.tithi ? '<span>' + esc(x.maas + ' · ' + x.tithi) + '</span>' : '') +
      (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</div>' +
      '<span class="vr-k">' + esc(x.kind === 'बड़ा' ? 'पर्व' : x.kind) + '</span></div>';
  });
  box.innerHTML = html;
}
/* ---------- वीडियो ---------- */
function initVideos() {
  $$('.vd-play').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('.vd'), id = card.dataset.yt;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      f.title = 'YouTube वीडियो'; f.loading = 'lazy'; f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      f.setAttribute('allowfullscreen', '');
      b.replaceWith(f);
    });
  });
}
/* ---------- पंचांग की तस्वीर ---------- */
var pngBlob = null;
function cssVar(n, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb; }
function shareCard() {
  if (!PV || !PV.pc || !P()) return;
  var pp = P(), pc = PV.pc, N = pp.names, tz = PV.tz;
  var W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var x = cv.getContext('2d');
  var bg = cssVar('--bg', '#150C33'), surf = cssVar('--surface', '#261758'), line = cssVar('--line', '#4D3A9A');
  var ink = cssVar('--ink', '#F6F0FF'), ink2 = cssVar('--ink-2', '#C9BCEB'), acc = cssVar('--accent', '#FFB92E');
  var F = "'Mukta','Noto Sans Devanagari',sans-serif";
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  var gr = x.createRadialGradient(W * 0.8, 260, 20, W * 0.8, 260, 760);
  gr.addColorStop(0, acc + '33'); gr.addColorStop(1, acc + '00');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  for (var i = 0; i < 90; i++) {
    x.globalAlpha = 0.15 + Math.random() * 0.5; x.fillStyle = cssVar('--star', '#FFF1C9');
    x.beginPath(); x.arc(Math.random() * W, Math.random() * 420, Math.random() * 2 + 0.6, 0, 6.283); x.fill();
  }
  x.globalAlpha = 1;
  function txt(s, px, py, size, col, weight, align) {
    x.font = (weight || 400) + ' ' + size + 'px ' + F; x.fillStyle = col; x.textAlign = align || 'left'; x.textBaseline = 'alphabetic';
    x.fillText(String(s), px, py);
  }
  txt((C.site.brandName || ''), W / 2, 86, 40, acc, 700, 'center');
  txt(PV.d + ' ' + N.MONTH_HI[PV.m - 1] + ' ' + PV.y + ' · ' + pc.vaar, W / 2, 142, 34, ink2, 500, 'center');
  txt(PV.name, W / 2, 188, 28, ink2, 400, 'center');
  x.strokeStyle = acc; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 90, 214); x.lineTo(W / 2 + 90, 214); x.stroke();
  txt(pc.tithi.paksha + ' ' + pc.tithi.name, W / 2, 288, 62, ink, 700, 'center');
  txt(pc.maas.purnimanta + ' मास · वि.सं. ' + pc.samvat.vikram, W / 2, 334, 30, ink2, 400, 'center');
  var rows = [
    ['तिथि', pc.tithi.paksha + ' ' + pc.tithi.name, 'समाप्ति ' + pp.hhmm(pc.tithi.end, tz)],
    ['नक्षत्र', pc.nakshatra.name, 'समाप्ति ' + pp.hhmm(pc.nakshatra.end, tz)],
    ['योग', pc.yoga.name, 'समाप्ति ' + pp.hhmm(pc.yoga.end, tz)],
    ['करण', pc.karan.name, 'समाप्ति ' + pp.hhmm(pc.karan.end, tz)],
    ['सूर्योदय', pp.hhmm(pc.sunrise, tz), 'सूर्यास्त ' + pp.hhmm(pc.sunset, tz)],
    ['चंद्रोदय', pp.hhmm(pc.moonrise, tz), 'चंद्रास्त ' + pp.hhmm(pc.moonset, tz)],
    ['चंद्र राशि', pc.moonRashi, 'सूर्य ' + pc.sunRashi + ' राशि में']
  ];
  var ky = pp.kaal(pc), rk = null, ab = null, j;
  for (j = 0; j < ky.length; j++) { if (ky[j].name === 'राहु काल') rk = ky[j]; if (ky[j].name === 'अभिजित मुहूर्त') ab = ky[j]; }
  if (rk) rows.push(['राहु काल', pp.hhmm(rk.from, tz) + ' – ' + pp.hhmm(rk.to, tz), 'शुभ कार्य से बचें']);
  if (ab) rows.push(['अभिजित मुहूर्त', pp.hhmm(ab.from, tz) + ' – ' + pp.hhmm(ab.to, tz), 'दिन का श्रेष्ठ मुहूर्त']);
  var top = 392, rh = 84, pad = 64;
  x.fillStyle = surf; x.globalAlpha = 0.75;
  if (x.roundRect) { x.beginPath(); x.roundRect(pad, top, W - pad * 2, rows.length * rh + 28, 28); x.fill(); }
  else x.fillRect(pad, top, W - pad * 2, rows.length * rh + 28);
  x.globalAlpha = 1;
  rows.forEach(function (r, n) {
    var yy = top + 28 + n * rh + 36;
    txt(r[0], pad + 36, yy, 30, ink2, 500);
    txt(r[1], W - pad - 36, yy, 34, ink, 700, 'right');
    txt(r[2], W - pad - 36, yy + 32, 24, ink2, 400, 'right');
    if (n < rows.length - 1) { x.strokeStyle = line; x.lineWidth = 1; x.beginPath(); x.moveTo(pad + 30, yy + 48); x.lineTo(W - pad - 30, yy + 48); x.stroke(); }
  });
  var jaiY = H - 52, phoneY = jaiY - 48, nameY = phoneY - 46;
  var by = Math.min(top + rows.length * rh + 90, nameY);
  txt((C.contact && C.contact.name) || '', W / 2, by, 32, ink, 600, 'center');
  txt('मोबाइल एवं WhatsApp ' + (C.site.phone || ''), W / 2, by + 46, 30, acc, 600, 'center');
  txt(C.site.footerJai || '', W / 2, jaiY, 28, ink2, 400, 'center');

  var box = $('#pcImgBox');
  cv.toBlob(function (b) {
    pngBlob = b;
    var url = URL.createObjectURL(b);
    $('#pcImg').src = url; $('#pcDl').href = url;
    $('#pcDl').download = 'panchang-' + PV.y + '-' + PV.m + '-' + PV.d + '.png';
    box.hidden = false; box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, 'image/png');
}
function sharePng() {
  if (!pngBlob) return;
  var f = new File([pngBlob], 'panchang.png', { type: 'image/png' });
  var pp = P(), pc = PV.pc, N = pp.names;
  var cap = (C.site.brandName || '') + '\n' + PV.d + ' ' + N.MONTH_HI[PV.m - 1] + ' ' + PV.y + ' · ' + pc.vaar + '\n' +
    pc.tithi.paksha + ' ' + pc.tithi.name + ' · ' + pc.nakshatra.name + ' नक्षत्र';
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    navigator.share({ files: [f], text: cap }).catch(function () { });
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(cap), '_blank', 'noopener');
    toast('तस्वीर पहले डाउनलोड करें, फिर WhatsApp में जोड़ें।');
  }
}

/* ---------- start ---------- */
render(window.SITE_CONTENT || {}, false);
})();
