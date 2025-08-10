// profil.js - Profil sayfasını yöneten nihai kod

document.addEventListener('DOMContentLoaded', async () => {
  // Header ve Footer'ı her zamanki gibi yükle
  fetch("header.html").then(res => res.text()).then(data => document.getElementById("header-placeholder").innerHTML = data);
  fetch("footer.html").then(res => res.text()).then(data => document.getElementById("footer-placeholder").innerHTML = data);

  let auth0Client = null;

  try {
    // Auth0 client'ını yapılandır
    const response = await fetch("/.netlify/functions/auth-config");
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId
    });

    const isAuthenticated = await auth0Client.isAuthenticated();

    if (isAuthenticated) {
      // --- KULLANICI GİRİŞ YAPMIŞSA ---
      document.getElementById('profil-icerik').classList.remove('hidden');
      
      const user = await auth0Client.getUser();
      
      // Profil bilgilerini doldur
      if (user) {
        document.getElementById('profil-resmi').src = user.picture || 'images/placeholder-avatar.png'; // Eğer profil resmi yoksa varsayılan resim
        document.getElementById('profil-adi').textContent = user.name || user.email;
        document.getElementById('profil-email').textContent = user.email;
      }

      // Favorileri çek ve göster
      await loadFavorites();

    } else {
      // --- KULLANICI GİRİŞ YAPMAMIŞSA ---
      document.getElementById('giris-yap-uyarisi').classList.remove('hidden');
      document.getElementById('profil-login-btn').addEventListener('click', () => {
          // Giriş yaptıktan sonra bu sayfaya geri dönmesi için redirect_uri'yi ayarla
          auth0Client.loginWithRedirect({
              authorizationParams: {
                  redirect_uri: window.location.href
              }
          });
      });
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
        // Auth0'dan erişim anahtarını al
        const { accessToken } = await window.getAuthClient();
        if (!accessToken) {
            throw new Error('Giriş yapmalısınız.');
        }

        // fetch isteğine Authorization başlığını ekle
        const res = await fetch('/.netlify/functions/get-favorites', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        // ... (fonksiyonun geri kalanı aynı kalacak) ...
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Favoriler alınamadı.');
        }
        const favorites = await res.json();
        const favoriListesiDiv = document.getElementById('favori-ilanlar-listesi');
        if (favorites && favorites.length > 0) {
            document.getElementById('favori-yok-mesaji').classList.add('hidden');
            favoriListesiDiv.innerHTML = '<h3>Favori İlanlarınız:</h3>';
            favorites.forEach(fav => {
                favoriListesiDiv.innerHTML += `<a href="ilan-detay.html?id=${fav.ilan_id}" class="block p-4 bg-white rounded shadow hover:bg-gray-50 border my-2">İlan ID: <strong>${fav.ilan_id}</strong></a>`;
            });
        } else {
            document.getElementById('favori-yok-mesaji').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
        document.getElementById('favori-ilanlar-listesi').innerHTML = `<p class="text-red-500">Favoriler yüklenirken bir hata oluştu: ${error.message}</p>`;
    }
}