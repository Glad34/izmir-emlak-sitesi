// chatbot/chatbot-ui.js - EKSİKSİZ VE NİHAİ KOD

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
        // İlk mesaj (boş olan) hariç, kullanıcının yazdığını ekrana ekle
        if (!isInitial) {
            addMessageToUI('user', message);
        }
        userInput.value = '';
        userInput.disabled = true; // Cevap gelene kadar metin girişini kilitle
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

            // Konuşma geçmişini, bir sonraki istekte göndermek üzere güncelle
            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;

            // AI'nın cevabını ekrana ekle
            addMessageToUI('ai', data.cevap);
            
            // Gelen cevaba göre butonları, ilanları veya metin girişini yönet
            handleAiResponse(data);

        } catch (error) {
            console.error('Fetch error:', error);
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false; // Hata durumunda metin girişini tekrar aç
            isWaitingForUserInput = true;
        }
    }
    
    // AI CEVABINI İŞLEYEN ANA MANTIK
    function handleAiResponse(data) {
        clearOptions(); // Önceki adımdan kalan butonları temizle

        // Eğer backend seçenekler gönderdiyse, butonları oluştur
        if (data.secenekler && data.secenekler.length > 0) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            renderButtons(data.secenekler);
        } else {
            // Backend buton göndermediyse, metin girişini tekrar aktif et
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            isWaitingForUserInput = true;
        }

        // Eğer backend ilan sonuçları gönderdiyse, ilan kartlarını oluştur
        if (data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0) {
            addListingsToUI(data.ilan_sonuclari);
        }
    }
    
    // BUTONLARI OLUŞTURAN FONKSİYON
    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            button.addEventListener('click', () => {
                // Butona tıklandığında, metnini mesaj olarak gönder
                sendMessage(optionText);
                clearOptions(); // Butonlara tıklandıktan sonra onları kaldır
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

    // ARAYÜZE METİN MESAJI EKLEME FONKSİYONU
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        // AI'nın özet metnindeki \n'leri HTML'deki <br>'ye çevirerek satır atlamalarını sağla
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // İLAN KARTLARINI OLUŞTURAN FONKSİYON
    function addListingsToUI(results) {
        const listingsContainer = document.createElement('div');
        listingsContainer.classList.add('listings-preview');
        
        let listingsHTML = '';
        // Backend'den gelen 'sunum' dizisindeki her ilan için bir kart oluştur
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