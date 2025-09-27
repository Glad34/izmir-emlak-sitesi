// netlify/functions/chatbot.js - EKSİKSİZ VE NİHAİ KOD (BÜTÇE HATASI DÜZELTİLDİ)

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

// === GELİŞMİŞ SYSTEM PROMPT (BÜTÇE SEÇENEKLERİ DÜZELTİLDİ) ===
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
    JSON Çıktısı: adim:"butce_sor", eylem:"soru_sor", cevap:"Bütçe aralığınız nedir?", secenekler:["0 - 5.000.000 TL", "5.000.000 - 10.000.000 TL", "10.000.000 - 20.000.000 TL", "20.000.000 TL ve Üzeri"]

6.  **oda_sor:** Müşterinin istediği minimum oda sayısını sor.
    JSON Çıktısı: adim:"oda_sor", eylem:"soru_sor", cevap:"En az kaç odalı bir yer düşünüyorsunuz?", secenekler:["1+1", "2+1", "3+1", "4+1 ve üzeri"]

7.  **ekstra_sor:** Müşterinin ek kriterlerini sor.
    JSON Çıktısı: adim:"ekstra_sor", eylem:"soru_sor", cevap:"Neredeyse tamamız! Varsa, olmazsa olmaz dediğiniz ek özellikleri (balkon, otopark, bina yaşı vb.) yazabilirsiniz. Yoksa 'yok' yazmanız yeterli.", secenekler:null

8.  **onay_goster:** Toplanan tüm bilgileri özetle ve müşteriden onay iste.
    JSON Çıktısı: adim:"onay_goster", eylem:"soru_sor", cevap:"Harika! Kriterlerinizi özetliyorum:\\nİsim: [İsim]\\nAmaç: [Amaç]\\nKonut Tipi: [Tip]\\nKonum: [Konum]\\nBütçe: [Bütçe]\\nOda Sayısı: En az [Oda Sayısı]\\nEk Notlar: [Ek Notlar]\\n\\nBu bilgilerle aramayı başlatmamı onaylıyor musunuz?", secenekler:["Onayla ve İlanları Getir", "Filtreyi Değiştir"]

9.  **onay_sonrasi:** Müşteri 'Onayla' dedikten sonra, backend'in vereceği ilan sayısını bekle ve bu sayıya göre Akıllı Öneri yap.
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

// === GELİŞMİŞ filterListings FONKSİYONU (NOKTA TEMİZLEME EKLENDİ) ===
// ESKİ filterListings FONKSİYONUNU SİLİP, YERİNE BUNU YAPIŞTIRIN

// === KURŞUN GEÇİRMEZ filterListings FONKSİYONU ===
// Mevcut filterListings fonksiyonunu silip, yerine bunu yapıştırın.

function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const kriterler = strategy.arama_stratejisi;

  const filtered = allListings.filter(ilan => {
    // 1. ESNEK BÜTÇE FİLTRESİ
    const butceStr = (kriterler.bütçe || kriterler.butce || "").replace(/\./g, '');
    if (butceStr) {
      let maxButce = 0;
      if (butceStr.includes('0 - 5000000')) { maxButce = 5000000; }
      else if (butceStr.includes('5000000 - 10000000')) { maxButce = 10000000; }
      else if (butceStr.includes('10000000 - 20000000')) { maxButce = 20000000; }
      else if (butceStr.includes('Üzeri')) { maxButce = Infinity; }

      if (maxButce > 0 && maxButce !== Infinity) {
        const esneklikPayi = maxButce >= 10000000 ? 1000000 : 500000;
        maxButce += esneklikPayi;
      }
      if (parseInt(ilan.Fiyat) > maxButce) {
        console.log(`İlan ${ilan['İlan ID']} bütçe nedeniyle elendi. Fiyat: ${ilan.Fiyat}, Max Bütçe: ${maxButce}`);
        return false;
      }
    }

    // 2. ARTAN ODA SAYISI FİLTRESİ
    const minOdaSayisi = (kriterler.oda_sayısı || kriterler.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        const kabulEdilenOdaSayilari = ODA_SAYISI_HIYERARSISI.slice(startIndex);
        if (!kabulEdilenOdaSayilari.includes(ilan['Oda Sayısı'])) {
            console.log(`İlan ${ilan['İlan ID']} oda sayısı nedeniyle elendi. İstenen min: ${minOdaSayisi}, İlanın: ${ilan['Oda Sayısı']}`);
            return false;
        }
      }
    }

    // 3. GRUPLANMIŞ KONUT TİPİ FİLTRESİ
    const konutTipi = (kriterler.konut_tipi || kriterler.tip || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        
        if (!tipUygun) {
            console.log(`İlan ${ilan['İlan ID']} konut tipi nedeniyle elendi. İstenen: ${konutTipi}, İlanın: ${ilanTipi}`);
            return false;
        }
    }

    // 4. SAĞLAM KONUM FİLTRESİ
    const konumStr = (kriterler.konum || "").toLowerCase();
    if (konumStr) {
        const ilceler = ["balçova", "karabağlar", "bayraklı", "bornova", "karşıyaka", "narlıdere", "güzelbahçe", "çiğli", "buca", "konak", "çeşme", "urla"]; // ve diğerleri
        let ilce = "";
        let mahalle = konumStr;

        ilceler.forEach(i => {
            if (konumStr.includes(i)) {
                ilce = i;
                mahalle = konumStr.replace(i, "").trim();
            }
        });

        if (ilce && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(ilce))) {
            console.log(`İlan ${ilan['İlan ID']} ilçe nedeniyle elendi. İstenen: ${ilce}, İlanın: ${ilan.Konum}`);
            return false;
        }
        if (mahalle && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(mahalle))) {
            console.log(`İlan ${ilan['İlan ID']} mahalle nedeniyle elendi. İstenen: ${mahalle}, İlanın: ${ilan.Mahalle}`);
            return false;
        }
    }
    
    // 5. EK KRİTERLER
    const ekKriterler = (kriterler.ek_notlar || "").toLowerCase();
    if (ekKriterler.includes("balkon")) {
        if ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A") return false;
    }
    if (ekKriterler.includes("otopark")) {
        if ((ilan.Otopark || "").toLowerCase() === 'yok') return false;
    }
    
    console.log(`İlan ${ilan['İlan ID']} tüm filtrelerden geçti.`);
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