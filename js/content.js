/*
 * Deniz6 — site içeriği.
 * Kişileri, iletişim bilgilerini, sponsorları, sayaçları ve tarihleri yalnızca bu dosyadan değiştirin.
 * Boş bırakılan ('') bağlantılar sitede gösterilmez.
 */
window.DENIZ6_CONTENT = {
  // Takımın e-posta adresi: "Bize yazın" butonları ve footer bu adresi kullanır.
  email: 'iletisim@ornek.com',
  location: 'Türkiye',

  // Logo dosyası (ör. 'img/logo.svg'). Boşsa "Deniz6" yazısı (wordmark) kullanılır.
  logo: '',

  // Sosyal medya hesapları: tam adres yazın (https://...).
  social: [
    { label: 'Instagram', href: '' },
    { label: 'LinkedIn', href: '' },
    { label: 'YouTube', href: '' },
    { label: 'X (Twitter)', href: '' },
    { label: 'GitHub', href: '' }
  ],

  // Takım. name boşsa kart üyenin rolünü gösterir.
  // photo: 'img/team/dosya.jpg' (kare, en az 256 px). Boşsa adın baş harfleri görünür.
  // email ve profile (LinkedIn vb.) isteğe bağlı; boşsa o ikon çıkmaz.
  // tone: 'biolume' (turkuaz), 'signal' (turuncu) veya boş (nötr) rozet rengi.
  team: [
    { name: '', role: 'Takım Kaptanı', unit: 'YÖNETİM', tone: 'biolume', photo: '', email: '', profile: '' },
    { name: '', role: 'Mekanik Sorumlusu', unit: 'MEKANİK', photo: '', email: '', profile: '' },
    { name: '', role: 'Elektronik Sorumlusu', unit: 'ELEKTRONİK', photo: '', email: '', profile: '' },
    { name: '', role: 'Yazılım Sorumlusu', unit: 'YAZILIM', photo: '', email: '', profile: '' },
    { name: '', role: 'Görüntü İşleme', unit: 'YAZILIM', photo: '', email: '', profile: '' },
    { name: '', role: 'Sponsorluk ve Medya', unit: 'İLETİŞİM', tone: 'signal', photo: '', email: '', profile: '' }
  ],

  // "Hakkımızda" bölümündeki sayaçlar. grouping: false yılları 2.027 yerine 2027 yazar.
  stats: [
    { value: 4, label: 'Alt sistem' },
    { value: 6, unit: 'DOF', label: 'Hareket ekseni hedefi' },
    { value: 6, label: 'Takım üyesi' }
  ],

  // Geri sayım. Saat dilimi Türkiye için +03:00.
  countdown: {
    target: '2027-09-01T10:00:00+03:00',
    label: 'BÜYÜK DALIŞA',
    note: 'Örnek tarih; resmî takvim açıklanınca güncellenecek.'
  },

  // Sponsorlar: yalnızca ad ('Firma') ya da logo ile ({ name: 'Firma', logo: 'img/sponsors/firma.svg' }).
  sponsors: []
};
