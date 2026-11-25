// Common Polish terms and original descriptions for the named atlas structures.
const structures = {
  // Muscles and tendons
  'adductor-muscles-of-thigh': ['Przywodziciele uda', '', 'Zbliżają uda do siebie i pomagają utrzymać miednicę w stabilnym położeniu podczas chodzenia.'],
  'biceps-brachii': ['Mięsień dwugłowy ramienia', 'Musculus biceps brachii', 'Zgina rękę w łokciu i obraca przedramię tak, by dłoń skierowała się ku górze.'],
  'biceps-femoris': ['Mięsień dwugłowy uda', 'Musculus biceps femoris', 'Zgina nogę w kolanie. Jego głowa długa pomaga także prostować udo w stawie biodrowym.'],
  'brachialis': ['Mięsień ramienny', 'Musculus brachialis', 'Leży pod bicepsem i zgina łokieć niezależnie od ustawienia przedramienia.'],
  'brachioradialis': ['Mięsień ramienno-promieniowy', 'Musculus brachioradialis', 'Zgina łokieć, szczególnie gdy kciuk jest skierowany ku górze.'],
  'calcaneal-tendon': ['Ścięgno Achillesa', 'Tendo calcaneus', 'Przenosi siłę mięśni łydki na kość piętową podczas stawania na palcach.'],
  'coracobrachialis': ['Mięsień kruczo-ramienny', 'Musculus coracobrachialis', 'Pomaga unieść ramię do przodu i przybliżyć je do tułowia.'],
  'deep-back-muscles': ['Mięśnie poprzeczno-kolcowe', 'Musculi transversospinales', 'Łączą kręgi na różnych poziomach i pomagają stabilizować kręgosłup w ruchu.'],
  'deep-posterior-muscles-of-leg': ['Głębokie mięśnie tylnej grupy goleni', '', 'Do tej grupy należą mięśnie zginające palce, podtrzymujące łuk stopy i wspomagające ruch kolana.'],
  'deep-rotators-of-hip': ['Głębokie rotatory stawu biodrowego', '', 'Obracają udo na zewnątrz i pomagają utrzymać głowę kości udowej w panewce.'],
  'deltoid': ['Mięsień naramienny', 'Musculus deltoideus', 'Część środkowa unosi ramię w bok. Części przednia i tylna pomagają poruszać nim do przodu i do tyłu.'],
  'erector-spinae': ['Mięsień prostownik grzbietu', 'Musculus erector spinae', 'Prostuje kręgosłup i pomaga utrzymać tułów w pozycji pionowej.'],
  'extensor-muscles-of-forearm': ['Prostowniki nadgarstka i palców', '', 'Mięśnie tej grupy odginają dłoń w stronę jej grzbietu i prostują palce.'],
  'extensor-muscles-of-leg': ['Prostowniki przedniej grupy goleni', '', 'Unoszą stopę i prostują palce, pomagając stopie przejść nad podłożem podczas kroku.'],
  'external-oblique': ['Mięsień skośny zewnętrzny brzucha', 'Musculus obliquus externus abdominis', 'Razem z innymi mięśniami brzucha pomaga zginać, przechylać i obracać tułów.'],
  'extraocular-muscles': ['Mięśnie zewnętrzne gałki ocznej', 'Musculi externi bulbi oculi', 'Koordynują ruchy gałki ocznej i pozwalają przenosić wzrok.'],
  'facial-muscles': ['Mięśnie mimiczne', 'Musculi faciales', 'Poruszają skórą twarzy, umożliwiając uśmiech, mruganie i zmianę wyrazu twarzy.'],
  'fibularis-muscles': ['Mięśnie strzałkowe', '', 'Pomagają odwracać podeszwę na zewnątrz i stabilizują stopę podczas chodzenia.'],
  'flexor-muscles-of-forearm': ['Zginacze nadgarstka i palców', '', 'Mięśnie tej grupy zginają nadgarstek i palce, ułatwiając chwytanie przedmiotów.'],
  'gastrocnemius': ['Mięsień brzuchaty łydki', 'Musculus gastrocnemius', 'Poprzez ścięgno Achillesa unosi piętę. Pomaga również zginać kolano.'],
  'gluteus-maximus': ['Mięsień pośladkowy wielki', 'Musculus gluteus maximus', 'Prostuje udo podczas wstawania z krzesła i pomaga obracać je na zewnątrz.'],
  'gluteus-medius': ['Mięsień pośladkowy średni', 'Musculus gluteus medius', 'Odwodzi udo i pomaga utrzymać miednicę poziomo przy oparciu na jednej nodze.'],
  'gluteus-minimus': ['Mięsień pośladkowy mały', 'Musculus gluteus minimus', 'Pomaga odwodzić udo i stabilizuje miednicę podczas chodzenia.'],
  'gracilis': ['Mięsień smukły', 'Musculus gracilis', 'Przywodzi udo i pomaga zginać kolano.'],
  'iliopsoas': ['Mięsień biodrowo-lędźwiowy', 'Musculus iliopsoas', 'To jeden z głównych zginaczy stawu biodrowego. Unosi udo podczas kroku.'],
  'infrahyoid-muscles': ['Mięśnie podgnykowe', 'Musculi infrahyoidei', 'Obniżają lub stabilizują kość gnykową i krtań podczas połykania i mówienia.'],
  'infraspinatus': ['Mięsień podgrzebieniowy', 'Musculus infraspinatus', 'Obraca ramię na zewnątrz i wchodzi w skład stożka rotatorów.'],
  'intercostal-muscles': ['Mięśnie międzyżebrowe', 'Musculi intercostales', 'Leżą między żebrami i pomagają zmieniać objętość klatki piersiowej podczas oddychania.'],
  'internal-oblique': ['Mięsień skośny wewnętrzny brzucha', 'Musculus obliquus internus abdominis', 'Pomaga obracać i zginać tułów oraz wzmacnia ścianę brzucha.'],
  'latissimus-dorsi': ['Mięsień najszerszy grzbietu', 'Musculus latissimus dorsi', 'Cofa ramię i przybliża je do tułowia, na przykład podczas podciągania.'],
  'levator-scapulae': ['Mięsień dźwigacz łopatki', 'Musculus levator scapulae', 'Unosi łopatkę i pomaga zmieniać jej położenie podczas ruchu obręczy barkowej.'],
  'masseter': ['Mięsień żwacz', 'Musculus masseter', 'Unosi żuchwę, zbliżając dolne zęby do górnych podczas żucia.'],
  'muscles-of-larynx': ['Mięśnie krtani', 'Musculi laryngis', 'Zmieniają położenie i napięcie fałdów głosowych podczas oddychania i wydawania głosu.'],
  'muscles-of-foot': ['Mięśnie krótkie stopy', 'Musculi pedis', 'Poruszają palcami i pomagają podtrzymać łuki stopy pod obciążeniem.'],
  'muscles-of-hand': ['Mięśnie krótkie ręki', 'Musculi manus', 'Umożliwiają precyzyjne ruchy palców i pomagają chwytać małe przedmioty.'],
  'muscles-of-pharynx': ['Mięśnie gardła i podniebienia miękkiego', '', 'Pomagają przesuwać pokarm przy połykaniu i kierują przepływem powietrza podczas mówienia.'],
  'muscles-of-tongue': ['Mięśnie zewnętrzne języka', '', 'Poruszają całym językiem, wspomagając mowę i kierując pokarm ku gardłu.'],
  'pectoralis-major': ['Mięsień piersiowy większy', 'Musculus pectoralis major', 'Przywodzi ramię i obraca je do wewnątrz. Pracuje także podczas pchania.'],
  'pectoralis-minor': ['Mięsień piersiowy mniejszy', 'Musculus pectoralis minor', 'Leży pod mięśniem piersiowym większym i przesuwa łopatkę do przodu i w dół.'],
  'pelvic-floor-muscles': ['Mięśnie dna miednicy', '', 'Podtrzymują narządy miednicy i pomagają kontrolować oddawanie moczu i stolca.'],
  'platysma': ['Mięsień szeroki szyi', 'Platysma', 'Napina skórę szyi i pomaga obniżać kąciki ust.'],
  'prevertebral-muscles': ['Mięśnie przedkręgowe szyi', '', 'Leżą z przodu kręgów szyjnych i pomagają zginać oraz stabilizować szyję.'],
  'pterygoid-muscles': ['Mięśnie skrzydłowe', 'Musculi pterygoidei', 'Przesuwają żuchwę do przodu i na boki podczas żucia.'],
  'quadratus-lumborum': ['Mięsień czworoboczny lędźwi', 'Musculus quadratus lumborum', 'Zgina tułów w bok i pomaga stabilizować odcinek lędźwiowy kręgosłupa.'],
  'quadriceps-femoris': ['Mięsień czworogłowy uda', 'Musculus quadriceps femoris', 'Cztery głowy położone z przodu uda współpracują, prostując kolano.'],
  'rectus-abdominis': ['Mięsień prosty brzucha', 'Musculus rectus abdominis', 'Zgina tułów do przodu i pomaga podtrzymywać ścianę brzucha.'],
  'rhomboid-muscles': ['Mięśnie równoległoboczne', 'Musculi rhomboidei', 'Przyciągają łopatkę do kręgosłupa i pomagają utrzymać ją blisko klatki piersiowej.'],
  'sartorius': ['Mięsień krawiecki', 'Musculus sartorius', 'Przebiega skośnie przez udo i pomaga zginać kolano oraz staw biodrowy.'],
  'scalene-muscles': ['Mięśnie pochyłe szyi', 'Musculi scaleni', 'Przechylają szyję i pomagają unosić górne żebra przy głębokim wdechu.'],
  'semimembranosus': ['Mięsień półbłoniasty', 'Musculus semimembranosus', 'Prostuje udo w biodrze, zgina kolano i wspomaga obrót zgiętej goleni do wewnątrz.'],
  'semitendinosus': ['Mięsień półścięgnisty', 'Musculus semitendinosus', 'Prostuje udo w biodrze, zgina kolano i wspomaga obrót zgiętej goleni do wewnątrz.'],
  'serratus-anterior': ['Mięsień zębaty przedni', 'Musculus serratus anterior', 'Utrzymuje łopatkę przy klatce piersiowej i pomaga ją obrócić podczas podnoszenia ręki.'],
  'serratus-posterior-muscles': ['Mięśnie zębate tylne', 'Musculi serrati posteriores', 'Cienkie mięśnie grzbietu łączące fragmenty kręgosłupa z żebrami.'],
  'soleus': ['Mięsień płaszczkowaty', 'Musculus soleus', 'Leży pod mięśniem brzuchatym łydki i pomaga utrzymać równowagę w pozycji stojącej oraz unosić piętę.'],
  'splenius-muscles': ['Mięśnie płatowate głowy i szyi', 'Musculi splenii', 'Prostują szyję i pomagają przechylać oraz obracać głowę.'],
  'sternocleidomastoid': ['Mięsień mostkowo-obojczykowo-sutkowy', 'Musculus sternocleidomastoideus', 'Przechyla głowę w stronę własnego barku i obraca twarz w stronę przeciwną.'],
  'subclavius': ['Mięsień podobojczykowy', 'Musculus subclavius', 'Leży między pierwszym żebrem a obojczykiem i pomaga go stabilizować.'],
  'suboccipital-muscles': ['Mięśnie podpotyliczne', 'Musculi suboccipitales', 'Małe mięśnie u podstawy czaszki pomagają precyzyjnie ustawiać głowę.'],
  'subscapularis': ['Mięsień podłopatkowy', 'Musculus subscapularis', 'Obraca ramię do wewnątrz i wchodzi w skład stożka rotatorów.'],
  'suprahyoid-muscles': ['Mięśnie nadgnykowe', 'Musculi suprahyoidei', 'Unoszą kość gnykową podczas połykania i pomagają otwierać usta.'],
  'supraspinatus': ['Mięsień nadgrzebieniowy', 'Musculus supraspinatus', 'Pomaga rozpocząć unoszenie ramienia w bok i stabilizuje staw ramienny.'],
  'temporalis': ['Mięsień skroniowy', 'Musculus temporalis', 'Unosi żuchwę. Jego tylne włókna pomagają ją cofać.'],
  'tensor-fasciae-latae': ['Napinacz powięzi szerokiej i pasmo biodrowo-piszczelowe', '', 'Mięsień napina pasmo biegnące po zewnętrznej stronie uda, wspierając stabilizację nogi.'],
  'teres-major': ['Mięsień obły większy', 'Musculus teres major', 'Cofa ramię, przybliża je do tułowia i pomaga obracać je do wewnątrz.'],
  'teres-minor': ['Mięsień obły mniejszy', 'Musculus teres minor', 'Obraca ramię na zewnątrz i pomaga utrzymać głowę kości ramiennej w stawie.'],
  'tibialis-anterior': ['Mięsień piszczelowy przedni', 'Musculus tibialis anterior', 'Unosi przód stopy i pomaga skierować podeszwę do wewnątrz.'],
  'transversus-abdominis': ['Mięsień poprzeczny brzucha', 'Musculus transversus abdominis', 'Głęboki mięsień ściany brzucha, który ją napina i pomaga stabilizować tułów.'],
  'trapezius': ['Mięsień czworoboczny', 'Musculus trapezius', 'Poszczególne części tego mięśnia unoszą, opuszczają i obracają łopatkę podczas ruchów barku.'],
  'triceps-brachii': ['Mięsień trójgłowy ramienia', 'Musculus triceps brachii', 'Prostuje łokieć. Głowa długa bierze też udział w ruchach stawu ramiennego.'],

  // Bones, cartilages and teeth
  'bones-of-foot': ['Kości stopy', 'Ossa pedis', 'Kości stępu, śródstopia i palców rozkładają ciężar ciała i zapewniają oparcie podczas chodzenia.'],
  'bones-of-hand': ['Kości ręki', 'Ossa manus', 'Kości nadgarstka, śródręcza i palców tworzą ruchomy szkielet umożliwiający precyzyjne ruchy ręki.'],
  'cervical-vertebrae': ['Kręgi szyjne', 'Vertebrae cervicales', 'Siedem kręgów podtrzymuje głowę i tworzy kanał osłaniający górną część rdzenia kręgowego.'],
  'clavicle': ['Obojczyk', 'Clavicula', 'Łączy mostek z łopatką i utrzymuje bark w pewnej odległości od klatki piersiowej.'],
  'coccyx': ['Kość guziczna', 'Os coccygis', 'Kończy kręgosłup i stanowi miejsce przyczepu części mięśni i więzadeł miednicy.'],
  'costal-cartilages': ['Chrząstki żebrowe', 'Cartilagines costales', 'Przedłużają przednie końce żeber i zwiększają elastyczność klatki piersiowej podczas oddychania.'],
  'femur': ['Kość udowa', 'Femur', 'Długa kość przenosząca obciążenie między stawem biodrowym a kolanowym.'],
  'fibula': ['Kość strzałkowa', 'Fibula', 'Biegnie po zewnętrznej stronie podudzia i tworzy kostkę boczną.'],
  'hip-bone': ['Kość miedniczna', 'Os coxae', 'Wraz z kością krzyżową przenosi ciężar tułowia. Jej panewka mieści głowę kości udowej.'],
  'humerus': ['Kość ramienna', 'Humerus', 'Biegnie od barku do łokcia i służy jako dźwignia dla mięśni kończyny górnej.'],
  'hyoid-bone': ['Kość gnykowa', 'Os hyoideum', 'Stanowi oparcie dla języka. Przyczepione do niej mięśnie uczestniczą w połykaniu.'],
  'intervertebral-discs': ['Krążki międzykręgowe', 'Disci intervertebrales', 'Elastyczne krążki rozkładają obciążenia między kręgami i umożliwiają zginanie kręgosłupa.'],
  'lower-teeth': ['Zęby żuchwy', 'Dentes mandibulares', 'Wraz z zębami szczęki odgryzają i rozdrabniają pokarm.'],
  'lumbar-vertebrae': ['Kręgi lędźwiowe', 'Vertebrae lumbales', 'Pięć dużych kręgów przenosi znaczną część ciężaru górnej połowy ciała.'],
  'mandible': ['Żuchwa', 'Mandibula', 'Ruchoma kość czaszki utrzymuje dolne zęby i uczestniczy w żuciu oraz mówieniu.'],
  'nasal-cartilages': ['Chrząstki nosa', 'Cartilagines nasi', 'Nadają kształt przedniej części nosa i podtrzymują brzegi nozdrzy.'],
  'patella': ['Rzepka', 'Patella', 'Kość z przodu kolana zwiększa skuteczność działania mięśnia czworogłowego uda przy prostowaniu nogi.'],
  'radius': ['Kość promieniowa', 'Radius', 'Leży po stronie kciuka i porusza się wokół kości łokciowej, gdy obracasz przedramię.'],
  'ribs': ['Żebra', 'Costae', 'Tworzą klatkę piersiową, chronią serce i płuca oraz poruszają się przy oddychaniu.'],
  'sacrum': ['Kość krzyżowa', 'Os sacrum', 'Powstaje ze zrośniętych kręgów, łączy kręgosłup z miednicą i przenosi na nią obciążenie.'],
  'scapula': ['Łopatka', 'Scapula', 'Ta płaska kość współtworzy staw ramienny i porusza się podczas unoszenia ręki.'],
  'skull': ['Czaszka', 'Cranium', 'Kości czaszki chronią mózg i stanowią szkielet twarzy.'],
  'sternum': ['Mostek', 'Sternum', 'Płaska kość z przodu klatki piersiowej łączy się z obojczykami i chrząstkami górnych żeber.'],
  'thoracic-vertebrae': ['Kręgi piersiowe', 'Vertebrae thoracicae', 'Dwanaście kręgów tworzy środkowy odcinek kręgosłupa i łączy się z żebrami.'],
  'tibia': ['Kość piszczelowa', 'Tibia', 'Przenosi większość obciążenia w podudziu i współtworzy staw kolanowy oraz skokowy.'],
  'ulna': ['Kość łokciowa', 'Ulna', 'Leży po stronie małego palca, a jej górny koniec tworzy wyczuwalny występ łokcia.'],
  'upper-teeth': ['Zęby szczęki', 'Dentes maxillares', 'Wraz z zębami żuchwy odgryzają i rozdrabniają pokarm.'],

  // Skin, vessels, nerves and internal organs
  'skin': ['Skóra', 'Cutis', 'Chroni ciało, odbiera bodźce dotykowe i pomaga regulować temperaturę.'],

  'aorta': ['Aorta', 'Aorta', 'Największa tętnica ciała. Prowadzi krew z lewej komory serca do narządów i tkanek.'],
  'arteries-of-abdomen': ['Tętnice jamy brzusznej', '', 'Gałęzie aorty brzusznej dostarczają krew do nerek, narządów trawiennych i ścian brzucha.'],
  'arteries-of-brain': ['Tętnice mózgowia', 'Arteriae cerebri', 'Dostarczają krew do poszczególnych części mózgowia.'],
  'arteries-of-head-and-neck': ['Tętnice głowy i szyi', '', 'Dostarczają krew do tkanek twarzy, głowy i szyi.'],
  'arteries-of-lower-limb': ['Tętnice kończyny dolnej', '', 'Dostarczają krew do mięśni, kości i innych tkanek nogi.'],
  'arteries-of-upper-limb': ['Tętnice kończyny górnej', '', 'Dostarczają krew do mięśni, kości i innych tkanek ręki.'],
  'arteries-of-pelvis': ['Tętnice biodrowe', 'Arteriae iliacae', 'Odprowadzają krew z aorty brzusznej do narządów miednicy i kończyn dolnych.'],
  'arteries-of-thorax': ['Tętnice klatki piersiowej', '', 'Dostarczają krew do ścian klatki piersiowej i innych tkanek w jej obrębie.'],
  'cardiac-veins': ['Żyły serca', 'Venae cordis', 'Zbierają krew z mięśnia sercowego i odprowadzają ją do prawego przedsionka.'],
  'coronary-arteries': ['Tętnice wieńcowe', 'Arteriae coronariae', 'Dostarczają mięśniowi sercowemu tlen i składniki odżywcze.'],
  'heart': ['Serce', 'Cor', 'Cztery jamy serca współpracują, pompując krew przez płuca i pozostałe części ciała.'],
  'hepatic-portal-vein': ['Żyła wrotna wątroby i jej dopływy', 'Vena portae hepatis', 'Doprowadza do wątroby krew z narządów układu pokarmowego i śledziony.'],
  'inferior-vena-cava': ['Żyła główna dolna', 'Vena cava inferior', 'Odprowadza krew z dolnej części ciała do prawego przedsionka serca.'],
  'pulmonary-arteries': ['Tętnice płucne', 'Arteriae pulmonales', 'Przewodzą krew z prawej komory serca do płuc, gdzie pobiera tlen.'],
  'pulmonary-veins': ['Żyły płucne', 'Venae pulmonales', 'Przewodzą natlenowaną krew z płuc do lewego przedsionka serca.'],
  'superior-vena-cava': ['Żyła główna górna', 'Vena cava superior', 'Odprowadza krew z głowy, szyi, kończyn górnych i części klatki piersiowej do prawego przedsionka.'],
  'veins-of-abdomen': ['Żyły jamy brzusznej', '', 'Odprowadzają krew z narządów i ścian jamy brzusznej.'],
  'veins-of-brain': ['Zatoki żylne opony twardej i żyły mózgowia', '', 'Zbierają krew z mózgowia i kierują ją do żył szyjnych wewnętrznych.'],
  'veins-of-head-and-neck': ['Żyły głowy i szyi', '', 'Odprowadzają krew z tkanek głowy i szyi w kierunku serca.'],
  'veins-of-lower-limb': ['Żyły kończyny dolnej', '', 'Odprowadzają krew z tkanek nogi przez sieć żył powierzchownych i głębokich.'],
  'veins-of-upper-limb': ['Żyły kończyny górnej', '', 'Odprowadzają krew z tkanek ręki przez sieć żył powierzchownych i głębokich.'],
  'veins-of-pelvis': ['Żyły biodrowe', 'Venae iliacae', 'Zbierają krew z narządów miednicy i kończyn dolnych i odprowadzają ją do żyły głównej dolnej.'],
  'veins-of-thorax': ['Żyły klatki piersiowej', '', 'Zbierają krew ze ścian klatki piersiowej i górnej części ciała i odprowadzają ją do żyły głównej górnej.'],

  'bronchi': ['Oskrzela', 'Bronchi', 'Tworzą rozgałęzioną sieć, która przewodzi powietrze z tchawicy w głąb płuc.'],
  'diaphragm': ['Przepona', 'Diaphragma', 'Podczas wdechu ten mięsień kurczy się i obniża, zwiększając objętość klatki piersiowej.'],
  'larynx': ['Krtań', 'Larynx', 'Przewodzi powietrze, uczestniczy w tworzeniu głosu i chroni drogi oddechowe podczas połykania.'],
  'lung': ['Płuco', 'Pulmo', 'W pęcherzykach płucnych tlen przenika do krwi, a dwutlenek węgla przechodzi z krwi do wydychanego powietrza.'],
  'trachea': ['Tchawica', 'Trachea', 'Przewodzi powietrze z krtani do oskrzeli głównych.'],

  'brain': ['Półkule mózgu', 'Cerebrum', 'Przetwarzają informacje ze zmysłów i uczestniczą w myśleniu, zapamiętywaniu oraz ruchach dowolnych.'],
  'brainstem': ['Pień mózgu', 'Truncus encephali', 'Łączy mózg z rdzeniem kręgowym i uczestniczy w regulacji oddychania i pracy serca.'],
  'cerebellum': ['Móżdżek', 'Cerebellum', 'Koordynuje ruchy i pomaga utrzymać równowagę oraz uczyć się nowych czynności ruchowych.'],
  'cerebrum-deep-structures': ['Głębokie struktury mózgu', '', 'Wzgórze przekazuje sygnały czuciowe, jądra podstawne uczestniczą w sterowaniu ruchem, a ciało modzelowate łączy półkule mózgu.'],
  'cranial-nerves': ['Nerwy czaszkowe', 'Nervi craniales', 'Przewodzą sygnały między mózgowiem a narządami zmysłów, mięśniami i innymi tkankami.'],
  'intercostal-nerves': ['Nerwy międzyżebrowe', 'Nervi intercostales', 'Biegną między żebrami i przewodzą sygnały czuciowe z klatki piersiowej oraz sygnały sterujące jej mięśniami.'],
  'nerves-of-lower-limb': ['Nerwy kończyny dolnej', '', 'Gałęzie splotu lędźwiowego i krzyżowego przewodzą sygnały między rdzeniem kręgowym a mięśniami i skórą nogi.'],
  'nerves-of-upper-limb': ['Nerwy kończyny górnej', '', 'Gałęzie splotu ramiennego przewodzą sygnały między rdzeniem kręgowym a mięśniami i skórą ręki.'],
  'spinal-cord': ['Rdzeń kręgowy', 'Medulla spinalis', 'Przewodzi sygnały między mózgowiem a ciałem i uczestniczy w odruchach.'],
  'spinal-nerve-roots': ['Korzenie i zwoje nerwów rdzeniowych', '', 'Korzenie tylne przewodzą sygnały czuciowe do rdzenia kręgowego, a przednie przekazują z niego sygnały do mięśni.'],
  'sympathetic-trunk': ['Pień współczulny', 'Truncus sympathicus', 'Łańcuch zwojów nerwowych wzdłuż kręgosłupa, który uczestniczy w niezależnej od woli regulacji pracy narządów.'],

  'esophagus': ['Przełyk', 'Oesophagus', 'Skurcze jego mięśni przesuwają pokarm z gardła do żołądka.'],
  'gallbladder': ['Pęcherzyk żółciowy i przewód żółciowy', '', 'Pęcherzyk magazynuje żółć, która płynie przewodem do dwunastnicy i ułatwia trawienie tłuszczów.'],
  'large-intestine': ['Jelito grube', 'Intestinum crassum', 'Wchłania wodę i sole mineralne oraz uczestniczy w formowaniu stolca.'],
  'liver': ['Wątroba', 'Hepar', 'Przetwarza składniki odżywcze, produkuje żółć i pomaga usuwać szkodliwe związki.'],
  'pancreas': ['Trzustka', 'Pancreas', 'Wydziela enzymy trawienne do jelita i wytwarza hormony regulujące poziom glukozy we krwi.'],
  'pharynx': ['Gardło', 'Pharynx', 'Przewodzi powietrze do krtani i kieruje połykany pokarm do przełyku.'],
  'salivary-glands': ['Ślinianki', 'Glandulae salivariae', 'Wydzielają ślinę, która nawilża pokarm i rozpoczyna trawienie skrobi.'],
  'small-intestine': ['Jelito cienkie', 'Intestinum tenue', 'Tu zachodzi większość trawienia i wchłaniania składników odżywczych.'],
  'stomach': ['Żołądek', 'Gaster', 'Miesza pokarm i rozpoczyna trawienie białek za pomocą soku żołądkowego.'],
  'tongue': ['Język', 'Lingua', 'Pomaga przesuwać pokarm, rozpoznawać smak i wymawiać głoski.'],

  'kidney': ['Nerka', 'Ren', 'Filtruje krew, wytwarza mocz i reguluje ilość wody i soli w organizmie.'],
  'ureters': ['Moczowody', 'Ureteres', 'Skurcze ich ścian przesuwają mocz z nerek do pęcherza moczowego.'],
  'urinary-bladder': ['Pęcherz moczowy', 'Vesica urinaria', 'Gromadzi mocz do czasu jego wydalenia.'],

  'adrenal-gland': ['Nadnercze', 'Glandula suprarenalis', 'Wytwarza hormony, które uczestniczą w reakcji na stres, przemianie materii i regulacji ciśnienia tętniczego.'],
  'eye': ['Oko', 'Oculus', 'Układ optyczny oka skupia światło na siatkówce, która przekształca je w sygnały nerwowe.'],
  'pineal-gland': ['Szyszynka', 'Glandula pinealis', 'Wytwarza melatoninę i uczestniczy w regulacji rytmu dobowego.'],
  'pituitary-gland': ['Przysadka mózgowa', 'Hypophysis', 'Wydziela hormony wpływające na wzrost, gospodarkę wodną i pracę innych gruczołów.'],
  'spleen': ['Śledziona', 'Splen', 'Filtruje krew, usuwa zużyte krwinki czerwone i uczestniczy w odpowiedzi odpornościowej.'],
  'thymus': ['Grasica', 'Thymus', 'W tym narządzie dojrzewają limfocyty T, które uczestniczą w obronie organizmu.'],
  'thyroid': ['Tarczyca i przytarczyce', '', 'Tarczyca reguluje przemianę materii, a przytarczyce pomagają utrzymać odpowiednie stężenie wapnia we krwi.'],
};

// The viewer supplies the model ID. These aliases also support its display names.
const names = {
  'deep-rotator-muscles-of-hip': 'deep-rotators-of-hip',
  'deep-structures-of-cerebrum': 'cerebrum-deep-structures',
  'dural-venous-sinuses-and-cranial-veins': 'veins-of-brain',
  'external-abdominal-oblique': 'external-oblique',
  'extrinsic-muscles-of-tongue': 'muscles-of-tongue',
  'gallbladder-and-bile-duct': 'gallbladder',
  'hepatic-portal-vein-and-tributaries': 'hepatic-portal-vein',
  'internal-abdominal-oblique': 'internal-oblique',
  'muscles-of-facial-expression': 'facial-muscles',
  'muscles-of-pharynx-and-soft-palate': 'muscles-of-pharynx',
  'spinal-nerve-roots-and-ganglia': 'spinal-nerve-roots',
  'tensor-fasciae-latae-and-iliotibial-tract': 'tensor-fasciae-latae',
  'thyroid-and-parathyroid-glands': 'thyroid',
};

const groupLabels = {
  muscles: 'Układ mięśniowy',
  muscular: 'Układ mięśniowy',
  tendon: 'Ścięgna',
  bones: 'Szkielet',
  skeletal: 'Szkielet',
  cartilage: 'Chrząstki',
  tooth: 'Zęby',
  organs: 'Narządy',
  digestive: 'Układ pokarmowy',
  respiratory: 'Układ oddechowy',
  urinary: 'Układ moczowy',
  vessels: 'Naczynia krwionośne',
  artery: 'Tętnice',
  vein: 'Żyły',
  cardiovascular: 'Układ sercowo-naczyniowy',
  nervous: 'Układ nerwowy',
  nerves: 'Układ nerwowy',
  integumentary: 'Skóra',
  skin: 'Skóra',
  gland: 'Gruczoły',
  eye: 'Narządy zmysłów',
};

function normalizeFamily(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .split(/[^a-z\d]+/)
    .filter(token => token && !['left', 'right', 'side'].includes(token))
    .join('-');
}

function normalizeSide(value) {
  const side = String(value ?? '').toLowerCase();
  if (side === 'left' || side === 'l') return 'left';
  if (side === 'right' || side === 'r') return 'right';
  return null;
}

export function anatomySideLabel(side) {
  const normalized = normalizeSide(side);
  if (normalized === 'left') return 'Lewa strona';
  if (normalized === 'right') return 'Prawa strona';
  return '';
}

export function describeStructure(item = {}) {
  const id = normalizeFamily(item?.id);
  const name = normalizeFamily(item?.name);
  const key = Object.hasOwn(structures, id) ? id : Object.hasOwn(names, name) ? names[name] : name;
  const details = Object.hasOwn(structures, key) ? structures[key] : [];
  const [translatedTitle, latin = '', translatedDescription] = details;
  const sideFromName = String(item?.name ?? '').match(/\b(left|right)\b/i)?.[0];
  const sideFromId = String(item?.id ?? '').match(/(?:^|-)(left|right)(?=-|$)/i)?.[1];
  const side = normalizeSide(item?.side) ?? normalizeSide(sideFromId ?? sideFromName);
  const group = [item?.tissue, item?.system, item?.layer]
    .find(value => Object.hasOwn(groupLabels, value));
  return {
    title: translatedTitle || item?.name || 'Struktura anatomiczna',
    latin,
    group: groupLabels[group] ?? 'Anatomia',
    description: translatedDescription || item?.description || '',
    side,
    sideLabel: anatomySideLabel(side),
  };
}
