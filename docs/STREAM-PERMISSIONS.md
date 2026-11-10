# Что станции пишут о своих потоках

Отчёт робота `scripts/permission-scan.mjs` от 2026-11-01.
Проверено станций: 3000, их сайтов: 1604.

| Итог | Сайтов |
|---|---|
| ✅ Прямо разрешают сторонние приложения/плееры | 10 |
| ❌ Прямо запрещают (кандидаты в data/stream-policy.json) | 8 |
| 🟡 Сами дают адрес потока «для вашего плеера» | 134 |
| ❓ Ничего не написано | 1111 |
| — Сайт не открылся / закрыт для роботов | 341 |

> Робот ищет фразы автоматически и может ошибаться — перед решением открывайте страницу по ссылке.
> Запреты в приложении не применяются сами: проверяем и переносим в `data/stream-policy.json`.

## ❌ Запрещают
| Сайт | Станции | Цитата (страница) |
|---|---|---|
| somafm.com | SomaFM Groove Salad (128k MP3), SomaFM Secret Agent (128k MP3), SomaFM Indie Pop Rocks! (128k AAC), SomaFM Underground 80s (128k MP3), SomaFM Heavyweight Reggae (256k MP3) и ещё 23 | «We can't grant permission for third-party SomaFM clients or applications, even noncommercial ones.» ([страница](https://somafm.com/contact/tos.html)) |
| bigrradio.com | Big R Radio - 80s Metal FM | «Please don't record, rebroadcast, re-stream, play our streams in a business as background music for customers, or put our streams in another app, site or player without our written permission.» ([страница](https://www.bigrradio.com/terms/)) |
| aljazeera.com | Al Jazeera - English | «You may not authorise, encourage, permit or assist in any way any third party to copy, reproduce, download, post, store, distribute, transmit, broadcast, commercially exploit or modify in any way, or otherwise infringe any intellectual property rights (or any equivalent or similar rights) in any mat» ([страница](https://www.aljazeera.com/terms-and-conditions/)) |
| 2000fm.net | 2000 FM - RnB & Hip-Hop, 2000 FM - Country | «Please don't record, rebroadcast, re-stream, play our streams in a business as background music for customers, or put our streams in another app, site or player without our written permission.» ([страница](http://www.2000fm.net/terms.html)) |
| sbs.com.au | SBS PopAsia, SBS Chill | «engage in any activity which could mislead or deceive a person into believing that the Material is from a source other than the Services, including embedding, deep-linking or framing the Material without SBS’s consent.» ([страница](https://www.sbs.com.au/aboutus/terms-and-conditions/)) |
| mixcloud.com | Dutch Delite Drum and Bass | «participate in the Mixcloud social features and communicate with other members of the Mixcloud community (though you may not embed or otherwise exploit Mixcloud widgets for commercial gain, including without limitation selling advertising on your website or otherwise monetising any element of your w» ([страница](https://www.mixcloud.com/terms/)) |
| streamingsoundtracks.com | StreamingSoundtracks.com | «You may not rebroadcast, rip, syndicate, or redistribute our audio streams without explicit written permission.» ([страница](https://streamingsoundtracks.com/tos.php)) |
| nowmusic.com | Now 70s | «The inclusion of any hyperlinks to Third Party Websites on this Website does not mean that We approve or endorse those Third Party Websites.» ([страница](https://nowmusic.com/policies/terms-of-service)) |

## ✅ Разрешают
| Сайт | Станции | Цитата (страница) |
|---|---|---|
| radiokantipur.com | Kantipur FM | «5.4 Third Party Advertisements : We may use third party companies to serve advertisements on the Services.» ([страница](https://radiokantipur.com/pages/privacy-policy)) |
| r-a-d.io | R/a/dio | «To play the stream in your media player, you can use any of the following links:» ([страница](http://r-a-d.io/help)) |
| jointil.com | #joint radio Blues Rock, #joint radio Beat Trance | «You can ask Amazon Alexa or Apple Siri to play the station name, and it will start the stream.» ([страница](https://www.jointil.com/radio/frequently-asked-questions-faq-joint-radio/)) |
| houstonpublicmedia.org | Houston Public Media News 88.7 | «If you have an Apple Music subscription , you can play the HPM News stream by saying "Hey Siri play NPR News Houston News Eighty Eight Seven." This command works on iOS devices and on the HomePod.» ([страница](https://www.houstonpublicmedia.org/ways-to-listen/)) |
| shoutcast.flashradio.info | Jazz Lounge | «The player can use the laut.fm stream» ([страница](https://radioplayer.luna-universe.com/lautfm-radio-player-plugin)) |
| j1fm.tokyo | J1 HITS | «If you prefer to use your own MP3 player, you are welcome to do so.» ([страница](https://www.j1fm.tokyo/listen/)) |
| sexsoundradio.com | Sex Sound Radio | «You may not record, redistribute or reuse any part of the stream without permission.» ([страница](https://sexsoundradio.com/terms)) |
| wbgo.org | WBGO Jazz 88.3 FM | «You can pause the live stream to have a conversation and pick up right where you left off!» ([страница](https://www.wbgo.org/top-stories/2026-07-04/the-ultimate-jazz-companion-discover-the-features-of-the-new-wbgo-app)) |
| ancientfm.com | Ancient FM | «You can support us by telling your friends about us, posting a link on your blog or twitter feed, or sending us an encouraging email; it helps us a lot!» ([страница](https://www.ancientfm.com/)) |
| axr.co | AXR Hong Kong | «When you first use our App, you will be asked if we can use your location in order to offer you services and information that is relevant to your area.» ([страница](https://www.axr.co/terms-policies-etc/privacy-policy/)) |

## 🟡 Дают адрес потока для плееров
| Сайт | Станции | Цитата (страница) |
|---|---|---|
| 101smoothjazz.com | 101 SMOOTH JAZZ, 101 SMOOTH JAZZ MELLOW MIX | «101 Smooth Jazz Internet Radio» ([страница](http://101smoothjazz.com/)) |
| swr3.de | SWR3, SWR3 - 96K AAC | «Ihr wollt SWR3 direkt über einen externen Player oder ein Internetradio abrufen? Hier findet ihr alle Infos» ([страница](https://www.swr3.de/musik/webradio/index.html)) |
| dancewave.online | Dance Wave!, Dance Wave Retro!, Dance Wave! | «If your player supports the OGG/Vorbis format, it is recommended to listen to this» ([страница](https://dancewave.online/)) |
| radiofrance.fr | France Inter, France Info, FIP (hifi + metadata), France Inter, FIP (no pub) и ещё 5 | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| heart.co.uk | Heart 80s, Heart London 106.2 [MP3], Heart 90s, Heart Dance, Heart 70s и ещё 3 | «Download 'Stay (If You Wanna Dance)' on iTunes» ([страница](https://www.heart.co.uk/terms-conditions/)) |
| einslive.de | 1LIVE, 1LIVE | «Von Kiew auf die Tomorrowland Mainstage: Miss Monique muss man einfach auf dem Schirm haben, wenn es um Progressive House und Melodic Techno geht» ([страница](https://www1.wdr.de/radio/1live/musik/1live-streams/index.html)) |
| capitalfm.com |  CAPITAL - The UK's No.1 Hit Music Station, Capital FM London, Capital XTRA | «Download 'Think About Us' on iTunes» ([страница](https://www.capitalfm.com/how-to-listen/all-the-ways-you-can-listen-to-capital-chill/)) |
| radyo7.com | Radyo 7 | «(Winamp)» ([страница](https://www.radyo7.com/)) |
| lbc.co.uk | LBC UK, LBC Radio, LBC London (National stream) | «How To Listen to LBC On Sonos» ([страница](https://www.lbc.co.uk/article/getting-started-DWyqT6_2/)) |
| esradio.libertaddigital.com | esRadio, EsRadio Principal, EsRadio (AAC HQ), esRadio Madrid | «iTunes» ([страница](https://esradio.libertaddigital.com/)) |
| classicfm.com | Classic FM UK, Classic FM HD, Classic FM Calm, Classic FM, Classic FM Movies и ещё 3 | «5 in C minor Opus 67 (3/4)' on iTunes» ([страница](https://www.classicfm.com/faq/)) |
| europaplus.ru | Europa Plus, Европа Плюс | «Слушай любимое радио где угодно и когда угодно с новым официальным приложением Европы Плюс! Никаких регистраций, подписок и рекламы — просто скачивай и включай плеер в один клик» ([страница](https://europaplus.ru/app)) |
| franceculture.fr | France Culture | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| fip.fr | FIP, FIP Jazz, FIP Reggae, FIP Musiques du monde, FIP Groove и ещё 2 | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| radiodimensionemix.torontocast.stream |  # RdMix Classic Rock 70s 80s 90s, # 70s 80s 90s RdMix Network, # RdMix DJSET 70s 80s 90s, # RdMix Italo Disco 80s | «Categories: Info Tags: android &#183; app &#183; apple &#183; internetradio &#183; ipad &#183; iphone &#183; onlineradio &#183; radioapp &#183; smartphone &#183; tablet» ([страница](https://radiodimensionemix.torontocast.stream/tag/app/)) |
| 538.nl | Radio 538, 538 Radio, 538 TOP 50 , 538 Non-Stop, 538 Dance Departmetn | «538 Tomorrowland One World Radio» ([страница](https://www.538.nl/)) |
| ambientsleepingpill.com | Ambient Sleeping Pill, Ambient Sleeping Pill \| 128 kbps mp3 | «Ambient Sleeping Pill - Internet Radio for Sleep, Meditation & Relaxation» ([страница](https://ambientsleepingpill.com/stream-links)) |
| oldie-antenne.de | OLDIE ANTENNE | «80er 90er OLDIE ANTENNE Internetradio \| 80er 90er OLDIE ANTENNE» ([страница](https://www.oldie-antenne.de/programm/so-hoert-ihr-uns/internet-radio)) |
| fm4.orf.at | FM4 \| ORF \| HQ, FM4 \| ORF | «Du willst Radio FM4 über dein Badezimmerradio, im Auto, mit Internetradio oder einem externen Player empfangen? Hier findest du alle Frequenzen und Streams, die zu Radio FM4 führen» ([страница](https://fm4.orf.at/story/frequenzen-streams100)) |
| mygoldmusic.co.uk | Gold | «If you live outside of these areas talk to your retailer about a wi-fi or internet radio device instead of a DAB radio» ([страница](https://www.goldradio.com/faq/)) |
| br.de | BR24, Bayern 1 Oberbayern, Bayern 2, Bayern 1 Franken, Bayern 1 Schwaben и ещё 3 | «Webradio im eigenen Player starten:» ([страница](https://www.br.de/radio/br24/service/sendefrequenzen/index.html)) |
| bossajazzbrasil.com | Bossa Jazz Brasil | «I live between Switzerland and Panama and in both places, I always have it on SONOS, throughout the house» ([страница](https://bossajazzbrasil.com/)) |
| franceinter.fr | France Inter, France Inter, France Inter, France Inter | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| radioshanson.ru | Шансон без цензуры, Романтический шансон | «png","Ios","ios","https://itunes» ([страница](https://radioshanson.ru/)) |
| dfm.ru | DFM Дискач 90-х, DFM RUSSIAN DANCE, DFM | «SWANKY TUNES / SHOWLAND» ([страница](https://dfm.ru/)) |
| ffh.de | Hit Radio FFH, FFH Hit Radio. AAC 128 kbps | «Smartspeaker: Alexa+, Google, Sonos» ([страница](https://www.ffh.de/musik/webradio/42-ffh-leider-geil.html)) |
| smoothradio.com | Smooth Radio, Smooth Chill, Smooth Country, Smooth 80s | «Download 'Where Do Broken Hearts Go' on iTunes» ([страница](https://www.smoothradio.com/)) |
| z100.iheart.com | Z100 - New York's #1 Hit Music Station WHTZ, Z100 - WHTZ-FM 100.3 New York, Z100 WHTZ FM 100.3 New York | «Sonos» ([страница](https://z100.iheart.com/apps/)) |
| radioclassique.fr | Radio Classique | «sur Itunes» ([страница](https://www.radioclassique.fr/comment-ecouter-radio-classique-frequence-appli/)) |
| dorognoe.ru | Дорожное радио, дорожное радио (Dorognoe Radio) | «Удобный минималистичный интерфейс, запуск плеера в один клик, стабильный звук и работа в фоновом режиме – приложение создано для комфортного прослушивания в любом ритме жизни» ([страница](https://dorognoe.ru/radiostation/mobile-app)) |
| hellorayo.co.uk |  KISSTORY: Non-Stop Old Skool & Anthems, Magic Radio UK, PLANET ROCK: Where Rock Lives, KISS - The Best Vibes & Energy, KISSTORY R&B: The Hottest R&B tracks from KISSTORY и ещё 7 | «com/559859956","is_featured":false,"showId":18586,"title":"KISS Dance at Tomorrowland","description":"Mixes and highlights direct from one of the most iconic dance music festivals in the world» ([страница](https://www.hellorayo.co.uk/kisstory)) |
| deutschlandfunknova.de | Deutschlandfunk Nova \| DLF \| AAC 192k, Deutschlandfunk Nova \| DLF \| MP3 128k | «spotify itunes soundcloud amazon deezer podcast» ([страница](https://www.deutschlandfunknova.de/info/empfang)) |
| skyradio.nl | Sky Radio, Sky Radio Christmas, Sky Radio 101 FM, Sky Radio 80's Hits, Sky Radio Hits | «Tik op iTunes & App Store» ([страница](https://www.skyradio.nl/online-radio/app)) |
| kissfm.ro | Kiss Fm, Kiss Fm Ro | «Ascultă în WinAmp» ([страница](https://www.kissfm.ro/)) |
| rusradio.ru | Русское Радио, Высоцкий | «webp\",\"828\":\"/b/d/XS_d975tAlMTaNZKMjesWp5sKuUPUw0CdoKmPd7GV5nvNwe0Y21o10ROCTMBoxQZhTpBpL_7WaXQC8Omvy2GX15bEG0PwNABBUM=Ll_zxNPR4KyK5xT5xVLCrA» ([страница](https://rusradio.ru/)) |
| asiadreamradio.torontocast.stream | Jazz Sakura (asia dream radio) | «\| どうぞごゆっくりお楽しみください \| asia DREAM radio plays more current J-Pop Top Forty tracks than any other J-Pop internet radio station \| Stations also available on Apple Music, TuneIn, radio» ([страница](https://asiadreamradio.torontocast.stream/stations/en/index.html)) |
| music.yojosuknam.com | yojosuknam Radio | «다른 앱(VLC, 라디오 앱, 스마트 스피커 등)에서 들으려면 이 주소를 넣으세요» ([страница](https://music.yojosuknam.com/radio)) |
| jawharafm.net | Jawhara FM | «Ecoute la radio sur Windows Media Player Ecoute la radio sur Itunes» ([страница](https://www.jawharafm.net/ar/webradio/webradio2/216)) |
| radiobollyfm.in | Radio BollyFm | «Bollywood Radio: India’s Live 24×7 Bollywood Internet Radio, This is a tribute to all Hindi music singers, lyrics writers, music composers who contributed and laid foundation of Bollywood music and made it popular» ([страница](https://www.radiobollyfm.in/)) |
| capitaldance.com |  CAPITAL DANCE: The UK's Official Dance Station, Capital Dance | «Download 'Danger Danger' on iTunes» ([страница](https://www.capitaldance.com/)) |
| madein80.fr | Made in 80 | «WINAMP» ([страница](https://madein80.fr/la-radio-made-in-80/)) |
| radiox.co.uk | Radio X, Radio X Classic Rock, Radio X London | «Download 'Disco 2000' on iTunes» ([страница](https://www.radiox.co.uk/)) |
| francemusique.fr | France Musique, France Musique, France Musique La Baroque, France Musique \| Classique Easy | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| ambientmodern.com | Ambient Modern | «an internet radio stream featuring modern organic textures» ([страница](https://ambientmodern.com/stream-links)) |
| radiobob.de | RADIO BOB! Classic Rock, RADIO BOB! BOBs Alternative Rock, RADIO BOB! Livestream National, Radio BOB - Nu Metal (mp3 192), RADIO BOB! BOBs Best of Rock и ещё 5 | «im iTunes App Store» ([страница](https://www.radiobob.de/radiobob/mybob-app)) |
| ukhozifm.co.za | Ukhozi FM S.A | «VIA ITUNES» ([страница](https://www.ukhozifm.co.za/ukhozifm/frequently-asked-questions/)) |
| radio886.at | radio 88.6, 88.6 Hard Rock, 88.6 Classic Rock | «Windows Media Player» ([страница](https://radio886.at/Backstage/Empfang/Webstreams?page=Webstreams&content=headerpreview)) |
| absolutradio.de | Absolut Relax, Absolut Top 2000ER, Absolut Relax | «Amazon Echo, Sonos oder BOSE Sound Systeme, Smart TVs, Apple TV, Google Chromecast oder Amazon Fire TV – mit der Radioplayer App könnt ihr uns über all diese Geräte (und noch vie» ([страница](https://absolutradio.de/empfang)) |
| oldiesinternetradio.com | Oldies Internet Radio - Online - www.oldiesinternetradio.com - Grupo Digital Retroland - Monterrey, Nuevo León | «Oldies Internet Radio» ([страница](https://oldiesinternetradio.com/)) |
| live365.com | Hard Rock Halloween | «Hard Rock Halloween - Free Internet Radio - Live365» ([страница](https://live365.com/station/Hard-Rock-Halloween-a10373)) |
| radioparty.pl | Radio Party - Kanał Główny, Radioparty.pl Dj Mixes Party, Radioparty.pl Energy2000, Radioparty.pl Vocal Trance, Radioparty.pl и ещё 1 | «Winamp 128kbps» ([страница](https://radioparty.pl/ramowka/glowny)) |
| hr-inforadio.de | HR Info, HR Info | «Abgesehen vom Livestream auf der Website können Sie hr INFO auch mit einem externen Player, beispielsweise dem VLC-Player, abspielen» ([страница](https://www.hr-inforadio.de/livestream/index.html)) |
| pakfilmi.com | Radio Pak Filmi | «Winamp or I-Tunes» ([страница](https://www.pakfilmi.com/)) |
| goodnews.org.tw | 佳音經典音樂網, 佳音電台 | «安裝 VLC Player 軟體» ([страница](http://www.goodnews.org.tw/faqs.php)) |
| meinkinderradio.at | Radino - Mein Kinderradio Wien 103,2 | «Kennt Dein Internetradio unsere Adresse schon?» ([страница](https://www.meinkinderradio.at/empfang/)) |
| lan.fm | Club Hits 2000s | «Свой плеер M3U MP3 XSPF» ([страница](https://www.lan.fm/)) |
| radiopilatus.ch | Radio Pilatus | «Um Radio Pilatus übers Internet zu hören, nutzt du die Livestream-URLs für dein Internetradio» ([страница](https://www.radiopilatus.ch/ueber-uns/radio-pilatus-dab-und-digital-weltweit-empfangen-140227836)) |
| discovertrance.com | DiscoverTranceRadio (MP3 HQ stereo 192kBit/s) | «Winamp (firewall safe) uk» ([страница](https://www.discovertrance.com/tunein.aspx)) |
| magicfm.ro | Magic FM Romania, Magic Party Mix, Magic Fm, Magic FM 90s Hits, Magic FM Love и ещё 1 | «Ascultă în WinAmp» ([страница](https://www.magicfm.ro/)) |
| hirschmilch.de | Hirschmilch Radio Prog-House, Hirschmilch Radio Electronic | «24/7 Chillout Electronic Hypnotic Organic-House Prog-House Progressive Psytrance Techno Internet Radio Streams » Hirschmilch» ([страница](https://hirschmilch.de/homepage)) |
| sanjaydeshpande.com | Sandesh Radio | «Sandesh Radio is a pioneer internet radio exclusively dedicated to pure forms of Indian Classical music like instrumental and vocal music, basically focusing on unexplored talents across the globe» ([страница](http://www.sanjaydeshpande.com/sandeshradio.htm)) |
| radi.fm | Radi.fm 中文古典音乐, Radi.fm 中文古典音乐 | «用VLC Media Player» ([страница](https://radi.fm/ZhongwenGudianYinyue/)) |
| britishcomedyradio.org | BritCom 1 - British Comedy Radio (Pumpkin FM OTRN), BritCom 3 - British Comedy Radio (Pumpkin FM OTRN), BritCom 2 - British Comedy Radio (Pumpkin FM OTRN) | «We recommend Winamp for Windows desktop PC&#8217;s» ([страница](https://britishcomedyradio.org/how-to-tune-in/)) |
| mouv.fr | Mouv' | «Du contrepoint sacré de Cererols à la poésie intime de Dowland, Clément Rochefort réunit onze jalons emblématiques du répertoire baroque» ([страница](https://www.radiofrance.fr/ecouter-musique/classique)) |
| rtbf.be | RTBF La Première, RTBF Classic 21, Classic21, Tipik | «follow\"}],[\"$\",\"meta\",\"4\",{\"name\":\"verify-v1\",\"content\":\"ElLCgmAk3WnVju9JjouVvTCR41cgLBDl92yuPIQ1KTI=\"}],[\"$\",\"meta\",\"5\",{\"name\":\"apple-itunes-app\",\"content\":\"app-id=412453498, app-argument=https://www» ([страница](https://www.rtbf.be/lapremiere)) |
| absolutechillout.com | Absolute Chillout | «Absolute Chillout Internet Radio» ([страница](http://www.absolutechillout.com/)) |
| beautifulmusicstation.blogspot.com | BEAUTIFUL Instrumentals | «If you have an Internet radio, radio app or similar device add our code» ([страница](https://beautifulmusicstation.blogspot.com/)) |
| beachfm.co.jp | Shonan Beach FM 78.9 湘南ビーチ, Shonan Beach FM 78.9 | «サイマルラジオを視聴するためには、Windows Media Playerが必要です。» ([страница](https://www.beachfm.co.jp/about/help/)) |
| berliner-rundfunk.de | Berliner Rundfunk 91.4 | «Unseren Livestream empangen Sie zum Beispiel mit dem kostenlosen Programm VideoLan VLC media player» ([страница](https://www.berliner-rundfunk.de/programm/empfang)) |
| radiobollerwagen.de | Radio Bollerwagen, Radio Bollerwagen | «URLs FÜR EURE EIGENEN PLAYER» ([страница](https://radiobollerwagen.de/)) |
| radio-ethiopia.com |  Bisrat FM 101.1 Addis Ababa · 101.1 FM | «Mirt Internet Radio» ([страница](https://radio-ethiopia.com/stations)) |
| turkuradyo.net | TürküRadyo | «Winamp / VLC (» ([страница](https://turkuradyo.net/)) |
| myradio24.com | Pyongyang FM Radio | «&lt;!--PLAYER - Блок расположения плеера» ([страница](https://myradio24.com/en/set/69366)) |
| memeradio.org | * Meme dans les orties * | «Pour écouter sur votre lecteur préféré (VLC, Foobar2000, etc» ([страница](https://memeradio.org/player/)) |
| hits1radio.com | Hits 1 Algérie, Hits 1 Ibiza | «Écoutez avec iTunes» ([страница](https://www.hits1radio.com/nous-ecouter/)) |
| weatherusa.net | NOAA Weather Radio - Dallas, Texas (KEC56) | «400 KNAMedia - Internet Radio from Charleston, West Virginia -- Listen» ([страница](https://www.weatherusa.net/radio)) |
| darkambientradio.de | Dark Ambient Radio (96k AAC+) | «pls file to open in your media player» ([страница](https://darkambientradio.de/news.php)) |
| italo.dance | Fantasy Italo Dance 90s radio | «WinAmp» ([страница](https://italo.dance/)) |
| myjoyonline.com | Joy Fm | «iTunes» ([страница](https://www.myjoyonline.com/livestream-newsfile-discusses-mahamas-galamsey-fight-gh%c2%a249-72m-evacuation-controversy-and-5-year-presidential-term-proposal/)) |
| europafm.ro | Europa FM Romania, Europa FM | «În cazul în care preferi să asculţi Europa FM într-un player extern, poţi folosi VLC, Windows Media Player, Winamp sau orice alt player care suportă standardul ACC+ Ascultă Europa FM online în playerul preferat» ([страница](https://www.europafm.ro/club-vip/faq/cum-asculti-europa-fm/)) |
| antennebrandenburg.de | Antenne Brandenburg | «Stars bei Antenne Brandenburg - bei iTunes» ([страница](https://www.antennebrandenburg.de/programm/hoeren/podcasts/antenne_star_interviews/Antenne_Star_Interviews.html)) |
| gyusyabu.ddo.jp | Retro PC GAME MUSIC Streaming Radio | «-winamp,iTunes系他» ([страница](http://gyusyabu.ddo.jp/MP3/MP3.html)) |
| topradio.be | TOPradio Belgium | «Herbeleef de legendarische Tomorrowland set van Avicii uit 2011» ([страница](https://www.topradio.be/)) |
| country108.com | Country 108 | «Streaming URLs für Internetradio-Empfänger (Internetradios, FRITZ!Fon …) oder Player-Software (VLC, Winamp …):» ([страница](https://www.country108.com/)) |
| lounge.fm | Lounge.FM - 100% Austria | «LoungeFM App im iTunes Store» ([страница](https://www.lounge.fm/empfangen/app/)) |
| radiomaya.blogspot.com | Radio Campursari Yogyakarta | «Streaming Radio Campursari Jogjakarta ini tidak autoplay, silahkan klik play media player dan tunggu beberapa saat» ([страница](https://radiomaya.blogspot.com/2018/08/streaming-radio-campursari-jogjakarta.html?m=1)) |
| amfmph.com | Christmas Radio Philippines - Powered By www.amfmph.net | «Internet Radio» ([страница](https://www.amfmph.com/k5-news-fm-tanjay-20070.html)) |
| radiobielefeld.de | Radio Bielefeld | «Ich habe ein WLAN-Radio und kann Radio Bielefeld darin nicht finden» ([страница](https://www.radiobielefeld.de/on-air/webradio.html)) |
| notisistema.com | Fórmula Melódica (Guadalajara) - 97.9 FM - XETIA-FM - Grupo Unidifusión - Guadalajara, JC | «Flash Player --> iTunes Windows Media VideoLan Player» ([страница](https://www.notisistema.com/formulamelodica/)) |
| edmdnb.com | DnB&EDM | «AIMP» ([страница](https://edmdnb.com/help-faq)) |
| ostseewelle.de | Ostseewelle Live Radio, Ostseewelle  | «WLAN-Radio» ([страница](https://www.ostseewelle.de/empfang/)) |
| spoonradio.com | Spoon Radio | «Achat sur iTunes» ([страница](https://www.spoonradio.com/)) |
| u7radio.org | The Very Best Of Art Bell - U7 Radio (U7Radio.org) | «U7 Radio provides 3 streams of 24/7 internet radio — including the Very Best of Art Bell» ([страница](https://u7radio.org/)) |
| ranfm.lk | Ran FM | «Listen in your favourite player» ([страница](https://ranfm.lk/)) |
| voiceofvashon.org | Vashon Island Alerts 1650 AM - Vashon Island, Washington | «On iTunes (for iPhone, iPad and iPod Touch):» ([страница](https://voiceofvashon.org/vov-app/)) |
| electroswing-radio.com | Electro Swing Revolution | «WIFI RADIOS & OTHER DEVICES» ([страница](https://electroswing-radio.com/listen/)) |
| 80sforever.radio | 80s Forever - We Keep The 80s Alive | «Winamp / iTune s: http://azuracast» ([страница](https://www.80sforever.radio/how-to-listen/)) |
| grittyrockradio.com | Gritty Rock Radio | «iTunes» ([страница](https://www.grittyrockradio.com/en/how-to-listen-to-gritty-rock-radio)) |
| lagrandemusique.fr | LA GRANDE MUSIQUE Baroque | «- Ce skill fonctionne aussi avec les enceintes Bose, Sonos, etc» ([страница](https://www.lagrandemusique.fr/comment-ecouter-la-radio)) |
| generationdiscofunk.com | GENERATION SOUL DISCO FUNK RADIO | «Apple Music \| FilterMusic \| Radioguide internet radio \| Radioline \| TuneIn \| Radio» ([страница](https://radiogoodlife.com/event/light-of-the-world-new-morning-le-07-11-2026/)) |
| rockfm.ro | RockFM | «Ascultă în WinAmp» ([страница](https://www.rockfm.ro/)) |
| radiolabelleaventure.com | Radio La Belle Aventure | «VLC, iTunes, Winamp ou une enceinte connectée : ajoutez simplement l'adresse de notre flux, indiquée dans la FAQ» ([страница](https://www.radiolabelleaventure.com/)) |
| lebonmix.radio | Le Bon Mix HiFi Flac 1411 Kbps, Le Bon Mix Radio 97.9 | «- En rentrant l'URL sur votre ordinateur dans le lecteur multim&eacute;dia VLC ou FooBar2000 (PC et Mac), avec un DAC en USB pour &eacute;coute au casque filaire ou vers un syst&egrave;me son amplifi&eacute; :» ([страница](https://www.lebonmix.radio/hifi)) |
| 60north.radio | 60 NORTH RADIO - FLAC | «It is a great way to start but we do recommend that a dedicated player such as VLC would be our preferred way to listen» ([страница](https://60north.radio/technical/new-flac-cdn-delivered-streams/)) |
| hpr.org | HPR1: Traditional Classic Country | «Live Radio Channels (choose your player and bandwidth)» ([страница](https://hpr.org/listen/)) |
| classynetradio.com | CLASSY NetRadio | «CLASSY NetRadio is an internet radio station based in Surabaya, Indonesia, dedicated to providing high-quality, High Definition audio entertainment» ([страница](https://classynetradio.com/)) |
| newstalkzb.co.nz | Newstalk ZB | «If you're using another voice assistant such as a Bixby device, Bose Sonos or any other device, you'll be able to find Newstalk ZB by asking:» ([страница](https://www.newstalkzb.co.nz/on-demand/listen-via-alexa-smart-speakers/)) |
| rslradio.fm | RSL Radio | «jpg&url_achat=https://itunes» ([страница](http://www.rslradio.fm/musiques)) |
| new.brg-radio.com | Bridge Radio - 华语 HITS, 華語 HITS, Bridge Radio - 华语 HITS （2） | «Tomorrowland Academy DJ Contest Perform at Tomorrowland» ([страница](https://new.brg-radio.com/news/btss-jungkook-streams-games-hes-played/)) |
| scifi-otr.weebly.com | SciFi Old Time Radio | «You can find us streaming on the following Internet radio platforms» ([страница](http://scifi-otr.weebly.com/)) |
| channel955.iheart.com | Channel 955 | «Sonos» ([страница](https://channel955.iheart.com/apps/)) |
| radio.macinmind.com | Antioch OTR | «iTunes/Music use File or Advanced menu--Open Stream» ([страница](https://radio.macinmind.com/)) |
| spreeradio.de | 105'5 Spreeradio | «Internetradio» ([страница](https://www.spreeradio.de/)) |
| nessradio.com | Ness Radio | «NESS RADIO &#8211; La web radio de ceux qui aiment la différence ! Free Internet Radio &#8211; Maroc &#8211; Marrakech» ([страница](https://nessradio.com/)) |
| rockland.de | Rockland Radio Koblenz  | «#MenschenbeiAnnette #AnnetteRadüg #ElmarPaulke #deutscheStimmedesDarts #Dart #PerfektGame #EineneueÄraimProfiDarts #EdelVerlag #GameOn #DieverrückteWeltdesDarts #fürdieKneipegemacht #Dartexperte #Perfektion #Pfeil #Radio21 #RocklandRadio #AntenneSylt» ([страница](https://www.rockland.de/mediathek/podcasts/menschen-bei-annette.html)) |
| wfmu.org | WFMU, WFMU 91.1 East Orange, NJ, WFMU | «Recommended players: VLC Player ( Mac or PC ) \| iTunes (Mac or PC) \| Winamp (PC only)» ([страница](https://wfmu.org/ssaudionet.shtml)) |
| harmonyfm.de | harmony.fm | «Wie hört ihr die Webradios von eurem 80er-Radio harmony? Über unseren Webradio-Player, die App oder ein Internetradio-Gerät? Schaut unten auf dieser Seite in den FAQ nach – vielleicht lässt sich damit schon euer Problem lösen» ([страница](https://www.harmonyfm.de/musik/webradios/stream-adressen.html)) |
| radio-romantic.ro | Radio Romantic | «Winamp» ([страница](https://radio-romantic.ro/)) |
| mugenradio.com | MUGEN Radio | «Direct Stream URL (VLC, Winamp, etc» ([страница](https://mugenradio.com/stream-safe.html)) |
| hionline.eu | Hi On Line World Radio | «Hi On Line Radio - Hifi Internet Radio - 320 kbps - Broadcasting 24/7» ([страница](https://www.hionline.eu/)) |
| fmradiomanele.ro | RADIO MANELE PETRECERE | «Poti asculta Radio Manele Romania gratuit,oricand si oriunde in lume prin diverse metode ( Linux , Windows , Winamp ,Android, iOS , SmartTv )» ([страница](https://fmradiomanele.ro/)) |
| radiocultural.org | Radio Cultural TGN | «Windows Media Player» ([страница](http://www.radiocultural.org/site/)) |
| 1940sukradio.co.uk | The UK 1940s Radio Station | «Internet Radio Users» ([страница](https://www.1940sukradio.co.uk/)) |
| radio7.de | Radio 7 | «den Windows Media Player, iTunes oder iPhone hören möchten, kopiert einfach einen der folgenden Links in das jeweilige Programm» ([страница](https://www.radio7.de/radio-7/empfang)) |
| kiyimuzik.com | KIYI Muzik | «Ayrıca Kıyı Müzik'i iTunes Radio'da Contemporary Adult kategorisi altında bulabilirsiniz» ([страница](https://kiyimuzik.com/radyo/)) |
| kissfmuk.com | KISS UK | «com/559859956","is_featured":false,"showId":18586,"title":"KISS Dance at Tomorrowland","description":"Mixes and highlights direct from one of the most iconic dance music festivals in the world» ([страница](https://www.hellorayo.co.uk/kiss)) |
| rnz.co.nz | RNZ National MP3 | «iTunes, VLC)» ([страница](https://www.rnz.co.nz/listen/amfm)) |
| liferadio.tirol |  Life Radio Tirol - MUSIC ONLY | «Benötigst du einen Link für dein Webradio, Autoradio oder willst du den Stream direkt am PC oder im Mediaplayer hören?» ([страница](https://www.liferadio.tirol/channels-streamlinks/)) |
| republicbroadcasting.org | RBN - Republic Broadcastin Network | «or with &#8220;INTERNET RADIOS&#8221;!» ([страница](http://republicbroadcasting.org/listen-live/)) |
| bobskaradio.com | Bobs Ska Radio | «EU Itunes» ([страница](https://www.bobskaradio.com/)) |
| chillofi-radio.dez.ovh | Chillofi Radio: relax & study beats | «fr myTuner VLC» ([страница](https://www.kalizoradio.com/radio/lofi/)) |
| megatucson.iheart.com | Mega 97.1 (#1 Para Latino Hits ) | «Sonos» ([страница](https://megatucson.iheart.com/apps/)) |
| 24-7nicheradio.com | 24-7 Reggae | «Internet Radio» ([страница](https://24-7nicheradio.com/audiogallery/24-7-reggae/)) |
| hitfm.ru | HIT FM | «в Melon Top 100**\r\n\r\nНовый сингл NMIXX «Birthday Wish» дебютировал на пятой строчке главного корейского чарта Melon, а мини-альбом «Strange Muse» возглавил iTunes Top Album в Сингапуре и Гонконге» ([страница](https://hitfm.ru/)) |
