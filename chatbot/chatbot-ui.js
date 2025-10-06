// chatbot-ui.js - TOPLU FORM VE VERİ KAYDI İÇİN NİHAİ KOD

document.addEventListener('DOMContentLoaded', () => {
    // HTML Elementleri
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    // Durum Değişkenleri
    let conversationHistory = "";
    let currentStrategy = {};
    let lastAiAdim = ""; // AI'nın son adımını sakla (örn: 'telefon_sor')
    const musteriId = `M-${Date.now()}`; // Her konuşma için benzersiz bir ID

    // ==================
    // ANA FONKSİYONLAR
    // ==================

    // 1. Backend'e Mesaj Gönderme
    async function sendMessage(payload) {
        showTypingIndicator();
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Yanıt bekleniyor...";

        try {
            // İsteği chatbot fonksiyonuna gönder
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            handleAiResponse(data);

        } catch (error) {
            console.error("SendMessage Hatası:", error);
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
        } finally {
            hideTypingIndicator();
            // Duruma göre input'u handleAiResponse yönetecek
        }
    }

    // 2. Gelen Yanıtı İşleme
    function handleAiResponse(data) {
        lastAiAdim = data.adim; // Son adımı güncelle
        currentStrategy = data.arama_stratejisi || currentStrategy;
        
        if (data.cevap) {
            addMessageToUI('ai', data.cevap);
            conversationHistory += `Asistan: ${data.cevap}\n`;
        }

        // Arayüzde yapılacak eylemleri belirle
        if (data.eylem === 'form_goster') {
            renderMultiChoiceForm();
        } else if (data.secenekler && data.secenekler.length > 0) {
            renderButtons(data.secenekler);
        } else {
            // Form veya buton yoksa input'u aç
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.focus();
        }

        if (data.eylem && data.eylem.includes('sunum_yap')) {
            addListingsToUI(data.ilan_sonuclari);
        }
    }

    // 3. Veriyi E-Tabloya Kaydetme/Güncelleme
    async function saveData(type, data) {
        try {
            await fetch('/api/save-data', {
                method: 'POST',
                body: JSON.stringify({ type, ...data })
            });
        } catch (error) {
            console.error("Veri kaydetme hatası:", error);
        }
    }

    // ==================
    // FORM VE BUTON ETKİLEŞİMLERİ
    // ==================

    let formSelections = { amac: null, mulkTipi: null, butce: null, odaSayisi: null };

    messagesContainer.addEventListener('click', async (event) => {
        const target = event.target;

        // Çoktan seçmeli form içindeki seçenek butonları
        if (target.tagName === 'BUTTON' && target.parentElement.classList.contains('options')) {
            const key = target.parentElement.getAttribute('data-key');
            const value = target.getAttribute('data-value');
            formSelections[key] = value;
            
            Array.from(target.parentElement.children).forEach(btn => btn.classList.remove('selected'));
            target.classList.add('selected');

            const allSelected = Object.values(formSelections).every(v => v !== null);
            document.getElementById('form-submit-btn').disabled = !allSelected;
        }

        // Formun ana ONAYLA butonu
        if (target.id === 'form-submit-btn') {
            target.disabled = true;
            target.textContent = "Gönderiliyor...";

            // 1. Veriyi e-tabloya ilk kez kaydet
            await saveData('INITIAL_SUBMIT', { musteriId, isim: currentStrategy.isim, ...formSelections });
            
            // 2. Arayüzü güncelle
            const userMessage = `Seçimlerim: ${formSelections.amac}, ${formSelections.mulkTipi}, ${formSelections.butce}, ${formSelections.odaSayisi}`;
            addMessageToUI('user', userMessage);
            conversationHistory += `Kullanıcı: ${userMessage}\n`;
            document.getElementById('multi-choice-form').remove();

            // 3. AI'a onaya gönder
            const payload = {
                message: `Kullanıcı Form Seçimleri: ${userMessage}`,
                history: conversationHistory,
                current_strategy: { ...currentStrategy, ...formSelections }
            };
            sendMessage(payload);
        }

        // "Onayla ve İlanları Getir" gibi standart seçenek butonları
        if (target.classList.contains('chat-option-button')) {
             const message = target.textContent;
             addMessageToUI('user', message);
             conversationHistory += `Kullanıcı: ${message}\n`;
             document.getElementById('chat-options-container').remove();
             sendMessage({ message, history: conversationHistory, current_strategy: currentStrategy });
        }
    });

    // Yazılı Giriş Formu (İsim ve Telefon Numarası için)
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToUI('user', message);
        conversationHistory += `Kullanıcı: ${message}\n`;
        const tempMessage = userInput.value; // Değeri kaybolmadan sakla
        userInput.value = '';

        // Eğer son adım telefon sormaksa, bu girişi telefon olarak kabul et ve kaydet
        if (lastAiAdim === 'telefon_sor') {
             await saveData('PHONE_SUBMIT', { musteriId, telefon: tempMessage });
             addMessageToUI('ai', "Teşekkür ederim. Bilgileriniz alındı, en kısa sürede size dönüş yapacağım.");
             userInput.disabled = true;
             sendButton.disabled = true;
             userInput.placeholder = "Görüşme tamamlandı.";
        } else {
            // Diğer durumlar (örn: ilk isim girişi)
            sendMessage({ message, history: conversationHistory, current_strategy: currentStrategy });
        }
    });

    // ==================
    // ARAYÜZ OLUŞTURMA FONKSİYONLARI (Renderers)
    // ==================

    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const p = document.createElement('p');
        p.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(p);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function renderButtons(options) {
        const container = document.createElement('div');
        container.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.className = 'chat-option-button';
            container.appendChild(button);
        });
        messagesContainer.appendChild(container);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function renderMultiChoiceForm() {
        formSelections = { amac: null, mulkTipi: null, butce: null, odaSayisi: null }; // Formu sıfırla
        const formContainer = document.createElement('div');
        formContainer.id = 'multi-choice-form';
        formContainer.innerHTML = `
            <div class="form-group"><label>Arama Amacınız:</label><div class="options" data-key="amac"><button data-value="Oturum Amaçlı">Oturum Amaçlı</button><button data-value="Yatırım Amaçlı">Yatırım Amaçlı</button></div></div>
            <div class="form-group"><label>Mülk Tipi:</label><div class="options" data-key="mulkTipi"><button data-value="Daire">Daire</button><button data-value="Müstakil Ev">Müstakil Ev</button><button data-value="Villa">Villa</button></div></div>
            <div class="form-group"><label>Bütçe Aralığınız:</label><div class="options" data-key="butce"><button data-value="0 - 5.000.000 TL">0-5M</button><button data-value="5.000.000 - 10.000.000 TL">5-10M</button><button data-value="10.000.000 - 20.000.000 TL">10-20M</button><button data-value="20.000.000 TL ve Üzeri">20M+</button></div></div>
            <div class="form-group"><label>Minimum Oda Sayısı:</label><div class="options" data-key="odaSayisi"><button data-value="1+1">1+1</button><button data-value="2+1">2+1</button><button data-value="3+1">3+1</button><button data-value="4+1 ve üzeri">4+1+</button></div></div>
            <button id="form-submit-btn" disabled>Tümünü Seçip Onaylayın</button>`;
        messagesContainer.appendChild(formContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function addListingsToUI(results) { /* Bu fonksiyon aynı kalabilir */ }
    function showTypingIndicator() { /* Bu fonksiyon aynı kalabilir */ }
    function hideTypingIndicator() { /* Bu fonksiyon aynı kalabilir */ }

    // Chatbot'u başlat
    sendMessage({ message: "Yeni bir konuşma başlat.", history: "" });
});