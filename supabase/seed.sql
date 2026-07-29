-- Insert default app settings
INSERT INTO public.app_settings (id, app_name, activity_name, currency_name, currency_code, participant_message, banker_can_cancel, facilitator_pin)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'LM Wallet',
    'Leadership Training 2026',
    'Leadership Money',
    'LM',
    'Selamat datang di Leadership Training! Jaga kartu RFID dan scan QR Code Anda untuk memantau transaksi kelas.',
    true,
    '123456'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Classes (XI-1 to XI-6) with 1500 LM initial balance
-- Standard public tokens are generated
INSERT INTO public.classes (id, name, code, color, icon, initial_balance, current_balance, public_token, is_active, sort_order)
VALUES
    ('c1000000-0000-0000-0000-000000000001'::uuid, 'XI-1', 'xi-1', '#143A30', 'Compass', 1500, 1500, 'K8M4P2X1', true, 1),
    ('c2000000-0000-0000-0000-000000000002'::uuid, 'XI-2', 'xi-2', '#245D4B', 'Shield', 1500, 1500, 'K8M4P2X2', true, 2),
    ('c3000000-0000-0000-0000-000000000003'::uuid, 'XI-3', 'xi-3', '#34735D', 'Award', 1500, 1500, 'K8M4P2X3', true, 3),
    ('c4000000-0000-0000-0000-000000000004'::uuid, 'XI-4', 'xi-4', '#19483B', 'BookOpen', 1500, 1500, 'K8M4P2X4', true, 4),
    ('c5000000-0000-0000-0000-000000000005'::uuid, 'XI-5', 'xi-5', '#2E7D32', 'Users', 1500, 1500, 'K8M4P2X5', true, 5),
    ('c6000000-0000-0000-0000-000000000006'::uuid, 'XI-6', 'xi-6', '#37474F', 'Briefcase', 1500, 1500, 'K8M4P2X6', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Seed Class Cards (RFID and QR mapping)
INSERT INTO public.class_cards (id, class_id, rfid_uid, qr_token, status)
VALUES
    ('d1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid, '1111111111', 'QR-XI-1', 'active'),
    ('d2000000-0000-0000-0000-000000000002'::uuid, 'c2000000-0000-0000-0000-000000000002'::uuid, '2222222222', 'QR-XI-2', 'active'),
    ('d3000000-0000-0000-0000-000000000003'::uuid, 'c3000000-0000-0000-0000-000000000003'::uuid, '3333333333', 'QR-XI-3', 'active'),
    ('d4000000-0000-0000-0000-000000000004'::uuid, 'c4000000-0000-0000-0000-000000000004'::uuid, '4444444444', 'QR-XI-4', 'active'),
    ('d5000000-0000-0000-0000-000000000005'::uuid, 'c5000000-0000-0000-0000-000000000005'::uuid, '5555555555', 'QR-XI-5', 'active'),
    ('d6000000-0000-0000-0000-000000000006'::uuid, 'c6000000-0000-0000-0000-000000000006'::uuid, '6666666666', 'QR-XI-6', 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed initial transactions for the initial balances
INSERT INTO public.transactions (id, transaction_number, class_id, direction, transaction_type, amount, description, status, balance_before, balance_after, created_at)
VALUES
    ('e1000000-0000-0000-0000-000000000001'::uuid, 'TX-INIT-XI-1', 'c1000000-0000-0000-0000-000000000001'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now()),
    ('e2000000-0000-0000-0000-000000000002'::uuid, 'TX-INIT-XI-2', 'c2000000-0000-0000-0000-000000000002'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now()),
    ('e3000000-0000-0000-0000-000000000003'::uuid, 'TX-INIT-XI-3', 'c3000000-0000-0000-0000-000000000003'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now()),
    ('e4000000-0000-0000-0000-000000000004'::uuid, 'TX-INIT-XI-4', 'c4000000-0000-0000-0000-000000000004'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now()),
    ('e5000000-0000-0000-0000-000000000005'::uuid, 'TX-INIT-XI-5', 'c5000000-0000-0000-0000-000000000005'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now()),
    ('e6000000-0000-0000-0000-000000000006'::uuid, 'TX-INIT-XI-6', 'c6000000-0000-0000-0000-000000000006'::uuid, 'income', 'initial_balance', 1500, 'Saldo Awal Kegiatan', 'completed', 0, 1500, now())
ON CONFLICT (id) DO NOTHING;

-- Seed Missions
INSERT INTO public.missions (id, name, description, reward_amount, is_active, sort_order)
VALUES
    ('f1000000-0000-0000-0000-000000000001'::uuid, 'Misi Membawa Kebutuhan Dapur', 'Menyiapkan dan menyerahkan seluruh bahan dapur wajib kelas', 200, true, 1),
    ('f2000000-0000-0000-0000-000000000002'::uuid, 'Misi Ketepatan Waktu', 'Berkumpul dalam formasi lengkap tepat waktu', 100, true, 2),
    ('f3000000-0000-0000-0000-000000000003'::uuid, 'Misi Kebersihan Area', 'Menjaga area tenda dan barak tetap bersih', 150, true, 3),
    ('f4000000-0000-0000-0000-000000000004'::uuid, 'Misi Leadership Challenge', 'Menyelesaikan tantangan kepemimpinan dengan nilai terbaik', 300, true, 4)
ON CONFLICT (id) DO NOTHING;

-- Seed Items (Beras, Minyak, Mi Instan, Nugget, Telur, Kertas Nasi, Kompor, Magic Com, Kamar, Karpet)
INSERT INTO public.items (id, name, category, item_type, price, unit, is_active, sort_order)
VALUES
    ('b1000000-0000-0000-0000-000000000001'::uuid, 'Beras', 'Bahan Makanan', 'purchase', 80, 'liter', true, 1),
    ('b2000000-0000-0000-0000-000000000002'::uuid, 'Minyak', 'Minuman', 'purchase', 100, 'liter', true, 2),
    ('b3000000-0000-0000-0000-000000000003'::uuid, 'Mi Instan', 'Bahan Makanan', 'purchase', 20, 'bungkus', true, 3),
    ('b4000000-0000-0000-0000-000000000004'::uuid, 'Nugget', 'Bahan Makanan', 'purchase', 150, 'bungkus', true, 4),
    ('b5000000-0000-0000-0000-000000000005'::uuid, 'Telur', 'Bahan Makanan', 'purchase', 15, 'butir', true, 5),
    ('b6000000-0000-0000-0000-000000000006'::uuid, 'Kertas Nasi', 'Perlengkapan', 'purchase', 5, 'lembar', true, 6),
    ('b7000000-0000-0000-0000-000000000007'::uuid, 'Kompor Portabel', 'Peralatan Masak', 'rental', 100, 'unit', true, 7),
    ('b8000000-0000-0000-0000-000000000008'::uuid, 'Magic Com', 'Peralatan Masak', 'rental', 150, 'unit', true, 8),
    ('b9000000-0000-0000-0000-000000000009'::uuid, 'Kamar', 'Kamar', 'rental', 300, 'kamar', true, 9),
    ('ba000000-0000-0000-0000-000000000010'::uuid, 'Karpet', 'Sewa', 'rental', 100, 'unit', true, 10)
ON CONFLICT (id) DO NOTHING;
