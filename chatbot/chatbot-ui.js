// chatbot-ui.js - İLAN GÖSTERİM SIRALAMASI DÜZELTİLMİŞ NİHAİ VE TAM KOD

document.addEventListener('DOMContentLoaded', () => {
    // HTML Elementleri
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    // Durum Değişkenleri
    let conversationHistory = "";
    let currentStrategy = {};
    let lastAiAdim = "";
    
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
            userInput.disabled = false;
            sendButton.disabled = false;
        } finally {
            hideTypingIndicator();
        }
    }

    // 2. Gelen Yanıtı İşleme (DÜZELTİLMİŞ MANTIK)
    function handleAiResponse(data) {
        lastAiAdim = data.adim;
        currentStrategy = data.arama_stratejisi || currentStrategy;
        
        // DÜZELTME BAŞLANGICI: Artık tüm adımlar sırayla işlenecek.
        
        // 1. Adım: İlanlar varsa, HER ZAMAN göster.
        if (data.ilan_sonuclari && data.ilan_sonuclari.sunum && data.ilan_sonuclari.sunum.length > 0) {
            addListingsToUI(data.ilan_sonuclari);
        }

        // 2. Adım: Cevap metni varsa, HER ZAMAN göster.
        if (data.cevap) {
            addMessageToUI('ai', data.cevap);
            conversationHistory += `Asistan: ${data.cevap}\n`;
        }
        
        userInput.value = "";

        // 3. Adım: Bir sonraki etkileşim elementini göster. (Form, Buton veya Telefon Formu)
        if (data.eylem === 'form_goster') {
            renderMultiChoiceForm();
        } else if (data.adim === 'telefon_formu_goster') {
            renderPhoneInputForm();
        } else if (data.secenekler && data.secenekler.length > 0) {
            renderButtons(data.secenekler);
        } else {
            // Eğer gösterilecek özel bir element yoksa, yazı alanını aktif et.
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.focus();
        }
        // DÜZELTME SONU
    }

    // 3. Veriyi E-Tabloya Kaydetme
    async function saveData(data) {
        try {
            await fetch('/api/save-data', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) { console.error("Veri kaydetme hatası:", error); }
    }

    // ==================
    // ETKİLEŞİM YÖNETİCİLERİ (Değişiklik yok)
    // ==================

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToUI('user', message);
        conversationHistory += `Kullanıcı: ${message}\n`;
        userInput.value = '';
        
        sendMessage({ message, history: conversationHistory, current_strategy: currentStrategy });
    });
    
    let formSelections = { amac: null, mulkTipi: null, butce: null, odaSayisi: null };
    messagesContainer.addEventListener('click', async (event) => {
        const target = event.target;

        if (target.tagName === 'BUTTON' && target.closest('#multi-choice-form')) {
            if (target.parentElement.classList.contains('options')) {
                const key = target.parentElement.getAttribute('data-key');
                const value = target.getAttribute('data-value');
                formSelections[key] = value;
                
                Array.from(target.parentElement.children).forEach(btn => btn.classList.remove('selected'));
                target.classList.add('selected');

                const allSelected = Object.values(formSelections).every(v => v !== null);
                document.getElementById('form-submit-btn').disabled = !allSelected;
            }
            if (target.id === 'form-submit-btn') {
                target.disabled = true;
                target.textContent = "Gönderiliyor...";

                const userMessage = `Seçimlerim tamamlandı.`;
                addMessageToUI('user', userMessage);
                conversationHistory += `Kullanıcı: ${userMessage}\n`;
                document.getElementById('multi-choice-form').remove();

                currentStrategy = {...currentStrategy, ...formSelections};
                const payload = {
                    message: `Kullanıcı Form Seçimleri: ${JSON.stringify(formSelections)}`,
                    history: conversationHistory,
                    current_strategy: currentStrategy
                };
                sendMessage(payload);
            }
        }

        if (target.classList.contains('chat-option-button')) {
             const message = target.textContent;
             addMessageToUI('user', message);
             conversationHistory += `Kullanıcı: ${message}\n`;
             document.getElementById('chat-options-container').remove();
             sendMessage({ message, history: conversationHistory, current_strategy: currentStrategy });
        }

        if (target.id === 'phone-submit-btn') {
            const phoneInput = document.getElementById('phone-input');
            const userPhone = phoneInput.value;

            if (userPhone.replace(/\s/g, '').length === 10) {
                target.disabled = true;
                target.textContent = "Kaydediliyor...";
                
                currentStrategy.telefon = `+90 ${userPhone}`;
                await saveData(currentStrategy);

                addMessageToUI('user', `Telefon Numaram: ${userPhone}`);
                document.getElementById('phone-input-form').remove();
                addMessageToUI('ai', "Teşekkür ederim! Bilgileriniz başarıyla alındı. En kısa sürede size dönüş yapacağım.");
                
                userInput.disabled = true;
                sendButton.disabled = true;
                userInput.placeholder = "Görüşme tamamlandı.";
            }
        }
    });

    // ==================
    // ARAYÜZ OLUŞTURMA FONKSİYONLARI (Renderers) (Değişiklik yok)
    // ==================
    
    function addListingsToUI(results) {
        if (!results || !results.sunum || results.sunum.length === 0) return;
        const listingsContainer = document.createElement('div');
        listingsContainer.className = 'listings-container';
        results.sunum.forEach(ilan => {
            const card = document.createElement('a');
            card.href = ilan.link;
            card.target = '_blank';
            card.className = 'listing-card';
            card.innerHTML = `
                <img src="${ilan.resim}" alt="${ilan.baslik}" class="listing-image">
                <div class="listing-details">
                    <h3 class="listing-title">${ilan.baslik}</h3>
                    <p class="listing-price">${ilan.fiyat}</p>
                </div>`;
            listingsContainer.appendChild(card);
        });
        messagesContainer.appendChild(listingsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

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
        formSelections = { amac: null, mulkTipi: null, butce: null, odaSayisi: null };
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

    function renderPhoneInputForm() {
        const formContainer = document.createElement('div');
        formContainer.id = 'phone-input-form';
        formContainer.innerHTML = `
            <div class="phone-group">
                <span class="country-code">+90</span>
                <input type="tel" id="phone-input" placeholder="5XX XXX XX XX" maxlength="14">
            </div>
            <button id="phone-submit-btn" disabled>Onayla ve Bilgileri Gönder</button>`;
        messagesContainer.appendChild(formContainer);
        const phoneInput = document.getElementById('phone-input');
        const submitBtn = document.getElementById('phone-submit-btn');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';
            if (value.length > 0) { formatted += value.substring(0, 3); }
            if (value.length > 3) { formatted += ' ' + value.substring(3, 6); }
            if (value.length > 6) { formatted += ' ' + value.substring(6, 8); }
            if (value.length > 8) { formatted += ' ' + value.substring(8, 10); }
            e.target.value = formatted;
            submitBtn.disabled = value.length !== 10;
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        phoneInput.focus();
    }
    
    function showTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.classList.add('message', 'ai-message');
        typingIndicator.innerHTML = `<p><span>.</span><span>.</span><span>.</span></p>`;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    // Chatbot'u Başlat
    sendMessage({ message: "Yeni bir konuşma başlat.", history: "" });
});