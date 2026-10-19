// Kalıcı veriler (kafeler, ayarlar, ileride skorlar) tek bir SQLite dosyasında tutulur.
// SQLite, Node.js'in içinde hazır gelir; ayrı bir veritabanı programı kurmak gerekmez.

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const VERI_KLASORU = path.join(__dirname, '..', 'veri');
fs.mkdirSync(VERI_KLASORU, { recursive: true });

const db = new DatabaseSync(process.env.VERITABANI_DOSYASI || path.join(VERI_KLASORU, 'kafe-oyun.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS kafeler (
    id       TEXT PRIMARY KEY,          -- adreste görünen kısa ad, ör. "demo-kafe"
    ad       TEXT NOT NULL,             -- ekranda görünen ad
    ayarlar  TEXT NOT NULL DEFAULT '{}' -- JSON: kapalı oyunlar vb.
  );
`);

// İlk çalıştırmada örnek kafeyi ekle
db.prepare(`INSERT OR IGNORE INTO kafeler (id, ad) VALUES (?, ?)`).run('demo-kafe', 'Demo Kafe');

function kafeGetir(id) {
  const satir = db.prepare('SELECT * FROM kafeler WHERE id = ?').get(String(id));
  if (!satir) return null;
  const ayarlar = { kapaliOyunlar: [], ...JSON.parse(satir.ayarlar) };
  return { id: satir.id, ad: satir.ad, ayarlar };
}

function kafeAyarKaydet(id, ayarlar) {
  db.prepare('UPDATE kafeler SET ayarlar = ? WHERE id = ?').run(JSON.stringify(ayarlar), id);
}

module.exports = { db, kafeGetir, kafeAyarKaydet };
