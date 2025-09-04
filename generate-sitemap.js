// generate-sitemap.js
const fs = require("fs");
const path = require("path");

// ilanlar.json dosyanı oku
const ilanlar = require("./data/ilanlar.json");

function generateSitemap() {
  const baseUrl = "https://hizlievbul.com";
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Ana sayfa
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/</loc>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // Balçova gibi kategori sayfaları (örnek olarak ekliyorum)
  const kategoriler = ["balcova", "cesme", "guzelbahce"];
  kategoriler.forEach((kategori) => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/${kategori}.html</loc>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // İlan detayları
  ilanlar.forEach((ilan) => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/ilan-detay.html?id=${ilan["İlan ID"]}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  // sitemap.xml olarak kaydet
  fs.writeFileSync(path.join(__dirname, "sitemap.xml"), xml, "utf8");
  console.log("✅ sitemap.xml oluşturuldu!");
}

generateSitemap();
