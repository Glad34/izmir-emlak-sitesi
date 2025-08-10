// auth.js - Mobil Uyumlu Son Hal
let auth0Client = null;

const configureClient = async () => {
  try {
    const response = await fetch("/.netlify/functions/auth-config");
    const config = await response.json();
    auth0Client = await auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId
    });
  } catch (e) {
    console.error("Auth0 client yapılandırılamadı:", e);
  }
};

const updateUI = async () => { 
    if (!auth0Client) return;
    const isAuthenticated = await auth0Client.isAuthenticated();
    // Masaüstü Butonları
    document.getElementById("btn-logout").classList.toggle("hidden", !isAuthenticated);
    document.getElementById("btn-login").classList.toggle("hidden", isAuthenticated);
    // Mobil Butonlar
    document.getElementById("btn-logout-mobil").classList.toggle("hidden", !isAuthenticated);
    document.getElementById("btn-login-mobil").classList.toggle("hidden", isAuthenticated);
};

window.onload = async () => {
  await configureClient();
  updateUI();

  const handleLogin = async () => {
    await auth0Client.loginWithRedirect({
      authorizationParams: { redirect_uri: window.location.origin }
    });
  };

  const handleLogout = () => {
    auth0Client.logout({
      logoutParams: { returnTo: window.location.origin }
    });
  };

  // Olay Dinleyicileri
  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-login-mobil").addEventListener("click", handleLogin);
  document.getElementById("btn-logout-mobil").addEventListener("click", handleLogout);

  const isAuthenticated = await auth0Client.isAuthenticated();
  if (isAuthenticated) {
    return;
  }
  
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    updateUI();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};