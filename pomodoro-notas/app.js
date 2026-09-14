(() => {
  const RING_CIRCUMFERENCE = 2 * Math.PI * 90;

  const els = {
    timeLabel: document.getElementById('timeLabel'),
    activeTaskLabel: document.getElementById('activeTaskLabel'),
    ringProgress: document.getElementById('ringProgress'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    sessionCount: document.getElementById('sessionCount'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    taskForm: document.getElementById('taskForm'),
    taskInput: document.getElementById('taskInput'),
    taskList: document.getElementById('taskList'),
    workMin: document.getElementById('workMin'),
    shortMin: document.getElementById('shortMin'),
    longMin: document.getElementById('longMin'),
    dingSound: document.getElementById('dingSound'),
  };

  const STORAGE_KEY = 'pomodoro-notas-state-v1';

  const modeColors = { work: '--accent', short: '--short', long: '--long' };

  let state = loadState();
  let timerId = null;
  let remainingSeconds = getDurationSeconds(state.mode);
  let running = false;

  function loadState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    return Object.assign({
      tasks: [],
      activeTaskId: null,
      mode: 'work',
      sessionCount: 0,
      durations: { work: 25, short: 5, long: 15 },
      lastDate: new Date().toDateString(),
    }, saved || {});
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }

  function resetDailyCountIfNewDay() {
    const today = new Date().toDateString();
    if (state.lastDate !== today) {
      state.lastDate = today;
      state.sessionCount = 0;
      saveState();
    }
  }

  function getDurationSeconds(mode) {
    return state.durations[mode] * 60;
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateDisplay() {
    els.timeLabel.textContent = formatTime(remainingSeconds);
    const total = getDurationSeconds(state.mode);
    const fraction = total > 0 ? remainingSeconds / total : 0;
    els.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
    els.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);
    els.ringProgress.style.stroke = `var(${modeColors[state.mode]})`;

    const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
    els.activeTaskLabel.textContent = activeTask ? activeTask.name : 'Sin tarea activa';

    els.sessionCount.textContent = state.sessionCount;
    document.title = `${formatTime(remainingSeconds)} · Pomodoro`;
  }

  function setMode(mode, { resetTimer = true } = {}) {
    state.mode = mode;
    els.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    if (resetTimer) {
      remainingSeconds = getDurationSeconds(mode);
    }
    updateDisplay();
    saveState();
  }

  function tick() {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      handleSessionComplete();
      return;
    }
    updateDisplay();
  }

  function handleSessionComplete() {
    playDing();
    if (state.mode === 'work') {
      state.sessionCount += 1;
      const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
      if (activeTask) {
        activeTask.pomodoros = (activeTask.pomodoros || 0) + 1;
      }
      const nextMode = state.sessionCount % 4 === 0 ? 'long' : 'short';
      stopTimer();
      setMode(nextMode);
      renderTasks();
    } else {
      stopTimer();
      setMode('work');
    }
    saveState();
  }

  function playDing() {
    try {
      els.dingSound.currentTime = 0;
      els.dingSound.play().catch(() => {});
    } catch (e) {
      /* audio unavailable, ignore */
    }
  }

  function startTimer() {
    if (running) return;
    running = true;
    els.startBtn.disabled = true;
    els.pauseBtn.disabled = false;
    timerId = setInterval(tick, 1000);
  }

  function stopTimer() {
    running = false;
    els.startBtn.disabled = false;
    els.pauseBtn.disabled = true;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function resetTimer() {
    stopTimer();
    remainingSeconds = getDurationSeconds(state.mode);
    updateDisplay();
  }

  function renderTasks() {
    els.taskList.innerHTML = '';
    if (state.tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Aún no hay tareas. Añade una para empezar.';
      els.taskList.appendChild(empty);
      return;
    }

    state.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.id === state.activeTaskId ? ' selected' : '') + (task.done ? ' done' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!task.done;
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        saveState();
        renderTasks();
      });

      const name = document.createElement('span');
      name.className = 'task-name';
      name.textContent = task.name;
      name.title = 'Click para marcar como tarea activa';
      name.addEventListener('click', () => {
        state.activeTaskId = state.activeTaskId === task.id ? null : task.id;
        saveState();
        renderTasks();
        updateDisplay();
      });

      const pomCount = document.createElement('span');
      pomCount.className = 'task-pomodoros';
      pomCount.textContent = '🍅'.repeat(Math.min(task.pomodoros || 0, 5)) + (task.pomodoros > 5 ? ` +${task.pomodoros - 5}` : '') || '0';

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Eliminar tarea');
      del.addEventListener('click', () => {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        if (state.activeTaskId === task.id) state.activeTaskId = null;
        saveState();
        renderTasks();
        updateDisplay();
      });

      li.append(checkbox, name, pomCount, del);
      els.taskList.appendChild(li);
    });
  }

  function addTask(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const task = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: trimmed, pomodoros: 0, done: false };
    state.tasks.push(task);
    if (!state.activeTaskId) state.activeTaskId = task.id;
    saveState();
    renderTasks();
    updateDisplay();
  }

  els.startBtn.addEventListener('click', startTimer);
  els.pauseBtn.addEventListener('click', stopTimer);
  els.resetBtn.addEventListener('click', resetTimer);

  els.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stopTimer();
      setMode(btn.dataset.mode);
    });
  });

  els.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(els.taskInput.value);
    els.taskInput.value = '';
    els.taskInput.focus();
  });

  [['workMin', 'work'], ['shortMin', 'short'], ['longMin', 'long']].forEach(([elId, modeKey]) => {
    els[elId].value = state.durations[modeKey];
    els[elId].addEventListener('change', () => {
      const val = Math.max(1, parseInt(els[elId].value, 10) || 1);
      state.durations[modeKey] = val;
      els[elId].value = val;
      saveState();
      if (state.mode === modeKey && !running) {
        remainingSeconds = getDurationSeconds(modeKey);
        updateDisplay();
      }
    });
  });

  resetDailyCountIfNewDay();
  setMode(state.mode, { resetTimer: true });
  renderTasks();
  updateDisplay();
})();
