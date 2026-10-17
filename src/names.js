const ruAdjectives = [
  "Квантовый", "Неоновый", "Северный", "Янтарный", "Лазурный",
  "Быстрый", "Звёздный", "Астральный", "Кибер", "Изумрудный",
  "Тихий", "Солнечный", "Лунный", "Серебряный", "Золотой",
  "Магнитный", "Космический", "Атласный", "Рассветный", "Глубокий",
  "Орбитальный", "Цифровой", "Кристальный", "Пламенный", "Векторный",
  "Штормовой", "Таинственный", "Полярный", "Яркий", "Гармоничный",
];

const ruNouns = [
  "Спутник", "Вектор", "Орион", "Пульсар", "Феникс",
  "Шторм", "Атлас", "Сокол", "Луч", "Горизонт",
  "Импульс", "Маяк", "Компас", "Призма", "Зенит",
  "Поток", "Ковчег", "Вихрь", "Спектр", "Страж",
  "Рубеж", "Радар", "Квазар", "Сигнал", "Пилот",
  "Генезис", "Синтез", "Контур", "Метеор", "Фокус",
];

const enAdjectives = [
  "Quantum", "Neon", "Northern", "Amber", "Azure",
  "Swift", "Stellar", "Astral", "Cyber", "Emerald",
  "Silent", "Solar", "Lunar", "Silver", "Golden",
  "Magnetic", "Cosmic", "Velvet", "Dawn", "Deep",
  "Orbital", "Digital", "Crystal", "Blazing", "Vector",
  "Storm", "Mystic", "Polar", "Vibrant", "Harmonic",
];

const enNouns = [
  "Satellite", "Vector", "Orion", "Pulsar", "Phoenix",
  "Storm", "Atlas", "Falcon", "Beam", "Horizon",
  "Pulse", "Beacon", "Compass", "Prism", "Zenith",
  "Stream", "Vessel", "Vortex", "Spectrum", "Sentinel",
  "Apex", "Radar", "Quasar", "Signal", "Pilot",
  "Genesis", "Synergy", "Circuit", "Meteor", "Focus",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomClientName() {
  const isEn = Math.random() < 0.5;
  if (isEn) {
    return `${pick(enAdjectives)} ${pick(enNouns)}`;
  }
  return `${pick(ruAdjectives)} ${pick(ruNouns)}`;
}
