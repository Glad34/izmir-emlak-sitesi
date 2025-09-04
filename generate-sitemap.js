// generate-sitemap.js
const fs = require("fs");
const path = require("path");

// 1) İlan verilerini oku
const ilanlar = require("./data/ilanlar.json");

// 2) Temel ayarlar
const BASE_URL = "https://hizlievbul.com";

// 3) XML üret
function buildXml() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  ilanlar.forEach((ilan) => {
    const id = ilan["İlan ID"];
    if (!id) return;

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/ilan-detay.html?id=${id}</loc>\n`;
    // İstersen son güncelleme tarihini bugün yaz:
    xml += `    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;
  return xml;
}

// 4) Dosyaya yaz
function writeFile() {
  const xml = buildXml();
  const outPath = path.join(__dirname, "sitemap-ilanlar.xml"); // <-- sadece ilanlar
  fs.writeFileSync(outPath, xml, "utf8");
  console.log("✅ sitemap-ilanlar.xml oluşturuldu (yalnızca ilan detayları).");
}

writeFile();
