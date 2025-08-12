// ==========================================================
// Baron Gayrimenkul - Ana Kontrol Script'i
// ==========================================================
console.log("✅ script.js YÜKLENDİ VE ÇALIŞIYOR.");


document.addEventListener('DOMContentLoaded', () => {
    // Önce Header ve Footer'ı yükle
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');


    if (headerPlaceholder) {
        fetch("header.html")
            .then(res => res.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
                // Header yüklendikten SONRA ona bağlı fonksiyonları çalıştır
                initializeHeaderFunctions();
            });
    }


    if (footerPlaceholder) {
        fetch("footer.html")
            .then(res => res.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
                // Footer yüklendikten SONRA ona bağlı fonksiyonları çalıştır
                initializeFooterFunctions();
            });
    }


    // Header'a bağlı olmayan diğer fonksiyonlar burada başlayabilir
    initializePageFunctions();
});


/**
 * Bu ana fonksiyon, header ve footer yüklendikten sonra
 * onlara bağımlı olan tüm JS işlevlerini başlatır.
 */
function initializeHeaderFunctions() {
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
            const hamburgerIcon = document.getElementById('menu-toggle');


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
    setupAuth0();
}


/**
 * Footer yüklendikten sonra ona bağımlı işlevleri başlatır.
 */
function initializeFooterFunctions() {
    // --- CHATBOT POP-UP KONTROL MERKEZİ ---
    const chatbotPopup = document.getElementById('chatbot-popup');
    const kapatDugmesi = document.getElementById('chatbot-kapat-btn');
    const canliSohbetAcDugmesi = document.getElementById('canli-sohbet-ac');


    function openChatbot() {
        if (chatbotPopup) chatbotPopup.classList.remove('chatbot-hidden');
    }
    function closeChatbot() {
        if (chatbotPopup) chatbotPopup.classList.add('chatbot-hidden');
    }


    setTimeout(openChatbot, 5000);
    if (kapatDugmesi) kapatDugmesi.addEventListener('click', closeChatbot);
    if (canliSohbetAcDugmesi) {
        canliSohbetAcDugmesi.addEventListener('click', (event) => {
            event.preventDefault();
            openChatbot();
        });
    }
    setInterval(() => {
        const flag = localStorage.getItem('newAiMessageFlag');
        if (flag && chatbotPopup && chatbotPopup.classList.contains('chatbot-hidden')) {
            openChatbot();
            localStorage.removeItem('newAiMessageFlag');
        }
    }, 1000);
}


/**
 * Header/Footer'a bağlı olmayan, sayfa özelindeki işlevleri başlatır.
 */
function initializePageFunctions() {
    // --- TESTIMONIAL SLIDER ---
    const slider = document.getElementById("testimonial-slider");
    if (slider) { /* ... slider kodunuz ... */ }


    // --- DROPDOWN ARAMA ---
    const input = document.getElementById("search-input");
    if (input) { /* ... dropdown kodunuz ... */ }
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