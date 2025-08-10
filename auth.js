// auth.js - Auth0 Eklentisi ile Uyumlu Nihai Versiyon
let auth0Client = null;

/**
 * Auth0 client'ını, Netlify eklentisinin sağladığı ortam değişkenlerini
 * kullanarak yapılandırır.
 */
// auth.js içindeki configureClient fonksiyonu

const configureClient = async () => {
  try {
    const response = await fetch("/.netlify/functions/auth-config");
    if (!response.ok) {
        throw new Error(`Auth config fonksiyonu hata verdi: ${response.statusText}`);
    }
    const config = await response.json();
    
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin
        // "audience" satırını buradan kaldırdık.
      }
    });
  } catch (e) {
    console.error("Auth0 client yapılandırılamadı:", e);
  }
};

/**
 * Kullanıcının giriş durumuna göre UI'ı (butonları) günceller.
 */
const updateUI = async () => { 
    if (!auth0Client) return;
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.classList.toggle("auth-hidden", !isAuthenticated));
    document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.classList.toggle("auth-hidden", isAuthenticated));
};

/**
 * Tüm Auth0 mantığını başlatır, butonların yüklenmesini bekler.
 */
async function initializeAuth() {
  await configureClient();
  await updateUI();

  const handleLogin = () => auth0Client.loginWithRedirect();
  const handleLogout = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });

  document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.addEventListener("click", handleLogin));
  document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.addEventListener("click", handleLogout));
  
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    try {
        await auth0Client.handleRedirectCallback();
        updateUI();
    } catch(e) {
        console.error("Redirect callback hatası:", e);
    } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

/**
 * Header'daki butonlar sayfaya eklenene kadar bekler ve sonra Auth0'ı başlatır.
 */
function waitForAuthButtons() {
    const loginButton = document.getElementById('btn-login');
    
    if (loginButton) {
        initializeAuth();
    } else {
        setTimeout(waitForAuthButtons, 100);
    }
}

// Tüm süreç buradan başlar
window.addEventListener('load', waitForAuthButtons);