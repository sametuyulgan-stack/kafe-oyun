// "Turlu oyun" motoru: Soru gelir -> herkes gizlice cevaplar -> sonuçlar herkese aynı anda açılır.
// En Yakın Tahmin, Aynı Kafa, Kim Daha?, Ya Bunu Ya Şunu gibi oyunlar bu akışı kullanır.
// Oyunun kendisi sadece şu kuralları tanımlar (bkz. oyunlar/*/kurallar.js):
//   yeniTur({ sec, katilimcilar })       -> { soru, gizli }
//   cevapKontrol(veri, { oyuncuId, ... }) -> { deger } veya { hata }
//   puanla({ soru, gizli, cevaplar, ... }) -> { sonuc, puanlar }
//
// Akış (faz): 'nasil' (kurallar ekranı) -> 'cevap' -> 'sonuc' -> 'cevap' ... -> 'final'

const NASIL_SURESI_MS = 30_000;

class TurluOyun {
  constructor(ctx, oyun, secenekler) {
    this.ctx = ctx; // odayla konuşmak için yardımcılar (bkz. odalar.js)
    this.oyun = oyun;
    this.kurallar = oyun.kurallar;
    this.turSayisi = secenekler.turSayisi;
    this.faz = 'nasil';
    this.tur = 0;
    this.hazirlar = new Set();
    this.puanlar = {};
    this.turPuanlari = {};
    this.zamanlayici = null;
    this.bitis = 0;
  }

  baslat() {
    this.surBaslat(NASIL_SURESI_MS, () => this.yeniTur());
  }

  // --- Yardımcılar ---
  surBaslat(ms, fn) {
    clearTimeout(this.zamanlayici);
    this.bitis = Date.now() + ms;
    this.sureMs = ms;
    this.zamanlayici = setTimeout(fn, ms);
  }

  kapat() {
    clearTimeout(this.zamanlayici);
  }

  bagliKatilimcilar() {
    const bagli = new Set(this.ctx.bagliOyuncular().map(o => o.id));
    return this.katilimcilar.filter(id => bagli.has(id));
  }

  // --- Akış ---
  yeniTur() {
    this.tur += 1;
    this.katilimcilar = this.ctx.bagliOyuncular().map(o => o.id);
    const { soru, gizli } = this.kurallar.yeniTur({
      sec: () => this.ctx.icerikSec(this.oyun.bilgi.id, this.oyun.icerik),
      katilimcilar: this.katilimcilar,
    });
    this.soru = soru;
    this.gizli = gizli;
    this.cevaplar = new Map();
    this.sonuc = null;
    this.turPuanlari = {};
    this.faz = 'cevap';
    this.surBaslat((this.kurallar.cevapSuresi || 45) * 1000, () => this.turuBitir());
    this.ctx.guncelle();
  }

  turuBitir() {
    if (this.faz !== 'cevap') return;
    clearTimeout(this.zamanlayici);
    const { sonuc, puanlar } = this.kurallar.puanla({
      soru: this.soru,
      gizli: this.gizli,
      cevaplar: Object.fromEntries(this.cevaplar),
      katilimcilar: this.katilimcilar,
    });
    for (const [id, p] of Object.entries(puanlar || {})) {
      this.turPuanlari[id] = p;
      this.puanlar[id] = (this.puanlar[id] || 0) + p;
    }
    this.sonuc = sonuc;
    this.faz = 'sonuc';
    this.ctx.guncelle();
  }

  // Bir oyuncu bir şey yaptığında çağrılır. Hata varsa { hata } döner.
  aksiyon(oyuncuId, tip, veri, yoneticiMi) {
    if (tip === 'hazir' && this.faz === 'nasil') {
      this.hazirlar.add(oyuncuId);
      const herkesHazir = this.ctx.bagliOyuncular().every(o => this.hazirlar.has(o.id));
      if (herkesHazir || yoneticiMi && veri?.hemen) this.yeniTur();
      else this.ctx.guncelle();
      return {};
    }

    if (tip === 'cevap' && this.faz === 'cevap') {
      if (!this.katilimcilar.includes(oyuncuId)) return { hata: 'Bu tura sonradan katıldın, bir sonraki turu bekle.' };
      if (this.cevaplar.has(oyuncuId)) return { hata: 'Cevabını zaten verdin.' };
      const sonuc = this.kurallar.cevapKontrol(veri, { oyuncuId, katilimcilar: this.katilimcilar, soru: this.soru });
      if (sonuc.hata) return sonuc;
      this.cevaplar.set(oyuncuId, sonuc.deger);
      if (this.bagliKatilimcilar().every(id => this.cevaplar.has(id))) this.turuBitir();
      else this.ctx.guncelle();
      return {};
    }

    if (tip === 'sureyi-bitir' && yoneticiMi && this.faz === 'cevap') {
      this.turuBitir();
      return {};
    }

    if (tip === 'devam' && yoneticiMi && this.faz === 'sonuc') {
      if (this.tur < this.turSayisi) this.yeniTur();
      else {
        this.faz = 'final';
        this.ctx.guncelle();
      }
      return {};
    }

    return { hata: 'Bu işlem şu an yapılamaz.' };
  }

  // Bir oyuncu bağlantısı koptuğunda: kalan herkes cevap verdiyse beklemeyi bırak.
  oyuncuAyrildi() {
    if (this.faz === 'cevap' && this.bagliKatilimcilar().every(id => this.cevaplar.has(id))) this.turuBitir();
    if (this.faz === 'nasil' && this.ctx.bagliOyuncular().every(o => this.hazirlar.has(o.id))) this.yeniTur();
  }

  // Bir oyuncunun ekranında ne göreceği. Başkalarının cevapları sonuç fazına kadar gizlidir.
  gorunum(oyuncuId) {
    return {
      tur: 'turlu',
      oyunId: this.oyun.bilgi.id,
      faz: this.faz,
      turNo: this.tur,
      turSayisi: this.turSayisi,
      kalanMs: ['nasil', 'cevap'].includes(this.faz) ? Math.max(0, this.bitis - Date.now()) : null,
      sureMs: this.sureMs,
      hazirlar: [...this.hazirlar],
      soru: this.soru ?? null,
      katilimcilar: this.katilimcilar ?? [],
      cevaplayanlar: this.cevaplar ? [...this.cevaplar.keys()] : [],
      benimCevabim: this.cevaplar?.get(oyuncuId) ?? null,
      sonuc: this.faz === 'sonuc' ? this.sonuc : null,
      turPuanlari: this.turPuanlari,
      puanlar: this.puanlar,
    };
  }
}

module.exports = { TurluOyun };
