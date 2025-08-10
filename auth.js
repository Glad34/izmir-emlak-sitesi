// auth.js - Zamanlama Sorunlarını Çözen Nihai Versiyon
let auth0Client = null;

// Auth0 client'ını yapılandıran fonksiyon
const configureClient = async () => {
  try {
    const response = await fetch("/.netlify/functions/auth-config");
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  } catch (e) {
    console.error("Auth0 client yapılandırılamadı:", e);
  }
};

// UI'ı (butonların görünürlüğünü) güncelleyen fonksiyon
const updateUI = async () => { 
    if (!auth0Client) return;
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    // Masaüstü ve Mobil butonların görünürlüğünü ayarla
    document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.classList.toggle("hidden", !isAuthenticated));
    document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.classList.toggle("hidden", isAuthenticated));
};

/**
 * Bu ana fonksiyon, tüm Auth0 mantığını başlatır.
 * Butonların DOM'a eklenmesini bekler ve sonra olay dinleyicilerini atar.
 */
async function initializeAuth() {
  await configureClient();
  updateUI();

  const handleLogin = () => auth0Client.loginWithRedirect();
  const handleLogout = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });

  // Olay dinleyicilerini hem masaüstü hem mobil butonlara ata
  document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.addEventListener("click", handleLogin));
  document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.addEventListener("click", handleLogout));
  
  // Auth0 yönlendirmesinden geri gelindiğinde durumu işle
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    updateUI();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Bu fonksiyon, header'daki butonlar sayfaya eklenene kadar bekler.
 * Bulduğu anda da Auth0'ı başlatır. Bu, zamanlama sorununu çözer.
 */
function waitForAuthButtons() {
    const loginButton = document.getElementById('btn-login');
    
    if (loginButton) {
        // Buton bulundu, Auth0'ı başlatabiliriz!
        initializeAuth();
    } else {
        // Buton henüz yok, 100ms sonra tekrar kontrol et
        setTimeout(waitForAuthButtons, 100);
    }
}

// Tüm süreç buradan başlar
window.addEventListener('load', waitForAuthButtons);