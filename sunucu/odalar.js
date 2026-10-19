// Oda sistemi. Odalar sadece sunucunun belleğinde tutulur (diske yazılmaz) ve
// belirli bir süre hareketsiz kalınca otomatik silinir. Kişisel veri tutulmaz:
// her oyuncu için sadece takma adı ve telefonun ürettiği rastgele bir anahtar bilinir.

const crypto = require('node:crypto');
const { metinKontrol, sadelestir } = require('./metin');
const { oyunGetir } = require('./oyunKatalogu');
const { kafeGetir } = require('./veritabani');
const { TurluOyun } = require('./turluOyun');

const ODA_OMRU_MS = Number(process.env.ODA_OMRU_SAAT || 3) * 60 * 60 * 1000;
const YONETICI_BEKLEME_MS = 45_000; // oda kurucusunun bağlantısı koparsa yetki bu süre sonra devredilir
const EN_FAZLA_OYUNCU = 12;

const odalar = new Map(); // kod -> Oda

class Oda {
  constructor(kod, kafeId, yayinla) {
    this.kod = kod;
    this.kafeId = kafeId;
    this.yayinla = yayinla; // (soketId, veri) -> telefona durum gönderir
    this.oyuncular = new Map(); // oyuncuId -> { id, anahtar, ad, soketler:Set }
    this.yoneticiId = null;
    this.oyun = null;
    this.kullanilanIcerik = new Map(); // oyunId -> Set(içerik sırası): aynı soru tekrar gelmesin
    this.sonHareket = Date.now();
    this.yoneticiZamanlayici = null;
  }

  bagliOyuncular() {
    return [...this.oyuncular.values()].filter(o => o.soketler.size > 0);
  }

  // Havuzdan bu odada daha önce çıkmamış bir içerik seçer. Hepsi bittiyse baştan başlar.
  icerikSec(oyunId, havuz) {
    let kullanilan = this.kullanilanIcerik.get(oyunId);
    if (!kullanilan || kullanilan.size >= havuz.length) {
      kullanilan = new Set();
      this.kullanilanIcerik.set(oyunId, kullanilan);
    }
    const bos = havuz.map((_, i) => i).filter(i => !kullanilan.has(i));
    const secilen = bos[crypto.randomInt(bos.length)];
    kullanilan.add(secilen);
    return havuz[secilen];
  }

  // Odadaki her telefona kendi görmesi gereken durumu gönderir.
  guncelle() {
    this.sonHareket = Date.now();
    for (const o of this.oyuncular.values()) {
      const veri = this.gorunum(o.id);
      for (const soketId of o.soketler) this.yayinla(soketId, veri);
    }
  }

  gorunum(oyuncuId) {
    return {
      ben: oyuncuId,
      oda: {
        kod: this.kod,
        kafeId: this.kafeId,
        yoneticiId: this.yoneticiId,
        oyuncular: [...this.oyuncular.values()].map(o => ({ id: o.id, ad: o.ad, bagli: o.soketler.size > 0 })),
      },
      oyun: this.oyun ? this.oyun.gorunum(oyuncuId) : null,
    };
  }

  // --- Oyuncu işlemleri ---
  oyuncuEkle(ad, anahtar) {
    const hata = metinKontrol(ad, { enAz: 2, enCok: 16, alanAdi: 'Takma ad' });
    if (hata) return { hata };
    ad = ad.trim();
    if ([...this.oyuncular.values()].some(o => sadelestir(o.ad) === sadelestir(ad))) {
      return { hata: 'Bu takma ad odada zaten var, başka bir ad seç.' };
    }
    if (this.oyuncular.size >= EN_FAZLA_OYUNCU) return { hata: `Oda dolu (en fazla ${EN_FAZLA_OYUNCU} kişi).` };
    const oyuncu = { id: crypto.randomUUID().slice(0, 8), anahtar, ad, soketler: new Set() };
    this.oyuncular.set(oyuncu.id, oyuncu);
    if (!this.yoneticiId) this.yoneticiId = oyuncu.id;
    return { oyuncu };
  }

  anahtarlaBul(anahtar) {
    return [...this.oyuncular.values()].find(o => o.anahtar === anahtar) || null;
  }

  baglan(oyuncu, soketId) {
    oyuncu.soketler.add(soketId);
    if (oyuncu.id === this.yoneticiId) clearTimeout(this.yoneticiZamanlayici);
    this.guncelle();
  }

  baglantiKoptu(oyuncu, soketId) {
    oyuncu.soketler.delete(soketId);
    if (oyuncu.soketler.size > 0) return;
    if (oyuncu.id === this.yoneticiId) {
      clearTimeout(this.yoneticiZamanlayici);
      this.yoneticiZamanlayici = setTimeout(() => this.yoneticiDevret(), YONETICI_BEKLEME_MS);
    }
    this.oyun?.oyuncuAyrildi(oyuncu.id);
    this.guncelle();
  }

  yoneticiDevret() {
    const yonetici = this.oyuncular.get(this.yoneticiId);
    if (yonetici && yonetici.soketler.size > 0) return;
    const yeni = this.bagliOyuncular()[0];
    if (yeni) {
      this.yoneticiId = yeni.id;
      this.guncelle();
    }
  }

  oyuncuCikar(oyuncuId) {
    const o = this.oyuncular.get(oyuncuId);
    if (!o) return;
    this.oyuncular.delete(oyuncuId);
    for (const soketId of o.soketler) this.yayinla(soketId, { cikarildi: true });
    if (this.yoneticiId === oyuncuId) this.yoneticiId = this.bagliOyuncular()[0]?.id ?? [...this.oyuncular.keys()][0] ?? null;
    this.oyun?.oyuncuAyrildi(oyuncuId);
    this.guncelle();
  }

  // --- Oyun işlemleri ---
  oyunBaslat(oyunId, secenekler = {}) {
    const oyun = oyunGetir(oyunId);
    if (!oyun || oyun.bilgi.tur !== 'grup') return { hata: 'Oyun bulunamadı.' };
    const kafe = kafeGetir(this.kafeId);
    if (kafe?.ayarlar.kapaliOyunlar.includes(oyunId)) return { hata: 'Bu oyun şu an kapalı.' };
    const kisi = this.bagliOyuncular().length;
    if (kisi < oyun.bilgi.enAz) return { hata: `Bu oyun için en az ${oyun.bilgi.enAz} kişi gerekli.` };
    if (oyun.bilgi.enCok && kisi > oyun.bilgi.enCok) return { hata: `Bu oyun en fazla ${oyun.bilgi.enCok} kişiyle oynanır.` };

    const izinliTurlar = oyun.bilgi.turSecenekleri || [5];
    const turSayisi = izinliTurlar.includes(secenekler.turSayisi) ? secenekler.turSayisi : (oyun.bilgi.varsayilanTur || izinliTurlar[0]);

    this.oyun?.kapat();
    const ctx = {
      bagliOyuncular: () => this.bagliOyuncular(),
      icerikSec: (id, havuz) => this.icerikSec(id, havuz),
      guncelle: () => this.guncelle(),
    };
    // Kendine özel akışı olan oyunlar kendi oturumunu kurabilir; diğerleri turlu motoru kullanır.
    this.oyun = oyun.kurallar.oturumKur
      ? oyun.kurallar.oturumKur(ctx, oyun, { turSayisi })
      : new TurluOyun(ctx, oyun, { turSayisi });
    this.oyun.baslat();
    this.guncelle();
    return {};
  }

  oyunBitir() {
    this.oyun?.kapat();
    this.oyun = null;
    this.guncelle();
  }

  kapat() {
    this.oyun?.kapat();
    clearTimeout(this.yoneticiZamanlayici);
  }
}

function yeniKod() {
  for (let deneme = 0; deneme < 1000; deneme++) {
    const kod = String(crypto.randomInt(1000, 10000));
    if (!odalar.has(kod)) return kod;
  }
  throw new Error('Boş oda kodu bulunamadı');
}

function odaKur(kafeId, yayinla) {
  const oda = new Oda(yeniKod(), kafeId, yayinla);
  odalar.set(oda.kod, oda);
  return oda;
}

function odaGetir(kod) {
  return odalar.get(String(kod)) || null;
}

// Eski odaları temizle: belirlenen süre boyunca hiçbir hareket olmayan oda silinir.
function eskiOdalariSil() {
  const simdi = Date.now();
  for (const [kod, oda] of odalar) {
    const bosVeEski = oda.bagliOyuncular().length === 0 && simdi - oda.sonHareket > 30 * 60 * 1000;
    if (simdi - oda.sonHareket > ODA_OMRU_MS || bosVeEski) {
      oda.kapat();
      odalar.delete(kod);
    }
  }
}
setInterval(eskiOdalariSil, 5 * 60 * 1000).unref();

module.exports = { odaKur, odaGetir, eskiOdalariSil, odalar };
