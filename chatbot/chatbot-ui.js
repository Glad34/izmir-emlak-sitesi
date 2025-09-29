// chatbot/chatbot-ui.js - DOĞRU DOSYANIN YÜKLENDİĞİNİ KANITLAMA TESTİ

// Sayfa yüklendiğinde bu mesajı içeren bir kutu çıkmalı.
// Eğer bu kutu çıkmıyorsa, tarayıcı kesinlikle eski dosyayı kullanıyordur.
alert("YENİ CHATBOT KODU BAŞARIYLA YÜKLENDİ!");

document.addEventListener('DOMContentLoaded', () => {
    // Geri kalan tüm kod, size en son verdiğim kodun aynısıdır.
    // ... (bir önceki yanıttaki kodun tamamı buraya gelecek) ...

    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    let conversationHistory = "";
    let currentStrategy = {};
    let isAwaitingResponse = false; 

    messagesContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('chat-option-button')) {
            const selectedOptionText = event.target.textContent;
            userInput.value = selectedOptionText;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
            userInput.placeholder = "Seçiminizi göndermek için tıklayın";
        }
    });

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = userInput.value.trim();
        if (!message || sendButton.disabled || isAwaitingResponse) return;
        
        clearOptions();
        await sendMessage(message);
    });

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

    function addListingsToUI(results) {}

    sendMessage("", true); 
});