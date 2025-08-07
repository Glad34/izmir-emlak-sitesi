document.addEventListener("DOMContentLoaded", () => {
  // Header ve Footer'ı yükle
  fetch("header.html").then(res => res.text()).then(data => document.getElementById("header-placeholder").innerHTML = data);
  fetch("footer.html").then(res => res.text()).then(data => document.getElementById("footer-placeholder").innerHTML = data);

  // URL'den ilan ID'sini al
  const params = new URLSearchParams(window.location.search);
  const ilanID = params.get('id');

  if (!ilanID) {
    document.getElementById("loading-spinner").innerHTML = "<p class='text-red-500 text-center text-xl'>Hata: İlan kimliği bulunamadı.</p>";
    return;
  }

  // İlan verisini çek
  fetchIlanData(ilanID);
});

async function fetchIlanData(id) {
  // Google Apps Script URL'nizi buraya yapıştırın ve ?id= parametresini ekleyin
  const jsonURL = `https://script.google.com/macros/s/AKfycbw3Ye0dEXs5O4nmZ_PDQqJOGvEDM5hL1yP6EyO1lnpRh_Brj0kwJy6GP1ZSDrMPOi-5/exec?ilanID=${id}`;

  try {
    const response = await fetch(jsonURL);
    if (!response.ok) {
      throw new Error('Sunucu hatası!');
    }
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }
    
    // Veriyi sayfaya yerleştir
    populatePage(data);

  } catch (error) {
    console.error("Veri çekilirken hata oluştu:", error);
    document.getElementById("loading-spinner").innerHTML = `<p class='text-red-500 text-center text-xl'>Hata: İlan yüklenemedi. (${error.message})</p>`;
  }
}

function populatePage(ilan) {
  // Başlık ve Başlık etiketini güncelle
  document.title = ilan['Başlık'];
  document.getElementById('ilan-baslik').textContent = ilan['Başlık'];
  document.getElementById('ilan-konum').innerHTML += ilan['Konum'];

  // --- 1. DEĞİŞİKLİK: Fiyat formatı düzeltildi ---
  // Gelen fiyat metnindeki tüm sayı olmayan karakterleri (nokta, TL vs.) temizle, sonra formatla.
  const fiyatSayisi = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
  if (!isNaN(fiyatSayisi)) {
    document.getElementById('ilan-fiyat').textContent = `${fiyatSayisi.toLocaleString('tr-TR')} TL`;
  } else {
    document.getElementById('ilan-fiyat').textContent = "Belirtilmemiş";
  }

  // Açıklama
  document.getElementById('ilan-aciklama').innerHTML = ilan['Açıklama'].replace(/\n/g, '<br>');

  // Özellikler listesini oluştur
  const ozelliklerListesi = document.getElementById('ilan-ozellikler');
  const ozellikler = {
    "İlan Tipi": ilan['İlan Tipi'],
    "Oda Sayısı": ilan['Oda Sayısı'],
    "m² (Brüt)": ilan['m² (Brüt)'],
    "Bina Yaşı": ilan['Bina Yaşı'],
    "Isıtma": ilan['Isıtma'],
    "Banyo Sayısı": ilan['Banyo Sayısı'],
    "Balkon": ilan['Balkon'],
    "Eşyalı": ilan['Eşyalı'],
    "Site İçerisinde": ilan['Site İçerisinde'],
    "Krediye Uygun": ilan['Krediye Uygun']
  };

  ozelliklerListesi.innerHTML = ''; // Önceki verileri temizle
  for (const [key, value] of Object.entries(ozellikler)) {
    if (value && value.trim() !== "") { // Sadece dolu olan özellikleri göster
      const listItem = document.createElement('li');
      listItem.className = 'flex justify-between items-center text-sm py-2 border-b';
      listItem.innerHTML = `
        <span class="text-gray-600">${key}</span>
        <span class="font-semibold text-gray-800">${value}</span>
      `;
      ozelliklerListesi.appendChild(listItem);
    }
  }

  // --- 2. DEĞİŞİKLİK: Danışman adı sabitlendi ---
  document.getElementById('danisman-adi').textContent = "Onur Başaran"; // İsim sabitlendi
  
  // Danışman telefonunu e-tablodan alıp WhatsApp linki oluştur
// --- YENİ KOD ---
// Danışman telefonunu alıp WhatsApp linki için doğru formata çevir
const telNoRaw = ilan['Danışman Cep'] || "05308775368"; // Eğer Cep no boşsa sizin varsayılan numaranız
let telNoFormatli = telNoRaw.toString().replace(/\D/g, ''); // Tüm sayı olmayan karakterleri sil (+, boşluk, parantez vb.)

// Numaranın başındaki '0' veya '90' kontrolü
if (telNoFormatli.startsWith('0')) {
  // Eğer '0530...' ile başlıyorsa, baştaki 0'ı atıp '90' ekle
  telNoFormatli = '90' + telNoFormatli.substring(1);
} else if (telNoFormatli.length === 10) {
  // Eğer '530...' ile (10 haneli) başlıyorsa, başına '90' ekle
  telNoFormatli = '90' + telNoFormatli;
}
// Eğer zaten '90530...' diye başlıyorsa hiçbir şey yapma, format doğru demektir.

// --- YENİ KOD (SABİT NUMARA) ---
// WhatsApp linki her zaman sabit bir numaraya yönlendirilecek.
document.getElementById('danisman-tel').href = `https://wa.me/905308775368`; // Sizin numaranız

  // Resim galerisini oluştur
  const anaResim = document.getElementById('ana-resim');
  const thumbnailGaleri = document.getElementById('thumbnail-galeri');
  thumbnailGaleri.innerHTML = ''; // Önceki resimleri temizle
  const resimler = [];
  for (let i = 1; i <= 15; i++) {
    if (ilan[`Resim ${i}`] && ilan[`Resim ${i}`].trim() !== "") {
      resimler.push(ilan[`Resim ${i}`]);
    }
  }

  if (resimler.length > 0) {
    anaResim.src = resimler[0];
    resimler.forEach(resimSrc => {
      const thumb = document.createElement('img');
      thumb.src = resimSrc;
      thumb.className = 'thumbnail-image';
      thumb.onclick = () => {
        anaResim.src = resimSrc;
      };
      thumbnailGaleri.appendChild(thumb);
    });
  } else {
    anaResim.src = 'images/placeholder.jpg';
  }

  // Yüklenme animasyonunu gizle, içeriği göster
  document.getElementById('loading-spinner').classList.add('hidden');
  document.getElementById('ilan-icerik').classList.remove('hidden');
}