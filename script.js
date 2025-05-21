const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const actionSelect = $('action-select');
const timeSelect = $('time-select');
const outputText = $('output-text');
const toggleThemeBtn = $('toggle-theme');
const languageIconsContainer = $('language-icons');
const copyToast = $('copy-toast');

let logData = [];
let isDarkTheme = true;
let currentLang = 'ru'; // Початкова мова

const colors = {
  "Все действия": "#d0d0d0",
  "Принял игрока в организацию": "#2e7d32",
  "Уволил игрока": "#b71c1c",
  "Подтверждает участие на мероприятие фракции": "#6a1b9a",
  "Изменил ранг игрока": "#4527a0",
  "Установил игроку тег": "#9e9d24",
  "Открыл склад организации": "#558b2f",
  "Закрыл склад организации": "#e64a19",
  "Дал выговор игроку": "#c62828",
  "Снял выговор с игрока": "#2e7d32",
  "Пополнил счет организации": "#388e3c",
  "Выдал премию": "#00796b",
  "Назначил собеседование": "#1976d2",
  "Отменил собеседование": "#f57c00",
  "Выпустил заключенного": "#0288d1",
  "Повысил срок заключенному": "#d84315"
};

function setLanguage(lang) {
  document.querySelectorAll('[data-key]').forEach(element => {
    const key = element.getAttribute('data-key');
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  updateDynamicTexts(lang);
  updateActiveLangIcon(lang);
}

function updateDynamicTexts(lang) {
  const themeIcon = toggleThemeBtn.querySelector('.material-icons');
  const themeLabel = toggleThemeBtn.querySelector('.material-label');
  themeLabel.textContent = isDarkTheme ? translations[lang].toggle_theme : translations[lang].toggle_theme_light;
  themeIcon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';

  const currentSelectedActionValue = actionSelect.value;
  actionSelect.innerHTML = `<option value="${translations[lang].all_actions}" data-key="all_actions">${translations[lang].all_actions}</option>`;
  
  let foundMatchForCurrentAction = false;
  actionMap.forEach(action => {
    const option = document.createElement('option');
    const translatedLabel = action[`label_${currentLang}`];
    option.value = translatedLabel;
    option.textContent = translatedLabel;
    actionSelect.appendChild(option);
    if (currentSelectedActionValue === translatedLabel) {
        foundMatchForCurrentAction = true;
    }
  });

  if (foundMatchForCurrentAction) {
      actionSelect.value = currentSelectedActionValue;
  } else {
      actionSelect.value = translations[lang].all_actions;
  }

  const periodOptions = timeSelect.querySelectorAll('option');
  periodOptions.forEach(option => {
      const key = option.getAttribute('value');
      if (translations[currentLang][`period_${key}`]) {
          option.textContent = translations[currentLang][`period_${key}`];
      }
  });
}

function updateActiveLangIcon(activeLang) {
  document.querySelectorAll('.lang-icon-btn').forEach(button => {
    if (button.getAttribute('data-lang') === activeLang) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});


toggleThemeBtn.addEventListener('click', () => {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);

  const icon = toggleThemeBtn.querySelector('.material-icons');
  const label = toggleThemeBtn.querySelector('.material-label');

  icon.style.opacity = label.style.opacity = '0';
  setTimeout(() => {
    icon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';
    label.textContent = isDarkTheme ? translations[currentLang].toggle_theme : translations[currentLang].toggle_theme_light;
    icon.style.opacity = label.style.opacity = '1';
  }, 200);
});

languageIconsContainer.addEventListener('click', (event) => {
  const targetButton = event.target.closest('.lang-icon-btn');
  if (targetButton) {
    const newLang = targetButton.getAttribute('data-lang');
    if (newLang && newLang !== currentLang) {
      currentLang = newLang;
      setLanguage(currentLang);
      applyFilters(); // Повторно застосовуємо фільтри, щоб оновити вивід з новим перекладом
    }
  }
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

    alert(translations[currentLang].file_uploaded_success);
    applyFilters();
  };
  reader.onerror = () => alert(translations[currentLang].file_upload_error);
  reader.readAsText(file, 'utf-8');
});

[actionSelect, timeSelect].forEach(el => el.addEventListener('change', applyFilters));


// Функція для визначення оригінальної дії та її перекладу
const getTranslatedActionAndOriginalLabel = (actionText, targetLang) => {
    let translatedActionText = actionText;
    let originalLabelForColor = "Все действия"; // Дефолтне значення для кольору

    // Ітеруємося по actionMap для пошуку ключових слів
    // Починаємо з найдовших ключових слів, щоб уникнути часткових збігів
    const sortedActionMap = [...actionMap].sort((a, b) => b.keyword.length - a.keyword.length);

    for (const action of sortedActionMap) {
        if (actionText.includes(action.keyword)) {
            const originalRuLabel = action.label_ru;
            const translatedLabel = action[`label_${targetLang}`];
            
            // Замінюємо лише перше входження, щоб уникнути проблем, якщо ключове слово зустрічається кілька разів
            translatedActionText = translatedActionText.replace(originalRuLabel, translatedLabel);
            originalLabelForColor = originalRuLabel; // Зберігаємо оригінальний ру-лейбл для кольору
            break; // Знайшли відповідність, виходимо
        }
    }
    
    return {
        translatedText: translatedActionText,
        originalLabelForColor: originalLabelForColor
    };
};


function applyFilters() {
  if (!logData.length) {
    outputText.textContent = translations[currentLang].upload_log_prompt;
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
    
    // Для фільтрації ми шукаємо відповідність за оригінальним російським ключовим словом
    const originalActionForFiltering = actionMap.find(({ keyword }) => entry.action.includes(keyword)) || {};
    const originalActionLabelForFiltering = originalActionForFiltering.label_ru || translations['ru'].all_actions;
    
    // Знаходимо оригінальну російську мітку для поточно вибраної дії у actionSelect
    const currentSelectedActionOriginalLabel = actionMap.find(action => action[`label_${currentLang}`] === selectedAction) || {};
    const filterByOriginalLabel = currentSelectedActionOriginalLabel.label_ru || translations['ru'].all_actions;


    return (selectedAction === translations[currentLang].all_actions || originalActionLabelForFiltering === filterByOriginalLabel) && entryTime >= cutoff;
  });

  outputText.textContent = filtered.length
    ? ""
    : translations[currentLang].no_records_found;

  if (filtered.length) displayResults(filtered);
}


function displayResults(results) {
  outputText.innerHTML = '';
  results.forEach((entry, i) => {
    const span = document.createElement('span');
    
    // Отримуємо перекладений текст дії та оригінальну мітку для визначення кольору
    const { translatedText, originalLabelForColor } = getTranslatedActionAndOriginalLabel(entry.action, currentLang);

    span.textContent = `[${entry.timestamp}] - ${translatedText}\n`;
    span.style.color = colors[originalLabelForColor]; // Використовуємо оригінальний ключ для кольору
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
