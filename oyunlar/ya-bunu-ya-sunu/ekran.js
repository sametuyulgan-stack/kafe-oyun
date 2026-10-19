// Ya Bunu Ya Şunu — telefon ekranı
(() => {
  const { kacis, avatar, oyuncuBul } = KafeOyun.yardimci;

  KafeOyun.kaydet('ya-bunu-ya-sunu', KafeOyun.turluEkran({
    soru({ v }) {
      const dugmeler = alan => ['a', 'b'].map(k =>
        `<button class="secim-dugmesi" data-${alan}="${k}">${k === 'a' ? '🅰️' : '🅱️'} ${kacis(v.soru[k])}</button>`).join('');
      return `
        <p class="soru-metni">${kacis(v.soru.a)} <span style="color:#ff4f9a">mı</span>, ${kacis(v.soru.b)} <span style="color:#ff4f9a">mı?</span></p>
        <h3>1. Sen hangisini seçersin?</h3>
        <div class="secim-dugmeleri">${dugmeler('secim')}</div>
        <h3 style="margin-top:16px">2. Grubun çoğunluğu hangisini seçer?</h3>
        <div class="secim-dugmeleri">${dugmeler('tahmin')}</div>
        <button class="dugme" id="gonder" style="margin-top:16px" disabled>✅ Gönder</button>`;
    },
    bagla(alan, ctx, gonder) {
      const cevap = {};
      const btn = alan.querySelector('#gonder');
      for (const alanAdi of ['secim', 'tahmin']) {
        alan.querySelectorAll(`[data-${alanAdi}]`).forEach(b => b.onclick = () => {
          cevap[alanAdi] = b.dataset[alanAdi];
          alan.querySelectorAll(`[data-${alanAdi}]`).forEach(x => x.classList.toggle('secili', x === b));
          btn.disabled = !(cevap.secim && cevap.tahmin);
        });
      }
      btn.onclick = () => gonder(cevap);
    },
    cevabim({ v }) {
      const c = v.benimCevabim;
      return `<p>Seçimin: <strong>${kacis(v.soru[c.secim])}</strong><br>Tahminin: <strong>${kacis(v.soru[c.tahmin])}</strong></p>`;
    },
    sonuc({ v }) {
      const s = v.sonuc;
      const sutun = k => {
        const kisiler = k === 'a' ? s.kimA : s.kimB;
        return `
          <div class="sonuc-satiri belir${s.cogunluk === k ? ' kazandi' : ''}" style="flex-wrap:wrap">
            <strong style="font-size:1.15rem">${k === 'a' ? '🅰️' : '🅱️'} ${kacis(s[k])}</strong>
            <span class="sag">${kisiler.length} kişi</span>
            <small style="width:100%">${kisiler.map(id => avatar(id)).join(' ') || '—'}</small>
          </div>`;
      };
      const baslik = s.cogunluk === 'esit'
        ? '🤝 Berabere! Herkes 1 puan aldı.'
        : `Çoğunluk <strong>${kacis(s[s.cogunluk])}</strong> dedi!`;
      return `
        ${sutun('a')}${sutun('b')}
        <p style="text-align:center;font-size:1.15rem;margin-top:10px">${baslik}</p>
        ${s.cogunluk !== 'esit' ? `<p class="ipucu">Doğru tahmin edenler: ${s.bilenler.map(id => kacis(oyuncuBul(id).ad)).join(', ') || 'kimse 😅'}</p>` : ''}`;
    },
  }));
})();
