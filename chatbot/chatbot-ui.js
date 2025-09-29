// chatbot/chatbot-ui.js - KULLANICI ÖNERİSİYLE GÜNCELLENMİŞ NİHAİ VE TAM KOD
// Butonlar artık mesajı direkt göndermez, sadece yazı kutusunu doldurur.

document.addEventListener('DOMContentLoaded', () => {
    // Gerekli HTML elementlerini seç
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    // Durum değişkenlerini tanımla
    let conversationHistory = "";
    let currentStrategy = {};
    let isAwaitingResponse = false; 

    // --- YENİ MANTIK: BUTON TIKLAMA DİNLEYİCİSİ ---
    // Bu listener artık mesaj göndermiyor, sadece input alanını dolduruyor.
    messagesContainer.addEventListener('click', (event) => {
        // Tıklanan elementin bir seçenek butonu olup olmadığını sınıfından kontrol et
        if (event.target.classList.contains('chat-option-button')) {
            const selectedOptionText = event.target.textContent;

            // 1. Tıklanan butonun metnini input alanına yaz
            userInput.value = selectedOptionText;

            // 2. Input alanını ve gönder butonunu kullanıcı için aktif hale getir
            userInput.disabled = false;
            sendButton.disabled = false;

            // 3. Kullanıcının dikkatini input alanına çek
            userInput.focus();
            
            // 4. Placeholder metnini kullanıcıyı yönlendirmek için değiştir (opsiyonel)
            userInput.placeholder = "Seçiminizi göndermek için tıklayın";
        }
    });

    // Yazılı mesaj gönderme formunun dinleyicisi
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Formun sayfayı yenilemesini engelle
        const message = userInput.value.trim();
        if (!message || sendButton.disabled || isAwaitingResponse) return;
        
        // Mesaj gönderildikten sonra seçenek butonlarını temizle
        clearOptions();

        await sendMessage(message);
    });

    // Sunucuya mesaj gönderen ana fonksiyon
    async function sendMessage(message, isInitial = false) {
        if (isAwaitingResponse && !isInitial) {
            return; 
        }

        if (!isInitial) {
            addMessageToUI('user', message);
        }

        isAwaitingResponse = true; 
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Yanıt bekleniyor...";
        
        showTypingIndicator();

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: conversationHistory,
                    current_strategy: currentStrategy 
                })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            
            hideTypingIndicator();

            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;
            currentStrategy = data.arama_stratejisi;

            const hasListings = data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0;
            if (data.cevap) { addMessageToUI('ai', data.cevap); }
            if (hasListings) {
                addListingsToUI(data.ilan_sonuclari);
                addMessageToUI('ai', `Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`);
            }
            
            handleAiResponse(data);

        } catch (error) {
            hideTypingIndicator();
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.placeholder = "İsteklerinizi buraya yazın...";
        } finally {
            isAwaitingResponse = false;
        }
    }
    
    function handleAiResponse(data) {
        // Not: handleAiResponse artık clearOptions çağırmıyor, çünkü bu işi form submit'i yapıyor.
        // Ama yeni butonlar gelirse, eskileri yine de temizlemeli. Bu yüzden clearOptions burada kalmalı.
        clearOptions(); 
        if (data.secenekler && data.secenekler.length > 0) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            userInput.disabled = true;
            sendButton.disabled = true;
            renderButtons(data.secenekler);
        } else {
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    }

    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            optionsContainer.appendChild(button);
        });
        messagesContainer.appendChild(optionsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function clearOptions() {
        const existingContainer = document.getElementById('chat-options-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        if (indicator) {
            indicator.remove();
        }
    }

    function addListingsToUI(results) {
        // Bu fonksiyonun içi sizin mevcut kodunuzdaki gibi kalabilir.
    }

    sendMessage("", true); 
});