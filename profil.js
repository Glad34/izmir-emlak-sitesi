document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth0Client = await window.auth0ClientPromise;
    const isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      document.getElementById('profil-icerik').classList.remove('hidden');
      const user = await auth0Client.getUser();
      
      if (user) {
        document.getElementById('profil-resmi').src = user.picture || 'images/placeholder-avatar.png';
        document.getElementById('profil-adi').textContent = user.name || user.email;
        document.getElementById('profil-email').textContent = user.email;
      }
      
      await loadFavoritesWithDetails();

    } else {
      document.getElementById('giris-yap-uyarisi').classList.remove('hidden');
      const loginButton = document.getElementById('profil-login-btn');
      if (loginButton) {
        loginButton.addEventListener('click', () => {
            auth0Client.loginWithRedirect({ authorizationParams: { redirect_uri: window.location.href } });
        });
      }
    }
  } catch(e) {
      console.error("Profil sayfası yüklenirken hata oluştu:", e);
      document.getElementById('giris-yap-uyarisi').classList.remove('hidden');
      document.getElementById('giris-yap-uyarisi').innerHTML = '<h2 class="text-2xl text-red-500">Bir hata oluştu. Lütfen daha sonra tekrar deneyin.</h2>';
  }
});


/**
 * Favorileri çeker, ardından her birinin detayını alarak ekrana tam bir kart olarak basar.
 */
async function loadFavoritesWithDetails() {
    const favoriListesiDiv = document.getElementById('favori-ilanlar-listesi');
    try {
        const accessToken = await window.getAuthToken();
        if (!accessToken) throw new Error('Geçerli bir oturum anahtarı alınamadı.');

        // 1. Backend'den sadece favori ilan ID'lerini al
        const res = await fetch('/.netlify/functions/get-favorites', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Favoriler alınamadı.');
        }

        const favorites = await res.json();

        // 2. Favori var mı kontrol et
        if (favorites && favorites.length > 0) {
            document.getElementById('favori-yok-mesaji').classList.add('hidden');
            favoriListesiDiv.innerHTML = '<p class="text-gray-600 animate-pulse">Favori ilanlarınız yükleniyor...</p>'; // Kullanıcıya yükleniyor bilgisi ver

            // 3. Her bir ID için ilan detaylarını çekmek üzere bir Promise dizisi oluştur
            const ilanDetayPromises = favorites.map(fav => {
                const jsonURL = `https://script.google.com/macros/s/AKfycbw3Ye0dEXs5O4nmZ_PDQqJOGvEDM5hL1yP6EyO1lnpRh_Brj0kwJy6GP1ZSDrMPOi-5/exec?ilanID=${fav.ilan_id}`;
                return fetch(jsonURL).then(response => response.json());
            });

            // 4. Tüm detay çekme işlemlerinin BİRDEN tamamlanmasını bekle
            const ilanDetaylari = await Promise.all(ilanDetayPromises);
            
            favoriListesiDiv.innerHTML = ''; // Yükleniyor mesajını temizle

            // 5. Her bir ilan detayı için bir kart oluştur ve ekrana bas
            ilanDetaylari.forEach(ilan => {
                // Hata durumunda (ilan bulunamadıysa) bu ilanı atla
                if (!ilan || !ilan['İlan ID']) return;

                const fiyat = parseInt(String(ilan['Fiyat']).replace(/[^\d]/g, ''));
                const formatliFiyat = !isNaN(fiyat) ? `${fiyat.toLocaleString('tr-TR')} TL` : "Fiyat Belirtilmemiş";
                const resimUrl = ilan['Resim 1'] || 'images/placeholder.jpg'; // Ana resim yoksa varsayılan resim

                favoriListesiDiv.innerHTML += `
                  <a href="ilan-detay.html?id=${ilan['İlan ID']}" class="favorite-card">
                    <img src="${resimUrl}" alt="${ilan['Başlık']}" class="favorite-card__image">
                    <div class="favorite-card__content">
                      <h4 class="favorite-card__title">${ilan['Başlık']}</h4>
                      <p class="favorite-card__price">${formatliFiyat}</p>
                    </div>
                  </a>
                `;
            });

        } else {
            // Favori ilan yoksa mesajı göster
            document.getElementById('favori-yok-mesaji').classList.remove('hidden');
            favoriListesiDiv.innerHTML = ''; // Liste boşsa tamamen temizle
        }
    } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
        favoriListesiDiv.innerHTML = `<p class="text-red-500">Favoriler yüklenirken bir hata oluştu: ${error.message}</p>`;
    }
}