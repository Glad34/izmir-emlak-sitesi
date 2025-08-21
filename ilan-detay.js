// ==========================================================
// İlan Detay Script'i - DİĞER İLANLAR ÖZELLİĞİ EKLENDİ
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

  let isAuthenticated = false;
  try {
    const auth0Client = await window.auth0ClientPromise;
    isAuthenticated = await auth0Client.isAuthenticated();
  } catch (e) {
    console.error("İlan Detay: Auth0 durumu kontrol edilirken hata:", e);
  }

  const params = new URLSearchParams(window.location.search);
  const ilanID = params.get('id');
  if (!ilanID) {
    stopLoadingAnimation();
    document.getElementById("loading-spinner").innerHTML = "<p class='text-red-500'>Hata: İlan kimliği bulunamadı.</p>";
    return;
  }
 
  fetchIlanData(ilanID, isAuthenticated);
});

// --- Veri Çekme Fonksiyonu ---
async function fetchIlanData(id, isLoggedIn) {
  const jsonURL = `https://script.google.com/macros/s/AKfycbx9P6TAzuOypcj-5ByLPb3P1OKBPbUM5Ras2mZ29eby4TUl0pfosQBxMqHlC-1BWgw0/exec?ilanID=${id}`;
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) throw new Error('Sunucu hatası!');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    populatePage(data, isLoggedIn);
  } catch (error) {
    stopLoadingAnimation();
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

// --- Sayfayı Doldurma Fonksiyonu (YENİ ÖZELLİKLER EKLENDİ) ---
function populatePage(data, isLoggedIn) {
  stopLoadingAnimation();

  // Gelen yeni veri yapısını ayrıştır
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

  // --- YENİ EKLENEN BÖLÜM: DİĞER İLANLAR ---
  const digerIlanlarBolumu = document.getElementById('diger-ilanlar-bolumu');
  const digerIlanlarListesi = document.getElementById('diger-ilanlar-listesi');
  const mahalleAdiSpan = document.getElementById('mahalle-adi');

  if (digerIlanlar && digerIlanlar.length > 0) {
    mahalleAdiSpan.textContent = ilan['Mahalle'];
    digerIlanlar.sort((a, b) => {
      const fiyatA = parseInt(String(a.Fiyat).replace(/[^\d]/g, ''));
      const fiyatB = parseInt(String(b.Fiyat).replace(/[^\d]/g, ''));
      return fiyatA - fiyatB;
    });

    digerIlanlarListesi.innerHTML = '';
    digerIlanlar.forEach((digerIlan, index) => {
      const formatliFiyat = parseInt(String(digerIlan.Fiyat).replace(/[^\d]/g, '')).toLocaleString('tr-TR');
      let etiketHTML = (index === 0) ? `<span class="en-uygun-etiket">En Uygun Fiyatlı</span>` : '';
      
      digerIlanlarListesi.innerHTML += `
        <a href="ilan-detay.html?id=${digerIlan['İlan ID']}" class="diger-ilan-item">
          <div class="diger-ilan-bilgi">
            <h4 class="diger-ilan-baslik">${digerIlan['Başlık']}</h4>
            <p class="diger-ilan-fiyat">${formatliFiyat} TL</p>
          </div>
          ${etiketHTML}
        </a>
      `;
    });
    digerIlanlarBolumu.classList.remove('hidden');
  }
  // --- YENİ BÖLÜM SONU ---


  // --- Favori Butonu Mantığı (Mevcut kodunuz) ---
  const favoriBtn = document.getElementById('favori-ekle-btn');
  if (isLoggedIn && favoriBtn) {
      favoriBtn.classList.remove('hidden');
  }
  if (favoriBtn && isLoggedIn) {
    favoriBtn.addEventListener('click', async () => {
        favoriBtn.disabled = true;
        favoriBtn.querySelector('i').classList.add('animate-pulse');
        try {
            const accessToken = await window.getAuthToken();
            const response = await fetch('/.netlify/functions/add-favorite', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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