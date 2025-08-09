document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html").then(res => res.text()).then(data => document.getElementById("header-placeholder").innerHTML = data);
  fetch("footer.html").then(res => res.text()).then(data => document.getElementById("footer-placeholder").innerHTML = data);

  const params = new URLSearchParams(window.location.search);
  const ilanID = params.get('id');

  if (!ilanID) {
    document.getElementById("loading-spinner").innerHTML = "<p class='text-red-500'>Hata: İlan kimliği bulunamadı.</p>";
    return;
  }
  fetchIlanData(ilanID);
});

async function fetchIlanData(id) {
  const jsonURL = `https://script.google.com/macros/s/AKfycbw3Ye0dEXs5O4nmZ_PDQqJOGvEDM5hL1yP6EyO1lnpRh_Brj0kwJy6GP1ZSDrMPOi-5/exec?ilanID=${id}`;
  try {
    const response = await fetch(jsonURL);
    if (!response.ok) throw new Error('Sunucu hatası!');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    populatePage(data);
  } catch (error) {
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

function populatePage(ilan) {
  document.title = ilan['Başlık'];
  document.getElementById('ilan-baslik').textContent = ilan['Başlık'];
  document.getElementById('ilan-konum').innerHTML += ilan['Konum'];

  const fiyatSayisi = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
  document.getElementById('ilan-fiyat').textContent = !isNaN(fiyatSayisi) ? `${fiyatSayisi.toLocaleString('tr-TR')} TL` : "Belirtilmemiş";
  
  // Açıklama Sekmesi
  document.getElementById('ilan-aciklama').innerHTML = ilan['Açıklama'].replace(/\n/g, '<br>');

  // Özellikler (Hem sekme hem de sidebar için)
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
      const listItemHTML = `
        <li class="flex justify-between items-center text-sm py-2 border-b">
          <span class="text-gray-600">${key}</span>
          <span class="font-semibold text-gray-800">${value}</span>
        </li>`;
      ozelliklerListesiTab.innerHTML += listItemHTML;
      // Sidebar'a sadece ilk 5 özelliği ekleyelim
    }
  });

  // Konum Sekmesi
  document.getElementById('harita-iframe').src = ilan['Harita Linki'];

  // Danışman Bilgileri
  document.getElementById('danisman-adi').textContent = "Onur Başaran";
  document.getElementById('danisman-tel').href = `https://wa.me/905308775368`;

  // Resim Galerisi
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

  // --- Swiper ve Sekmeleri Başlat ---
  initializePlugins();

  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('ilan-icerik').classList.remove('hidden');
}

function initializePlugins() {
  // Swiper Galerisini Başlat
  const thumbsSwiper = new Swiper('.thumbs-swiper', {
    spaceBetween: 10,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
  });

  const mainSwiper = new Swiper('.main-swiper', {
    spaceBetween: 10,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'fraction',
    },
    thumbs: {
      swiper: thumbsSwiper,
    },
  });

  // Sekmeleri (Tabs) Başlat
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