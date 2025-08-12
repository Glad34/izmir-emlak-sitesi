// /.netlify/functions/auth-config.js (DÜZELTİLMİŞ NİHAİ SÜRÜM)

exports.handler = async () => {
  // Kontrol için konsola yazdıralım
  console.log("Auth Config veriliyor:", {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    audience: process.env.AUTH0_AUDIENCE // EKLENEN SATIR
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      audience: process.env.AUTH0_AUDIENCE // EKLENEN SATIR
    })
  };
};