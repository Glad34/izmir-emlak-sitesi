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

// === AKILLI FİLTRE DEĞİŞTİRME MANTIĞI EKLENMİŞ NİHAİ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
Ana Görevin: Müşteriden adım adım bilgi toplayarak detaylı bir arama stratejisi oluşturmak, sonuçları analiz etmek ve kullanıcıyı akıllıca yönlendirmek. Cevabın daima KESİN JSON ÇIKTI FORMATI'nda olmalıdır. Your response must be in JSON format.

GENEL KURALLAR
1.  **TÜRKÇE ZORUNLULUĞU:** Tüm iletişimin İSTİSNASIZ Türkçe olmalıdır.
2.  **TEKRARLAMA YASAĞI:** Kullanıcının cevabını aldıktan sonra, bilgiyi 'arama_stratejisi'ne kaydet ve GÖREV AKIŞI'ndaki BİR SONRAKİ adıma geç. ASLA aynı soruyu tekrar sorma.

GÖREV AKIŞI
1.  **Form Doldurma (isim_sor -> ekstra_sor):** Sırasıyla tüm bilgileri topla ve 'arama_stratejisi' objesini doldur.
2.  **onay_goster:** Toplanan tüm bilgileri özetle ve onay iste.
3.  **onay_sonrasi (Akıllı Öneri):** Backend'den gelen ilan sayısını analiz et ve öneride bulun.
4.  **degisiklik_sor:** Kullanıcı 'Filtreyi Değiştir' derse, hangi kriteri değiştirmek istediğini sor.
5.  **kriter_guncelle:** Kullanıcı yeni bir kriter (örn: yeni bütçe) verdiğinde, bu bilgiyi 'arama_stratejisi'nde güncelle ve doğrudan 'onay_goster' adımına geri dönerek güncellenmiş özeti sun.
6.  **arama_genislet:** Kullanıcı aramayı genişletmeyi seçerse, ilgili kriteri güncelle (örn: mahalle'yi null yap) ve 'onay_sonrasi' adımını TEKRAR tetikle.
7.  **sunum_yap:** Kullanıcı sonuçları görmeyi onaylarsa, son talimatı ver.

ADIMLAR VE JSON ÇIKTILARI
*   **isim_sor (Başlangıç):** JSON Çıktısı: adim:"isim_sor", eylem:"soru_sor", cevap:"Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", secenekler:null
*   **amac_sor:** JSON Çıktısı: adim:"amac_sor", eylem:"soru_sor", cevap:"Memnun oldum [İsim]! Aramayı ne amaçla yapıyorsunuz?", secenekler:["Oturum Amaçlı", "Yatırım Amaçlı"]
*   **tip_sor:** JSON Çıktısı: adim:"tip_sor", eylem:"soru_sor", cevap:"Anlaşıldı. Ne tür bir mülk arıyorsunuz?", secenekler:["Daire", "Müstakil Ev", "Villa"]
*   **konum_sor:** JSON Çıktısı: adim:"konum_sor", eylem:"soru_sor", cevap:"Harika! Lütfen aradığınız ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", secenekler:null
*   **butce_sor:** JSON Çıktısı: adim:"butce_sor", eylem:"soru_sor", cevap:"Bütçe aralığınız nedir?", secenekler:["0 - 5.000.000 TL", "5.000.000 - 10.000.000 TL", "10.000.000 - 20.000.000 TL", "20.000.000 TL ve Üzeri"]
*   **oda_sor:** JSON Çıktısı: adim:"oda_sor", eylem:"soru_sor", cevap:"En az kaç odalı bir yer düşünüyorsunuz?", secenekler:["1+1", "2+1", "3+1", "4+1 ve üzeri"]
*   **ekstra_sor:** JSON Çıktısı: adim:"ekstra_sor", eylem:"soru_sor", cevap:"Neredeyse tamamız! Varsa, olmazsa olmaz dediğiniz ek özellikleri (balkon, otopark, bina yaşı vb.) yazabilirsiniz. Yoksa 'yok' yazmanız yeterli.", secenekler:null
*   **onay_goster:** JSON Çıktısı: adim:"onay_goster", eylem:"soru_sor", cevap:"Kriterlerinizi özetliyorum:\\nİsim: [İsim]\\n... (tüm ayrıntılı kriterleri listele) ...\\nOnaylıyor musunuz?", secenekler:["Onayla ve İlanları Getir", "Filtreyi Değiştir"]
*   **onay_sonrasi (Akıllı Öneri):** Backend'den gelen ilan sayısına ve stratejiye göre:
    *   Eğer 5+ ilan varsa: JSON Çıktısı: adim:"onay_sonrasi", eylem:"soru_sor", cevap:"Harika! [X] adet ilan buldum.", secenekler:["İlanları Göster", "Filtreyi Değiştir"]
    *   Eğer 1-4 ilan varsa ve 'mahalle' belirtilmişse: JSON Çıktısı: adim:"onay_sonrasi", eylem:"soru_sor", cevap:"Sadece [X] adet ilan bulabildim. İsterseniz [ilce] ilçesindeki tüm mahalleleri arayabiliriz.", secenekler:["Evet, Tüm Mahallelerde Ara", "Hayır, Bu Şekilde Göster"]
    *   Eğer 1-4 ilan varsa ve 'mahalle' belirtilmemişse: JSON Çıktısı: adim:"onay_sonrasi", eylem:"soru_sor", cevap:"Sadece [X] adet ilan bulabildim. İsterseniz aramaya komşu ilçeleri ([komşu ilçeler]) ekleyebiliriz.", secenekler:["Evet, Komşuları Ekle", "Hayır, Bu Şekilde Göster"]
    *   Eğer 0 ilan varsa: JSON Çıktısı: adim:"onay_sonrasi", eylem:"soru_sor", cevap:"Maalesef hiç ilan bulamadım.", secenekler:["Filtreyi Değiştir"]
*   **degisiklik_sor:** JSON Çıktısı: adim:"degisiklik_sor", eylem:"soru_sor", cevap:"Hangi kriteri güncellemek istersiniz?", secenekler:["Konum", "Bütçe", "Oda Sayısı", "Diğer Özellikler"]
*   **sunum_yap:** JSON Çıktısı: adim:"sunum_yap", eylem:"sunum_yap", secenekler:null

KESİN JSON ÇIKTI FORMATI
{
"status": "...", "filtre": "...", "adim": "...", "eylem": "...", "cevap": "...", "secenekler": [],
"arama_stratejisi": {
    "isim": null, "amac": null, "konum": null, "konut_tipi": null, "ilce": null, "mahalle": null, "butce": null,
    "oda_sayisi": null, "balkon": "Tümü", "otopark": "Tümü", "asansor": "Tümü", "bina_yasi_max": "Tümü"
}
}
`;

// === ÇOKLU KONUM FİLTRELEME İÇEREN NİHAİ filterListings FONKSİYONU ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const k = strategy.arama_stratejisi;

  const filtered = allListings.filter(ilan => {
    // 1. BÜTÇE FİLTRESİ
    const butceStr = (k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let maxButce = 0;
        if (butceStr.includes('Üzeri')) { maxButce = Infinity; }
        else if (sayilar.length > 1) { maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { maxButce = parseInt(sayilar[0]); }
        if (maxButce > 0 && maxButce !== Infinity) { maxButce += maxButce >= 10000000 ? 1000000 : 500000; }
        if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ODA SAYISI FİLTRESİ
    const minOdaSayisi = (k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1 && !ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
    }

    // 3. KONUT TİPİ FİLTRESİ
    const konutTipi = (k.konut_tipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // 4. ÇOKLU KONUM FİLTRESİ (İLÇE VE MAHALLE)
    const arananIlceler = (k.ilce || "").toLowerCase().split(',').map(item => item.trim()).filter(item => item);
    const arananMahalleler = (k.mahalle || "").toLowerCase().split(',').map(item => item.trim()).filter(item => item);

    if (arananIlceler.length > 0) {
        const ilanIlce = (ilan.Konum || "").toLowerCase();
        if (!arananIlceler.some(ilce => ilanIlce.includes(ilce))) return false;
    }
    if (arananMahalleler.length > 0) {
        const ilanMahalle = (ilan.Mahalle || "").toLowerCase();
        if (!arananMahalleler.some(mahalle => ilanMahalle.includes(mahalle))) return false;
    }

    // 5. DETAYLI EK KRİTERLER FİLTRESİ
    if (k.balkon === 'Var' && ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A")) return false;
    if (k.asansor === 'Var' && ((ilan.Asansör || "").toLowerCase() === 'yok' || (ilan.Asansör || "") === "N/A")) return false;
    if (k.bina_yasi_max !== 'Tümü' && k.bina_yasi_max && parseInt(ilan['Bina Yaşı']) > parseInt(k.bina_yasi_max)) return false;
    
    return true;
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}

// === ANA HANDLER FONKSİYONU (SİZİN VERSİYONUNUZLA AYNI) ===
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

        if (aiResponse.adim === 'onay_sonrasi' || aiResponse.adim === 'arama_genislet' || aiResponse.adim === 'kriter_guncelle') {
            const foundListings = filterListings(aiResponse);
            const ilanSayisi = foundListings.length;
            const komsuIlceler = aiResponse.arama_stratejisi.ilce ? (ILCE_KOMSULUK[aiResponse.arama_stratejisi.ilce] || []).join(', ') : "";
            const reportPrompt = `SİSTEM NOTU: Filtreleme yapıldı ve ${ilanSayisi} adet ilan bulundu. Mevcut strateji: ${JSON.stringify(aiResponse.arama_stratejisi)}. Komşu ilçeler: ${komsuIlceler}. Şimdi GÖREV AKIŞI'ndaki 'onay_sonrasi (Akıllı Öneri)' adımını bu bilgilere göre uygula.`;
            
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
            aiResponse.cevap = `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar.`;
            aiResponse.secenekler = null;
            aiResponse.adim = "telefon_iste";
        }

        return { statusCode: 200, body: JSON.stringify(aiResponse) };

    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};