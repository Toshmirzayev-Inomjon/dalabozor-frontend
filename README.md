# DalaBozor Web

Loyihaning asosiy foydalanuvchi interfeysi. Next.js 15, React 18, TypeScript va
Tailwind bilan yozilgan responsive sayt; desktop va mobil brauzerda ishlaydi.

## Ishga tushirish

Avval backendni `8099` portda ishga tushiring, keyin:

```bash
cd web
npm install
npm run dev
```

Sayt: `http://localhost:3059`

Default holatda browser `/api/v1` ga so‘rov yuboradi, `next.config.mjs` esa uni
`BACKEND_ORIGIN` (default `http://127.0.0.1:8099`) ga proxy qiladi. Zarurat bo‘lsa:

```bash
BACKEND_ORIGIN=http://127.0.0.1:8099 npm run dev
```

`NEXT_PUBLIC_API_BASE` faqat API boshqa public origin’da bo‘lsa kerak.

## Yandex Maps

Yig‘uvchi kabinetidagi bugungi marshrut xaritasi Yandex JavaScript API v3
orqali ishlaydi. `web/.env.example` faylini nusxalab, local kalitni gitga
kirmaydigan `.env.local` ichiga yozing:

```env
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=yandex_javascript_api_kaliti
```

Bu brauzer uchun mo‘ljallangan public kalit: sayt bundle’i va Network oynasida
ko‘rinishi tabiiy. Uni Yandex Developer Dashboard’da **HTTP Referer** bilan
himoyalang; development uchun `localhost`, production uchun esa saytning aniq
domenini (masalan, `dalabozor.uz`) ruxsat eting. Domenni Yandex kabineti talab
qilgan formatda, portsiz va pathsiz kiriting. Alohida dev va production
kalitlari tavsiya qilinadi.

Dehqon `Sozlamalar` bo‘limidagi tugmani o‘zi bosgandagina brauzer GPS ruxsati
so‘raladi. Koordinata uning profilida saqlanib, faqat o‘sha kun marshruti
biriktirilgan yig‘uvchiga chiqadi. Yandex Geocoder natijalari bazaga yozilmaydi.
Kalit yoki xarita tarmog‘i ishlamasa, matnli marshrut va qabul jarayoni ishlashda
davom etadi.

> Muhim: yopiq logistika/dispatch kabineti Yandex Maps bepul foydalanish
> shartlariga mos kelmasligi mumkin. Productionga chiqishdan oldin tijoriy
> litsenziya va tarifni Yandex bilan tekshiring.

## Asosiy routelar

- `/` — marketing landing.
- `/kirish` — telefon va OTP orqali kirish.
- `/rol` — dehqon, restoran yoki yig‘uvchi rolini tanlash/qo‘shish.
- `/kabinet` — faol rolga mos yagona dashboard.

Telegram Mini App route’i website-only fokus sabab
`../_deferred/telegram-mini-app/` ichiga ko‘chirilgan.

## Kabinetlar

- Dehqon: narxlar, yangi taklif, e’lonlar va to‘lovlar.
- Restoran: katalog/savat, buyurtma timeline’i, qayta buyurtma, PDF faktura va to‘lov.
- Yig‘uvchi: marshrut, progress va fakt qabul.
- Admin: dashboard, narx koridori, review, marshrutlar va avtomatik operatsiyalar.
- DalaYordamchi: joriy rol va sahifani biladigan yozma AI suhbat, tezkor
  savollar va xavfsiz navigatsiya.
- Rol boshqaruvi: dehqon/restoran rolini qo‘shish, kabinetni almashtirish va
  xavfsiz tasdiq bilan rolni olib tashlash. Yig‘uvchi operatsion rolini
  administrator biriktiradi.

AI tavsiya qilgan navigatsiya yoki rol amali foydalanuvchi tasdiqlamaguncha
bajarilmaydi. Chat tarixi brauzerda har bir akkaunt uchun alohida saqlanadi va
yordamchi oynasidan tozalanadi.

## AI xizmatlarini yoqish

Groq kaliti saytning `NEXT_PUBLIC_*` o‘zgaruvchilariga yozilmaydi. Uni faqat
backend `.env` fayliga, yangi va rotatsiya qilingan kalit sifatida kiriting:

```env
GROQ_API_KEY=yangi_groq_kaliti
```

Kalitlar bo‘lmasa sayt ishlashda davom etadi, AI oynasi esa xizmat hali
sozlanmaganini ko‘rsatadi.

## Tekshiruv

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Dev OTP kodi backend `.env` faylidagi `OTP_DEV_CODE` orqali belgilanadi
(standart development qiymati `1111`). Production’da `ENV=prod` va real SMS
adapteri ishlatilishi kerak.
