// Aynı Kafa — telefon ekranı
(() => {
  const { kacis, avatar, oyuncuBul } = KafeOyun.yardimci;

  KafeOyun.kaydet('ayni-kafa', KafeOyun.turluEkran({
    soru({ v }) {
      return `
        <p class="soru-metni">${kacis(v.soru.metin)}</p>
        <form id="form">
          <input id="cevap" maxlength="30" autocomplete="off" autocapitalize="off" placeholder="İlk aklına gelen…">
          <button class="dugme">🧠 Gönder</button>
        </form>`;
    },
    bagla(alan, ctx, gonder) {
      const girdi = alan.querySelector('#cevap');
      girdi.focus();
      alan.querySelector('#form').onsubmit = e => {
        e.preventDefault();
        if (girdi.value.trim()) gonder(girdi.value.trim());
      };
    },
    cevabim({ v }) {
      return `<p>Cevabın: <strong>${kacis(v.benimCevabim)}</strong></p>`;
    },
    sonuc({ v }) {
      const s = v.sonuc;
      const kazananVar = s.gruplar.some(g => g.kazandi);
      return `
        <p class="soru-metni" style="font-size:1.3rem">${kacis(s.metin)}</p>
        ${s.gruplar.map((g, i) => `
          <div class="sonuc-satiri belir${g.kazandi ? ' kazandi' : ''}" style="animation-delay:${i * 0.15}s; flex-wrap:wrap">
            <strong style="font-size:1.15rem">${kacis(g.yazi)}</strong>
            <span class="sag">${g.kisiler.map(id => avatar(id)).join(' ')}</span>
            <small style="width:100%;color:#7b6f93">${g.kisiler.map(id => kacis(oyuncuBul(id).ad)).join(', ')}</small>
          </div>`).join('')}
        <p class="ipucu" style="margin-top:10px">${kazananVar ? 'Çoğunluğun cevabını verenler +1 puan aldı! 🧠' : 'Kimse aynı cevabı vermedi, bu tur puan yok 🤷'}</p>`;
    },
  }));
})();
