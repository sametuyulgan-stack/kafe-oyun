// Kim Daha?: Herkes odadaki birine gizlice oy verir. Çoğunlukla aynı kişiyi seçenler puan alır.

module.exports = {
  cevapSuresi: 30,

  yeniTur({ sec, katilimcilar }) {
    return { soru: { metin: `Grubumuzda kim ${sec()}?`, adaylar: katilimcilar }, gizli: {} };
  },

  cevapKontrol(veri, { oyuncuId, soru }) {
    if (veri === oyuncuId) return { hata: 'Kendine oy veremezsin! 😄' };
    if (!soru.adaylar.includes(veri)) return { hata: 'Lütfen listeden birini seç.' };
    return { deger: veri };
  },

  puanla({ soru, cevaplar }) {
    const sayim = {};
    for (const aday of Object.values(cevaplar)) sayim[aday] = (sayim[aday] || 0) + 1;
    const enCok = Math.max(0, ...Object.values(sayim));
    const kazananlar = Object.keys(sayim).filter(id => sayim[id] === enCok);

    const puanlar = {};
    for (const [oyuncuId, aday] of Object.entries(cevaplar)) {
      if (kazananlar.includes(aday)) puanlar[oyuncuId] = 1;
    }
    // Kimin kime oy verdiği gösterilmez, sadece kaç oy aldığı
    const oylar = Object.entries(sayim)
      .map(([id, sayi]) => ({ id, sayi, kazandi: kazananlar.includes(id) }))
      .sort((a, b) => b.sayi - a.sayi);
    return { sonuc: { metin: soru.metin, oylar, toplamOy: Object.keys(cevaplar).length }, puanlar };
  },
};
