/* एडमिन पैनल: data/content.js की सारी सामग्री यहाँ से बदली जा सकती है। */
(function () {
'use strict';

var $ = function (s, r) { return (r || document).querySelector(s); };
var state = JSON.parse(JSON.stringify(window.SITE_CONTENT || {}));
state.custom = state.custom || {};
var pending = {};          // छवि का पथ -> dataURL (जो अभी सेव/प्रकाशित नहीं हुई)
var dirty = false;
var mode = 'file';         // 'server' | 'web' | 'file'
var current = 'site';
var uidN = 0;

/* ---------- छोटे सहायक ---------- */
function h(tag, props, kids) {
  var e = document.createElement(tag);
  if (props) for (var k in props) {
    var v = props[k];
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
function uid() { return 'f' + (++uidN); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
function showLog(title, text) { $('#logTitle').textContent = title; $('#logBody').textContent = text; var d = $('#logDlg'); if (!d.open) d.showModal(); }
$('#logClose').addEventListener('click', function () { $('#logDlg').close(); });

/* ---------- स्कीमा (कौन-सा भाग कैसे बदला जा सकता है) ---------- */
function T(k, l, x) { return Object.assign({ k: k, t: 'text', l: l }, x); }
function A(k, l, x) { return Object.assign({ k: k, t: 'area', l: l }, x); }
function B(k, l, x) { return Object.assign({ k: k, t: 'bool', l: l }, x); }
function L(k, l, x) { return Object.assign({ k: k, t: 'list', l: l }, x); }
function I(k, l, sub, x) { return Object.assign({ k: k, t: 'items', l: l, sub: sub }, x); }
function IMG(k, l) { return { k: k, t: 'image', l: l }; }
function G(k, l, fields, x) { return Object.assign({ k: k, t: 'group', l: l, fields: fields }, x); }
function COL(k, l) { return { k: k, t: 'color', l: l }; }

var SVC_HINT = 'संपर्क फ़ॉर्म की “सेवा” सूची में जैसा लिखा है, ठीक वैसा लिखें';
var COLORS = [COL('bg', 'पृष्ठभूमि'), COL('bg2', 'हर दूसरे भाग की पृष्ठभूमि'), COL('surface', 'कार्ड एवं पैनल'), COL('surface2', 'कार्ड (हल्का उभार)'), COL('line', 'रेखाएँ एवं बॉर्डर'), COL('ink', 'मुख्य अक्षर'), COL('ink2', 'हल्के अक्षर'), COL('accent', 'मुख्य रंग (बटन, शीर्षक)'), COL('accentInk', 'मुख्य रंग पर अक्षर'), COL('accent2', 'दूसरा रंग'), COL('star', 'तारे (रात की थीम)')];

var SCHEMA = [
  { id: 'site', group: 'साइट', label: 'साइट सेटिंग', root: 'site', sub: 'नाम, नंबर, घोषणा पट्टी, सोशल लिंक और फ़ुटर।', fields: [
    T('brandName', 'साइट / केंद्र का नाम'), T('metaTitle', 'ब्राउज़र टैब का शीर्षक'), A('metaDescription', 'Google खोज के लिए संक्षिप्त विवरण'),
    T('phone', 'मोबाइल नंबर (साइट पर दिखाने के लिए)'), T('waNumber', 'WhatsApp नंबर (देश कोड के साथ, + के बिना)', { hint: 'जैसे 916376602721' }),
    T('waGreeting', 'WhatsApp संदेश की पहली पंक्ति'),
    G('announcement', 'ऊपर की घोषणा पट्टी', [B('enabled', 'पट्टी दिखाएँ'), T('text', 'घोषणा का पाठ'), T('link', 'लिंक (वैकल्पिक)', { hint: 'https://… या #contact' })]),
    G('social', 'सोशल मीडिया लिंक (खाली छोड़ें तो नहीं दिखेंगे)', [T('youtube', 'YouTube', { hint: 'https:// से शुरू होना चाहिए' }), T('facebook', 'Facebook'), T('instagram', 'Instagram'), T('other', 'अन्य लिंक')]),
    T('footerJai', 'फ़ुटर का जयकारा'), T('footerLine', 'फ़ुटर की पंक्ति'), A('disclaimer', 'अस्वीकरण (Disclaimer)')
  ] },
  { id: 'theme', group: 'साइट', label: 'रंग एवं थीम', root: 'theme', sub: 'रात और दिन की थीम के रंग अलग-अलग बदले जा सकते हैं।', fields: [
    { k: 'mode', t: 'select', l: 'शुरुआती थीम', opts: [['auto', 'आगंतुक के फ़ोन/कंप्यूटर के अनुसार'], ['dark', 'हमेशा रात की थीम से शुरू'], ['light', 'हमेशा दिन की थीम से शुरू']] },
    G('dark', 'रात की थीम के रंग', COLORS, { colors: true }), G('light', 'दिन की थीम के रंग', COLORS, { colors: true })
  ] },
  { id: 'menu', group: 'साइट', label: 'मेन्यू एवं क्रम', special: 'menu' },
  { id: 'home', group: 'सेक्शन', label: 'Home (मुख्य पृष्ठ)', root: 'home', sec: 'home', fields: [
    T('om', 'ऊपर की पंक्ति'), T('titleBefore', 'शीर्षक: पहला भाग', { hint: 'अंत में खाली जगह (space) छोड़ सकते हैं' }), T('titleEm', 'शीर्षक: रंगीन शब्द'), T('titleAfter', 'शीर्षक: अंतिम भाग'),
    T('tagline', 'उप-शीर्षक'), A('lead', 'स्वागत संदेश'),
    T('btn1Text', 'पहला बटन'), T('btn1Href', 'पहले बटन का लिंक', { hint: '#kundali जैसा भाग-लिंक या https://…' }), T('btn2Text', 'दूसरा बटन'), T('btn2Href', 'दूसरे बटन का लिंक'),
    I('quick', 'त्वरित लिंक', [T('text', 'नाम'), T('href', 'लिंक')], { lab: 'text' }),
    T('founderRole', 'संस्थापक का पद'), T('founderName', 'संस्थापक का नाम'), IMG('avatar', 'छोटी गोल तस्वीर'),
    B('showToday', 'आज का वार एवं ग्रह दिखाएँ'), B('showWheel', 'राशि चक्र दिखाएँ')
  ] },
  { id: 'panchang', group: 'पंचांग', label: 'आज का पंचांग', root: 'panchang', sec: 'panchang', sub: 'तिथि, नक्षत्र, सूर्योदय आदि की गणना साइट खुद करती है। यहाँ केवल शीर्षक, नगर सूची और सेटिंग बदलें।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    T('defaultCity', 'डिफ़ॉल्ट नगर', { hint: 'नीचे दी गई नगर सूची में से ठीक वही नाम लिखें' }),
    { k: 'sunriseMode', t: 'select', l: 'सूर्योदय की पद्धति', opts: [['center', 'हिन्दू परंपरा — सूर्य-बिंब का मध्य भाग'], ['upper', 'सामान्य पद्धति — बिंब का ऊपरी किनारा']] },
    T('tzOffset', 'समय क्षेत्र (मिनट में)', { hint: 'भारत के लिए 330 ही रहने दें' }),
    T('shareTitle', 'साझा तस्वीर का शीर्षक'), A('shareNote', 'साझा बटन के पास की सूचना'), A('fine', 'नीचे की चेतावनी'),
    I('cities', 'नगरों की सूची', [T('name', 'नगर का नाम'), T('lat', 'अक्षांश (latitude)'), T('lon', 'देशांतर (longitude)')], { lab: 'name' }),
    I('info', 'जानकारी के खंड (पंचांग के नीचे)', [T('title', 'शीर्षक'), A('text', 'विवरण')], { lab: 'title' })
  ] },
  { id: 'rashifal', group: 'पंचांग', label: 'प्रतिदिन राशिफल', root: 'rashifal', sec: 'rashifal', sub: 'चंद्र गोचर की गणना अपने आप होती है। हर राशि के लिए आचार्य जी का अपना संदेश यहाँ लिखें।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    B('showGochar', 'चंद्र गोचर की स्थिति दिखाएँ'), T('acharyaLabel', 'आचार्य जी के संदेश का लेबल'), A('fine', 'नीचे की चेतावनी'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय'),
    I('items', 'हर राशि का संदेश', [T('rashi', 'राशि'), A('text', 'आचार्य जी का संदेश (खाली छोड़ेंगे तो केवल गोचर दिखेगा)')], { lab: 'rashi' })
  ] },
  { id: 'muhurat', group: 'पंचांग', label: 'शुभ मुहूर्त', root: 'muhurat', sec: 'muhurat', sub: 'चौघड़िया, होरा, लग्न और राहु काल अपने आप बनते हैं।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), A('fine', 'नीचे की चेतावनी'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय')
  ] },
  { id: 'vrat', group: 'पंचांग', label: 'व्रत एवं त्यौहार', root: 'vrat', sec: 'vrat', sub: 'पर्वों की तिथियाँ गणना से बनती हैं। अपने आयोजन नीचे “अपने पर्व” में जोड़ें।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    T('days', 'कितने दिन आगे तक दिखाएँ', { hint: 'जैसे 180' }), B('showMonthly', 'एकादशी, प्रदोष जैसे मासिक व्रत भी दिखाएँ'),
    A('fine', 'नीचे की चेतावनी'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय'),
    I('extra', 'अपने पर्व एवं आयोजन', [T('date', 'दिनांक', { hint: 'इसी रूप में लिखें: 2027-03-22' }), T('title', 'नाम'), T('kind', 'श्रेणी', { hint: 'बड़ा, व्रत या सामान्य' }), A('note', 'टिप्पणी')], { lab: 'title' })
  ] },
  { id: 'vratkatha', group: 'पंचांग', label: 'व्रत-त्यौहार की कथा', root: 'vratkatha', sec: 'vratkatha', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    T('askText', 'हर कथा का बटन'), T('service', 'संपर्क फ़ॉर्म की सेवा', { hint: SVC_HINT }),
    I('items', 'कथाएँ', [T('title', 'व्रत / त्यौहार का नाम'), T('when', 'कब होता है'), A('text', 'कथा एवं विधि (नया अनुच्छेद खाली पंक्ति छोड़कर)')], { lab: 'title' })
  ] },
  { id: 'videos', group: 'अतिरिक्त', label: 'वीडियो (YouTube)', root: 'videos', sec: 'videos', sub: 'YouTube का पूरा लिंक चिपकाएँ, तस्वीर अपने आप आ जाएगी।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    T('channelUrl', 'चैनल का लिंक'), T('channelText', 'चैनल बटन का पाठ'),
    I('items', 'वीडियो', [T('url', 'YouTube लिंक', { hint: 'जैसे https://www.youtube.com/watch?v=XXXXXXXXXXX' }), T('title', 'शीर्षक'), A('note', 'छोटा विवरण')], { lab: 'title' })
  ] },
  { id: 'socialSec', group: 'अतिरिक्त', label: 'सोशल मीडिया', root: 'socialSec', sec: 'socialSec', sub: 'नाम में YouTube, Facebook, Instagram, WhatsApp, Telegram लिखने पर उसका चिह्न अपने आप लग जाता है।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    I('items', 'लिंक', [T('label', 'नाम'), T('handle', 'यूज़रनेम या छोटी पंक्ति'), T('url', 'पूरा लिंक', { hint: 'https:// से शुरू होना चाहिए' })], { lab: 'label' })
  ] },
  { id: 'about', group: 'सेक्शन', label: 'हमारे बारे में', root: 'about', sec: 'about', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('para1', 'पहला अनुच्छेद'), A('para2', 'दूसरा अनुच्छेद'), IMG('photo', 'आचार्य जी की तस्वीर (पारदर्शी बैकग्राउंड वाली PNG/WebP सबसे अच्छी)'),
    I('aims', 'उद्देश्य के बिंदु', [T('title', 'शीर्षक'), A('text', 'विवरण')], { lab: 'title' })
  ] },
  { id: 'kundali', group: 'सेक्शन', label: 'ऑनलाइन जन्मकुंडली', root: 'kundali', sec: 'kundali', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), L('bullets', 'सेवाओं के बिंदु'),
    T('formTitle', 'फ़ॉर्म का शीर्षक'), A('formHint', 'फ़ॉर्म के नीचे की सूचना'), L('topics', 'परामर्श के विषयों की सूची'), A('photoNote', 'कुंडली-फोटो की सूचना'),
    T('chartEyebrow', 'भाव-चार्ट का छोटा शीर्षक'), A('chartNote', 'भाव-चार्ट की टिप्पणी')
  ] },
  { id: 'milan', group: 'सेक्शन', label: 'कुंडली मिलान', root: 'milan', sec: 'milan', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), L('bullets', 'सेवाओं के बिंदु'),
    T('panelTitle', 'मिलान पैनल का शीर्षक'), A('panelHint', 'पैनल की सूचना'), A('fine', 'परिणाम के नीचे की चेतावनी'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय')
  ] },
  { id: 'prem', group: 'सेक्शन', label: 'प्रेम एवं वैवाहिक जीवन', root: 'prem', sec: 'prem', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), L('pills', 'विषयों की सूची (गोली जैसे बटन)'),
    I('sutras', 'सूत्र (भाव/ग्रह)', [T('title', 'शीर्षक'), T('text', 'छोटा विवरण')], { lab: 'title' }),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय')
  ] },
  { id: 'career', group: 'सेक्शन', label: 'करियर एवं व्यापार', root: 'career', sec: 'career', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }), T('ctaNote', 'संदेश में जुड़ने वाला विषय'),
    I('rows', 'खुलने वाली पंक्तियाँ', [T('title', 'पंक्ति का शीर्षक'), A('body', 'खुलने पर दिखने वाला पाठ', { hint: '**शब्द** लिखने पर वह रंगीन मोटे अक्षरों में दिखेगा' })], { lab: 'title' })
  ] },
  { id: 'dosh', group: 'सेक्शन', label: 'ग्रह दोष एवं उपाय', root: 'dosh', sec: 'dosh', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), A('fine', 'हर टैब के नीचे की सूचना'),
    T('ctaText', 'बटन का पाठ'), T('ctaService', 'बटन की सेवा', { hint: SVC_HINT }),
    I('items', 'टैब (विषय)', [T('title', 'विषय का नाम'), A('what', 'क्या है'), A('basis', 'विचार का आधार'), A('path', 'सामान्य शास्त्रोक्त मार्ग')], { lab: 'title' })
  ] },
  { id: 'puja', group: 'सेक्शन', label: 'पूजा-पाठ एवं कर्मकांड', root: 'puja', sec: 'puja', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), T('askText', 'हर कार्ड का बटन'), T('service', 'संपर्क फ़ॉर्म की सेवा', { hint: SVC_HINT }),
    I('items', 'पूजाएँ', [T('title', 'पूजा का नाम'), T('cat', 'श्रेणी', { hint: 'एक ही श्रेणी-नाम बार-बार लिखने से फ़िल्टर बटन अपने आप बन जाते हैं' }), A('text', 'विवरण')], { lab: 'title' })
  ] },
  { id: 'katha', group: 'सेक्शन', label: 'कथा एवं आयोजन', root: 'katha', sec: 'katha', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'), T('btnText', 'हर कार्ड का बटन'),
    I('items', 'कथाएँ', [T('glyph', 'कार्ड का अक्षर', { hint: 'एक या दो अक्षर' }), T('title', 'कथा का नाम'), A('text', 'विवरण'), T('service', 'संपर्क फ़ॉर्म की सेवा', { hint: SVC_HINT })], { lab: 'title' }),
    A('noteText', 'नीचे की पट्टी का पाठ'), T('noteBtn', 'पट्टी का बटन'), T('noteService', 'पट्टी की सेवा', { hint: SVC_HINT }), T('noteNote', 'संदेश में जुड़ने वाला विषय')
  ] },
  { id: 'gallery', group: 'सेक्शन', label: 'गैलरी (तस्वीरें)', root: 'gallery', sec: 'gallery', note: 'गैलरी दिखाने के लिए “मेन्यू एवं क्रम” में इसे चालू करें।', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('lead', 'परिचय'),
    I('items', 'तस्वीरें', [IMG('img', 'तस्वीर'), T('caption', 'कैप्शन')], { lab: 'caption' })
  ] },
  { id: 'contact', group: 'सेक्शन', label: 'संपर्क एवं परामर्श', root: 'contact', sec: 'contact', fields: [
    T('eyebrow', 'छोटा शीर्षक'), T('heading', 'कार्ड का शीर्षक'), T('roleLabel', 'पद का लेबल'), T('name', 'नाम'), T('phoneLabel', 'नंबर का लेबल'),
    A('address', 'पता (खाली छोड़ें तो नहीं दिखेगा)'), A('hours', 'परामर्श का समय (खाली छोड़ें तो नहीं दिखेगा)'), A('intro', 'परिचय पाठ'),
    T('formTitle', 'फ़ॉर्म का शीर्षक'), A('formHint', 'फ़ॉर्म की सूचना'), L('services', 'सेवाओं की सूची (फ़ॉर्म में चुनने के लिए)')
  ] },
  { id: 'custom', group: 'अतिरिक्त', label: 'नए पेज / सेक्शन', special: 'custom' },
  { id: 'backup', group: 'अतिरिक्त', label: 'बैकअप एवं मदद', special: 'backup' }
];
var CUSTOM_FIELDS = [T('eyebrow', 'छोटा शीर्षक'), T('heading', 'मुख्य शीर्षक'), A('text', 'पाठ (नया अनुच्छेद खाली पंक्ति छोड़कर)'), IMG('image', 'तस्वीर (वैकल्पिक)'), T('btnText', 'बटन का पाठ (वैकल्पिक)'), T('btnHref', 'बटन का लिंक')];
var BUILTIN = { home: 'Home', panchang: 'आज का पंचांग', rashifal: 'प्रतिदिन राशिफल', muhurat: 'शुभ मुहूर्त', vrat: 'व्रत एवं त्यौहार', vratkatha: 'व्रत-त्यौहार की कथा', about: 'हमारे बारे में', kundali: 'जन्मकुंडली', milan: 'कुंडली मिलान', prem: 'प्रेम एवं वैवाहिक', career: 'करियर एवं व्यापार', dosh: 'ग्रह दोष', puja: 'पूजा-पाठ', katha: 'कथा', videos: 'वीडियो', gallery: 'गैलरी', socialSec: 'सोशल मीडिया', contact: 'संपर्क' };

/* ---------- बदलाव, पूर्वावलोकन ---------- */
var pvTimer;
function changed() {
  dirty = true; updateDirty();
  clearTimeout(pvTimer); pvTimer = setTimeout(sendPreview, 250);
}
function updateDirty() { $('#dirtyChip').hidden = !dirty; }
function walk(o, fn) { for (var k in o) { if (typeof o[k] === 'string') o[k] = fn(o[k]); else if (o[k] && typeof o[k] === 'object') walk(o[k], fn); } }
function previewContent() { var c = clone(state); if (Object.keys(pending).length) walk(c, function (v) { return pending[v] || v; }); return c; }
function sendPreview() {
  var f = $('#pv'); if (!f || !f.contentWindow) return;
  try { f.contentWindow.postMessage({ type: 'sj-preview', content: previewContent() }, '*'); } catch (e) { }
}
function gotoPreview(id) { try { $('#pv').contentWindow.postMessage({ type: 'sj-goto', id: id }, '*'); } catch (e) { } }
window.addEventListener('message', function (e) { if (e.source === $('#pv').contentWindow && e.data && e.data.type === 'sj-ready') sendPreview(); });
$('#pv').addEventListener('load', function () { setTimeout(sendPreview, 100); });
window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- फ़ील्ड बनाने वाले ---------- */
function blankFor(fields) {
  var o = {};
  fields.forEach(function (f) { o[f.k] = f.t === 'bool' ? false : (f.t === 'items' || f.t === 'list') ? [] : f.t === 'group' ? blankFor(f.fields) : ''; });
  return o;
}
function wrapField(f, control, forId) {
  var w = h('div', { 'class': 'field' });
  if (f.l) w.appendChild(h('label', { 'for': forId || null, text: f.l }));
  w.appendChild(control);
  if (f.hint) w.appendChild(h('span', { 'class': 'hint', text: f.hint }));
  return w;
}
function renderField(f, obj) {
  var id = uid(), v;
  switch (f.t) {
    case 'text': {
      var i = h('input', { type: 'text', id: id, value: obj[f.k] || '' });
      i.value = obj[f.k] || '';
      i.addEventListener('input', function () { obj[f.k] = i.value; changed(); });
      return wrapField(f, i, id);
    }
    case 'area': {
      var ta = h('textarea', { id: id }); ta.value = obj[f.k] || '';
      ta.addEventListener('input', function () { obj[f.k] = ta.value; changed(); });
      return wrapField(f, ta, id);
    }
    case 'bool': {
      var cb = h('input', { type: 'checkbox', id: id }); cb.checked = !!obj[f.k];
      cb.addEventListener('change', function () { obj[f.k] = cb.checked; changed(); });
      var lab = h('label', { 'class': 'chk', 'for': id }, [cb, h('span', { text: f.l })]);
      var w = h('div', { 'class': 'field' }, [lab]); return w;
    }
    case 'select': {
      var s = h('select', { id: id });
      f.opts.forEach(function (o) { s.appendChild(h('option', { value: o[0], text: o[1] })); });
      s.value = obj[f.k] || f.opts[0][0];
      s.addEventListener('change', function () { obj[f.k] = s.value; changed(); });
      return wrapField(f, s, id);
    }
    case 'color': {
      var cur = /^#[0-9a-fA-F]{6}$/.test(obj[f.k] || '') ? obj[f.k] : '#000000';
      var ci = h('input', { type: 'color', id: id, value: cur }); ci.value = cur;
      var code = h('code', { text: cur.toUpperCase() });
      ci.addEventListener('input', function () { obj[f.k] = ci.value; code.textContent = ci.value.toUpperCase(); changed(); });
      return h('div', { 'class': 'cw' }, [ci, h('span', { text: f.l }), code]);
    }
    case 'image': return renderImage(f, obj);
    case 'list': return renderList(f, obj);
    case 'items': return renderItems(f, obj);
    case 'group': {
      obj[f.k] = obj[f.k] || {};
      var box = h('div', { 'class': 'card' }, [h('h3', { text: f.l })]);
      if (f.colors) { var grid = h('div', { 'class': 'colors' }); f.fields.forEach(function (sf) { grid.appendChild(renderField(sf, obj[f.k])); }); box.appendChild(grid); }
      else f.fields.forEach(function (sf) { box.appendChild(renderField(sf, obj[f.k])); });
      return box;
    }
  }
  return h('div');
}
function renderList(f, obj) {
  obj[f.k] = obj[f.k] || [];
  var arr = obj[f.k], wrap = h('div', { 'class': 'field' });
  var box = h('div'); var add = h('button', { type: 'button', 'class': 'b b-ghost sm', text: '+ जोड़ें' });
  wrap.appendChild(h('label', { text: f.l })); wrap.appendChild(box); wrap.appendChild(add);
  function redraw() {
    box.innerHTML = '';
    arr.forEach(function (val, i) {
      var inp = h('input', { type: 'text' }); inp.value = val;
      inp.addEventListener('input', function () { arr[i] = inp.value; changed(); });
      var up = h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↑', 'aria-label': 'ऊपर', onclick: function () { if (i > 0) { var t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; changed(); redraw(); } } });
      var dn = h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↓', 'aria-label': 'नीचे', onclick: function () { if (i < arr.length - 1) { var t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t; changed(); redraw(); } } });
      var del = h('button', { type: 'button', 'class': 'b danger sm', text: 'हटाएँ', onclick: function () { arr.splice(i, 1); changed(); redraw(); } });
      box.appendChild(h('div', { 'class': 'row-str' }, [inp, up, dn, del]));
    });
  }
  add.addEventListener('click', function () { arr.push(''); changed(); redraw(); var ins = box.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus(); });
  redraw(); return wrap;
}
function renderItems(f, obj) {
  obj[f.k] = obj[f.k] || [];
  var arr = obj[f.k], wrap = h('div', { 'class': 'field' });
  var box = h('div'); var add = h('button', { type: 'button', 'class': 'b b-ghost sm', text: '+ नया जोड़ें' });
  wrap.appendChild(h('label', { text: f.l })); wrap.appendChild(box); wrap.appendChild(add);
  function redraw() {
    box.innerHTML = '';
    arr.forEach(function (item, i) {
      var title = (f.lab && item[f.lab]) ? String(item[f.lab]).slice(0, 40) : '';
      var head = h('div', { 'class': 'item-head' }, [h('b', { text: (i + 1) + '. ' + title }), h('div', { 'class': 'item-tools' }, [
        h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↑', 'aria-label': 'ऊपर', onclick: function () { if (i > 0) { var t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; changed(); redraw(); } } }),
        h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↓', 'aria-label': 'नीचे', onclick: function () { if (i < arr.length - 1) { var t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t; changed(); redraw(); } } }),
        h('button', { type: 'button', 'class': 'b danger sm', text: 'हटाएँ', onclick: function () { arr.splice(i, 1); changed(); redraw(); } })
      ])]);
      var card = h('div', { 'class': 'item' }, [head]);
      f.sub.forEach(function (sf) { card.appendChild(renderField(sf, item)); });
      box.appendChild(card);
    });
  }
  add.addEventListener('click', function () { arr.push(blankFor(f.sub)); changed(); redraw(); var cs = box.querySelectorAll('.item'); if (cs.length) cs[cs.length - 1].scrollIntoView({ block: 'nearest' }); });
  redraw(); return wrap;
}

/* ---------- छवि ---------- */
var pickTarget = null;
function imgSrc(p) { return pending[p] || p || ''; }
function renderImage(f, obj) {
  var id = uid();
  var thumb = h('div', { 'class': 'thumb' });
  var path = h('input', { type: 'text', id: id, placeholder: 'images/नाम.webp या https://…' }); path.value = obj[f.k] || '';
  function setThumb() { var s = imgSrc(path.value.trim()); thumb.style.backgroundImage = s ? 'url("' + s.replace(/"/g, '%22') + '")' : 'none'; }
  path.addEventListener('input', function () { obj[f.k] = path.value.trim(); setThumb(); changed(); });
  var up = h('button', { type: 'button', 'class': 'b b-ghost sm', text: 'नई तस्वीर चुनें', onclick: function () { pickTarget = { obj: obj, key: f.k, path: path, setThumb: setThumb }; $('#filePick').value = ''; $('#filePick').click(); } });
  var rm = h('button', { type: 'button', 'class': 'b danger sm', text: 'हटाएँ', onclick: function () { obj[f.k] = ''; path.value = ''; setThumb(); changed(); } });
  setThumb();
  var ctl = h('div', { 'class': 'ctl' }, [path, h('div', { 'class': 'ctl-row' }, [up, rm])]);
  var w = h('div', { 'class': 'field' }, [h('label', { 'for': id, text: f.l }), h('div', { 'class': 'imgf' }, [thumb, ctl])]);
  return w;
}
$('#filePick').addEventListener('change', function () {
  var file = this.files && this.files[0]; if (!file || !pickTarget) return;
  var t = pickTarget; var url = URL.createObjectURL(file); var img = new Image();
  img.onload = function () {
    var max = 1200, s = Math.min(1, max / Math.max(img.width, img.height));
    var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    var data = c.toDataURL('image/webp', 0.88), ext = 'webp';
    if (!/^data:image\/webp/.test(data)) { data = c.toDataURL('image/png'); ext = 'png'; }
    var p = 'images/up-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + '.' + ext;
    pending[p] = data; t.obj[t.key] = p; t.path.value = p; t.setThumb(); changed(); URL.revokeObjectURL(url);
    toast('तस्वीर जुड़ गई। सेव या प्रकाशित करने पर यह साइट में पहुँचेगी।');
  };
  img.onerror = function () { toast('यह फ़ाइल तस्वीर के रूप में नहीं खुली।'); URL.revokeObjectURL(url); };
  img.src = url;
});

/* ---------- विशेष संपादक ---------- */
function renderMenuEditor(main) {
  main.appendChild(h('p', { 'class': 'sub', text: 'यहाँ से मेन्यू के नाम, क्रम और कौन-सा भाग साइट पर दिखे, यह तय करें। ऊपर से नीचे का क्रम ही पेज पर भागों का क्रम होगा।' }));
  var box = h('div'); main.appendChild(box);
  function redraw() {
    box.innerHTML = '';
    state.menu.forEach(function (m, i) {
      var vis = h('input', { type: 'checkbox' }); vis.checked = m.visible !== false;
      vis.addEventListener('change', function () { m.visible = vis.checked; changed(); });
      var ti = h('input', { type: 'text', placeholder: 'मेन्यू का नाम' }); ti.value = m.title || ''; ti.addEventListener('input', function () { m.title = ti.value; changed(); });
      var su = h('input', { type: 'text', placeholder: 'नाम के नीचे की छोटी पंक्ति' }); su.value = m.sub || ''; su.addEventListener('input', function () { m.sub = su.value; changed(); });
      var tools = h('div', { 'class': 'item-tools' }, [
        h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↑', 'aria-label': 'ऊपर', onclick: function () { if (i > 0) { var t = state.menu[i]; state.menu[i] = state.menu[i - 1]; state.menu[i - 1] = t; changed(); redraw(); } } }),
        h('button', { type: 'button', 'class': 'b b-ghost sm', text: '↓', 'aria-label': 'नीचे', onclick: function () { if (i < state.menu.length - 1) { var t = state.menu[i]; state.menu[i] = state.menu[i + 1]; state.menu[i + 1] = t; changed(); redraw(); } } })
      ]);
      if (/^x-/.test(m.id)) tools.appendChild(h('button', { type: 'button', 'class': 'b danger sm', text: 'हटाएँ', onclick: function () { state.menu.splice(i, 1); delete state.custom[m.id]; changed(); redraw(); } }));
      var name = BUILTIN[m.id] || 'अतिरिक्त पेज';
      var row = h('div', { 'class': 'menu-row' }, [h('label', { 'class': 'chk', title: 'साइट पर दिखाएँ' }, [vis]), ti, su, tools, h('span', { 'class': 'nm', text: 'भाग: ' + name + (m.id === 'home' ? ' (पहला पृष्ठ)' : '') })]);
      box.appendChild(row);
    });
  }
  redraw();
}
function renderCustomEditor(main) {
  main.appendChild(h('p', { 'class': 'sub', text: 'अपनी ज़रूरत का कोई भी नया भाग (जैसे “हमारी सेवाएँ”, “समाचार”, “ऑनलाइन पूजा”) यहाँ जोड़ें। वह मेन्यू में भी आ जाएगा।' }));
  var box = h('div'); main.appendChild(box);
  var add = h('button', { type: 'button', 'class': 'b b-main', text: '+ नया सेक्शन जोड़ें', onclick: function () {
    var id = 'x-' + Date.now().toString(36);
    state.custom[id] = blankFor(CUSTOM_FIELDS); state.custom[id].heading = 'नया सेक्शन';
    var idx = state.menu.length - 1; if (idx < 0) idx = 0;
    state.menu.splice(idx, 0, { id: id, title: 'नया सेक्शन', sub: 'विवरण', visible: true });
    changed(); redraw();
  } });
  main.appendChild(add);
  function redraw() {
    box.innerHTML = '';
    var ids = state.menu.filter(function (m) { return /^x-/.test(m.id); });
    if (!ids.length) box.appendChild(h('div', { 'class': 'callout', text: 'अभी कोई अतिरिक्त सेक्शन नहीं है।' }));
    ids.forEach(function (m) {
      var x = state.custom[m.id] = state.custom[m.id] || blankFor(CUSTOM_FIELDS);
      var card = h('div', { 'class': 'card' }, [h('h3', { text: 'सेक्शन: ' + (m.title || m.id) })]);
      card.appendChild(renderField(T('title', 'मेन्यू में नाम'), m));
      card.appendChild(renderField(T('sub', 'मेन्यू में छोटी पंक्ति'), m));
      CUSTOM_FIELDS.forEach(function (f) { card.appendChild(renderField(f, x)); });
      box.appendChild(card);
    });
    box.style.marginBottom = '16px';
  }
  redraw();
}
function renderBackup(main) {
  main.appendChild(h('div', { 'class': 'callout', text: 'सुझाव: बड़े बदलाव से पहले “बैकअप डाउनलोड” कर लें। GitHub पर हर प्रकाशन का इतिहास भी अपने आप सुरक्षित रहता है।' }));
  var c = h('div', { 'class': 'card' }, [h('h3', { text: 'बैकअप' })]);
  c.appendChild(h('div', { 'class': 'ctl-row', style: 'display:flex;gap:10px;flex-wrap:wrap' }, [
    h('button', { type: 'button', 'class': 'b b-main', text: 'बैकअप डाउनलोड (JSON)', onclick: function () { download('sj-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(state, null, 2), 'application/json'); } }),
    h('button', { type: 'button', 'class': 'b b-ghost', text: 'बैकअप से लौटाएँ', onclick: function () { $('#jsonPick').value = ''; $('#jsonPick').click(); } })
  ]));
  main.appendChild(c);
  var how = h('div', { 'class': 'card' }, [h('h3', { text: 'सेव करने के तीन तरीके' })]);
  [
    ['1. लोकल सर्वर (सबसे आसान)', 'कंप्यूटर में फ़ोल्डर खोलकर start-admin.bat (Windows) या “python serve.py” चलाएँ। फिर यही पैनल खुलेगा और “सेव करें” सीधे फ़ाइलों में लिखेगा। “git push” बटन बदलाव GitHub पर भेज देगा।'],
    ['2. सीधे GitHub पर', '⚙ में रिपॉज़िटरी और टोकन भरें, फिर “GitHub पर प्रकाशित करें”। किसी भी कंप्यूटर या फ़ोन से काम करेगा। 1-2 मिनट में साइट अपडेट हो जाती है।'],
    ['3. फ़ाइल डाउनलोड', 'अगर ऊपर के दोनों उपलब्ध न हों तो “सेव करें” से content.js और तस्वीरें डाउनलोड होंगी। उन्हें data/ और images/ फ़ोल्डर में रखकर GitHub पर अपलोड करें।']
  ].forEach(function (x) { how.appendChild(h('p', {}, [h('b', { text: x[0] }), document.createElement('br'), x[1]])); });
  main.appendChild(how);
}
$('#jsonPick').addEventListener('change', function () {
  var f = this.files && this.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try { var o = JSON.parse(r.result); if (!o || typeof o !== 'object' || !o.site || !o.menu) throw 0; state = o; state.custom = state.custom || {}; changed(); showGroup(current); toast('बैकअप लौटा दिया गया।'); }
    catch (e) { toast('यह सही बैकअप फ़ाइल नहीं लगती।'); }
  };
  r.readAsText(f);
});

/* ---------- मुख्य पृष्ठ बनाना ---------- */
function buildSide() {
  var side = $('#side'); side.innerHTML = ''; var last = '';
  SCHEMA.forEach(function (g) {
    if (g.group !== last) { side.appendChild(h('h6', { text: g.group })); last = g.group; }
    side.appendChild(h('button', { type: 'button', 'data-id': g.id, text: g.label, onclick: function () { showGroup(g.id); } }));
  });
}
function showGroup(id) {
  current = id;
  var g = SCHEMA.filter(function (x) { return x.id === id; })[0] || SCHEMA[0];
  Array.prototype.forEach.call($('#side').querySelectorAll('button'), function (b) { if (b.dataset.id === g.id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  var main = $('#main'); main.innerHTML = '';
  main.appendChild(h('h2', { text: g.label }));
  if (g.sub) main.appendChild(h('p', { 'class': 'sub', text: g.sub }));
  if (g.note) main.appendChild(h('div', { 'class': 'callout', text: g.note }));
  if (g.special === 'menu') renderMenuEditor(main);
  else if (g.special === 'custom') renderCustomEditor(main);
  else if (g.special === 'backup') renderBackup(main);
  else {
    if (g.id !== 'theme' && g.id !== 'site') main.appendChild(h('p', { 'class': 'note', text: 'सुझाव: किसी पाठ में **शब्द** लिखने पर वह साइट पर मोटे अक्षरों में दिखेगा।' }));
    var obj = state[g.root] = state[g.root] || {};
    var card = h('div', { 'class': 'card' });
    var hasPlain = g.fields.some(function (f) { return f.t !== 'group'; });
    if (hasPlain) main.appendChild(card);
    g.fields.forEach(function (f) { var node = renderField(f, obj); if (f.t === 'group') main.appendChild(node); else card.appendChild(node); });
  }
  main.scrollTop = 0; window.scrollTo(0, 0);
  if (g.sec) gotoPreview(g.sec);
}

/* ---------- सेव / डाउनलोड ---------- */
function contentText() { return 'window.SITE_CONTENT = ' + JSON.stringify(state, null, 2) + ';\n'; }
function usedPending() { var j = JSON.stringify(state); return Object.keys(pending).filter(function (p) { return j.indexOf(p) >= 0; }); }
function buildFiles() {
  var files = [{ path: 'data/content.js', text: contentText() }];
  usedPending().forEach(function (p) { files.push({ path: p, b64: pending[p].split(',')[1] }); });
  return files;
}
function download(name, data, type) {
  var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function b64Blob(b64, type) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: type }); }
function utf8ToB64(str) { var bytes = new TextEncoder().encode(str), bin = ''; for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64ToUtf8(b64) { var bin = atob(b64.replace(/\s/g, '')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
function clearSaved(files) { files.forEach(function (f) { if (f.b64) delete pending[f.path]; }); dirty = false; updateDirty(); }

function save() {
  var files = buildFiles();
  if (mode === 'server') {
    $('#btnSave').disabled = true;
    fetch('/__save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin': '1' }, body: JSON.stringify({ files: files.map(function (f) { return { path: f.path, b64: f.b64 || utf8ToB64(f.text) }; }) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { $('#btnSave').disabled = false; if (!x.ok) { showLog('सेव नहीं हुआ', x.j.error || 'अज्ञात त्रुटि'); return; } clearSaved(files); toast('सेव हो गया (' + x.j.saved.length + ' फ़ाइल)। GitHub पर भेजने के लिए “git push” दबाएँ।'); })
      .catch(function (e) { $('#btnSave').disabled = false; showLog('सेव नहीं हुआ', 'लोकल सर्वर से संपर्क नहीं हो पाया। क्या serve.py चल रहा है?\n' + e); });
    return;
  }
  files.forEach(function (f, i) {
    setTimeout(function () {
      if (f.b64) download(f.path.split('/').pop(), b64Blob(f.b64, /png$/.test(f.path) ? 'image/png' : 'image/webp'));
      else download('content.js', f.text, 'text/javascript');
    }, i * 350);
  });
  showLog('फ़ाइलें डाउनलोड हुईं', 'अब इन्हें अपने प्रोजेक्ट फ़ोल्डर में रखें:\n\n' + files.map(function (f) { return '• ' + f.path.split('/').pop() + '  →  ' + f.path.replace(/[^/]+$/, '') + '\n'; }).join('') + '\nफिर GitHub पर अपलोड/पुश करें।\n(पूरी तरह स्वचालित सेव के लिए लोकल सर्वर या GitHub प्रकाशन का उपयोग करें।)');
  clearSaved(files);
}

/* ---------- GitHub ---------- */
var ghMem = null;
function ghCfg() { if (ghMem) return ghMem; try { return JSON.parse(localStorage.getItem('sj-gh') || 'null'); } catch (e) { return null; } }
function openSettings() {
  var c = ghCfg() || {};
  $('#gh-owner').value = c.owner || ''; $('#gh-repo').value = c.repo || ''; $('#gh-branch').value = c.branch || 'main'; $('#gh-token').value = c.token || ''; $('#gh-remember').checked = !!c.remember;
  $('#ghDlg').showModal();
}
$('#btnSettings').addEventListener('click', openSettings);
$('#ghDlg').addEventListener('close', function () {
  if ($('#ghDlg').returnValue !== 'ok') return;
  var c = { owner: $('#gh-owner').value.trim(), repo: $('#gh-repo').value.trim(), branch: $('#gh-branch').value.trim() || 'main', token: $('#gh-token').value.trim(), remember: $('#gh-remember').checked };
  ghMem = c;
  try { localStorage.setItem('sj-gh', JSON.stringify(c.remember ? c : { owner: c.owner, repo: c.repo, branch: c.branch, remember: false })); } catch (e) { }
  toast('GitHub सेटिंग सेव हो गई।');
});
function enc(p) { return p.split('/').map(encodeURIComponent).join('/'); }
function gh(cfg, method, path, body) {
  var url = 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + '/contents/' + enc(path) + (method === 'GET' ? '?ref=' + encodeURIComponent(cfg.branch) : '');
  return fetch(url, { method: method, cache: 'no-store', headers: { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body: body ? JSON.stringify(body) : undefined });
}
function ghErr(status) {
  if (status === 401) return 'टोकन गलत है या समाप्त हो गया (401)।';
  if (status === 403) return 'अनुमति नहीं मिली (403)। टोकन में इस रिपॉज़िटरी के लिए Contents: Read and write दें।';
  if (status === 404) return 'रिपॉज़िटरी या ब्रांच नहीं मिली (404)। यूज़रनेम, नाम और ब्रांच जाँचें।';
  if (status === 409 || status === 422) return 'फ़ाइल का टकराव हुआ (' + status + ')। “GitHub से लाएँ” दबाकर ताज़ा सामग्री लें, फिर दोबारा कोशिश करें।';
  return 'त्रुटि कोड ' + status;
}
async function publish() {
  var cfg = ghCfg();
  if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) { openSettings(); return; }
  var files = buildFiles(), log = [], btn = $('#btnPublish'); btn.disabled = true;
  try {
    for (var i = 0; i < files.length; i++) {
      var f = files[i], sha = null;
      log.push('भेज रहा हूँ: ' + f.path); showLog('GitHub पर प्रकाशन', log.join('\n'));
      var g = await gh(cfg, 'GET', f.path);
      if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw new Error(ghErr(g.status));
      var body = { message: 'एडमिन पैनल से अपडेट: ' + f.path, content: f.b64 || utf8ToB64(f.text), branch: cfg.branch };
      if (sha) body.sha = sha;
      var p = await gh(cfg, 'PUT', f.path, body);
      if (!p.ok) throw new Error(ghErr(p.status));
      log.push('  ✓ हो गया');
    }
    clearSaved(files);
    log.push('', 'प्रकाशन पूरा। GitHub Pages को साइट अपडेट करने में 1-2 मिनट लग सकते हैं।');
    showLog('प्रकाशित हो गया', log.join('\n'));
  } catch (e) { log.push('', '✗ ' + (e.message || e)); showLog('प्रकाशन रुक गया', log.join('\n')); }
  btn.disabled = false;
}
async function pull() {
  var cfg = ghCfg();
  if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) { openSettings(); return; }
  if (dirty && !confirm('बिना सेव किए बदलाव मिट जाएँगे। आगे बढ़ें?')) return;
  try {
    var r = await gh(cfg, 'GET', 'data/content.js');
    if (!r.ok) throw new Error(ghErr(r.status));
    var j = await r.json(), txt = b64ToUtf8(j.content);
    var body = txt.replace(/^[\s\S]*?window\.SITE_CONTENT\s*=\s*/, '').replace(/;\s*$/, '');
    state = JSON.parse(body); state.custom = state.custom || {};
    dirty = false; updateDirty(); showGroup(current); sendPreview(); toast('GitHub से ताज़ा सामग्री आ गई।');
  } catch (e) { showLog('सामग्री नहीं आ सकी', String(e.message || e)); }
}

/* ---------- लोकल सर्वर ---------- */
function setMode(m) {
  mode = m;
  var chip = $('#modeChip');
  chip.className = 'chip-mode ' + (m === 'server' ? 'server' : 'file');
  chip.textContent = m === 'server' ? 'लोकल सर्वर चालू: सेव सीधे फ़ाइल में' : m === 'web' ? 'ऑनलाइन मोड: GitHub पर प्रकाशित करें' : 'फ़ाइल मोड: सेव = डाउनलोड';
  $('#btnGit').hidden = m !== 'server';
}
function detect() {
  if (location.protocol === 'file:') { setMode('file'); return; }
  fetch('/__ping', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (j) { setMode(j && j.sjAdmin ? 'server' : 'web'); }).catch(function () { setMode('web'); });
}
$('#btnGit').addEventListener('click', function () {
  var b = $('#btnGit'); b.disabled = true; b.textContent = 'भेज रहा हूँ…';
  fetch('/__git', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin': '1' }, body: JSON.stringify({ message: 'एडमिन पैनल से अपडेट' }) })
    .then(function (r) { return r.json(); })
    .then(function (j) { b.disabled = false; b.textContent = 'git push'; showLog(j.ok ? 'GitHub पर भेज दिया' : 'git में समस्या', j.output || j.error || ''); })
    .catch(function (e) { b.disabled = false; b.textContent = 'git push'; showLog('git में समस्या', String(e)); });
});

/* ---------- बटन और शॉर्टकट ---------- */
$('#btnSave').addEventListener('click', save);
$('#btnPublish').addEventListener('click', publish);
$('#btnPull').addEventListener('click', pull);
$('#btnPreview').addEventListener('click', function () {
  var app = $('#app'); var hide = !app.classList.contains('no-preview'); app.classList.toggle('no-preview', hide);
  this.textContent = hide ? 'पूर्वावलोकन दिखाएँ' : 'पूर्वावलोकन छिपाएँ';
});
document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });

buildSide(); showGroup('site'); detect();
})();
