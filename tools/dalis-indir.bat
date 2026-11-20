@echo off
rem Deniz6 - dalis filmini media\dalis, tanitim filmini media\film klasorune indirir.
rem Sonra js\dive-hero.js icinde LOCAL = true ve js\site.js icinde FILM_LOCAL = true yapin.
cd /d "%~dp0.."
if not exist media\dalis mkdir media\dalis
curl -fL -o "media\dalis\d6-dalis-01.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/4351f746-23f2-4e21-8921-21727ccdf337.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-01-m.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/4dbe202e-f077-42a8-9dd5-462a49ea2025.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-01.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/c8af4bcb-321a-4146-bb0e-a82ce1244669.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-01-m.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/6b2ab504-774d-48ab-afcb-b4b22002c9a2.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-02.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/4bc3ae6d-1d8d-4536-bcf2-87841d1ded9d.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-02-m.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/b11491e2-1a79-4f17-9cde-83c0969b9415.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-02.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/5d1c6ce0-bd95-4970-8c8a-ddd80c4a055e.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-02-m.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/66a720ab-1a6b-42f3-ba6e-be736930bc4b.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-03.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/0c22da4e-739f-4747-bbae-81b2390fe3e0.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-03-m.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/f62bc977-27c7-40ac-9818-91520237299d.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-03.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/eb91cfe5-d078-4d66-bb90-200986b26833.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-03-m.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/aaf9438f-2543-43d2-a9ed-de60b4d6c276.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-04.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/ef3e700e-fb26-4316-9fc9-6b21504ca909.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-04-m.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/99da69b7-3785-444b-b83f-9d556c62f040.mp4" || goto hata
curl -fL -o "media\dalis\d6-dalis-04.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/1606fbde-f29d-4f80-8d26-3602804c8818.jpg" || goto hata
curl -fL -o "media\dalis\d6-dalis-04-m.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/208af060-7127-4458-bfb3-ebad97d64ba1.jpg" || goto hata
if not exist media\film mkdir media\film
curl -fL -o "media\film\d6-rov-film-720.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/6b7fe4e1-4939-4f4a-b215-2e952506beae.mp4" || goto hata
curl -fL -o "media\film\d6-rov-film-540.mp4" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/d657493a-c550-4b74-8e91-5d80c9898e46.mp4" || goto hata
curl -fL -o "media\film\d6-rov-film-poster.jpg" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/ee98faf6-db64-4b82-ab01-7ff82cd7c65c.jpg" || goto hata
curl -fL -o "media\film\d6-rov-ambient.webp" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/1654dda9-8e6a-4a44-b915-9ac1e8f1a53c.webp" || goto hata
curl -fL -o "media\film\d6-rov-chapters.webp" "https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/3b436e29-e996-4500-844a-7e718a0eb831.webp" || goto hata
echo.
echo Tamam: dosyalar media\dalis ve media\film klasorlerinde.
pause
exit /b 0
:hata
echo Indirme basarisiz oldu. Internet baglantinizi kontrol edip yeniden deneyin.
pause
exit /b 1
