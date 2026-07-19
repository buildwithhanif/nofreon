const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIG
// =====================================================
const SITE_URL = 'https://nofreon.id';
const BUILD_DATE = new Date().toISOString().split('T')[0];

// =====================================================
// DATA
// =====================================================
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8'));
const { listings, cityOrder } = data;
const { TIPS } = require('./tips-content.js');
const { REKOMENDASI } = require('./rekomendasi-content.js');

// =====================================================
// UTILITIES
// =====================================================
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[&]/g, '-')
    .replace(/[,]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatWhatsApp(phone) {
  let num = phone.replace(/[^0-9]/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  return `https://wa.me/${num}`;
}

function groupByCity(items) {
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.city]) grouped[item.city] = [];
    grouped[item.city].push(item);
  });
  return grouped;
}

/**
 * Extract individual area names from a listing's area string.
 * Splits on commas, ampersands, and "dan".
 * Removes generic prefixes like "Seluruh", "Kota", "Area", "sekitarnya".
 */
function extractAreaNames(areaString) {
  const parts = areaString
    .split(/[,&]|\bdan\b/i)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return parts
    .filter(part => {
      const lower = part.toLowerCase();
      // Skip generic/vague terms
      if (/^seluruh\s/i.test(part)) return false;
      if (/sekitarnya$/i.test(part)) return false;
      if (lower === 'sekitarnya') return false;
      return true;
    })
    .map(part => {
      // Normalize: "Kota Bandung" -> "Bandung", "Bandung Area" -> "Bandung".
      // Prevents duplicate pages targeting the same keyword.
      return part.replace(/^Kota\s+/i, '').replace(/\s+Area$/i, '');
    });
}

/**
 * Build a map of { areaName: [listings] } for a given city's listings.
 * Each listing can appear under multiple areas.
 * Areas whose slug equals the city slug are skipped — they would
 * cannibalize the city page for the same search query.
 */
function buildAreaMap(cityListings, cityName) {
  const areaMap = {};
  const citySlug = slugify(cityName);
  cityListings.forEach(listing => {
    const areas = extractAreaNames(listing.area);
    areas.forEach(areaName => {
      if (slugify(areaName) === citySlug) return;
      if (!areaMap[areaName]) areaMap[areaName] = [];
      // Avoid duplicates
      if (!areaMap[areaName].find(l => l.name === listing.name && l.phone === listing.phone)) {
        areaMap[areaName].push(listing);
      }
    });
  });
  return areaMap;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// =====================================================
// SHARED CSS (extracted from index.html)
// =====================================================
const SHARED_CSS = `
    :root {
        --bg: #F7F5F0;
        --surface: #FFFFFF;
        --text: #1A1A1A;
        --text-secondary: #6B6560;
        --accent: #E63B2E;
        --accent-light: #FFF0EE;
        --green: #1B8C5A;
        --green-light: #EEFBF4;
        --border: #E8E4DE;
        --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
        --shadow-hover: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06);
        --radius: 12px;
    }

    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }

    .hero {
        background: var(--text);
        color: white;
        padding: 48px 24px 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .hero::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 20px,
            rgba(255,255,255,0.015) 20px,
            rgba(255,255,255,0.015) 40px
        );
    }

    .hero-content {
        position: relative;
        z-index: 1;
        max-width: 640px;
        margin: 0 auto;
    }

    .logo {
        font-family: 'DM Mono', monospace;
        font-size: 32px;
        font-weight: 500;
        letter-spacing: -0.5px;
        margin-bottom: 4px;
    }

    .logo .no {
        color: var(--accent);
    }

    .logo a {
        color: inherit;
        text-decoration: none;
    }

    .tagline {
        font-size: 15px;
        color: rgba(255,255,255,0.75);
        font-weight: 400;
        margin-bottom: 24px;
        letter-spacing: 0.3px;
    }

    .hero-desc {
        font-size: 18px;
        line-height: 1.7;
        font-weight: 500;
        max-width: 500px;
        margin: 0 auto;
        opacity: 0.9;
    }

    .hero-desc span {
        background: var(--accent);
        padding: 1px 8px;
        border-radius: 4px;
        font-weight: 700;
        white-space: nowrap;
    }

    /* BREADCRUMB */
    .breadcrumb {
        max-width: 720px;
        margin: 0 auto;
        padding: 16px 24px 0;
        font-size: 13px;
        color: var(--text-secondary);
    }

    .breadcrumb a {
        color: var(--text-secondary);
        text-decoration: none;
    }

    .breadcrumb a:hover {
        color: var(--text);
        text-decoration: underline;
    }

    .breadcrumb .sep {
        margin: 0 6px;
        opacity: 0.5;
    }

    /* LISTING */
    .container {
        max-width: 720px;
        margin: 0 auto;
        padding: 8px 24px 40px;
    }

    .page-title {
        font-size: 24px;
        font-weight: 700;
        margin: 24px 0 8px;
        line-height: 1.3;
    }

    .page-subtitle {
        font-size: 15px;
        color: var(--text-secondary);
        margin-bottom: 24px;
        line-height: 1.6;
    }

    .city-heading {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--text-secondary);
        margin-bottom: 12px;
        padding-left: 4px;
    }

    .listing-card {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius);
        padding: 16px 20px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.15s;
        gap: 12px;
    }

    .listing-card:hover {
        border-color: var(--border);
        box-shadow: var(--shadow);
    }

    .listing-info {
        flex: 1;
        min-width: 0;
    }

    .listing-name {
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 2px;
    }

    .listing-area {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 400;
    }

    .listing-phone {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .phone-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: var(--green-light);
        color: var(--green);
        border-radius: 100px;
        font-size: 13px;
        font-weight: 600;
        font-family: 'DM Mono', monospace;
        text-decoration: none;
        transition: all 0.15s;
        white-space: nowrap;
        border: 1.5px solid transparent;
    }

    .phone-btn:hover {
        background: var(--green);
        color: white;
    }

    .phone-btn svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }

    /* AREA LINKS */
    .area-links {
        margin: 32px 0;
        padding: 24px;
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius);
    }

    .area-links h3 {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
        color: var(--text);
    }

    .area-links-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .area-link {
        display: inline-block;
        padding: 6px 14px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 100px;
        font-size: 13px;
        color: var(--text);
        text-decoration: none;
        font-weight: 500;
        transition: all 0.15s;
    }

    .area-link:hover {
        border-color: var(--text);
        background: var(--surface);
    }

    /* CROSS LINKS */
    .cross-links {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid var(--border);
    }

    .cross-links h3 {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--text-secondary);
        margin-bottom: 12px;
    }

    .cross-links-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    /* FOOTER */
    .footer {
        text-align: center;
        padding: 32px 24px 48px;
        font-size: 13px;
        color: var(--text-secondary);
        border-top: 1px solid var(--border);
        max-width: 720px;
        margin: 0 auto;
        line-height: 1.8;
    }

    .footer a {
        color: var(--text);
        font-weight: 600;
        text-decoration: none;
    }

    .footer a:hover {
        text-decoration: underline;
    }

    .stats {
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        opacity: 0.6;
        margin-top: 8px;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .listing-card {
        animation: fadeUp 0.3s ease both;
    }

    @media (max-width: 768px) {
        .hero { padding: 40px 20px 36px; }
        .hero-desc { font-size: 17px; }
        .container { padding: 8px 20px 40px; }
        .breadcrumb { padding: 16px 20px 0; }
    }

    @media (max-width: 480px) {
        .hero { padding: 36px 20px 32px; }
        .logo { font-size: 28px; }
        .hero-desc { font-size: 16px; }
        .container { padding: 8px 16px 40px; }
        .breadcrumb { padding: 16px 16px 0; }
        .listing-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 14px 16px;
        }
        .phone-btn { width: 100%; justify-content: center; }
    }

    /* REKO CTA */
    .reko-cta {
        display: block;
        background: var(--text);
        color: white;
        border-radius: var(--radius);
        padding: 18px 22px;
        margin: 24px 0;
        text-decoration: none;
        transition: opacity 0.15s;
    }

    .reko-cta:hover { opacity: 0.9; }

    .reko-cta strong { display: block; font-size: 15px; margin-bottom: 2px; color: white; }

    .reko-cta span { font-size: 13px; opacity: 0.75; }
`;

const WA_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

// =====================================================
// PAGE GENERATORS
// =====================================================

function renderListingCard(item, index) {
  return `
            <div class="listing-card" style="animation-delay: ${index * 0.04}s">
                <div class="listing-info">
                    <div class="listing-name">${item.name}</div>
                    <div class="listing-area">${item.area}</div>
                </div>
                <div class="listing-phone">
                    <a class="phone-btn" href="${formatWhatsApp(item.phone)}" target="_blank" title="WhatsApp ${item.phone}">
                        ${WA_ICON}
                        ${item.phone}
                    </a>
                </div>
            </div>`;
}

function generateCityPage(cityName, cityListings, areaMap, allCityLinks) {
  const citySlug = slugify(cityName);
  const count = cityListings.length;
  const title = `Service AC ${cityName} — Tukang AC Jujur & Trusted | nofreon.id`;
  const description = `Daftar ${count} tukang AC jujur & trusted di ${cityName}. Ga pernah minta isi freon tanpa alasan. Hubungi langsung via WhatsApp.`;
  const canonical = `${SITE_URL}/${citySlug}/`;

  const areaNames = Object.keys(areaMap).sort();

  // Structured data - ItemList
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Tukang Service AC Trusted di ${cityName}`,
    "description": description,
    "url": canonical,
    "numberOfItems": count,
    "itemListElement": cityListings.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": item.name,
        "telephone": item.phone,
        "areaServed": item.area,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": cityName,
          "addressCountry": "ID"
        }
      }
    }))
  };

  // BreadcrumbList structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "nofreon.id", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": cityName, "item": canonical }
    ]
  };

  const listingCards = cityListings.map((item, i) => renderListingCard(item, i)).join('');

  const areaLinksHtml = areaNames.length > 0 ? `
        <div class="area-links">
            <h3>Area di ${cityName}</h3>
            <div class="area-links-list">
                ${areaNames.map(area => `<a class="area-link" href="/${citySlug}/${slugify(area)}/">${area}</a>`).join('\n                ')}
            </div>
        </div>` : '';

  const otherCities = allCityLinks.filter(c => c.name !== cityName);
  const crossLinksHtml = `
        <div class="cross-links">
            <h3>Kota Lainnya</h3>
            <div class="cross-links-list">
                ${otherCities.map(c => `<a class="area-link" href="/${c.slug}/">${c.name}</a>`).join('\n                ')}
            </div>
        </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE_URL}/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/og.png">
    <meta name="twitter:creator" content="@hanifproduktif">
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 4)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbData, null, 4)}
    </script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style>
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">est. 2026</div>
        <p class="hero-desc">
            Daftar tukang service AC yang <span>TRUSTED</span> di ${cityName}
        </p>
    </div>
</header>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">nofreon.id</a>
    <span class="sep">›</span>
    <strong>${cityName}</strong>
</nav>

<main class="container">
    <h1 class="page-title">Tukang Service AC Jujur & Trusted di ${cityName}</h1>
    <p class="page-subtitle">Rekomendasi ${count} tukang AC jujur di ${cityName} dari komunitas — ga pernah minta isi freon tanpa alasan. Verified reviews, kontak langsung via WhatsApp.</p>

    ${listingCards}

    ${rekomendasiCta()}

    ${areaLinksHtml}

    ${tipsLinksBlock()}

    ${crossLinksHtml}
</main>

<div class="footer">
    <p>
        Punya rekomendasi tukang AC trusted?<br>
        DM ke <a href="https://x.com/hanifproduktif" target="_blank">@hanifproduktif</a>
    </p>
    <div class="stats">${count} tukang AC · ${cityName} · updated 2026</div>
</div>

</body>
</html>`;
}

function generateAreaPage(cityName, areaName, areaListings, siblingAreas, allCityLinks) {
  const citySlug = slugify(cityName);
  const areaSlug = slugify(areaName);
  const count = areaListings.length;
  const title = `Service AC ${areaName}, ${cityName} — Tukang AC Jujur | nofreon.id`;
  const description = `Tukang AC jujur & trusted di area ${areaName}, ${cityName}. Ga pernah minta isi freon tanpa alasan. Hubungi langsung via WhatsApp.`;
  const canonical = `${SITE_URL}/${citySlug}/${areaSlug}/`;

  // Structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Service AC Trusted di ${areaName}, ${cityName}`,
    "description": description,
    "url": canonical,
    "numberOfItems": count,
    "itemListElement": areaListings.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": item.name,
        "telephone": item.phone,
        "areaServed": item.area,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": areaName,
          "addressRegion": cityName,
          "addressCountry": "ID"
        }
      }
    }))
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "nofreon.id", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": cityName, "item": `${SITE_URL}/${citySlug}/` },
      { "@type": "ListItem", "position": 3, "name": areaName, "item": canonical }
    ]
  };

  const listingCards = areaListings.map((item, i) => renderListingCard(item, i)).join('');

  const otherAreas = siblingAreas.filter(a => a !== areaName);
  const siblingLinksHtml = otherAreas.length > 0 ? `
        <div class="area-links">
            <h3>Area lain di ${cityName}</h3>
            <div class="area-links-list">
                ${otherAreas.map(area => `<a class="area-link" href="/${citySlug}/${slugify(area)}/">${area}</a>`).join('\n                ')}
            </div>
        </div>` : '';

  const otherCities = allCityLinks.filter(c => c.name !== cityName);
  const crossLinksHtml = `
        <div class="cross-links">
            <h3>Kota Lainnya</h3>
            <div class="cross-links-list">
                ${otherCities.map(c => `<a class="area-link" href="/${c.slug}/">${c.name}</a>`).join('\n                ')}
            </div>
        </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE_URL}/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/og.png">
    <meta name="twitter:creator" content="@hanifproduktif">
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 4)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbData, null, 4)}
    </script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style>
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">est. 2026</div>
        <p class="hero-desc">
            Service AC <span>TRUSTED</span> di ${areaName}
        </p>
    </div>
</header>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">nofreon.id</a>
    <span class="sep">›</span>
    <a href="/${citySlug}/">${cityName}</a>
    <span class="sep">›</span>
    <strong>${areaName}</strong>
</nav>

<main class="container">
    <h1 class="page-title">Service AC Trusted di ${areaName}, ${cityName}</h1>
    <p class="page-subtitle">${count} tukang AC trusted yang melayani area ${areaName}. Ga pernah minta isi freon.</p>

    ${listingCards}

    ${siblingLinksHtml}

    ${crossLinksHtml}
</main>

<div class="footer">
    <p>
        Punya rekomendasi tukang AC trusted?<br>
        DM ke <a href="https://x.com/hanifproduktif" target="_blank">@hanifproduktif</a>
    </p>
    <div class="stats">${count} tukang AC · ${areaName}, ${cityName} · updated 2026</div>
</div>

</body>
</html>`;
}

// =====================================================
// TIPS (SEO ARTICLES)
// =====================================================

const ARTICLE_CSS = `
    .article {
        max-width: 720px;
        margin: 0 auto;
        padding: 8px 24px 40px;
    }

    .article h2 {
        font-size: 19px;
        font-weight: 700;
        margin: 28px 0 10px;
        line-height: 1.4;
    }

    .article p {
        font-size: 15px;
        line-height: 1.8;
        margin-bottom: 14px;
        color: var(--text);
    }

    .article ul, .article ol {
        margin: 0 0 14px 22px;
        font-size: 15px;
        line-height: 1.8;
    }

    .article li {
        margin-bottom: 6px;
    }

    .article a {
        color: var(--accent);
        font-weight: 600;
        text-decoration: none;
    }

    .article a:hover {
        text-decoration: underline;
    }

    .article em {
        color: var(--text-secondary);
    }

    .faq-block {
        margin-top: 32px;
    }

    .faq-block h2 {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--text-secondary);
        margin-bottom: 12px;
    }

    .faq-item {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: 8px;
        overflow: hidden;
    }

    .faq-item summary {
        padding: 14px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        list-style: none;
    }

    .faq-item summary::-webkit-details-marker {
        display: none;
    }

    .faq-item p {
        padding: 0 20px 16px;
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.7;
        margin: 0;
    }

    .tip-card {
        display: block;
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius);
        padding: 18px 20px;
        margin-bottom: 8px;
        text-decoration: none;
        color: var(--text);
        transition: all 0.15s;
    }

    .tip-card:hover {
        box-shadow: var(--shadow);
    }

    .tip-card h2 {
        font-size: 15px;
        font-weight: 700;
        margin: 0 0 4px;
    }

    .tip-card p {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
    }
`;

const PRODUCT_CSS = `
    .disclosure {
        font-size: 12px;
        color: var(--text-secondary);
        background: var(--accent-light);
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 20px;
        line-height: 1.6;
    }

    .product-card {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 12px;
    }

    .product-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--accent);
        background: var(--accent-light);
        padding: 3px 10px;
        border-radius: 100px;
        margin-bottom: 8px;
    }

    .product-card h3 {
        font-size: 17px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .product-specs {
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 10px;
    }

    .product-why {
        font-size: 14px;
        line-height: 1.7;
        margin-bottom: 12px;
    }

    .product-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    }

    .product-price {
        font-weight: 700;
        font-size: 14px;
    }

    .product-price span {
        display: block;
        font-size: 11px;
        font-weight: 400;
        color: var(--text-secondary);
    }

    .shopee-btn {
        display: inline-block;
        background: #EE4D2D;
        color: white;
        font-size: 13px;
        font-weight: 700;
        padding: 10px 20px;
        border-radius: 100px;
        text-decoration: none;
        transition: opacity 0.15s;
        white-space: nowrap;
    }

    .shopee-btn:hover {
        opacity: 0.85;
    }

    .best-for {
        font-size: 12px;
        color: var(--green);
        background: var(--green-light);
        padding: 3px 10px;
        border-radius: 100px;
        font-weight: 600;
    }

`;

function rekomendasiCta() {
  return `
        <a class="reko-cta" href="/rekomendasi-ac-terbaik/">
            <strong>Lagi cari AC baru? 🛒</strong>
            <span>Rekomendasi AC Terbaik ${REKOMENDASI.year} — per kategori: paling hemat listrik, paling senyap, terbaik untuk 900VA →</span>
        </a>`;
}

function generateRekomendasiPage() {
  const canonical = `${SITE_URL}/rekomendasi-ac-terbaik/`;
  const title = `Rekomendasi AC Terbaik ${REKOMENDASI.year} — Pilihan per Kategori | nofreon.id`;
  const description = `${REKOMENDASI.products.length} rekomendasi AC terbaik ${REKOMENDASI.year}: paling hemat listrik, paling senyap, low watt untuk 900VA, sampai pilihan budget. Diupdate ${REKOMENDASI.updated}.`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Rekomendasi AC Terbaik ${REKOMENDASI.year}`,
    "description": description,
    "url": canonical,
    "numberOfItems": REKOMENDASI.products.length,
    "itemListElement": REKOMENDASI.products.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": { "@type": "Product", "name": p.name, "description": p.why }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "nofreon.id", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": `Rekomendasi AC Terbaik ${REKOMENDASI.year}`, "item": canonical }
    ]
  };

  const productCards = REKOMENDASI.products.map(p => {
    const link = p.shopeeLink || `https://shopee.co.id/search?keyword=${encodeURIComponent(p.name)}`;
    return `
    <div class="product-card">
        <span class="product-badge">${p.badge}</span>
        <h3>${p.name}</h3>
        <div class="product-specs">${p.specs}</div>
        <p class="product-why">${p.why}</p>
        <div class="product-meta">
            <div class="product-price">${p.priceRange}<span>kisaran — cek harga terbaru</span></div>
            <span class="best-for">✓ ${p.bestFor}</span>
            <a class="shopee-btn" href="${link}" target="_blank" rel="nofollow sponsored noopener">Cek Harga di Shopee →</a>
        </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
    ${pageHead({ title, description, canonical, schemas: [itemListSchema, breadcrumbSchema], extraCss: ARTICLE_CSS + PRODUCT_CSS })}
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">rekomendasi ${REKOMENDASI.year}</div>
    </div>
</header>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">nofreon.id</a>
    <span class="sep">›</span>
    <strong>Rekomendasi AC Terbaik ${REKOMENDASI.year}</strong>
</nav>

<main class="article">
    <h1 class="page-title">Rekomendasi AC Terbaik ${REKOMENDASI.year}</h1>
    <p class="page-subtitle">Dipilih per kategori kebutuhan — bukan sekadar daftar merk. Diupdate ${REKOMENDASI.updated}.</p>

    <div class="disclosure">Halaman ini mengandung link afiliasi. Kalau kamu beli lewat link di sini, nofreon.id dapat komisi kecil — tanpa biaya tambahan apapun buat kamu. Itu yang bikin direktori tukang AC jujur ini tetap gratis.</div>

    ${productCards}

    <h2>Cara Pakai Daftar Ini</h2>
    <ol>
    <li><strong>Tentukan PK dulu.</strong> Salah PK = ga dingin selamanya, semahal apapun unitnya. <a href="/tips/cara-memilih-pk-ac/">Cek tabel PK vs ukuran ruangan</a>.</li>
    <li><strong>Cek daya listrik rumahmu.</strong> Listrik 900VA? Langsung lihat kategori low watt di atas.</li>
    <li><strong>Inverter kalau AC nyala 6+ jam per hari.</strong> Kalau cuma sesekali, non-inverter lebih masuk akal — <a href="/tips/ac-inverter-vs-non-inverter/">ini hitungannya</a>.</li>
    <li><strong>Beli dari toko resmi</strong> (official store) biar garansinya jelas, dan pastikan harga sudah termasuk atau belum termasuk pemasangan.</li>
    </ol>

    <h2>Setelah Beli: Pasang & Rawat dengan Benar</h2>
    <p>Pemasangan yang buruk (flaring asal-asalan, vakum ga bener) adalah penyebab nomor satu kebocoran freon di kemudian hari — dan itu pintu masuk <a href="/tips/kenapa-tukang-ac-selalu-minta-isi-freon/">drama "isi freon" tahunan</a>. Pakai teknisi yang jelas track record-nya: <a href="/">daftar tukang AC jujur per kota ada di sini</a>.</p>
</main>

<div class="footer">
    <p>
        Cari tukang AC jujur di kotamu?<br>
        <a href="/">Lihat daftar tukang AC trusted →</a>
    </p>
    <div class="stats">nofreon.id · rekomendasi ${REKOMENDASI.year} · updated ${REKOMENDASI.updated}</div>
</div>

</body>
</html>`;
}

function tipsLinksBlock() {
  return `
        <div class="cross-links">
            <h3>Panduan Anti Kena Tipu</h3>
            <div class="cross-links-list">
                ${TIPS.map(t => `<a class="area-link" href="/tips/${t.slug}/">${t.h1}</a>`).join('\n                ')}
            </div>
        </div>`;
}

function pageHead({ title, description, canonical, schemas, extraCss = '' }) {
  return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE_URL}/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/og.png">
    <meta name="twitter:creator" content="@hanifproduktif">
    <link rel="canonical" href="${canonical}">
    ${schemas.map(s => `<script type="application/ld+json">\n    ${JSON.stringify(s, null, 4)}\n    </script>`).join('\n    ')}
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}${extraCss}</style>`;
}

function generateTipsPage(tip, allTips) {
  const canonical = `${SITE_URL}/tips/${tip.slug}/`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": tip.title,
    "description": tip.metaDescription,
    "url": canonical,
    "inLanguage": "id",
    "datePublished": BUILD_DATE,
    "dateModified": BUILD_DATE,
    "author": { "@type": "Organization", "name": "nofreon.id", "url": SITE_URL + "/" },
    "publisher": { "@type": "Organization", "name": "nofreon.id", "url": SITE_URL + "/" }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "nofreon.id", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": "Panduan", "item": SITE_URL + "/tips/" },
      { "@type": "ListItem", "position": 3, "name": tip.h1, "item": canonical }
    ]
  };

  const schemas = [articleSchema, breadcrumbSchema];
  if (tip.faq && tip.faq.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": tip.faq.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    });
  }

  const faqHtml = tip.faq && tip.faq.length ? `
    <div class="faq-block">
        <h2>Pertanyaan Terkait</h2>
        ${tip.faq.map(f => `<details class="faq-item">
            <summary>${f.q}</summary>
            <p>${f.a}</p>
        </details>`).join('\n        ')}
    </div>` : '';

  const otherTips = allTips.filter(t => t.slug !== tip.slug);
  const relatedHtml = `
    <div class="cross-links">
        <h3>Panduan Lainnya</h3>
        <div class="cross-links-list">
            ${otherTips.map(t => `<a class="area-link" href="/tips/${t.slug}/">${t.h1}</a>`).join('\n            ')}
        </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
    ${pageHead({ title: `${tip.title} | nofreon.id`, description: tip.metaDescription, canonical, schemas, extraCss: ARTICLE_CSS })}
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">panduan anti kena tipu</div>
    </div>
</header>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">nofreon.id</a>
    <span class="sep">›</span>
    <a href="/tips/">Panduan</a>
    <span class="sep">›</span>
    <strong>${tip.h1}</strong>
</nav>

<main class="article">
    <h1 class="page-title">${tip.h1}</h1>
    ${tip.body}
    ${rekomendasiCta()}
    ${faqHtml}
    ${relatedHtml}
</main>

<div class="footer">
    <p>
        Cari tukang AC jujur di kotamu?<br>
        <a href="/">Lihat daftar tukang AC trusted →</a>
    </p>
    <div class="stats">nofreon.id · panduan · updated 2026</div>
</div>

</body>
</html>`;
}

function generateTipsIndex(allTips) {
  const canonical = `${SITE_URL}/tips/`;
  const title = 'Panduan Anti Kena Tipu Tukang AC | nofreon.id';
  const description = 'Kumpulan panduan biar ga kena tipu tukang AC: fakta soal freon, ciri tukang AC jujur, dan biaya service yang wajar.';

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "nofreon.id", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": "Panduan", "item": canonical }
    ]
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
    ${pageHead({ title, description, canonical, schemas: [breadcrumbSchema], extraCss: ARTICLE_CSS })}
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">panduan anti kena tipu</div>
    </div>
</header>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">nofreon.id</a>
    <span class="sep">›</span>
    <strong>Panduan</strong>
</nav>

<main class="article">
    <h1 class="page-title">Panduan Anti Kena Tipu Tukang AC</h1>
    <p class="page-subtitle">Fakta soal freon, ciri tukang AC jujur, dan harga yang wajar — biar kamu ga jadi korban berikutnya.</p>

    ${allTips.map(t => `<a class="tip-card" href="/tips/${t.slug}/">
        <h2>${t.h1}</h2>
        <p>${t.excerpt}</p>
    </a>`).join('\n    ')}
</main>

<div class="footer">
    <p>
        Cari tukang AC jujur di kotamu?<br>
        <a href="/">Lihat daftar tukang AC trusted →</a>
    </p>
    <div class="stats">nofreon.id · ${allTips.length} panduan · updated 2026</div>
</div>

</body>
</html>`;
}

// =====================================================
// REDIRECT STUBS + 404
// =====================================================

// Old URLs (crawled while live) that now merge into stronger pages.
// Meta-refresh(0) + canonical passes their signal to the target.
const REDIRECTS = [
  { from: 'bekasi/kota-bekasi', to: '/bekasi/' },
  { from: 'bandung/kota-bandung', to: '/bandung/' },
  { from: 'bandung/bandung-area', to: '/bandung/' },
  { from: 'semarang/semarang', to: '/semarang/' },
  { from: 'solo/solo', to: '/solo/' },
  { from: 'surabaya/surabaya', to: '/surabaya/' },
  { from: 'bali/bali', to: '/bali/' },
  { from: 'jogja/kota-yogyakarta', to: '/jogja/yogyakarta/' },
  { from: 'bali/kota-denpasar', to: '/bali/denpasar/' }
];

function generateRedirectStub(to) {
  const target = SITE_URL + to;
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex, follow">
    <meta http-equiv="refresh" content="0; url=${target}">
    <link rel="canonical" href="${target}">
    <title>Redirecting…</title>
</head>
<body>
    <p>Halaman ini pindah ke <a href="${target}">${target}</a>.</p>
</body>
</html>`;
}

function generate404Page() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Halaman Tidak Ditemukan — nofreon.id</title>
    <meta name="robots" content="noindex">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
    <style>${SHARED_CSS}</style>
</head>
<body>

<header class="hero">
    <div class="hero-content">
        <div class="logo"><a href="/"><span class="no">no</span>freon.id</a></div>
        <div class="tagline">404</div>
        <p class="hero-desc">Halaman ini ga ketemu — kayak freon yang katanya "habis". 🤷</p>
    </div>
</header>

<main class="container" style="text-align: center; padding-top: 40px;">
    <p style="color: var(--text-secondary); margin-bottom: 24px;">Mungkin kamu nyari salah satu dari ini:</p>
    <div class="cross-links-list" style="justify-content: center;">
        <a class="area-link" href="/">Daftar Tukang AC Jujur</a>
        <a class="area-link" href="/rekomendasi-ac-terbaik/">Rekomendasi AC Terbaik</a>
        <a class="area-link" href="/tips/">Panduan Anti Kena Tipu</a>
    </div>
</main>

</body>
</html>`;
}

// =====================================================
// HOMEPAGE STATIC LISTINGS (crawlable content)
// =====================================================

function injectStaticListings() {
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');

  const grouped = groupByCity(listings);
  let staticHtml = '';
  cityOrder.forEach(cityName => {
    const cityListings = grouped[cityName] || [];
    if (cityListings.length === 0) return;
    const citySlug = slugify(cityName);
    staticHtml += `<div class="city-section">`;
    staticHtml += `<h2 class="city-heading"><a href="/${citySlug}/" style="color: inherit; text-decoration: none;">${cityName}</a></h2>`;
    cityListings.forEach((item, i) => {
      staticHtml += renderListingCard(item, i);
    });
    staticHtml += `</div>`;
  });

  const startMarker = '<!--LISTINGS-->';
  const endMarker = '<!--/LISTINGS-->';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    console.warn('  ! LISTINGS markers not found in index.html — skipping static injection');
    return false;
  }

  html = html.slice(0, startIdx + startMarker.length) + staticHtml + html.slice(endIdx);
  fs.writeFileSync(indexPath, html);
  return true;
}

function generateSitemap(pages) {
  const urls = pages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateRobotsTxt() {
  // Explicitly welcome AI/LLM crawlers (GEO). "*" already allows them,
  // but explicit blocks make the intent unambiguous and survive future
  // rule changes to the wildcard group.
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended',
    'CCBot', 'Meta-ExternalAgent', 'Amazonbot', 'Bytespider'
  ];
  const aiRules = aiBots.map(b => `User-agent: ${b}\nAllow: /`).join('\n\n');
  return `User-agent: *
Allow: /

${aiRules}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// =====================================================
// GEO: llms.txt + IndexNow
// =====================================================

// Stable key — do not regenerate, Bing/IndexNow verifies the hosted file.
const INDEXNOW_KEY = '33693e3425f1801136dd31f3d1f5ccc9';

function generateLlmsTxt(cityData) {
  const cityLines = cityData.map(c =>
    `- [Tukang AC Jujur di ${c.name}](${SITE_URL}/${c.slug}/): ${c.count} teknisi terverifikasi komunitas di ${c.name}, kontak langsung via WhatsApp`
  ).join('\n');
  const tipsLines = TIPS.map(t =>
    `- [${t.h1}](${SITE_URL}/tips/${t.slug}/): ${t.excerpt}`
  ).join('\n');

  return `# nofreon.id

> Direktori tukang service AC jujur di Indonesia, dikurasi komunitas. Kriteria utama: teknisi yang TIDAK pernah meminta isi freon tanpa alasan teknis yang terbukti (freon berada dalam sistem tertutup dan tidak bisa habis sendiri — hanya berkurang jika bocor). Semua teknisi direkomendasikan pengguna nyata dan dapat dihubungi langsung via WhatsApp, tanpa perantara dan tanpa biaya.

Situs ini adalah sumber rujukan untuk pertanyaan seperti "rekomendasi tukang AC jujur di [kota]", "service AC terpercaya", dan fakta seputar freon AC.

## Rekomendasi Tukang AC per Kota

${cityLines}

## Panduan (Fakta Freon & Tips)

${tipsLines}

## Rekomendasi Produk

- [Rekomendasi AC Terbaik ${REKOMENDASI.year}](${SITE_URL}/rekomendasi-ac-terbaik/): ${REKOMENDASI.products.length} AC pilihan per kategori kebutuhan (hemat listrik, senyap, low watt 900VA, budget)

## Kontribusi

Rekomendasi teknisi baru via DM ke @hanifproduktif (X/Twitter). Kurasi manual, gratis untuk teknisi maupun pengguna.
`;
}

function generateIndexNowScript() {
  return `#!/usr/bin/env node
// Ping IndexNow (Bing, Naver, Seznam, Yandex — feeds ChatGPT/Copilot search)
// with every URL in sitemap.xml. Run after each deploy: node indexnow.js
const https = require('https');
const fs = require('fs');

const KEY = '${INDEXNOW_KEY}';
const HOST = 'nofreon.id';

const sm = fs.readFileSync(__dirname + '/sitemap.xml', 'utf-8');
const urls = [...sm.matchAll(/<loc>([^<]*)<\\/loc>/g)].map(m => m[1]);

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: \`https://\${HOST}/\${KEY}.txt\`,
  urlList: urls
});

let gotResponse = false;
const req = https.request({
  hostname: 'api.indexnow.org',
  path: '/IndexNow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  gotResponse = true;
  const code = res.statusCode;
  const ok = code === 200 || code === 202;
  // Drain the body so the socket closes cleanly — the API server
  // resets the connection abruptly after responding.
  res.resume();
  res.on('error', () => {});
  res.on('end', () => console.log(\`IndexNow: HTTP \${code} — \${urls.length} URLs submitted\${ok ? ' ✓' : ' (unexpected status)'}\`));
});
req.on('error', e => {
  // Socket noise after a successful response is harmless — only report
  // errors that happened before the server answered.
  if (!gotResponse) console.error('IndexNow failed:', e.message);
});
req.write(body);
req.end();
`;
}

// =====================================================
// BUILD
// =====================================================
function build() {
  console.log('Building nofreon.id programmatic SEO pages...\n');

  const allCityLinks = cityOrder.map(city => ({
    name: city,
    slug: slugify(city)
  }));

  const sitemapPages = [
    { url: `${SITE_URL}/`, priority: '1.0' }
  ];

  const grouped = groupByCity(listings);
  let totalCityPages = 0;
  let totalAreaPages = 0;
  const cityData = [];

  cityOrder.forEach(cityName => {
    const cityListings = grouped[cityName] || [];
    if (cityListings.length === 0) return;

    const citySlug = slugify(cityName);
    const areaMap = buildAreaMap(cityListings, cityName);

    // Generate city page
    const cityDir = path.join(__dirname, citySlug);
    ensureDir(cityDir);

    const cityHtml = generateCityPage(cityName, cityListings, areaMap, allCityLinks);
    fs.writeFileSync(path.join(cityDir, 'index.html'), cityHtml);
    sitemapPages.push({ url: `${SITE_URL}/${citySlug}/`, priority: '0.8' });
    cityData.push({ name: cityName, slug: citySlug, count: cityListings.length });
    totalCityPages++;
    console.log(`  ✓ /${citySlug}/ (${cityListings.length} listings)`);

    // Generate area pages
    const areaNames = Object.keys(areaMap).sort();
    areaNames.forEach(areaName => {
      const areaSlug = slugify(areaName);
      const areaListings = areaMap[areaName];
      const areaDir = path.join(cityDir, areaSlug);
      ensureDir(areaDir);

      const areaHtml = generateAreaPage(cityName, areaName, areaListings, areaNames, allCityLinks);
      fs.writeFileSync(path.join(areaDir, 'index.html'), areaHtml);
      sitemapPages.push({ url: `${SITE_URL}/${citySlug}/${areaSlug}/`, priority: '0.6' });
      totalAreaPages++;
      console.log(`    ✓ /${citySlug}/${areaSlug}/ (${areaListings.length} listings)`);
    });
  });

  // Generate tips pages
  const tipsDir = path.join(__dirname, 'tips');
  ensureDir(tipsDir);
  fs.writeFileSync(path.join(tipsDir, 'index.html'), generateTipsIndex(TIPS));
  sitemapPages.push({ url: `${SITE_URL}/tips/`, priority: '0.7' });
  console.log(`\n  ✓ /tips/ (index)`);
  TIPS.forEach(tip => {
    const tipDir = path.join(tipsDir, tip.slug);
    ensureDir(tipDir);
    fs.writeFileSync(path.join(tipDir, 'index.html'), generateTipsPage(tip, TIPS));
    sitemapPages.push({ url: `${SITE_URL}/tips/${tip.slug}/`, priority: '0.7' });
    console.log(`    ✓ /tips/${tip.slug}/`);
  });

  // Generate rekomendasi (money) page
  const rekoDir = path.join(__dirname, 'rekomendasi-ac-terbaik');
  ensureDir(rekoDir);
  fs.writeFileSync(path.join(rekoDir, 'index.html'), generateRekomendasiPage());
  sitemapPages.push({ url: `${SITE_URL}/rekomendasi-ac-terbaik/`, priority: '0.8' });
  console.log(`  ✓ /rekomendasi-ac-terbaik/ (${REKOMENDASI.products.length} products)`);

  // Redirect stubs for merged/removed URLs + 404 page
  REDIRECTS.forEach(r => {
    const dir = path.join(__dirname, r.from);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), generateRedirectStub(r.to));
  });
  console.log(`  ✓ ${REDIRECTS.length} redirect stubs`);
  fs.writeFileSync(path.join(__dirname, '404.html'), generate404Page());
  console.log('  ✓ 404.html');

  // Inject static (crawlable) listings into homepage
  if (injectStaticListings()) {
    console.log('  ✓ index.html (static listings injected)');
  }

  // Generate sitemap.xml
  const sitemapXml = generateSitemap(sitemapPages);
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml);
  console.log(`\n  ✓ sitemap.xml (${sitemapPages.length} URLs)`);

  // Generate robots.txt
  const robotsTxt = generateRobotsTxt();
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsTxt);
  console.log('  ✓ robots.txt (AI crawlers explicitly allowed)');

  // GEO: llms.txt + IndexNow key + ping script
  fs.writeFileSync(path.join(__dirname, 'llms.txt'), generateLlmsTxt(cityData));
  console.log('  ✓ llms.txt');
  fs.writeFileSync(path.join(__dirname, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
  fs.writeFileSync(path.join(__dirname, 'indexnow.js'), generateIndexNowScript());
  console.log('  ✓ IndexNow key file + indexnow.js ping script');

  console.log(`\nDone! Generated ${totalCityPages} city pages + ${totalAreaPages} area pages = ${totalCityPages + totalAreaPages} new pages.`);
  console.log(`Sitemap contains ${sitemapPages.length} total URLs.`);
}

build();
