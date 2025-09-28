// netlify/functions/chatbot.js - DOĞRU JSON FORMATI İLE NİHAİ KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js'); // Veriyi doğrudan koddan alıyoruz

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === FİLTRELEME İÇİN YARDIMCI VERİLER ===
const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
const DAIRE_TIPLERI = ["daire", "rezidans"];
const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];

// === DOĞRU JSON FORMATINI İÇEREN NİHAİ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, proaktif ve akıllı bir Yapay Zeka Gayrimenkul Asistanı.
Ana Görevin: Müşteriyi adım adım yönlendirerek, aşağıda belirtilen KESİN JSON ÇIKTI FORMATI'ndaki 'arama_stratejisi' objesini doldurmak. Her adımda ilgili bilgiyi doğru alana kaydet ve sıradaki soruyu sor. Your response must be in JSON format.

GENEL KURALLAR
1.  **TÜRKÇE ZORUNLULUĞU:** Müşteriyle tüm iletişimin İSTİSNASIZ BİR ŞEKİLDE Türkçe olmalıdır. ASLA İngilizce veya başka bir dilde cevap verme.
2.  **TEKRARLAMA YASAĞI:** Kullanıcının cevabını aldıktan sonra, bilgiyi 'arama_stratejisi'ne kaydet ve GÖREV AKIŞI'ndaki BİR SONRAKİ adıma geç. ASLA aynı soruyu tekrar sorma.
3.  **JSON FORMATI:** Her zaman KESİN JSON ÇIKTI FORMATI'na uy.

GÖREV AKIŞI
1.  **Form Doldurma:** Adım adım (isim, amaç, tip, konum, bütçe, oda, ekstra) bilgileri topla.
    *   **KONUM SORUSU:** Kullanıcı "Narlıdere, Narlı Mahallesi" veya "Narlıdere narlı" yazdığında, bunu 'ilce':"Narlıdere" ve 'mahalle':"Narlı" olarak ayırıp ilgili alanlara kaydet. "mahallesi" kelimesini ekleme. Sadece ilçe yazarsa, mahalle'yi null bırak.
    *   **EKSTRA SORUSU:** Kullanıcı "balkon olsun, otopark farketmez, bina yaşı en fazla 10" gibi bir metin yazdığında, bunu analiz et. 'balkon':'Var', 'otopark':'Tümü', 'bina_yasi_max':'10' gibi ilgili alanları doldur. 'farketmez' veya 'yok' derse o alanı 'Tümü' yap.
2.  **Özetleme:** 'onay_goster' adımında, 'arama_stratejisi' objesindeki tüm dolu alanları kullanarak düzgün bir metinle özetle.
3.  **Sonuç Raporlama:** Kullanıcı onayı sonrası, backend'in verdiği ilan sayısını analiz et ve akıllı öneride bulun.
4.  **Sunum:** Kullanıcı ilanları görmek istediğinde, backend'e son onayı ver.

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
    // 1. SAĞLAM VE ESNEK BÜTÇE FİLTRESİ
    const butceStr = (k.bütçe || k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let maxButce = 0;
        if (butceStr.includes('Üzeri')) { maxButce = Infinity; }
        else if (sayilar.length > 1) { maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { maxButce = parseInt(sayilar[0]); }
        
        if (maxButce > 0 && maxButce !== Infinity) {
            const esneklikPayi = maxButce >= 10000000 ? 1000000 : 500000;
            maxButce += esneklikPayi;
        }
        if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ARTAN ODA SAYISI FİLTRESİ
    const minOdaSayisi = (k.oda_sayısı || k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        const kabulEdilenOdaSayilari = ODA_SAYISI_HIYERARSISI.slice(startIndex);
        if (!kabulEdilenOdaSayilari.includes(ilan['Oda Sayısı'])) return false;
      }
    }

    // 3. GRUPLANMIŞ KONUT TİPİ FİLTRESİ
    const konutTipi = (k.konut_tipi || k.tip || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // 4. DOĞRU VE DETAYLI KONUM FİLTRESİ
    if (k.ilce && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(k.ilce.toLowerCase()))) return false;
    if (k.mahalle && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(k.mahalle.toLowerCase()))) return false;
    
    // 5. DETAYLI EK KRİTERLER FİLTRESİ
    if (k.balkon === 'Var' && ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A")) return false;
    if (k.asansor === 'Var' && ((ilan.Asansör || "").toLowerCase() === 'yok' || (ilan.Asansör || "") === "N/A")) return false;
    if (k.bina_yasi_max !== 'Tümü' && k.bina_yasi_max && parseInt(ilan['Bina Yaşı']) > parseInt(k.bina_yasi_max)) return false;

    return true;
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}


// === ANA HANDLER FONKSİYONU (SİZİN GÖNDERDİĞİNİZ İLE AYNI) ===
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
            const reportPrompt = `SİSTEM NOTU: Filtreleme yapıldı ve ${ilanSayisi} adet ilan bulundu. Şimdi GÖREV AKIŞI'ndaki 'onay_sonrasi' adımını bu bilgiye göre uygula ve kullanıcıya seçenek sun.`;
           
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