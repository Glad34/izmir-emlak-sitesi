// profil.js
document.addEventListener('DOMContentLoaded', async () => {
  // Header ve Footer'ı yükle
  fetch("header.html").then(res => res.text()).then(data => document.getElementById("header-placeholder").innerHTML = data);
  fetch("footer.html").then(res => res.text()).then(data => document.getElementById("footer-placeholder").innerHTML = data);

  // Auth0 client'ını yapılandır
  const response = await fetch("/.netlify/functions/auth-config");
  const config = await response.json();
  const auth0 = await auth0.createAuth0Client({
    domain: config.domain,
    clientId: config.clientId
  });

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    // Kullanıcı giriş yapmışsa
    document.getElementById('profil-icerik').classList.remove('hidden');
    
    const user = await auth0.getUser();
    
    // Profil bilgilerini doldur
    document.getElementById('profil-resmi').src = user.picture;
    document.getElementById('profil-adi').textContent = user.name;
    document.getElementById('profil-email').textContent = user.email;

    // Favorileri çek ve göster
    await loadFavorites();

  } else {
    // Kullanıcı giriş yapmamışsa
    document.getElementById('giris-yap-uyarisi').classList.remove('hidden');
    document.getElementById('profil-login-btn').addEventListener('click', () => {
        auth0.loginWithRedirect({ redirect_uri: window.location.href });
    });
  }
});

async function loadFavorites() {
    try {
        const res = await fetch('/.netlify/functions/get-favorites');
        if (!res.ok) {
            // Eğer giriş yapılmamışsa fonksiyon 401 hatası döner
            document.getElementById('favori-ilanlar-listesi').innerHTML = '<p>Favorileri görmek için giriş yapmalısınız.</p>';
            return;
        }

        const favorites = await res.json();
        const favoriListesiDiv = document.getElementById('favori-ilanlar-listesi');

        if (favorites.length > 0) {
            document.getElementById('favori-yok-mesaji').classList.add('hidden');
            
            // Burada favori ilanların detaylarını göstermek için
            // her bir ilan ID'si ile ilan detaylarını çeken bir fonksiyon yazmak gerekir.
            // Şimdilik sadece ID'leri listeleyelim:
            favoriListesiDiv.innerHTML = '<h3>Favori İlan ID\'leri:</h3>';
            favorites.forEach(fav => {
                favoriListesiDiv.innerHTML += `<p>${fav.ilan_id}</p>`;
            });

        } else {
            // Favori yoksa mesaj görünür kalır
        }

    } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
        document.getElementById('favori-ilanlar-listesi').innerHTML = '<p>Favoriler yüklenirken bir hata oluştu.</p>';
    }
}