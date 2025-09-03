const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const nicknameInput = $('nickname-input');
const actionSelect = $('action-select');
const timeSelect = $('time-select');
const outputText = $('output-text');
const toggleThemeBtn = $('toggle-theme');
const languageIconsContainer = $('language-icons');
const copyToast = $('copy-toast');
const actionsChartCanvas = $('actionsChart');
const chartLegendContainer = $('chart-legend');
const toggleStatsBtn = $('toggle-stats');
const chartWrapper = $('chart-wrapper');
const historyList = $('history-list');
const historyHeading = $('history-heading');
const fileUploadToast = $('file-upload-toast');

let logData = [];
let isDarkTheme = true;
let currentLang = 'ru';
let actionsChart;
let isStatsVisible = false;
let legendObserver;
let uploadedFilesHistory = [];
let activeHistoryItemIndex = -1;

// Обновленный объект colors с добавлением недостающих цветов
const colors = {
    "all_actions": "#d0d0d0",
    "action_admitted": "#4CAF50",
    "action_fired": "#F44336",
    "action_event_confirmed": "#2196F3",
    "action_rank_changed": "#FFEB3B",
    "action_tag_set": "#9C27B0",
    "action_warehouse_opened": "#FF9800",
    "action_warehouse_closed": "#795548",
    "action_warning_given": "#E91E63",
    "action_warning_removed": "#00BCD4",
    "action_account_replenished": "#8BC34A",
    "action_account_withdrawn": "#FF5722", // Новый цвет для снятия со счета
    "action_bonus_issued": "#FFC107",
    "action_interview_scheduled": "#673AB7",
    "action_interview_cancelled": "#B0BEC5",
    "action_prisoner_released": "#607D8B",
    "action_prisoner_term_increased": "#C62828"
};

// Обновленная функция getActionColor
function getActionColor(actionId) {
    return colors[actionId] || "#d0d0d0";
}

const getActionTextById = (actionId) => {
    const selectedTranslation = translations[currentLang];
    for (const key in selectedTranslation) {
        if (key.startsWith('action_') && key === actionId) {
            return selectedTranslation[key];
        }
    }
    return '';
};

function updateContent() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    const actionSelectElement = $('action-select');
    const selectedActionKey = actionSelectElement.options[actionSelectElement.selectedIndex]?.getAttribute('data-key') || 'all_actions';
    actionSelectElement.innerHTML = '';

    let allActionsOption = document.createElement('option');
    allActionsOption.textContent = translations[currentLang].all_actions;
    allActionsOption.setAttribute('data-key', 'all_actions');
    allActionsOption.value = 'all_actions';
    actionSelectElement.appendChild(allActionsOption);

    const actionKeywords = [
        'action_admitted', 'action_fired', 'action_event_confirmed', 'action_rank_changed',
        'action_tag_set', 'action_warehouse_opened', 'action_warehouse_closed',
        'action_warning_given', 'action_warning_removed', 'action_account_replenished',
        'action_account_withdrawn', 'action_bonus_issued', 'action_interview_scheduled', 
        'action_interview_cancelled', 'action_prisoner_released', 'action_prisoner_term_increased'
    ];
    actionKeywords.forEach(key => {
        if (translations[currentLang][key]) {
            let option = document.createElement('option');
            option.textContent = translations[currentLang][key];
            option.value = key;
            option.setAttribute('data-key', key);
            actionSelectElement.appendChild(option);
        }
    });
    
    actionSelectElement.querySelectorAll('option').forEach(option => {
        if (option.getAttribute('data-key') === selectedActionKey) {
            option.selected = true;
        }
    });

    const timeSelectElement = $('time-select');
    const selectedTimeKey = timeSelectElement.options[timeSelectElement.selectedIndex]?.getAttribute('data-key') || 'period_all';
    timeSelectElement.innerHTML = `
        <option data-key="period_all" value="all">${translations[currentLang].period_all}</option>
        <option data-key="period_day" value="day">${translations[currentLang].period_day}</option>
        <option data-key="period_week" value="week">${translations[currentLang].period_week}</option>
        <option data-key="period_2weeks" value="2weeks">${translations[currentLang].period_2weeks}</option>
        <option data-key="period_month" value="month">${translations[currentLang].period_month}</option>
        <option data-key="period_2months" value="2months">${translations[currentLang].period_2months}</option>
        <option data-key="period_3months" value="3months">${translations[currentLang].period_3months}</option>
        <option data-key="period_year" value="year">${translations[currentLang].period_year}</option>
    `;
    
    timeSelectElement.querySelectorAll('option').forEach(option => {
        if (option.getAttribute('data-key') === selectedTimeKey) {
            option.selected = true;
        }
    });

    $('nickname-input').placeholder = translations[currentLang].enter_nickname_placeholder || "Введите никнейм...";
}

// Обновленная функция extractActionId с добавлением недостающих действий
function extractActionId(actionString) {
    const lower = actionString.toLowerCase();

    const actionKeywords = [
        { keyword: "назначил собеседование", id: "action_interview_scheduled" },
        { keyword: "отменил собеседование", id: "action_interview_cancelled" },
        { keyword: "подтверждает участие", id: "action_event_confirmed" },
        { keyword: "принял игрока", id: "action_admitted" },
        { keyword: "уволил игрока", id: "action_fired" },
        { keyword: "изменил ранг", id: "action_rank_changed" },
        { keyword: "установил игроку тег", id: "action_tag_set" },
        { keyword: "открыл склад", id: "action_warehouse_opened" },
        { keyword: "закрыл склад", id: "action_warehouse_closed" },
        { keyword: "дал выговор", id: "action_warning_given" },
        { keyword: "снял выговор", id: "action_warning_removed" },
        { keyword: "пополнил счет", id: "action_account_replenished" },
        { keyword: "снял со счета", id: "action_account_withdrawn" }, // Новое действие
        { keyword: "выдал премию", id: "action_bonus_issued" },
        { keyword: "выпустил заключенного", id: "action_prisoner_released" },
        { keyword: "повысил срок", id: "action_prisoner_term_increased" }
    ];

    for (const { keyword, id } of actionKeywords) {
        if (lower.includes(keyword)) {
            return id;
        }
    }

    return "all_actions";
}

// Обновленная функция extractActionDetails
function extractActionDetails(actionString) {
    const actionId = extractActionId(actionString);
    return translations[currentLang][actionId] || translations[currentLang].all_actions;
}

document.addEventListener('DOMContentLoaded', () => {
    currentLang = localStorage.getItem('lang') || 'ru';
    isDarkTheme = localStorage.getItem('theme') === 'dark';
    applyTheme(isDarkTheme);

    updateContent();
    loadHistoryFromLocalStorage();
    if (uploadedFilesHistory.length === 0) {
        applyFilters();
    }
});

languageIconsContainer.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
        currentLang = e.target.dataset.lang;
        localStorage.setItem('lang', currentLang);
        updateContent();
        applyFilters();
        updateChart(logData);
        displayHistory();
    }
});

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

                        const m = line.match(/^\s*\d+\s*\|\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*→?\s*(.*)$/);

                        if (m) {
                            const timestamp = m[1];
                            const actionText = m[2];

                            const cleanAction = actionText.replace(/^Игрок\s+[A-Za-z_]+(\s*\([^)]+\))?\s*/i, "").trim();

                            let detectedNicknames = [];
                            const nicknameRegex = /(?:Лидер|игроку|Игрок|с игрока|ник|фракции):\s*([A-Za-z_]+)/g;
                            let nicknameMatch;
                            while ((nicknameMatch = nicknameRegex.exec(actionText)) !== null) {
                                detectedNicknames.push(nicknameMatch[1]);
                            }
                            const combinedNicknames = detectedNicknames.map(n => n.toLowerCase()).join(' ');

                            return {
                                timestamp: timestamp,
                                action: actionText,
                                nicknames: combinedNicknames,
                                type: extractActionDetails(cleanAction),
                                typeId: extractActionId(cleanAction)
                            };
                        } else {
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
        
        results.forEach(result => {
            uploadedFilesHistory.push({
                name: result.name,
                timestamp: result.timestamp,
                parsedLogData: result.parsedLogData
            });
        });
        
        activeHistoryItemIndex = uploadedFilesHistory.length - 1;
        logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
        
        console.log(`Successfully processed ${results.length} files. Last loaded file has ${logData.length} entries.`);

        saveHistoryToLocalStorage();
        displayHistory();
        applyFilters();
        fileInput.value = '';

        console.log('Attempting to show file upload toast:', fileUploadToast);
        fileUploadToast.textContent = translations[currentLang].file_uploaded_success;
        fileUploadToast.classList.add('show');
        setTimeout(() => {
            fileUploadToast.classList.remove('show');
        }, 5000);

    } catch (error) {
        console.error("Error processing files in Promise.all:", error);
        outputText.textContent = translations[currentLang].file_upload_error + ": " + error.message;
    }
});

function applyFilters() {
    console.log("Applying filters...");
    let filteredData = logData;

    const selectedAction = actionSelect.value;
    const selectedTimePeriod = timeSelect.value;
    const nicknameFilter = nicknameInput.value.toLowerCase().trim();

    if (selectedAction !== 'all_actions') {
        filteredData = filteredData.filter(entry => entry.typeId === selectedAction);
    }

    const now = new Date();
    let cutoff = 0;
    if (selectedTimePeriod === 'day') {
        cutoff = now.setDate(now.getDate() - 1);
    } else if (selectedTimePeriod === 'week') {
        cutoff = now.setDate(now.getDate() - 7);
    } else if (selectedTimePeriod === '2weeks') {
        cutoff = now.setDate(now.getDate() - 14);
    } else if (selectedTimePeriod === 'month') {
        cutoff = now.setMonth(now.getMonth() - 1);
    } else if (selectedTimePeriod === '2months') {
        cutoff = now.setMonth(now.getMonth() - 2);
    } else if (selectedTimePeriod === '3months') {
        cutoff = now.setMonth(now.getMonth() - 3);
    } else if (selectedTimePeriod === 'year') {
        cutoff = now.setFullYear(now.getFullYear() - 1);
    }

    filteredData = filteredData.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= cutoff;
    });

    if (nicknameFilter) {
        filteredData = filteredData.filter(entry => {
            return (entry.action && entry.action.toLowerCase().includes(nicknameFilter)) ||
                   (entry.nicknames && entry.nicknames.includes(nicknameFilter));
        });
    }

    displayResults(filteredData);
    updateChart(filteredData);
    console.log("Filters applied. Filtered entries:", filteredData.length);
}

function displayResults(data) {
    outputText.innerHTML = '';
    
    if (data.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = translations[currentLang].no_results;
        outputText.appendChild(noResults);
        return;
    }

    const sortedData = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedData.forEach(entry => {
        const entryEl = document.createElement('div');
        entryEl.className = 'log-entry';
        entryEl.style.color = getActionColor(entry.typeId);
        
        const textContent = `${entry.timestamp} ${entry.action}`;
        entryEl.textContent = textContent;
        entryEl.dataset.fullText = textContent;

        entryEl.addEventListener('click', function(e) {
            document.querySelectorAll('.log-entry').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');
            e.stopPropagation();
        });

        entryEl.addEventListener('dblclick', function(e) {
            navigator.clipboard.writeText(this.dataset.fullText)
                .then(() => {
                    copyToast.textContent = translations[currentLang].copied_toast;
                    copyToast.classList.add('show');
                    setTimeout(() => copyToast.classList.remove('show'), 2000);
                })
                .catch(err => console.error('Copy failed:', err));
            e.stopPropagation();
        });

        outputText.appendChild(entryEl);
    });
}

actionSelect.addEventListener('change', applyFilters);
timeSelect.addEventListener('change', applyFilters);
nicknameInput.addEventListener('input', applyFilters);

function updateChart(data) {
    if (actionsChart) {
        actionsChart.destroy();
    }

    if (!data || data.length === 0) {
        chartLegendContainer.innerHTML = `<p>${translations[currentLang].no_chart_data}</p>`;
        return;
    }

    const actionCounts = {};
    data.forEach(entry => {
        const actionType = entry.typeId;
        actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
    });

    const labels = Object.keys(actionCounts);
    const counts = Object.values(actionCounts);
    const displayLabels = labels.map(id => translations[currentLang][id] || id);
    const backgroundColors = labels.map(id => colors[id] || '#9E9E9E');

    actionsChart = new Chart(actionsChartCanvas, {
        type: 'pie',
        data: {
            labels: displayLabels,
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

    updateChartLegend(displayLabels, backgroundColors, counts);
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

function saveHistoryToLocalStorage() {
    localStorage.setItem('uploadedFilesHistory', JSON.stringify(uploadedFilesHistory));
}

function loadHistoryFromLocalStorage() {
    const storedHistory = localStorage.getItem('uploadedFilesHistory');
    if (storedHistory) {
        uploadedFilesHistory = JSON.parse(storedHistory);
        
        if (uploadedFilesHistory.length > 0) {
            if (activeHistoryItemIndex !== -1 && uploadedFilesHistory[activeHistoryItemIndex]) {
                logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
            } else {
                activeHistoryItemIndex = uploadedFilesHistory.length - 1;
                logData = uploadedFilesHistory[activeHistoryItemIndex].parsedLogData;
            }
        } else {
            logData = [];
            activeHistoryItemIndex = -1;
        }

        displayHistory();
        applyFilters();
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
        deleteBtn.title = translations[currentLang].delete_item || "Удалить";
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

            logData = fileEntry.parsedLogData;
            console.log("Log data reloaded from history. Entries:", logData.length);
            applyFilters();
        });
        historyList.appendChild(historyItem);
    });
}

function deleteHistoryItem(indexToDelete) {
    if (confirm(translations[currentLang].confirm_delete_history || "Вы уверены, что хотите удалить этот элемент истории?")) {
        uploadedFilesHistory.splice(indexToDelete, 1);

        if (activeHistoryItemIndex === indexToDelete) {
            logData = [];
            outputText.textContent = translations[currentLang].upload_log_prompt;
            activeHistoryItemIndex = -1;
            updateChart([]);
        } else if (activeHistoryItemIndex > indexToDelete) {
            activeHistoryItemIndex--;
        }

        saveHistoryToLocalStorage();
        displayHistory();
        applyFilters();
    }
}
