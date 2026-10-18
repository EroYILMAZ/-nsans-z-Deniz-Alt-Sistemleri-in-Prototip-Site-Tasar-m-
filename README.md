# Deniz6 web sitesi

Deniz6 otonom su altı aracı takımının tanıtım sitesi. Derleme gerekmez: klasördeki `index.html` dosyasını tarayıcıda açmanız yeterli.

## Klasör yapısı

```
index.html            Sayfa iskeleti
css/tokens.css        Renk, boşluk, köşe ve yazı tipi token'ları (Derin ve Yüzey temaları)
css/bundle.css        Deniz6 tasarım sistemi bileşen stilleri
css/site.css          Açılış sayfasının düzeni
css/auv.css           3B deneyim, teknik çizim ve hareketli efektler
css/sections.css      Bento, film oynatıcı, başa dön ve ses butonları
js/lib/               React 18 (yerel kopya, internet gerektirmez)
js/bundle.js          Deniz6 bileşenleri (window.Deniz6)
js/content.js         Değiştirilecek içerik: takım, e-posta, sosyal medya, sponsorlar, sayaçlar, tarih
js/site.js            Sayfanın bölümleri ve metinleri
js/auv/               D6-AUV modeli ve 3B sahneler
js/fx.js              Site geneli hareketli efektler
js/film-player.js     Tanıtım filmi oynatıcısı (ortam ışığı, bölüm önizlemeleri)
js/cine/              Sinematik bölümler: core (ortak kaydırma ve yardımcılar), window (sinema penceresi), kareler (görev anları + ışık kutusu), ascent (yüzeye çıkış)
css/cine/             Bu bölümlerin stilleri, film greni ve vizör çerçeveleri
img/renders/          Filmden yazısız kareler (1600 ve 800 px, bulanık yer tutucular)
img/ascent/           Yüzeye çıkış kare dizisi (d: masaüstü 1280 px, m: mobil 480×854)
media/                Tanıtım filmi (1080p ve 720p MP4) ve kapak görseli
tools/film/           Tanıtım filmini üreten render aracı (site bunu yüklemez)
img/                  Favicon, takım fotoğrafları (img/team/), sponsor logoları (img/sponsors/)
```

Yazı tipleri (Unbounded, Manrope, JetBrains Mono) Google Fonts'tan yüklenir; internet yoksa sistem yazı tipine düşer.

## Gerçek zamanlı 3B sahne (D6-AUV)

Sitedeki araç, RoboSub ve TEKNOFEST'te derece alan otonom su altı araçlarının ortak mimarisine göre kodla modellenmiş temsilî bir AUV'dir: karbon fiber yan plakalı açık şasi, çift O-ring flanşlı akrilik basınç tüpü, 4 dikey + 4 adet 45° vektörel T200 sınıfı itici, iki batarya tüpü, DVL, stereo ön kamera, alt kamera, hidrofon dizisi, torpido lançeri, işaret bırakıcı ve tutucu kol.

- **Giriş bölümü:** Aracın kendini çizen teknik çizimi (yalnızca SVG + CSS): çizgiler sırayla çizilir, sonar tarama çizgisi geçer, iticiler döner, DVL ışınları ve fener yanıp söner. WebGL kullanmaz.
- **Araç bölümü (kaydırmalı 3B deneyim):** Bölüm ekrana yapışır; arka planda ortam yoktur, yalnızca araç vardır. Ziyaretçi kaydırdıkça 7 sahne oynar: yaklaşma, gövde, itki (pervaneler hızlanır), parçalarına ayrılma, algılama (DVL ışınları), görev (torpido atışı, tutucu kol) ve son duruş. Sağ üstte telemetri, altta tıklanabilir bölüm çubuğu vardır.
- Performans: tek bir WebGL tuvali vardır ve yalnızca bölüm ekrandayken çizer. Post-processing, gölge haritası ve saydamlık (transmission) geçişi yoktur; modelin sabit parçaları birleştirilmiştir (≈130 çizim çağrısı). Kare hızı düşerse çözünürlük kendiliğinden azalır.

Dosyalar:

- `js/auv/auv-model.js` — aracın modeli ve dokuları. Parça adları, patlatma yönleri ve etiket noktaları buradadır.
- `js/auv/auv-scene.js` — sahne, kamera rotası (`CAM`), bölüm metinleri (`CHAPTERS`) ve etiketler (`LABELS`).
- `js/site.js` — giriş bölümündeki teknik çizim (`BLUEPRINT`).
- `css/auv.css` — deneyimin, etiketlerin ve site geneli efektlerin stilleri.
- `js/fx.js` — dalış açılışı, kaydırma ilerleme çizgisi, tıklamada sonar halkası, mıknatıslı butonlar, eğilen kartlar, harf çözme efekti ve kinetik yazı bandı.

Notlar:

- 3B motor Three.js 0.160.0'dır ve `js/lib/three.min.js` olarak sitenin içindedir; internet gerektirmez. Büyük sahne, ziyaretçi bölüme yaklaşınca kurulur ve ekrandan çıkınca durur.
- Tarayıcı WebGL desteklemiyorsa bölüm metinleri düz bir liste olarak görünür. "Hareketi azalt" tercihinde boşta animasyonlar ve efektler kapanır.
- Model temsilîdir. Takımın kendi aracının 3B modeli (GLB/GLTF, ya da CAD'den dışa aktarılmış STL/OBJ) hazır olunca `auv-model.js` yerine konabilir.

## Tanıtım filmi

"Tanıtım filmi" bölümündeki 30 saniyelik film, araba reklamı tarzında aracın yeteneklerini gösterir: karanlıkta fenerlerin yanması, tabanda süzülme, iticilerin yakın çekimi, yana kayma ve yerinde 360° dönüş, renkli kapıdan geçiş (görüntü işleme kutusuyla), ağır çekim torpido atışı ve yüzeye doğru yükseliş.

- Film önceden render edilmiş bir MP4'tür; sitede canlı 3B çizilmez, tarayıcının donanım video çözücüsüyle oynar. Bölüme yaklaşınca dosya yüklenir, ekranın yarısı görününce sessiz oynar, çıkınca durur. Ziyaretçi durdurursa kendiliğinden başlamaz. Dar ekranlarda 720p sürümü kullanılır.
- Alt çubuktaki noktalar filmin bölümlerine atlar (`js/site.js` içindeki `FILM.chapters`).

Filmi yeniden üretmek (ör. takımın gerçek modeli gelince) için:

1. Site klasöründe `python tools/film/server.py tools/film/frames` çalıştırın.
2. Tarayıcıda `http://127.0.0.1:8790/tools/film/film.html` açın; "Önizle" ile istediğiniz saniyeye bakın, "Render" ile 900 kareyi (1920×1080, 30 fps) üretin.
3. Kareleri videoya çevirin:
   - `ffmpeg -framerate 30 -i tools/film/frames/%05d.jpg -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart media/d6-auv-film-1080.mp4`
   - `ffmpeg -i media/d6-auv-film-1080.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 24 -movflags +faststart media/d6-auv-film-720.mp4`
   - Kapak: `ffmpeg -ss 6 -i media/d6-auv-film-1080.mp4 -frames:v 1 -q:v 3 media/d6-auv-film-poster.jpg`

Yazısız kareler için konsolda önce `window.__filmClean = true` yazın (sitedeki `img/renders/` ve `img/ascent/` kareleri böyle üretildi). Çekim listesi, kamera hareketleri ve yazılar `tools/film/film.js` içindeki `SHOTS` ve `TITLES` listelerindedir. Film fiziksel tabanlı bir su altı hattıyla çizilir: kostikler güneş ışığının parçasıdır (gölgelere uyar), su her renk kanalını farklı söndürür (kırmızı ilk kaybolur), ışık huzmeleri ve fener ışınları hacimsel olarak hesaplanır, asılı parçacıklar fener ışığında parlar, kamerada alan derinliği ve hareket bulanıklığı vardır. Bir kare yaklaşık 3–6 saniyede çizilir; tüm film 40–70 dakika sürer.

## Sinematik bölümler

Hepsi filmin yazısız karelerini kullanır, yalnızca ekrandayken çalışır ve "hareketi azalt" tercihinde ya da zayıf cihazlarda (düşük bellek, veri tasarrufu) sade, durağan hâline geçer.

- **Sinema penceresi (#film):** Kaydırdıkça ortadaki küçük lumboz açılır, ekran kararır ve tanıtım filmine geçilir. Filmin renkleri etrafına ortam ışığı olarak yansır; zaman çizelgesindeki bölüm noktalarının üzerine gelince küçük önizleme karesi çıkar.
- **Görev anları (#kareler):** Filmden altı kare genişleyen paneller hâlinde dizilir; kaydırdıkça ya da üzerine gelince sırayla açılır. Kapı ve hedef karelerinde görüntü işleme kutusu kilitlenir. Tıklayınca kare tam ekran ışık kutusunda açılır (← → ile gezinme, ESC ile kapatma). Kareler `js/site.js` içindeki `STILLS` listesindedir.
- **Yüzeye çıkış (#yuzey):** Sayfanın sonunda, kaydırmayla oynayan gerçekçi bir kare dizisi: araç yüzeydeki ışığa doğru yükselir, derinlik sıfıra iner.
- **Yüzey imzası:** Sayfanın en altında, yüzey ışığıyla dolan dev DENİZ6 yazısı.
- **Film greni ve vizör:** Tüm sayfada çok hafif, durağan film greni; sinematik görsellerde kameranın kilitlendiği köşe çerçeveleri. Tarayıcının adres çubuğu rengi (telefonlarda) bölümlere göre derinleşip yüzeyde açılır.

## Diğer bölümler

- **Rakamlarla (bento):** Araç bölümünün altında, farklı boyutlu kutularda küçük animasyonlarla teknik değerler.
- **Su sesi:** Sol altta, tarayıcıda üretilen su altı sesi (uğultu, kabarcık, sonar). Varsayılan olarak kapalıdır, dosya indirmez.
- **Başa dön:** Sağ altta, sayfadaki ilerlemeyi halka olarak gösteren buton.

## İçeriği güncellemek

Neredeyse her şey `js/content.js` içinde:

- **Takım:** `name`, `role`, `unit` (rozet), isteğe bağlı `photo`, `email`, `profile`. Fotoğrafı `img/team/` klasörüne koyup `photo: 'img/team/ad-soyad.jpg'` yazın (kare, en az 256 px).
- **İletişim:** `email` ve `location`.
- **Sosyal medya:** `social` listesindeki `href` alanlarını doldurun; boş olanlar görünmez.
- **Sponsorlar:** yalnızca ad (`'Firma'`) ya da logo ile (`{ name: 'Firma', logo: 'img/sponsors/firma.svg' }`).
- **Geri sayım:** `countdown.target` (Türkiye saati için `+03:00`). Resmî tarih açıklanınca `note` satırını silin.
- **Logo:** `logo: 'img/logo.svg'`; boşsa "Deniz6" yazısı kullanılır.

Bölüm başlıkları, alt sistem kartları ve yol haritası metinleri `js/site.js` içindedir.

## Yayınlama

### GitHub Pages
1. GitHub'da yeni bir depo açın (ör. `deniz6-site`) ve bu klasörün içeriğini köke yükleyin (`index.html` en üstte olmalı).
2. Depoda **Settings → Pages** bölümüne gidin; **Source: Deploy from a branch**, dal `main`, klasör `/ (root)` seçip kaydedin.
3. Birkaç dakika sonra site `https://KULLANICI-ADI.github.io/deniz6-site/` adresinde yayında olur.

### Netlify
1. https://app.netlify.com/drop adresini açın.
2. `deniz6-site` klasörünü sayfaya sürükleyip bırakın. Site hemen bir `*.netlify.app` adresi alır.
3. Sitenin kalıcı olması için ücretsiz bir Netlify hesabıyla giriş yapıp siteyi hesabınıza alın; adını **Site configuration** bölümünden değiştirebilirsiniz. Güncellemek için **Deploys** sekmesine klasörü yeniden sürükleyin.

Her iki serviste de kendi alan adınızı (ör. `deniz6.com.tr`) daha sonra bağlayabilirsiniz.
