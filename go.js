(function () {
  'use strict';
  var ACCESS_CODE = 'Mavion';
  var ACCESS_KEY = 'mavion_go_access';
  var CHAT_KEY = 'mavion_go_chat_v1';
  var gate = document.getElementById('accessGate');
  var app = document.getElementById('goApp');
  var form = document.getElementById('accessForm');
  var codeInput = document.getElementById('accessCode');
  var error = document.getElementById('accessError');
  var messages = document.getElementById('messages');
  var messageForm = document.getElementById('messageForm');
  var messageInput = document.getElementById('messageInput');
  var title = document.getElementById('chatTitle');
  var status = document.getElementById('chatStatus');
  var courseList = document.getElementById('courseList');
  var tips = document.getElementById('tipsDialog');
  var currentCourse = 'Political Science';
  var workspace = document.getElementById('workspace');
  var safetyCard = document.getElementById('safetyCard');

  function escapeText(value) { var node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
  function nowTime() { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date()); }
  function seed() { return [{ text: 'Welcome to the study space. Tell me what you are working on and I can help you break it into steps.', self: false, time: nowTime() }]; }
  function getChats() { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (_) { return {}; } }
  function saveChats(chats) { localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); }
  function render() {
    var chats = getChats();
    var list = chats[currentCourse] || seed();
    messages.innerHTML = list.map(function (m) { return '<li class="message' + (m.self ? ' self' : '') + '"><p>' + escapeText(m.text) + '</p><time>' + escapeText(m.time) + '</time></li>'; }).join('');
    messages.scrollTop = messages.scrollHeight;
  }
  function enter() { gate.hidden = true; app.hidden = false; render(); messageInput.focus(); }
  function openWorkspace() { workspace.hidden = false; safetyCard.hidden = false; workspace.scrollIntoView({ behavior: 'smooth', block: 'start' }); messageInput.focus(); }
  function addMessage(text, self) {
    var chats = getChats(); var list = chats[currentCourse] || seed();
    list.push({ text: text, self: self, time: nowTime() }); chats[currentCourse] = list; saveChats(chats); render();
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (codeInput.value.trim() !== ACCESS_CODE) { error.hidden = false; codeInput.select(); return; }
    sessionStorage.setItem(ACCESS_KEY, '1'); error.hidden = true; enter();
  });
  codeInput.addEventListener('input', function () { error.hidden = true; });
  document.getElementById('lockButton').addEventListener('click', function () { sessionStorage.removeItem(ACCESS_KEY); app.hidden = true; gate.hidden = false; codeInput.value = ''; codeInput.focus(); });
  document.getElementById('startButton').addEventListener('click', openWorkspace);
  document.getElementById('hubButton').addEventListener('click', openWorkspace);
  messageForm.addEventListener('submit', function (event) { event.preventDefault(); var text = messageInput.value.trim(); if (!text) return; addMessage(text, true); messageInput.value = ''; messageInput.style.height = ''; status.textContent = 'Your study message was saved on this device'; });
  messageInput.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 130) + 'px'; });
  courseList.addEventListener('click', function (event) { var item = event.target.closest('.course'); if (!item) return; currentCourse = item.dataset.course; document.querySelectorAll('.course').forEach(function (course) { course.classList.toggle('active', course === item); }); title.textContent = currentCourse + ' study chat'; status.textContent = 'Tutoring prompts ready'; render(); });
  document.querySelectorAll('[data-open-course]').forEach(function (button) { button.addEventListener('click', function () { var choice = button.dataset.openCourse; var item = document.querySelector('.course[data-course="' + choice + '"]'); if (item) item.click(); openWorkspace(); }); });
  document.getElementById('clearChat').addEventListener('click', function () { if (window.confirm('Clear saved study messages on this device?')) { localStorage.removeItem(CHAT_KEY); render(); } });
  document.getElementById('helpButton').addEventListener('click', function () { tips.showModal(); });
  document.getElementById('closeTips').addEventListener('click', function () { tips.close(); });
  if (sessionStorage.getItem(ACCESS_KEY) === '1') enter();
}());
