// Bu script, header.html yüklendiği anda çalışır ve butonları anında bulur.
  document.addEventListener("DOMContentLoaded", () => {
    let auth0Client = null;

    const configureClient = async () => {
      try {
        const response = await fetch("/.netlify/functions/auth-config");
        const config = await response.json();
        auth0Client = await auth0.createAuth0Client({
          domain: config.domain,
          clientId: config.clientId,
          authorizationParams: { redirect_uri: window.location.origin }
        });
      } catch (e) {
        console.error("Auth0 client yapılandırılamadı:", e);
      }
    };

    const updateUI = async () => { 
        if (!auth0Client) return;
        const isAuthenticated = await auth0Client.isAuthenticated();
        document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.classList.toggle("auth-hidden", !isAuthenticated));
        document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.classList.toggle("auth-hidden", isAuthenticated));
    };

    const initializeAuth = async () => {
      await configureClient();
      await updateUI();

      const handleLogin = () => auth0Client.loginWithRedirect();
      const handleLogout = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });

      document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.addEventListener("click", handleLogin));
      document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.addEventListener("click", handleLogout));
      
      const query = window.location.search;
      if (query.includes("code=") && query.includes("state=")) {
        await auth0Client.handleRedirectCallback();
        updateUI();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    // Tüm süreci başlat
    initializeAuth();
  });