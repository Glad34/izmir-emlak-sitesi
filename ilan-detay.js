// ==========================================================
// İlan Detay Script'i - GELİŞMİŞ ANALİZ ÖZELLİKLERİ EKLENDİ
// ==========================================================

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

  // auth.js'in hazır olmasını bekle ve giriş durumunu öğren
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
  const jsonURL = `https://script.google.com/macros/s/AKfycbx9P6TAzuOypcj-5ByLPb3P1OKBPbUM5Ras2mZ29eby4TUl0pfosQBxMqHlC-1BWgw0/exec?ilanID=${id}`;
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) throw new Error('Sunucu hatası!');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    populatePage(data, isLoggedIn, token);
  } catch (error) {
    stopLoadingAnimation();
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

// --- Sayfayı Doldurma Fonksiyonu (YENİ GÖRSEL ÖZELLİKLER EKLENDİ) ---
function populatePage(data, isLoggedIn, token) {
  stopLoadingAnimation();

  const ilan = data.anaIlan;
  const digerIlanlar = data.digerIlanlar;

  // --- ANA İLAN BİLGİLERİNİ DOLDURMA ---
  document.title = ilan['Başlık'];
  document.getElementById('ilan-baslik').textContent = ilan['Başlık'];
  document.getElementById('ilan-konum').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${ilan['Konum']}`;
  const fiyatSayisi = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
  document.getElementById('ilan-fiyat').textContent = !isNaN(fiyatSayisi) ? `${fiyatSayisi.toLocaleString('tr-TR')} TL` : "Belirtilmemiş";
  document.getElementById('ilan-aciklama').innerHTML = ilan['Açıklama'].replace(/\n/g, '<br>');
  const ozellikler = { "İlan Tipi": ilan['İlan Tipi'], "Oda Sayısı": ilan['Oda Sayısı'], "m² (Brüt)": ilan['m² (Brüt)'], "Bina Yaşı": ilan['Bina Yaşı'], "Isıtma": ilan['Isıtma'], "Banyo Sayısı": ilan['Banyo Sayısı'], "Balkon": ilan['Balkon'], "Eşyalı": ilan['Eşyalı'], "Site İçerisinde": ilan['Site İçerisinde'], "Krediye Uygun": ilan['Krediye Uygun'], "Aidat (TL)": ilan['Aidat (TL)'], "Bulunduğu Kat": ilan['Bulunduğu Kat'] };
  const ozelliklerListesiTab = document.getElementById('ilan-ozellikler-tab');
  ozelliklerListesiTab.innerHTML = '';
  Object.entries(ozellikler).forEach(([key, value]) => { if (value && String(value).trim() !== "") { ozelliklerListesiTab.innerHTML += `<li class="flex justify-between items-center text-sm py-2 border-b"><span class="text-gray-600">${key}</span><span class="font-semibold text-gray-800">${value}</span></li>`; } });
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

  // --- DİĞER İLANLAR VE m² ANALİZİ (DÜZELTİLMİŞ) ---
  const digerIlanlarBolumu = document.getElementById('diger-ilanlar-bolumu');
  const digerIlanlarListesi = document.getElementById('diger-ilanlar-listesi');
  const mahalleAdiSpan = document.getElementById('mahalle-adi');
  const ortalamaFiyatKutusu = document.getElementById('ortalama-fiyat-kutusu');

  if (digerIlanlar && digerIlanlar.length > 0) {
    mahalleAdiSpan.textContent = ilan['Mahalle'];
    
    const tumIlanlar = [ ...digerIlanlar, { "İlan ID": ilan['İlan ID'], "Başlık": ilan['Başlık'], "Fiyat": ilan['Fiyat'], "m² (Net)": ilan['m² (Net)'] } ];
    
    const ilanlarVeM2Fiyatlari = tumIlanlar.map(i => {
        const fiyat = parseInt(String(i.Fiyat).replace(/[^\d]/g, ''));
        const netM2 = parseInt(i['m² (Net)']);
        const m2Fiyati = (netM2 > 0) ? fiyat / netM2 : null;
        return { ...i, m2Fiyati };
    }).filter(i => i.m2Fiyati !== null);

    if (ilanlarVeM2Fiyatlari.length > 0) {
        const toplamM2Fiyati = ilanlarVeM2Fiyatlari.reduce((acc, i) => acc + i.m2Fiyati, 0);
        const ortalamaM2Fiyati = toplamM2Fiyati / ilanlarVeM2Fiyatlari.length;
        
        ortalamaFiyatKutusu.querySelector('p').innerHTML = `Mahalledeki Ortalama m² Fiyatı: <strong>${ortalamaM2Fiyati.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>`;
        ortalamaFiyatKutusu.classList.remove('hidden');

        tumIlanlar.sort((a, b) => parseInt(String(a.Fiyat).replace(/[^\d]/g, '')) - parseInt(String(b.Fiyat).replace(/[^\d]/g, '')));

        digerIlanlarListesi.innerHTML = '';

        tumIlanlar.forEach((siradakiIlan, index) => {
            const mevcutIlanDetay = ilanlarVeM2Fiyatlari.find(i => i['İlan ID'] == siradakiIlan['İlan ID']);
            
            if (mevcutIlanDetay) {
                const formatliFiyat = parseInt(String(siradakiIlan.Fiyat).replace(/[^\d]/g, '')).toLocaleString('tr-TR');
                
                const farkYuzdesi = Math.round(((mevcutIlanDetay.m2Fiyati - ortalamaM2Fiyati) / ortalamaM2Fiyati) * 100);
                let farkGostergesiHTML = '';
                if (farkYuzdesi > 0) {
                    farkGostergesiHTML = `<div class="fiyat-fark-gostergesi yukari"><span>%${farkYuzdesi}</span><i class="fas fa-arrow-up"></i></div>`;
                } else if (farkYuzdesi < 0) {
                    farkGostergesiHTML = `<div class="fiyat-fark-gostergesi asagi"><span>%${Math.abs(farkYuzdesi)}</span><i class="fas fa-arrow-down"></i></div>`;
                }

                let etiketHTML = '';
                if (index === 0) etiketHTML = `<span class="en-uygun-etiket yesil">En Uygun</span>`;
                else if (index === 1) etiketHTML = `<span class="en-uygun-etiket turuncu">2. Uygun</span>`;
                else if (index === 2) etiketHTML = `<span class="en-uygun-etiket turuncu">3. Uygun</span>`;

                const anaIlanSinifi = (siradakiIlan['İlan ID'] == ilan['İlan ID']) ? 'ana-ilan-vurgu' : '';

                digerIlanlarListesi.innerHTML += `
                    <a href="ilan-detay.html?id=${siradakiIlan['İlan ID']}" class="diger-ilan-item ${anaIlanSinifi}">
                        <span class="ilan-sira-no">${index + 1}.</span>
                        <div class="diger-ilan-bilgi">
                            <h4 class="diger-ilan-baslik">${siradakiIlan['Başlık']}</h4>
                            <div class="diger-ilan-detaylar">
                                <p class="diger-ilan-fiyat">${formatliFiyat} TL</p>
                                ${farkGostergesiHTML}
                            </div>
                        </div>
                        ${etiketHTML}
                    </a>
                `;
            }
        });
        digerIlanlarBolumu.classList.remove('hidden');
    }
  }

  // --- Favori Butonu Mantığı ---
  const favoriBtn = document.getElementById('favori-ekle-btn');
  if (isLoggedIn && favoriBtn) {
      favoriBtn.classList.remove('hidden');
  }
  if (favoriBtn && isLoggedIn) {
    favoriBtn.addEventListener('click', async () => {
        favoriBtn.disabled = true;
        favoriBtn.querySelector('i').classList.add('animate-pulse');
        try {
            if (!token) throw new Error('Yetkilendirme anahtarı bulunamadı.');
            const response = await fetch('/.netlify/functions/add-favorite', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ilanId: ilan['İlan ID'] }),
            });
            if (response.ok) {
                favoriBtn.querySelector('i').classList.replace('far', 'fas');
                favoriBtn.querySelector('i').classList.add('text-yellow-500');
            } else {
                const errorData = await response.json();
                alert(`Hata: ${errorData.error || 'Bilinmeyen bir sunucu hatası.'}`);
                favoriBtn.disabled = false;
            }
        } catch (error) {
            console.error('Favori ekleme işlemi sırasında hata:', error);
            alert(`Favorilere eklenirken bir sorun oluştu: ${error.message}`);
            favoriBtn.disabled = false;
        } finally {
            favoriBtn.querySelector('i').classList.remove('animate-pulse');
        }
    });
  }

  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('ilan-icerik').classList.remove('hidden');
}

// --- Initialize Plugins Fonksiyonu (Değişiklik yok) ---
function initializePlugins() {
  const thumbsSwiper = new Swiper('.thumbs-swiper', { spaceBetween: 10, slidesPerView: 4, freeMode: true, watchSlidesProgress: true });
  new Swiper('.main-swiper', { spaceBetween: 10, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, pagination: { el: '.swiper-pagination', type: 'fraction' }, thumbs: { swiper: thumbsSwiper } });
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabButtons.forEach(button => { button.addEventListener('click', () => { const tabId = button.getAttribute('data-tab'); tabButtons.forEach(btn => btn.classList.remove('active')); tabPanes.forEach(pane => pane.classList.remove('active')); button.classList.add('active'); document.getElementById(tabId).classList.add('active'); }); });
}