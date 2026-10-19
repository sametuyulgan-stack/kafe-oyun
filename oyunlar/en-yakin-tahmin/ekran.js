// En Yakın Tahmin — telefon ekranı
(() => {
  const { kacis, avatar, oyuncuBul } = KafeOyun.yardimci;
  const sayi = n => Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  const birimli = (n, birim) => `${sayi(n)}${birim ? ' ' + kacis(birim) : ''}`;

  KafeOyun.kaydet('en-yakin-tahmin', KafeOyun.turluEkran({
    soru({ v }) {
      return `
        <p class="soru-metni">${kacis(v.soru.metin)}</p>
        <form id="form">
          <input id="tahmin" inputmode="decimal" autocomplete="off" placeholder="Tahminin${v.soru.birim ? ` (${kacis(v.soru.birim)})` : ''}">
          <button class="dugme">🎯 Tahmini gönder</button>
        </form>`;
    },
    bagla(alan, ctx, gonder) {
      const girdi = alan.querySelector('#tahmin');
      girdi.focus();
      alan.querySelector('#form').onsubmit = e => {
        e.preventDefault();
        if (girdi.value.trim()) gonder(girdi.value.trim());
      };
    },
    cevabim({ v }) {
      return `<p>Tahminin: <strong>${birimli(v.benimCevabim, v.soru.birim)}</strong></p>`;
    },
    sonuc({ v }) {
      const s = v.sonuc;
      const satirlar = s.tahminler.map((t, i) => `
        <div class="sonuc-satiri gizli" data-sira="${i}" data-kazandi="${t.kazandi}">
          ${avatar(t.id)} ${kacis(oyuncuBul(t.id).ad)}
          <span class="sag">${birimli(t.tahmin, s.birim)}<br><small>fark: ${sayi(t.fark)}</small></span>
        </div>`).join('');
      return `
        <p class="soru-metni" style="font-size:1.25rem">${kacis(s.metin)}</p>
        ${satirlar || '<p class="ipucu">Kimse tahmin yapmadı 🤷</p>'}
        <div class="kart orta renkli gizli" id="cevap" style="margin:12px 0 0">
          <p class="ipucu">Doğru cevap</p>
          <p class="oda-kodu" style="font-size:2.4rem;letter-spacing:0">${birimli(s.cevap, s.birim)}</p>
        </div>`;
    },
    // Tahminleri en uzaktan en yakına tek tek aç, sonra doğru cevabı göster
    sonucBagla(alan) {
      const satirlar = [...alan.querySelectorAll('[data-sira]')];
      const gecikme = 900;
      satirlar.forEach((el, i) => setTimeout(() => el.classList.remove('gizli'), i * gecikme));
      setTimeout(() => {
        alan.querySelector('#cevap')?.classList.remove('gizli');
        alan.querySelector('#cevap')?.classList.add('belir');
        satirlar.forEach(el => { if (el.dataset.kazandi === 'true') el.classList.add('kazandi'); });
      }, satirlar.length * gecikme + 300);
      satirlar.forEach(el => el.classList.add('belir'));
    },
  }));
})();
