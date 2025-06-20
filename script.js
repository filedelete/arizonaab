const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const nicknameInput = $('nickname-input');
const actionSelect = $('action-select');
const timeSelect = $('time-select');
const outputText = $('output-text');
const toggleThemeBtn = $('toggle-theme');
const languageIconsContainer = $('language-icons');
const copyToast = $('copy-toast');
const actionsChartCanvas = $('actionsChart'); // Canvas для графика
const chartLegendContainer = $('chart-legend'); // Контейнер для легенды
const toggleStatsBtn = $('toggle-stats'); // Кнопка переключения статистики
const chartWrapper = $('chart-wrapper'); // Обертка для графика и легенды
const historyList = $('history-list'); // Список для истории загрузок
const historyHeading = $('history-heading'); // Заголовок истории
const fileUploadToast = $('file-upload-toast');

// Изменено: logData теперь будет содержать ОБЪЕДИНЕННЫЕ данные из всех загруженных файлов.
let logData = [];
let isDarkTheme = true;
let currentLang = 'ru';
let actionsChart; // Объявляем переменную для экземпляра Chart.js
let isStatsVisible = false; // Состояние видимости статистики
let legendObserver; // Объявляем MutationObserver
// Изменено: uploadedFilesHistory теперь будет хранить массив объектов, каждый из которых представляет загруженный файл.
let uploadedFilesHistory = []; // Массив для хранения истории загруженных файлов
let activeHistoryItemIndex = -1; // Индекс текущего выделенного элемента истории (в uploadedFilesHistory)

const colors = {
  "Все действия": "#d0d0d0",
  "Принял игрока в организацию": "#4CAF50", // Green
  "Уволил игрока": "#F44336", // Red
  "Подтверждает участие на мероприятие фракции": "#2196F3", // Blue
  "Изменил ранг игрока": "#FFEB3B", // Yellow
  "Установил игроку тег": "#9C27B0", // Purple
  "Открыл склад организации": "#FF9800", // Orange
  "Закрыл склад организации": "#795548", // Brown
  "Дал выговор игроку": "#E91E63", // Pink
  "Снял выговор с игрока": "#00BCD4", // Cyan
  "Пополнил счет организации": "#8BC34A", // Light Green
  "Выдал премию": "#FFC107", // Amber
  "Назначил собеседование": "#673AB7", // Deep Purple
  "Отменил собеседование": "#B0BEC5", // Blue Grey
  "Выпустил заключенного": "#607D8B", // Slate Grey
  "Повысил срок заключенному": "#C62828", // Dark Red
  // Добавьте другие действия и цвета по мере необходимости
};
// Функция для получения цвета по действию, адаптированная под translations.js
function getActionColor(actionKeyword) {
    // Находим ключевое слово действия в translations.actionLabels и соответствующий цвет
    const actionTranslation = actionLabels.find(item => item.keyword === actionKeyword);
    if (actionTranslation && colors[actionTranslation.label_ru]) { // Используем label_ru для поиска цвета
        return colors[actionTranslation.label_ru];
    }
    // Если точное совпадение не найдено, ищем по подстроке для более общих случаев
    for (const key in colors) {
        if (actionKeyword.includes(key) && key !== "Все действия") { // Избегаем "Все действия" как общего совпадения
             return colors[key];
        }
    }
    return "#d0d0d0"; // Default color if no specific action color is found
}


// Вспомогательная функция для получения текста действия по его идентификатору (для select'ов)
const getActionTextById = (actionId) => {
    const selectedTranslation = translations[currentLang];
    for (const key in selectedTranslation) {
        if (key.startsWith('action_') && key === actionId) {
            return selectedTranslation[key];
        }
    }
    return '';
};

// Функция для обновления текста на странице в зависимости от выбранного языка
function updateContent() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    // Обновление опций в action-select
    const actionSelectElement = $('action-select');
    const selectedActionKey = actionSelectElement.options[actionSelectElement.selectedIndex]?.getAttribute('data-key') || 'all_actions'; // Сохраняем data-key текущего выбора
    actionSelectElement.innerHTML = ''; // Очищаем существующие опции

    // Добавляем опцию "Все действия"
    let allActionsOption = document.createElement('option');
    allActionsOption.textContent = translations[currentLang].all_actions;
    allActionsOption.setAttribute('data-key', 'all_actions');
    actionSelectElement.appendChild(allActionsOption);

    // Добавляем остальные действия
    const actionKeywords = [
        'action_admitted', 'action_fired', 'action_event_confirmed', 'action_rank_changed',
        'action_tag_set', 'action_warehouse_opened', 'action_warehouse_closed',
        'action_warning_given', 'action_warning_removed', 'action_account_replenished',
        'action_bonus_issued', 'action_interview_scheduled', 'action_interview_cancelled',
        'action_prisoner_released', 'action_prisoner_term_increased'
    ];
    actionKeywords.forEach(key => {
        if (translations[currentLang][key]) {
            let option = document.createElement('option');
            option.textContent = translations[currentLang][key];
            option.value = translations[currentLang][key]; // Значение опции - переведенный текст
            option.setAttribute('data-key', key);
            actionSelectElement.appendChild(option);
        }
    });
    // Восстанавливаем предыдущий выбор действия
    actionSelectElement.querySelectorAll('option').forEach(option => {
        if (option.getAttribute('data-key') === selectedActionKey) {
            option.selected = true;
        }
    });


    // Обновление опций в time-select
    const timeSelectElement = $('time-select');
    const selectedTimeKey = timeSelectElement.options[timeSelectElement.selectedIndex]?.getAttribute('data-key') || 'period_all'; // Сохраняем data-key текущего выбора
    timeSelectElement.innerHTML = `
        <option data-key="period_all">${translations[currentLang].period_all}</option>
        <option data-key="period_day">${translations[currentLang].period_day}</option>
        <option data-key="period_week">${translations[currentLang].period_week}</option>
        <option data-key="period_2weeks">${translations[currentLang].period_2weeks}</option>
        <option data-key="period_month">${translations[currentLang].period_month}</option>
    `;
    // Восстанавливаем предыдущий выбор периода
    timeSelectElement.querySelectorAll('option').forEach(option => {
        if (option.getAttribute('data-key') === selectedTimeKey) {
            option.selected = true;
        }
    });

    // Обновляем placeholder для input'а никнейма
    $('nickname-input').placeholder = translations[currentLang].enter_nickname_placeholder || "Введите никнейм...";
}

// Загрузка языка по умолчанию и при изменении
document.addEventListener('DOMContentLoaded', () => {
    currentLang = localStorage.getItem('lang') || 'ru';
    isDarkTheme = localStorage.getItem('theme') === 'dark';
    applyTheme(isDarkTheme); // Применяем сохраненную тему

    updateContent();
    loadHistoryFromLocalStorage();
    // Применяем фильтры при загрузке страницы, чтобы обновить отображение
    // После загрузки истории, logData будет содержать данные из истории.
    // applyFilters() будет вызвана внутри loadHistoryFromLocalStorage()
    // или при инициализации, если история пуста.
    if (uploadedFilesHistory.length === 0) {
        applyFilters(); // Применяем фильтры только если история пуста, иначе loadHistoryFromLocalStorage это сделает
    }
});

// Переключение языка
languageIconsContainer.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
        currentLang = e.target.dataset.lang;
        localStorage.setItem('lang', currentLang);
        updateContent();
        applyFilters(); // Обновляем фильтры, так как тексты действий могли измениться
        updateChart(logData); // Обновляем график
        displayHistory(); // Обновляем историю
    }
});

// Переключение темы
toggleThemeBtn.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    applyTheme(isDarkTheme);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
});

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        toggleThemeBtn.querySelector('.material-icons').textContent = 'light_mode';
        toggleThemeBtn.querySelector('.material-label').textContent = translations[currentLang].toggle_theme_light;
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        toggleThemeBtn.querySelector('.material-icons').textContent = 'dark_mode';
        toggleThemeBtn.querySelector('.material-label').textContent = translations[currentLang].toggle_theme_dark;
    }
}

// Извлечение типа действия
function extractActionDetails(actionString) {
    const selectedTranslation = translations[currentLang];
    for (const key in selectedTranslation) {
        if (key.startsWith('action_')) {
            const translatedAction = selectedTranslation[key];
            // Используем includes для более гибкого соответствия
            if (actionString.includes(translatedAction)) {
                return translatedAction;
            }
        }
    }
    // Если точного совпадения нет, пытаемся найти по ключевым словам из списка actionKeywords в translations.js
    const actionKeywords = [
        { keyword: "принял игрока", label_key: "action_admitted" },
        { keyword: "уволил игрока", label_key: "action_fired" },
        { keyword: "подтверждает участие на мероприятие фракции", label_key: "action_event_confirmed" },
        { keyword: "изменил ранг игрока", label_key: "action_rank_changed" },
        { keyword: "установил игроку тег", label_key: "action_tag_set" },
        { keyword: "открыл общак", label_key: "action_warehouse_opened" },
        { keyword: "закрыл общак", label_key: "action_warehouse_closed" },
        { keyword: "дал выговор", label_key: "action_warning_given" },
        { keyword: "снял выговор", label_key: "action_warning_removed" },
        { keyword: "пополнил счет организации", label_key: "action_account_replenished" },
        { keyword: "выдал премию", label_key: "action_bonus_issued" },
        { keyword: "назначил собеседование", label_key: "action_interview_scheduled" },
        { keyword: "отменил собеседование", label_key: "action_interview_cancelled" },
        { keyword: "выпустил заключенного", label_key: "action_prisoner_released" },
        { keyword: "повысил срок заключенному", label_key: "action_prisoner_term_increased" }
    ];

    const lowerCaseActionString = actionString.toLowerCase();
    for (const actionDef of actionKeywords) {
        if (lowerCaseActionString.includes(actionDef.keyword.toLowerCase())) {
            return translations[currentLang][actionDef.label_key] || actionDef.keyword;
        }
    }
    return translations[currentLang].all_actions; // По умолчанию, если не найдено
}

// Очищаем текущие данные лога и историю перед загрузкой новых файлов
  logData = [];
  uploadedFilesHistory = [];
  
// Обработка загрузки файлов
fileInput.addEventListener('change', async e => {
    console.log("File input change event triggered.");
    const files = e.target.files;
    if (!files || files.length === 0) {
        console.log("No files selected.");
        return;
    }

    const promises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ({ target }) => {
                const fileContent = target.result;
                console.log(`Reading file: ${file.name}. Content length: ${fileContent.length}`);

                const parsedLogDataForThisFile = fileContent
                    .split('\n')
                    .map(originalLine => {
                        const line = originalLine.trim();

                        if (line.length === 0) {
                            return null;
                        }

                        if (line.startsWith('👤 Антиблат игрока')) {
                            console.log("Skipping header line:", line);
                            return null;
                        }

                        // Усиленное регулярное выражение
                        const m = line.match(/^\W*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*)$/);

                        if (m) {
                            const timestamp = m[1];
                            const actionText = m[2];
                            // console.log("Parsed line (timestamp, actionText):", { timestamp, actionText }); // Отключено для уменьшения спама в консоли

                            let detectedNicknames = [];
                            // Более универсальный regex для никнеймов, который также захватывает никнеймы после "Игрок:", "Лидер:", "игроку", "с игрока", "ник:"
                            const nicknameRegex = /(?:Лидер|игроку|Игрок|с игрока|ник):\s*([A-Za-z_]+)/g;
                            let nicknameMatch;
                            while ((nicknameMatch = nicknameRegex.exec(actionText)) !== null) {
                                detectedNicknames.push(nicknameMatch[1]);
                            }
                            const combinedNicknames = detectedNicknames.map(n => n.toLowerCase()).join(' ');

                            return {
                                timestamp: timestamp,
                                action: actionText,
                                nicknames: combinedNicknames,
                                type: extractActionDetails(actionText) // Определяем тип действия сразу при парсинге
                            };
                        } else {
                            // console.warn("Line did not match regex:", line); // Отключено для уменьшения спама в консоли
                            return null;
                        }
                    })
                    .filter(Boolean);

                console.log(`File: ${file.name} parsed. Found ${parsedLogDataForThisFile.length} valid entries.`);
                resolve({
                    name: file.name,
                    timestamp: new Date().toLocaleString(),
                    parsedLogData: parsedLogDataForThisFile
                });
            };
            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                reject(translations[currentLang].file_upload_error);
            };
            reader.readAsText(file, 'utf-8');
        });
    });

    try {
        const results = await Promise.all(promises);
        
        // --- ИЗМЕНЕНИЕ ЛОГИКИ ДЛЯ МУЛЬТИЗАГРУЗКИ В ИСТОРИИ ---
        // Каждый загруженный файл добавляем как отдельный элемент в историю
        results.forEach(result => {
            uploadedFilesHistory.push({
                name: result.name,
                timestamp: result.timestamp,
                parsedLogData: result.parsedLogData
            });
        });
        
        // Устанавливаем активный элемент истории на последний загруженный файл
        activeHistoryItemIndex = uploadedFilesHistory.length - 1;
        // Загружаем данные последнего добавленного файла в logData
        logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
        
        console.log(`Successfully processed ${results.length} files. Last loaded file has ${logData.length} entries.`);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ЛОГИКИ ---

        saveHistoryToLocalStorage();
        displayHistory(); // Обновить список истории
        applyFilters(); // Применить фильтры к текущим данным (logData)
        fileInput.value = ''; // Очищаем input для возможности повторной загрузки тех же файлов

        // <--- ДОБАВЛЕНИЕ УВЕДОМЛЕНИЯ ОБ УСПЕШНОЙ ЗАГРУЗКЕ
        console.log('Attempting to show file upload toast:', fileUploadToast);
		fileUploadToast.textContent = translations[currentLang].file_uploaded_success;
        fileUploadToast.classList.add('show');
        setTimeout(() => {
            fileUploadToast.classList.remove('show');
        }, 5000);
        // ДОБАВЛЕНИЕ УВЕДОМЛЕНИЯ ОБ УСПЕШНОЙ ЗАГРУЗКЕ --->

    } catch (error) {
        console.error("Error processing files in Promise.all:", error);
        outputText.textContent = translations[currentLang].file_upload_error + ": " + error.message;
    }
});


// Применение фильтров и отображение результатов
function applyFilters() {
    console.log("Applying filters...");
    let filteredData = logData; // Начинаем с текущих данных в logData

    const selectedAction = actionSelect.value;
    const selectedTimePeriod = timeSelect.options[timeSelect.selectedIndex].getAttribute('data-key'); // Получаем data-key
    const nicknameFilter = nicknameInput.value.toLowerCase().trim();

    // Фильтрация по действию
    // Убедимся, что entry.type уже установлен из extractActionDetails при парсинге
    if (selectedAction !== translations[currentLang].all_actions) {
        filteredData = filteredData.filter(entry => entry.type === selectedAction);
    }

    // Фильтрация по времени
    const now = new Date();
    let cutoff = 0;
    if (selectedTimePeriod === 'period_day') {
        cutoff = now.setDate(now.getDate() - 1);
    } else if (selectedTimePeriod === 'period_week') {
        cutoff = now.setDate(now.getDate() - 7);
    } else if (selectedTimePeriod === 'period_2weeks') {
        cutoff = now.setDate(now.getDate() - 14);
    } else if (selectedTimePeriod === 'period_month') {
        cutoff = now.setMonth(now.getMonth() - 1);
    } else if (selectedTimePeriod === 'period_2months') { // Добавлены из index.html
        cutoff = now.setMonth(now.getMonth() - 2);
    } else if (selectedTimePeriod === 'period_3months') { // Добавлены из index.html
        cutoff = now.setMonth(now.getMonth() - 3);
    } else if (selectedTimePeriod === 'period_year') { // Добавлены из index.html
        cutoff = now.setFullYear(now.getFullYear() - 1);
    }


    filteredData = filteredData.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        // entry.type уже должен быть установлен при парсинге.
        // entry.type = extractActionDetails(entry.action); // Эту строку можно убрать, если type устанавливается при парсинге
        return entryTime >= cutoff;
    });

    // Фильтрация по никнейму
    if (nicknameFilter) {
        filteredData = filteredData.filter(entry => {
            // Проверяем и action, и nicknames
            return (entry.action && entry.action.toLowerCase().includes(nicknameFilter)) ||
                   (entry.nicknames && entry.nicknames.includes(nicknameFilter));
        });
    }

    displayResults(filteredData);
    updateChart(filteredData);
    console.log("Filters applied. Filtered entries:", filteredData.length);
}

// Отображение результатов
function displayResults(data) {
    if (data.length === 0) {
        outputText.textContent = translations[currentLang].no_results; // No results found after filters
        console.log("No results to display.");
        return;
    }
    // Сортировка данных от новых к старым (по убыванию timestamp)
    const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lines = sortedData.map(entry => `▶️ ${entry.timestamp} ${entry.action}`);
    outputText.textContent = lines.join('\n');
    console.log(`Displaying ${lines.length} lines.`);
}

// Слушатели событий для фильтров
actionSelect.addEventListener('change', applyFilters);
timeSelect.addEventListener('change', applyFilters);
nicknameInput.addEventListener('input', applyFilters); // Использование 'input' для живого поиска

// Статистика
function updateChart(data) {
    if (actionsChart) {
        actionsChart.destroy(); // Уничтожаем старый график, если существует
    }

    if (!data || data.length === 0) {
        chartLegendContainer.innerHTML = `<p>${translations[currentLang].no_chart_data}</p>`;
        return;
    }

    const actionCounts = {};
    data.forEach(entry => {
        const actionType = entry.type;
        actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
    });

    const labels = Object.keys(actionCounts);
    const counts = Object.values(actionCounts);
    const backgroundColors = labels.map(label => colors[label] || '#9E9E9E');

    actionsChart = new Chart(actionsChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors,
                borderWidth: 1,
                borderColor: isDarkTheme ? '#121212' : '#f4f4f4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + ' (' + ((context.parsed / counts.reduce((a, b) => a + b, 0)) * 100).toFixed(1) + '%)';
                            }
                            return label;
                        }
                    }
                }
            },
            onResize: function(chart, size) {
                // ...
            }
        }
    });

    updateChartLegend(labels, backgroundColors, counts);
}

function updateChartLegend(labels, backgroundColors, counts) {
    chartLegendContainer.innerHTML = '';
    if (labels.length === 0) {
        chartLegendContainer.innerHTML = `<p>${translations[currentLang].no_chart_data}</p>`;
        return;
    }

    const total = counts.reduce((sum, current) => sum + current, 0);

    labels.forEach((label, index) => {
        const percentage = total > 0 ? ((counts[index] / total) * 100).toFixed(1) : 0;
        const legendItem = document.createElement('div');
        legendItem.classList.add('chart-legend-item');
        legendItem.innerHTML = `
            <span class="legend-color-box" style="background-color: ${backgroundColors[index]};"></span>
            <span class="legend-label">${label}: ${counts[index]} (${percentage}%)</span>
        `;
        chartLegendContainer.appendChild(legendItem);
    });
}

// Переключение видимости статистики
toggleStatsBtn.addEventListener('click', () => {
    isStatsVisible = !isStatsVisible;
    if (isStatsVisible) {
        chartWrapper.classList.remove('hidden-chart-wrapper');
        toggleStatsBtn.querySelector('.material-label').textContent = translations[currentLang].hide_stats;
        updateChart(logData);
    } else {
        chartWrapper.classList.add('hidden-chart-wrapper');
        toggleStatsBtn.querySelector('.material-label').textContent = translations[currentLang].show_stats;
    }
});


// Копирование текста в буфер обмена
outputText.addEventListener('click', () => {
    if (outputText.textContent === translations[currentLang].upload_log_prompt ||
        outputText.textContent === translations[currentLang].no_results) { // Also check for no_results
        return;
    }
    navigator.clipboard.writeText(outputText.textContent)
        .then(() => {
            copyToast.classList.add('show');
            setTimeout(() => {
                copyToast.classList.remove('show');
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            alert(translations[currentLang].copy_error);
        });
});

// История загрузок
function saveHistoryToLocalStorage() {
    localStorage.setItem('uploadedFilesHistory', JSON.stringify(uploadedFilesHistory));
}

function loadHistoryFromLocalStorage() {
    const storedHistory = localStorage.getItem('uploadedFilesHistory');
    if (storedHistory) {
        uploadedFilesHistory = JSON.parse(storedHistory);
        
        // При загрузке истории из localStorage, нам нужно установить активный элемент.
        // Если история не пуста, по умолчанию выбираем последний загруженный файл.
        if (uploadedFilesHistory.length > 0) {
            // Если activeHistoryItemIndex был сохранен и валиден, используем его
            if (activeHistoryItemIndex !== -1 && uploadedFilesHistory[activeHistoryItemIndex]) {
                logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
            } else {
                // Иначе, по умолчанию выбираем последний элемент в истории
                activeHistoryItemIndex = uploadedFilesHistory.length - 1;
                logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
            }
        } else {
            logData = []; // Если история пуста, очищаем logData
            activeHistoryItemIndex = -1;
        }

        displayHistory();
        applyFilters(); // Применяем фильтры к данным, загруженным из истории
    }
}

function displayHistory() {
    historyList.innerHTML = '';
    if (uploadedFilesHistory.length === 0) {
        historyList.innerHTML = `<p>${translations[currentLang].no_records_found_history}</p>`;
        return;
    }

    uploadedFilesHistory.forEach((fileEntry, index) => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        if (index === activeHistoryItemIndex) {
            historyItem.classList.add('active');
        }
        historyItem.setAttribute('data-index', index);

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('file-name');
        nameSpan.textContent = fileEntry.name;

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = fileEntry.timestamp;

        historyItem.appendChild(nameSpan);
        historyItem.appendChild(timestampSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-history-item');
        deleteBtn.innerHTML = '<span class="material-icons">delete_outline</span>';
        deleteBtn.title = translations[currentLang].delete_item || "Удалить"; // Fallback title
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(index);
        });
        historyItem.appendChild(deleteBtn);


        historyItem.addEventListener('click', () => {
            console.log(`History item clicked: ${fileEntry.name} (index: ${index})`);
            document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
            historyItem.classList.add('active');
            activeHistoryItemIndex = index;

            logData = fileEntry.parsedLogData; // Переключаем logData на данные выбранного элемента истории
            console.log("Log data reloaded from history. Entries:", logData.length);
            applyFilters();
        });
        historyList.appendChild(historyItem);
    });
}

function deleteHistoryItem(indexToDelete) {
    if (confirm(translations[currentLang].confirm_delete_history || "Вы уверены, что хотите удалить этот элемент истории?")) { // Fallback confirmation
        uploadedFilesHistory.splice(indexToDelete, 1);

        if (activeHistoryItemIndex === indexToDelete) {
            // Если удалили активный элемент, очищаем logData
            logData = [];
            outputText.textContent = translations[currentLang].upload_log_prompt;
            activeHistoryItemIndex = -1; // Сброс активного элемента
            updateChart([]); // Очистка графика
        } else if (activeHistoryItemIndex > indexToDelete) {
            // Если активный элемент был после удаленного, сдвигаем индекс
            activeHistoryItemIndex--;
        }

        saveHistoryToLocalStorage(); // Сохранить изменения в Local Storage
        displayHistory(); // Обновить отображение истории

        // После удаления, если logData была очищена, applyFilters ничего не покажет.
        // Если logData не была очищена (т.е. активный элемент не удалялся), то фильтры применятся к текущей logData.
        applyFilters();
    }
}