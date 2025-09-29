// chatbot/chatbot-ui.js - ÇİFT TETİKLENME SORUNU EVENT DELEGATION İLE ÇÖZÜLMÜŞ NİHAİ VE TAM KOD

document.addEventListener('DOMContentLoaded', () => {
    // Gerekli HTML elementlerini seç
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const sendButton = chatForm.querySelector('button[type="submit"]');
    const messagesContainer = document.getElementById('chat-messages');

    // Durum değişkenlerini tanımla
    let conversationHistory = "";
    let currentStrategy = {};
    let isAwaitingResponse = false; // Sunucudan yanıt beklenip beklenmediğini kontrol eden kilit

    // --- EVENT DELEGATION İÇİN ANA TIKLAMA DİNLEYİCİSİ ---
    // Bu tek listener, tüm sohbet alanındaki tıklamaları yönetir.
    // Her butona ayrı ayrı listener eklemek yerine bu yöntem kullanılır.
    // Bu, "çift tetiklenme" sorununu kökünden çözer.
    messagesContainer.addEventListener('click', (event) => {
        // Tıklanan elementin bir seçenek butonu olup olmadığını sınıfından kontrol et
        if (event.target.classList.contains('chat-option-button')) {
            // Butonun üzerindeki yazıyı mesaj olarak al
            const message = event.target.textContent;
            
            // Eğer halihazırda bir yanıt beklenmiyorsa, mesajı gönder
            if (!isAwaitingResponse) {
                sendMessage(message);
                clearOptions(); // Butonlara tıklandıktan sonra onları kaldır
            }
        }
    });

    // Yazılı mesaj gönderme formunun dinleyicisi
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Formun sayfayı yenilemesini engelle
        const message = userInput.value.trim();
        // Mesaj boşsa, butonlar kapalıysa veya yanıt bekleniyorsa gönderme yapma
        if (!message || sendButton.disabled || isAwaitingResponse) return;
        await sendMessage(message);
    });

    // Sunucuya mesaj gönderen ana fonksiyon
    async function sendMessage(message, isInitial = false) {
        // Kilit mekanizması: Eğer zaten bir yanıt bekleniyorsa, yeni bir istek gönderme
        if (isAwaitingResponse && !isInitial) {
            return; 
        }

        // Başlangıç mesajı değilse, kullanıcının mesajını arayüze ekle
        if (!isInitial) {
            addMessageToUI('user', message);
        }

        // KİLİDİ AKTİF ET: Yeni istek gönderilemez
        isAwaitingResponse = true; 
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Yanıt bekleniyor...";
        
        showTypingIndicator(); // "Yazıyor..." animasyonunu göster

        try {
            // Netlify backend fonksiyonuna isteği gönder
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
            
            hideTypingIndicator(); // "Yazıyor..." animasyonunu gizle

            // Konuşma geçmişini güncelle
            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;
            currentStrategy = data.arama_stratejisi;

            // Gelen yanıtta ilan varsa göster
            const hasListings = data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0;
            if (data.cevap) { addMessageToUI('ai', data.cevap); }
            if (hasListings) {
                addListingsToUI(data.ilan_sonuclari);
                addMessageToUI('ai', `Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`);
            }
            
            // AI'dan gelen yanıta göre arayüzü yönet (butonları göster/gizle vb.)
            handleAiResponse(data);

        } catch (error) {
            // Hata durumunda kullanıcıyı bilgilendir ve arayüzü tekrar kullanılabilir yap
            hideTypingIndicator();
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım.');
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.placeholder = "İsteklerinizi buraya yazın...";
        } finally {
            // İster başarılı olsun, ister hata versin, işlem bittiğinde kilidi kaldır
            isAwaitingResponse = false;
        }
    }
    
    // AI'dan gelen yanıta göre arayüzü güncelleyen fonksiyon
    function handleAiResponse(data) {
        clearOptions(); // Önceki butonları temizle
        // Eğer yeni seçenekler varsa, butonları oluştur
        if (data.secenekler && data.secenekler.length > 0) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            userInput.disabled = true;
            sendButton.disabled = true;
            renderButtons(data.secenekler);
        } else {
            // Seçenek yoksa, metin giriş alanını tekrar aktif et
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    }

    // Seçenek butonlarını oluşturan fonksiyon
    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            
            // DİKKAT: Artık burada addEventListener KULLANILMIYOR.
            // Bu işi en baştaki tekil listener yapıyor.
            
            optionsContainer.appendChild(button);
        });
        messagesContainer.appendChild(optionsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Ekrandaki seçenek butonlarını temizleyen fonksiyon
    function clearOptions() {
        const existingContainer = document.getElementById('chat-options-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    // Arayüze yeni bir mesaj balonu ekleyen fonksiyon
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        // Gelen metindeki \n karakterlerini <br> etiketine çevirerek satır atlamalarını sağla
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        // Sohbeti en alta kaydır
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // "Yazıyor..." animasyonunu gösteren fonksiyon
    function showTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.classList.add('message', 'ai-message');
        typingIndicator.innerHTML = `<p><span>.</span><span>.</span><span>.</span></p>`;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // "Yazıyor..." animasyonunu gizleyen fonksiyon
    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Backend'den gelen ilanları arayüze ekleyen fonksiyon (içeriği size özel)
    function addListingsToUI(results) {
        // Bu fonksiyonun içi sizin mevcut kodunuzdaki gibi kalabilir.
        // Örneğin, ilan kartları oluşturup messagesContainer'a ekleyebilirsiniz.
    }

    // Sayfa ilk yüklendiğinde chatbot'u bir başlangıç mesajıyla tetikle
    sendMessage("", true); 
});