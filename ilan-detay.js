// =======================================================================
// İLAN DETAY SCRİPT'İ - BİRLEŞTİRİLMİŞ ANALİZ MANTIĞI İLE NİHAİ VERSİYON
// =======================================================================

// --- Yükleme Animasyonu Bölümü ---
const loadingMessages = [
    "İlan bilgileri getiriliyor...", "En güncel fotoğraflar yükleniyor...",
    "Konum bilgileri haritaya işleniyor...", "Fiyat analizi yapılıyor...",
    "Sizin için en iyi detayı hazırlıyoruz...", "Neredeyse hazır, harika bir ilana bakıyorsunuz!"
];
let messageInterval;

function startLoadingAnimation() {
    const loadingTextElement = document.getElementById("loading-text");
    if (!loadingTextElement) return;
    let currentIndex = 0;
    messageInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % loadingMessages.length;
        loadingTextElement.textContent = loadingMessages[currentIndex];
    }, 2000);
}

function stopLoadingAnimation() {
    clearInterval(messageInterval);
}

// --- Ana Sayfa Yükleme Mantığı ---
document.addEventListener("DOMContentLoaded", async () => {
  startLoadingAnimation();
  while (typeof window.getAuthClient !== 'function') {
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  const { isAuthenticated, accessToken } = await window.getAuthClient();
  const params = new URLSearchParams(window.location.search);
  const ilanID = params.get('id');
  if (!ilanID) {
    stopLoadingAnimation();
    document.getElementById("loading-spinner").innerHTML = "<p class='text-red-500'>Hata: İlan kimliği bulunamadı.</p>";
    return;
  }
  fetchIlanData(ilanID, isAuthenticated, accessToken);
});

// --- Veri Çekme Fonksiyonu ---
async function fetchIlanData(id, isLoggedIn, token) {
  try {
    const response = await fetch('/data/ilanlar.json');
    if (!response.ok) throw new Error('Veri dosyası bulunamadı.');

    const tumIlanlar = await response.json();
    const anaIlan = tumIlanlar.find(ilan => ilan['İlan ID'] == id);

    if (!anaIlan) {
        throw new Error("Belirtilen ID ile ilan bulunamadı.");
    }
    
    const digerIlanlar = tumIlanlar.filter(ilan => 
        ilan.Mahalle === anaIlan.Mahalle && 
        ilan['Konut Tipi'] === anaIlan['Konut Tipi'] &&
        ilan['İlan ID'] != id
    );
    
    const data = {
        anaIlan: anaIlan,
        digerIlanlar: digerIlanlar
    };

    populatePage(data, isLoggedIn, token);

  } catch (error) {
    stopLoadingAnimation();
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

// --- Sayfayı Doldurma Fonksiyonu ---
function populatePage(data, isLoggedIn, token) {
  stopLoadingAnimation();
  const ilan = data.anaIlan;
  const digerIlanlar = data.digerIlanlar;

  // --- ANA İLAN BİLGİLERİNİ DOLDURMA ---
  document.title = ilan['Başlık'];
  document.getElementById('ilan-baslik').textContent = ilan['Başlık'];
  document.getElementById('ilan-konum').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${ilan['Konum']}`;
  
  // Fiyatı hesapla (diğer bölümlerde kullanmak için)
  const fiyatSayisi = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
  
  document.getElementById('ilan-aciklama').innerHTML = ilan['Açıklama'].replace(/\n/g, '<br>');

  // İLAN BİLGİLERİ SEKMESİNİ DOLDURMA (FİYAT DAHİL)
  const ozellikler = { "İlan Tipi": ilan['İlan Tipi'], "Oda Sayısı": ilan['Oda Sayısı'], "m² (Brüt)": ilan['m² (Brüt)'], "Bina Yaşı": ilan['Bina Yaşı'], "Isıtma": ilan['Isıtma'], "Banyo Sayısı": ilan['Banyo Sayısı'], "Balkon": ilan['Balkon'], "Eşyalı": ilan['Eşyalı'], "Site İçerisinde": ilan['Site İçerisinde'],"Havuz": ilan['Havuz'], "Krediye Uygun": ilan['Krediye Uygun'], "Aidat (TL)": ilan['Aidat (TL)'], "Bulunduğu Kat": ilan['Bulunduğu Kat'] };
  const ozelliklerListesiTab = document.getElementById('ilan-ozellikler-tab');
  ozelliklerListesiTab.innerHTML = ''; // Listeyi temizle

  const fiyatDegeri = !isNaN(fiyatSayisi) ? `${fiyatSayisi.toLocaleString('tr-TR')} TL` : "Belirtilmemiş";
  ozelliklerListesiTab.innerHTML += `<li class="flex justify-between items-center text-sm py-3 border-b border-gray-200"><span class="text-gray-600">Fiyat</span><span class="font-bold text-gray-900">${fiyatDegeri}</span></li>`;

  Object.entries(ozellikler).forEach(([key, value]) => { 
      if (value && String(value).trim() !== "") { 
          ozelliklerListesiTab.innerHTML += `<li class="flex justify-between items-center text-sm py-3 border-b border-gray-200"><span class="text-gray-600">${key}</span><span class="text-gray-800">${value}</span></li>`; 
      } 
  });
  
  document.getElementById('harita-iframe').src = ilan['Harita Linki'];
  document.getElementById('danisman-adi').textContent = "Onur Başaran";
  document.getElementById('danisman-tel').href = `https://wa.me/905308775368`;
  
  const resimler = [];
  for (let i = 1; i <= 15; i++) { if (ilan[`Resim ${i}`] && ilan[`Resim ${i}`].trim() !== "") { resimler.push(ilan[`Resim ${i}`]); } }
  const mainWrapper = document.getElementById('main-swiper-wrapper');
  const thumbsWrapper = document.getElementById('thumbs-swiper-wrapper');
  mainWrapper.innerHTML = ''; thumbsWrapper.innerHTML = '';
  if (resimler.length > 0) { resimler.forEach(resimSrc => { mainWrapper.innerHTML += `<div class="swiper-slide"><img src="${resimSrc}" /></div>`; thumbsWrapper.innerHTML += `<div class="swiper-slide"><img src="${resimSrc}" /></div>`; }); } else { mainWrapper.innerHTML = `<div class="swiper-slide"><img src="images/placeholder.jpg" /></div>`; }
  
  initializePlugins();

  // =================================================================
  // YENİ VE BİRLEŞTİRİLMİŞ ANALİZ BÖLÜMÜ (TUTARLI MANTIK)
  // =================================================================

  const degerKarti = document.getElementById('deger-karti');
  const digerIlanlarBolumu = document.getElementById('diger-ilanlar-bolumu');
  const digerIlanlarListesi = document.getElementById('diger-ilanlar-listesi');
  const mahalleAdiSpan = document.getElementById('mahalle-adi');
  const siralamaPlaceholder = document.getElementById('ilan-siralama-placeholder');
  const siralamaMetni = document.getElementById('siralama-metni');
  const ortalamaFiyatKutusu = document.getElementById('ortalama-fiyat-kutusu');

  // 1. ADIM: ÖNCE TÜM İLGİLİ İLANLARI VE ORTALAMA FİYATI HESAPLA
  // ---------------------------------------------------------------
  let ortalamaEndeksM2Fiyati = 0;
  const anaIlanNetM2 = parseInt(ilan['m² (Net)']);
  const anaIlanFiyat = parseInt(String(ilan.Fiyat).replace(/[^\d]/g, ''));
  const anaIlanGercekM2Fiyati = (anaIlanNetM2 > 0) ? anaIlanFiyat / anaIlanNetM2 : 0;

  if (digerIlanlar && digerIlanlar.length > 0) {
    mahalleAdiSpan.textContent = ilan['Mahalle'];
    
    const tumIlanlar = [ ...digerIlanlar, ilan ];
    const endeksliIlanlar = tumIlanlar.map(i => parseInt(String(i["Endeks m² Fiyatı"]).replace(/[^\d]/g, ''))).filter(fiyat => !isNaN(fiyat) && fiyat > 0);
    
    if (endeksliIlanlar.length > 0) {
        const toplamEndeksFiyati = endeksliIlanlar.reduce((acc, i) => acc + i, 0);
        ortalamaEndeksM2Fiyati = toplamEndeksFiyati / endeksliIlanlar.length;
        
        ortalamaFiyatKutusu.querySelector('p').innerHTML = `Mahalledeki Ortalama Endeks m² Fiyatı: <strong>${ortalamaEndeksM2Fiyati.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>`;
        ortalamaFiyatKutusu.classList.remove('hidden');
    }
  }

  // 2. ADIM: DEĞER ANALİZİ KARTINI YENİ MANTIKLA DOLDUR
  // ---------------------------------------------------------------
  if (ortalamaEndeksM2Fiyati > 0 && anaIlanGercekM2Fiyati > 0) {
      const farkYuzdesi = Math.round(((anaIlanGercekM2Fiyati - ortalamaEndeksM2Fiyati) / ortalamaEndeksM2Fiyati) * 100);
      const firsatGostergesi = document.getElementById('firsat-gostergesi');
      
      if (farkYuzdesi < -5) {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, mahalle ortalamasının <strong class="altinda">%${Math.abs(farkYuzdesi)} altında.</strong>`;
      } else if (farkYuzdesi > 5) {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, mahalle ortalamasının <strong class="ustunde">%${farkYuzdesi} üzerinde.</strong>`;
      } else {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, mahalle ortalamasıyla <strong class="uygun">benzer seviyede.</strong>`;
      }

      document.getElementById('sonuc-cumlesi').innerHTML = `Mahalle Ortalaması: <strong>${ortalamaEndeksM2Fiyati.toLocaleString('tr-TR', {maximumFractionDigits:0})} TL/m²</strong> | Bu İlan: <strong>${anaIlanGercekM2Fiyati.toLocaleString('tr-TR', {maximumFractionDigits:0})} TL/m²</strong>`;
      
      const puanlar = { binaYasi: { "0": 15, "1": 15, "2-5 arası": 10, "6-10 arası": 5, "11-20 arası": 0, "21 ve üzeri": -10 }, bulunduguKat: { "Ara Kat": 10, "Çatı Katı": 5, "Dubleks": 5, "Zemin Kat": -5, "Bahçe Katı": -5, "Villa": 20 }, denizManzarasi: { "Var": 20 }, siteIcerisinde: { "Evet": 12 }, havuz: { "Var": 8 }, otopark: { "Var": 8 }, asansor: { "Var": 5 }, balkon: { "Var": 3 }, esyali: { "Evet": 7 }, odaM2Orani: { "2+1": { ideal: [75, 110], puan: 5 }, "3+1": { ideal: [110, 140], puan: 10 }, "4+1": { ideal: [150, 999], puan: 12 } } };
      const faktorlerListesi = document.getElementById('faktorler-listesi');
      faktorlerListesi.innerHTML = '';
      function addFactor(aciklama, puan) { let puanClass = puan > 0 ? 'pozitif' : 'negatif'; let puanIsaret = puan > 0 ? '+' : ''; faktorlerListesi.innerHTML += `<li>${aciklama}<span class="faktor-puan ${puanClass}">${puanIsaret}${puan}%</span></li>`; }
      const yasAraligi = ilan['Bina Yaşı'];
      if (puanlar.binaYasi[yasAraligi] !== undefined) addFactor(`Bina Yaşı (${yasAraligi})`, puanlar.binaYasi[yasAraligi]);
      if (puanlar.bulunduguKat[ilan['Bulunduğu Kat']]) addFactor(ilan['Bulunduğu Kat'], puanlar.bulunduguKat[ilan['Bulunduğu Kat']]);
      if (ilan['Deniz Manzarası'] === 'Var') addFactor("Deniz Manzaralı", puanlar.denizManzarasi["Var"]);
      if (ilan['Site İçerisinde'] === 'Evet') addFactor("Site İçerisinde", puanlar.siteIcerisinde["Evet"]);
      if (ilan['Havuz'] === 'Var') addFactor("Havuzlu", puanlar.havuz["Var"]);
      if (ilan['Otopark'] && ilan['Otopark'] !== 'Yok') addFactor("Otoparklı", puanlar.otopark["Var"]);
      const odaSayisi = ilan['Oda Sayısı']; const netM2 = parseInt(ilan['m² (Net)']); const oran = puanlar.odaM2Orani[odaSayisi]; if (oran && !isNaN(netM2)) { if (netM2 >= oran.ideal[0] && netM2 <= oran.ideal[1]) addFactor(`İdeal ${odaSayisi}`, oran.puan); }

      degerKarti.classList.remove('hidden');
  }


  // 3. ADIM: DİĞER İLANLAR LİSTESİNİ YENİ MANTIKLA OLUŞTUR
  // ---------------------------------------------------------------
  if (digerIlanlar && digerIlanlar.length > 0 && ortalamaEndeksM2Fiyati > 0) {
    const tumIlanlar = [ ...digerIlanlar, ilan ];
    
    tumIlanlar.sort((a, b) => parseInt(String(a.Fiyat).replace(/[^\d]/g, '')) - parseInt(String(b.Fiyat).replace(/[^\d]/g, '')));
    
    digerIlanlarListesi.innerHTML = '';
    let anaIlaninSirasi = -1;

    tumIlanlar.forEach((siradakiIlan, index) => {
        if (siradakiIlan['İlan ID'] == ilan['İlan ID']) anaIlaninSirasi = index + 1;
        
        const fiyat = parseInt(String(siradakiIlan.Fiyat).replace(/[^\d]/g, ''));
        const netM2 = parseInt(siradakiIlan['m² (Net)']);
        
        if (!isNaN(fiyat) && !isNaN(netM2) && netM2 > 0) {
            const gercekM2Fiyati = fiyat / netM2;
            const farkYuzdesi = Math.round(((gercekM2Fiyati - ortalamaEndeksM2Fiyati) / ortalamaEndeksM2Fiyati) * 100);
            
            let farkGostergesiHTML = '';
            if (farkYuzdesi > 0) farkGostergesiHTML = `<div class="fiyat-fark-gostergesi yukari"><span>%${farkYuzdesi}</span><i class="fas fa-arrow-up"></i></div>`;
            else if (farkYuzdesi < 0) farkGostergesiHTML = `<div class="fiyat-fark-gostergesi asagi"><span>%${Math.abs(farkYuzdesi)}</span><i class="fas fa-arrow-down"></i></div>`;

            let etiketHTML = '';
            if (index === 0) etiketHTML = `<span class="en-uygun-etiket yesil">En Uygun</span>`;
            else if (index === 1) etiketHTML = `<span class="en-uygun-etiket turuncu">2. Uygun</span>`;
            else if (index === 2) etiketHTML = `<span class="en-uygun-etiket turuncu">3. Uygun</span>`;
            
            const anaIlanSinifi = (siradakiIlan['İlan ID'] == ilan['İlan ID']) ? 'ana-ilan-vurgu' : '';
            const formatliFiyat = fiyat.toLocaleString('tr-TR');
            
            digerIlanlarListesi.innerHTML += `<a href="ilan-detay.html?id=${siradakiIlan['İlan ID']}" class="diger-ilan-item ${anaIlanSinifi}"><span class="ilan-sira-no">${index + 1}.</span><div class="diger-ilan-bilgi"><h4 class="diger-ilan-baslik">${siradakiIlan['Başlık']}</h4><div class="diger-ilan-detaylar"><p class="diger-ilan-fiyat">${formatliFiyat} TL</p>${farkGostergesiHTML}</div></div>${etiketHTML}</a>`;
        }
    });

    if (anaIlaninSirasi !== -1 && siralamaMetni && siralamaPlaceholder) {
        siralamaMetni.textContent = `${ilan['Mahalle']} mahallesindeki en uygun ${anaIlaninSirasi}. fırsattır.`;
        siralamaPlaceholder.classList.remove('hidden');
    }
    digerIlanlarBolumu.classList.remove('hidden');
  }
  
  // --- Favori Butonu Mantığı ---
  const favoriBtn = document.getElementById('favori-ekle-btn');
  if (isLoggedIn && favoriBtn) { favoriBtn.classList.remove('hidden'); }
  if (favoriBtn && isLoggedIn) {
    favoriBtn.addEventListener('click', async () => {
        // ... (favori ekleme kodunuz aynı kalıyor)
    });
  }

  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('ilan-icerik').classList.remove('hidden');
}


function initializePlugins() {
  // --- SWIPER GALERİSİNİ BAŞLAT ---
  const thumbsSwiper = new Swiper('.thumbs-swiper', {
    spaceBetween: 10, slidesPerView: 4, freeMode: true, watchSlidesProgress: true,
  });
  new Swiper('.main-swiper', {
    spaceBetween: 10, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    pagination: { el: '.swiper-pagination', type: 'fraction' }, thumbs: { swiper: thumbsSwiper },
  });
  
  // --- SEKMELERİ (TABS) BAŞLAT ---
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      button.classList.add('active');
      const activePane = document.getElementById(tabId);
      if (activePane) activePane.classList.add('active');

      // --- AKILLI KAYDIRMA KODU (HEADER HESAPLAMALI) ---
      if (tabId === 'tab-aciklama' || tabId === 'tab-konum') {
        const sekmeliBolum = document.getElementById('sekmeli-bolum');
        const header = document.getElementById('header-placeholder'); 
        
        if (sekmeliBolum && header) {
          const headerHeight = header.offsetHeight;
          const elementPosition = sekmeliBolum.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementPosition - headerHeight - 20;

          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }
    });
  });

  // --- HESAPLAMA POP-UP (MODAL) MANTIĞI ---
  const modal = document.getElementById('hesaplama-modal');
  const openBtn = document.getElementById('hesaplama-detay-ac');
  const closeBtn = document.getElementById('hesaplama-detay-kapat');

  if (modal && openBtn && closeBtn) {
    openBtn.addEventListener('click', (e) => { e.preventDefault(); modal.classList.remove('hidden'); });
    closeBtn.addEventListener('click', () => { modal.classList.add('hidden'); });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
  }
}