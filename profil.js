// profil.js - Profil sayfasını yöneten NİHAİ ve MERKEZİ SİSTEME UYUMLU kod

document.addEventListener('DOMContentLoaded', async () => {
  // Not: Header/Footer yükleme işlemi artık merkezi script.js tarafından yapılıyor.
  // Bu yüzden buradaki fetch'leri kaldırıyoruz, script.js zaten hallediyor.

  try {
    // Merkezi Auth0 Promise'inin tamamlanmasını bekle
    const auth0Client = await window.auth0ClientPromise;
    const isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      // --- KULLANICI GİRİŞ YAPMIŞSA ---
      document.getElementById('profil-icerik').classList.remove('hidden');
      
      const user = await auth0Client.getUser();
      
      // Profil bilgilerini doldur
      if (user) {
        document.getElementById('profil-resmi').src = user.picture || 'images/placeholder-avatar.png';
        document.getElementById('profil-adi').textContent = user.name || user.email;
        document.getElementById('profil-email').textContent = user.email;
      }

      // Favorileri çek ve göster
      await loadFavorites();

    } else {
      // --- KULLANICI GİRİŞ YAPMAMIŞSA ---
      document.getElementById('giris-yap-uyarisi').classList.remove('hidden');
      
      const loginButton = document.getElementById('profil-login-btn');
      if (loginButton) {
        loginButton.addEventListener('click', () => {
            auth0Client.loginWithRedirect({
                authorizationParams: {
                    redirect_uri: window.location.href
                }
            });
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
 * Giriş yapmış kullanıcının favorilerini Netlify fonksiyonu üzerinden çeker ve gösterir.
 */
async function loadFavorites() {
    try {
        // ARTIK DOĞRU VE MERKEZİ FONKSİYONU KULLANIYORUZ!
        const accessToken = await window.getAuthToken();
        if (!accessToken) {
            throw new Error('Geçerli bir oturum anahtarı alınamadı.');
        }

        const res = await fetch('/.netlify/functions/get-favorites', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Favoriler alınamadı.');
        }

        const favorites = await res.json();
        const favoriListesiDiv = document.getElementById('favori-ilanlar-listesi');

        if (favorites && favorites.length > 0) {
            document.getElementById('favori-yok-mesaji').classList.add('hidden');
            
            // Mevcut listeyi temizle (eğer varsa)
            favoriListesiDiv.innerHTML = ''; 

            // Her bir favori için ilan detaylarını çek ve kart oluştur
            // Bu, sadece ID yerine ilan başlığı ve resmini göstermemizi sağlar
            // Not: Bu işlem, çok sayıda favori varsa yavaş olabilir. 
            // Daha gelişmiş sistemlerde bu tek bir backend isteği ile yapılır.
            
            // Şimdilik basitçe ID'leri gösterelim:
            favorites.forEach(fav => {
                favoriListesiDiv.innerHTML += `
                  <a href="ilan-detay.html?id=${fav.ilan_id}" class="block p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    İlan ID: <strong>${fav.ilan_id}</strong>
                  </a>`;
            });
        } else {
            document.getElementById('favori-yok-mesaji').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
        document.getElementById('favori-ilanlar-listesi').innerHTML = `<p class="text-red-500">Favoriler yüklenirken bir hata oluştu: ${error.message}</p>`;
    }
}