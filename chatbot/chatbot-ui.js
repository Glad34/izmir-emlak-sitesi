// chatbot/chatbot-ui.js dosyasının TAMAMI

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const messagesContainer = document.getElementById('chat-messages');

    let conversationHistory = "";
    let isWaitingForUserInput = true;

    // Başlangıç mesajını bot'tan alarak süreci başlat
    sendMessage("", true); 
    
    // FORM GÖNDERME EYLEMİ
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
        
        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: conversationHistory
                })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();

            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;

            addMessageToUI('ai', data.cevap);
            handleAiResponse(data);

        } catch (error) {
            console.error('Fetch error:', error);
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false;
            isWaitingForUserInput = true;
        }
    }
    
    // YENİ: AI CEVABINI İŞLEYEN FONKSİYON
    function handleAiResponse(data) {
        clearOptions(); // Önceki butonları temizle

        if (data.soru_tipi === 'buttons' && data.secenekler) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            renderButtons(data.secenekler);
        } else {
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            isWaitingForUserInput = true;
        }

        if (data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0) {
            addListingsToUI(data.ilan_sonuclari);
            // Sonrasında telefon isteme mantığı buraya eklenebilir.
        }
    }
    
    // YENİ: BUTONLARI EKRANA ÇİZEN FONKSİYON
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

    // ARAYÜZE MESAJ EKLEME FONKSİYONU
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.innerHTML = text.replace(/\n/g, '<br>'); // Satır atlamalarını <br>'ye çevir
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // İLANLARI EKLEME FONKSİYONU
    function addListingsToUI(results) { /* Bu fonksiyon aynı kalabilir */ }
});