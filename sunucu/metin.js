// Metinlerle ilgili yardımcılar: Türkçe karşılaştırma ve küfür/hakaret filtresi.

const TURKCE_HARFLER = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

// "ÇAY ", "çay" ve "cay" gibi yazımları aynı hale getirir.
function sadelestir(metin) {
  return String(metin ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, h => TURKCE_HARFLER[h])
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Küfür filtresi -------------------------------------------------------
// Basit bir filtredir; her şeyi yakalayamaz ama yaygın olanları engeller.

// Metnin herhangi bir yerinde geçerse engellenir (yeterince uzun ve özel kökler).
const YASAK_KOKLER = [
  'orospu', 'siktir', 'sikeyim', 'sikerim', 'sikiyim', 'sikik', 'amina', 'amcik',
  'yarrak', 'pezevenk', 'kahpe', 'serefsiz', 'yavsak', 'kaltak', 'surtuk', 'fahise',
  'gerizekali', 'pust', 'gavat', 'dalyarak', 'kancik', 'ibne',
  'fuck', 'shit', 'bitch', 'bastard',
];

// Sadece tek başına kelime olarak geçerse engellenir (kısa olanlar, başka kelimelerin
// içinde yanlışlıkla yakalanmasınlar diye).
const YASAK_KELIMELER = [
  'amk', 'aq', 'mk', 'oc', 'pic', 'got', 'gotu', 'gotun', 'gotlek', 'sikim', 'yarak',
  'salak', 'aptal', 'ahmak', 'dangalak', 'dallama', 'angut', 'enayi', 'gerzek',
];

const RAKAM_HARF = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '€': 'e' };

function filtreIcinHazirla(metin) {
  const harfli = String(metin ?? '').replace(/[013457@$€]/g, k => RAKAM_HARF[k]);
  // "kuuufur" -> "kufur": art arda tekrar eden harfleri teke indir
  return sadelestir(harfli).replace(/([a-z])\1+/g, '$1');
}

const kokler = YASAK_KOKLER.map(k => filtreIcinHazirla(k));
const kelimeler = new Set(YASAK_KELIMELER.map(k => filtreIcinHazirla(k)));

function uygunsuzMu(metin) {
  const temiz = filtreIcinHazirla(metin);
  if (!temiz) return false;
  const parcalar = temiz.split(' ');
  if (parcalar.some(k => kelimeler.has(k))) return true;
  if (kokler.some(k => temiz.includes(k))) return true;
  // "s i k t i r" veya "s.i.k.t.i.r" gibi harflerin arasına boşluk koyma hilesini yakala
  const tekHarfler = parcalar.filter(k => k.length === 1).length;
  if (tekHarfler >= 3) {
    const bitisik = parcalar.join('');
    return kokler.some(k => bitisik.includes(k)) || kelimeler.has(bitisik);
  }
  return false;
}

// Kullanıcının yazdığı bir metni kontrol eder. Sorun varsa hata mesajı, yoksa null döner.
function metinKontrol(metin, { enAz = 1, enCok = 60, alanAdi = 'Metin' } = {}) {
  const t = String(metin ?? '').trim();
  if (t.length < enAz) return `${alanAdi} boş olamaz.`;
  if (t.length > enCok) return `${alanAdi} en fazla ${enCok} karakter olabilir.`;
  if (uygunsuzMu(t)) return 'Bu ifade uygun görünmüyor, lütfen başka bir şey yaz. 🙂';
  return null;
}

module.exports = { sadelestir, uygunsuzMu, metinKontrol };
