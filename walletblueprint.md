# MASTER BLUEPRINT — LM WALLET

Bangun web app bernama **LM Wallet**, yaitu aplikasi sederhana untuk mencatat pemasukan dan pengeluaran Leadership Money selama kegiatan Leadership Training.

Leadership Money atau **LM** bukan uang asli. LM hanya digunakan sebagai mata uang simulasi untuk:

* Hadiah misi.
* Pembelian bahan makanan.
* Penyewaan kamar atau alat.
* Bonus.
* Denda.
* Pekerjaan atau job.
* Penyesuaian saldo oleh Admin.

Aplikasi hanya digunakan untuk satu kegiatan aktif. Tidak perlu sistem multi-event, workspace, organisasi, cabang, atau pilihan event.

Identitas kegiatan, nama kelas, daftar misi, daftar barang, harga, saldo awal, dan pengaturan lainnya dapat diubah oleh Admin.

---

# 1. KONSEP UTAMA APLIKASI

LM Wallet memiliki tiga jenis pengguna:

1. Admin.
2. Banker.
3. Peserta.

Admin dan Banker harus login.

Peserta tidak perlu login.

Peserta menggunakan RFID atau QR Code untuk membuka halaman saldo kelas.

Banker memilih transaksi terlebih dahulu, kemudian menentukan kelas yang menerima transaksi menggunakan:

* RFID.
* QR Code.
* Pilihan kelas manual.

RFID dan QR Code tidak menyimpan saldo.

RFID dan QR Code hanya digunakan untuk mengenali kelas.

Saldo dan transaksi tetap disimpan di Supabase.

Alur dasarnya:

```text
RFID atau QR Code
        ↓
Sistem mengenali kelas
        ↓
Sistem mengambil saldo dari Supabase
        ↓
Saldo atau transaksi ditampilkan
```

---

# 2. TEKNOLOGI

Gunakan teknologi berikut.

## Frontend

* React.
* TypeScript.
* Vite.
* React Router.
* Gunakan `HashRouter` agar aman ketika dideploy ke GitHub Pages.
* Tailwind CSS.
* shadcn/ui atau Radix UI.
* Lucide React.
* React Hook Form.
* Zod.
* TanStack Query.
* Sonner untuk toast notification.

## Backend

* Supabase PostgreSQL.
* Supabase Authentication.
* Supabase Row Level Security.
* Supabase RPC untuk seluruh proses transaksi.
* Supabase Realtime untuk memperbarui saldo dan aktivitas.

## Deployment

* Source code disimpan di GitHub.
* Frontend dideploy menggunakan GitHub Pages.
* Gunakan GitHub Actions.
* Setiap push ke branch `main` menjalankan:

  * lint,
  * type-check,
  * test,
  * build,
  * deploy.

Environment variable:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Jangan pernah menyimpan Supabase Service Role Key di frontend.

---

# 3. IDENTITAS APLIKASI

## Nama aplikasi

**LM Wallet**

## Kepanjangan

**Leadership Money Wallet**

## Tagline

**Plan. Earn. Spend. Lead.**

## Mata uang

* Nama: Leadership Money.
* Kode: LM.
* Format: `1.500 LM`.
* Tidak menggunakan desimal.
* Tidak menggunakan simbol rupiah.

Gunakan format angka Indonesia untuk tampilan LM.

Contoh:

```text
500 LM
1.500 LM
10.000 LM
```

---

# 4. ROLE DAN HAK AKSES

## Admin

Admin memiliki akses penuh terhadap aplikasi.

Admin dapat:

* Melihat saldo seluruh kelas.
* Menambah kelas.
* Mengubah nama kelas.
* Mengubah kode dan warna kelas.
* Menonaktifkan kelas.
* Mengubah saldo kelas secara langsung dari halaman Admin.
* Menambah atau mengurangi LM.
* Membuat transaksi.
* Mengubah atau mengoreksi transaksi.
* Membatalkan transaksi.
* Mengelola misi.
* Mengelola barang dan item sewa.
* Mengubah harga item.
* Mengelola RFID.
* Membuat ulang QR Code.
* Mengelola akun Banker.
* Mengubah identitas kegiatan.
* Mengatur pesan untuk peserta.
* Melihat seluruh riwayat transaksi.
* Mereset data kegiatan.
* Mengatur saldo awal seluruh kelas.

### Edit saldo langsung oleh Admin

Admin harus memiliki tombol:

```text
Edit Saldo
```

Admin dapat memasukkan saldo baru secara langsung.

Contoh:

```text
Saldo lama: 1.200 LM
Saldo baru: 1.500 LM
Selisih: +300 LM
```

Walaupun Admin mengedit saldo langsung dari tampilan, backend harus otomatis membuat catatan transaksi penyesuaian.

Contoh catatan:

```text
Penyesuaian Saldo oleh Admin
+300 LM
Alasan: Koreksi hadiah misi
```

Dengan demikian Admin tetap bisa mengubah saldo secara langsung, tetapi riwayat perubahan tetap dapat dilacak.

---

## Banker

Banker harus login.

Banker bertugas memproses seluruh transaksi selama kegiatan.

Banker dapat:

* Melihat saldo seluruh kelas.
* Membuat transaksi pemasukan.
* Membuat transaksi pengeluaran.
* Memilih misi.
* Memilih barang.
* Memilih item sewa.
* Mengatur jumlah barang.
* Menghitung total transaksi.
* Membaca RFID.
* Memindai QR Code.
* Memilih kelas secara manual.
* Memberikan bonus.
* Memberikan denda.
* Melihat riwayat transaksi.
* Membatalkan transaksi miliknya jika diizinkan.

Banker tidak dapat:

* Mengubah akun pengguna.
* Mengubah role.
* Menghapus seluruh data.
* Mengubah pengaturan utama aplikasi.
* Mengubah daftar kelas.
* Mengubah harga item.
* Mengedit saldo secara langsung.

---

## Peserta

Peserta tidak perlu login.

Peserta hanya dapat:

* Tap RFID pada perangkat yang mempunyai RFID reader.
* Scan QR Code kelas.
* Membuka halaman wallet kelas.
* Melihat saldo.
* Melihat total pemasukan.
* Melihat total pengeluaran.
* Melihat riwayat aktivitas.
* Melihat misi yang sudah dibayar.
* Melihat barang atau sewa yang pernah dibeli.

Peserta tidak dapat:

* Melihat daftar seluruh kelas dari halaman depan.
* Mengubah data.
* Membuat transaksi.
* Mengubah saldo.
* Membatalkan transaksi.

---

# 5. ALUR HALAMAN DEPAN

Saat aplikasi dibuka, jangan tampilkan daftar kelas.

Tampilkan halaman utama dengan desain sederhana.

## Isi halaman depan

```text
LM WALLET

Tap kartu RFID atau scan QR Code
untuk melihat saldo dan aktivitas kelas.
```

Tombol utama:

```text
[ Tap RFID ]
[ Scan QR Code ]
```

Tombol tambahan:

```text
[ Login Admin / Banker ]
```

Tambahkan informasi kecil:

```text
RFID hanya dapat digunakan pada perangkat
yang terhubung dengan RFID reader.
```

## Fungsi tombol Tap RFID

1. Buka popup scan RFID.
2. Fokuskan input RFID.
3. Tunggu RFID UID.
4. Cari kelas yang terhubung.
5. Jika ditemukan, buka halaman wallet kelas.
6. Jika tidak ditemukan, tampilkan pesan kesalahan.

## Fungsi tombol Scan QR Code

1. Minta izin kamera.
2. Scan QR Code kelas.
3. Baca token QR.
4. Cari kelas yang terhubung.
5. Buka halaman wallet kelas.

## QR langsung dari kamera HP

QR Code kelas juga dapat berisi URL langsung.

Contoh:

```text
https://domain.com/#/wallet/K8M4P2X9
```

Saat peserta memindai QR menggunakan kamera HP, halaman wallet langsung terbuka tanpa harus membuka scanner di dalam aplikasi.

---

# 6. HALAMAN WALLET PESERTA

Route peserta:

```text
/wallet/:publicToken
```

Token harus acak dan tidak mudah ditebak.

Jangan menggunakan:

```text
/wallet/xi-1
/wallet/xi-2
```

Gunakan token seperti:

```text
/wallet/K8M4P2X9
```

## Bagian halaman wallet

### Header

Tampilkan:

* Logo LM Wallet.
* Nama kegiatan.
* Nama kelas.
* Tombol kembali.
* Waktu terakhir data diperbarui.

### Saldo utama

Tampilkan card besar:

```text
Saldo LM

1.500 LM
```

### Ringkasan

Tampilkan:

* Total pemasukan.
* Total pengeluaran.
* Jumlah transaksi.

### Tab aktivitas

Gunakan tab:

* Semua.
* Pemasukan.
* Pengeluaran.
* Misi.
* Barang dan Sewa.

### Riwayat aktivitas

Contoh:

```text
Hadiah Misi Ketepatan Waktu
+200 LM
Hari ini, 09.15

Pembelian Beras
-160 LM
Hari ini, 11.10

Sewa Kompor
-100 LM
Hari ini, 11.25
```

Gunakan:

* Hijau untuk pemasukan.
* Merah lembut untuk pengeluaran.
* Ikon berbeda untuk misi, pembelian, sewa, bonus, dan denda.

Halaman peserta harus otomatis diperbarui ketika ada transaksi baru.

---

# 7. ALUR TRANSAKSI BANKER

Banker tidak harus memilih kelas pada awal transaksi.

Banker memilih transaksi atau barang terlebih dahulu.

Setelah detail transaksi selesai, Banker memilih kelas pembayar atau penerima menggunakan RFID, QR Code, atau pilihan manual.

Alur umum:

```text
Pilih jenis transaksi
        ↓
Pilih misi, barang, atau item
        ↓
Isi jumlah dan detail
        ↓
Sistem menghitung nominal
        ↓
Pilih kelas dengan RFID, QR, atau manual
        ↓
Tampilkan saldo sebelum dan sesudah
        ↓
Konfirmasi
        ↓
Proses transaksi
```

---

# 8. HALAMAN TRANSAKSI BANKER

Route:

```text
/banker/transaction
```

## Tahap 1 — Pilih jenis transaksi

Tampilkan tombol besar:

* Pembelian Barang.
* Pembayaran Sewa.
* Hadiah Misi.
* Job Reward.
* Bonus.
* Denda.
* Tambah LM Lainnya.
* Kurangi LM Lainnya.

## Tahap 2 — Isi transaksi

### Pembelian barang

Banker memilih satu atau beberapa barang.

Contoh:

```text
Beras
2 liter × 80 LM
160 LM

Minyak
1 liter × 100 LM
100 LM

Total
260 LM
```

### Pembayaran sewa

Banker memilih item sewa.

Contoh:

```text
Kompor Portabel
1 unit × 100 LM
100 LM
```

### Hadiah misi

Banker memilih misi dari daftar.

Reward otomatis terisi berdasarkan data misi.

Contoh:

```text
Misi Ketepatan Waktu
Reward: 200 LM
```

### Bonus atau denda

Field:

* Nominal.
* Alasan.
* Catatan tambahan.

## Tahap 3 — Pilih kelas

Setelah transaksi siap, tampilkan tombol:

```text
Pilih Kelas
```

Saat ditekan, buka popup dengan tiga pilihan:

```text
[ Tap RFID ]
[ Scan QR Code ]
[ Pilih Kelas Manual ]
```

### Tap RFID

* Baca RFID UID.
* Cari kelas.
* Tampilkan nama kelas.

### Scan QR Code

* Buka kamera.
* Scan QR.
* Cari kelas.
* Tampilkan nama kelas.

### Pilih kelas manual

Tampilkan seluruh kelas aktif dalam bentuk card besar.

Contoh:

```text
[ XI-1 ] [ XI-2 ]
[ XI-3 ] [ XI-4 ]
[ XI-5 ] [ XI-6 ]
```

Pilihan manual harus selalu tersedia sebagai cadangan.

## Tahap 4 — Konfirmasi transaksi

Setelah kelas terpilih, tampilkan custom popup.

Contoh:

```text
Konfirmasi Pembayaran

Kelas: XI-3

Pembelian:
Beras 2 liter
Minyak 1 liter

Total: 260 LM

Saldo sebelum: 1.500 LM
Saldo setelah: 1.240 LM
```

Tombol:

```text
[ Batal ]
[ Proses Transaksi ]
```

Scan RFID atau QR Code tidak boleh langsung memproses transaksi.

RFID dan QR Code hanya memilih kelas.

Transaksi baru diproses setelah Banker menekan tombol konfirmasi.

## Tahap 5 — Transaksi berhasil

Tampilkan popup sukses:

```text
Transaksi Berhasil

XI-3
-260 LM

Saldo terbaru:
1.240 LM
```

Tombol:

* Transaksi Baru.
* Lihat Riwayat.
* Tutup.

---

# 9. JENIS TRANSAKSI

Gunakan jenis transaksi berikut:

```text
initial_balance
mission_reward
job_reward
purchase
rental
bonus
penalty
adjustment_add
adjustment_subtract
refund
other_income
other_expense
```

Arah transaksi:

```text
income
expense
```

Status:

```text
completed
cancelled
```

Transaksi cancelled tidak dihitung dalam saldo.

---

# 10. SISTEM SALDO

Setiap kelas hanya memiliki satu saldo.

Contoh:

```text
XI-1: 1.500 LM
XI-2: 1.250 LM
XI-3: 1.700 LM
```

Saldo dapat disimpan dalam kolom `current_balance` agar akses cepat.

Namun setiap perubahan saldo tetap harus mempunyai transaksi atau adjustment record.

Rumus dasar:

```text
Saldo baru =
Saldo lama
+ pemasukan
- pengeluaran
```

Saldo kelas tidak boleh menjadi negatif.

Jika pengeluaran lebih besar daripada saldo:

```text
Saldo tidak mencukupi.

Saldo tersedia: 200 LM
Total transaksi: 350 LM
Kekurangan: 150 LM
```

Banker tidak dapat melanjutkan.

Admin dapat melakukan koreksi saldo melalui fitur Edit Saldo.

---

# 11. MANAJEMEN KELAS

Kelas awal:

* XI-1.
* XI-2.
* XI-3.
* XI-4.
* XI-5.
* XI-6.

Admin dapat mengubah seluruh nama tersebut.

Data kelas:

```text
Nama kelas
Kode kelas
Warna kelas
Ikon kelas
Saldo awal
Saldo saat ini
Status
Urutan
Public token
```

Admin dapat:

* Menambah kelas.
* Mengedit kelas.
* Menonaktifkan kelas.
* Mengubah urutan.
* Mengubah warna.
* Mengubah saldo.
* Membuat QR Code.
* Menghubungkan RFID.

Menghapus kelas yang sudah mempunyai transaksi tidak disarankan.

Gunakan status nonaktif agar riwayat tetap tersimpan.

---

# 12. MANAJEMEN MISI

Admin dapat:

* Menambah misi.
* Mengubah nama misi.
* Mengubah deskripsi.
* Mengubah reward LM.
* Mengaktifkan misi.
* Menonaktifkan misi.
* Mengubah urutan misi.

Data misi:

```text
Nama
Deskripsi
Reward LM
Status
Urutan
```

Contoh:

```text
Misi Membawa Kebutuhan Dapur
Reward: 200 LM
Status: Aktif
```

Saat Banker memilih hadiah misi:

1. Pilih misi.
2. Reward otomatis muncul.
3. Pilih kelas melalui RFID, QR, atau manual.
4. Konfirmasi.
5. LM masuk ke saldo kelas.

Misi yang sama dapat diberikan kepada beberapa kelas.

---

# 13. MANAJEMEN ITEM

Admin dapat mengelola barang dan item sewa.

Data item:

```text
Nama item
Kategori
Harga LM
Satuan
Jenis
Status
Urutan
```

Jenis item:

```text
purchase
rental
```

Kategori contoh:

* Bahan Makanan.
* Minuman.
* Peralatan Masak.
* Kamar.
* Perlengkapan.
* Sewa.
* Lainnya.

Contoh:

```text
Beras
Jenis: Purchase
Harga: 80 LM
Satuan: Liter
```

```text
Kompor Portabel
Jenis: Rental
Harga: 100 LM
Satuan: Unit
```

Tidak perlu sistem stok untuk versi awal.

Banker dapat memilih beberapa barang dalam satu transaksi.

Simpan snapshot nama item, harga satuan, dan jumlah ke dalam detail transaksi agar riwayat lama tidak berubah ketika Admin mengubah harga item.

---

# 14. RFID

RFID hanya menjadi identitas kelas.

Gunakan USB RFID reader yang bekerja seperti keyboard.

Reader biasanya mengirimkan:

```text
0008237129
```

Kemudian mengirim Enter.

## Alur scan RFID

1. Pengguna membuka popup RFID.
2. Input khusus otomatis fokus.
3. Reader mengirim UID.
4. Sistem menerima UID.
5. Sistem mencari kelas.
6. Jika ditemukan, tampilkan kelas.
7. Jika tidak ditemukan, tampilkan error.

Status scan:

* Menunggu kartu.
* Membaca kartu.
* Kartu ditemukan.
* Kartu tidak dikenal.
* Kartu tidak aktif.
* Kartu hilang.

Admin dapat:

* Mendaftarkan RFID UID.
* Mengganti RFID.
* Menonaktifkan RFID.
* Menandai kartu hilang.
* Melihat terakhir kali digunakan.

---

# 15. QR CODE

Setiap kelas memiliki QR token acak.

QR mempunyai dua fungsi.

## Untuk peserta

QR membuka halaman wallet kelas secara langsung.

Contoh URL:

```text
https://domain.com/#/wallet/K8M4P2X9
```

## Untuk Banker

QR digunakan untuk memilih kelas ketika proses transaksi.

QR tidak langsung memproses pembayaran.

Setelah QR dipindai:

1. Sistem menemukan kelas.
2. Nama kelas ditampilkan.
3. Saldo sebelum dan sesudah ditampilkan.
4. Banker tetap harus menekan konfirmasi.

Admin dapat membuat ulang QR token jika QR lama tersebar atau perlu diganti.

---

# 16. DASHBOARD ADMIN

Route:

```text
/admin/dashboard
```

## Ringkasan

Tampilkan:

* Total saldo seluruh kelas.
* Total pemasukan.
* Total pengeluaran.
* Jumlah transaksi hari ini.
* Jumlah kelas aktif.
* Jumlah misi aktif.

## Saldo seluruh kelas

Tampilkan card kelas:

```text
XI-1
1.500 LM

XI-2
1.250 LM
```

Pada setiap card tersedia:

* Lihat detail.
* Tambah LM.
* Kurangi LM.
* Edit saldo.

## Aktivitas terbaru

Tampilkan:

* Kelas.
* Jenis transaksi.
* Nominal.
* Banker atau Admin.
* Waktu.
* Status.

## Quick action

* Buat transaksi.
* Edit saldo kelas.
* Tambah misi.
* Tambah item.
* Daftarkan RFID.
* Kelola Banker.

---

# 17. DASHBOARD BANKER

Route:

```text
/banker/dashboard
```

Tampilkan:

* Tombol transaksi baru.
* Total transaksi hari ini.
* Total LM masuk hari ini.
* Total LM keluar hari ini.
* Riwayat transaksi terakhir.
* Saldo ringkas setiap kelas.

Quick action:

* Pembelian.
* Sewa.
* Hadiah Misi.
* Bonus.
* Denda.
* Transaksi Lainnya.

Dashboard Banker harus cepat digunakan dari HP atau tablet.

---

# 18. RIWAYAT TRANSAKSI

Admin dan Banker dapat melihat seluruh transaksi.

Filter:

* Kelas.
* Jenis transaksi.
* Pemasukan atau pengeluaran.
* Tanggal.
* Dibuat oleh.
* Status.

Tampilan desktop:

* Nomor transaksi.
* Waktu.
* Kelas.
* Jenis transaksi.
* Detail.
* Pemasukan.
* Pengeluaran.
* Saldo setelah transaksi.
* Dibuat oleh.
* Status.
* Aksi.

Tampilan HP menggunakan card.

Contoh:

```text
XI-1

Pembelian Beras
-160 LM

Saldo setelah: 1.340 LM
Banker: Ahmad
29 Juli 2026, 10.15
```

---

# 19. EDIT DAN PEMBATALAN TRANSAKSI

Admin dapat mengoreksi transaksi.

Banker dapat membatalkan transaksi miliknya jika Admin mengizinkan.

## Pembatalan

Saat membatalkan:

* Gunakan custom popup.
* Wajib mengisi alasan.
* Status menjadi `cancelled`.
* Saldo dikembalikan.
* Transaksi tidak dihapus.

## Edit transaksi oleh Admin

Ketika Admin mengedit nominal transaksi:

1. Ambil nominal lama.
2. Hitung selisih.
3. Perbarui saldo kelas.
4. Simpan data lama dan data baru.
5. Simpan alasan perubahan.
6. Catat siapa yang mengubah.

Admin juga dapat menggunakan pilihan yang lebih aman:

```text
Batalkan dan Buat Transaksi Pengganti
```

Jangan menghapus transaksi dari database.

---

# 20. LOGIN

Hanya Admin dan Banker yang login.

Gunakan Supabase Auth dengan email dan password.

Route:

```text
/login
```

Form:

```text
Email
Password

[ Masuk ]
```

Setelah login:

* Admin diarahkan ke `/admin/dashboard`.
* Banker diarahkan ke `/banker/dashboard`.

Tambahkan:

* Show/hide password.
* Lupa password.
* Reset password.
* Logout.
* Protected routes.
* Role guard.

---

# 21. DATABASE

Gunakan tabel berikut.

## `profiles`

```text
id uuid primary key references auth.users
full_name text
email text
role text
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

Role:

```text
admin
banker
```

---

## `app_settings`

Hanya satu baris aktif.

```text
id uuid
app_name text
activity_name text
currency_name text
currency_code text
logo_url text nullable
participant_message text nullable
banker_can_cancel boolean default true
created_at timestamptz
updated_at timestamptz
```

---

## `classes`

```text
id uuid
name text
code text
color text nullable
icon text nullable
initial_balance bigint default 0
current_balance bigint default 0
public_token text unique
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

---

## `class_cards`

```text
id uuid
class_id uuid references classes
rfid_uid text nullable unique
qr_token text unique
status text
last_used_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Status:

```text
active
inactive
lost
```

---

## `missions`

```text
id uuid
name text
description text nullable
reward_amount bigint
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

---

## `items`

```text
id uuid
name text
category text
item_type text
price bigint
unit text
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Item type:

```text
purchase
rental
```

---

## `transactions`

```text
id uuid
transaction_number text unique
class_id uuid references classes
direction text
transaction_type text
amount bigint
description text nullable
mission_id uuid nullable
status text
balance_before bigint
balance_after bigint
created_by uuid references profiles
created_at timestamptz
cancelled_at timestamptz nullable
cancelled_by uuid nullable
cancellation_reason text nullable
edited_at timestamptz nullable
edited_by uuid nullable
edit_reason text nullable
metadata jsonb
```

Direction:

```text
income
expense
```

Status:

```text
completed
cancelled
```

---

## `transaction_items`

```text
id uuid
transaction_id uuid references transactions
item_id uuid nullable
item_name text
item_type text
quantity integer
unit text
unit_price bigint
subtotal bigint
created_at timestamptz
```

Gunakan snapshot data agar perubahan harga item tidak mengubah riwayat lama.

---

## `balance_adjustments`

```text
id uuid
class_id uuid references classes
old_balance bigint
new_balance bigint
difference bigint
reason text
transaction_id uuid references transactions
created_by uuid references profiles
created_at timestamptz
```

---

# 22. SUPABASE RPC

Seluruh transaksi Banker harus melalui RPC.

## `create_lm_transaction`

Parameter utama:

```text
class_id
direction
transaction_type
amount
mission_id nullable
description nullable
items jsonb nullable
```

Fungsi harus:

1. Memastikan pengguna login sebagai Admin atau Banker.
2. Memastikan kelas aktif.
3. Memastikan nominal lebih dari nol.
4. Mengunci data kelas selama transaksi.
5. Memastikan saldo cukup untuk pengeluaran.
6. Menentukan saldo sebelum.
7. Menghitung saldo setelah.
8. Membuat nomor transaksi.
9. Membuat transaksi.
10. Membuat transaction items jika ada.
11. Memperbarui saldo kelas.
12. Mengembalikan transaksi dan saldo terbaru.

Seluruh proses harus atomic.

---

## `set_class_balance`

Hanya dapat digunakan Admin.

Parameter:

```text
class_id
new_balance
reason
```

Fungsi harus:

1. Memastikan pengguna adalah Admin.
2. Mengambil saldo lama.
3. Menghitung selisih.
4. Memperbarui saldo kelas.
5. Membuat transaksi:

   * `adjustment_add`, atau
   * `adjustment_subtract`.
6. Membuat balance adjustment.
7. Mengembalikan saldo terbaru.

Fitur ini membuat Admin dapat mengubah saldo secara langsung dari UI, tetapi perubahan tetap mempunyai riwayat.

---

## `cancel_lm_transaction`

Parameter:

```text
transaction_id
reason
```

Fungsi harus:

1. Memastikan transaksi masih completed.
2. Memastikan pengguna berhak membatalkan.
3. Mengembalikan saldo kelas.
4. Mengubah status menjadi cancelled.
5. Menyimpan alasan.
6. Mengembalikan saldo terbaru.

---

## `edit_lm_transaction`

Hanya dapat digunakan Admin.

Fungsi harus:

1. Mengambil transaksi lama.
2. Mengembalikan efek nominal lama.
3. Menghitung nominal baru.
4. Memastikan saldo tetap valid.
5. Memperbarui transaksi.
6. Memperbarui saldo.
7. Menyimpan alasan perubahan.
8. Menyimpan data perubahan dalam metadata.

---

## `get_public_wallet`

Digunakan peserta tanpa login.

Parameter:

```text
public_token
```

Mengembalikan:

* Nama kegiatan.
* Nama kelas.
* Warna kelas.
* Saldo.
* Total pemasukan.
* Total pengeluaran.
* Riwayat transaksi completed.
* Detail item transaksi.
* Waktu pembaruan terakhir.

Jangan mengembalikan:

* Email pengguna.
* Data Banker.
* RFID UID.
* Data kelas lain.
* Data Admin.
* Transaksi cancelled.

---

## `lookup_class_by_rfid`

Digunakan untuk membaca RFID.

Parameter:

```text
rfid_uid
```

Mengembalikan informasi kelas yang sesuai jika kartu aktif.

---

## `lookup_class_by_qr`

Parameter:

```text
qr_token
```

Mengembalikan kelas yang sesuai jika QR aktif.

---

# 23. ROW LEVEL SECURITY

Aktifkan RLS.

## Public

Public hanya dapat:

* Membaca app settings yang aman.
* Mengakses wallet melalui RPC dan public token.
* Melihat transaksi completed dari kelas yang tokennya diberikan.

Public tidak dapat:

* Membaca daftar semua RFID.
* Membaca daftar seluruh kelas secara bebas.
* Insert.
* Update.
* Delete.

## Banker

Banker dapat:

* Membaca kelas.
* Membaca misi.
* Membaca item.
* Membaca transaksi.
* Membuat transaksi melalui RPC.
* Membatalkan transaksi sesuai pengaturan.

Banker tidak dapat:

* Mengubah saldo langsung.
* Mengubah kelas.
* Mengubah misi.
* Mengubah item.
* Mengelola user.

## Admin

Admin dapat mengelola seluruh data.

Perubahan saldo tetap dilakukan melalui RPC `set_class_balance`.

---

# 24. ROUTES

## Public

```text
/
/wallet/:publicToken
/login
/forgot-password
/reset-password
```

## Admin

```text
/admin/dashboard
/admin/classes
/admin/classes/:id
/admin/transactions
/admin/missions
/admin/items
/admin/cards
/admin/users
/admin/settings
```

## Banker

```text
/banker/dashboard
/banker/transaction
/banker/history
```

---

# 25. DESIGN SYSTEM

Gunakan desain modern, dominan putih, dengan hijau tua yang lembut.

## Warna

```css
--primary-950: #143A30;
--primary-900: #19483B;
--primary-800: #245D4B;
--primary-700: #34735D;
--primary-100: #E5F0EB;
--primary-50: #F3F8F5;

--background: #F7F9F8;
--surface: #FFFFFF;
--text-main: #18322B;
--text-muted: #71807A;
--border: #DDE7E2;

--income: #2F7D5B;
--expense: #C44E4E;
--warning: #B47A25;
```

## Karakter desain

* Dominan putih.
* Hijau tua sebagai aksen.
* Background abu-abu kehijauan sangat muda.
* Card putih.
* Radius card 16–20 px.
* Shadow lembut.
* Ruang putih cukup luas.
* Ikon Lucide.
* Tidak menggunakan gradient berlebihan.
* Tidak membuat dashboard terlalu padat.

## Font

Gunakan:

* Plus Jakarta Sans, atau
* Inter.

---

# 26. RESPONSIVE LAYOUT

Aplikasi harus mobile-first.

## Halaman peserta

* Saldo besar di bagian atas.
* Semua informasi satu kolom.
* Riwayat dalam bentuk card.
* Tab dapat digeser horizontal.
* Tidak menggunakan tabel.
* Tombol scan besar dan mudah ditekan.

## Admin desktop

* Sidebar kiri.
* Header atas.
* Dashboard berbentuk grid.
* Riwayat transaksi berbentuk tabel.

## Admin mobile

* Sidebar menjadi drawer.
* Dashboard satu kolom.
* Tabel menjadi card.
* Tombol aksi utama mudah dijangkau.

## Banker mobile

* Tombol jenis transaksi besar.
* Produk mudah dipilih.
* Keranjang menggunakan drawer.
* Tombol pilih kelas besar.
* Tombol proses transaksi sticky di bawah.
* RFID dan QR scanner menggunakan fullscreen dialog atau bottom sheet.

Area sentuh minimal 44 px.

---

# 27. POPUP DAN NOTIFIKASI

Jangan menggunakan popup bawaan browser.

Dilarang menggunakan:

```javascript
alert()
confirm()
prompt()
window.alert()
window.confirm()
window.prompt()
```

Gunakan:

* Dialog.
* AlertDialog.
* Drawer.
* Sheet.
* Toast.
* Snackbar.

Gunakan custom confirmation popup untuk:

* Memproses transaksi.
* Membatalkan transaksi.
* Mengedit saldo.
* Mengedit transaksi.
* Menonaktifkan kelas.
* Mengganti RFID.
* Membuat ulang QR.
* Mereset data.

---

# 28. DATA AWAL

## Kelas

```text
XI-1
XI-2
XI-3
XI-4
XI-5
XI-6
```

## Saldo awal

```text
1.500 LM per kelas
```

## Misi awal

```text
Misi Membawa Kebutuhan Dapur — 200 LM
Misi Ketepatan Waktu — 100 LM
Misi Kebersihan Area — 150 LM
Misi Leadership Challenge — 300 LM
```

## Item awal

```text
Beras — 80 LM/liter
Minyak — 100 LM/liter
Mi Instan — 20 LM/bungkus
Nugget — 150 LM/bungkus
Telur — 15 LM/butir
Kertas Nasi — 5 LM/lembar
Kompor Portabel — 100 LM/unit
Magic Com — 150 LM/unit
Kamar — 300 LM/kamar
Karpet — 100 LM/unit
```

---

# 29. KOMPONEN UTAMA

Buat komponen reusable:

```text
AppShell
AdminSidebar
BankerHeader
PublicHeader
BalanceCard
ClassBalanceCard
TransactionCard
TransactionTable
TransactionTypeSelector
TransactionForm
ShoppingCart
ItemSelector
MissionSelector
ClassSelector
RFIDScannerDialog
QRCodeScannerDialog
PaymentMethodDialog
TransactionConfirmationDialog
TransactionSuccessDialog
EditBalanceDialog
CancelTransactionDialog
MoneyInput
MoneyDisplay
StatusBadge
EmptyState
LoadingSkeleton
ErrorState
SearchInput
FilterDrawer
```

Gunakan helper:

```typescript
formatLM(amount: number): string
```

Output:

```text
1.500 LM
```

---

# 30. STRUKTUR FOLDER

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── guards/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── wallet/
│   ├── transaction/
│   ├── scanner/
│   ├── classes/
│   ├── missions/
│   └── items/
├── features/
│   ├── auth/
│   ├── settings/
│   ├── classes/
│   ├── transactions/
│   ├── missions/
│   ├── items/
│   └── cards/
├── pages/
│   ├── public/
│   ├── admin/
│   └── banker/
├── hooks/
├── lib/
│   ├── supabase/
│   ├── formatters/
│   ├── validation/
│   └── permissions/
├── types/
└── utils/

supabase/
├── migrations/
└── seed.sql

docs/
├── BLUEPRINT.md
├── DATABASE.md
├── RFID_AND_QR.md
└── DEPLOYMENT.md
```

---

# 31. TAHAP PENGEMBANGAN

## Phase 1 — Fondasi

* Setup React TypeScript Vite.
* Setup Tailwind.
* Setup shadcn/ui.
* Setup Supabase.
* Setup router.
* Setup design system.
* Setup responsive layout.

## Phase 2 — Database

* Profiles.
* App settings.
* Classes.
* Cards.
* Missions.
* Items.
* Transactions.
* Transaction items.
* Balance adjustments.
* RPC.
* RLS.
* Seed data.

## Phase 3 — Public Wallet

* Landing page.
* RFID popup.
* QR scanner.
* Direct QR URL.
* Halaman wallet peserta.
* Riwayat aktivitas.
* Realtime saldo.

## Phase 4 — Authentication

* Login Admin dan Banker.
* Reset password.
* Protected routes.
* Role guards.
* Logout.

## Phase 5 — Admin

* Dashboard.
* Saldo seluruh kelas.
* Edit saldo langsung.
* Kelola kelas.
* Kelola misi.
* Kelola item.
* Kelola RFID dan QR.
* Kelola Banker.
* Pengaturan aplikasi.

## Phase 6 — Banker

* Pilih transaksi.
* Pilih barang.
* Keranjang.
* Pilih misi.
* RFID.
* QR.
* Pilihan kelas manual.
* Konfirmasi.
* Success receipt.
* Riwayat transaksi.

## Phase 7 — Koreksi dan Deployment

* Edit transaksi Admin.
* Pembatalan transaksi.
* Testing.
* Mobile testing.
* README.
* GitHub Actions.
* GitHub Pages.

---

# 32. ACCEPTANCE CRITERIA

Aplikasi dianggap selesai jika:

* Halaman depan tidak menampilkan daftar kelas.
* Peserta dapat melihat wallet dengan RFID.
* Peserta dapat melihat wallet dengan QR.
* QR dapat langsung membuka halaman wallet.
* Peserta tidak perlu login.
* Peserta hanya dapat melihat data.
* Admin dapat login.
* Banker dapat login.
* Admin dapat melihat saldo seluruh kelas.
* Admin dapat mengubah saldo secara langsung.
* Perubahan saldo Admin tercatat sebagai adjustment.
* Admin dapat mengelola kelas.
* Admin dapat mengelola misi.
* Admin dapat mengelola barang dan item sewa.
* Admin dapat mengelola RFID dan QR.
* Banker dapat memilih transaksi terlebih dahulu.
* Banker dapat memilih beberapa barang.
* Banker dapat menghitung total transaksi.
* Banker dapat memilih kelas melalui RFID.
* Banker dapat memilih kelas melalui QR.
* Banker dapat memilih kelas secara manual.
* Scan RFID atau QR tidak langsung memproses transaksi.
* Transaksi hanya diproses setelah konfirmasi.
* Saldo tidak dapat menjadi negatif.
* Transaksi cancelled mengembalikan saldo.
* Tampilan responsive di HP.
* Tidak ada browser alert, confirm, atau prompt.
* Dashboard dominan putih dengan aksen hijau tua.
* Aplikasi berhasil dibuild dengan Vite.
* Aplikasi berhasil dideploy ke GitHub Pages.

---

# 33. FITUR YANG TIDAK PERLU DIBUAT

Jangan membuat:

* Pilihan event.
* Multi-event.
* Workspace.
* Organisasi.
* Login peserta.
* Akun individual peserta.
* Tabungan.
* Pinjaman.
* Bunga.
* Deposit.
* Sistem stok.
* Marketplace.
* Transaksi antarkelas.
* Approval berlapis.
* PIN peserta.
* Sistem pembayaran uang asli.
* Integrasi payment gateway.
* Sistem bank kompleks.

---