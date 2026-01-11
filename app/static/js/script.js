let audioFiles = [];
let currentMonth = new Date();
let entriesData = {};

// Screen navigation
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'viewEntries') {
    loadEntriesData();
    renderCalendar();
  } else if (screenId === 'newEntry') {
    resetNewEntryScreen();
  }
}

// File Upload Handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const saveBtn = document.getElementById('saveBtn');
const errorMessage = document.getElementById('errorMessage');

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragging');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragging');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragging');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

async function handleFiles(files) {
  for (let file of files) {
    if (file.type.startsWith('audio/')) {
      const duration = await getAudioDuration(file);
      audioFiles.push({
        file: file,
        name: file.name,
        duration: duration,
        id: Date.now() + Math.random()
      });
    }
  }
  renderFileList();
  updateSaveButton();
}

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    });
  });
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderFileList() {
  fileList.innerHTML = audioFiles.map((file, index) => `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-duration">${formatDuration(file.duration)}</span>
                    </div>
                    <button class="remove-file-btn" onclick="removeFile(${index})">Remove</button>
                </div>
            `).join('');
}

function removeFile(index) {
  audioFiles.splice(index, 1);
  renderFileList();
  updateSaveButton();
}

function updateSaveButton() {
  saveBtn.disabled = audioFiles.length === 0;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
  setTimeout(() => errorMessage.classList.remove('active'), 5000);
}

async function saveEntries() {
  if (audioFiles.length === 0) return;

  saveBtn.disabled = true;
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  progressContainer.style.display = 'block';

  try {
    const formData = new FormData();
    audioFiles.forEach((fileObj, index) => {
      formData.append('audio_files', fileObj.file);
    });

    const response = await fetch('http://localhost:5000/save_entry', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to save entries');
    }

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressFill.style.width = progress + '%';
      progressFill.textContent = progress + '%';

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          showScreen('mainMenu');
        }, 500);
      }
    }, 300);

  } catch (error) {
    showError('Error saving entries: ' + error.message);
    saveBtn.disabled = false;
    progressContainer.style.display = 'none';
  }
}

function resetNewEntryScreen() {
  audioFiles = [];
  fileInput.value = '';
  renderFileList();
  updateSaveButton();
  document.getElementById('progressContainer').style.display = 'none';
  document.getElementById('progressFill').style.width = '0%';
  errorMessage.classList.remove('active');
}

// Calendar Functions
async function loadEntriesData() {
  try {
    const response = await fetch('http://localhost:5000/get_entries');
    if (!response.ok) throw new Error('Failed to load entries');
    entriesData = await response.json();
  } catch (error) {
    console.error('Error loading entries:', error);
    entriesData = {};
  }
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('calendarMonth').textContent =
    currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  // Day headers
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day other-month';
    grid.appendChild(empty);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;

    if (entriesData[dateStr] && entriesData[dateStr].length > 0) {
      dayCell.classList.add('has-entries');
    }

    if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
      dayCell.classList.add('today');
    }

    dayCell.onclick = () => showEntriesForDate(dateStr);
    grid.appendChild(dayCell);
  }
}

function changeMonth(delta) {
  if (delta === 0) {
    currentMonth = new Date();
  } else {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  }
  renderCalendar();
}

function showEntriesForDate(dateStr) {
  const entries = entriesData[dateStr];
  if (!entries || entries.length === 0) {
    return;
  }

  const modal = document.getElementById('entriesModal');
  const modalDate = document.getElementById('modalDate');
  const entriesList = document.getElementById('entriesList');
  const entryDetail = document.getElementById('entryDetail');

  modalDate.textContent = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  entriesList.innerHTML = entries.map(entry => `
                <div class="entry-list-item" onclick="showEntryDetail('${entry.id}')">
                    <h3>${entry.title}</h3>
                    <p>${entry.time}</p>
                </div>
            `).join('');

  entryDetail.style.display = 'none';
  modal.classList.add('active');
}

async function showEntryDetail(entryId) {
  try {
    const response = await fetch(`http://localhost:5000/get_entry/${entryId}`);
    if (!response.ok) throw new Error('Failed to load entry');

    const entry = await response.json();
    const entryDetail = document.getElementById('entryDetail');

    entryDetail.innerHTML = `
                    <button class="back-btn" onclick="hideEntryDetail()">← Back to List</button>
                    <h3>${entry.title}</h3>
                    <div class="audio-player">
                        <audio controls src="http://localhost:5000/audio/${entry.audio_file}"></audio>
                    </div>
                    <div class="transcription">
                        ${entry.transcription}
                    </div>
                `;

    document.getElementById('entriesList').style.display = 'none';
    entryDetail.style.display = 'block';
  } catch (error) {
    console.error('Error loading entry detail:', error);
  }
}

function hideEntryDetail() {
  document.getElementById('entriesList').style.display = 'block';
  document.getElementById('entryDetail').style.display = 'none';
}

function closeModal() {
  document.getElementById('entriesModal').classList.remove('active');
  hideEntryDetail();
}

// Close modal on outside click
document.getElementById('entriesModal').addEventListener('click', (e) => {
  if (e.target.id === 'entriesModal') {
    closeModal();
  }
});
