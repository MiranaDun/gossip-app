// Функция для отправки сообщения
async function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message');
    const message = messageInput.value;
    
    if (!message) return;

    try {
        console.log('Sending message:', message);
        const response = await fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            messageInput.value = '';
            // Добавляем анимацию успешной отправки
            const button = document.querySelector('.input-form button');
            button.textContent = 'Отправлено!';
            setTimeout(() => {
                button.textContent = 'Отправить';
            }, 2000);
        } else {
            showError(data.error || 'Ошибка при отправке сообщения');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Ошибка при отправке сообщения: ' + error);
    }
}

// Функция для скрытия старых логов
function hideOldLogs() {
    const logContainer = document.getElementById('logContainer');
    const logEntries = logContainer.getElementsByClassName('log-entry');
    const now = new Date();
    
    // Скрываем логи старше 5 минут
    for (let entry of logEntries) {
        const timestamp = entry.querySelector('.timestamp').textContent;
        const logTime = new Date(timestamp);
        const diffMinutes = (now - logTime) / (1000 * 60);
        
        if (diffMinutes > 5) {
            entry.style.display = 'none';
        }
    }
    
    // Показываем сообщение о скрытых логах
    const message = document.createElement('div');
    message.className = 'info-message';
    message.textContent = 'Старые логи скрыты. Нажмите "Обновить" чтобы увидеть все логи.';
    logContainer.insertBefore(message, logContainer.firstChild);
    
    // Меняем текст кнопки
    const clearButton = document.querySelector('.clear-button');
    clearButton.textContent = 'Показать все логи';
    clearButton.onclick = showAllLogs;
}

// Функция для показа всех логов
function showAllLogs() {
    const logContainer = document.getElementById('logContainer');
    const logEntries = logContainer.getElementsByClassName('log-entry');
    
    // Показываем все скрытые логи
    for (let entry of logEntries) {
        entry.style.display = '';
    }
    
    // Удаляем информационное сообщение
    const infoMessage = logContainer.querySelector('.info-message');
    if (infoMessage) {
        infoMessage.remove();
    }
    
    // Возвращаем текст кнопки
    const clearButton = document.querySelector('.clear-button');
    clearButton.textContent = 'Скрыть старые логи';
    clearButton.onclick = hideOldLogs;
}

// Функция для отображения ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.input-section').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}


