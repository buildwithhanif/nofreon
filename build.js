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
      // Remove "Kota " prefix for cleaner slugs but keep display name
      return part;
    });
}

/**
 * Build a map of { areaName: [listings] } for a given city's listings.
 * Each listing can appear under multiple areas.
 */
function buildAreaMap(cityListings) {
  const areaMap = {};
  cityListings.forEach(listing => {
    const areas = extractAreaNames(listing.area);
    areas.forEach(areaName => {
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
  const title = `Service AC ${cityName} Trusted — nofreon.id`;
  const description = `Daftar ${count} tukang service AC trusted di ${cityName}. Ga minta isi freon. Verified reviews & community-sourced.`;
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
    <h1 class="page-title">Tukang Service AC Trusted di ${cityName}</h1>
    <p class="page-subtitle">${count} tukang AC trusted yang ga pernah minta isi freon. Verified reviews & community-sourced.</p>

    ${listingCards}

    ${areaLinksHtml}

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
  const title = `Service AC ${areaName}, ${cityName} — nofreon.id`;
  const description = `Tukang service AC trusted di area ${areaName}, ${cityName}. Ga minta isi freon. Hubungi langsung via WhatsApp.`;
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
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
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

  cityOrder.forEach(cityName => {
    const cityListings = grouped[cityName] || [];
    if (cityListings.length === 0) return;

    const citySlug = slugify(cityName);
    const areaMap = buildAreaMap(cityListings);

    // Generate city page
    const cityDir = path.join(__dirname, citySlug);
    ensureDir(cityDir);

    const cityHtml = generateCityPage(cityName, cityListings, areaMap, allCityLinks);
    fs.writeFileSync(path.join(cityDir, 'index.html'), cityHtml);
    sitemapPages.push({ url: `${SITE_URL}/${citySlug}/`, priority: '0.8' });
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

  // Generate sitemap.xml
  const sitemapXml = generateSitemap(sitemapPages);
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml);
  console.log(`\n  ✓ sitemap.xml (${sitemapPages.length} URLs)`);

  // Generate robots.txt
  const robotsTxt = generateRobotsTxt();
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsTxt);
  console.log('  ✓ robots.txt');

  console.log(`\nDone! Generated ${totalCityPages} city pages + ${totalAreaPages} area pages = ${totalCityPages + totalAreaPages} new pages.`);
  console.log(`Sitemap contains ${sitemapPages.length} total URLs.`);
}

build();
