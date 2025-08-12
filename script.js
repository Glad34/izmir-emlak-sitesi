console.log("✅ script.js YÜKLENDİ VE ÇALIŞIYOR.");

// ==========================================================
// ANA KONTROL MERKEZİ
// Tüm sayfa genelindeki JavaScript mantığı bu tek yerden yönetilir.
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {

    /**
     * 1. HEADER'I SAYFAYA YÜKLE
     * Önce header'ın HTML'ini sayfaya ekleyelim.
     */
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        fetch("header.html")
            .then(res => res.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
                // Header yüklendikten SONRA diğer fonksiyonları çalıştır.
                initializePageFunctions();
            });
    } else {
        // Eğer header-placeholder yoksa bile diğer fonksiyonları çalıştır.
        initializePageFunctions();
    }
});


/**
 * Bu ana fonksiyon, header yüklendikten sonra veya doğrudan çalışarak
 * sayfadaki tüm diğer JS işlevlerini başlatır.
 */
function initializePageFunctions() {

    // --- MOBİL MENÜ KONTROLÜ ---
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- HEADER SCROLL (KAYDIRMA) EFEKTİ ---
    const header = document.querySelector('.custom-header');
    if (header) {
        window.addEventListener('scroll', () => {
            const logoDefault = document.querySelector('.logo-default');
            const logoScrolled = document.querySelector('.logo-scrolled');
            const navLinks = document.querySelectorAll('.nav-link');
            const hamburgerIcon = document.getElementById('hamburger-icon');

            if (window.scrollY > 50) {
                header.classList.add('scrolled');
                if (logoDefault) logoDefault.classList.replace('block', 'hidden');
                if (logoScrolled) logoScrolled.classList.replace('hidden', 'block');
                if (hamburgerIcon) hamburgerIcon.classList.replace('text-white', 'text-black');
                navLinks.forEach(link => { if (link) link.classList.replace('text-white', 'text-gray-800') });
            } else {
                header.classList.remove('scrolled');
                if (logoDefault) logoDefault.classList.replace('hidden', 'block');
                if (logoScrolled) logoScrolled.classList.replace('block', 'hidden');
                if (hamburgerIcon) hamburgerIcon.classList.replace('text-black', 'text-white');
                navLinks.forEach(link => { if (link) link.classList.replace('text-gray-800', 'text-white') });
            }
        });
    }

    // --- AUTH0 ÜYELİK SİSTEMİ ---
    // Bu fonksiyonu hemen çalıştır.
    setupAuth0();

    // --- TESTIMONIAL SLIDER ---
    const slider = document.getElementById("testimonial-slider");
    if (slider) {
        // ... (slider kodunuz buraya gelecek)
    }

    // --- DROPDOWN ARAMA ---
    const input = document.getElementById("search-input");
    const dropdown = document.getElementById("dropdown-options");
    if (input && dropdown) {
        // ... (dropdown kodunuz buraya gelecek)
    }
}


/**
 * AUTH0'ı başlatan ve yöneten ana fonksiyon.
 */
async function setupAuth0() {
    try {
      const response = await fetch("/.netlify/functions/auth-config");
      const config = await response.json();
      
      const auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId,
        authorizationParams: {
          redirect_uri: window.location.origin,
          audience: config.audience
        }
      });

      const updateUI = async () => { 
        const isAuthenticated = await auth0Client.isAuthenticated();
        const user = isAuthenticated ? await auth0Client.getUser() : null;
        document.querySelectorAll("#btn-logout, #btn-logout-mobil, #profil-link, #profil-link-mobil").forEach(el => el.classList.toggle("auth-hidden", !isAuthenticated));
        document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(el => el.classList.toggle("auth-hidden", isAuthenticated));
        if (isAuthenticated && user) {
            document.querySelectorAll("#profil-resmi-header, #profil-resmi-header-mobil").forEach(img => { if (img) img.src = user.picture; });
        }
      };

      const handleLogin = () => auth0Client.loginWithRedirect();
      const handleLogout = () => auth0Client.logout({ logoutParams: { returnTo: window.location.origin } });

      document.querySelectorAll("#btn-login, #btn-login-mobil").forEach(btn => btn.addEventListener("click", handleLogin));
      document.querySelectorAll("#btn-logout, #btn-logout-mobil").forEach(btn => btn.addEventListener("click", handleLogout));
      
      const query = window.location.search;
      if (query.includes("code=") && query.includes("state=")) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      await updateUI();

    } catch (e) {
      console.error("Auth0 başlatılırken hata oluştu:", e);
    }
}


/**
 * CHATBOT POP-UP KONTROL MERKEZİ
 */
window.addEventListener("load", function() {
  // ... (chatbot kodunuz burada olduğu gibi kalabilir, o doğru çalışıyordu)
});