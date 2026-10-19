// En Yakın Tahmin: Cevaba en yakın sayıyı tahmin eden puan alır.

// "384.400", "384400", "4,5" gibi Türkçe yazımları sayıya çevirir.
function sayiOku(veri) {
  let s = String(veri ?? '').replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,5
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');                // 384.400
  else s = s.replace(',', '.');                                                       // 4,5
  return Number(s);
}

module.exports = {
  cevapSuresi: 40,

  yeniTur({ sec }) {
    const s = sec();
    return { soru: { metin: s.soru, birim: s.birim || '' }, gizli: { cevap: s.cevap } };
  },

  cevapKontrol(veri) {
    const sayi = sayiOku(veri);
    if (!Number.isFinite(sayi)) return { hata: 'Lütfen sadece sayı yaz.' };
    if (Math.abs(sayi) > 1e12) return { hata: 'Bu sayı biraz fazla büyük! 🙂' };
    return { deger: sayi };
  },

  puanla({ soru, gizli, cevaplar }) {
    const tahminler = Object.entries(cevaplar).map(([id, tahmin]) => ({ id, tahmin, fark: Math.abs(tahmin - gizli.cevap) }));
    const enAzFark = Math.min(...tahminler.map(t => t.fark));
    const puanlar = {};
    for (const t of tahminler) {
      t.kazandi = t.fark === enAzFark;
      if (t.kazandi) puanlar[t.id] = t.fark === 0 ? 2 : 1;
    }
    // Uzaktan yakına sırala: ekranda bu sırayla tek tek açılacak
    tahminler.sort((a, b) => b.fark - a.fark);
    return { sonuc: { metin: soru.metin, birim: soru.birim, cevap: gizli.cevap, tahminler }, puanlar };
  },
};

module.exports.sayiOku = sayiOku;
