# Smart Library - Sistem Perpustakaan Blockchain

Proyek ini adalah aplikasi perpustakaan terdesentralisasi (DApp) yang berjalan di jaringan Ethereum (Sepolia Testnet). Aplikasi ini memungkinkan pengguna untuk meminjam buku, melihat riwayat peminjaman, dan mendaftar sebagai anggota, dengan semua data transaksi tercatat secara transparan di blockchain.

## 🛠 Teknologi & Dependensi

Proyek ini dibangun menggunakan versi perangkat lunak berikut:

*   **Truffle**: v5.11.5 (core: 5.11.5)
*   **Ganache**: v7.9.1
*   **Solidity**: 0.8.20 (solc-js)
*   **Node.js**: v18.20.0
*   **Web3.js**: v1.10.0

## 🚀 Fitur Utama

*   **Peminjaman Buku**: Peminjaman buku tercatat di blockchain.
*   **Keanggotaan**: Sistem registrasi anggota on-chain.
*   **Admin Panel**: Menambah buku baru dan melihat daftar anggota (khusus admin).
*   **Riwayat Transparan**: Riwayat peminjaman dapat dilihat oleh semua orang.
*   **Integrasi IPFS**: Metadata buku disimpan menggunakan IPFS (Pinata).
*   **Dark Mode UI**: Antarmuka modern yang nyaman di mata.

## 📦 Cara Menjalankan Proyek

1.  **Clone Repositori**
    ```bash
    git clone https://github.com/Ridhorizqullah/blockhain_TA.git
    cd library-blockchain
    ```

2.  **Install Dependensi**
    ```bash
    npm install
    ```

3.  **Konfigurasi Smart Contract**
    Pastikan Anda memiliki Truffle terinstall secara global.
    ```bash
    npm install -g truffle
    ```
    Deploy kontrak ke jaringan (misal: Sepolia atau Development/Ganache):
    ```bash
    truffle migrate --network sepolia
    ```

4.  **Jalankan Frontend**
    ```bash
    npm run dev
    ```
    Akses aplikasi di `http://127.0.0.1:8080`.

## 🗺️ Roadmap

Berikut adalah rencana pengembangan proyek ke depan:

- [x] **Fase 1: Pengembangan Inti**
    - [x] Pembuatan Smart Contract (Peminjaman, Pengembalian, Stok).
    - [x] Deployment ke Sepolia Testnet.
    - [x] Dasar Frontend dengan Web3.js.

- [x] **Fase 2: Peningkatan UI/UX**
    - [x] Redesign Antarmuka (Dark Mode).
    - [x] Penambahan Sidebar dan Navigasi Responsif.
    - [x] Fitur "Quick Fill" untuk Admin.

- [ ] **Fase 3: Fitur Lanjutan**
    - [ ] **Upload IPFS Otomatis**: Memungkinkan admin mengupload gambar/metadata langsung dari UI.
    - [ ] **Sistem Denda**: Implementasi denda keterlambatan menggunakan token ETH/ERC-20.
    - [ ] **Rating & Review**: Memberikan ulasan buku yang tersimpan di blockchain.

- [ ] **Fase 4: Skalabilitas & Keamanan**
    - [ ] Audit Keamanan Smart Contract.
    - [ ] Optimasi Gas Fee.
    - [ ] Peluncuran ke Mainnet.

## 📄 Lisensi

Proyek ini dibuat untuk tujuan Tugas Akhir / Edukasi.
