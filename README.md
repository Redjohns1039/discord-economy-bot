# Discord Economy Bot (Simple)

Bu proje, UnbelievaBoat benzeri basit bir ekonomi botudur.
Her kullanicinin tek bir bakiyesi vardir.
Yetkili kisiler kullaniciya para ekleyebilir, cikarabilir, sifirlayabilir.
Kullanicilar da kendi aralarinda para gonderebilir.

## Ozellikler

- User secerek hedef kullanici belirleme
- Tek bakiye sistemi
- Para ekleme / cikarma / setleme (yetkili komutlari)
- Kendi bakiyeni gorme
- Baska kullaniciya para gonderme
- Butonlu sayfali leaderboard
- JSON tabanli kalici veri saklama

## Gereksinimler

- Windows + PowerShell
- Node.js LTS (20+ onerilir)
- Discord uygulama/bot token bilgileri

## 1) Node.js Kurulumu (Eger yuklu degilse)

PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
```

Terminali kapatip tekrar ac, sonra kontrol et:

```powershell
node -v
npm -v
```

## 2) Discord Developer Portal Ayarlari

1. New Application olustur.
2. Bot sekmesinden Add Bot yap.
3. Token al.
4. Privileged Gateway Intents:
  - Server Members Intent: Acik olmasi onerilir.
5. OAuth2 URL Generator:
   - Scope: `bot`, `applications.commands`
   - Permissions (minimum):
     - View Channels
     - Send Messages
     - Read Message History

## 3) Proje Kurulumu

Proje klasorunde:

```powershell
npm install
```

`.env` dosyasi olustur (koku dizinde):

```env
DISCORD_TOKEN=bot_token_buraya
CLIENT_ID=application_id_buraya
GUILD_ID=test_sunucu_id_buraya
ECONOMY_ADMIN_ROLE_ID=yetkili_rol_id_buraya
ECONOMY_DISTRIBUTION_CHANNEL_ID=dagitim_kanali_id_buraya
```

Not:
- `GUILD_ID` yazarsan komutlar aninda test sunucusuna yuklenir.
- `GUILD_ID` bos olursa global yuklenir ve gec yayilabilir.

## 4) Calistirma

Gelistirme modu:

```powershell
npm run dev
```

Normal calistirma:

```powershell
npm start
```

## Komutlar

- `/balance [user]`
  - Kendi bakiyeni veya secilen kullanicinin bakiyesini gosterir.
- `/givemoney amount <user>`
  - Baska bir kullaniciya para gonderir.
- `/leaderboard [limit]`
  - Butonlu sayfalarla tum kullanicilarin bakiye siralamasini gosterir.
  - `limit` sayfa basina kac kisi olacagini belirler (3-15).
- `/addmoney amount <user>`
  - Yetkili komutu. Kullaniciya para ekler.
- `/removemoney amount <user>`
  - Yetkili komutu. Kullanicidan para duser.
- `/setmoney amount <user>`
  - Yetkili komutu. Kullanicinin bakiyesini verilen miktara ayarlar.
- `/splitmoney amount [message_id]`
  - Yetkili komutu. Sadece dagitim kanalinda calisir.
  - Kaynak mesajdaki @ ile baslayan satirlardan kullanicilari bulur.
  - Toplam parayi listedeki kisilere esit miktarda dagitir.
  - `message_id` bossa kanaldaki son liste mesaji kullanilir.
- `/resetallmoney onay:true kod:SIFIRLA`
  - Yetkili komutu. Sunucudaki tum kullanicilarin bakiyesini sifirlar.
  - Guvenlik icin ikinci onay olarak `kod` alanina `SIFIRLA` yazilmasi gerekir.
- `/help`
  - Komutlari ve yetki dagilimini gosterir. (Yetkili)

## Veri Nerede Tutuluyor?

- Veri dosyasi: `data/economy.json`
- Her sunucu (guild) kendi kullanici ekonomisine ayridir.

## Yetki Modeli

Herkesin kullanabildigi komutlar:

- `balance`
- `givemoney`
- `leaderboard`

Asagidaki komutlar sadece `.env` icindeki `ECONOMY_ADMIN_ROLE_ID` rolune aciktir:

- `addmoney`
- `removemoney`
- `setmoney`
- `splitmoney`
- `resetallmoney`
- `help`

## Hata Durumlari

- `npm` bulunamiyor:
  - Node.js kurulu degil veya PATH'e eklenmemis.
- Kullanici bulunamiyor:
  - Komutta `user` secenegiyle kullaniciyi etiketleyerek sec.

## Replit Ucretsiz Kurulum (Deneme)

Bu yontem tam 7/24 garanti vermez, ama botun daha uzun sure aktif kalmasina yardim eder.

### 1) Replit'e Projeyi Yukle

1. Replit'te yeni bir `Node.js` Repl ac.
2. Bu projeyi import et (GitHub import veya dosya yukleme).
3. Shell acip bagimliliklari kur:

```bash
npm install
```

### 2) Secrets (Environment Variables)

Replit `Secrets` bolumune su degiskenleri ekle:

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID` (test sunucusu icin onerilir)
- `ECONOMY_ADMIN_ROLE_ID`
- `ECONOMY_DISTRIBUTION_CHANNEL_ID`

Not: `PORT` degiskenini Replit otomatik verir. Kod bu porta gore HTTP endpoint acar.

### 3) Calistirma Komutu

Run komutu su olsun:

```bash
npm start
```

Uygulama acildiginda `/health` endpoint'i cevap verir.

### 4) UptimeRobot ile Ping

1. Replit'in verdigi uygulama URL'sini al.
2. Sonuna `/health` ekle. Ornek:
   - `https://senin-repl-adresin/health`
3. UptimeRobot'ta `HTTP(s)` monitor olustur.
4. Interval'i `5 minutes` yap.

Bu ping, repl'in uykuya gecmesini azaltir ama ucretsiz planda kesin garanti degildir.

### 5) Test

1. Tarayicida `/health` adresini ac ve JSON `status: ok` dondugunu dogrula.
2. Discord'da `/balance` gibi bir komut calistir.
3. Bir sure sonra tekrar komut atip botun aktif kalma davranisini kontrol et.
