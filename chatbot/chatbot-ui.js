document.addEventListener('DOMContentLoaded', () => {
    // Sizin HTML'inizdeki doğru ID'leri seçiyoruz
    const userInput = document.getElementById('user-input'); // Değişti
    const chatForm = document.getElementById('chat-input-form'); // Değişti
    const messagesContainer = document.getElementById('chat-messages');
    const chatbotPopup = document.getElementById('chatbot-popup');
    const kapatButton = document.getElementById('chatbot-kapat-btn');

    // Bu butonu da ekleyelim, böylece kapatma işlevi de çalışır
    kapatButton.addEventListener('click', () => {
        chatbotPopup.classList.add('chatbot-hidden');
    });

    // Not: Chatbot'u açacak bir butonunuz olduğunu varsayıyorum.
    // Örneğin: const openButton = document.getElementById('chatbot-ac-btn');
    // openButton.addEventListener('click', () => {
    //    chatbotPopup.classList.remove('chatbot-hidden');
    // });


    let conversationHistory = ""; // Konuşma geçmişini tutacak değişken

    // Form gönderildiğinde çalışacak ana fonksiyon
    const handleFormSubmit = async (event) => {
        event.preventDefault(); // Sayfanın yeniden yüklenmesini engelle
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToUI('user', message); // Kullanıcının mesajını ekrana ekle
        userInput.value = '';
        userInput.style.height = 'auto'; // Textarea'yı sıfırla

        try {
            // Netlify fonksiyonumuza istek gönderiyoruz
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: conversationHistory
                })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json(); // Gelen JSON cevabını al

            // Konuşma geçmişini güncelle
            conversationHistory += `Kullanıcı: ${message}\nAsistan: ${data.cevap}\n`;

            // Bot'un cevabını ekrana ekle
            addMessageToUI('ai', data.cevap);

            // Eğer ilân sonuçları geldiyse, onları da ekrana ekle
            if (data.ilan_sonuclari && data.ilan_sonuclari.sunum.length > 0) {
                addListingsToUI(data.ilan_sonuclari);
            }

        } catch (error) {
            console.error('Fetch error:', error);
            addMessageToUI('ai', 'Üzgünüm, bir sorunla karşılaştım. Lütfen daha sonra tekrar deneyin.');
        }
    };

    // Mesajları ve ilanları UI'a ekleyen yardımcı fonksiyonlar
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        // Sınıfları sizin yapınıza uygun hale getiriyoruz
        messageWrapper.classList.add('message', `${sender}-message`);
        
        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = text;
        
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Otomatik aşağı kaydır
    }

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
    
    // Formun submit olayını dinliyoruz
    chatForm.addEventListener('submit', handleFormSubmit);

    // Bonus: Textarea'nın içeriğe göre otomatik büyümesi
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
});