document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');
    const chatOverlay = document.getElementById('chat-overlay'); // Yeni eklenen overlay elementi

    let conversationHistory = "";
    let currentStrategy = {};

    // --- KİLİT YÖNETİM FONKSİYONLARI ---
    function lockChat() {
        chatOverlay.classList.remove('hidden'); // Overlay'i görünür yap
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Yanıt bekleniyor...";
    }

    function unlockChat() {
        chatOverlay.classList.add('hidden'); // Overlay'i gizle
        // handleAiResponse fonksiyonu input'un durumunu kendi yönetecek.
    }

    // Buton tıklamaları artık direkt mesaj gönderiyor
    messagesContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('chat-option-button')) {
            // Eğer overlay aktifse (yani kilitliyse) hiçbir şey yapma
            if (!chatOverlay.classList.contains('hidden')) return;

            const message = event.target.textContent;
            sendMessage(message);
        }
    });

    // Yazılı mesaj gönderme
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message || sendButton.disabled) return;
        await sendMessage(message);
    });

    async function sendMessage(message, isInitial = false) {
        if (!isInitial) {
            addMessageToUI('user', message);
            clearOptions();
        }

        lockChat(); // İsteği göndermeden hemen önce sohbeti KİLİTLE
        showTypingIndicator();

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: conversationHistory, current_strategy: currentStrategy })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            
            hideTypingIndicator();
            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;
            currentStrategy = data.arama_stratejisi;

            if (data.cevap) addMessageToUI('ai', data.cevap);
            
            const hasListings = data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0;
            if (hasListings) {
                addListingsToUI(data.ilan_sonuclari);
                addMessageToUI('ai', `Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`);
            }
            
            handleAiResponse(data);

        } catch (error) {
            hideTypingIndicator();
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            handleAiResponse({ secenekler: null }); // Hata durumunda input'u aç
        } finally {
            unlockChat(); // İşlem bitince KİLİDİ AÇ
        }
    }
    
    function handleAiResponse(data) {
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
        // ... bu fonksiyonun içi aynı kalabilir ...
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
        // ... bu fonksiyonun içi aynı kalabilir ...
        const existingContainer = document.getElementById('chat-options-container');
        if (existingContainer) existingContainer.remove();
    }

    function addMessageToUI(sender, text) {
        // ... bu fonksiyonun içi aynı kalabilir ...
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const p = document.createElement('p');
        p.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(p);
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

    function addListingsToUI(results) {}

    sendMessage("", true); 
});