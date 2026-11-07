/* पंचांग गणना इंजन — श्रीराम वैदिक ज्योतिष केंद्र
 *
 * सारी गणना ब्राउज़र में ही होती है, किसी इंटरनेट सेवा (API) की ज़रूरत नहीं।
 * सूर्य: Meeus, Astronomical Algorithms, अध्याय 25 (शुद्धता लगभग 0.01°)
 * चंद्र: Meeus, अध्याय 47 की पूरी तालिका (शुद्धता लगभग 10")
 * अयनांश: लाहिड़ी (चित्रपक्ष)
 * सूर्योदय/अस्त: हिन्दू परंपरा — सूर्य-बिंब का मध्य भाग क्षितिज पर
 */
window.Panchang = (function () {
'use strict';

var D2R = Math.PI / 180, R2D = 180 / Math.PI;
function nrm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
function sin(d) { return Math.sin(d * D2R); }
function cos(d) { return Math.cos(d * D2R); }
function tan(d) { return Math.tan(d * D2R); }

/* ---------- जूलियन दिनांक ---------- */
function jd(dt) { return dt.getTime() / 86400000 + 2440587.5; }
function dt(j) { return new Date(Math.round((j - 2440587.5) * 86400000)); }

/* ΔT (TT − UT) सेकंड में — 2005 से आगे का सरल सूत्र (Espenak/Meeus) */
function deltaT(j) {
  var y = 2000 + (j - 2451545.0) / 365.25;
  var t;
  if (y >= 2005 && y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (y >= 1986 && y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * t * t * t * t + 0.00002373599 * Math.pow(t, 5); }
  if (y >= 1961 && y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
  if (y >= 2050 && y < 2150) return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y);
  var u = (y - 1820) / 100; return -20 + 32 * u * u;
}
function jde(j) { return j + deltaT(j) / 86400; }

/* ---------- सूर्य ---------- */
function sunLon(je) {
  var T = (je - 2451545.0) / 36525;
  var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
        + (0.019993 - 0.000101 * T) * sin(2 * M)
        + 0.000289 * sin(3 * M);
  var om = 125.04 - 1934.136 * T;
  return nrm(L0 + C - 0.00569 - 0.00478 * sin(om));
}
function obliquity(je) {
  var T = (je - 2451545.0) / 36525;
  return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.036e-7 * T * T * T;
}
function sunEq(je) {
  var l = sunLon(je), e = obliquity(je);
  return { lon: l, ra: nrm(Math.atan2(cos(e) * sin(l), cos(l)) * R2D), dec: Math.asin(sin(e) * sin(l)) * R2D };
}

/* ---------- चंद्र (Meeus 47) ---------- */
/* D, M, M', F, Σl, Σr */
var MOON_L = [
[0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],
[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],
[2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],
[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],
[2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],
[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],
[0,1,2,0,-2120,5751],[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],[3,0,-1,0,-892,3258],
[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],
[2,1,-2,0,691,0],[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
[4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],[0,0,2,-2,-381,-4421],
[1,1,1,0,351,0],[3,0,-2,0,-340,0],[4,0,-3,0,330,0],[2,-1,2,0,327,0],
[0,2,1,0,-323,1165],[1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];
/* D, M, M', F, Σb */
var MOON_B = [
[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],
[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],
[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],
[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],
[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833],
[0,0,1,-3,777],[4,-1,0,-1,671],[2,0,2,-1,607],[2,0,0,-3,596],[2,-1,1,-1,491],
[2,-2,0,1,-451],[0,0,3,-1,439],[2,2,0,1,422],[2,-2,-1,1,421],[2,1,-1,-1,-366],
[2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],[0,0,1,3,-283],
[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],[0,1,-2,-1,-220],[2,1,-1,1,-220],
[1,0,1,1,-185],[2,-1,-2,-1,181],[0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],
[1,0,1,-1,-164],[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,1,115],[2,-2,0,0,107]
];
function moonPos(je) {
  var T = (je - 2451545.0) / 36525;
  var Lp = nrm(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000);
  var D = nrm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000);
  var M = nrm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000);
  var Mp = nrm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000);
  var F = nrm(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000);
  var A1 = nrm(119.75 + 131.849 * T), A2 = nrm(53.09 + 479264.290 * T), A3 = nrm(313.45 + 481266.484 * T);
  var E = 1 - 0.002516 * T - 0.0000074 * T * T;
  var sl = 0, sb = 0, sr = 0, i, t, a, f;
  for (i = 0; i < MOON_L.length; i++) {
    t = MOON_L[i]; a = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
    f = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
    sl += t[4] * f * sin(a); sr += t[5] * f * cos(a);
  }
  for (i = 0; i < MOON_B.length; i++) {
    t = MOON_B[i]; a = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
    f = t[1] === 0 ? 1 : (Math.abs(t[1]) === 1 ? E : E * E);
    sb += t[4] * f * sin(a);
  }
  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
  var om = 125.04 - 1934.136 * T;
  return {
    lon: nrm(Lp + sl / 1000000 - 0.00478 * sin(om)),
    lat: sb / 1000000,
    dist: 385000.56 + sr / 1000
  };
}
function moonEq(je) {
  var m = moonPos(je), e = obliquity(je);
  var l = m.lon * D2R, b = m.lat * D2R, er = e * D2R;
  var ra = Math.atan2(Math.sin(l) * Math.cos(er) - Math.tan(b) * Math.sin(er), Math.cos(l));
  var dec = Math.asin(Math.sin(b) * Math.cos(er) + Math.cos(b) * Math.sin(er) * Math.sin(l));
  return { ra: nrm(ra * R2D), dec: dec * R2D, dist: m.dist, lon: m.lon, lat: m.lat };
}

/* ---------- अयनांश (लाहिड़ी / चित्रपक्ष) ---------- */
function ayanamsa(je) {
  var T = (je - 2451545.0) / 36525;
  return 23.85306 + 1.3968878 * T + 0.000307 * T * T;
}
function nirayanaSun(j) { var je = jde(j); return nrm(sunLon(je) - ayanamsa(je)); }
function nirayanaMoon(j) { var je = jde(j); return nrm(moonPos(je).lon - ayanamsa(je)); }
function elong(j) { var je = jde(j); return nrm(moonPos(je).lon - sunLon(je)); }

/* ---------- नाम ---------- */
var TITHI = ['प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पंचमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा','प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पंचमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','अमावस्या'];
var NAKSHATRA = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वा फाल्गुनी','उत्तरा फाल्गुनी','हस्त','चित्रा','स्वाति','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढ़ा','उत्तराषाढ़ा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपद','उत्तराभाद्रपद','रेवती'];
var NAK_LORD = ['केतु','शुक्र','सूर्य','चंद्र','मंगल','राहु','गुरु','शनि','बुध','केतु','शुक्र','सूर्य','चंद्र','मंगल','राहु','गुरु','शनि','बुध','केतु','शुक्र','सूर्य','चंद्र','मंगल','राहु','गुरु','शनि','बुध'];
var YOGA = ['विष्कुम्भ','प्रीति','आयुष्मान','सौभाग्य','शोभन','अतिगण्ड','सुकर्मा','धृति','शूल','गण्ड','वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र','सिद्धि','व्यतीपात','वरीयान','परिघ','शिव','सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म','ऐन्द्र','वैधृति'];
var KARAN_M = ['बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि (भद्रा)'];
var VAAR = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
var VAAR_LORD = ['सूर्य','चंद्र','मंगल','बुध','गुरु','शुक्र','शनि'];
var RASHI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
var MAAS = ['चैत्र','वैशाख','ज्येष्ठ','आषाढ़','श्रावण','भाद्रपद','आश्विन','कार्तिक','मार्गशीर्ष','पौष','माघ','फाल्गुन'];
var MONTH_HI = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
var RITU = ['वसंत','ग्रीष्म','वर्षा','शरद','हेमंत','शिशिर'];

/* ---------- स्थानीय समय ---------- */
function localParts(j, tz) {        /* tz = मिनट में (भारत = 330) */
  var d = dt(j + tz / 1440);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() };
}
function jdFromLocal(y, m, d, hours, tz) {
  return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 + (hours || 0) / 24 - tz / 1440;
}
function hhmm(j, tz) {
  if (j == null || !isFinite(j)) return '—';
  var d = dt(j + tz / 1440), h = d.getUTCHours(), m = d.getUTCMinutes();
  var ap = h < 12 ? 'AM' : 'PM', h12 = h % 12; if (h12 === 0) h12 = 12;
  return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}
function dayStamp(j, tz) { var p = localParts(j, tz); return p.d + ' ' + MONTH_HI[p.m - 1]; }
function endLabel(j, tz, baseJ) {
  if (j == null) return '—';
  var a = localParts(baseJ, tz), b = localParts(j, tz);
  var s = hhmm(j, tz);
  if (a.d !== b.d || a.m !== b.m) s += ' (' + dayStamp(j, tz) + ')';
  return s;
}

/* ---------- सूर्योदय / सूर्यास्त ---------- */
function altSun(j, lat, lon) {
  var p = sunEq(jde(j));
  var H = nrm(gmst(j) + lon - p.ra);
  return Math.asin(sin(lat) * sin(p.dec) + cos(lat) * cos(p.dec) * cos(H)) * R2D;
}
function altMoon(j, lat, lon) {
  var p = moonEq(jde(j));
  var H = nrm(gmst(j) + lon - p.ra);
  var alt = Math.asin(sin(lat) * sin(p.dec) + cos(lat) * cos(p.dec) * cos(H)) * R2D;
  var par = Math.asin(6378.14 / p.dist) * R2D;
  return alt - par * cos(alt) + 0.5667 + 0.25;   /* लंबन, अपवर्तन एवं अर्धव्यास */
}
function gmst(j) {
  var T = (j - 2451545.0) / 36525;
  return nrm(280.46061837 + 360.98564736629 * (j - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
}
/* जिस क्षण ऊँचाई h0 को पार करे — खोज एवं द्विभाजन */
function crossing(fn, j0, j1, h0, rising) {
  var step = 1 / 288, prev = fn(j0) - h0, t = j0 + step, cur;
  while (t <= j1) {
    cur = fn(t) - h0;
    if ((rising && prev < 0 && cur >= 0) || (!rising && prev > 0 && cur <= 0)) {
      var a = t - step, b = t;
      for (var i = 0; i < 24; i++) { var m = (a + b) / 2; if (((fn(m) - h0) < 0) === (rising)) a = m; else b = m; }
      return (a + b) / 2;
    }
    prev = cur; t += step;
  }
  return null;
}
/* सूर्योदय का मानक:
   'center' = हिन्दू परंपरा, सूर्य-बिंब का मध्य भाग क्षितिज पर (अपवर्तन सहित)
   'upper'  = प्रचलित खगोलीय मानक, बिंब का ऊपरी किनारा                       */
function sunH0(mode) { return mode === 'upper' ? -0.8333 : -0.5667; }

/* ---------- दिन का पंचांग ---------- */
function newMoonBefore(j) {
  /* असली अमावस्या मध्यमान से ±0.6 दिन तक आगे-पीछे हो सकती है, इसलिए एक चक्र आगे से
     आरंभ करके नीचे की ओर आते हैं — वरना मास का नाम एक महीना पीछे रह जाता है। */
  var k = Math.floor((j - 2451550.09766) / 29.530588861) + 1;
  var t = 2451550.09766 + 29.530588861 * k;
  for (var pass = 0; pass < 4; pass++) {
    for (var i = 0; i < 12; i++) {
      var e = elong(t); if (e > 180) e -= 360;
      if (Math.abs(e) < 1e-6) break;
      t -= e / 12.190749;
    }
    if (t <= j) break;
    k -= 1; t = 2451550.09766 + 29.530588861 * k;
  }
  return t;
}
function nextAngle(j, step, fn) {   /* fn की अगली step-सीमा का क्षण */
  var v = fn(j), target = (Math.floor(v / step) + 1) * step;
  var rate = step === 12 ? 12.190749 : (step === (360 / 27) ? 13.176 : 13.176);
  var t = j + (target - v) / rate;
  for (var i = 0; i < 20; i++) {
    var d = nrm(fn(t) - target % 360);
    if (d > 180) d -= 360;
    if (Math.abs(d) < 1e-7) break;
    t -= d / rate;
  }
  return t;
}
function tithiEnd(j, n) {           /* n = 1..30 */
  var target = n * 12, t = j + (target - elong(j)) / 12.190749;
  for (var i = 0; i < 20; i++) {
    var d = nrm(elong(t) - (target % 360)); if (d > 180) d -= 360;
    if (Math.abs(d) < 1e-7) break;
    t -= d / 12.190749;
  }
  return t;
}
function nakEnd(j, n) {
  var sp = 360 / 27, target = n * sp, t = j + nrm(target - nirayanaMoon(j)) / 13.176;
  for (var i = 0; i < 20; i++) {
    var d = nrm(nirayanaMoon(t) - (target % 360)); if (d > 180) d -= 360;
    if (Math.abs(d) < 1e-7) break;
    t -= d / 13.176;
  }
  return t;
}
function yogaVal(j) { return nrm(nirayanaSun(j) + nirayanaMoon(j)); }
function yogaEnd(j, n) {
  var sp = 360 / 27, target = n * sp, t = j + nrm(target - yogaVal(j)) / 14.16;
  for (var i = 0; i < 20; i++) {
    var d = nrm(yogaVal(t) - (target % 360)); if (d > 180) d -= 360;
    if (Math.abs(d) < 1e-7) break;
    t -= d / 14.16;
  }
  return t;
}
function karanName(n) {             /* n = 0..59 */
  if (n === 0) return 'किंस्तुघ्न';
  if (n <= 56) return KARAN_M[(n - 1) % 7];
  return ['शकुनि', 'चतुष्पाद', 'नाग'][n - 57];
}
function karanEnd(j, n) {
  var target = (n + 1) * 6, t = j + nrm(target - elong(j)) / 12.190749;
  for (var i = 0; i < 20; i++) {
    var d = nrm(elong(t) - (target % 360)); if (d > 180) d -= 360;
    if (Math.abs(d) < 1e-7) break;
    t -= d / 12.190749;
  }
  return t;
}
/* चांद्र मास का नाम: जिस अमांत मास में सूर्य की संक्रांति हो, उससे नाम तय होता है */
function lunarMonth(j) {
  var nm = newMoonBefore(j);
  var prev = newMoonBefore(nm - 1);
  var r = Math.floor(nirayanaSun(nm + 0.1) / 30);
  var rPrev = Math.floor(nirayanaSun(prev + 0.1) / 30);
  return { idx: (r + 1) % 12, adhik: r === rPrev, start: nm };
}

function compute(opts) {
  var tz = opts.tz == null ? 330 : opts.tz;
  var lat = opts.lat, lon = opts.lon, mode = opts.sunriseMode || 'center';
  var y = opts.y, m = opts.m, d = opts.d;
  var mid = jdFromLocal(y, m, d, 0, tz);
  var h0 = sunH0(mode);
  var fS = function (t) { return altSun(t, lat, lon); };
  var fM = function (t) { return altMoon(t, lat, lon); };
  var sunrise = crossing(fS, mid, mid + 1, h0, true);
  var sunset = crossing(fS, sunrise == null ? mid : sunrise, mid + 1.2, h0, false);
  var nextRise = crossing(fS, mid + 0.8, mid + 2, h0, true);
  var moonrise = crossing(fM, mid, mid + 1, 0, true);
  var moonset = crossing(fM, mid, mid + 1, 0, false);

  var ref = sunrise == null ? mid + 0.25 : sunrise;     /* पंचांग सूर्योदय के समय का */
  var el = elong(ref);
  var tn = Math.floor(el / 12);                          /* 0..29 */
  var nmLon = nirayanaMoon(ref), nk = Math.floor(nmLon / (360 / 27));
  var yg = Math.floor(yogaVal(ref) / (360 / 27));
  var kn = Math.floor(el / 6);
  var lm = lunarMonth(ref);
  var sunR = Math.floor(nirayanaSun(ref) / 30);
  var moonR = Math.floor(nmLon / 30);
  var p = localParts(ref, tz);
  var paksha = tn < 15 ? 'शुक्ल' : 'कृष्ण';
  var purnimanta = paksha === 'कृष्ण' ? (lm.idx + 1) % 12 : lm.idx;

  /* विक्रम एवं शक संवत (चैत्रादि): नया वर्ष चैत्र शुक्ल प्रतिपदा से।
     जनवरी से अप्रैल के बीच यदि चांद्र मास पौष, माघ या फाल्गुन है तो पिछला वर्ष चल रहा है। */
  var beforeNewYear = (lm.idx >= 9 && p.m <= 4);
  var vs = p.y + (beforeNewYear ? 56 : 57);
  var shaka = p.y - (beforeNewYear ? 79 : 78);

  var dayLen = (sunset != null && sunrise != null) ? sunset - sunrise : 0.5;
  var nightLen = (nextRise != null && sunset != null) ? nextRise - sunset : 0.5;

  return {
    tz: tz, lat: lat, lon: lon, sunriseMode: mode,
    date: { y: y, m: m, d: d, wd: localParts(mid + 0.25, tz).wd },
    vaar: VAAR[localParts(mid + 0.25, tz).wd],
    vaarLord: VAAR_LORD[localParts(mid + 0.25, tz).wd],
    sunrise: sunrise, sunset: sunset, nextSunrise: nextRise, moonrise: moonrise, moonset: moonset,
    dayLen: dayLen, nightLen: nightLen,
    tithi: { n: tn + 1, name: TITHI[tn], paksha: paksha, end: tithiEnd(ref, tn + 1) },
    nakshatra: { n: nk + 1, name: NAKSHATRA[nk], lord: NAK_LORD[nk], end: nakEnd(ref, nk + 1) },
    yoga: { n: yg + 1, name: YOGA[yg], end: yogaEnd(ref, yg + 1) },
    karan: { n: kn, name: karanName(kn), end: karanEnd(ref, kn) },
    maas: { amanta: MAAS[lm.idx], purnimanta: MAAS[purnimanta], adhik: lm.adhik, idx: lm.idx },
    ritu: RITU[Math.floor(lm.idx / 2) % 6],
    samvat: { vikram: vs, shaka: shaka },
    sunRashi: RASHI[sunR], moonRashi: RASHI[moonR], moonRashiIdx: moonR,
    ayanamsa: ayanamsa(jde(ref))
  };
}

/* ---------- चौघड़िया, होरा, काल ---------- */
var CHO_ORDER = ['उद्वेग', 'चर', 'लाभ', 'अमृत', 'काल', 'शुभ', 'रोग'];
var CHO_DAY_START = [0, 3, 6, 2, 5, 1, 4];      /* रवि..शनि */
var CHO_NIGHT_START = [5, 1, 4, 0, 3, 6, 2];
var CHO_NATURE = { 'अमृत': 'शुभ', 'शुभ': 'शुभ', 'लाभ': 'शुभ', 'चर': 'मध्यम', 'उद्वेग': 'अशुभ', 'काल': 'अशुभ', 'रोग': 'अशुभ' };
var HORA_ORDER = ['शनि', 'गुरु', 'मंगल', 'सूर्य', 'शुक्र', 'बुध', 'चंद्र'];
var HORA_NATURE = { 'सूर्य': 'मिश्र', 'चंद्र': 'शुभ', 'मंगल': 'उग्र', 'बुध': 'शुभ', 'गुरु': 'शुभ', 'शुक्र': 'शुभ', 'शनि': 'मंद' };
var HORA_USE = {
  'सूर्य': 'पद, सरकारी कार्य, प्रभाव से जुड़े काम',
  'चंद्र': 'यात्रा, जल, माता एवं मन से जुड़े काम',
  'मंगल': 'साहस, भूमि एवं विवाद से जुड़े काम',
  'बुध': 'लेखन, व्यापार, पढ़ाई एवं बातचीत',
  'गुरु': 'शिक्षा, धर्म-कर्म, विवाह एवं शुभ कार्य',
  'शुक्र': 'विवाह, कला, आभूषण एवं सुख के काम',
  'शनि': 'श्रम, लोहा, सेवा एवं स्थायी काम'
};
var RAHU_IDX = [7, 1, 6, 4, 5, 3, 2];
var YAMA_IDX = [4, 3, 2, 1, 0, 6, 5];
var GULI_IDX = [6, 5, 4, 3, 2, 1, 0];
var DUR_MUH = [[14], [9, 13], [4], [8], [9, 13], [4, 9], [2]];

function choghadiya(pc) {
  var out = { day: [], night: [] }, i, s, len;
  if (pc.sunrise == null || pc.sunset == null) return out;
  len = pc.dayLen / 8; s = CHO_DAY_START[pc.date.wd];
  for (i = 0; i < 8; i++) {
    var nm = CHO_ORDER[(s + i) % 7];
    out.day.push({ name: nm, nature: CHO_NATURE[nm], from: pc.sunrise + i * len, to: pc.sunrise + (i + 1) * len });
  }
  len = pc.nightLen / 8; s = CHO_NIGHT_START[pc.date.wd];
  for (i = 0; i < 8; i++) {
    var nn = CHO_ORDER[(s + i) % 7];
    out.night.push({ name: nn, nature: CHO_NATURE[nn], from: pc.sunset + i * len, to: pc.sunset + (i + 1) * len });
  }
  return out;
}
function hora(pc) {
  var out = { day: [], night: [] }, i;
  if (pc.sunrise == null || pc.sunset == null) return out;
  var first = VAAR_LORD[pc.date.wd], st = HORA_ORDER.indexOf(first);
  var dl = pc.dayLen / 12, nl = pc.nightLen / 12;
  for (i = 0; i < 12; i++) {
    var l = HORA_ORDER[(st + i * 5) % 7];
    out.day.push({ lord: l, nature: HORA_NATURE[l], use: HORA_USE[l], from: pc.sunrise + i * dl, to: pc.sunrise + (i + 1) * dl });
  }
  for (i = 0; i < 12; i++) {
    var l2 = HORA_ORDER[(st + (i + 12) * 5) % 7];
    out.night.push({ lord: l2, nature: HORA_NATURE[l2], use: HORA_USE[l2], from: pc.sunset + i * nl, to: pc.sunset + (i + 1) * nl });
  }
  return out;
}
function kaal(pc) {
  var out = [];
  if (pc.sunrise == null || pc.sunset == null) return out;
  var p8 = pc.dayLen / 8, p15 = pc.dayLen / 15, wd = pc.date.wd;
  function part(i) { return { from: pc.sunrise + i * p8, to: pc.sunrise + (i + 1) * p8 }; }
  var r = part(RAHU_IDX[wd]), y = part(YAMA_IDX[wd]), g = part(GULI_IDX[wd]);
  out.push({ name: 'राहु काल', nature: 'अशुभ', from: r.from, to: r.to, note: 'शुभ कार्य के आरंभ से बचा जाता है' });
  out.push({ name: 'यमगण्ड', nature: 'अशुभ', from: y.from, to: y.to, note: 'नए कार्य के आरंभ के लिए वर्जित माना जाता है' });
  out.push({ name: 'गुलिक काल', nature: 'अशुभ', from: g.from, to: g.to, note: 'स्थायी प्रभाव वाले कार्य टाले जाते हैं' });
  if (wd !== 3) out.push({ name: 'अभिजित मुहूर्त', nature: 'शुभ', from: pc.sunrise + 7 * p15, to: pc.sunrise + 8 * p15, note: 'दिन का सर्वश्रेष्ठ मुहूर्त; बुधवार को नहीं लिया जाता' });
  DUR_MUH[wd].forEach(function (n) {
    out.push({ name: 'दुर मुहूर्त', nature: 'अशुभ', from: pc.sunrise + (n - 1) * p15, to: pc.sunrise + n * p15, note: 'परंपरा के अनुसार वर्जित मुहूर्त' });
  });
  out.sort(function (a, b) { return a.from - b.from; });
  return out;
}
/* लग्न सारणी — दिन भर की राशियों का उदय */
function ascendant(j, lat, lon) {
  var je = jde(j), e = obliquity(je), th = nrm(gmst(j) + lon);
  var a = Math.atan2(cos(th), -(sin(th) * cos(e) + tan(lat) * sin(e))) * R2D;
  return nrm(nrm(a) - ayanamsa(je));
}
function lagnaTable(pc) {
  var out = [], lat = pc.lat, lon = pc.lon;
  var start = pc.sunrise == null ? jdFromLocal(pc.date.y, pc.date.m, pc.date.d, 0, pc.tz) : pc.sunrise;
  var end = start + 1;
  var f = function (t) { return ascendant(t, lat, lon); };
  var cur = Math.floor(f(start) / 30), t = start, guard = 0;
  while (t < end && guard++ < 20) {
    var target = ((cur + 1) % 12) * 30;
    var lo = t, hi = Math.min(t + 0.25, end), found = null;
    var step = 1 / 288, pv = nrm(f(lo) - target), x = lo + step;
    while (x <= end) {
      var cv = nrm(f(x) - target);
      if (cv < pv && pv > 180 && cv < 180) {
        var a2 = x - step, b2 = x;
        for (var i = 0; i < 22; i++) { var mm = (a2 + b2) / 2; if (nrm(f(mm) - target) > 180) a2 = mm; else b2 = mm; }
        found = (a2 + b2) / 2; break;
      }
      pv = cv; x += step;
    }
    if (found == null) break;
    out.push({ rashi: RASHI[cur], from: t, to: found });
    t = found; cur = (cur + 1) % 12;
  }
  return out;
}

/* ---------- चंद्र गोचर (राशिफल का आधार) ---------- */
var GOCHAR = [
  { n: 1, s: 'अशुभ', t: 'मन चंचल रह सकता है। यात्रा और भोजन का योग, पर बड़े निर्णय में जल्दबाज़ी ठीक नहीं।' },
  { n: 2, s: 'शुभ', t: 'धन एवं कुटुंब से जुड़े विषयों में अनुकूलता। वाणी संयत रखें तो लाभ होता है।' },
  { n: 3, s: 'शुभ', t: 'पराक्रम एवं प्रयास का फल मिलता है। भाई-बंधु से सहयोग तथा साहस में वृद्धि।' },
  { n: 4, s: 'अशुभ', t: 'मन में बेचैनी या घर-गृहस्थी से जुड़ी चिंता संभव। विश्राम एवं धैर्य उचित।' },
  { n: 5, s: 'अशुभ', t: 'कार्यों में बाधा आ सकती है। संतान एवं विद्या के विषय में सावधानी रखें।' },
  { n: 6, s: 'शुभ', t: 'विरोधियों पर प्रभाव, रुके काम बनने का योग। प्रतियोगिता में अनुकूलता।' },
  { n: 7, s: 'शुभ', t: 'सुख एवं सहयोग का समय। साझेदारी तथा दांपत्य में मधुरता रहती है।' },
  { n: 8, s: 'अशुभ', t: 'अचानक व्यय या मानसिक भार संभव। वाहन एवं स्वास्थ्य में सतर्कता रखें।' },
  { n: 9, s: 'अशुभ', t: 'परिश्रम अधिक और फल कम लग सकता है। धर्म-कर्म एवं गुरुजन की सेवा लाभप्रद।' },
  { n: 10, s: 'शुभ', t: 'कार्यक्षेत्र में सफलता एवं मान-सम्मान का योग। नया काम आरंभ करने योग्य समय।' },
  { n: 11, s: 'शुभ', t: 'आय एवं लाभ का उत्तम योग। इच्छाएँ पूरी होने तथा मित्रों से सहयोग के संकेत।' },
  { n: 12, s: 'अशुभ', t: 'व्यय अधिक रह सकता है। निद्रा एवं स्वास्थ्य का ध्यान रखें, नया निवेश टालें।' }
];
function gochar(pc) {
  return RASHI.map(function (r, i) {
    var pos = ((pc.moonRashiIdx - i + 12) % 12) + 1;
    var g = GOCHAR[pos - 1];
    return { rashi: r, idx: i, pos: pos, shubh: g.s, text: g.t };
  });
}

/* ---------- व्रत एवं त्यौहार ---------- */
/* m = पूर्णिमांत मास का क्रमांक (0 = चैत्र), p = पक्ष (S शुक्ल / K कृष्ण), t = तिथि 1..15
   at = तिथि किस समय देखी जाए: sunrise (सामान्य), pradosh, nishith, midday, moonrise */
var FEST = [
  { m: 0, p: 'K', t: 8, n: 'शीतला अष्टमी (बासोड़ा)', k: 'व्रत' },
  { m: 0, p: 'S', t: 1, n: 'चैत्र नवरात्रि आरंभ, गुड़ी पड़वा', k: 'बड़ा' },
  { m: 0, p: 'S', t: 3, n: 'गणगौर', k: 'बड़ा' },
  { m: 0, p: 'S', t: 9, n: 'राम नवमी', k: 'बड़ा' },
  { m: 0, p: 'S', t: 15, n: 'हनुमान जयंती, चैत्र पूर्णिमा', k: 'बड़ा' },
  { m: 1, p: 'S', t: 3, n: 'अक्षय तृतीया', k: 'बड़ा' },
  { m: 1, p: 'S', t: 15, n: 'बुद्ध पूर्णिमा', k: 'बड़ा' },
  { m: 2, p: 'K', t: 15, n: 'वट सावित्री व्रत (अमावस्या)', k: 'व्रत' },
  { m: 2, p: 'S', t: 11, n: 'निर्जला एकादशी', k: 'व्रत' },
  { m: 3, p: 'S', t: 2, n: 'जगन्नाथ रथ यात्रा', k: 'बड़ा' },
  { m: 3, p: 'S', t: 11, n: 'देवशयनी एकादशी', k: 'बड़ा' },
  { m: 3, p: 'S', t: 15, n: 'गुरु पूर्णिमा', k: 'बड़ा' },
  { m: 3, p: 'K', t: 15, n: 'हरियाली अमावस्या', k: 'सामान्य' },
  { m: 4, p: 'S', t: 3, n: 'हरियाली तीज', k: 'व्रत' },
  { m: 4, p: 'S', t: 5, n: 'नाग पंचमी', k: 'बड़ा' },
  { m: 4, p: 'S', t: 15, n: 'रक्षाबंधन, श्रावण पूर्णिमा', k: 'बड़ा' },
  { m: 5, p: 'K', t: 8, n: 'श्रीकृष्ण जन्माष्टमी', k: 'बड़ा', at: 'nishith', note: 'निशीथ काल में व्याप्त अष्टमी के अनुसार' },
  { m: 5, p: 'S', t: 4, n: 'गणेश चतुर्थी', k: 'बड़ा', at: 'midday', note: 'मध्याह्न व्यापिनी चतुर्थी के अनुसार' },
  { m: 5, p: 'S', t: 14, n: 'अनंत चतुर्दशी', k: 'बड़ा' },
  { m: 5, p: 'S', t: 15, n: 'भाद्रपद पूर्णिमा, पितृ पक्ष आरंभ', k: 'सामान्य' },
  { m: 5, p: 'K', t: 3, n: 'कजरी तीज', k: 'व्रत' },
  { m: 6, p: 'K', t: 15, n: 'सर्व पितृ अमावस्या', k: 'बड़ा' },
  { m: 6, p: 'S', t: 1, n: 'शारदीय नवरात्रि आरंभ', k: 'बड़ा' },
  { m: 6, p: 'S', t: 8, n: 'दुर्गा अष्टमी', k: 'बड़ा' },
  { m: 6, p: 'S', t: 9, n: 'महानवमी', k: 'बड़ा' },
  { m: 6, p: 'S', t: 10, n: 'विजयादशमी (दशहरा)', k: 'बड़ा' },
  { m: 6, p: 'S', t: 15, n: 'शरद पूर्णिमा', k: 'बड़ा' },
  { m: 7, p: 'K', t: 4, n: 'करवा चौथ', k: 'व्रत', at: 'moonrise', note: 'चंद्रोदय के समय व्याप्त चतुर्थी के अनुसार' },
  { m: 7, p: 'K', t: 13, n: 'धनतेरस', k: 'बड़ा', at: 'pradosh', note: 'प्रदोष काल व्यापिनी त्रयोदशी के अनुसार' },
  { m: 7, p: 'K', t: 14, n: 'नरक चतुर्दशी (छोटी दिवाली)', k: 'बड़ा' },
  { m: 7, p: 'K', t: 15, n: 'दीपावली, लक्ष्मी पूजन', k: 'बड़ा', at: 'pradosh', note: 'प्रदोष काल व्यापिनी अमावस्या के अनुसार' },
  { m: 7, p: 'S', t: 1, n: 'गोवर्धन पूजा, अन्नकूट', k: 'बड़ा' },
  { m: 7, p: 'S', t: 2, n: 'भाई दूज', k: 'बड़ा' },
  { m: 7, p: 'S', t: 6, n: 'छठ पूजा', k: 'बड़ा' },
  { m: 7, p: 'S', t: 11, n: 'देवउठनी एकादशी, तुलसी विवाह', k: 'बड़ा' },
  { m: 7, p: 'S', t: 15, n: 'कार्तिक पूर्णिमा, देव दीपावली, गुरु नानक जयंती', k: 'बड़ा' },
  { m: 8, p: 'S', t: 5, n: 'विवाह पंचमी', k: 'सामान्य' },
  { m: 8, p: 'S', t: 11, n: 'गीता जयंती, मोक्षदा एकादशी', k: 'व्रत' },
  { m: 8, p: 'S', t: 15, n: 'दत्तात्रेय जयंती, मार्गशीर्ष पूर्णिमा', k: 'सामान्य' },
  { m: 9, p: 'S', t: 15, n: 'पौष पूर्णिमा', k: 'सामान्य' },
  { m: 10, p: 'K', t: 15, n: 'मौनी अमावस्या', k: 'बड़ा' },
  { m: 10, p: 'S', t: 5, n: 'वसंत पंचमी', k: 'बड़ा' },
  { m: 10, p: 'S', t: 15, n: 'माघ पूर्णिमा', k: 'सामान्य' },
  { m: 11, p: 'K', t: 14, n: 'महाशिवरात्रि', k: 'बड़ा', at: 'nishith', note: 'निशीथ काल में व्याप्त चतुर्दशी के अनुसार' },
  { m: 11, p: 'S', t: 15, n: 'होलिका दहन, फाल्गुन पूर्णिमा', k: 'बड़ा' }
];
var MONTHLY = [
  { p: 'S', t: 11, n: 'एकादशी व्रत', k: 'व्रत' },
  { p: 'K', t: 11, n: 'एकादशी व्रत', k: 'व्रत' },
  { p: 'S', t: 13, n: 'प्रदोष व्रत', k: 'व्रत' },
  { p: 'K', t: 13, n: 'प्रदोष व्रत', k: 'व्रत' },
  { p: 'K', t: 14, n: 'मासिक शिवरात्रि', k: 'व्रत' },
  { p: 'K', t: 4, n: 'संकष्टी चतुर्थी', k: 'व्रत' },
  { p: 'S', t: 4, n: 'विनायक चतुर्थी', k: 'व्रत' },
  { p: 'S', t: 15, n: 'पूर्णिमा व्रत', k: 'व्रत' },
  { p: 'K', t: 15, n: 'अमावस्या', k: 'व्रत' },
  { p: 'S', t: 8, n: 'मासिक दुर्गाष्टमी', k: 'व्रत' }
];
var SANKRANTI = {
  9: 'मकर संक्रांति', 10: 'कुंभ संक्रांति', 11: 'मीन संक्रांति', 0: 'मेष संक्रांति',
  1: 'वृषभ संक्रांति', 2: 'मिथुन संक्रांति', 3: 'कर्क संक्रांति', 4: 'सिंह संक्रांति',
  5: 'कन्या संक्रांति', 6: 'तुला संक्रांति', 7: 'वृश्चिक संक्रांति', 8: 'धनु संक्रांति'
};

/* किसी क्षण की तिथि, पक्ष एवं पूर्णिमांत मास */
function stateAt(j) {
  var el = elong(j), tn = Math.floor(el / 12);
  var paksha = tn < 15 ? 'S' : 'K';
  var lm = lunarMonth(j);
  return {
    tn: tn, t: (tn % 15) + 1, paksha: paksha, adhik: lm.adhik,
    amanta: lm.idx, purnimanta: paksha === 'K' ? (lm.idx + 1) % 12 : lm.idx
  };
}
function festivals(opts) {
  var tz = opts.tz == null ? 330 : opts.tz, lat = opts.lat, lon = opts.lon;
  var days = opts.days || 120, mode = opts.sunriseMode || 'center';
  var h0 = sunH0(mode), out = [], seen = {};
  var start = jdFromLocal(opts.y, opts.m, opts.d, 0, tz);
  var wantMonthly = opts.monthly !== false;
  var fS = function (t) { return altSun(t, lat, lon); };
  var fM = function (t) { return altMoon(t, lat, lon); };

  /* पहला चरण: हर दिन का सूर्योदय, सूर्यास्त एवं सूर्योदयकालीन स्थिति */
  var D = [], k, i;
  for (k = 0; k <= days; k++) {
    var mid = start + k;
    var sr = crossing(fS, mid, mid + 1, h0, true);
    var ss = crossing(fS, sr == null ? mid : sr, mid + 1.2, h0, false);
    var nr = crossing(fS, mid + 0.8, mid + 2, h0, true);
    var ref = sr == null ? mid + 0.25 : sr;
    D.push({
      mid: mid, sr: sr, ss: ss, ref: ref,
      dayLen: (ss != null && sr != null) ? ss - sr : 0.5,
      nightLen: (nr != null && ss != null) ? nr - ss : 0.5,
      st: stateAt(ref), p: localParts(ref, tz), wd: localParts(mid + 0.25, tz).wd,
      sunR: Math.floor(nirayanaSun(ref) / 30), hits: []
    });
  }
  /* मुहूर्त-आधारित पर्वों के लिए काल-खंड (एक क्षण नहीं, पूरी अवधि देखी जाती है) */
  function window_(d, at) {
    if (at === 'pradosh') return d.ss == null ? [d.ref, d.ref] : [d.ss, d.ss + 48 / 1440];
    if (at === 'nishith') return d.ss == null ? [d.mid + .72, d.mid + .78] : [d.ss + d.nightLen * 7 / 15, d.ss + d.nightLen * 8 / 15];
    if (at === 'midday') return [d.ref + d.dayLen * 2 / 5, d.ref + d.dayLen * 3 / 5];
    if (at === 'moonrise') { var m = crossing(fM, d.mid + 0.4, d.mid + 1, 0, true); return m == null ? [d.ss, d.ss + 1 / 24] : [m, m + 1 / 24]; }
    return [d.ref, d.ref];
  }
  function matches(s, f) { return !s.adhik && s.purnimanta === f.m && s.paksha === f.p && s.t === f.t; }

  for (k = 0; k < days; k++) {
    var d = D[k], prev = k > 0 ? D[k - 1] : null;
    /* eslint-disable no-loop-func */
    FEST.forEach(function (f) {
      var s = null, kshaya = false;
      if (f.at) {
        var w = window_(d, f.at), a = stateAt(w[0]), b = stateAt(w[1]);
        if (matches(a, f)) s = a; else if (matches(b, f)) s = b;
      } else if (matches(d.st, f)) {
        s = d.st;
      } else if (prev) {
        /* क्षय तिथि: जो तिथि किसी भी सूर्योदय को नहीं छूती, वह जिस दिन आरंभ हुई उसी दिन ली जाती है */
        var gap = (d.st.tn - prev.st.tn + 30) % 30;
        if (gap === 2) {
          var mid2 = stateAt((prev.ref + d.ref) / 2);
          if (matches(mid2, f)) { s = mid2; kshaya = true; }
        }
      }
      if (!s) return;
      var day = kshaya ? prev : d;
      var key = f.n + '|' + day.p.y;        /* दो दिन लगातार मिले तो पहला ही लिया जाता है */
      if (seen[key]) return;
      seen[key] = 1;
      day.hits.push({ f: f, s: s, kshaya: kshaya });
    });
    if (wantMonthly) MONTHLY.forEach(function (f) {
      if (d.st.paksha !== f.p || d.st.t !== f.t) return;
      if (d.hits.some(function (x) { return x.f.n === f.n; })) return;
      d.hits.push({ f: f, s: d.st });
    });
    if (prev && d.sunR !== prev.sunR) d.hits.push({ f: { n: SANKRANTI[d.sunR], k: 'सामान्य' }, s: d.st });
  }

  for (k = 0; k < days; k++) {
    var dd = D[k];
    for (i = 0; i < dd.hits.length; i++) {
      var x = dd.hits[i];
      out.push({
        jd: dd.mid, y: dd.p.y, m: dd.p.m, d: dd.p.d, wd: dd.wd,
        name: x.f.n, kind: x.f.k || 'सामान्य',
        note: (x.f.note || '') + (x.kshaya ? (x.f.note ? ' · ' : '') + 'क्षय तिथि — स्थानीय पंचांग से मिलान कर लें' : ''),
        tithi: (x.s.paksha === 'S' ? 'शुक्ल ' : 'कृष्ण ') + TITHI[x.s.tn],
        maas: MAAS[x.s.purnimanta] + (x.s.adhik ? ' (अधिक)' : '')
      });
    }
  }
  return out;
}

return {
  compute: compute, choghadiya: choghadiya, hora: hora, kaal: kaal,
  lagnaTable: lagnaTable, gochar: gochar, festivals: festivals,
  hhmm: hhmm, endLabel: endLabel, localParts: localParts, jdFromLocal: jdFromLocal,
  dayStamp: dayStamp, ascendant: ascendant, ayanamsa: ayanamsa, jde: jde,
  sunLon: sunLon, moonPos: moonPos, nirayanaSun: nirayanaSun, nirayanaMoon: nirayanaMoon,
  names: { TITHI: TITHI, NAKSHATRA: NAKSHATRA, YOGA: YOGA, VAAR: VAAR, RASHI: RASHI, MAAS: MAAS, MONTH_HI: MONTH_HI },
  CHO_NATURE: CHO_NATURE
};
})();
