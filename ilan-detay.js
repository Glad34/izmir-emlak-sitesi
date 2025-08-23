// ==========================================================
// İlan Detay Script'i - SIRALAMA BİLGİSİ DAHİL NİHAİ VERSİYON
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
  const jsonURL = `https://script.google.com/macros/s/AKfycbxvcb8fhRi7rKoesBNL8MXotlujebxiPN9eiFAKj1Z0l6ogHdiULYr_40ohculEKbj8/exec?ilanID=${id}`;
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

// --- Sayfayı Doldurma Fonksiyonu ---
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
  const ozellikler = { "İlan Tipi": ilan['İlan Tipi'], "Oda Sayısı": ilan['Oda Sayısı'], "m² (Brüt)": ilan['m² (Brüt)'], "Bina Yaşı": ilan['Bina Yaşı'], "Isıtma": ilan['Isıtma'], "Banyo Sayısı": ilan['Banyo Sayısı'], "Balkon": ilan['Balkon'], "Eşyalı": ilan['Eşyalı'], "Site İçerisinde": ilan['Site İçerisinde'],"Havuz": ilan['Havuz'], "Krediye Uygun": ilan['Krediye Uygun'], "Aidat (TL)": ilan['Aidat (TL)'], "Bulunduğu Kat": ilan['Bulunduğu Kat'] };
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

    // ===============================================
  // DEĞER ANALİZİ (YENİ, NÖTR YAKLAŞIM)
  // ===============================================
  const degerKarti = document.getElementById('deger-karti');
  
  // 1. Puanlama Tablosu (Bu bölüm aynı kalıyor)
  const puanlar = {
      binaYasi: { "0": 15, "1": 15, "2-5 arası": 10, "6-10 arası": 5, "11-20 arası": 0, "21 ve üzeri": -10 },
      bulunduguKat: { "Ara Kat": 10, "Çatı Katı": 5, "Dubleks": 5, "Zemin Kat": -5, "Bahçe Katı": -5, "Villa": 20 },
      denizManzarasi: { "Var": 20 },
      siteIcerisinde: { "Evet": 12 },
      havuz: { "Var": 8 },
      otopark: { "Var": 8 },
      asansor: { "Var": 5 },
      balkon: { "Var": 3 },
      esyali: { "Evet": 7 },
      odaM2Orani: {
          "2+1": { ideal: [75, 110], puan: 5, dusukPuan: 0, yuksekPuan: -5 },
          "3+1": { ideal: [110, 140], puan: 10, dusukPuan: -5, yuksekPuan: 5 },
          "4+1": { ideal: [150, 999], puan: 12 }
      }
  };

  // 2. Faktörleri ve Puanları Hesapla (Listeleme Mantığı Değişti)
  let toplamPuan = 0;
  const faktorlerListesi = document.getElementById('faktorler-listesi');
  faktorlerListesi.innerHTML = '';

  function addFactor(aciklama, puan) {
      // Yeni tek liste yapısına uygun hale getirildi
      let puanClass = puan > 0 ? 'pozitif' : 'negatif';
      let puanIsaret = puan > 0 ? '+' : '';
      faktorlerListesi.innerHTML += `<li>${aciklama}<span class="faktor-puan ${puanClass}">${puanIsaret}${puan}%</span></li>`;
      toplamPuan += puan;
  }

  // Faktörleri işleme (Bu bölüm aynı kalıyor)
  const yasAraligi = ilan['Bina Yaşı'];
  if (puanlar.binaYasi[yasAraligi] !== undefined) addFactor(`Bina Yaşı (${yasAraligi})`, puanlar.binaYasi[yasAraligi]);
  if (puanlar.bulunduguKat[ilan['Bulunduğu Kat']]) addFactor(ilan['Bulunduğu Kat'], puanlar.bulunduguKat[ilan['Bulunduğu Kat']]);
  if (ilan['Deniz Manzarası'] === 'Var') addFactor("Deniz Manzaralı", puanlar.denizManzarasi["Var"]);
  if (ilan['Site İçerisinde'] === 'Evet') addFactor("Site İçerisinde", puanlar.siteIcerisinde["Evet"]);
  if (ilan['Havuz'] === 'Var') addFactor("Havuzlu", puanlar.havuz["Var"]);
  if (ilan['Otopark'] && ilan['Otopark'] !== 'Yok') addFactor("Otoparklı", puanlar.otopark["Var"]);
  if (ilan['Asansör'] === 'Var') addFactor("Asansörlü", puanlar.asansor["Var"]);
  if (ilan['Balkon'] === 'Var') addFactor("Balkonlu", puanlar.balkon["Var"]);
  if (ilan['Eşyalı'] === 'Evet') addFactor("Eşyalı", puanlar.esyali["Evet"]);
  const odaSayisi = ilan['Oda Sayısı'];
  const netM2 = parseInt(ilan['m² (Net)']);
  const oran = puanlar.odaM2Orani[odaSayisi];
  if (oran && !isNaN(netM2)) {
      if (netM2 >= oran.ideal[0] && netM2 <= oran.ideal[1]) addFactor(`İdeal ${odaSayisi}`, oran.puan);
      else if (netM2 < oran.ideal[0] && oran.dusukPuan !== undefined) addFactor(`Sıkışık ${odaSayisi}`, oran.dusukPuan);
      else if (netM2 > oran.ideal[1] && oran.yuksekPuan !== undefined) addFactor(`Geniş ${odaSayisi}`, oran.yuksekPuan);
  }

  // 3. Fırsat Skorunu Hesapla ve Yeni Nötr Tasarıma Göre Göster
  const endeksM2Fiyati = parseInt(String(ilan["Endeks m² Fiyatı"]).replace(/[^\d]/g, ''));
  const gercekFiyat = parseInt(String(ilan.Fiyat).replace(/[^\d]/g, ''));
  
  if (!isNaN(endeksM2Fiyati) && !isNaN(gercekFiyat) && !isNaN(netM2) && netM2 > 0) {
      const olmasiGerekenM2Fiyati = endeksM2Fiyati * (1 + (toplamPuan / 100));
      const gercekM2Fiyati = gercekFiyat / netM2;
      const firsatSkoru = Math.round(((olmasiGerekenM2Fiyati - gercekM2Fiyati) / olmasiGerekenM2Fiyati) * 100);

      const firsatGostergesi = document.getElementById('firsat-gostergesi');
      
      // Kırmızı/Yeşil/Mavi arka plan yerine, metin içindeki strong etiketine sınıf atıyoruz
      if (firsatSkoru > 5) {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, özelliklerine göre hesaplanan piyasa değerinin <strong class="altinda">%${firsatSkoru} altında.</strong>`;
      } else if (firsatSkoru < -5) {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, özelliklerine göre hesaplanan piyasa değerinin <strong class="ustunde">%${Math.abs(firsatSkoru)} üzerinde.</strong>`;
      } else {
          firsatGostergesi.innerHTML = `Bu ilanın m² fiyatı, özelliklerine göre hesaplanan piyasa değeriyle <strong class="uygun">uyumlu.</strong>`;
      }

      document.getElementById('sonuc-cumlesi').innerHTML = `Tahmini m² Değeri: <strong>${olmasiGerekenM2Fiyati.toLocaleString('tr-TR', {maximumFractionDigits:0})} TL</strong> | İstenen m² Fiyatı: <strong>${gercekM2Fiyati.toLocaleString('tr-TR', {maximumFractionDigits:0})} TL</strong>`;
      
      // Değeri Düşürenler başlığını, sadece liste doluysa göster (artık tek liste olduğu için bu gereksiz)
      // Bu bölümdeki eski başlık gizleme kodlarını silebiliriz.
      
      degerKarti.classList.remove('hidden');
  }

  // --- DİĞER İLANLAR VE ANALİZLER BÖLÜMÜ ---
  const digerIlanlarBolumu = document.getElementById('diger-ilanlar-bolumu');
  const digerIlanlarListesi = document.getElementById('diger-ilanlar-listesi');
  const mahalleAdiSpan = document.getElementById('mahalle-adi');
  const siralamaPlaceholder = document.getElementById('ilan-siralama-placeholder');
  const siralamaMetni = document.getElementById('siralama-metni');
  const ortalamaFiyatKutusu = document.getElementById('ortalama-fiyat-kutusu');

  if (digerIlanlar && digerIlanlar.length > 0) {
    mahalleAdiSpan.textContent = `${ilan['Mahalle']} / ${ilan['Konut Tipi']}`;
    const tumIlanlar = [ ...digerIlanlar, { "İlan ID": ilan['İlan ID'], "Başlık": ilan['Başlık'], "Fiyat": ilan['Fiyat'], "m² (Net)": ilan['m² (Net)'], "Endeks m² Fiyatı": ilan['Endeks m² Fiyatı'] } ];
    const ilanlarVeM2Fiyatlari = tumIlanlar.map(i => {
        const fiyat = parseInt(String(i.Fiyat).replace(/[^\d]/g, ''));
        const netM2 = parseInt(i['m² (Net)']);
        const m2Fiyati = (netM2 > 0) ? fiyat / netM2 : null;
        return { ...i, m2Fiyati };
    }).filter(i => i.m2Fiyati !== null);

    if (ilanlarVeM2Fiyatlari.length > 0) {
        const toplamEndeksM2Fiyati = ilanlarVeM2Fiyatlari.reduce((acc, i) => {
            const endeks = parseInt(String(i["Endeks m² Fiyatı"]).replace(/[^\d]/g, ''));
            return acc + (isNaN(endeks) ? 0 : endeks);
        }, 0);
        const ortalamaEndeksM2Fiyati = toplamEndeksM2Fiyati / ilanlarVeM2Fiyatlari.length;
        
        ortalamaFiyatKutusu.querySelector('p').innerHTML = `Mahalledeki Ortalama Endeks m² Fiyatı: <strong>${ortalamaEndeksM2Fiyati.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>`;
        ortalamaFiyatKutusu.classList.remove('hidden');

        tumIlanlar.sort((a, b) => parseInt(String(a.Fiyat).replace(/[^\d]/g, '')) - parseInt(String(b.Fiyat).replace(/[^\d]/g, '')));
        digerIlanlarListesi.innerHTML = '';
        let anaIlaninSirasi = -1;

        tumIlanlar.forEach((siradakiIlan, index) => {
            if (siradakiIlan['İlan ID'] == ilan['İlan ID']) {
                anaIlaninSirasi = index + 1;
            }
            const mevcutIlanDetay = ilanlarVeM2Fiyatlari.find(i => i['İlan ID'] == siradakiIlan['İlan ID']);
            if (mevcutIlanDetay) {
                const formatliFiyat = parseInt(String(siradakiIlan.Fiyat).replace(/[^\d]/g, '')).toLocaleString('tr-TR');
                let farkGostergesiHTML = '';
                if (mevcutIlanDetay.m2Fiyati && ortalamaEndeksM2Fiyati > 0) {
                    const farkYuzdesi = Math.round(((mevcutIlanDetay.m2Fiyati - ortalamaEndeksM2Fiyati) / ortalamaEndeksM2Fiyati) * 100);
                    if (farkYuzdesi > 0) farkGostergesiHTML = `<div class="fiyat-fark-gostergesi yukari"><span>%${farkYuzdesi}</span><i class="fas fa-arrow-up"></i></div>`;
                    else if (farkYuzdesi < 0) farkGostergesiHTML = `<div class="fiyat-fark-gostergesi asagi"><span>%${Math.abs(farkYuzdesi)}</span><i class="fas fa-arrow-down"></i></div>`;
                }
                let etiketHTML = '';
                if (index === 0) etiketHTML = `<span class="en-uygun-etiket yesil">En Uygun</span>`;
                else if (index === 1) etiketHTML = `<span class="en-uygun-etiket turuncu">2. Uygun</span>`;
                else if (index === 2) etiketHTML = `<span class="en-uygun-etiket turuncu">3. Uygun</span>`;
                const anaIlanSinifi = (siradakiIlan['İlan ID'] == ilan['İlan ID']) ? 'ana-ilan-vurgu' : '';
                digerIlanlarListesi.innerHTML += `<a href="ilan-detay.html?id=${siradakiIlan['İlan ID']}" class="diger-ilan-item ${anaIlanSinifi}"><span class="ilan-sira-no">${index + 1}.</span><div class="diger-ilan-bilgi"><h4 class="diger-ilan-baslik">${siradakiIlan['Başlık']}</h4><div class="diger-ilan-detaylar"><p class="diger-ilan-fiyat">${formatliFiyat} TL</p>${farkGostergesiHTML}</div></div>${etiketHTML}</a>`;
            }
        });

        if (anaIlaninSirasi !== -1 && siralamaMetni && siralamaPlaceholder) {
            siralamaMetni.textContent = `${ilan['Mahalle']} mahallesindeki en uygun ${anaIlaninSirasi}. fırsattır.`;
            siralamaPlaceholder.classList.remove('hidden');
        }
        digerIlanlarBolumu.classList.remove('hidden');
    }
  }

  // --- Favori Butonu Mantığı ---
  const favoriBtn = document.getElementById('favori-ekle-btn');
  if (isLoggedIn && favoriBtn) { favoriBtn.classList.remove('hidden'); }
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

// --- Initialize Plugins Fonksiyonu ---
// ilan-detay.js içindeki SADECE bu fonksiyonu değiştirin

function initializePlugins() {
  // --- SWIPER GALERİSİNİ BAŞLAT ---
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
      type: 'fraction',
    },
    thumbs: {
      swiper: thumbsSwiper,
    },
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
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });

  // --- HESAPLAMA POP-UP (MODAL) MANTIĞI ---
  const modal = document.getElementById('hesaplama-modal');
  const openBtn = document.getElementById('hesaplama-detay-ac');
  const closeBtn = document.getElementById('hesaplama-detay-kapat');

  if (modal && openBtn && closeBtn) {
    // Açma düğmesine tıklanınca
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.remove('hidden');
    });

    // Kapatma düğmesine tıklanınca
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Pop-up dışındaki gri alana tıklanınca
    modal.addEventListener('click', (e) => {
      // Sadece dıştaki .modal-overlay'e tıklandıysa kapat
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }
}