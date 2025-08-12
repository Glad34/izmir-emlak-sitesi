console.log("✅ script.js YÜKLENDİ VE ÇALIŞIYOR.");

// ==========================================================
// ANA KONTROL MERKEZİ
// Tüm sayfa genelindeki JavaScript mantığı bu tek yerden yönetilir.
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {

    /**
     * 1. MOBİL MENÜ KONTROLÜ
     * Header fetch ile yüklendiği için, menü butonunu bulana kadar
     * periyodik olarak kontrol eder ve sonra tıklama olayını atar.
     */
    function setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        } else {
            setTimeout(setupMobileMenu, 100);
        }
    }
    setupMobileMenu(); // Mobil menü kontrolünü başlat


    /**
     * 2. HEADER SCROLL (KAYDIRMA) EFEKTİ
     * Hata vermemesi için elementlerin varlığını her zaman kontrol eder.
     */
    const header = document.querySelector('.custom-header');
    if (header) {
        window.addEventListener('scroll', () => {
            const logoDefault = document.querySelector('.logo-default');
            const logoScrolled = document.querySelector('.logo-scrolled');
            const navLinks = document.querySelectorAll('.nav-link');
            const hamburgerIcon = document.getElementById('hamburger-icon');

            if (window.scrollY > 50) {
                header.classList.add('scrolled');
                // Null kontrolü (element varsa işlem yap)
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


    /**
     * 3. TESTIMONIAL SLIDER (Sadece ilgili sayfada çalışır)
     */
    const slider = document.getElementById("testimonial-slider");
    if (slider) {
        let index = 0;
        const items = slider.getElementsByClassName("testimonial-item");
        const totalItems = items.length;
        if (totalItems > 1) {
            function showNextTestimonial() {
                items[index].style.display = "none";
                index = (index + 1) % totalItems;
                items[index].style.display = "block";
            }
            setInterval(showNextTestimonial, 3000);
            for (let i = 1; i < totalItems; i++) {
                items[i].style.display = "none";
            }
        }
    }


    /**
     * 4. DROPDOWN ARAMA KONTROLÜ (Sadece ilgili sayfada çalışır)
     */
    const input = document.getElementById("search-input");
    const dropdown = document.getElementById("dropdown-options");
    if (input && dropdown) {
        const options = dropdown.querySelectorAll("li");
        input.addEventListener("focus", () => dropdown.classList.remove("hidden"));
        options.forEach(option => {
            option.addEventListener("click", () => {
                const url = option.getAttribute("data-url");
                if (url) window.location.href = url;
            });
        });
        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.classList.add("hidden");
            }
        });
    }
});


// ==========================================================
// CHATBOT POP-UP KONTROL MERKEZİ
// Bu bölüm, sayfanın tüm içeriği (resimler vb.) yüklendikten sonra çalışır.
// ==========================================================
window.addEventListener("load", function() {
  const chatbotPopup = document.getElementById('chatbot-popup');
  const kapatDugmesi = document.getElementById('chatbot-kapat-btn');
  const canliSohbetAcDugmesi = document.getElementById('canli-sohbet-ac');

  function openChatbot() {
    if (chatbotPopup) chatbotPopup.classList.remove('chatbot-hidden');
  }
  function closeChatbot() {
    if (chatbotPopup) chatbotPopup.classList.add('chatbot-hidden');
  }

  // 5 saniye sonra otomatik aç
  setTimeout(openChatbot, 5000);
  
  // Olay dinleyicileri
  if (kapatDugmesi) kapatDugmesi.addEventListener('click', closeChatbot);
  if (canliSohbetAcDugmesi) {
    canliSohbetAcDugmesi.addEventListener('click', (event) => {
      event.preventDefault();
      openChatbot();
    });
  }

  // Yeni mesaj için sorgulama mekanizması
  setInterval(() => {
    const newAiMessageFlag = localStorage.getItem('newAiMessageFlag');
    if (newAiMessageFlag && chatbotPopup && chatbotPopup.classList.contains('chatbot-hidden')) {
      openChatbot();
      localStorage.removeItem('newAiMessageFlag');
    }
  }, 1000);
});