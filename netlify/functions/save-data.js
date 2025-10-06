const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

exports.handler = async function (event, context) {
  try {
    const data = JSON.parse(event.body);

    await doc.loadInfo();
    
    // 1. "chatbot" sekmesine müşteri bilgilerini yaz
    const chatbotSheet = doc.sheetsByTitle['chatbot']; // Sekme adına göre seç
    await chatbotSheet.addRow({
      'Tarih': new Date().toLocaleString('tr-TR'),
      'İsim': data.isim,
      'Konum': data.konum,
      'Mahalle': data.mahalle,
      'Telefon': data.telefon,
      'Amaç': data.amac,
      'Mülk Tipi': data.mulkTipi,
      'Bütçe': data.butce,
      'Oda Sayısı': data.odaSayisi,
    });

    // 2. "İlanlar" sekmesine bulunan ilanları yaz
    if (data.foundListings && data.foundListings.length > 0) {
        const ilanlarSheet = doc.sheetsByTitle['İlanlar']; // Sekme adına göre seç
        const rowsToAdd = data.foundListings.map(ilan => {
            // Müşteri ismini her ilana ekleyerek ilişki kur
            return { 'İsim': data.isim, ...ilan };
        });
        await ilanlarSheet.addRows(rowsToAdd);
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Tüm veriler başarıyla eklendi." }) };

  } catch (error) {
    console.error("E-tabloya yazma hatası:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Veri kaydedilemedi.' }) };
  }
};