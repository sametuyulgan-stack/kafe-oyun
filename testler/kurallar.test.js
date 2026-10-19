// Otomatik testler: "npm test" komutuyla çalışır.
const test = require('node:test');
const assert = require('node:assert');
const { sadelestir, uygunsuzMu } = require('../sunucu/metin');
const enYakin = require('../oyunlar/en-yakin-tahmin/kurallar');
const kimDaha = require('../oyunlar/kim-daha/kurallar');
const ayniKafa = require('../oyunlar/ayni-kafa/kurallar');
const yaBunu = require('../oyunlar/ya-bunu-ya-sunu/kurallar');

test('Türkçe sadeleştirme', () => {
  assert.equal(sadelestir('  ÇAY! '), 'cay');
  assert.equal(sadelestir('Iğdır'), 'igdir');
  assert.equal(sadelestir('Şeftali'), sadelestir('seftalı'));
});

test('Küfür filtresi', () => {
  for (const kotu of ['salak', 'S.İ.K.T.İ.R', 'oroooospu', '4pt4l']) assert.ok(uygunsuzMu(kotu), kotu);
  for (const iyi of ['Ahmet', 'sık sık kahve içerim', 'hıyar', 'Trafikte sıkıştım', 'Çay', 'Amasya']) assert.ok(!uygunsuzMu(iyi), iyi);
});

test('En Yakın Tahmin: sayı okuma ve puanlama', () => {
  assert.equal(enYakin.sayiOku('384.400'), 384400);
  assert.equal(enYakin.sayiOku('4,5'), 4.5);
  assert.equal(enYakin.sayiOku('1.234,5'), 1234.5);
  assert.ok(Number.isNaN(enYakin.sayiOku('çok')));
  const { sonuc, puanlar } = enYakin.puanla({ soru: { metin: '', birim: '' }, gizli: { cevap: 100 }, cevaplar: { a: 90, b: 100, c: 200 } });
  assert.deepEqual(puanlar, { b: 2 });
  assert.equal(sonuc.tahminler[0].id, 'c'); // en uzak önce açılır
});

test('Kim Daha?: çoğunluğa oy verenler puan alır, kendine oy yok', () => {
  assert.ok(kimDaha.cevapKontrol('a', { oyuncuId: 'a', soru: { adaylar: ['a', 'b'] } }).hata);
  const { puanlar } = kimDaha.puanla({ soru: { metin: '' }, cevaplar: { a: 'c', b: 'c', c: 'a' } });
  assert.deepEqual(puanlar, { a: 1, b: 1 });
});

test('Aynı Kafa: harf farkları aynı sayılır', () => {
  const { puanlar } = ayniKafa.puanla({ soru: { metin: '' }, cevaplar: { a: 'Çay', b: 'cay', c: 'Kahve' } });
  assert.deepEqual(puanlar, { a: 1, b: 1 });
  const hepsiFarkli = ayniKafa.puanla({ soru: { metin: '' }, cevaplar: { a: 'x', b: 'y', c: 'z' } });
  assert.deepEqual(hepsiFarkli.puanlar, {});
});

test('Ya Bunu Ya Şunu: doğru tahmin ve beraberlik', () => {
  const r = yaBunu.puanla({ soru: { a: 'Çay', b: 'Kahve' }, cevaplar: { a: { secim: 'a', tahmin: 'a' }, b: { secim: 'a', tahmin: 'b' }, c: { secim: 'b', tahmin: 'a' } } });
  assert.deepEqual(r.puanlar, { a: 1, c: 1 });
  const esit = yaBunu.puanla({ soru: { a: 'x', b: 'y' }, cevaplar: { a: { secim: 'a', tahmin: 'a' }, b: { secim: 'b', tahmin: 'a' } } });
  assert.deepEqual(esit.puanlar, { a: 1, b: 1 });
});

test('Her grup oyununda en az 40 içerik var', () => {
  for (const o of ['en-yakin-tahmin', 'kim-daha', 'ayni-kafa', 'ya-bunu-ya-sunu']) {
    assert.ok(require(`../oyunlar/${o}/icerik.json`).length >= 40, o);
  }
});
