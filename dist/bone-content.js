export const boneLabels = {
  'femur-right': 'Prawa kość udowa',
  'humerus-right': 'Prawa kość ramienna',
  'tibia-right': 'Prawa kość piszczelowa',
  'radius-right': 'Prawa kość promieniowa',
  'fibula-right': 'Prawa kość strzałkowa',
  'ulna-right': 'Prawa kość łokciowa',
  'femur-left': 'Lewa kość udowa',
  'humerus-left': 'Lewa kość ramienna',
  'tibia-left': 'Lewa kość piszczelowa',
  'radius-left': 'Lewa kość promieniowa',
  'fibula-left': 'Lewa kość strzałkowa',
  'ulna-left': 'Lewa kość łokciowa',
};

export const fractureLayers = {
  bone: 'Kość',
  skin: 'Skóra',
  muscles: 'Mięśnie',
  marrow: 'Szpik kostny',
};

export const fractures = {
  title: 'Złamania kości',
  summary: 'Porównaj dwa rodzaje złamań i sprawdź, jak wyglądają kość oraz otaczające ją tkanki.',
  source: 'https://orthoinfo.aaos.org/en/diseases--conditions/open-fractures/',
};

export const fractureTypes = {
  closed: {
    title: 'Złamanie zamknięte',
    description: 'Kość pęka, a miejsce złamania pozostaje odizolowane od otoczenia przez skórę i inne tkanki.',
    detail: 'Fragmenty złamanej kości mogą się przesunąć również wtedy, gdy skóra nad nimi jest cała.',
  },
  open: {
    title: 'Złamanie otwarte',
    description: 'Rana w skórze łączy miejsce złamania z otoczeniem. Kość może być widoczna lub pozostać pod skórą.',
    detail: 'Połączenie z otoczeniem zwiększa ryzyko zakażenia kości i otaczających tkanek.',
  },
};

export const diseaseStageLabels = {
  healthy: 'Zdrowa kość',
  early: 'Wczesne zmiany',
  advanced: 'Zaawansowane zmiany',
};

export const diseaseStageNote = 'Model pokazuje przykładowe nasilenie zmian. Ich wygląd i przebieg mogą się różnić u poszczególnych osób.';

const healthyStage = {
  title: 'Zdrowa kość',
  description: 'Twarda warstwa zewnętrzna nadaje kości wytrzymałość. W jej wnętrzu beleczki kostne tworzą lekką sieć wokół przestrzeni ze szpikiem.',
};

export const diseases = {
  osteoporosis: {
    title: 'Osteoporoza',
    description: 'Ubywa tkanki kostnej, a jej wewnętrzna budowa staje się mniej wytrzymała. Przez to kość łatwiej się łamie.',
    stages: {
      healthy: healthyStage,
      early: {
        title: 'Cieńsze beleczki',
        description: 'Niektóre beleczki kostne stają się cieńsze, a odstępy między nimi rosną.',
      },
      advanced: {
        title: 'Ubytek tkanki kostnej',
        description: 'Sieć beleczek jest rzadsza, a twarda warstwa zewnętrzna cieńsza. Kość jest bardziej podatna na złamanie.',
      },
    },
    source: 'https://medlineplus.gov/osteoporosis.html',
  },
  osteomyelitis: {
    title: 'Zapalenie kości i szpiku',
    description: 'To zakażenie kości, najczęściej wywołane przez bakterie. Może objąć zarówno szpik, jak i twardą warstwę kości.',
    stages: {
      healthy: healthyStage,
      early: {
        title: 'Ognisko zapalenia',
        description: 'Kolor w przekroju wskazuje niewielki obszar szpiku objęty zapaleniem.',
      },
      advanced: {
        title: 'Rozleglejsze zapalenie',
        description: 'Zmiany obejmują większą część szpiku. Jeśli zapalenie sięga twardej warstwy kości, może ją uszkodzić.',
      },
    },
    source: 'https://medlineplus.gov/ency/article/000437.htm',
  },
  osteomalacia: {
    title: 'Osteomalacja',
    description: 'Nowa tkanka kostna zawiera zbyt mało składników mineralnych, przez co kość jest mniej twarda. Jedną z przyczyn może być długotrwały niedobór witaminy D.',
    stages: {
      healthy: healthyStage,
      early: {
        title: 'Słabsza mineralizacja',
        description: 'Zmiana odcienia kości oznacza, że w nowej tkance odkłada się za mało składników mineralnych.',
      },
      advanced: {
        title: 'Mniejsza odporność na obciążenia',
        description: 'Gorzej zmineralizowana kość jest mniej odporna na obciążenia i może ulec pęknięciu.',
      },
    },
    source: 'https://medlineplus.gov/ency/article/000376.htm',
  },
  paget: {
    title: 'Choroba Pageta kości',
    description: 'Część kości odnawia się zbyt szybko i traci regularną budowę. Może stać się grubsza, a mimo to słabsza.',
    stages: {
      healthy: healthyStage,
      early: {
        title: 'Miejscowa przebudowa',
        description: 'W części kości stara tkanka jest rozkładana i zastępowana nową szybciej niż zwykle.',
      },
      advanced: {
        title: 'Pogrubienie kości',
        description: 'Kość w miejscu zmian może się powiększyć, a beleczki w jej wnętrzu stają się grubsze i układają się nieregularnie.',
      },
    },
    source: 'https://medlineplus.gov/pagetsdiseaseofbone.html',
  },
};
