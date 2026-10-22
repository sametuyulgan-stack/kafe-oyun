# 📒 Kafe Oyun: Proje Günlüğü

Bu dosya, projede şu ana kadar neleri yaptığımızı, hangi kararları neden aldığımızı ve
sırada ne olduğunu özetler. Her aşamanın sonunda güncellenecek.

---

## 1. Projenin amacı

Kafeler için web tabanlı bir oyun platformu. Müşteriler masadaki QR kodu okutur ve
uygulama indirmeden, telefonlarından tek başlarına ya da arkadaşlarıyla oynar.
İleride kafelere aylık abonelikle satılması düşünülüyor. Şimdilik hedef çalışan bir prototip.

---

## 2. Aldığımız kararlar

### Teknoloji
| Parça | Seçim | Neden |
|---|---|---|
| Sunucu | **Node.js** | Tek program kurmak yeterli. Hem sunucu hem telefon tarafı aynı dille (JavaScript) yazılıyor. |
| Anlık iletişim | **Socket.IO** | Biri cevap verince diğer telefonlar anında güncellenir. Bağlantı koparsa kendiliğinden yeniden bağlanır. |
| Telefon arayüzü | Düz HTML + CSS + JavaScript | Ek derleme adımı yok, basit. |
| Veri | **SQLite** (tek dosyalık veritabanı) | Ayrı bir veritabanı programı gerekmez; Node.js'in içinde hazır gelir. |
| Odalar | Sunucunun belleğinde | Geçici oldukları için diske yazılmaz, 3 saat hareketsiz kalınca silinir. |

### Kodun saklanması: GitHub
- Depo: https://github.com/sametuyulgan-stack/kafe-oyun
- Kod burada güvenle saklanır ve her değişikliğin geçmişi tutulur.
- Depo şu an **herkese açık (public)**. Şifreler koda yazılmadığı için sorun yok;
  istenirse GitHub ayarlarından **Private** yapılabilir.

### Uygulamanın çalıştırılması: Render (B seçeneği)
- Şirket laptopunda program kurma ve güvenlik duvarı izinleri sorun çıkarabileceği için
  uygulamayı kendi bilgisayarımızda değil, **internette ücretsiz bir sunucuda (Render)** çalıştırmaya karar verdik.
- Render, GitHub'daki kodu alıp çalıştırır ve bir internet adresi verir
  (ör. `https://kafe-oyun-xxxx.onrender.com`). Telefonlar bu adrese her yerden bağlanabilir.
- GitHub'a yeni kod gönderildiğinde Render siteyi kendiliğinden günceller.
- Ücretsiz planda site 15 dakika kullanılmazsa uyur; ilk açılış 30-60 saniye sürebilir.

### Şifreler ve hassas bilgiler
- Şifreler **asla koda yazılmaz**.
- Kendi bilgisayarda: `.env` adlı dosyada tutulur. Bu dosya GitHub'a gönderilmez.
  Örnek şablon: `.env.example`.
- Render'da: servis sayfasındaki **Environment** bölümüne girilir.
- İleride kafe şifreleri veritabanında karıştırılmış (hash'lenmiş) halde saklanacak.

### Kelime listeleri ve lisans
- Tüm sorular ve kelimeler bu proje için **elle hazırlandı**; lisans sorunu yok.
- TDK Sözlüğü telif hakkıyla korunduğu için kullanılmayacak.
- Günün Kelimesi'nde tahminlerin geçerli bir kelime olup olmadığını kontrol etmek için
  **Zemberek** sözlüğü (Apache 2.0 lisansı: ticari kullanıma izin verir, lisans notunun
  korunması şartıyla) değerlendirilecek. Aşama 3'te lisans kaynağından tekrar doğrulanacak.

### Çoklu kafeye hazırlık
- Her kafenin kendi adresi var: `/k/demo-kafe`.
- Kafe ayarları (kapalı oyunlar vb.) veritabanında kafeye özel tutuluyor.
- Şimdilik tek kafe var: **Demo Kafe**.

---

## 3. Aşamalar

| Aşama | İçerik | Durum |
|---|---|---|
| 1 | Oda sistemi + En Yakın Tahmin, Kim Daha?, Aynı Kafa, Ya Bunu Ya Şunu | ✅ Kodlandı, test bekliyor |
| 2 | Blöf, Casus Kim?, 2 Doğru 1 Yalan, Anlat Bakalım, Refleks, Karışık Gece | ⏳ |
| 3 | Adam Asmaca, Sayı Bulmaca, Günün Kelimesi, Hafıza Kartları + "Bugünün en iyileri" | ⏳ |
| 4 | İşletme modu (yönetim ekranı, kafe geneli yarışma) + TV ekranı | ⏳ |

---

## 4. Aşama 1'de yapılanlar

### Giriş ve oda sistemi
- Üyelik yok, sadece **takma ad** isteniyor (uygunsuz adlar engelleniyor).
- Ana sayfada **"Tek başına oyna"** ve **"Arkadaşlarınla oyna"** seçenekleri var.
  (Tek kişilik oyunlar Aşama 3'te gelecek.)
- **Oda kur** → 4 haneli kod, QR kod ve paylaşılabilir link oluşuyor.
- Diğerleri **kodla, linkle veya QR ile** katılıyor; isimler listede görünüyor.
- Odayı kuran kişi 👑 ile işaretli. Oyunu o seçip başlatıyor ve istenmeyen birini odadan çıkarabiliyor.
- Odayı kuran kişinin bağlantısı 45 saniyeden uzun koparsa yetki başka birine geçiyor.
- Telefon kilitlenir ya da sayfa yenilenirse oyuncu **kaldığı yere geri dönüyor**.
- Odalar **3 saat** hareketsiz kalınca otomatik siliniyor. Kişisel veri tutulmuyor.

### Oyun listesi
- Her oyunda etiketler var: kişi sayısı (👥 3+ kişi), süre (⏱ ~10 dk) ve tarz (🗣️ Masada konuşturur / 🤫 Sessiz ve hızlı).
- Odadaki kişi sayısına uymayan oyunlar **kilitli** görünüyor ("🔒 1 kişi daha lazım").
- Tur sayısı seçilebiliyor (ör. 3 / 5 / 8 tur).

### Her oyunda ortak olanlar
- İlk açılışta **"Nasıl oynanır?"** ekranı çıkıyor. Oyunu daha önce oynayan bu ekranı otomatik geçiyor.
- Geri sayım çubuğu var; süre dolunca tur kendiliğinden bitiyor.
- "Cevabın alındı ✓, diğerleri bekleniyor (2/3)" ekranı gösteriliyor.
- Sonuçlar **herkesin ekranında aynı anda** açılıyor.
- Her turdan sonra puan tablosu, oyunun sonunda kazanan ekranı 🏆 geliyor.
- Aynı odada **aynı soru tekrar gelmiyor**.
- Soruların cevapları telefonlara gönderilmiyor (kopya çekilemez).

### Oyunlar ve puanlama
| Oyun | Kişi | Nasıl puan alınır? | İçerik |
|---|---|---|---|
| 🎯 **En Yakın Tahmin** | 2+ | Cevaba en yakın tahmin 1 puan, tam isabet 2 puan. Tahminler en uzaktan en yakına tek tek açılır. | 50 soru |
| 👉 **Kim Daha?** | 3+ | En çok oy alan kişiyi seçenler 1 puan. Kendine oy verilemez, kimin kime oy verdiği gizli. | 48 soru |
| 🧠 **Aynı Kafa** | 3+ | En çok kişinin verdiği cevabı verenler 1 puan. "Çay" ile "cay" aynı sayılır. | 52 soru |
| ⚖️ **Ya Bunu Ya Şunu** | 2+ | Çoğunluğun seçimini doğru tahmin edenler 1 puan. Berabere biterse herkes 1 puan. | 50 soru |

### Küfür / hakaret filtresi
- Takma adları ve yazılan cevapları kontrol ediyor.
- "k.ü.f.ü.r", "kuuufur", rakamla yazma (4pt4l) gibi kaçamakları da yakalıyor.
- Masum kelimeleri yanlışlıkla engellememesine dikkat edildi ("sık sık", "hıyar", "sıkıştım" serbest).

### Tasarım
- Mor-pembe-turuncu renk geçişli, büyük düğmeli, telefona uygun bir görünüm.
- Arayüz tamamen Türkçe.

### Test
- 3 sanal telefonla 4 oyun baştan sona oynatıldı; hata çıkmadı.
- 7 otomatik test yazıldı (puanlama kuralları, Türkçe karşılaştırma, küfür filtresi, içerik sayısı).
  Hepsi geçiyor. Çalıştırmak için: `npm test`

---

## 5. Proje klasörleri

```
sunucu/          Sunucu tarafı
  index.js         Giriş noktası: web sayfaları + anlık bağlantı + QR kod
  odalar.js        Oda kurma/katılma, yeniden bağlanma, otomatik silme
  turluOyun.js     "Soru → herkes cevaplar → sonuç" akışının ortak motoru
  oyunKatalogu.js  oyunlar/ klasöründeki oyunları otomatik bulur
  metin.js         Türkçe karşılaştırma + küfür filtresi
  veritabani.js    SQLite: kafeler ve ayarları
genel/           Telefonda görünen ortak kısımlar
  index.html       Sayfa iskeleti
  stil.css         Tasarım (renkler en üstte)
  uygulama.js      Takma ad, ana sayfa, oda, lobi ekranları
  turlu-ekran.js   Ortak oyun ekranı (nasıl oynanır, bekleme, puan tablosu, final)
oyunlar/         HER OYUN AYRI KLASÖR
  <oyun>/bilgi.json    Ad, kişi sayısı, süre, tarz, "Nasıl oynanır?"
  <oyun>/kurallar.js   Puanlama (sunucuda çalışır)
  <oyun>/ekran.js      Telefon ekranı
  <oyun>/icerik.json   Sorular (telefona gönderilmez)
testler/         Otomatik testler
.env.example     Ayar/şifre dosyası şablonu
render.yaml      Render yayın ayarı
```

**Yeni oyun eklemek:** `oyunlar/` içine bu 4 dosyayı içeren yeni bir klasör koymak yeterli.

---

## 6. Şu an neredeyiz?

**Sıradaki adım:** Uygulamayı Render'da yayınlamak ve Aşama 1'i telefonlarla test etmek.

### Render'da yayınlama adımları
1. **https://render.com** → **Sign In** → **GitHub** ile giriş yap → **Authorize Render**.
2. **+ New** → **Web Service** → `kafe-oyun` deposunun yanında **Connect**.
3. Ayarlar:
   | Alan | Değer |
   |---|---|
   | Name | `kafe-oyun` |
   | Language | `Node` |
   | Branch | `main` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |
4. **Deploy Web Service** → 2-5 dakika bekle → üstte yeşil **Live** yazısı.
5. Verilen adresi (`https://kafe-oyun-xxxx.onrender.com`) bilgisayarda ve telefonlarda aç.

⚠️ Kredi kartı istenirse veya kırmızı hata çıkarsa durup Claude'a yaz.

### Aşama 1 test listesi (2-3 telefonla)
- [ ] Telefon A: takma ad → **Arkadaşlarınla oyna → Yeni oda kur**
- [ ] Telefon B: A'daki **QR kodu okutarak** katıl
- [ ] Telefon C: **4 haneli kodu yazarak** katıl; üç isim de listede görünüyor mu?
- [ ] Sadece 2 kişiyken "Kim Daha?" ve "Aynı Kafa" kilitli mi?
- [ ] 4 oyunun her birini bir kez oyna
- [ ] Aynı Kafa'da biri "Çay", diğeri "cay" yazsın: ikisi de puan almalı
- [ ] Takma ad olarak küfür yazmayı dene: engellenmeli
- [ ] Oyunun ortasında bir telefonda sayfayı yenile: aynı yere dönmeli

### Testten sonra
Onay verilince **Aşama 2**'ye geçilecek: Blöf, Casus Kim?, 2 Doğru 1 Yalan,
Anlat Bakalım, Refleks ve Karışık Gece modu.
