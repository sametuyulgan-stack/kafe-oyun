// Sunucunun giriş noktası: web sayfalarını sunar ve telefonlarla anlık bağlantıyı yönetir.

// .env dosyası varsa ayarları (ve ileride şifreleri) oradan oku. Böylece hassas bilgiler koda yazılmaz.
try { process.loadEnvFile(); } catch { /* .env yoksa varsayılanlar kullanılır */ }

const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const { kafeGetir } = require('./veritabani');
const { oyunGetir, oyunListesi } = require('./oyunKatalogu');
const { metinKontrol } = require('./metin');
const { odaKur, odaGetir } = require('./odalar');

const PORT = Number(process.env.PORT || 3000);
const GENEL_KLASOR = path.join(__dirname, '..', 'genel');

const app = express();
app.set('trust proxy', true); // internette yayınlarken doğru adresi (https) görmek için
const sunucu = http.createServer(app);
const io = new Server(sunucu);

// --- Adres bulma: QR kodların telefonlardan açılabilecek bir adresi göstermesi gerekir ---
function yerelAgAdresi() {
  for (const arayuzler of Object.values(os.networkInterfaces())) {
    for (const a of arayuzler || []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return 'localhost';
}

function tabanAdres(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.get('host') || `localhost:${PORT}`;
  // Bilgisayarda "localhost" ile açıldıysa, telefonların ulaşabileceği yerel ağ adresini kullan
  if (/^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return `http://${yerelAgAdresi()}:${PORT}`;
  return `${req.protocol}://${host}`;
}

// --- Web sayfaları ---
app.get('/', (req, res) => res.redirect('/k/demo-kafe'));

app.get('/k/:kafeId', (req, res) => {
  if (!kafeGetir(req.params.kafeId)) return res.status(404).send('Kafe bulunamadı.');
  res.sendFile(path.join(GENEL_KLASOR, 'index.html'));
});

app.get('/api/kafe/:kafeId', (req, res) => {
  const kafe = kafeGetir(req.params.kafeId);
  if (!kafe) return res.status(404).json({ hata: 'Kafe bulunamadı.' });
  res.json({ kafe: { id: kafe.id, ad: kafe.ad }, oyunlar: oyunListesi(kafe), tabanAdres: tabanAdres(req) });
});

// Sadece oyunların ekran dosyası paylaşılır (içerik ve cevaplar telefona gönderilmez)
app.get('/oyunlar/:oyunId/ekran.js', (req, res) => {
  const oyun = oyunGetir(req.params.oyunId);
  if (!oyun) return res.sendStatus(404);
  res.sendFile(oyun.ekranDosyasi);
});

app.get('/qr.svg', async (req, res) => {
  const metin = String(req.query.metin || '').slice(0, 300);
  if (!metin) return res.sendStatus(400);
  const svg = await QRCode.toString(metin, { type: 'svg', margin: 1, color: { dark: '#2b1650', light: '#ffffff' } });
  res.type('image/svg+xml').send(svg);
});

app.use(express.static(GENEL_KLASOR));

// --- Anlık bağlantı (Socket.IO) ---
const yayinla = (soketId, veri) => io.to(soketId).emit('durum', veri);

io.on('connection', soket => {
  // Bu soketin bağlı olduğu oda ve oyuncu
  let oda = null;
  let oyuncu = null;

  const cevapla = (ack, veri) => typeof ack === 'function' && ack(veri);

  function odadanAyril() {
    if (oda && oyuncu) oda.baglantiKoptu(oyuncu, soket.id);
    oda = null;
    oyuncu = null;
  }

  function odayaGir(yeniOda, yeniOyuncu, ack) {
    odadanAyril();
    oda = yeniOda;
    oyuncu = yeniOyuncu;
    oda.baglan(oyuncu, soket.id);
    cevapla(ack, { ok: true, kod: oda.kod });
  }

  // Takma ad girilirken uygunluk kontrolü
  soket.on('ad:kontrol', ({ ad } = {}, ack) => {
    cevapla(ack, { hata: metinKontrol(ad, { enAz: 2, enCok: 16, alanAdi: 'Takma ad' }) });
  });

  soket.on('oda:kur', ({ kafeId, ad, anahtar } = {}, ack) => {
    if (!kafeGetir(kafeId)) return cevapla(ack, { hata: 'Kafe bulunamadı.' });
    if (typeof anahtar !== 'string' || anahtar.length < 16) return cevapla(ack, { hata: 'Geçersiz istek.' });
    const yeniOda = odaKur(kafeId, yayinla);
    const sonuc = yeniOda.oyuncuEkle(String(ad ?? ''), anahtar);
    if (sonuc.hata) return cevapla(ack, sonuc);
    odayaGir(yeniOda, sonuc.oyuncu, ack);
  });

  soket.on('oda:katil', ({ kod, ad, anahtar } = {}, ack) => {
    const hedef = odaGetir(kod);
    if (!hedef) return cevapla(ack, { hata: 'Bu kodla bir oda bulunamadı. Kodu kontrol et.' });
    if (typeof anahtar !== 'string' || anahtar.length < 16) return cevapla(ack, { hata: 'Geçersiz istek.' });
    // Aynı telefon daha önce bu odadaysa (sayfa yenilendi, telefon kilitlendi vb.) aynı oyuncu olarak dön
    const eski = hedef.anahtarlaBul(anahtar);
    if (eski) return odayaGir(hedef, eski, ack);
    const sonuc = hedef.oyuncuEkle(String(ad ?? ''), anahtar);
    if (sonuc.hata) return cevapla(ack, sonuc);
    odayaGir(hedef, sonuc.oyuncu, ack);
  });

  // Sadece daha önce girilmiş bir odaya geri dönmek için (yeni oyuncu oluşturmaz)
  soket.on('oda:don', ({ kod, anahtar } = {}, ack) => {
    const hedef = odaGetir(kod);
    const eski = hedef?.anahtarlaBul(anahtar);
    if (!eski) return cevapla(ack, { hata: 'Oda artık yok.' });
    odayaGir(hedef, eski, ack);
  });

  soket.on('oda:ayril', (_, ack) => {
    if (oda && oyuncu) oda.oyuncuCikar(oyuncu.id);
    oda = null;
    oyuncu = null;
    cevapla(ack, { ok: true });
  });

  // Aşağıdakiler sadece oda kurucusu (yönetici) içindir
  const yoneticiMi = () => oda && oyuncu && oda.yoneticiId === oyuncu.id;

  soket.on('oda:cikar', ({ oyuncuId } = {}, ack) => {
    if (!yoneticiMi()) return cevapla(ack, { hata: 'Sadece oda kurucusu yapabilir.' });
    if (oyuncuId === oyuncu.id) return cevapla(ack, { hata: 'Kendini çıkaramazsın.' });
    oda.oyuncuCikar(String(oyuncuId));
    cevapla(ack, { ok: true });
  });

  soket.on('oyun:baslat', ({ oyunId, turSayisi } = {}, ack) => {
    if (!yoneticiMi()) return cevapla(ack, { hata: 'Oyunu sadece oda kurucusu başlatabilir.' });
    cevapla(ack, oda.oyunBaslat(String(oyunId), { turSayisi: Number(turSayisi) }));
  });

  soket.on('oyun:bitir', (_, ack) => {
    if (!yoneticiMi()) return cevapla(ack, { hata: 'Sadece oda kurucusu yapabilir.' });
    oda.oyunBitir();
    cevapla(ack, { ok: true });
  });

  soket.on('oyun:aksiyon', ({ tip, veri } = {}, ack) => {
    if (!oda?.oyun || !oyuncu) return cevapla(ack, { hata: 'Şu an oyun yok.' });
    try {
      cevapla(ack, oda.oyun.aksiyon(oyuncu.id, String(tip), veri, yoneticiMi()) || {});
    } catch (hata) {
      console.error('Oyun hatası:', hata);
      cevapla(ack, { hata: 'Bir şeyler ters gitti.' });
    }
  });

  soket.on('disconnect', odadanAyril);
});

sunucu.listen(PORT, () => {
  console.log('\n🎲 Kafe Oyun çalışıyor!');
  console.log(`   Bu bilgisayardan:          http://localhost:${PORT}`);
  console.log(`   Aynı Wi-Fi'deki telefonlar: http://${yerelAgAdresi()}:${PORT}\n`);
});

module.exports = { sunucu };
