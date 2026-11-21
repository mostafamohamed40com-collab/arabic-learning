(() => {
  const STORAGE_KEY = "alam-al-dad-progress-v1";
  const POINTS_PER_QUESTION = 20;
  const $ = (id) => document.getElementById(id);
  const arabic = (n) => Number(n).toLocaleString("ar-EG");
  const state = loadState();
  let currentStage = 0;
  let currentQuestion = 0;
  let answered = false;
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {earned: Array.isArray(saved.earned) ? saved.earned : [], completedStages: Array.isArray(saved.completedStages) ? saved.completedStages : [], studentName: typeof saved.studentName === "string" ? saved.studentName : ""};
    } catch (_) { return {earned: [], completedStages: [], studentName: ""}; }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function renderStudent() {
    const name = state.studentName.trim();
    const overlay = $("welcomeOverlay");
    const main = $("siteMain");
    if (name) {
      overlay.classList.add("is-hidden");
      main.classList.remove("site-locked");
      $("topUser").hidden = false;
      $("studentNameLabel").textContent = name;
      $("welcomeInline").textContent = `أهلًا يا ${name}، مستعد لرحلة في عالم الضاد؟`;
    } else {
      overlay.classList.remove("is-hidden");
      main.classList.add("site-locked");
      $("topUser").hidden = true;
      $("studentNameInput").focus();
    }
  }
  $("welcomeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("studentNameInput").value.trim();
    if (!name) { showToast("اكتب اسمك أولًا لنبدأ الرحلة."); return; }
    state.studentName = name;
    saveState();
    renderStudent();
    showToast(`أهلًا يا ${name}! رحلتك بدأت ⭐`);
  });
  function points() { return state.earned.length * POINTS_PER_QUESTION; }
  function stageQuestions(stage) { return window.QUIZ_QUESTIONS.filter(q => q.stage === stage); }
  function showToast(message) {
    const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function renderProgress() {
    const total = points(), percent = Math.round(total / 300 * 100);
    $("headerPoints").textContent = arabic(total);
    $("totalPoints").textContent = arabic(total);
    $("overallProgress").style.width = percent + "%";
    $("progressPercent").textContent = arabic(percent) + "٪";
    $("progressMessage").textContent = total === 0 ? "كل بداية جميلة تبدأ بخطوة." : total === 300 ? "رائع! أتممت رحلة عالم الضاد." : "أحسنت! واصل حتى تفتح الشارة التالية.";
    [100,200,300].forEach((threshold,i) => {
      const unlocked = total >= threshold;
      $("badge"+i).classList.toggle("unlocked", unlocked);
      $("badgeState"+i).textContent = unlocked ? "✓ تم فتح الشارة" : "🔒 متبقي " + arabic(Math.max(0,threshold-total)) + " نقطة";
    });
    for(let i=0;i<3;i++) {
      const done = state.completedStages.includes(i);
      const available = i===0 || state.completedStages.includes(i-1);
      const card = document.querySelector(`[data-stage="${i}"]`);
      card.classList.toggle("locked", !available);
      card.classList.toggle("active", available && !done);
      $("stageStatus"+i).textContent = done ? "✓ اكتملت المرحلة" : available ? "متاحة الآن" : "🔒 أكمل المرحلة السابقة";
    }
  }
  function openStage(stage) {
    const available = stage===0 || state.completedStages.includes(stage-1);
    if (!available) { showToast("أكمل المرحلة السابقة أولًا 🔒"); return; }
    currentStage=stage; currentQuestion=0; answered=false; renderQuestion();
    $("quizArea").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function renderQuestion() {
    const qs=stageQuestions(currentStage), q=qs[currentQuestion], globalIndex=window.QUIZ_QUESTIONS.indexOf(q);
    const done=state.completedStages.includes(currentStage);
    if(done) { renderStageComplete(); return; }
    const already=state.earned.includes(globalIndex);
    answered=already;
    const options=q.options || [];
    let optionHtml=options.map((option,i)=>`<button class="answer-option" data-answer="${i}" ${already?"disabled":""}>${String.fromCharCode(1571+i)}) ${option}</button>`).join("");
    $("quizArea").innerHTML=`
      <div class="quiz-top"><span>🏛️ ${["بوابة المعرفة","ميدان التحديات","تحدي أمير البيان"][currentStage]}</span><strong>السؤال ${arabic(currentQuestion+1)} من ٥</strong></div>
      <div class="question-progress"><span style="width:${(currentQuestion+1)/5*100}%"></span></div>
      <div class="question-type">${q.type}</div><h3 class="question-text">${q.text}</h3>
      ${options.length ? `<div class="answers">${optionHtml}</div>` : `<div class="example"><span>فكّر واكتب إجابتك في ذهنك أو في كراستك</span><strong>${q.model}</strong><small>اقرأ الإجابة النموذجية، ثم قيّم إجابتك بأمانة.</small></div>`}
      <div id="feedbackArea">${already?`<div class="feedback good">✓ حصلت على نقاط هذا السؤال من قبل.<p>${q.explain}</p></div>`:""}</div>
      <div class="quiz-controls"><span class="muted-small">النقاط المكتسبة في هذه المرحلة: ${arabic(qs.filter(item=>state.earned.includes(window.QUIZ_QUESTIONS.indexOf(item))).length*20)} / ١٠٠</span><button class="btn btn-gold" id="nextQuestion" ${already?"":"disabled"}>${currentQuestion===4?"إنهاء المرحلة":"السؤال التالي ←"}</button></div>`;
    if(options.length) {
      $("quizArea").querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",()=>chooseAnswer(Number(btn.dataset.answer),globalIndex,q)));
    } else if(!already) {
      $("feedbackArea").innerHTML=`<div class="feedback">الإجابة النموذجية: ${q.model}<p>${q.explain}</p></div><div class="self-check"><button id="selfCorrect">إجابتي صحيحة (+٢٠ نقطة)</button><button id="selfReview">سأراجع الإجابة</button></div>`;
      $("selfCorrect").addEventListener("click",()=>award(globalIndex,q));
      $("selfReview").addEventListener("click",()=>{showToast("راجع الإجابة النموذجية وحاول في المرة القادمة."); $("selfReview").disabled=true;});
    }
    $("nextQuestion").addEventListener("click",()=> {
      if(!state.earned.includes(globalIndex)) return;
      if(currentQuestion<4){currentQuestion++;renderQuestion();}
      else completeStage();
    });
  }
  function chooseAnswer(choice,index,q) {
    if(state.earned.includes(index)) return;
    const buttons=[...$("quizArea").querySelectorAll("[data-answer]")];
    buttons.forEach(b=>b.disabled=true);
    const correct=choice===q.correct;
    buttons[q.correct].classList.add("correct");
    if(!correct) buttons[choice].classList.add("wrong");
    $("feedbackArea").innerHTML=`<div class="feedback ${correct?"good":"bad"}">${correct?"✓ إجابة صحيحة! حصلت على ٢٠ نقطة.":"✕ إجابة غير صحيحة. لا تُحتسب نقاط لهذا السؤال."}<p>${q.explain}</p></div>`;
    if(correct) award(index,q,false);
    else { $("nextQuestion").disabled=false; $("nextQuestion").textContent=currentQuestion===4?"إنهاء المرحلة":"السؤال التالي ←"; $("nextQuestion").addEventListener("click",()=>{if(currentQuestion<4){currentQuestion++;renderQuestion();}else completeStage();},{once:true}); }
  }
  function award(index,q,rerender=true) {
    if(state.earned.includes(index)) return;
    state.earned.push(index); saveState(); renderProgress(); showToast("أحسنت! +٢٠ نقطة ⭐");
    if(rerender) renderQuestion();
    else {
      $("feedbackArea").innerHTML=`<div class="feedback good">✓ تم تسجيل إجابتك وإضافة ٢٠ نقطة!<p>${q.explain}</p></div>`;
      $("quizArea").querySelector(".self-check")?.remove();
      $("nextQuestion").disabled=false;
    }
  }
  function completeStage() {
    if(!state.completedStages.includes(currentStage)) { state.completedStages.push(currentStage); saveState(); }
    renderProgress(); renderStageComplete();
  }
  function renderStageComplete() {
    const earned=stageQuestions(currentStage).filter(q=>state.earned.includes(window.QUIZ_QUESTIONS.indexOf(q))).length;
    const next=currentStage+1;
    $("quizArea").innerHTML=`<div class="stage-complete"><div class="big">🏆</div><h3>أحسنت! أنهيت ${["بوابة المعرفة","ميدان التحديات","تحدي أمير البيان"][currentStage]}</h3><p>أجبت إجابة صحيحة عن ${arabic(earned)} من ٥ أسئلة في هذه المرحلة.</p><p>إجمالي رصيدك: <strong style="color:var(--gold2)">${arabic(points())} نقطة</strong></p>${next<3?`<button class="btn btn-gold" id="nextStage">انتقل إلى المرحلة التالية ←</button>`:`<h3 style="color:var(--gold2)">🎉 لقد أتممت رحلة عالم الضاد!</h3><p>افتح خزانة الشارات وشاهد أوسمتك.</p>`}</div>`;
    if(next<3) $("nextStage").addEventListener("click",()=>openStage(next));
  }
  document.querySelectorAll("[data-stage]").forEach(card=>card.addEventListener("click",()=>openStage(Number(card.dataset.stage))));
  $("startFirst").addEventListener("click",()=>openStage(0));
  $("resetProgress").addEventListener("click",()=>{
    if(confirm("هل تريد حذف كل النقاط والشارات والبدء من جديد؟")) {
      state.earned=[];state.completedStages=[];saveState();renderProgress();
      $("quizArea").innerHTML=`<div class="quiz-empty"><span>🗝️</span><h3>بوابتك الأولى في انتظارك</h3><p>اضغط على «بوابة المعرفة» لبدء الأسئلة.</p><button class="btn btn-gold" id="startFirst">ابدأ التحدي</button></div>`;
      $("startFirst").addEventListener("click",()=>openStage(0));showToast("تمت إعادة ضبط تقدمك.");
    }
  });
  renderStudent();
  renderProgress();
})();