// netlify/functions/chatbot.js - TAM KOD

require('dotenv').config();
const { OpenAI } = require('openai');
// YUKARIDA SİLDİĞİNİZ SATIRLARIN YERİNE BUNU EKLEYİN:
const allListings = require('./ilan-data.js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



// ODA SAYISI HİYERARŞİSİNİ KOD İÇİNDE TANIMLAYALIM
const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];

// === YENİ VE DETAYLI SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
Görevin: Müşteriyi adım adım yönlendirerek bir emlak arama formu doldurmak. Her etkileşimde, mevcut adımı tamamla, bilgiyi 'arama_stratejisi'ne kaydet ve bir sonraki adıma geç. Cevabın daima aşağıda belirtilen JSON formatında olmalıdır. Your response must be in JSON format.

GÖREV AKIŞI (ADIM ADIM)
Kullanıcıdan gelen her cevabı analiz et, ilgili alana kaydet ve listedeki bir sonraki soruyu sor. Tüm adımlar tamamlanana kadar sırayı takip et.

1.  **isim_sor (Başlangıç Adımı):**
    *   Görev: Müşterinin ismini sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"amac_sor", soru_tipi:"text", cevap:"Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", secenekler:null

2.  **amac_sor:**
    *   Görev: Müşterinin amacını sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"tip_sor", soru_tipi:"buttons", cevap:"Memnun oldum [Müşteri İsmi]! Peki, bu aramayı ne amaçla yapıyorsunuz?", secenekler:["Oturum Amaçlı", "Yatırım Amaçlı"]

3.  **tip_sor:**
    *   Görev: Müşterinin aradığı konut tipini sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"konum_sor", soru_tipi:"buttons", cevap:"Anlaşıldı. Ne tür bir mülk arıyorsunuz?", secenekler:["Daire", "Müstakil Ev", "Villa"]

4.  **konum_sor:**
    *   Görev: Müşterinin aradığı ilçe ve mahalleyi sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"butce_sor", soru_tipi:"text", cevap:"Harika bir seçim! Lütfen arama yapmak istediğiniz ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", secenekler:null

5.  **butce_sor:**
    *   Görev: Müşterinin bütçesini sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"oda_sor", soru_tipi:"buttons", cevap:"Bütçe aralığınız nedir?", secenekler:["0 - 5 Milyon TL", "5 - 10 Milyon TL", "10 - 20 Milyon TL", "20 Milyon TL ve Üzeri"]

6.  **oda_sor:**
    *   Görev: Müşterinin istediği minimum oda sayısını sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"ekstra_sor", soru_tipi:"buttons", cevap:"En az kaç odalı bir yer düşünüyorsunuz?", secenekler:["1+1", "2+1", "3+1", "4+1 ve üzeri"]

7.  **ekstra_sor:**
    *   Görev: Müşterinin ek kriterlerini sor.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"onay_goster", soru_tipi:"text", cevap:"Neredeyse tamamız! Varsa, olmazsa olmaz dediğiniz ek özellikleri (balkon, otopark, bina yaşı vb.) yazabilirsiniz. Yoksa 'yok' yazmanız yeterli.", secenekler:null

8.  **onay_goster:**
    *   Görev: Toplanan tüm bilgileri özetle ve müşteriden onay iste. Cevap metnini toplanan bilgilerle oluştur.
    *   JSON Çıktısı: status:"devam", sonraki_adim:"filtrele", soru_tipi:"buttons", cevap:"Harika! Kriterlerinizi özetliyorum:\\nİsim: [İsim]\\nAmaç: [Amaç]\\nKonut Tipi: [Tip]\\nKonum: [Konum]\\nBütçe: [Bütçe]\\nOda Sayısı: En az [Oda Sayısı]\\nEk Notlar: [Ek Notlar]\\n\\nBu bilgilerle aramayı başlatmamı onaylıyor musunuz?", secenekler:["Onayla ve İlanları Getir", "Kriterleri Değiştir"]

9.  **filtrele:**
    *   Görev: Müşteri onaylarsa, filtreleme için son JSON'ı hazırla.
    *   JSON Çıktısı: status:"tamamlandi", filtre:"Var", sonraki_adim:null, soru_tipi:null, cevap:"Onayınız için teşekkürler! Sizin için en uygun ilanları hazırlıyorum...", secenekler:null

EĞER KULLANICI "Kriterleri Değiştir" DERSE, akışı "isim_sor" adımına geri döndür ve her şeyi baştan sorarak bilgileri güncelle.

KESİN JSON ÇIKTI FORMATI
{
"status": "devam" | "tamamlandi",
"filtre": "devam" | "Var" | "Yok",
"sonraki_adim": "amac_sor",
"soru_tipi": "text" | "buttons",
"cevap": "Müşteriye gösterilecek mesaj.",
"secenekler": ["Seçenek 1", "Seçenek 2"] | null,
"arama_stratejisi": {
    "musteri_kriterleri": {
        "isim": null,
        "amac": null,
        "konut_tipi": null,
        "oda_sayisi": null,
        "ozel_kriterler_metin": null
    },
    "arama_bolgeleri": [
        {
            "bolge_adi": null,
            "konum_mahalle": "Tümü",
            "fiyat_max": null
        }
    ]
}
}
`;

// === GÜNCELLENMİŞ filterListings FONKSİYONU ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const kriterler = strategy.arama_stratejisi.musteri_kriterleri;
  const bolge = strategy.arama_stratejisi.arama_bolgeleri[0];

  const filtered = allListings.filter(ilan => {
    // 1. ESNEK BÜTÇE FİLTRESİ
    const butceStr = bolge.fiyat_max || ""; // Örn: "5 - 10 Milyon TL"
    if (butceStr) {
      let maxButce = 0;
      if (butceStr.includes('0 - 5')) { maxButce = 5000000; }
      else if (butceStr.includes('5 - 10')) { maxButce = 10000000; }
      else if (butceStr.includes('10 - 20')) { maxButce = 20000000; }
      else if (butceStr.includes('Üzeri')) { maxButce = Infinity; }

      if (maxButce !== Infinity && maxButce > 0) {
          const esneklikPayi = maxButce >= 10000000 ? 1000000 : 500000;
          maxButce += esneklikPayi; // Bütçeye esneklik payı ekle
      }

      const ilanFiyati = parseInt(ilan.Fiyat);
      if (ilanFiyati > maxButce) return false;
    }

    // 2. ARTAN ODA SAYISI FİLTRESİ
    const minOdaSayisi = (kriterler.oda_sayisi || "").replace(' ve üzeri', ''); // Örn: "2+1"
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        const kabulEdilenOdaSayilari = ODA_SAYISI_HIYERARSISI.slice(startIndex);
        if (!kabulEdilenOdaSayilari.includes(ilan['Oda Sayısı'])) return false;
      }
    }
    
    // 3. DİĞER FİLTRELER
    if (bolge.bolge_adi && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(bolge.bolge_adi.toLowerCase()))) return false;
    if (bolge.konum_mahalle && bolge.konum_mahalle !== "Tümü" && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(bolge.konum_mahalle.toLowerCase()))) return false;
    if (kriterler.konut_tipi && ilan['Konut Tipi'] !== kriterler.konut_tipi) return false;

    return true; // Tüm filtrelerden geçti
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}

// === ANA HANDLER FONKSİYONU ===
exports.handler = async function (event, context) {
    console.log("---------- FONKSİYON BAŞLADI ----------");
    console.log("Gelen istek gövdesi:", event.body);

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { message, history } = JSON.parse(event.body);
        
        // Yeni konuşma başlangıcını yönet
        const isNewConversation = !history && !message;
        const promptMessage = isNewConversation ? "Yeni bir konuşma başlat." : message;

        const fullPrompt = `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}`;
        
        console.log("OpenAI API'sine istek gönderiliyor...");

        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullPrompt }
          ],
          response_format: { type: "json_object" }
        });

        console.log("OpenAI'den cevap başarıyla alındı.");
        let aiResponse = JSON.parse(completion.choices[0].message.content);

        if (aiResponse.filtre === "Var") {
          const foundListings = filterListings(aiResponse);
          aiResponse.ilan_sonuclari = {
            toplam_sayi: foundListings.length,
            sunum: foundListings.slice(0, 2).map(ilan => ({
              id: ilan['İlan ID'],
              baslik: ilan.Başlık,
              fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat),
              resim: ilan['Görsel Linki'],
              link: `ilan-detay.html?id=${ilan['İlan ID']}`
            }))
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(aiResponse),
        };

    } catch (error) {
        console.error("---------- HATA OLUŞTU ----------");
        console.error("Hatanın tam metni:", error);
        console.error("------------------------------");

        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }),
        };
    }
};