// Turlu oyunların ortak ekranı: "Nasıl oynanır?", geri sayım, bekleme listesi, puan tablosu, final.
// Oyunun kendi ekran dosyası sadece soruyu, cevap alanını ve sonucu çizer:
//   soru(ctx)                  -> soru + cevap alanı (HTML)
//   bagla(alan, ctx, gonder)   -> cevap alanına tıklama vb. davranışları ekler; gonder(deger) cevabı yollar
//   cevabim(ctx)               -> (isteğe bağlı) cevap verdikten sonra kendi cevabının özeti (HTML)
//   sonuc(ctx)                 -> tur sonucu (HTML)
//   sonucBagla(alan, ctx)      -> (isteğe bağlı) sonuç animasyonları

(() => {
  const { kacis, avatar, oyuncuBul, depo } = KafeOyun.yardimci;

  function ustBilgi(ctx, sureVar) {
    const { v, bilgi } = ctx;
    return `
      <div class="ust-bar">
        <span class="rozet">${bilgi.emoji || '🎲'} ${kacis(bilgi.ad || '')}</span>
        ${v.turNo ? `<span class="rozet">Tur ${v.turNo}/${v.turSayisi}</span>` : ''}
        ${sureVar ? `<span class="rozet">⏱ <span data-kalan>${Math.ceil((v.kalanMs || 0) / 1000)}</span> sn</span>` : ''}
      </div>
      ${sureVar ? `<div class="sure"><div data-sure="${v.sureMs}"></div></div>` : ''}`;
  }

  function skorTablosu(ctx, turPuaniGoster) {
    const { v, oda } = ctx;
    const idler = new Set([...oda.oyuncular.map(o => o.id), ...Object.keys(v.puanlar)]);
    const satirlar = [...idler]
      .map(id => ({ id, puan: v.puanlar[id] || 0, arti: v.turPuanlari[id] || 0 }))
      .sort((a, b) => b.puan - a.puan);
    return `<ul class="skor-tablosu">${satirlar.map(s => `
      <li>${avatar(s.id)} ${kacis(oyuncuBul(s.id).ad)}
        ${turPuaniGoster && s.arti ? `<span class="arti">+${s.arti}</span>` : ''}
        <span class="puan">${s.puan}</span></li>`).join('')}</ul>`;
  }

  function nasilEkrani(alan, ctx, ekran) {
    const { v, bilgi, ben, yonetici } = ctx;
    const hazirim = v.hazirlar.includes(ben);
    const gorulduAnahtari = 'goruldu:' + v.oyunId;
    // Bu oyunu daha önce oynadıysa kuralları tekrar okumasını bekleme
    if (!hazirim && depo.al(gorulduAnahtari)) ctx.gonder('hazir');

    const bagli = ctx.oda.oyuncular.filter(o => o.bagli);
    alan.innerHTML = `${ustBilgi(ctx, true)}
      <div class="kart">
        <p class="buyuk-emoji">${bilgi.emoji || '🎲'}</p>
        <h2 style="text-align:center">Nasıl oynanır?</h2>
        <ol class="nasil">${(bilgi.nasil || []).map(c => `<li>${kacis(c)}</li>`).join('')}</ol>
        ${hazirim ? '<p class="ipucu">Diğerleri bekleniyor…</p>' : '<button class="dugme yesil" id="hazir">👍 Anladım, hazırım!</button>'}
        <div class="bekleme-listesi">${bagli.map(o =>
          `<span class="oyuncu${v.hazirlar.includes(o.id) ? ' tamam' : ''}">${avatar(o.id)}${kacis(o.ad)} ${v.hazirlar.includes(o.id) ? '✓' : '…'}</span>`).join('')}
        </div>
        ${yonetici ? '<button class="dugme hayalet" id="hemen" style="margin-top:14px">⏩ Beklemeden başlat</button>' : ''}
      </div>`;
    alan.querySelector('#hazir')?.addEventListener('click', () => {
      depo.koy(gorulduAnahtari, '1');
      ctx.gonder('hazir');
    });
    alan.querySelector('#hemen')?.addEventListener('click', () => ctx.gonder('hazir', { hemen: true }));
  }

  function cevapFormu(alan, ctx, ekran) {
    alan.innerHTML = `${ustBilgi(ctx, true)}
      <div class="kart">${ekran.soru(ctx)}</div>
      <p class="ipucu" style="color:#fff" data-canli></p>`;
    let gonderiliyor = false;
    ekran.bagla(alan, ctx, async deger => {
      if (gonderiliyor) return;
      gonderiliyor = true;
      alan.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const cevap = await ctx.gonder('cevap', deger);
      gonderiliyor = false;
      if (cevap.hata) alan.querySelectorAll('button').forEach(b => { b.disabled = false; });
    });
  }

  function canliGuncelle(alan, ctx) {
    const el = alan.querySelector('[data-canli]');
    if (el) el.textContent = `${ctx.v.cevaplayanlar.length}/${ctx.v.katilimcilar.length} kişi cevapladı`;
  }

  function beklemeEkrani(alan, ctx, ekran) {
    const { v, ben, yonetici } = ctx;
    const katildim = v.katilimcilar.includes(ben);
    alan.innerHTML = `${ustBilgi(ctx, true)}
      <div class="kart orta">
        ${katildim
          ? `<p class="buyuk-emoji">✅</p><h2>Cevabın alındı!</h2>${ekran.cevabim ? ekran.cevabim(ctx) : ''}`
          : '<p class="buyuk-emoji">⏳</p><h2>Bu tur bitince sen de katılacaksın</h2>'}
        <p class="ipucu">Diğerleri bekleniyor (${v.cevaplayanlar.length}/${v.katilimcilar.length})</p>
        <div class="bekleme-listesi">${v.katilimcilar.map(id =>
          `<span class="oyuncu${v.cevaplayanlar.includes(id) ? ' tamam' : ''}">${avatar(id)}${kacis(oyuncuBul(id).ad)} ${v.cevaplayanlar.includes(id) ? '✓' : '…'}</span>`).join('')}
        </div>
        ${yonetici ? '<button class="dugme hayalet" id="bitir" style="margin-top:14px">⏩ Beklemeyi bitir, sonuçları aç</button>' : ''}
      </div>`;
    alan.querySelector('#bitir')?.addEventListener('click', () => ctx.gonder('sureyi-bitir'));
  }

  function sonucEkrani(alan, ctx, ekran) {
    const { v, yonetici, oda } = ctx;
    const sonTur = v.turNo >= v.turSayisi;
    const kurucu = oyuncuBul(oda.yoneticiId);
    alan.innerHTML = `${ustBilgi(ctx, false)}
      <div class="kart">${ekran.sonuc(ctx)}</div>
      <div class="kart"><h3>Puan durumu</h3>${skorTablosu(ctx, true)}</div>
      ${yonetici
        ? `<button class="dugme yesil buyuk" id="devam">${sonTur ? '🏆 Sonuçları gör' : '▶ Sonraki tur'}</button>`
        : `<p class="ipucu" style="color:#fff">${kacis(kurucu.ad)} 👑 ${sonTur ? 'final sonuçlarını açacak' : 'sonraki turu başlatacak'}…</p>`}`;
    alan.querySelector('#devam')?.addEventListener('click', e => { e.target.disabled = true; ctx.gonder('devam'); });
    ekran.sonucBagla?.(alan, ctx);
  }

  function finalEkrani(alan, ctx) {
    const { v, yonetici, oda } = ctx;
    const sirali = Object.entries(v.puanlar).sort((a, b) => b[1] - a[1]);
    const enYuksek = sirali[0]?.[1] ?? 0;
    const kazananlar = sirali.filter(([, p]) => p === enYuksek && p > 0).map(([id]) => id);
    alan.innerHTML = `${ustBilgi(ctx, false)}
      <div class="kart podyum belir">
        <p class="buyuk-emoji">🏆</p>
        ${kazananlar.length
          ? `<p class="ipucu">${kazananlar.length > 1 ? 'Kazananlar' : 'Kazanan'}</p>
             <p class="birinci">${kazananlar.map(id => kacis(oyuncuBul(id).ad)).join(' & ')}</p>
             <p>${enYuksek} puan 🎉</p>`
          : '<h2>Oyun bitti!</h2>'}
      </div>
      <div class="kart"><h3>Final tablosu</h3>${skorTablosu(ctx, false)}</div>
      ${yonetici
        ? `<button class="dugme yesil" id="tekrar">🔁 Tekrar oyna</button>
           <button class="dugme mavi" id="lobi">🎮 Başka oyun seç</button>`
        : `<p class="ipucu" style="color:#fff">${kacis(oyuncuBul(oda.yoneticiId).ad)} 👑 sıradaki oyunu seçecek…</p>`}`;
    alan.querySelector('#tekrar')?.addEventListener('click', () => ctx.tekrarOyna());
    alan.querySelector('#lobi')?.addEventListener('click', () => ctx.lobiyeDon());
  }

  KafeOyun.turluEkran = function (ekran) {
    return {
      ciz(alan, ctx) {
        const { v, ben, yonetici } = ctx;
        const formda = v.faz === 'cevap' && v.katilimcilar.includes(ben) && v.benimCevabim === null;
        // Ekranı sadece gerçekten değişmesi gerektiğinde baştan çiz (yazılan cevap silinmesin)
        let anahtar;
        if (v.faz === 'nasil') anahtar = `nasil-${v.hazirlar.join()}-${ctx.oda.oyuncular.map(o => o.bagli).join()}-${yonetici}`;
        else if (formda) anahtar = `form-${v.turNo}`;
        else if (v.faz === 'cevap') anahtar = `bekle-${v.turNo}-${v.cevaplayanlar.length}-${v.katilimcilar.length}-${yonetici}`;
        else anahtar = `${v.faz}-${v.turNo}-${yonetici}`;

        if (alan.dataset.anahtar !== anahtar) {
          alan.dataset.anahtar = anahtar;
          if (v.faz === 'nasil') nasilEkrani(alan, ctx, ekran);
          else if (formda) cevapFormu(alan, ctx, ekran);
          else if (v.faz === 'cevap') beklemeEkrani(alan, ctx, ekran);
          else if (v.faz === 'sonuc') { sonucEkrani(alan, ctx, ekran); window.scrollTo(0, 0); }
          else if (v.faz === 'final') { finalEkrani(alan, ctx); window.scrollTo(0, 0); }
        }
        if (formda) canliGuncelle(alan, ctx);
      },
    };
  };
})();
