// ==========================================================
// İlan Detay Script'i (MERKEZİ YAPIYA UYUMLU - TAM SÜRÜM)
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Not: Header/Footer yükleme işlemi artık merkezi script.js tarafından yapılıyor.

  let isAuthenticated = false;

  try {
    // script.js'in hazırladığı global Auth0 Promise'inin tamamlanmasını bekle.
    const auth0Client = await window.auth0ClientPromise;
    isAuthenticated = await auth0Client.isAuthenticated();
    console.log("İlan Detay: Auth0 durumu kontrol edildi. Giriş yapıldı mı?", isAuthenticated);
  } catch (e) {
    console.error("İlan Detay: Auth0 durumu kontrol edilirken hata:", e);
    // Hata olsa bile sayfanın çalışmasına devam et, sadece favori butonu gizli kalır.
  }

  // URL'den ilan ID'sini al
  const params = new URLSearchParams(window.location.search);
  const ilanID = params.get('id');

  if (!ilanID) {
    document.getElementById("loading-spinner").innerHTML = "<p class='text-red-500'>Hata: İlan kimliği bulunamadı.</p>";
    return;
  }
 
  // İlan verisini çek ve GÜNCEL giriş durumunu fonksiyona ilet
  fetchIlanData(ilanID, isAuthenticated);
});


async function fetchIlanData(id, isLoggedIn) {
  // Bu fonksiyonda değişiklik yok.
  const jsonURL = `https://script.google.com/macros/s/AKfycbw3Ye0dEXs5O4nmZ_PDQqJOGvEDM5hL1yP6EyO1lnpRh_Brj0kwJy6GP1ZSDrMPOi-5/exec?ilanID=${id}`;
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) throw new Error('Sunucu hatası!');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
   
    populatePage(data, isLoggedIn);

  } catch (error) {
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

function populatePage(ilan, isLoggedIn) {
  // Sayfa içeriğini doldurma kısmında favori butonu dışında değişiklik yok.
  document.title = ilan['Başlık'];
  document.getElementById('ilan-baslik').textContent = ilan['Başlık'];
  document.getElementById('ilan-konum').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${ilan['Konum']}`;
  
  const fiyatSayisi = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
  document.getElementById('ilan-fiyat').textContent = !isNaN(fiyatSayisi) ? `${fiyatSayisi.toLocaleString('tr-TR')} TL` : "Belirtilmemiş";
  
  document.getElementById('ilan-aciklama').innerHTML = ilan['Açıklama'].replace(/\n/g, '<br>');
  
  const ozellikler = {
    "İlan Tipi": ilan['İlan Tipi'], "Oda Sayısı": ilan['Oda Sayısı'], "m² (Brüt)": ilan['m² (Brüt)'],
    "Bina Yaşı": ilan['Bina Yaşı'], "Isıtma": ilan['Isıtma'], "Banyo Sayısı": ilan['Banyo Sayısı'],
    "Balkon": ilan['Balkon'], "Eşyalı": ilan['Eşyalı'], "Site İçerisinde": ilan['Site İçerisinde'],
    "Krediye Uygun": ilan['Krediye Uygun'], "Aidat (TL)": ilan['Aidat (TL)'], "Bulunduğu Kat": ilan['Bulunduğu Kat']
  };

  const ozelliklerListesiTab = document.getElementById('ilan-ozellikler-tab');
  ozelliklerListesiTab.innerHTML = '';
  Object.entries(ozellikler).forEach(([key, value]) => {
    if (value && String(value).trim() !== "") {
      ozelliklerListesiTab.innerHTML += `
        <li class="flex justify-between items-center text-sm py-2 border-b">
          <span class="text-gray-600">${key}</span>
          <span class="font-semibold text-gray-800">${value}</span>
        </li>`;
    }
  });
  
  document.getElementById('harita-iframe').src = ilan['Harita Linki'];
  document.getElementById('danisman-adi').textContent = "Onur Başaran";
  document.getElementById('danisman-tel').href = `https://wa.me/905308775368`;
  
  const resimler = [];
  for (let i = 1; i <= 15; i++) {
    if (ilan[`Resim ${i}`] && ilan[`Resim ${i}`].trim() !== "") {
      resimler.push(ilan[`Resim ${i}`]);
    }
  }
  
  const mainWrapper = document.getElementById('main-swiper-wrapper');
  const thumbsWrapper = document.getElementById('thumbs-swiper-wrapper');
  mainWrapper.innerHTML = '';
  thumbsWrapper.innerHTML = '';
  
  if (resimler.length > 0) {
    resimler.forEach(resimSrc => {
      mainWrapper.innerHTML += `<div class="swiper-slide"><img src="${resimSrc}" /></div>`;
      thumbsWrapper.innerHTML += `<div class="swiper-slide"><img src="${resimSrc}" /></div>`;
    });
  } else {
    mainWrapper.innerHTML = `<div class="swiper-slide"><img src="images/placeholder.jpg" /></div>`;
  }
  
  initializePlugins();

  // --- FAVORİ BUTONU MANTIĞI (DÜZELTİLDİ) ---
  const favoriBtn = document.getElementById('favori-ekle-btn');
 
  // Sadece giriş yapmış kullanıcılar favori butonunu görür
  if (isLoggedIn && favoriBtn) {
      favoriBtn.classList.remove('hidden');
  }

  // Sadece buton varsa ve kullanıcı giriş yapmışsa tıklama olayını ekle
  if (favoriBtn && isLoggedIn) {
    favoriBtn.addEventListener('click', async () => {
        favoriBtn.disabled = true;
        favoriBtn.querySelector('i').classList.add('animate-pulse');

        try {
            // Artık script.js'te tanımlanan global fonksiyondan token'ı güvenli bir şekilde alıyoruz!
            const accessToken = await window.getAuthToken(); 

            const response = await fetch('/.netlify/functions/add-favorite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
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
            console.error('Favori ekleme hatası:', error);
            alert(`Favorilere eklenirken bir sorun oluştu: ${error.message}`);
            favoriBtn.disabled = false;
        } finally {
            favoriBtn.querySelector('i').classList.remove('animate-pulse');
        }
    });
  }
  // --- BİTİŞ ---

  // Yükleme animasyonunu gizle ve içeriği göster
  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('ilan-icerik').classList.remove('hidden');
}


function initializePlugins() {
  // Swiper ve Tab yapısını başlatan fonksiyonda değişiklik yok.
  const thumbsSwiper = new Swiper('.thumbs-swiper', {
    spaceBetween: 10,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
  });

  new Swiper('.main-swiper', {
    spaceBetween: 10,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'fraction'
    },
    thumbs: {
      swiper: thumbsSwiper,
    },
  });

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}