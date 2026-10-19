// "oyunlar/" klasöründeki her alt klasör bir oyundur. Bu dosya onları otomatik bulur.
// Her oyun klasöründe:
//   bilgi.json   -> adı, kişi sayısı, süresi, tarzı, "Nasıl oynanır?" metni
//   kurallar.js  -> sunucuda çalışan oyun mantığı (puanlama vb.)
//   ekran.js     -> telefonda görünen kısım
//   icerik.json  -> sorular / kelimeler (isteğe bağlı)

const fs = require('node:fs');
const path = require('node:path');

const OYUNLAR_KLASORU = path.join(__dirname, '..', 'oyunlar');

const oyunlar = new Map();

for (const klasor of fs.readdirSync(OYUNLAR_KLASORU, { withFileTypes: true })) {
  if (!klasor.isDirectory()) continue;
  const yol = path.join(OYUNLAR_KLASORU, klasor.name);
  const bilgi = JSON.parse(fs.readFileSync(path.join(yol, 'bilgi.json'), 'utf8'));
  bilgi.id = klasor.name;
  const icerikYolu = path.join(yol, 'icerik.json');
  const icerik = fs.existsSync(icerikYolu) ? JSON.parse(fs.readFileSync(icerikYolu, 'utf8')) : [];
  const kurallar = require(path.join(yol, 'kurallar.js'));
  oyunlar.set(bilgi.id, { bilgi, kurallar, icerik, ekranDosyasi: path.join(yol, 'ekran.js') });
}

function oyunGetir(id) {
  return oyunlar.get(id) || null;
}

// Telefona gönderilecek bilgiler (cevaplar ve içerik gönderilmez!)
function oyunListesi(kafe) {
  const kapali = new Set(kafe?.ayarlar?.kapaliOyunlar || []);
  return [...oyunlar.values()]
    .map(o => ({ ...o.bilgi, kapali: kapali.has(o.bilgi.id) }))
    .sort((a, b) => (a.sira ?? 99) - (b.sira ?? 99));
}

module.exports = { oyunGetir, oyunListesi };
