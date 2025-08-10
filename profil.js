// profil.js - "Tek Beyin" (auth.js) ile uyumlu nihai versiyon

document.addEventListener('DOMContentLoaded', async () => {
  // Header ve Footer'ı yükle
  fetch("header.html").then(res => res.text()).then(data => document.getElementById("header-placeholder").innerHTML = data);
  fetch("footer.html").then(res => res.text()).then(data => document.getElementById("footer-placeholder").innerHTML = data);

  // auth.js'in hazır olmasını bekle ve client ile giriş durumunu al
  const { auth0Client, isAuthenticated } = await window.getAuthClient();

  if (isAuthenticated && auth0Client) {
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
            if (auth0Client) {
                auth0Client.loginWithRedirect({
                    authorizationParams: {
                        redirect_uri: window.location.href
                    }
                });
            }
        });
    }
  }
});

/**
 * Giriş yapmış kullanıcının favorilerini Netlify fonksiyonu üzerinden çeker ve gösterir.
 */
async function loadFavorites() {
    try {
        const res = await fetch('/.netlify/functions/get-favorites');
        
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
                favoriListesiDiv.innerHTML += `
                    <a href="ilan-detay.html?id=${fav.ilan_id}" class="block p-4 bg-white rounded shadow hover:bg-gray-50 border my-2">
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