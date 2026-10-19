# 🎲 Kafe Oyun

Kafeler için web tabanlı oyun platformu. Müşteriler masadaki QR kodu okutur ve uygulama
indirmeden, telefonlarından tek başlarına ya da arkadaşlarıyla oynar.

## Durum

| Aşama | İçerik | Durum |
|---|---|---|
| 1 | Oda sistemi + En Yakın Tahmin, Kim Daha?, Aynı Kafa, Ya Bunu Ya Şunu | ✅ |
| 2 | Blöf, Casus Kim?, 2 Doğru 1 Yalan, Anlat Bakalım, Refleks, Karışık Gece | ⏳ |
| 3 | Tek kişilik oyunlar + "Bugünün en iyileri" | ⏳ |
| 4 | İşletme modu + TV ekranı | ⏳ |

## Klasörler

```
sunucu/        Sunucu: oda sistemi, bağlantılar, veritabanı, küfür filtresi
  index.js       giriş noktası (web sayfaları + anlık bağlantı)
  odalar.js      oda kurma/katılma, otomatik silme
  turluOyun.js   "soru → herkes cevaplar → sonuç" akışının ortak motoru
  metin.js       Türkçe karşılaştırma + küfür filtresi
  veritabani.js  SQLite (kafeler ve ayarları)
genel/         Telefonda görünen ortak sayfa, tasarım ve ekranlar
oyunlar/       HER OYUN AYRI BİR KLASÖR
  <oyun>/bilgi.json    adı, kişi sayısı, süresi, tarzı, "Nasıl oynanır?"
  <oyun>/kurallar.js   puanlama vb. (sunucuda çalışır)
  <oyun>/ekran.js      telefon ekranı
  <oyun>/icerik.json   sorular (telefona gönderilmez)
testler/       Otomatik testler (npm test)
```

**Yeni oyun eklemek:** `oyunlar/` içine yukarıdaki 4 dosyayı içeren yeni bir klasör koyun.
Sunucu yeniden başlatıldığında oyun listede kendiliğinden görünür.

## Kendi bilgisayarında çalıştırma (Windows)

1. https://nodejs.org adresinden **Node.js 22 (LTS)** indirip kurun.
   Yönetici izni yoksa aynı sayfadaki "Windows Binary (.zip)" sürümünü bir klasöre açabilirsiniz.
2. Projeyi indirin: GitHub sayfasında **Code → Download ZIP**, sonra ZIP'i bir klasöre açın.
3. Klasörün içinde boş bir yere **Shift + sağ tık → "Terminalde aç"** (veya PowerShell).
4. Şu iki komutu yazın:
   ```
   npm install
   npm start
   ```
5. Tarayıcıda `http://localhost:3000` adresini açın.
6. Aynı Wi-Fi'deki telefonlarda, terminalde yazan `http://192.168.x.x:3000` adresini açın.
   (Windows "Güvenlik duvarı izni" sorarsa "Özel ağlar"a izin verin. Şirket bilgisayarında bu
   izin verilmeyebilir; o durumda aşağıdaki internette yayın yolunu kullanın.)

## İnternette ücretsiz yayınlama (Render)

1. https://render.com adresinde GitHub hesabınızla giriş yapın.
2. **New → Blueprint** seçin, `kafe-oyun` deposunu seçin ve onaylayın.
   (`render.yaml` dosyası gerekli ayarları içerir.)
3. Birkaç dakika sonra `https://kafe-oyun-xxxx.onrender.com` gibi bir adres verilir.
   Telefonlar bu adresi her yerden açabilir.

Not: Ücretsiz planda site 15 dakika kullanılmazsa uyur; ilk açılış 30-60 saniye sürebilir.
Ayrıca ücretsiz planda veritabanı dosyası her yeni yayında sıfırlanır (prototip için sorun değil).

## Ayarlar ve şifreler

Ayarlar koda yazılmaz, **ortam değişkenleri** ile verilir:
- Kendi bilgisayarınızda: `.env.example` dosyasını kopyalayıp adını `.env` yapın ve doldurun.
  `.env` dosyası GitHub'a gönderilmez (`.gitignore` içinde).
- Render'da: Servis sayfası → **Environment** bölümünden eklenir.

## İçerik ve lisans

Tüm soru ve kelime listeleri bu proje için elle hazırlanmıştır; dışarıdan kopyalanmamıştır.
