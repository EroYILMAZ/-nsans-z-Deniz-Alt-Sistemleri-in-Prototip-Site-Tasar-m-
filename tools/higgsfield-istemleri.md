# Açılış bölümü için Higgsfield istemleri

Higgsfield'in sınırsız deneme hakkı Claude Code'da çalışmıyor. Hak yalnızca Claude sohbetinde (claude.ai), Claude Cowork'te ya da ChatGPT'de geçerli.
Bu istemleri claude.ai'de Higgsfield bağlıyken bir sohbete yapıştırın. Her görseli indirip aşağıdaki adla `img/katman/yeni/` klasörüne koyun; siteye yerleştirmeyi Claude Code'da ben yaparım.

Aracın referans görselleri Higgsfield kitaplığınıza yüklendi ("rov-on.png" ve "rov-parca.png"). Sohbette "kitaplığımdaki rov-on.png'yi referans al" demeniz yeterli.

Claude sohbetine yapıştırılacak metin:

> Higgsfield ile sınırsız deneme hakkımı kullanarak aşağıdaki 6 görseli üret. Her birini ayrı üret ve bana indirme bağlantılarını ver.

---

## 1. `sahne.png`: masaüstü arka planı
Model: Nano Banana Pro, 16:9, 2K

> Cinematic ultra-wide underwater photograph inside a deep indoor competition diving pool for underwater robots. Bright god rays streaming down from the rippling water surface at the top, dancing caustic light patterns on the pale tiled pool floor, a distant rectangular orange-and-black striped robotics gate frame standing on the floor slightly right of center, a small buoy target behind it, deep teal-to-navy water haze fading into darkness at the edges, suspended particles, soft bokeh bubbles. The left 45 percent of the frame is open water with nothing in it. No vehicles, no robots, no divers, no people, no text, no logos. Moody, premium, shot on ARRI Alexa, anamorphic, high dynamic range.

## 2. `sahne-dikey.png`: telefon arka planı
Model: Nano Banana Pro, 9:16, 2K

> Cinematic vertical underwater photograph inside a deep indoor competition diving pool for underwater robots. Bright god rays streaming down from the rippling water surface at the top, caustic light patterns on the pale tiled pool floor at the bottom, a distant rectangular orange-and-black striped robotics gate frame standing on the floor in the lower middle, deep teal-to-navy water haze, suspended particles, soft bokeh bubbles, large open water in the middle of the frame. No vehicles, no robots, no divers, no people, no text, no logos. Moody, premium, high dynamic range.

## 3. `rov-on.png`: öndeki ana araç (şeffaf arka plan)
Model: GPT Image 2.5, 3:2, 2K, quality high, background transparent. Referans: rov-on.png

> Photorealistic product render of exactly this underwater ROV from the reference image, keep its design faithfully: open black carbon-fiber side plates with cut-outs, two orange foam buoyancy blocks on top with a small red Turkish flag and the word DENIZ6, clear acrylic electronics tube in the middle, black ducted thrusters, small gripper at the front. Three-quarter front view from slightly above, nose pointing to the right, slightly diving, the vehicle tilted a few degrees. Lit like underwater: cool cyan rim light from behind, soft key light from the top, subtle blue tint on metal, tiny bubbles near thrusters. Isolated on a fully transparent background, no floor, no shadow plane, no text besides the decal.

## 4. `rov-parca.png`: parçalarına ayrılmış araç (şeffaf arka plan)
Model: GPT Image 2.5, 4:3, 2K, quality high, background transparent. Referanslar: rov-parca.png ve rov-on.png

> Photorealistic exploded-view render of exactly this underwater ROV (see references): every part floating apart in mid-water with even gaps — the two orange foam DENIZ6 buoyancy blocks lifted high above, black carbon-fiber side plates pushed out sideways, the clear acrylic electronics tube with its green circuit board slid forward, end caps, battery tube dropping below, six black ducted thrusters drifting outward, screws and small parts suspended. Three-quarter view, nose to the left. Cool cyan underwater rim light, soft top light. Isolated on a fully transparent background, no floor, no shadow plane, no text.

## 5. `rov-uzak.png`: kapıdan gelen araç (şeffaf arka plan)
Model: GPT Image 2.5, 3:2, 2K, quality high, background transparent. Referans: rov-on.png

> Photorealistic render of exactly this underwater ROV from the reference, seen from the front and slightly below as it swims straight toward the camera, front dome camera and two bright white headlights glowing, light beams faint, thrusters spinning with a few small bubbles trailing. Keep its design: black carbon side plates, orange foam blocks on top, clear acrylic tube. Isolated on a fully transparent background, no floor, no text.

## 6. `baliklar.png`: balık sürüsü (şeffaf arka plan)
Model: GPT Image 2.5, 3:2, 2K, quality high, background transparent

> A loose school of about forty small silver sardine-like fish swimming together to the left in a gentle curved stream, photorealistic, cool cyan underwater lighting with silver glints, some fish slightly out of focus. Isolated on a fully transparent background, nothing else.

## İsteğe bağlı 7. `sahne-dongu.mp4`: hareketli arka plan
Model: Seedance 2.5 (sınırsız hakka dahilse), 16:9, 1080p, 8 saniye, sessiz. Başlangıç karesi: 1. görsel (sahne.png)

> Locked-off static camera, no camera movement. The underwater pool scene gently comes alive: god rays slowly shimmer and sway, caustic light patterns ripple across the pool floor, suspended particles drift slowly, a few small bubbles rise. Nothing else moves, no vehicles or people appear. Seamless, calm, loopable.
