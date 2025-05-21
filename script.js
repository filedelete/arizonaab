const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const actionSelect = $('action-select');
const timeSelect = $('time-select');
const outputText = $('output-text');
const toggleThemeBtn = $('toggle-theme');
const copyToast = $('copy-toast');

let logData = [];
let isDarkTheme = true;

const actionMap = [
  { keyword: "уволил игрока", label: "Уволил игрока" },
  { keyword: "подтверждает участие", label: "Подтверждает участие на мероприятие фракции" },
  { keyword: "изменил ранг игрока", label: "Изменил ранг игрока" },
  { keyword: "установил игроку", label: "Установил игроку тег" },
  { keyword: "принял игрока", label: "Принял игрока в организацию" },
  { keyword: "открыл общак", label: "Открыл склад организации" },
  { keyword: "закрыл общак", label: "Закрыл склад организации" },
  { keyword: "дал выговор", label: "Дал выговор игроку" },
  { keyword: "снял выговор", label: "Снял выговор с игрока" },
  { keyword: "пополнил счет", label: "Пополнил счет организации" },
  { keyword: "выдал премию", label: "Выдал премию" },
  { keyword: "назначил собеседование", label: "Назначил собеседование" },
  { keyword: "отменил собеседование", label: "Отменил собеседование" },
  { keyword: "выпустил из тюрьмы заключенного", label: "Выпустил заключенного" },
  { keyword: "повысил срок заключенному", label: "Повысил срок заключенному" }
];

const colors = {
  "Все действия": "#d0d0d0", // Светло-серый фон для общего
  "Принял игрока в организацию": "#2e7d32", // Темно-зеленый (успех)
  "Уволил игрока": "#b71c1c", // Темно-красный (важное предупреждение)
  "Подтверждает участие на мероприятие фракции": "#6a1b9a", // Пурпурный (официально, важно)
  "Изменил ранг игрока": "#4527a0", // Тёмный индиго (ранги, статус)
  "Установил игроку тег": "#9e9d24", // Оливковый (метка)
  "Открыл склад организации": "#558b2f", // Тёмно-зеленый (доступ к складу)
  "Закрыл склад организации": "#e64a19", // Терракотовый (закрытие)
  "Дал выговор игроку": "#c62828", // Красный (выговор)
  "Снял выговор с игрока": "#2e7d32", // Зеленый (снятие выговора)
  "Пополнил счет организации": "#388e3c", // Ярко-зеленый (финансы)
  "Выдал премию": "#00796b", // Бирюзовый (премия)
  "Назначил собеседование": "#1976d2", // Ярко-синий (встреча)
  "Отменил собеседование": "#f57c00", // Оранжевый (отмена)
  "Выпустил заключенного": "#0288d1", // Голубой (освобождение)
  "Повысил срок заключенному": "#d84315"  // Оранжево-красный (срок)
};


toggleThemeBtn.addEventListener('click', () => {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);

  const icon = toggleThemeBtn.querySelector('.material-icons');
  const label = toggleThemeBtn.querySelector('.material-label');

  icon.style.opacity = label.style.opacity = '0';
  setTimeout(() => {
    icon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';
    label.textContent = isDarkTheme ? 'Сменить тему' : 'Вернуть тёмную тему';
    icon.style.opacity = label.style.opacity = '1';
  }, 200);
});

fileInput.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ({ target }) => {
    logData = target.result
      .split('\n')
      .map(line => {
        const m = line.match(/^(\d+)\. \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*)$/);
        return m ? { entry_number: m[1], timestamp: m[2], action: m[3].trim() } : null;
      })
      .filter(Boolean);

    alert("Файл успешно загружен");
    applyFilters();
  };
  reader.onerror = () => alert("Ошибка при загрузке файла");
  reader.readAsText(file, 'utf-8');
});

[actionSelect, timeSelect].forEach(el => el.addEventListener('change', applyFilters));

const extractActionDetails = text => 
  (actionMap.find(({ keyword }) => text.includes(keyword)) || {}).label || "Все действия";

function applyFilters() {
  if (!logData.length) {
    outputText.textContent = 'Пожалуйста, загрузите лог-файл.';
    return;
  }

  const selectedAction = actionSelect.value;
  const selectedTime = timeSelect.value;
  const timeMap = {
  week: 7,
  '2weeks': 14,
  '3weeks': 21,
  month: 30,
  '2months': 60,
  '3months': 90,
  year: 365
};

  const cutoff = Date.now() - (timeMap[selectedTime] || 0) * 86400000;

  const filtered = logData.filter(entry => {
    const entryTime = new Date(entry.timestamp).getTime();
    const type = extractActionDetails(entry.action);
    entry.type = type;
    return (selectedAction === "Все действия" || type === selectedAction) && entryTime >= cutoff;
  });

  outputText.textContent = filtered.length
    ? ""
    : 'Нет записей, соответствующих выбранным фильтрам.';

  if (filtered.length) displayResults(filtered);
}

function displayResults(results) {
  outputText.innerHTML = '';
  results.forEach((entry, i) => {
    const span = document.createElement('span');
    span.textContent = `[${entry.timestamp}] - ${entry.action}\n`;
    span.style.color = colors[entry.type] || colors["Все действия"];
    span.style.animationDelay = `${i * 50}ms`;

    span.addEventListener('click', () => {
      outputText.querySelectorAll('span.active').forEach(s => s.classList.remove('active'));
      span.classList.add('active');
    });

    span.addEventListener('dblclick', () => {
      navigator.clipboard.writeText(span.textContent).then(() => {
        copyToast.hidden = false;
        copyToast.classList.add('show');
        setTimeout(() => {
          copyToast.classList.remove('show');
          setTimeout(() => (copyToast.hidden = true), 500);
        }, 1500);
      }).catch(console.error);
    });

    outputText.appendChild(span);
  });
}
