document.addEventListener("DOMContentLoaded", function () {
    // Testimonial Slider
    const slider = document.getElementById("testimonial-slider");
    if (slider) {
        let index = 0;
        const items = slider.getElementsByClassName("testimonial-item");
        const totalItems = items.length;

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

    // Hamburger Menü Aç/Kapat
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener("click", function () {
            mobileMenu.classList.toggle("hidden");
        });
    }

    // Dropdown Seçeneklerinden Sayfaya Gitme
    const input = document.getElementById("search-input");
    const dropdown = document.getElementById("dropdown-options");

    if (input && dropdown) {
        const options = dropdown.querySelectorAll("li");

        input.addEventListener("focus", function () {
            dropdown.classList.remove("hidden");
        });

        options.forEach(option => {
            option.addEventListener("click", function () {
                const url = option.getAttribute("data-url");
                if (url) {
                    window.location.href = url;
                }
            });
        });

        // Input dışına tıklanınca kapat
        document.addEventListener("click", function (e) {
            if (!dropdown.contains(e.target) && e.target !== input) {
                dropdown.classList.add("hidden");
            }
        });
    }
});

// Scroll Efekti (dışarıda kalabilir)
window.addEventListener("scroll", function () {
    const header = document.querySelector("header");
    const hamburgerIcon = document.getElementById("hamburger-icon");

    if (window.scrollY > 50) {
        header.classList.add("scrolled");
        hamburgerIcon?.classList.remove("text-white");
        hamburgerIcon?.classList.add("text-black");
    } else {
        header.classList.remove("scrolled");
        hamburgerIcon?.classList.add("text-white");
        hamburgerIcon?.classList.remove("text-black");
    }
});





// script.js dosyasının uygun bir yerine bu kodu ekleyin.
// Bu fonksiyon tüm sayfa tamamen yüklendiğinde çalışır.
window.addEventListener("load", function() {
    
    // Gerekli HTML elementlerini seç
    const chatbotPopup = document.getElementById('chatbot-popup');
    const kapatDugmesi = document.getElementById('chatbot-kapat-btn');
    const canliSohbetAcDugmesi = document.getElementById('canli-sohbet-ac'); // Yeni linkimizi seçtik

    // --- Otomatik Açılma Mantığı (5 Saniye Sonra) ---
    if (chatbotPopup) {
      setTimeout(() => {
        // Eğer chatbot zaten başka bir şekilde açılmadıysa aç
        if (chatbotPopup.classList.contains('chatbot-hidden')) {
           chatbotPopup.classList.remove('chatbot-hidden');
        }
      }, 5000);
    }
    
    // --- Kapatma Düğmesi Mantığı ---
    if (kapatDugmesi) {
      kapatDugmesi.addEventListener('click', () => {
        if (chatbotPopup) {
          chatbotPopup.classList.add('chatbot-hidden');
        }
      });
    }

    // --- "Canlı Sohbet" Linkine Tıklama Mantığı (YENİ EKLENDİ) ---
    if (canliSohbetAcDugmesi) {
      canliSohbetAcDugmesi.addEventListener('click', (event) => {
        event.preventDefault(); // Linkin sayfanın başına gitmesini engelle

        if (chatbotPopup) {
          // Chatbot'u görünür yap
          chatbotPopup.classList.remove('chatbot-hidden');
        }
      });
    }
});
