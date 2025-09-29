// chatbot/chatbot-ui.js - YARIŞ DURUMU (RACE CONDITION) PROBLEMİ ÇÖZÜLMÜŞ KOD

// chatbot/chatbot-ui.js - TANILAMA (DEBUG) KODU EKLENMİŞ VERSİYON

document.addEventListener('DOMContentLoaded', () => {
    console.log("Chatbot UI Başlatıldı. DOMContentLoaded tetiklendi."); // Tanılama Mesajı

    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    let conversationHistory = "";
    let currentStrategy = {};
    let isAwaitingResponse = false; 

    sendMessage("", true); 
    
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message || sendButton.disabled) return;
        await sendMessage(message);
    });

    async function sendMessage(message, isInitial = false) {
        // ---- TANILAMA BÖLÜMÜ BAŞLANGIÇ ----
        console.log(`sendMessage çağrıldı. Mesaj: "${message}". isAwaitingResponse durumu: ${isAwaitingResponse}`);
        if (isAwaitingResponse && !isInitial) {
            console.error("!!! İSTEK ENGELLENDİ: Halen bir önceki isteğin yanıtı bekleniyor.");
            return; 
        }
        // ---- TANILAMA BÖLÜMÜ SONU ----

        if (!isInitial) {
            addMessageToUI('user', message);
        }

        isAwaitingResponse = true; 
        console.log(`>>> KİLİT AKTİF. isAwaitingResponse = ${isAwaitingResponse}`); // Tanılama Mesajı
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
            console.error("Bir hata oluştu:", error); // Tanılama Mesajı
            hideTypingIndicator();
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.placeholder = "İsteklerinizi buraya yazın...";
        } finally {
            isAwaitingResponse = false;
            console.log(`<<< KİLİT KALDIRILDI. isAwaitingResponse = ${isAwaitingResponse}`); // Tanılama Mesajı
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

    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    // "Yazıyor..." fonksiyonları
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

    // Butonları oluşturma fonksiyonu
    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            button.addEventListener('click', () => {
                // DEĞİŞTİ: Kilit kontrolü burada da yapılabilir ama sendMessage'in başına eklemek daha garantidir.
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
        // Bu fonksiyonun içi aynı kalabilir, dokunulmadı.
    }
});