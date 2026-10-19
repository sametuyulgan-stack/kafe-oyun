// Telefonda çalışan ana uygulama: takma ad, ana sayfa, oda kurma/katılma, lobi ve oyun ekranı.
// Her oyunun kendi ekranı oyunlar/<oyun>/ekran.js dosyasındadır ve KafeOyun.kaydet() ile eklenir.

(() => {
  const kafeId = decodeURIComponent(location.pathname.split('/')[2] || 'demo-kafe');
  const parametreler = new URLSearchParams(location.search);

  // --- Telefonun hafızası (sadece bu cihazda kalır) ---
  const depo = {
    al(k) { try { return localStorage.getItem('kafeoyun:' + k); } catch { return null; } },
    koy(k, v) { try { localStorage.setItem('kafeoyun:' + k, v); } catch { /* gizli sekme vb. */ } },
    sil(k) { try { localStorage.removeItem('kafeoyun:' + k); } catch { /* yok say */ } },
  };

  // Bu telefona özel rastgele anahtar: sayfa yenilense de aynı oyuncu olarak odaya dönmeyi sağlar
  let anahtar = depo.al('anahtar');
  if (!anahtar || anahtar.length < 16) {
    anahtar = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    depo.koy('anahtar', anahtar);
  }

  // Linkle farklı bir odaya gelindiyse eski odaya otomatik dönmeye çalışma
  if (parametreler.get('oda') && parametreler.get('oda') !== depo.al('oda')) depo.sil('oda');

  const durum = {
    ekran: 'yukleniyor', // ad | ana | grup | tek | oda
    ad: depo.al('ad') || '',
    kafe: null,
    oyunlar: [],
    tabanAdres: location.origin,
    sunucu: null,        // sunucudan gelen oda durumu
    seciliOyun: null,
    turSayisi: null,
    bekleyenKod: parametreler.get('oda'),
  };

  const kok = document.getElementById('uygulama');
  const soket = io();

  // --- Yardımcılar ---
  const kacis = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RENKLER = ['#6a3df0', '#ff4f9a', '#ff9a3c', '#1fc98b', '#3aa8ff', '#e0457b', '#8f5bff', '#11a8a0', '#f2a100', '#5b6cff'];
  function renk(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return RENKLER[h % RENKLER.length];
  }
  function oyuncuBul(id) {
    return durum.sunucu?.oda.oyuncular.find(o => o.id === id) || { id, ad: '?', bagli: false };
  }
  function avatar(id, buyuk) {
    const o = oyuncuBul(id);
    return `<span class="avatar${buyuk ? ' buyuk' : ''}" style="background:${renk(id)}">${kacis(o.ad.charAt(0).toLocaleUpperCase('tr'))}</span>`;
  }
  function etiket(id) {
    return `<span class="oyuncu">${avatar(id)}${kacis(oyuncuBul(id).ad)}</span>`;
  }

  let bildirimZamani;
  function bildir(metin) {
    const el = document.getElementById('bildirim');
    el.textContent = metin;
    el.classList.add('goster');
    clearTimeout(bildirimZamani);
    bildirimZamani = setTimeout(() => el.classList.remove('goster'), 3000);
  }

  // Sunucuya istek gönderir ve cevabı bekler
  function istek(olay, veri) {
    return new Promise(coz => {
      soket.timeout(8000).emit(olay, veri, (zamanAsimi, cevap) => {
        coz(zamanAsimi ? { hata: 'Sunucuya ulaşılamadı, bağlantını kontrol et.' } : (cevap || {}));
      });
    });
  }

  function git(ekran) {
    durum.ekran = ekran;
    ciz();
    window.scrollTo(0, 0);
  }

  // --- Oyun ekranlarının kaydı ---
  const ekranlar = {};
  window.KafeOyun = {
    kaydet(oyunId, ekran) { ekranlar[oyunId] = ekran; if (durum.sunucu?.oyun?.oyunId === oyunId) ciz(); },
    yardimci: { kacis, avatar, etiket, oyuncuBul, renk, bildir, depo },
  };

  // --- Ekranlar ---
  function logo() {
    return `<div class="logo"><h1>🎲 Kafe Oyun</h1><small>${kacis(durum.kafe?.ad || '')}</small></div>`;
  }

  function adEkrani() {
    kok.innerHTML = `${logo()}
      <form class="kart" id="ad-formu">
        <h2>Merhaba! 👋</h2>
        <p>Üyelik yok, sadece oyunda görünecek bir takma ad seç.</p>
        <input id="ad" maxlength="16" autocomplete="nickname" placeholder="Takma adın" value="${kacis(durum.ad)}">
        <div class="hata" id="hata"></div>
        <button class="dugme">Devam ➜</button>
      </form>`;
    const girdi = kok.querySelector('#ad');
    girdi.focus();
    kok.querySelector('#ad-formu').onsubmit = async e => {
      e.preventDefault();
      const ad = girdi.value.trim();
      const cevap = await istek('ad:kontrol', { ad });
      if (cevap.hata) { kok.querySelector('#hata').textContent = cevap.hata; return; }
      durum.ad = ad;
      depo.koy('ad', ad);
      if (durum.bekleyenKod) return odayaKatil(durum.bekleyenKod);
      git('ana');
    };
  }

  function anaEkran() {
    kok.innerHTML = `${logo()}
      <div class="kart orta">
        <h2>Selam ${kacis(durum.ad)}! 🎉</h2>
        <p>Bugün nasıl oynamak istersin?</p>
        <button class="dugme buyuk mavi" id="tek">🧩 Tek başına oyna<span class="alt">Bulmacalar ve günün kelimesi</span></button>
        <button class="dugme buyuk" id="grup">👯 Arkadaşlarınla oyna<span class="alt">Oda kur ya da kodla katıl</span></button>
        <button class="dugme hayalet kucuk" id="ad-degistir">✏️ Takma adı değiştir</button>
      </div>`;
    kok.querySelector('#tek').onclick = () => git('tek');
    kok.querySelector('#grup').onclick = () => git('grup');
    kok.querySelector('#ad-degistir').onclick = () => git('ad');
  }

  function tekEkrani() {
    kok.innerHTML = `${logo()}
      <div class="kart orta">
        <p class="buyuk-emoji">🛠️</p>
        <h2>Çok yakında!</h2>
        <p>Tek kişilik oyunlar (Adam Asmaca, Sayı Bulmaca, Günün Kelimesi, Hafıza Kartları) bir sonraki aşamada eklenecek.</p>
        <button class="dugme hayalet" id="geri">⬅ Geri</button>
      </div>`;
    kok.querySelector('#geri').onclick = () => git('ana');
  }

  function grupEkrani() {
    kok.innerHTML = `${logo()}
      <div class="kart orta">
        <h2>Oda kur</h2>
        <p>Odayı sen kurarsan oyunları da sen seçersin.</p>
        <button class="dugme" id="kur">✨ Yeni oda kur</button>
      </div>
      <form class="kart orta" id="katil-formu">
        <h2>Odaya katıl</h2>
        <p>Arkadaşının ekranındaki 4 haneli kodu yaz.</p>
        <input class="kod" id="kod" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="····" autocomplete="off" value="${kacis(durum.bekleyenKod || '')}">
        <div class="hata" id="hata"></div>
        <button class="dugme mavi">Katıl ➜</button>
      </form>
      <button class="dugme hayalet" id="geri">⬅ Geri</button>`;
    kok.querySelector('#geri').onclick = () => git('ana');
    kok.querySelector('#kur').onclick = async e => {
      e.target.disabled = true;
      const cevap = await istek('oda:kur', { kafeId, ad: durum.ad, anahtar });
      e.target.disabled = false;
      if (cevap.hata) return bildir(cevap.hata);
      odaKaydet(cevap.kod);
    };
    kok.querySelector('#katil-formu').onsubmit = e => {
      e.preventDefault();
      odayaKatil(kok.querySelector('#kod').value.trim());
    };
  }

  async function odayaKatil(kod) {
    if (!/^\d{4}$/.test(String(kod))) {
      durum.bekleyenKod = null;
      git('grup');
      return bildir('Oda kodu 4 haneli bir sayı olmalı.');
    }
    const cevap = await istek('oda:katil', { kod, ad: durum.ad, anahtar });
    if (cevap.hata) {
      durum.bekleyenKod = kod;
      if (durum.ekran !== 'grup') git('grup');
      const hataAlani = kok.querySelector('#hata');
      if (hataAlani) hataAlani.textContent = cevap.hata; else bildir(cevap.hata);
      if (/takma ad/i.test(cevap.hata)) setTimeout(() => git('ad'), 1500);
      return;
    }
    odaKaydet(cevap.kod);
  }

  function odaKaydet(kod) {
    durum.bekleyenKod = null;
    depo.koy('oda', kod);
    // Adres çubuğunda oda kodunu tut: sayfa yenilenince odaya dönülür
    history.replaceState(null, '', `/k/${encodeURIComponent(kafeId)}?oda=${kod}`);
  }

  async function odadanCik() {
    if (!confirm('Odadan çıkmak istediğine emin misin?')) return;
    await istek('oda:ayril');
    odaTemizle();
    git('ana');
  }

  function odaTemizle() {
    depo.sil('oda');
    durum.sunucu = null;
    durum.seciliOyun = null;
    history.replaceState(null, '', `/k/${encodeURIComponent(kafeId)}`);
  }

  // --- Oda ekranı (lobi veya oyun) ---
  function odaEkrani() {
    const { oda, oyun, ben } = durum.sunucu;
    const yonetici = oda.yoneticiId === ben;
    const ust = `
      <div class="ust-bar">
        <span class="rozet">🔑 ${kacis(oda.kod)}</span>
        <span class="rozet">👥 ${oda.oyuncular.filter(o => o.bagli).length}</span>
        <span class="bosluk"></span>
        ${oyun && yonetici ? '<button class="dugme kucuk" id="oyunu-bitir">⏹ Bitir</button>' : ''}
        <button class="dugme kucuk" id="cik">🚪 Çık</button>
      </div>`;

    if (!oyun) return lobiEkrani(ust, yonetici);

    // Oyun ekranı: üst bar her seferinde yenilenir, oyun alanını oyunun kendi ekranı yönetir
    if (!kok.querySelector('#oyun-alani')) {
      kok.innerHTML = '<div id="ust-alan"></div><div id="oyun-alani"></div>';
    }
    kok.querySelector('#ust-alan').innerHTML = ust;
    baglaUst();
    const alan = kok.querySelector('#oyun-alani');
    const ekran = ekranlar[oyun.oyunId];
    if (!ekran) { alan.innerHTML = '<div class="kart orta">Oyun yükleniyor…</div>'; return; }
    ekran.ciz(alan, oyunBaglami());
  }

  function oyunBaglami() {
    const { oda, oyun, ben } = durum.sunucu;
    return {
      v: oyun,
      oda,
      ben,
      yonetici: oda.yoneticiId === ben,
      bilgi: durum.oyunlar.find(o => o.id === oyun.oyunId) || {},
      async gonder(tip, veri) {
        const cevap = await istek('oyun:aksiyon', { tip, veri });
        if (cevap.hata) bildir(cevap.hata);
        return cevap;
      },
      async tekrarOyna() {
        const cevap = await istek('oyun:baslat', { oyunId: oyun.oyunId, turSayisi: oyun.turSayisi });
        if (cevap.hata) bildir(cevap.hata);
      },
      async lobiyeDon() {
        await istek('oyun:bitir');
      },
      ...window.KafeOyun.yardimci,
    };
  }

  function baglaUst() {
    kok.querySelector('#cik').onclick = odadanCik;
    const bitir = kok.querySelector('#oyunu-bitir');
    if (bitir) bitir.onclick = async () => {
      if (confirm('Oyunu bitirip lobiye dönmek istiyor musun?')) await istek('oyun:bitir');
    };
  }

  function lobiEkrani(ust, yonetici) {
    const { oda, ben } = durum.sunucu;
    const link = `${durum.tabanAdres}/k/${encodeURIComponent(kafeId)}?oda=${oda.kod}`;
    const kisi = oda.oyuncular.filter(o => o.bagli).length;
    const oyunlar = durum.oyunlar.filter(o => o.tur === 'grup' && !o.kapali);
    const kurucu = oyuncuBul(oda.yoneticiId);

    const oyunKartlari = oyunlar.map(o => {
      const yetersiz = kisi < o.enAz;
      const fazla = o.enCok && kisi > o.enCok;
      const secili = durum.seciliOyun === o.id;
      const kisiYazi = o.enCok ? `${o.enAz}-${o.enCok} kişi` : `${o.enAz}+ kişi`;
      const tarz = o.tarz === 'sessiz'
        ? '<span class="etiket sessiz">🤫 Sessiz ve hızlı</span>'
        : '<span class="etiket konusturur">🗣️ Masada konuşturur</span>';
      const turlar = (o.turSecenekleri || []).map(t =>
        `<button class="secenek${(durum.turSayisi || o.varsayilanTur) === t ? ' secili' : ''}" data-tur="${t}">${t} tur</button>`).join('');
      return `
        <button class="oyun-karti${secili ? ' secili' : ''}" data-oyun="${o.id}" ${yetersiz || fazla || !yonetici ? 'disabled' : ''}>
          <div class="ust"><span class="emoji">${o.emoji}</span><h3>${kacis(o.ad)}</h3></div>
          <div class="etiketler">
            <span class="etiket">👥 ${kisiYazi}</span>
            <span class="etiket">⏱ ${kacis(o.sure)}</span>
            ${tarz}
            ${yetersiz ? `<span class="etiket kilit">🔒 ${o.enAz - kisi} kişi daha lazım</span>` : ''}
            ${fazla ? '<span class="etiket kilit">🔒 Kişi sayısı fazla</span>' : ''}
          </div>
        </button>
        ${secili ? `<div class="kart">
            ${turlar ? `<strong>Kaç tur?</strong><div class="secenekler">${turlar}</div>` : ''}
            <button class="dugme yesil" id="baslat">▶ ${kacis(o.ad)} başlasın!</button>
          </div>` : ''}`;
    }).join('');

    kok.innerHTML = `${ust}
      <div class="kart orta">
        <p class="ipucu">Arkadaşların bu kodla katılabilir</p>
        <p class="oda-kodu">${kacis(oda.kod)}</p>
        <img class="qr" src="/qr.svg?metin=${encodeURIComponent(link)}" alt="Odaya katılım QR kodu">
        <div class="paylas">
          <button class="dugme kucuk mavi" id="paylas">🔗 Linki paylaş</button>
        </div>
      </div>
      <div class="kart">
        <h3>Odadakiler (${oda.oyuncular.length})</h3>
        <div class="oyuncular">
          ${oda.oyuncular.map(o => `
            <span class="oyuncu${o.bagli ? '' : ' kopuk'}">${avatar(o.id)}${kacis(o.ad)}${o.id === oda.yoneticiId ? ' 👑' : ''}${o.id === ben ? ' (sen)' : ''}
              ${yonetici && o.id !== ben ? `<button class="x" data-cikar="${o.id}" aria-label="${kacis(o.ad)} adlı oyuncuyu çıkar">✕</button>` : ''}
            </span>`).join('')}
        </div>
      </div>
      <div class="kart">
        <h3>Oyunlar</h3>
        <p class="ipucu">${yonetici ? 'Bir oyun seç ve başlat.' : `Oyunu ${kacis(kurucu.ad)} 👑 seçecek.`}</p>
        ${oyunKartlari}
      </div>`;

    baglaUst();
    kok.querySelector('#paylas').onclick = async () => {
      const metin = `Kafe Oyun odama katıl! Kod: ${oda.kod}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Kafe Oyun', text: metin, url: link }); } catch { /* vazgeçildi */ }
      } else {
        try { await navigator.clipboard.writeText(link); bildir('Link kopyalandı!'); } catch { prompt('Linki kopyala:', link); }
      }
    };
    kok.querySelectorAll('[data-cikar]').forEach(b => b.onclick = async () => {
      const o = oyuncuBul(b.dataset.cikar);
      if (!confirm(`${o.ad} odadan çıkarılsın mı?`)) return;
      const c = await istek('oda:cikar', { oyuncuId: o.id });
      if (c.hata) bildir(c.hata);
    });
    kok.querySelectorAll('[data-oyun]').forEach(b => b.onclick = () => {
      durum.seciliOyun = durum.seciliOyun === b.dataset.oyun ? null : b.dataset.oyun;
      durum.turSayisi = null;
      ciz();
    });
    kok.querySelectorAll('[data-tur]').forEach(b => b.onclick = () => {
      durum.turSayisi = Number(b.dataset.tur);
      ciz();
    });
    const baslat = kok.querySelector('#baslat');
    if (baslat) baslat.onclick = async () => {
      baslat.disabled = true;
      const o = durum.oyunlar.find(x => x.id === durum.seciliOyun);
      const cevap = await istek('oyun:baslat', { oyunId: o.id, turSayisi: durum.turSayisi || o.varsayilanTur });
      baslat.disabled = false;
      if (cevap.hata) bildir(cevap.hata);
    };
  }

  // --- Ana çizim fonksiyonu: duruma göre doğru ekranı gösterir ---
  function ciz() {
    if (durum.ekran !== 'oda') kok.querySelector('#oyun-alani')?.remove();
    switch (durum.ekran) {
      case 'yukleniyor': kok.innerHTML = '<div class="kart orta">Yükleniyor…</div>'; break;
      case 'ad': adEkrani(); break;
      case 'ana': anaEkran(); break;
      case 'tek': tekEkrani(); break;
      case 'grup': grupEkrani(); break;
      case 'oda': odaEkrani(); break;
    }
  }

  // --- Sunucudan gelen olaylar ---
  soket.on('durum', veri => {
    if (veri.cikarildi) {
      odaTemizle();
      git('ana');
      return bildir('Oda kurucusu seni odadan çıkardı.');
    }
    const oncekiOyun = durum.sunucu?.oyun?.oyunId;
    durum.sunucu = veri;
    if (veri.oyun && veri.oyun.oyunId !== oncekiOyun) kok.innerHTML = '';
    if (!veri.oyun && oncekiOyun) { kok.innerHTML = ''; durum.seciliOyun = null; }
    // Geri sayım için: sunucunun söylediği kalan süreyi bu telefonun saatine çevir
    if (veri.oyun?.kalanMs != null) KafeOyun.bitis = Date.now() + veri.oyun.kalanMs;
    durum.ekran = 'oda';
    ciz();
  });

  // Bağlantı kurulduğunda (veya koptuktan sonra yeniden kurulduğunda) odaya geri dön
  soket.on('connect', async () => {
    const kod = depo.al('oda');
    if (!kod) return;
    const cevap = await istek('oda:don', { kod, anahtar });
    if (cevap.hata) {
      const odadaydi = durum.ekran === 'oda';
      odaTemizle();
      if (!['oda', 'yukleniyor'].includes(durum.ekran) || !durum.kafe) return;
      if (durum.ad && durum.bekleyenKod) return odayaKatil(durum.bekleyenKod);
      git(durum.ad ? 'ana' : 'ad');
      if (odadaydi) bildir('Oda kapanmış.');
    }
  });
  soket.on('disconnect', () => bildir('Bağlantı koptu, yeniden bağlanılıyor…'));

  // Geri sayım çubuklarını her çeyrek saniyede güncelle
  setInterval(() => {
    const kalan = Math.max(0, (KafeOyun.bitis || 0) - Date.now());
    document.querySelectorAll('[data-sure]').forEach(el => {
      const toplam = Number(el.dataset.sure) || 1;
      el.style.width = `${Math.min(100, (kalan / toplam) * 100)}%`;
    });
    document.querySelectorAll('[data-kalan]').forEach(el => { el.textContent = Math.ceil(kalan / 1000); });
  }, 250);

  // --- Başlangıç: kafe bilgilerini ve oyun ekranlarını yükle ---
  (async () => {
    try {
      const cevap = await fetch(`/api/kafe/${encodeURIComponent(kafeId)}`).then(r => r.json());
      if (cevap.hata) throw new Error(cevap.hata);
      durum.kafe = cevap.kafe;
      durum.oyunlar = cevap.oyunlar;
      durum.tabanAdres = cevap.tabanAdres;
      document.title = `${cevap.kafe.ad} · Kafe Oyun`;
      for (const o of cevap.oyunlar) {
        const s = document.createElement('script');
        s.src = `/oyunlar/${encodeURIComponent(o.id)}/ekran.js`;
        document.body.appendChild(s);
      }
    } catch {
      kok.innerHTML = '<div class="kart orta"><h2>Bir sorun oldu 😕</h2><p>Sayfa yüklenemedi. Biraz sonra tekrar dene.</p></div>';
      return;
    }
    if (durum.ekran === 'oda') return ciz(); // bu arada odaya geri dönülmüş olabilir
    if (!durum.ad) git('ad');
    else if (durum.bekleyenKod && !depo.al('oda')) odayaKatil(durum.bekleyenKod);
    else git(depo.al('oda') ? 'yukleniyor' : 'ana');
  })();
})();
