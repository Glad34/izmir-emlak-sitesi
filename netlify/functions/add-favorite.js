// /.netlify/functions/add-favorite.js

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Auth0 alan adınızı ve API Audience'ınızı .env dosyalarından veya Netlify UI'dan alıyoruz.
// BU BİLGİLERİ GÜVENLİK İÇİN KODA DOĞRUDAN YAZMAYIN!
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  throw new Error('Auth0 domain veya audience ortam değişkenleri ayarlanmamış.');
}

// Auth0'nun genel anahtarını (public key) almak için bir istemci oluşturuyoruz.
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Anahtarı getiren yardımcı fonksiyon
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async function(event, context) {
  // Sadece POST isteklerini kabul et
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Authorization başlığını al
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authorization başlığı eksik.' }) };
    }

    // "Bearer " kısmını ayıklayarak token'ı al
    const token = authHeader.split(' ')[1];
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Bearer token bulunamadı.' }) };
    }

    // 2. Token'ı Doğrula
    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        audience: AUTH0_AUDIENCE, // Token'ın bizim API için olduğunu doğrula
        issuer: `https://${AUTH0_DOMAIN}/`, // Token'ı doğru Auth0 domain'inin verdiğini doğrula
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      });
    });

    // Token geçerliyse, decodedToken içinde kullanıcının bilgileri (sub: user_id) bulunur.
    const userId = decodedToken.sub;
    const { ilanId } = JSON.parse(event.body);

    console.log(`Kullanıcı (${userId}), ilan ID'si (${ilanId}) olan ilanı favorilere ekliyor.`);

    // 3. BURADAN SONRASI SİZİN VERİTABANI İŞLEMİNİZ
    // Örneğin, bu bilgiyi Airtable'a, Google Sheets'e veya veritabanınıza kaydedin.
    // Bu kısım şimdilik başarılı bir cevap döndürecek.
    // await saveToDatabase(userId, ilanId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'İlan başarıyla favorilere eklendi.' })
    };

  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    // Bu, "Hata: Lütfen giriş yapınız" hatasını üreten yer olabilir.
    // Daha spesifik bir hata mesajı verelim.
    return {
      statusCode: 401,
      body: JSON.stringify({ error: `Geçersiz token: ${error.message}` })
    };
  }
};