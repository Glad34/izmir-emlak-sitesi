// netlify/functions/chatbot.js - EKSİKSİZ VE NİHAİ KOD

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

// === GELİŞMİŞ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, proaktif ve akıllı bir Yapay Zeka Gayrimenkul Asistanı.
Ana Görevin: Müşteriyi adım adım yönlendirerek bir emlak arama formu doldurmak, ardından filtreleme sonuçlarını analiz ederek kullanıcıya en iyi seçenekleri sunmak. Cevabın daima aşağıda belirtilen JSON formatında olmalıdır. Your response must be in JSON format.

GÖREV AKIŞI
Her adımdaki görevi tamamla, bilgileri 'arama_stratejisi'ne kaydet ve bir sonraki adıma geç.

1.  **isim_sor (Başlangıç):** Müşterinin ismini sor.
    JSON Çıktısı: adim:"isim_sor", eylem:"soru_sor", cevap:"Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", secenekler:null

2.  **amac_sor:** Müşterinin amacını sor.
    JSON Çıktısı: adim:"amac_sor", eylem:"soru_sor", cevap:"Memnun oldum [Müşteri İsmi]! Peki, bu aramayı ne amaçla yapıyorsunuz?", secenekler:["Oturum Amaçlı", "Yatırım Amaçlı"]

3.  **tip_sor:** Müşterinin aradığı konut tipini sor.
    JSON Çıktısı: adim:"tip_sor", eylem:"soru_sor", cevap:"Anlaşıldı. Ne tür bir mülk arıyorsunuz?", secenekler:["Daire", "Müstakil Ev", "Villa"]

4.  **konum_sor:** Müşterinin aradığı ilçe ve mahalleyi sor.
    JSON Çıktısı: adim:"konum_sor", eylem:"soru_sor", cevap:"Harika bir seçim! Lütfen arama yapmak istediğiniz ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", secenekler:null

5.  **butce_sor:** Müşterinin bütçesini sor.
    JSON Çıktısı: adim:"butce_sor", eylem:"soru_sor", cevap:"Bütçe aralığınız nedir?", secenekler:["0 - 5 Müşteri 'Onayla' dedikten sonra, backend'in vereceği ilan sayısını bekle ve bu sayıya göre Akıllı Öneri yap.
    *   Eğer İlan Sayısı Yeterliyse (5+): "Harika! Kriterlerinize uygun [X] adet ilan buldum." de. Seçenekler: ["İlanları Göster", "Filtreyi Değiştir"]. eylem: "soru_sor".
    *   Eğer İlan Sayısı Azsa (1-4): "[X] adet ilan bulabildim. Sonuçları artırmak için aramayı genişletelim mi?" de. Seçenekler: ["Evet, Genişletelim", "Hayır, Bu Şekilde Göster"]. eylem: "soru_sor".
    *   Eğer Hiç İlan Yoksa (0): "Maalesef bu kriterlere uygun hiç ilan bulamadım." de. Seçenekler: ["Filtreyi Değiştir"]. eylem: "soru_sor".

10. **sunum_yap:** Kullanıcı sonuçları görmeyi onaylarsa ("İlanları Göster" veya "Hayır, Bu Şekilde Göster" derse), backend'e son talimatı ver.
    JSON Çıktısı: adim:"sunum_yap", eylem:"sunum_yap", cevap:"Harika! Öne çıkan ilanlar şunlar...", secenekler:null

EĞER KULLANICI "Filtreyi Değiştir" DERSE, akışı "isim_sor" adımına geri döndür ve her şeyi baştan sorarak bilgileri güncelle.

KESİN JSON ÇIKTI FORMATI
{
"status": "devam" | "tamamlandi",
"filtre": "devam" | "Var" | "Yok",
"adim": "amac_sor",
"eylem": "soru_sor" | "sonuc_raporla" | "sunum_yap",
"cevap": "Müşteriye gösterilecek mesaj.",
"secenekler": ["Seçenek 1", "Seçenek 2"] | null,
"arama_stratejisi": { ... }
}
`;

// === GELİŞMİŞ filterListings FONKSİYONU ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const kriterler = strategy.arama_stratejisi.musteri_kriterleri;
  const bolge = strategy.arama_stratejisi.arama_bolgeleri[0];

  const filtered = allListings.filter(ilan => {
    // 1. ESNEK BÜTÇE FİLTRESİ
    const butceStr = (bolge.fiyat_max || "");
    if (butceStr) {
      let maxButce = 0;
      if (butceStr.includes('0 - 5')) { maxButce = 5000000; }
      else if (butceStr.includes('5 - 10')) { maxButce = 10000000; }
      else if (butceStr.includes('10 - 20')) { maxButce = 20000000; }
      else if (butceStr.includes('Üzeri')) { maxButce = Infinity; }

      if (maxButce !== Infinity && maxButce > 0) {
        const esneklikPayi = maxButce >= 10000000 ? 1000000 : 500000;
        maxButce += esneklikPayi;
      }
      if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ARTAN ODA SAYISI FİLTRESİ
    const minOdaSayisi = (kriterler.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        const kabulEdilenOdaSayilari = ODA_SAYISI_HIYERARSISI.slice(startIndex);
        if (!kabulEdilenOdaSayilari.includes(ilan['Oda Sayısı'])) return false;
      }
    }

    // 3. GRUPLANMIŞ KONUT TİPİ FİLTRESİ
    const konutTipi = (kriterler.konut_tipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        if (konutTipi === 'daire' && !DAIRE_TIPLERI.includes(ilanTipi)) return false;
        if (konutTipi === 'müstakil ev' && !MUSTAKIL_TIPLERI.includes(ilanTipi)) return false;
        if (konutTipi === 'villa' && ilanTipi !== 'villa') return false;
    }

    // 4. KONUM FİLTRESİ (İLÇE VE MAHALLE)
    const ilce = (bolge.bolge_adi || "").toLowerCase();
    const mahalle = (bolge.konum_mahalle || "").toLowerCase();
    if (ilce && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(ilce))) return false;
    if (mahalle && mahalle !== "tümü" && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(mahalle))) return false;

    // 5. EK KRİTERLER (Kullanıcının serbest metinle yazdığı)
    const ekKriterler = (kriterler.ozel_kriterler_metin || "").toLowerCase();
    if (ekKriterler.includes("balkon")) {
        if ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A") return false;
    }
    if (ekKriterler.includes("otopark")) {
        if ((ilan.Otopark || "").toLowerCase() === 'yok') return false;
    }
    
    return true;
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}

// === ANA HANDLER FONKSİYONU (YENİ AKIŞ İLE) ===
exports.handler = async function (event, context) {
    try {
        const { message, history } = JSON.parse(event.body);
        const isNewConversation = !history && !message;
        const promptMessage = isNewConversation ? "Yeni bir konuşma başlat." : message;

        // Adım 1: AI'dan mevcut duruma göre ne yapacağını öğren
        const initialResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}` }],
          response_format: { type: "json_object" }
        });

        let aiResponse = JSON.parse(initialResponse.choices[0].message.content);

        // Adım 2: Eğer AI 'onay_sonrasi' adımına geldiyse, filtrele ve sonucu AI'ye geri besle
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
        
        // Adım 3: Eğer AI son sunum adımındaysa, ilanları gerçekten ekle
        if (aiResponse.eylem === "sunum_yap") {
            const foundListings = filterListings(aiResponse);
            aiResponse.ilan_sonuclari = {
                toplam_sayi: foundListings.length,
                sunum: foundListings.slice(0, 2).map(ilan => ({
                  id: ilan['İlan ID'], baslik: ilan.Başlık, fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat), resim: ilan['Görsel Linki'], link: `ilan-detay.html?id=${ilan['İlan ID']}`
                }))
            };
            aiResponse.cevap = `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar. Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`;
            aiResponse.secenekler = null; // Telefon isteme adımında butonları kaldır
            aiResponse.adim = "telefon_iste"; // Frontend'in metin girişini açması için
        }

        return { statusCode: 200, body: JSON.stringify(aiResponse) };

    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};