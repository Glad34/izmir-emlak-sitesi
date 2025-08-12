// auth.js - TÜM SİTENİN TEK AUTH0 BEYNİ (AYRI DOSYA)
let auth0Client = null;
let isAuthenticated = false;
let accessToken = null;

window.getAuthClient = async () => {
    if (auth0Client) return { auth0Client, isAuthenticated, accessToken };
    try {
        const response = await fetch("/.netlify/functions/auth-config");
        const config = await response.json();
        auth0Client = await auth0.createAuth0Client({
            domain: config.domain,
            clientId: config.clientId,
            authorizationParams: {
                redirect_uri: window.location.origin,
                audience: config.audience
            }
        });
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
            accessToken = await auth0Client.getTokenSilently();
        }
        return { auth0Client, isAuthenticated, accessToken };
    } catch (e) {
        console.error("Auth0 client hatası:", e);
        return { auth0Client: null, isAuthenticated: false, accessToken: null };
    }
};

async function updateHeaderUI() {
    const { isAuthenticated, auth0Client } = await window.getAuthClient();
    if (!auth0Client) return;

    const user = isAuthenticated ? await auth0Client.getUser() : null;

    document.querySelectorAll("#btn-logout, #btn-logout-mobil, #profil-link, #profil-link-mobil").forEach(el => { if(el) el.classList.toggle("auth-hidden", !isAuthenticated) });
    document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(el => { if(el) el.classList.toggle("auth-hidden", isAuthenticated) });

    if (isAuthenticated && user) {
        document.querySelectorAll("#profil-resmi-header, #profil-resmi-header-mobil").forEach(img => {
            if (img) img.src = user.picture;
        });
    }

    document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => { if(btn) btn.onclick = () => auth0Client.loginWithRedirect() });
    document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => { if(btn) btn.onclick = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } }) });
}

// Header dinamik olarak yüklendiği için, butonların varlığını periyodik olarak kontrol et
function waitForHeaderButtons() {
    const loginButton = document.getElementById('btn-login');
    if (loginButton) {
        updateHeaderUI();
    } else {
        setTimeout(waitForHeaderButtons, 100);
    }
}

waitForHeaderButtons();