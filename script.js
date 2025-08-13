// ==========================================================
// Baron Gayrimenkul - Ana Kontrol Script'i (MERKEZİ YAPI)
// ==========================================================
console.log("✅ script.js YÜKLENDİ VE ÇALIŞIYOR.");

// --- AUTH0 MERKEZİ KONTROL ---
// Auth0 istemcisini (client) global olarak erişilebilir hale getirmek için bir Promise oluşturuyoruz.
// Bu sayede diğer script'ler (ilan-detay.js gibi) Auth0'ın yüklenmesini bekleyebilir.
window.auth0ClientPromise = new Promise(async (resolve, reject) => {
    try {
        const response = await fetch("/.netlify/functions/auth-config");
        if (!response.ok) throw new Error("Auth config alınamadı.");
        const config = await response.json();

        const auth0Client = await auth0.createAuth0Client({
            domain: config.domain,
            clientId: config.clientId,
            authorizationParams: {
                redirect_uri: window.location.origin,
                audience: config.audience,
            },
        });

        // Hata veren `getAuthClient` fonksiyonunu burada global olarak tanımlıyoruz.
        window.getAuthClient = () => auth0Client;
        
        // Favori ekleme gibi işlemler için daha güvenli olan token alma fonksiyonunu da tanımlıyoruz.
        // script.js dosyasında bu fonksiyonu bulun ve değiştirin:

// Favori ekleme gibi işlemler için daha güvenli olan token alma fonksiyonunu da tanımlıyoruz.
window.getAuthToken = async () => {
    const client = window.getAuthClient();
    if (!client) {
        throw new Error("Auth0 istemcisi hazır değil.");
    }
    
    const isAuthenticated = await client.isAuthenticated();
    if (!isAuthenticated) {
        throw new Error("Bu işlem için giriş yapmanız gerekmektedir.");
    }

    try {
        // Access token'ı sessizce (popup olmadan) al.
        const token = await client.getTokenSilently();
        if (!token) {
            // Bu ek kontrol, token'ın boş gelme ihtimaline karşı bir güvencedir.
            throw new Error("Alınan token geçersiz veya boş.");
        }
        return token;
    } catch (error) {
        // getTokenSilently'den gelebilecek "login_required" gibi hataları yakala
        console.error("Token alınırken hata oluştu (login_required olabilir):", error);
        // Hatanın sebebini daha anlaşılır bir şekilde ön yüze geri fırlat.
        throw new Error("Oturumunuzun yenilenmesi gerekiyor. Lütfen tekrar giriş yapın.");
    }
};
        console.log("Auth0 istemcisi başarıyla başlatıldı ve global olarak hazır.");
        resolve(auth0Client); // Promise'i başarıyla tamamla ve istemciyi döndür.
    } catch (e) {
        console.error("Auth0 başlatılırken kritik hata:", e);
        reject(e); // Hata durumunda Promise'i reddet.
    }
});
// --- AUTH0 MERKEZİ KONTROL BİTİŞ ---


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

    // Header/Footer'a bağlı olmayan diğer fonksiyonlar
    initializePageFunctions();
});


/**
 * Header yüklendikten sonra ona bağımlı olan tüm JS işlevlerini başlatır.
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
   
    // --- AUTH0 ÜYELİK SİSTEMİ ARAYÜZÜNÜ KUR ---
    setupAuthUI();
}

/**
 * Footer yüklendikten sonra ona bağımlı işlevleri başlatır. (DEĞİŞİKLİK YOK)
 */
// script.js dosyasındaki bu fonksiyonu tamamen güncelleyin

/**
 * Footer yüklendikten sonra ona bağımlı işlevleri başlatır.
 */
function initializeFooterFunctions() {
    
    // --- İLETİŞİM MENÜSÜ KONTROLÜ (NİHAİ SÜRÜM) ---
    const launcher = document.getElementById("iletisim-launcher");
    const menu = document.getElementById("iletisim-menusu");
    const openBtn = document.getElementById("openContact");
    const closeBtn = document.getElementById("closeContact");

    // Tüm elementlerin var olduğundan emin ol
    if (launcher && menu && openBtn && closeBtn) {
        
        // Ana butona (openBtn) tıklanınca menüyü aç
        openBtn.addEventListener("click", () => {
            launcher.style.display = "none";
            menu.classList.remove("hidden");
        });

        // İptal butonuna (closeBtn) tıklanınca menüyü kapat
        closeBtn.addEventListener("click", () => {
            menu.classList.add("hidden");
            launcher.style.display = "block";
        });
    }

    // --- CHATBOT KONTROL MERKEZİ ---
    const chatbotPopup = document.getElementById('chatbot-popup');
    const kapatDugmesi = document.getElementById('chatbot-kapat-btn');
    const canliSohbetAcDugmesi = document.getElementById('canli-sohbet-ac');

    function openChatbot() { if (chatbotPopup) chatbotPopup.classList.remove('chatbot-hidden'); }
    function closeChatbot() { if (chatbotPopup) chatbotPopup.classList.add('chatbot-hidden'); }

    setTimeout(openChatbot, 5000);
    if (kapatDugmesi) kapatDugmesi.addEventListener('click', closeChatbot);
    
    // Canlı sohbet linkine tıklandığında hem iletişim menüsünü kapatıp hem de chatbotu aç
    if (canliSohbetAcDugmesi) {
        canliSohbetAcDugmesi.addEventListener('click', (event) => {
            event.preventDefault();
            if (menu) menu.classList.add('hidden'); 
            if (launcher) launcher.style.display = "block"; 
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
 * Header/Footer'a bağlı olmayan, sayfa özelindeki işlevleri başlatır. (DEĞİŞİKLİK YOK)
 */
function initializePageFunctions() {
    // Bu alana gelecekte eklenecek genel sayfa fonksiyonları gelebilir.
}

/**
 * AUTH0 UI'ını (Kullanıcı Arayüzü) başlatan ve yöneten fonksiyon.
 */
async function setupAuthUI() {
    try {
        // Global Promise'in çözülmesini ve Auth0'ın hazır olmasını bekle
        const auth0Client = await window.auth0ClientPromise;

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
        console.error("Auth0 UI kurulurken hata oluştu:", e);
    }
}