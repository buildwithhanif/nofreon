// =====================================================
// REKOMENDASI AC — evergreen money page content.
// UPDATE ANNUALLY: bump YEAR, refresh products/prices,
// paste Shopee affiliate links into shopeeLink fields,
// then run `node build.js`.
// URL stays /rekomendasi-ac-terbaik/ forever (keeps SEO).
// =====================================================

const REKOMENDASI = {
  year: 2026,
  updated: "Juli 2026",

  // Shopee affiliate links: paste your affiliate URL per product.
  // Empty string = button still shows but links to Shopee search
  // for the product name (so the page works before links are ready).
  products: [
    {
      badge: "Terbaik Overall",
      name: "Daikin FTKE Series (Inverter)",
      specs: "½ – 1 PK · Inverter · Freon R32",
      priceRange: "Rp3,5 – 5 jutaan",
      why: "Kompresor Daikin terkenal paling awet di kelasnya, dan jaringan service resminya luas di seluruh Indonesia. Kalau budget-mu masuk, ini pilihan paling aman untuk jangka panjang.",
      bestFor: "Pemakaian jangka panjang, ruangan utama",
      shopeeLink: ""
    },
    {
      badge: "Paling Hemat Listrik",
      name: "Panasonic XU Series (Inverter)",
      specs: "½ – 1 PK · Inverter · Aerowings · nanoe X",
      priceRange: "Rp4 – 5,5 jutaan",
      why: "Salah satu inverter paling efisien di pasaran. Fitur Aerowings menyebar udara lebih merata, jadi ruangan cepat dingin tanpa suhu naik-turun.",
      bestFor: "AC nyala lama tiap hari (6+ jam)",
      shopeeLink: ""
    },
    {
      badge: "Paling Senyap",
      name: "LG Dual Cool (Dual Inverter)",
      specs: "½ – 1 PK · Dual Inverter · R32",
      priceRange: "Rp4 – 6 jutaan",
      why: "Kompresor Dual Inverter LG bikin unit ini beroperasi sangat halus — cocok banget buat kamar tidur yang sensitif sama suara dengung.",
      bestFor: "Kamar tidur, pekerja WFH",
      shopeeLink: ""
    },
    {
      badge: "Paling Nyaman",
      name: "Samsung WindFree (Inverter)",
      specs: "½ – 1 PK · Inverter · mode WindFree",
      priceRange: "Rp4 – 6 jutaan",
      why: "Mode WindFree mendinginkan lewat ribuan lubang mikro, jadi ga ada angin yang nembak langsung ke badan. Buat yang sering masuk angin atau tidur di bawah AC, ini game changer.",
      bestFor: "Yang ga tahan kena semburan angin AC",
      shopeeLink: ""
    },
    {
      badge: "Terbaik untuk Listrik 900VA",
      name: "Sharp Low Watt (AH-A Series)",
      specs: "½ PK · ± 320–390 watt · beberapa tipe ada Plasmacluster",
      priceRange: "Rp2,5 – 3,5 jutaan",
      why: "Wattnya rendah banget, jadi aman buat rumah dengan listrik 900VA tanpa takut jeglek. Beberapa tipe dilengkapi Plasmacluster untuk udara lebih bersih.",
      bestFor: "Rumah listrik 900–1300VA",
      shopeeLink: ""
    },
    {
      badge: "Low Watt Alternatif",
      name: "Panasonic Seri Low Watt",
      specs: "½ PK · watt rendah · non-inverter",
      priceRange: "Rp3 – 3,5 jutaan",
      why: "Alternatif low watt dengan kualitas build Panasonic. Non-inverter, jadi harga unitnya lebih ramah dan perawatannya simpel.",
      bestFor: "Listrik kecil, budget menengah",
      shopeeLink: ""
    },
    {
      badge: "Budget Lokal Terbaik",
      name: "Polytron Neuva Series",
      specs: "½ – 1 PK · non-inverter & inverter tersedia",
      priceRange: "Rp2 – 2,7 jutaan",
      why: "Merk lokal yang serius: garansi kompresornya termasuk yang paling panjang di kelas harga ini, dan sparepart gampang dicari.",
      bestFor: "Budget ketat tapi mau garansi panjang",
      shopeeLink: ""
    },
    {
      badge: "Value Termurah",
      name: "Gree Series Standard",
      specs: "½ – 1 PK · non-inverter & inverter entry",
      priceRange: "Rp2 – 3 jutaan",
      why: "Gree itu salah satu produsen AC terbesar dunia — banyak AC merk lain sebenarnya dibuat di pabrik Gree. Harga masuk akal, pilihan variannya banyak.",
      bestFor: "Kos, kontrakan, ruangan sekunder",
      shopeeLink: ""
    }
  ]
};

module.exports = { REKOMENDASI };
