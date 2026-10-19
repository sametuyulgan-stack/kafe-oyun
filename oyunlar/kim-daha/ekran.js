// Kim Daha? — telefon ekranı
(() => {
  const { kacis, avatar, oyuncuBul } = KafeOyun.yardimci;

  KafeOyun.kaydet('kim-daha', KafeOyun.turluEkran({
    soru({ v, ben }) {
      const adaylar = v.soru.adaylar.filter(id => id !== ben);
      return `
        <p class="soru-metni">${kacis(v.soru.metin)}</p>
        <div class="secim-dugmeleri">
          ${adaylar.map(id => `<button class="secim-dugmesi" data-aday="${id}">${avatar(id, true)} ${kacis(oyuncuBul(id).ad)}</button>`).join('')}
        </div>
        <button class="dugme" id="oyla" style="margin-top:14px" disabled>🗳️ Oyumu ver</button>`;
    },
    bagla(alan, ctx, gonder) {
      let secilen = null;
      const oyla = alan.querySelector('#oyla');
      alan.querySelectorAll('[data-aday]').forEach(b => b.onclick = () => {
        secilen = b.dataset.aday;
        alan.querySelectorAll('[data-aday]').forEach(x => x.classList.toggle('secili', x === b));
        oyla.disabled = false;
      });
      oyla.onclick = () => secilen && gonder(secilen);
    },
    cevabim({ v }) {
      return `<p>Oyun: <strong>${kacis(oyuncuBul(v.benimCevabim).ad)}</strong> 🤫</p>`;
    },
    sonuc({ v }) {
      const s = v.sonuc;
      return `
        <p class="soru-metni" style="font-size:1.3rem">${kacis(s.metin)}</p>
        ${s.oylar.map((o, i) => `
          <div class="sonuc-satiri belir${o.kazandi ? ' kazandi' : ''}" style="animation-delay:${i * 0.15}s">
            ${avatar(o.id, true)} ${kacis(oyuncuBul(o.id).ad)} ${o.kazandi ? '👑' : ''}
            <span class="sag">${'🗳️'.repeat(Math.min(o.sayi, 6))}<br><small>${o.sayi} oy</small></span>
          </div>`).join('') || '<p class="ipucu">Kimse oy vermedi 🤷</p>'}
        <p class="ipucu" style="margin-top:10px">En çok oy alanı seçenler +1 puan aldı. Kimin kime oy verdiği gizli! 🤫</p>`;
    },
  }));
})();
