#!/usr/bin/env node

/**
 * Fetch Amazon product images by ASIN.
 * Usage: node scripts/amazon-images.js B0BNN7BXBL B09BVYSJ5F B0DL92QM79
 *
 * Returns the main product image URL for each ASIN.
 * These images can be used in ProductCard components within
 * the Amazon Associates program context.
 */

const ASINs = process.argv.slice(2);

if (ASINs.length === 0) {
  console.log("Usage: node scripts/amazon-images.js ASIN1 ASIN2 ASIN3 ...");
  console.log("Example: node scripts/amazon-images.js B0BNN7BXBL B09BVYSJ5F");
  process.exit(1);
}

const LOCALES = {
  es: "amazon.es",
  en: "amazon.com",
};

const locale = process.argv.includes("--en") ? "en" : "es";
const domain = LOCALES[locale];

async function fetchProductImage(asin) {
  const url = `https://www.${domain}/dp/${asin}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": locale === "es" ? "es-ES,es;q=0.9" : "en-US,en;q=0.9",
      },
    });

    const html = await res.text();

    // Try multiple patterns to extract the main product image
    const patterns = [
      /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\._[^"]*AC[^"]*_)"/,
      /id="landingImage"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        // Normalize to a clean, large image URL
        let imageUrl = match[1];
        // Remove size constraints to get full resolution
        imageUrl = imageUrl.replace(/\._[^.]*_\./, ".");
        return { asin, imageUrl, source: domain };
      }
    }

    // Fallback: construct standard Amazon image URL
    // Amazon images follow pattern: https://m.media-amazon.com/images/I/{ASIN}._AC_SL1500_.jpg
    // This doesn't always work but is a reasonable guess
    return {
      asin,
      imageUrl: `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
      source: domain,
      note: "fallback URL (may not work)",
    };
  } catch (err) {
    return { asin, error: err.message, source: domain };
  }
}

async function main() {
  console.log(`\nFetching product images from ${domain}...\n`);

  const results = [];

  for (const asin of ASINs) {
    const result = await fetchProductImage(asin.trim());
    results.push(result);

    if (result.imageUrl) {
      console.log(`${result.asin}: ${result.imageUrl}${result.note ? ` (${result.note})` : ""}`);
    } else {
      console.log(`${result.asin}: ERROR - ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Output as MDX-ready format
  console.log("\n--- MDX ProductCard image props ---\n");
  for (const r of results) {
    if (r.imageUrl) {
      console.log(`  image="${r.imageUrl}"`);
      console.log(`  // ASIN: ${r.asin} (${r.source})\n`);
    }
  }
}

main();
