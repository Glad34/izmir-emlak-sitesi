// /.netlify/functions/add-favorite.js (NİHAİ SÜRÜM)

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Netlify ortam değişkenlerini al
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Backend'de daima SERVICE_ROLE_KEY kullanılır

// Auth0'nun genel anahtarını almak için bir istemci oluştur
const jwks = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Anahtarı getiren yardımcı fonksiyon
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. Auth0 Token'ını al ve doğrula
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Yetkilendirme başlığı eksik veya hatalı.' }) };
    }
    const token = authHeader.substring(7); // "Bearer " kısmını at

    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    });

    // Token geçerliyse, Auth0 kullanıcı ID'sini (sub) al
    const userId = decodedToken.sub;
    const { ilanId } = JSON.parse(event.body);

    if (!ilanId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'İlan ID eksik.' }) };
    }

    // 2. Supabase İstemcisini Başlat
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 3. Veritabanına Kayıt Ekle
    const { data, error } = await supabase
      .from('favorites') // Tablo adınızın 'favorites' olduğunu varsayıyoruz
      .insert([
        { 
          user_id: userId,   // Auth0'dan gelen kullanıcı ID'si
          ilan_id: ilanId    // Frontend'den gelen ilan ID'si
        }
      ]);

    // Supabase'den bir hata gelirse
    if (error) {
        // Eğer hata "duplicate key" ise (yani zaten favorilere eklenmişse)
        if (error.code === '23505') {
            return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Bu ilan zaten favorilerinizde.' }) };
        }
        throw error; // Diğer hataları fırlat
    }

    // Başarılı olursa
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'İlan başarıyla favorilere eklendi.' })
    };

  } catch (error) {
    console.error('Fonksiyon hatası:', error);
    return {
      statusCode: 401, // Genellikle token doğrulama hataları için
      body: JSON.stringify({ error: `İşlem başarısız: ${error.message}` })
    };
  }
};