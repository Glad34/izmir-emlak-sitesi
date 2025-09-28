// netlify/functions/chatbot.js - EKSİKSİZ VE NİHAİ KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
const DAIRE_TIPLERI = ["daire", "rezidans"];
const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];

// === NİHAİ VE GÜNCELLENMİŞ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
Görevin: Müşteriden adım adım bilgi toplayarak, aşağıda belirtilen KESİN JSON ÇIKTI FORMATI'ndaki 'arama_stratejisi' objesini doldurmak. Her adımda ilgili bilgiyi doğru alana kaydet ve sıradaki soruyu sor. Your response must be in JSON format.

GÖREV AKIŞI
1.  **Form Doldurma:** Adım adım (isim, amaç, tip, konum, bütçe, oda, ekstra) bilgileri topla.
    *   **KONUM SORUSU:** Kullanıcı "Narlıdere, Yenikale" veya "Narlıdere Yenikale" yazdığında, bunu 'ilce':"Narlıdere" ve 'mahalle':"Yenikale" olarak ayırıp ilgili alanlara kaydet. Sadece ilçe yazarsa, mahalle'yi null bırak.
    *   **EKSTRA SORUSU:** Kullanıcı "balkon olsun, otopark farketmez, bina yaşı en fazla 10" gibi bir metin yazdığında, bunu analiz et. 'balkon':'Var', 'otopark':'Tümü', 'bina_yasi_max':'10' gibi ilgili alanları doldur. 'farketmez' veya 'yok' derse o alanı 'Tümü' yap.
2.  **Özetleme:** Tüm bilgiler toplanınca, 'onay_goster' adımında bu bilgileri düzgün bir metinle özetle.
3.  **Sonuç Raporlama:** Kullanıcı onayı sonrası, backend'in verdiği ilan sayısını analiz et ve akıllı öneride bulun.
4.  **Sunum:** Kullanıcı ilanları görmek istediğinde, backend'e son onayı ver.

ADIMLAR VE CEVAPLAR
*   **isim_sor:** "Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?" (soru_tipi: text)
*   **amac_sor:** "Memnun oldum [İsim]! Aramayı ne amaçla yapıyorsunuz?" (secenekler: ["Oturum Amaçlı", "Yatırım Amaçlı"])
*   **tip_sor:** "Anlaşıldı. Ne tür bir mülk arıyorsunuz?" (secenekler: ["Daire", "Müstakil Ev", "Villa"])
*   **konum_sor:** "Harika! Lütfen aradığınız ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)" (soru_tipi: text)
*   **butce_sor:** "Bütçe aralığınız nedir?" (secenekler: ["0 - 5.000.000 TL", "5.000.000 - 10.000.000 TL", "10.000.000 - 20.000.000 TL", "20.000.000 TL ve Üzeri"])
*   **oda_sor:** "En az kaç odalı bir yer düşünüyorsunuz?" (secenekler: ["1+1", "2+1", "3+1", "4+1 ve üzeri"])
*   **ekstra_sor:** "Neredeyse tamamız! Varsa, olmazsa olmaz dediğiniz ek özellikleri (balkon, otopark, bina yaşı vb.) yazabilirsiniz. Yoksa 'yok' yazmanız yeterli." (soru_tipi: text)
*   **onay_goster:** "Kriterlerinizi özetliyorum:\\nİsim: [İsim]\\n... (tüm kriterleri listele) ...\\nOnaylıyor musunuz?" (secenekler: ["Onayla ve İlanları Getir", "Kriterleri Değiştir"])
*   **onay_sonrasi (Akıllı Öneri):** Backend'den gelen ilan sayısına göre:
    *   Eğer 5+ ilan varsa: "Harika! [X] adet ilan buldum." (secenekler: ["İlanları Göster", "Filtreyi Değiştir"])
    *   Eğer 1-4 ilan varsa: "[X] adet ilan bulabildim. Aramayı genişletelim mi?" (secenekler: ["Evet, Genişletelim", "Hayır, Bu Şekilde Göster"])
    *   Eğer 0 ilan varsa: "Maalesef hiç ilan bulamadım." (secenekler: ["Filtreyi Değiştir"])
*   **sunum_yap:** Kullanıcı onayı sonrası tetiklenir.

KESİN JSON ÇIKTI FORMATI
{
"status": "...", "filtre": "...", "adim": "...", "eylem": "...", "cevap": "...", "secenekler": [],
"arama_stratejisi": {
    "isim": null, "amac": null, "konut_tipi": null, "ilce": null, "mahalle": null, "butce": null,
    "oda_sayisi": null, "balkon": "Tümü", "otopark": "Tümü", "asansor": "Tümü", "bina_yasi_max": "Tümü"
}
}
`;

// === NİHAİ filterListings FONKSİYONU (DETAYLI STRATEJİ İÇİN) ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const k = strategy.arama_stratejisi;

  const filtered = allListings.filter(ilan => {
    // 1. BÜTÇE
    const butceStr = (k.bütçe || k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let maxButce = 0;
        if (butceStr.includes('Üzeri')) { maxButce = Infinity; }
        else if (sayilar.length > 1) { maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { maxButce = parseInt(sayilar[0]); }
        if (maxButce > 0 && maxButce !== Infinity) {
            maxButce += maxButce >= 10000000 ? 1000000 : 500000;
        }
        if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ODA SAYISI
    const minOdaSayisi = (k.oda_sayısı || k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        if (!ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
      }
    }

    // 3. KONUT TİPİ
    const konutTipi = (k.konut_tipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // 4. İLÇE VE MAHALLE (AYRI AYRI)
    if (k.ilce && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(k.ilce.toLowerCase()))) return false;
    if (k.mahalle && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(k.mahalle.toLowerCase()))) return false;

    // 5. DETAYLI EK KRİTERLER
    if (k.balkon === 'Var' && ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A")) return false;
    if (k.asansor === 'Var' && ((ilan.Asansör || "").toLowerCase() === 'yok' || (ilan.Asansör || "") === "N/A")) return false;
    if (k.bina_yasi_max !== 'Tümü' && k.bina_yasi_max && parseInt(ilan['Bina Yaşı']) > parseInt(k.bina_yasi_max)) return false;
    
    return true;
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}

// === ANA HANDLER FONKSİYONU ===
exports.handler = async function (event, context) {
    try {
        const { message, history } = JSON.parse(event.body);
        const isNewConversation = !history && !message;
        const promptMessage = isNewConversation ? "Yeni bir konuşma başlat." : message;

        const initialResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}` }],
          response_format: { type: "json_object" }
        });
        let aiResponse = JSON.parse(initialResponse.choices[0].message.content);

        if (aiResponse.adim === 'onay_sonrasi') {
            const foundListings = filterListings(aiResponse);
            const ilanSayisi = foundListings.length;
            const reportPrompt = `SİSTEM NOTU: Filtreleme yapıldı ve ${ilanSayisi} adet ilan bulundu. Şimdi GÖREV AKIŞI'ndaki 'onay_sonrasi (Akıllı Öneri)' adımını bu bilgiye göre uygula.`;
            
            const finalResponse = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}\n\n${reportPrompt}` }],
                response_format: { type: "json_object" }
            });
            aiResponse = JSON.parse(finalResponse.choices[0].message.content);
        }
        
        if (aiResponse.eylem === "sunum_yap") {
            const foundListings = filterListings(aiResponse);
            aiResponse.ilan_sonuclari = {
                toplam_sayi: foundListings.length,
                sunum: foundListings.slice(0, 2).map(ilan => ({
                  id: ilan['İlan ID'], baslik: ilan.Başlık, fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat), resim: ilan['Görsel Linki'], link: `ilan-detay.html?id=${ilan['İlan ID']}`
                }))
            };
            aiResponse.cevap = `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar. Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`;
            aiResponse.secenekler = null;
            aiResponse.adim = "telefon_iste";
        }

        return { statusCode: 200, body: JSON.stringify(aiResponse) };
    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};