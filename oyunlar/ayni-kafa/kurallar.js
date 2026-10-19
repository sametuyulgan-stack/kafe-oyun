// Aynı Kafa: Herkes aklına gelen ilk cevabı yazar; çoğunlukla aynı cevabı verenler puan alır.

const { sadelestir, metinKontrol } = require('../../sunucu/metin');

module.exports = {
  cevapSuresi: 30,

  yeniTur({ sec }) {
    return { soru: { metin: `Akla gelen ilk ${sec()}?` }, gizli: {} };
  },

  cevapKontrol(veri) {
    const hata = metinKontrol(veri, { enCok: 30, alanAdi: 'Cevap' });
    if (hata) return { hata };
    if (!sadelestir(veri)) return { hata: 'Lütfen harflerle bir cevap yaz.' };
    return { deger: String(veri).trim() };
  },

  puanla({ soru, cevaplar }) {
    // Cevapları sadeleştirilmiş hallerine göre grupla ("Çay", "cay", "ÇAY" -> "cay")
    const gruplar = new Map();
    for (const [id, cevap] of Object.entries(cevaplar)) {
      const anahtar = sadelestir(cevap);
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, { yazi: cevap, kisiler: [] });
      gruplar.get(anahtar).kisiler.push(id);
    }
    const liste = [...gruplar.values()].sort((a, b) => b.kisiler.length - a.kisiler.length);
    const enCok = liste[0]?.kisiler.length || 0;

    const puanlar = {};
    for (const g of liste) {
      g.kazandi = enCok >= 2 && g.kisiler.length === enCok; // tek kişilik cevap "çoğunluk" sayılmaz
      if (g.kazandi) for (const id of g.kisiler) puanlar[id] = 1;
    }
    return { sonuc: { metin: soru.metin, gruplar: liste }, puanlar };
  },
};
