# Akçe

Tamamen yerel, offline calisabilen PWA tabanli abonelik ve maliyet takip uygulamasi.

## Dosyalar

- `index.html`: Tek sayfa uygulama arayuzu.
- `style.css`: Mobil oncelikli tema ve bilesen stilleri.
- `app.js`: IndexedDB, analiz, form akislari, grafikler, bildirimler ve import/export mantigi.
- `manifest.json`: PWA manifest ayarlari.
- `sw.js`: Offline cache ve uygulama kabugu service worker dosyasi.
- `data/catalog.json`: Yerel servis katalogu.
- `assets/icons/*`: Uygulama ikonlari.

## Yerelde test

Bir statik sunucu ile ac:

```bash
python3 -m http.server 4173
```

Ardindan `http://localhost:4173` adresine git.

## Ucretsiz yayinlama

Bu proje tamamen statik oldugu icin su servislerle ucretsiz yayinlanabilir:

- Netlify: klasoru surukleyip birak veya Git deposuna bagla.
- Vercel: `Other` veya `Static` proje olarak bagla.
- GitHub Pages: depoyu GitHub'a gonder, `Settings > Pages` altindan ana branch'i sec.

## Telefona ekleme

- Android Chrome: siteyi ac, menuden `Ana ekrana ekle` sec.
- iPhone Safari: siteyi ac, Paylas menusu > `Ana Ekrana Ekle`.
- Ilk acilista service worker cache olustuktan sonra uygulama offline da acilir.
