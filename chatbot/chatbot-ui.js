// chatbot/chatbot-ui.js - TÜM GÜNCELLEMELERİ İÇEREN NİHAİ KOD

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const messagesContainer = document.getElementById('chat-messages');

    let conversationHistory = "";
    let isWaitingForUserInput = true;

    // Chatbot'u başlatmak için backend'e boş bir ilk mesaj gönder
    sendMessage("", true); 
    
    // KULLANICI METİN GİRİP GÖNDERDİĞİNDE
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message || !isWaitingForUserInput) return;
        await sendMessage(message);
    });

    // ANA MESAJ GÖNDERME FONKSİYONU
    async function sendMessage(message, isInitial = false) {
        if (!isInitial) {
            addMessageToUI('user', message);
        }
        userInput.value = '';
        userInput.disabled = true;
        isWaitingForUserInput = false;
        
        showTypingIndicator(); // "Yazıyor..." göstergesini ekle

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, history: conversationHistory })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            
            hideTypingIndicator(); // "Yazıyor..." göstergesini kaldır

            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;

            const hasListings = data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0;

            // Önce AI'nın metin cevabını göster (eğer varsa)
            if (data.cevap) {
                addMessageToUI('ai', data.cevap);
            }
            // Sonra ilanları göster (eğer varsa)
            if (hasListings) {
                addListingsToUI(data.ilan_sonuclari);
                // İlanlardan sonra telefon isteme metnini ayrı bir mesaj olarak göster
                addMessageToUI('ai', `Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`);
            }

            handleAiResponse(data);

        } catch (error) {
            hideTypingIndicator(); // Hata durumunda da kaldır
            console.error('Fetch error:', error);
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false;
            isWaitingForUserInput = true;
        }
    }
    
    function handleAiResponse(data) {
        clearOptions();
        if (data.secenekler && data.secenekler.length > 0) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            renderButtons(data.secenekler);
        } else {
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            isWaitingForUserInput = true;
        }
    }

    // "Yazıyor..." fonksiyonları
    function showTypingIndicator() {
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

    // Butonları oluşturma fonksiyonu
    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            button.addEventListener('click', () => {
                sendMessage(optionText);
                clearOptions();
            });
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

    // Arayüze metin mesajı ekleme fonksiyonu
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // İlan kartlarını oluşturma fonksiyonu
    function addListingsToUI(results) {
        const listingsContainer = document.createElement('div');
        listingsContainer.classList.add('listings-preview');
        let listingsHTML = '';
        results.sunum.forEach(ilan => {
            listingsHTML += `
                <a href="${ilan.link}" target="_blank" class="ilan-card">
                    <img src="${ilan.resim}" alt="${ilan.baslik}">
                    <div class="ilan-info">
                        <p class="ilan-baslik">${ilan.baslik}</p>
                        <p class="ilan-fiyat">${ilan.fiyat}</p>
                    </div>
                </a>
            `;
        });
        listingsContainer.innerHTML = listingsHTML;
        messagesContainer.appendChild(listingsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});