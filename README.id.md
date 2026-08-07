<div align="center">

# ◢ KELLY TERMINAL

**Position sizing untuk trader yang sudah tahu arahnya.**

Kalkulator Kelly Criterion dan simulator Monte Carlo untuk lima instrumen yang dipantau langsung,
dibungkus antarmuka terminal web3, dan ditutup memo risiko institusional yang dihasilkan otomatis.

[![Deploy](https://github.com/xyb3rpunq/Kelly-Criterion/actions/workflows/deploy.yml/badge.svg)](https://github.com/xyb3rpunq/Kelly-Criterion/actions/workflows/deploy.yml)
![React](https://img.shields.io/badge/React-18-05060A?style=flat-square&labelColor=05060A&color=6E5BFF)
![Vite](https://img.shields.io/badge/Vite-8-05060A?style=flat-square&labelColor=05060A&color=D4AF37)
![Tests](https://img.shields.io/badge/tes-23%20lulus-05060A?style=flat-square&labelColor=05060A&color=00E5C7)
![Lisensi](https://img.shields.io/badge/lisensi-MIT-05060A?style=flat-square&labelColor=05060A&color=8B94A8)

### **[▸ BUKA TERMINAL LANGSUNG](https://xyb3rpunq.github.io/Kelly-Criterion/)**

**[English](README.md)** · `Bahasa Indonesia` · **[📄 Laporan Implementasi (PDF)](docs/Kelly-Terminal-Implementation-Report.pdf)**

</div>

---

```
                    f* = (p · b − q) / b

     p  probabilitas menang asumsi Anda     q  1 − p
     b  net odds reward-to-risk             f* fraksi modal yang dipertaruhkan
```

> Alat ini menghitung **seberapa besar** risiko yang diambil. Ia tidak berpendapat soal
> **arah** posisi, dan tidak tahu apakah edge Anda benar-benar ada.

---

## Daftar Isi

| # | Bagian |
|---|--------|
| 01 | [Apa ini](#01--apa-ini) |
| 02 | [Peta fitur](#02--peta-fitur) |
| 03 | [Matematikanya](#03--matematikanya) |
| 04 | [Data pasar langsung](#04--data-pasar-langsung) |
| 05 | [Memo risiko](#05--memo-risiko) |
| 06 | [Sistem desain](#06--sistem-desain) |
| 07 | [Aturan kejujuran](#07--aturan-kejujuran) |
| 08 | [Struktur proyek](#08--struktur-proyek) |
| 09 | [Menjalankan lokal](#09--menjalankan-lokal) |
| 10 | [Pengujian](#10--pengujian) |
| 11 | [Deployment](#11--deployment) |
| 12 | [Sanggahan](#12--sanggahan) |

---

## 01 · Apa ini

Kebanyakan kalkulator position sizing mengembalikan satu angka lalu berhenti. Yang ini
mengembalikan angkanya, lalu menghabiskan sisa halaman untuk mendebat angka itu sendiri.

Anda memberi geometri posisi — entry, stop, target — dan estimasi Anda sendiri tentang seberapa
sering setup itu menang. Alat ini menurunkan odds reward-to-risk, menerapkan Kelly Criterion,
mensimulasikan ribuan kemungkinan masa depan, lalu menerbitkan penilaian risiko tertulis yang
menyatakan terus terang seberapa rapuh kesimpulannya terhadap satu angka yang Anda tebak tadi.

**Tersedia dalam Bahasa Indonesia dan English.** Antarmuka mendeteksi bahasa browser dan mengingat
pilihan eksplisit Anda.

---

## 02 · Peta fitur

```
┌─ MONITOR PASAR ──────────────────────────────────────────────┐
│  DXY  ·  XAU/USD  ·  XAG/USD  ·  USOIL  ·  BTC/USD           │
│  polling langsung · sumber + usia data · sparkline sesi      │
└──────────────────────────────────────────────────────────────┘
        │
        ▼  pilih instrumen → mengisi setup berskala volatilitas
┌─ SETUP POSISI ─────────────┐  ┌─ KELLY GAUGE ─────────────────┐
│  arah · entry              │  │  busur radial 270°            │
│  stop · target · modal     │──▶│  4 zona risiko                │
│  → menurunkan b (net odds) │  │  takik bayangan ½ dan ¼       │
└────────────────────────────┘  │  komet berjalan di busur      │
┌─ PROBABILITAS ─────────────┐  └───────────────────────────────┘
│  slider p (asumsi Anda)    │              │
│  penanda titik impas       │──────────────┤
│  Penuh / Separuh / ¼       │              ▼
└────────────────────────────┘  ┌─ MONTE CARLO ─────────────────┐
                                │  24 jalur × 120 posisi        │
                                │  median · garis ruin · acak   │
                                │  skala log otomatis           │
                                └───────────────────────────────┘
                                             │
                                             ▼
                        ┌─ MEMO RISIKO (otomatis) ──────────────┐
                        │  ringkasan eksekutif · tangga sizing  │
                        │  sensitivitas ±5pp · faktor risiko    │
                        │  baris vonis                          │
                        └───────────────────────────────────────┘
```

| Kemampuan | Detail |
|---|---|
| **Kalkulasi real-time** | Semua angka diperbarui saat input berubah. Simulasi Monte Carlo didebounce 130ms agar geseran slider tetap mulus. |
| **Lima instrumen dipantau** | Masing-masing dengan desimal, jarak stop berskala volatilitas, dan sumber data sendiri. |
| **Simulasi ber-seed** | PRNG `mulberry32` — seed sama selalu menghasilkan jalur yang sama. Tombol acak ulang untuk penarikan baru. |
| **Sumbu log otomatis** | Aktif setelah rentang melewati dua dekade, karena penggandaan membawa $10rb melewati $10jt dan sumbu linear menyembunyikan segalanya. |
| **Dwibahasa** | ID / EN, termasuk prosa memo yang dihasilkan otomatis. |
| **Aksesibilitas** | Fokus terlihat di semua kontrol, radio group asli untuk segmented control, `prefers-reduced-motion` dihormati sepenuhnya. |
| **Mobile-first** | Panel menumpuk, tabel bergulir di dalam wadahnya sendiri, badan halaman tidak pernah bergulir menyamping. |

---

## 03 · Matematikanya

Semuanya ada di [`src/lib/kelly.js`](src/lib/kelly.js) — fungsi murni, tanpa React, tanpa DOM,
tanpa state tersembunyi. Deterministik terhadap argumennya, termasuk Monte Carlo.

### Odds reward-to-risk

```
long:   risiko = entry − stop      imbal = target − entry
short:  risiko = stop − entry      imbal = entry − target

b = imbal / risiko
```

Keduanya harus positif. Stop yang diletakkan di sisi yang salah ditandai sebagai kekeliruan
pengguna, bukan diam-diam menghasilkan `b` negatif.

### Fraksi Kelly

```
edge = p·b − q                    ekspektasi dalam kelipatan R
f*   = edge / b                   fraksi modal optimal
p_be = 1 / (1 + b)                win rate untuk mencapai titik impas
```

`f*` negatif dijadikan nol — saran rumus untuk "bertaruh di sisi sebaliknya" tidak bermakna untuk
posisi berarah yang sudah Anda pilih.

### Monte Carlo

Setiap jalur mempertaruhkan fraksi tetap dari ekuitas **berjalan**, dan itulah yang sebenarnya
diasumsikan Kelly — karena itu rentetan rugi memperkecil taruhan berikutnya alih-alih berbaris
lurus menuju nol.

```
menang →  ekuitas × (1 + f·b)
rugi   →  ekuitas × (1 − f)
```

Jalur yang menyentuh lantai ruin (50% modal awal) **berhenti bertransaksi dan mendatar**. Meja
yang kehilangan separuh NAV ditutup, bukan dibiarkan pulih. Garis median adalah median lintas
jalur yang diambil per langkah waktu, bukan jalur tengah yang dipilih dari kumpulan.

### Tingkat risiko

| Kondisi | Tingkat |
|---|---|
| `b` tidak valid | Setup Belum Lengkap |
| `edge ≤ 0` | Tanpa Edge — Jangan Ambil Posisi |
| `f* < 5%` | Edge Tipis — Hanya Fractional Kelly |
| `5% ≤ f* ≤ 25%` | Edge Ada — Sizing Fraksional Standar |
| `f* > 25%` | Edge Terlalu Besar — Periksa Ulang Input |

Tingkat teratas ada karena model yang meminta lebih dari seperempat NAV per posisi hampir selalu
sedang melaporkan `p` yang terlalu optimistis, bukan peluang luar biasa.

---

## 04 · Data pasar langsung

Kelima instrumen diambil dari **scanner publik TradingView** dalam satu permintaan — tanpa akun,
tanpa API key, tanpa server sendiri. Endpoint-nya mengirim header CORS (meng-echo `Origin`
permintaan), jadi halaman statis bisa memanggilnya langsung.

| Instrumen | Simbol TradingView | Feed | Kecepatan |
|---|---|:---:|---|
| **DXY** | `TVC:DXY` | streaming | ~10d |
| **XAU/USD** | `TVC:GOLD` | streaming | ~10d |
| **XAG/USD** | `TVC:SILVER` | streaming | ~10d |
| **USOIL** | `NYMEX:CL1!` | tunda 10 menit | ~10d |
| **BTC/USD** | WebSocket Binance | **push** | **1 detik** |

Bitcoin tambahan pakai WebSocket `miniTicker` Binance yang mendorong frame tiap satu detik dan
menimpa nilai hasil polling — satu-satunya instrumen dengan stream publik gratis, jadi satu-satunya
yang benar-benar update tiap 1 detik.

**Satu jebakan CORS yang perlu dicatat.** Preflight scanner cuma mengizinkan `Referer,Accept` di
`Access-Control-Allow-Headers`, jadi mengirim `Content-Type: application/json` memicu preflight
yang justru ditolak. Menghilangkan header itu membuat browser memakai default `text/plain` yang
masuk CORS-safelist sehingga preflight dilewati — dan servernya tetap mem-parse body JSON-nya.

### Rantai cadangan

Endpoint-nya tidak terdokumentasi, jadi kalau bentuknya berubah tiap instrumen jatuh sendiri-sendiri
ke API publik terdokumentasi yang dipakai sebelumnya, dan kartunya ditandai `CADANGAN`:

| Instrumen | Cadangan |
|---|---|
| **DXY** | Dihitung di browser dari `api.fxratesapi.com` via formula ICE |
| **XAU/USD**, **XAG/USD** | `api.gold-api.com` |
| **BTC/USD** | Binance REST, lalu Coinbase |
| **USOIL** | Snapshot Yahoo `CL=F` saat build |

### DXY dihitung, bukan diproksi

```js
DXY = 50.14348112
    × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119
    × USDCAD^0.091  × USDSEK^0.042 × USDCHF^0.036
```

Ini definisi asli indeksnya, bukan pendekatan.
**Divalidasi saat pengembangan: 99,956 hasil hitung terhadap 99,962 yang dipublikasikan untuk `DX-Y.NYB`.**

### Kenapa minyak tertunda 10 menit

Tidak ada feed WTI real-time yang gratis. Semuanya sudah diuji:

| Kandidat | Hasil |
|---|---|
| `TVC:USOIL` + 20 ticker CFD broker | Tidak ada di indeks scanner |
| Yahoo Finance | Menyajikan data, tidak mengirim header CORS |
| Stooq | Kini dijaga deteksi bot berbasis JavaScript |
| Proksi allorigins | HTTP 500 |
| corsproxy.io | Berbayar |
| gold-api.com | Tidak punya simbol minyak |
| fxratesapi | Hanya mata uang dan logam |

`NYMEX:CL1!` dengan tunda sepuluh menit adalah batas paling jujur tanpa langganan data pasar
berbayar. Kartunya menulis **DELAYED 10M**, bukan berpura-pura langsung.

### Kecepatan polling diukur, bukan ditebak

Scanner-nya disampel tiap dua detik selama setengah menit: nilainya menyegar kira-kira tiap
**sepuluh detik**. Jadi polling tiap satu detik hanya akan mengembalikan angka yang sama sembilan
dari sepuluh kali sambil menghabiskan 3.600 permintaan per jam per tab. Polling dijalankan pada
**5 detik**; crawl pita dan jam UTC berjalan 1 detik secara terpisah, dan tiap sel berkedip hijau
atau merah hanya saat harganya benar-benar berubah. Polling berhenti total saat tab tidak terlihat.

### Perubahan harian dikoreksi basis

Simbol emas dan perak di Yahoo adalah futures (`GC=F`, `SI=F`), sedangkan browser membaca spot.
Membawa harga tutup futures apa adanya akan menanamkan basis — sekitar 1,3% pada emas — ke dalam
setiap persentase yang ditampilkan. Skrip build menskalakan ulang harga tutup sebelumnya ke satuan
spot sebelum menuliskannya.

---

## 05 · Memo risiko

Bagian di bawah simulator ditulis dalam register memorandum risiko internal.
**Tidak ada prosa statis tentang hasil di dalamnya** — setiap kalimat disusun dari simulasi
langsung, dalam bahasa apa pun yang sedang aktif.

```
01  RINGKASAN EKSEKUTIF      f*, edge, tingkat, hasil simulasi dalam 3 kalimat
02  SIZING SETELAH RISIKO    Penuh / Separuh / ¼ terhadap batas internal 2%
03  SENSITIVITAS SKENARIO    p ±5pp, tiap baris disimulasikan ulang pada seed sama
04  FAKTOR RISIKO UTAMA      model · jalur · rezim · eksekusi · pembatasan
05  VONIS                    satu baris, ukuran terbatas, dinyatakan terus terang
```

Tabel sensitivitas adalah bagian yang paling penting. Ia menjalankan ulang seluruh simulasi pada
`p−5pp`, `p`, dan `p+5pp` **dengan seed yang sama**, sehingga kolom median akhir mengisolasi
pengaruh asumsi, bukan penarikan acak yang berbeda. Kesalahan lima poin dalam menaksir win rate
sendiri masih tergolong wajar bagi manusia, dan tabel ini menunjukkan persis apa dampaknya pada
rekomendasi.

---

## 06 · Sistem desain

Tiga pilihan default sengaja dihindari: krem-terakota, neon generik di atas hitam, dan garis rambut
ala broadsheet. Identitasnya dibangun dari subjeknya sendiri — emas sebagai logam, lapisan chain
sebagai violet elektrik.

| Token | Nilai | Peran |
|---|---|---|
| `void` | `#05060A` | Dasar halaman — nyaris hitam, condong biru |
| `panel` | `#0B0E14` | Permukaan panel |
| `gold` | `#D4AF37` → `#F4E4A6` | Aksen 1 — logamnya |
| `chain` | `#6E5BFF` | Aksen 2 — lapisan on-chain |
| `mint` | `#00E5C7` | Sinyal positif |
| `danger` | `#FF4D6D` | Ruin, edge negatif |

- **Palet diganti, bukan diperluas** — tidak ada warna bawaan Tailwind yang bisa dijangkau tema.
- **Tepi panel adalah gradien 1px**, dilukis lewat trik `mask-composite` alih-alih border solid,
  agar tepinya terbaca seperti logam menangkap cahaya.
- **Tidak ada yang membulat lebih dari 6px.** Ini harus terasa seperti instrumen.
- **Tipografi**: Space Grotesk (display), JetBrains Mono (semua angka, tabular-nums agar digit tidak
  menggeser tata letak), Inter (teks isi).
- **Motion adalah satu rangkaian load terorkestrasi** ditambah mikro-interaksi hover — bukan animasi
  yang ditaburkan di mana-mana. Semuanya hilang di bawah `prefers-reduced-motion`.

### Elemen tanda tangan

Kelly gauge adalah busur radial 270° yang seluruh isinya adalah data nyata: batas zona berada pada
sumbu yang sama dengan jarum, takik bayangan menandai posisi dua preset fraksi yang tidak dipilih,
dan halo menguat seiring fraksi terpakai sehingga seluruh instrumen ikut merespons, bukan cuma
penunjuknya. Sebuah komet berjalan di busur aktif lewat animasi dash CSS pada path ber-`pathLength="100"`
— menormalkan siklusnya agar melaju pada satu kecepatan baik `f*` bernilai 1% maupun 40%, tanpa
biaya per-frame di React.

---

## 07 · Aturan kejujuran

Temanya web3. Itu membuat mudah menambahkan elemen yang berbohong demi dekorasi. Proyek ini tidak:

| Aturan | Penerapan |
|---|---|
| **Tanpa tombol wallet palsu** | Halaman ini tidak terhubung ke chain mana pun dan tidak memegang kunci, jadi tidak ada kontrol "Connect Wallet". Pil status melaporkan apa yang *memang* dihubunginya: API harga publik, beserta keadaan sebenarnya. |
| **Tanpa ticker live palsu** | Tiap kartu instrumen membawa lencana `langsung` / `tersimpan` sendiri, nama sumbernya, dan usia observasi dalam detik. |
| **Sparkline diberi label** | Menampilkan harga yang teramati sejak halaman dibuka — riwayat sesi, bukan sepanjang hari perdagangan. |
| **Grafik menyebut skalanya sendiri** | Saat sumbu ekuitas beralih ke log, tulisan `sumbu ekuitas log₁₀` muncul di bawahnya. |
| **`p` tidak pernah disamarkan sebagai analisis** | Panel probabilitas menyatakan di antarmuka bahwa angka itu asumsi pengguna, bahwa tidak ada bagian aplikasi yang mengukur atau memprediksinya, dan bahwa semua angka turunannya mewarisi kesalahannya. |
| **Tanpa cosplay institusional** | Nada memo hanyalah gaya penulisan. Sanggahan menyatakan tegas bahwa proyek ini tidak berafiliasi dengan bank, dana kelolaan, bursa, atau pialang mana pun — termasuk Citadel. |

---

## 08 · Struktur proyek

```
Kelly-Criterion/
├── api/
│   └── quotes.js               Proksi serverless Vercel (membuat USOIL langsung)
├── scripts/
│   └── fetch-market.mjs        Snapshot saat build → public/market-cache.json
├── src/
│   ├── lib/
│   │   ├── kelly.js            ◆ Matematika murni. Tanpa React. Teruji penuh.
│   │   ├── kelly.test.js       23 tes
│   │   ├── market.js           Lapisan data, sumber, perhitungan DXY
│   │   ├── format.js           Pemformatan tampilan
│   │   └── i18n.jsx            Kamus EN + ID, generator prosa memo
│   ├── hooks/
│   │   ├── useMarketData.js    Polling, sadar visibilitas, penyegaran snapshot
│   │   ├── useDebouncedValue.js
│   │   └── useLanguage.jsx     Konteks bahasa, deteksi, penyimpanan
│   ├── components/
│   │   ├── Header.jsx          Wordmark, ticker, status, pengalih EN/ID
│   │   ├── Hero.jsx
│   │   ├── MarketMonitor.jsx   Lima kartu instrumen + pengungkapan sumber
│   │   ├── TradeSetupPanel.jsx Langkah 01 — geometri → b
│   │   ├── ProbabilityPanel.jsx Langkah 02 — p + preset fraksi
│   │   ├── KellyGauge.jsx      Langkah 03 — ◆ elemen tanda tangan
│   │   ├── MonteCarloChart.jsx Langkah 04 — jalur, median, statistik
│   │   ├── ConclusionPanel.jsx ◆ Memo risiko otomatis
│   │   ├── BackgroundGrid.jsx  Grid buku besar + jaring node
│   │   ├── Footer.jsx
│   │   └── ui/                 Primitif Panel, Field, Stat
│   ├── App.jsx
│   └── index.css               Layer Tailwind + utilitas tepi gradien
├── .github/workflows/deploy.yml
└── vercel.json
```

---

## 09 · Menjalankan lokal

**Kebutuhan:** Node 20+ (disarankan Node 22 atau 24).

```bash
git clone https://github.com/xyb3rpunq/Kelly-Criterion.git
cd Kelly-Criterion
npm install
npm run dev
```

Buka <http://localhost:5173>.

`npm run dev` menjalankan `scripts/fetch-market.mjs` lebih dulu untuk mengisi snapshot pasar. Bila
Anda sedang offline, skrip keluar dengan bersih, aplikasi tetap berjalan, dan USOIL cukup
dilaporkan tidak tersedia.

| Skrip | Kegunaan |
|---|---|
| `npm run dev` | Ambil snapshot, lalu jalankan dev server |
| `npm run build` | Ambil snapshot, lalu build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build produksi |
| `npm test` | Menjalankan suite tes matematika Kelly |
| `npm run test:watch` | Mode pantau |
| `npm run fetch:market` | Menyegarkan `public/market-cache.json` saja |

---

## 10 · Pengujian

```bash
npm test
```

23 tes atas `src/lib/kelly.js`, menutup bagian-bagian yang kesalahannya paling mahal bila lolos
diam-diam:

- Kasus Kelly buku teks — `p=0,6, b=1` harus menghasilkan tepat 20%
- Batas titik impas menghasilkan tepat nol
- Edge negatif dijadikan nol, bukan menyiratkan taruhan berbalik arah
- Stop di sisi yang salah dari entry ditolak
- RNG ber-seed reproducible, berbeda antar seed, tetap di `[0,1)`
- Jalur yang ruin tidak pernah pulih
- `terburuk ≤ median ≤ terbaik` selalu berlaku
- Full Kelly menghasilkan drawdown lebih berat daripada quarter Kelly
- Baris sensitivitas tetap terurut dan menjepit `p` di dalam `[0,1]`
- Batas internal 2% mengikat saat model meminta lebih

---

## 11 · Deployment

### GitHub Pages *(utama)*

Push ke `main` memicu [`deploy.yml`](.github/workflows/deploy.yml), yang menjalankan tes,
menyegarkan snapshot pasar, membangun dengan `DEPLOY_TARGET=gh-pages` (menetapkan base path ke
`/Kelly-Criterion/`), lalu men-deploy.

Workflow juga berjalan **setiap 30 menit** agar snapshot minyak tetap segar. Datanya disisipkan ke
artefak yang dideploy, bukan di-commit, sehingga jadwal itu tidak pernah menulis ke repositori.

> **Live di → https://xyb3rpunq.github.io/Kelly-Criterion/**

### Vercel *(opsional)*

Impor repositori; [`vercel.json`](vercel.json) mengurus sisanya. Dulu ini satu-satunya cara agar
minyak mendekati live, tapi sejak lapisan data pindah ke TradingView, build statis di Pages sudah
mendapat feed yang sama — jadi **Vercel kini murni opsional** dan tidak memberi keunggulan data.
Fungsi `/api/quotes` tetap ada sebagai cadangan kedua kalau kamu deploy ke sana.

Tidak ada API key satu pun di proyek ini, di target mana pun.

---

## 12 · Sanggahan

**Ini simulator edukasi. Bukan nasihat keuangan, investasi, atau perdagangan, dan bukan produk
riset.**

Probabilitas menang `p` adalah angka subjektif yang dimasukkan pengguna. Angka itu tidak diukur,
tidak diprediksi, dan tidak divalidasi oleh alat ini, dan setiap kesimpulan yang dihasilkan aplikasi
mewarisi kesalahannya. Hasil simulasi tidak mengindikasikan kinerja di masa depan.

Proyek ini adalah karya open-source independen **tanpa afiliasi, dukungan, atau hubungan apa pun
dengan bank, dana kelolaan, bursa, pialang, atau lembaga keuangan mana pun** — termasuk Citadel atau
perusahaan lain yang gaya penulisannya mungkin menyerupai nada memo yang dihasilkan.

Harga pasar berasal dari API publik gratis, bisa tertunda atau keliru, dan **tidak boleh dipakai
untuk eksekusi**.

---

<div align="center">

**Lisensi MIT** · © 2026 [xyb3rpunq](https://github.com/xyb3rpunq)

`f* = (p·b − q) / b`

</div>
