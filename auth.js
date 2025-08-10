// auth.js
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
    const isAuthenticated = await auth0Client.isAuthenticated();
    document.getElementById("btn-logout").classList.toggle("hidden", !isAuthenticated);
    document.getElementById("btn-login").classList.toggle("hidden", isAuthenticated);
};

window.onload = async () => {
  await configureClient();
  updateUI();

  const loginButton = document.getElementById("btn-login");
  const logoutButton = document.getElementById("btn-logout");

  loginButton.addEventListener("click", async () => {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  });

  logoutButton.addEventListener("click", () => {
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  });

  const isAuthenticated = await auth0Client.isAuthenticated();
  if (isAuthenticated) {
    return;
  }
  
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    updateUI();
    window.history.replaceState({}, document.title, "/");
  }
};