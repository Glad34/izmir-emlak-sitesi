// auth.js - Hata Ayıklama Versiyonu
let auth0Client = null;

console.log("1. auth.js dosyası yüklendi.");

const configureClient = async () => {
  console.log("2. configureClient fonksiyonu başladı.");
  try {
    console.log("3. Netlify fonksiyonu 'auth-config' çağrılıyor...");
    const response = await fetch("/.netlify/functions/auth-config");
    
    if (!response.ok) {
      console.error("Netlify fonksiyonu 'auth-config' HATA verdi! Status:", response.status);
      return;
    }
    
    const config = await response.json();
    console.log("4. Netlify fonksiyonundan ayarlar alındı:", config);

    if (!config.domain || !config.clientId) {
      console.error("HATA: Auth0 Domain veya Client ID Netlify fonksiyonundan boş geldi!");
      return;
    }

    console.log("5. Auth0 client oluşturuluyor...");
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
    console.log("6. Auth0 client başarıyla oluşturuldu!");
    
  } catch (e) {
    console.error("7. Auth0 client yapılandırılırken KRİTİK HATA:", e);
  }
};

// auth.js içindeki updateUI fonksiyonu

const updateUI = async () => { 
    if (!auth0Client) return;
    const isAuthenticated = await auth0Client.isAuthenticated();
    
    // 'hidden' yerine 'auth-hidden' sınıfını değiştiriyoruz
    document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.classList.toggle("auth-hidden", !isAuthenticated));
    document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.classList.toggle("auth-hidden", isAuthenticated));
};

async function initializeAuth() {
  console.log("Auth0 başlatılıyor...");
  await configureClient();
  updateUI();

  const handleLogin = () => {
    console.log("Giriş Yap butonuna tıklandı!");
    if (!auth0Client) {
      console.error("Giriş yapılamıyor, auth0Client hazır değil.");
      return;
    }
    auth0Client.loginWithRedirect();
  };

  const handleLogout = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });

  document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.addEventListener("click", handleLogin));
  document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.addEventListener("click", handleLogout));
  
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    updateUI();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function waitForAuthButtons() {
    const loginButton = document.getElementById('btn-login');
    if (loginButton) {
        initializeAuth();
    } else {
        setTimeout(waitForAuthButtons, 100);
    }
}

window.addEventListener('load', waitForAuthButtons);