// Ya Bunu Ya Şunu: Herkes bir seçenek seçer ve çoğunluğun ne seçeceğini tahmin eder.

const SECENEKLER = ['a', 'b'];

module.exports = {
  cevapSuresi: 30,

  yeniTur({ sec }) {
    const [a, b] = sec();
    return { soru: { a, b }, gizli: {} };
  },

  cevapKontrol(veri) {
    if (!SECENEKLER.includes(veri?.secim) || !SECENEKLER.includes(veri?.tahmin)) {
      return { hata: 'Lütfen hem seçimini hem tahminini işaretle.' };
    }
    return { deger: { secim: veri.secim, tahmin: veri.tahmin } };
  },

  puanla({ soru, cevaplar }) {
    const kim = { a: [], b: [] };
    for (const [id, c] of Object.entries(cevaplar)) kim[c.secim].push(id);
    const cogunluk = kim.a.length === kim.b.length ? 'esit' : kim.a.length > kim.b.length ? 'a' : 'b';

    const puanlar = {};
    const bilenler = [];
    for (const [id, c] of Object.entries(cevaplar)) {
      if (cogunluk === 'esit' || c.tahmin === cogunluk) {
        puanlar[id] = 1;
        bilenler.push(id);
      }
    }
    return { sonuc: { a: soru.a, b: soru.b, kimA: kim.a, kimB: kim.b, cogunluk, bilenler }, puanlar };
  },
};
