// ==========================================================
// Baron Gayrimenkul - Ana Kontrol Script'i
// ==========================================================

console.log("✅ script.js YÜKLENDİ VE ÇALIŞIYOR.");

// ----------------------------------------------------------
// BÖLÜM 1: TEMEL SAYFA İŞLEVLERİ
// Bu bölüm, DOM tamamen hazır olduğunda çalışır.
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    /**
     * 1.1 - Mobil Menü Kontrolü
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
            // Buton henüz yüklenmemiş, 100ms sonra tekrar dene
            setTimeout(setupMobileMenu, 100);
        }
    }
    setupMobileMenu(); // Mobil menü kontrolünü başlat


    /**
     * 1.2 - Header Scroll (Kaydırma) Efekti
     * Sayfa aşağı kaydırıldığında header'ın stilini, logosunu ve
     * menü renklerini değiştirir. Hata vermemesi için elementlerin
     * varlığını her zaman kontrol eder.
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
                if (logoDefault) logoDefault.classList.replace('block', 'hidden');
                if (logoScrolled) logoScrolled.classList.replace('hidden', 'block');
                if (hamburgerIcon) hamburgerIcon.classList.replace('text-white', 'text-black');
                navLinks.forEach(link => { if(link) link.classList.replace('text-white', 'text-gray-800') });
            } else {
                header.classList.remove('scrolled');
                if (logoDefault) logoDefault.classList.replace('hidden', 'block');
                if (logoScrolled) logoScrolled.classList.replace('block', 'hidden');
                if (hamburgerIcon) hamburgerIcon.classList.replace('text-black', 'text-white');
                navLinks.forEach(link => { if(link) link.classList.replace('text-gray-800', 'text-white') });
            }
        });
    }


    /**
     * 1.3 - Testimonial Slider (Sadece ilgili sayfada çalışır)
     */
    const slider = document.getElementById("testimonial-slider");
    if (slider) {
        let index = 0;
        const items = slider.getElementsByClassName("testimonial-item");
        const totalItems = items.length;
        if (totalItems > 1) { // Sadece 1'den fazla eleman varsa çalıştır
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
     * 1.4 - Dropdown Arama Kontrolü (Sadece ilgili sayfada çalışır)
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


// ----------------------------------------------------------
// BÖLÜM 2: CHATBOT POP-UP KONTROL MERKEZİ
// Bu bölüm, sayfanın tüm içeriği (resimler vb.) yüklendikten
// sonra çalışır.
// ----------------------------------------------------------
window.addEventListener("load", function() {
  const chatbotPopup = document.getElementById('chatbot-popup');
  const kapatDugmesi = document.getElementById('chatbot-kapat-btn');
  const canliSohbetAcDugmesi = document.getElementById('canli-sohbet-ac');

  // Pop-up'ı açma ve kapama fonksiyonları
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