// ============================================================
// COURSES + GLOSSARY + ONBOARDING — UI modals pédagogiques
// ============================================================
// ============================================================
// COURS PÉDAGOGIQUES — 5 modules ICT pour débutants
// ============================================================



let currentCourseChapter = '1.1';
const COURSE_READ_KEY = 'course_read_chapters';
let readCourseChapters = new Set(JSON.parse(localStorage.getItem(COURSE_READ_KEY) || '[]'));


function renderCourseQuiz(chapterId){
  const quiz = COURSE_QUIZZES[chapterId];
  if(!quiz) return '';
  return `
    <div class="quiz-block">
      <div class="quiz-header">
        <span class="emoji">🧠</span>
        <h3>${quiz.title}</h3>
      </div>
      <p class="quiz-sub">${quiz.after}</p>
      ${quiz.questions.map((q, qi) => `
        <div class="quiz-question" data-q="${qi}">
          <div class="quiz-q-text">${qi + 1}. ${q.q}</div>
          <div class="quiz-options">
            ${q.options.map((opt, oi) => `
              <div class="quiz-option" data-opt="${oi}" data-correct="${oi === q.correct ? '1' : '0'}">${opt}</div>
            `).join('')}
          </div>
          <div class="quiz-explanation"><strong>Explication :</strong> ${q.explain}</div>
        </div>
      `).join('')}
      <div class="quiz-score" id="course-quiz-score-${chapterId}">
        <div class="score-value">— / ${quiz.questions.length}</div>
        <div class="score-msg"></div>
      </div>
    </div>
  `;
}

function wireCourseQuiz(chapterId){
  const quiz = COURSE_QUIZZES[chapterId];
  if(!quiz) return;
  const block = document.querySelector('.course-content .quiz-block');
  if(!block) return;
  const answered = new Set();
  block.querySelectorAll('.quiz-question').forEach((qEl, qi) => {
    const opts = qEl.querySelectorAll('.quiz-option');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        if(answered.has(qi)) return;
        answered.add(qi);
        const correctIdx = quiz.questions[qi].correct;
        opts.forEach((o, oi) => {
          o.classList.add('locked');
          if(oi === correctIdx) o.classList.add('correct');
          else if(o === opt) o.classList.add('wrong');
        });
        qEl.querySelector('.quiz-explanation').classList.add('visible');
        if(answered.size === quiz.questions.length){
          const correct = [...block.querySelectorAll('.quiz-question')]
            .filter(q => q.querySelector('.quiz-option.correct') && !q.querySelector('.quiz-option.wrong')).length;
          const score = document.getElementById('course-quiz-score-' + chapterId);
          score.classList.add('visible');
          score.querySelector('.score-value').textContent = `${correct} / ${quiz.questions.length}`;
          const pct = correct / quiz.questions.length;
          score.querySelector('.score-msg').textContent =
            pct === 1 ? '🎉 Parfait ! Tu as tout compris.'
            : pct >= 0.66 ? '👍 Bien ! Re-lis les explications.'
            : '📚 Re-lis le module avant de continuer.';
          localStorage.setItem('course_quiz_' + chapterId, correct);
        }
      });
    });
  });
}

function markCourseRead(chapterId){
  if(readCourseChapters.has(chapterId)) return;
  readCourseChapters.add(chapterId);
  localStorage.setItem(COURSE_READ_KEY, JSON.stringify([...readCourseChapters]));
  const a = document.querySelector(`#course-toc .chapter[data-chap="${chapterId}"]`);
  if(a) a.classList.add('read');
  updateCourseProgress();
}

function updateCourseProgress(){
  const all = COURSE_MODULES.flatMap(m => m.chapters.map(c => c.id));
  const read = all.filter(id => readCourseChapters.has(id)).length;
  const fill = document.getElementById('course-progress-fill');
  const text = document.getElementById('course-progress-text');
  if(fill) fill.style.width = (read / all.length * 100) + '%';
  if(text) text.textContent = `${read} / ${all.length} chapitres lus`;
}

function renderCourseTOC(){
  const toc = document.getElementById('course-toc');
  toc.innerHTML = `
    <div class="course-progress">
      <div class="course-progress-label">
        <span>Progression</span>
        <span id="course-progress-text">0 / 27</span>
      </div>
      <div class="course-progress-bar"><div class="course-progress-fill" id="course-progress-fill"></div></div>
    </div>
  ` + COURSE_MODULES.map(m => `
    <details ${m.id === 'M1' ? 'open' : ''}>
      <summary>${m.title}</summary>
      ${m.chapters.map(c => `<a class="chapter ${c.id === currentCourseChapter ? 'active' : ''} ${readCourseChapters.has(c.id) ? 'read' : ''}" data-chap="${c.id}">${c.title}</a>`).join('')}
    </details>
  `).join('');
  toc.querySelectorAll('.chapter').forEach(a => {
    a.addEventListener('click', () => loadCourseChapter(a.dataset.chap));
  });
  updateCourseProgress();
}

function loadCourseChapter(id){
  currentCourseChapter = id;
  const content = COURSES[id] || '<p>Chapitre à venir.</p>';
  const quizHtml = renderCourseQuiz(id);
  const allChapters = COURSE_MODULES.flatMap(m => m.chapters.map(c => c.id));
  const idx = allChapters.indexOf(id);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;
  document.getElementById('course-content').innerHTML = content + quizHtml + `
    <div class="lesson-nav">
      <button ${!prev ? 'disabled' : ''} data-chap="${prev || ''}">← Précédent</button>
      <button ${!next ? 'disabled' : ''} data-chap="${next || ''}">Suivant →</button>
    </div>
  `;
  document.querySelectorAll('#course-toc .chapter').forEach(a => {
    a.classList.toggle('active', a.dataset.chap === id);
  });
  document.querySelectorAll('#course-content .lesson-nav button').forEach(b => {
    if(b.dataset.chap) b.addEventListener('click', () => loadCourseChapter(b.dataset.chap));
  });
  if(quizHtml) wireCourseQuiz(id);
  setTimeout(() => markCourseRead(id), 4000);
  document.getElementById('course-content').scrollTop = 0;
}

function wireCourses(){
  const modal = document.getElementById('modal-courses');
  document.getElementById('open-courses').addEventListener('click', () => openCourse());
  document.getElementById('btn-close-courses').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
}

function openCourse(chapterId){
  const modal = document.getElementById('modal-courses');
  modal.classList.add('open');
  renderCourseTOC();
  loadCourseChapter(chapterId || currentCourseChapter);
}


// ONBOARDING — tour guidé au 1er lancement
// ============================================================


let _onbStep = 0;

function showOnboardingStep(){
  const s = ONBOARDING_STEPS[_onbStep];
  document.getElementById('onb-emoji').textContent = s.emoji;
  document.getElementById('onb-title').textContent = s.title;
  document.getElementById('onb-content').innerHTML = s.html;
  document.getElementById('onb-step-num').textContent = (_onbStep + 1);
  document.getElementById('onb-progress-fill').style.width = ((_onbStep + 1) / ONBOARDING_STEPS.length * 100) + '%';
  document.getElementById('onb-prev').disabled = _onbStep === 0;
  document.getElementById('onb-prev').style.opacity = _onbStep === 0 ? '0.3' : '1';
  document.getElementById('onb-next').textContent = _onbStep === ONBOARDING_STEPS.length - 1 ? '🚀 Commencer' : 'Suivant →';
}

function startOnboarding(){
  _onbStep = 0;
  document.getElementById('modal-onboarding').classList.add('open');
  showOnboardingStep();
}

function endOnboarding(){
  document.getElementById('modal-onboarding').classList.remove('open');
  localStorage.setItem('onboarding_done', 'true');
}

function wireOnboarding(){
  document.getElementById('onb-next').addEventListener('click', () => {
    if(_onbStep < ONBOARDING_STEPS.length - 1){
      _onbStep++;
      showOnboardingStep();
    } else {
      endOnboarding();
    }
  });
  document.getElementById('onb-prev').addEventListener('click', () => {
    if(_onbStep > 0){
      _onbStep--;
      showOnboardingStep();
    }
  });
  document.getElementById('onb-skip').addEventListener('click', endOnboarding);

  // Auto-show si jamais fait
  if(!localStorage.getItem('onboarding_done')){
    // Petit délai pour que l'app se charge d'abord
    setTimeout(() => startOnboarding(), 800);
  }
}

// Expose pour pouvoir relancer le tour depuis Paramètres
window.startOnboarding = startOnboarding;

// ============================================================
// FEATURE #1 — MOCK DATA RÉALISTE (cycles AMD, sweeps, OB)
// ============================================================


// FEATURE #12 — GLOSSAIRE ICT
// ============================================================


function renderGlossary(filter = ''){
  const list = document.getElementById('glossary-list');
  const f = filter.toLowerCase().trim();
  list.innerHTML = GLOSSARY.map(g => {
    const matches = !f || g.term.toLowerCase().includes(f) || (g.abbr || '').toLowerCase().includes(f) || g.def.toLowerCase().includes(f);
    return `<div class="glossary-item${matches ? '' : ' hidden'}">
      <div class="glossary-term">${g.term}${g.abbr ? `<span class="glossary-abbr">${g.abbr}</span>` : ''}</div>
      <div class="glossary-def">${g.def}</div>
    </div>`;
  }).join('');
}

function wireGlossary(){
  const modal = document.getElementById('modal-glossary');
  const openGlossary = () => {
    modal.classList.add('open');
    renderGlossary();
    setTimeout(() => document.getElementById('glossary-search').focus(), 100);
  };
  document.getElementById('open-glossary').addEventListener('click', openGlossary);
  // Bouton mobile dans le drawer
  const mobileBtn = document.getElementById('open-glossary-mobile');
  if(mobileBtn) mobileBtn.addEventListener('click', () => {
    document.getElementById('side-panel').classList.remove('open');
    openGlossary();
  });
  document.getElementById('btn-close-glossary').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  document.getElementById('glossary-search').addEventListener('input', e => renderGlossary(e.target.value));
}

// ============================================================
