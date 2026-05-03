#!/usr/bin/env node
/**
 * AEVUM Product Media Finder
 * Busca imágenes y videos de productos via Google APIs
 *
 * Uso:
 *   node find-product-media.js
 *
 * Requisitos:
 *   - Node.js 18+
 *   - API Key de Google con YouTube Data API v3 y Custom Search API habilitadas
 *   - Custom Search Engine ID (crear en https://programmablesearchengine.google.com/)
 */

const API_KEY = "AIzaSyDec9LYUxDcSwuXfeihdD9aeiSLchIfB9U";
// IMPORTANTE: Necesitas crear un Custom Search Engine y poner su ID aquí
// Ve a https://programmablesearchengine.google.com/ → crear → copiar cx
const SEARCH_ENGINE_ID = "TU_SEARCH_ENGINE_ID_AQUI";

const PRODUCTS = [
  { name: "Oura Ring 4", query: "Oura Ring 4 product photo", category: "wearables" },
  { name: "WHOOP 5.0", query: "WHOOP 5.0 band strap product", category: "wearables" },
  { name: "Eight Sleep Pod 4", query: "Eight Sleep Pod 4 mattress cover", category: "wearables" },
  { name: "Apple Watch Ultra 2", query: "Apple Watch Ultra 2 product photo", category: "wearables" },
  { name: "Ultrahuman Ring Air", query: "Ultrahuman Ring Air smart ring", category: "wearables" },
  { name: "Samsung Galaxy Ring", query: "Samsung Galaxy Ring product", category: "wearables" },
  { name: "Thorne Magnesium Bisglycinate", query: "Thorne Magnesium Bisglycinate bottle", category: "supplements" },
  { name: "NOW Foods Taurine", query: "NOW Foods Taurine 1000mg bottle", category: "supplements" },
  { name: "Nordic Naturals Ultimate Omega", query: "Nordic Naturals Ultimate Omega bottle", category: "supplements" },
  { name: "Doctor's Best Fisetin", query: "Doctors Best Fisetin supplement bottle", category: "supplements" },
  { name: "ProHealth NMN", query: "ProHealth Longevity NMN 500mg", category: "supplements" },
  { name: "Thorne Berberine", query: "Thorne Berberine 500mg bottle", category: "supplements" },
  { name: "spermidineLIFE", query: "spermidineLIFE supplement box", category: "supplements" },
  { name: "Timeline Mitopure", query: "Timeline Mitopure urolithin A", category: "supplements" },
  { name: "Apollo Neuro", query: "Apollo Neuro wearable device", category: "wearables" },
  { name: "Creapure Creatine", query: "Creapure creatine monohydrate powder", category: "supplements" },
  { name: "COSRX Snail 96", query: "COSRX Advanced Snail 96 Mucin Power Essence", category: "kbeauty" },
  { name: "Banila Co Clean It Zero", query: "Banila Co Clean It Zero cleansing balm", category: "kbeauty" },
  { name: "Beauty of Joseon SPF", query: "Beauty of Joseon Relief Sun SPF50", category: "kbeauty" },
  { name: "Medicube AGE-R Booster Pro", query: "Medicube AGE-R Booster Pro device", category: "kbeauty" },
  { name: "Augustinus Bader The Cream", query: "Augustinus Bader The Rich Cream jar", category: "skincare" },
];

async function searchImages(product) {
  if (SEARCH_ENGINE_ID === "TU_SEARCH_ENGINE_ID_AQUI") {
    console.log(`  ⚠ Skipping image search — set SEARCH_ENGINE_ID first`);
    return [];
  }
  const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(product.query)}&searchType=image&num=3&imgSize=large&safe=active`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.items) {
      return data.items.map(item => ({
        url: item.link,
        thumbnail: item.image?.thumbnailLink,
        width: item.image?.width,
        height: item.image?.height,
        source: item.displayLink,
      }));
    }
    return [];
  } catch (e) {
    console.log(`  ✗ Image search error: ${e.message}`);
    return [];
  }
}

async function searchVideos(product) {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&q=${encodeURIComponent(product.name + " review")}&part=snippet&type=video&maxResults=3&order=relevance&relevanceLanguage=es`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.items) {
      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    }
    return [];
  } catch (e) {
    console.log(`  ✗ Video search error: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log("🔍 AEVUM Product Media Finder\n");

  const results = {};

  for (const product of PRODUCTS) {
    console.log(`\n━━━ ${product.name} (${product.category}) ━━━`);

    const [images, videos] = await Promise.all([
      searchImages(product),
      searchVideos(product),
    ]);

    results[product.name] = { images, videos, category: product.category };

    if (images.length > 0) {
      console.log(`  📷 Images:`);
      images.forEach((img, i) => {
        console.log(`    ${i+1}. ${img.url}`);
        console.log(`       Source: ${img.source} | ${img.width}x${img.height}`);
      });
    }

    if (videos.length > 0) {
      console.log(`  🎬 Videos:`);
      videos.forEach((vid, i) => {
        console.log(`    ${i+1}. "${vid.title}"`);
        console.log(`       ${vid.url} (${vid.channel})`);
      });
    }

    // Rate limit: 100 queries/100s for free tier
    await new Promise(r => setTimeout(r, 1200));
  }

  // Save results
  const fs = await import('fs');
  const outputPath = './product-media-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputPath}`);

  // Generate summary for easy copy-paste
  console.log("\n\n📋 COPY-PASTE SUMMARY — Product Images:\n");
  for (const [name, data] of Object.entries(results)) {
    if (data.images.length > 0) {
      console.log(`${name}:`);
      console.log(`  ${data.images[0].url}`);
    }
  }

  console.log("\n\n📋 COPY-PASTE SUMMARY — YouTube Videos:\n");
  for (const [name, data] of Object.entries(results)) {
    if (data.videos.length > 0) {
      console.log(`${name}:`);
      console.log(`  ${data.videos[0].url}`);
    }
  }
}

main().catch(console.error);
