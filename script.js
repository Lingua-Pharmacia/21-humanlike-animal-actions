const splash = document.getElementById('splash-screen'), instr = document.getElementById('instructions-screen'),
      app = document.getElementById('main-app'), grid = document.getElementById('stations-grid'),
      playerZone = document.getElementById('player-zone'), audio = document.getElementById('audio-player'),
      transcript = document.getElementById('transcript-box'), popup = document.getElementById('translation-popup'),
      gameZone = document.getElementById('game-zone'), gameBoard = document.getElementById('game-board'),
      feedbackArea = document.getElementById('quiz-feedback-area'), ptsVal = document.getElementById('points-val');

// PERSISTENCE
let lifetimeScore = parseInt(localStorage.getItem('animalSocietyScore')) || 0;
let completedLessons = JSON.parse(localStorage.getItem('completedAnimalLessons')) || [];
if(ptsVal) ptsVal.innerText = lifetimeScore;

let wordBucket = []; let currentQ = 0; let attempts = 0; let totalScore = 0; let firstCard = null;

// STATIONS (Exact filenames from your root directory)
const stations = [
    {file:"01_AggressiveMonkeys.mp3", title:"Aggressive Monkeys"},
    {file:"02_AntSacrifice.mp3", title:"Ant Sacrifice"},
    {file:"03_BeeDemocracy.mp3", title:"Bee Democracy"},
    {file:"04_BulletEatingSnakes.mp3", title:"Bullet-Eating Snakes"},
    {file:"05_SealsAndDolphins.mp3", title:"Seals & Dolphins"},
    {file:"06_CleverOctopus.mp3", title:"Clever Octopus"},
    {file:"07_CrabMentality.mp3", title:"Crab Mentality"},
    {file:"08_DogsInSubway.mp3", title:"Dogs in the Subway"},
    {file:"09_EmpathicMouse.mp3", title:"Empathic Mouse"},
    {file:"10_FearfulMice.mp3", title:"Fearful Mice"},
    {file:"11_FosterSquirrels.mp3", title:"Foster Child Squirrels"},
    {file:"12_FriedHornets.mp3", title:"Fried Hornets"},
    {file:"13_GreedyGibbons.mp3", title:"Greedy Gibbons"},
    {file:"14_GrievingAnimals.mp3", title:"Grieving Animals"},
    {file:"15_NeighborLobsters.mp3", title:"Neighbor Lobsters"},
    {file:"16_NepotistHyenas.mp3", title:"Nepotist Hyenas"},
    {file:"17_SlaveTraderAnts.mp3", title:"Slave Trader Ants"},
    {file:"18_TraderGorillas.mp3", title:"Trader Gorillas"},
    {file:"19_TrickyPenguins.mp3", title:"Tricky Penguins"},
    {file:"20_UrbanizedRaccoons.mp3", title:"Urbanized Raccoons"},
    {file:"21_VulturesGroupWork.mp3", title:"Vultures & Group Work"}
];

stations.forEach((s, i) => {
    const btn = document.createElement('div'); btn.className = 'station-tile';
    if(completedLessons.includes(s.file)) btn.classList.add('completed');
    btn.innerHTML = `<b>${i + 1}</b> ${s.title}`;
    btn.onclick = () => { 
        grid.classList.add('hidden'); playerZone.classList.remove('hidden'); 
        document.getElementById('now-playing-title').innerText = s.title; 
        audio.src = s.file; wordBucket = []; 
    };
    grid.appendChild(btn);
});

// NAVIGATION
document.getElementById('btn-start').onclick = () => { splash.classList.add('hidden'); instr.classList.remove('hidden'); };
document.getElementById('btn-enter').onclick = () => { instr.classList.add('hidden'); app.classList.remove('hidden'); };
document.getElementById('btn-back').onclick = () => { location.reload(); };

// BOWLING QUIZ
document.getElementById('btn-bowling').onclick = () => {
    const fn = audio.src.split('/').pop(); const lesson = lessonData[fn][0];
    transcript.classList.add('hidden'); gameZone.classList.remove('hidden'); gameBoard.style.display = "none";
    currentQ = 0; totalScore = 0; attempts = 0;
    runQuiz(lesson);
};

function runQuiz(lesson) {
    if (currentQ >= 7) { finishQuiz(); return; }
    const qData = lesson.questions[currentQ];
    const storyNum = parseInt(audio.src.split('/').pop().substring(0,2));
    
    feedbackArea.innerHTML = `
        <div id="quiz-container">
            <div class="score-badge">SCORE: ${totalScore} | Q: ${currentQ+1}/7</div>
            <button id="btn-hear-q" class="mode-btn neon-green">👂 LISTEN TO QUESTION</button>
            <div id="mic-box" class="hidden" style="margin-top:20px;">
                <button id="btn-speak" class="mic-btn">🎤</button>
                <p id="mic-status" style="color:#666; font-weight:bold;">Ready...</p>
            </div>
            <div id="res-area"></div>
        </div>`;

    document.getElementById('btn-hear-q').onclick = () => {
        const utter = new SpeechSynthesisUtterance(qData.q);
        const voices = window.speechSynthesis.getVoices();
        // Odd Story = Male voice preference, Even = Female
        if (voices.length > 0) {
            if (storyNum % 2 !== 0) {
                utter.voice = voices.find(v => v.name.includes("Male") || v.name.includes("David")) || voices[0];
            } else {
                utter.voice = voices.find(v => v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google US English")) || voices[0];
            }
        }
        utter.onend = () => { document.getElementById('mic-box').classList.remove('hidden'); };
        window.speechSynthesis.speak(utter);
    };

    document.getElementById('btn-speak').onclick = function() {
        const btn = this; const status = document.getElementById('mic-status');
        
        // KILL ANY EXISTING RECOGNITION TO PREVENT STALLING
        if (window.currentRec) { window.currentRec.abort(); }
        
        window.currentRec = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
        window.currentRec.lang = 'en-US';
        window.currentRec.interimResults = false;

        window.currentRec.onstart = () => { btn.classList.add('active'); status.innerText = "Listening..."; };

        window.currentRec.onresult = (e) => {
            document.getElementById('mic-box').classList.add('hidden'); 
            const res = e.results[0][0].transcript.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
            const ans = qData.a_en.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
            if (res === ans) {
                let pts = (attempts === 0) ? 20 : 15; totalScore += pts;
                showResult(true, pts === 20 ? "STRIKE! (+20)" : "SPARE! (+15)", qData, lesson);
            } else {
                attempts++;
                if (attempts === 1) { showResult(false, "MISS! TRY AGAIN", qData, lesson, true); }
                else { showResult(false, "MISS! (0 pts)", qData, lesson, false); }
            }
        };

        window.currentRec.onerror = () => { btn.classList.remove('active'); status.innerText = "Error. Try again."; };
        window.currentRec.start();
    };
}

function showResult(isCorrect, msg, qData, lesson, canRetry = false) {
    const area = document.getElementById('res-area');
    area.innerHTML = `<h1 style="color:${isCorrect?'#39ff14':'#f44'}; font-size: 50px;">${msg}</h1>`;
    if (isCorrect || !canRetry) {
        area.innerHTML += `
            <p class="quiz-q-text">Q: ${qData.q}</p>
            <p class="quiz-a-text">EN: ${qData.a_en}</p>
            <p style="color:#888; font-size:30px; font-weight: bold;">TR: ${qData.a_tr}</p>
            <button id="btn-nxt" class="action-btn-large" style="margin-top:30px;">NEXT QUESTION ⮕</button>`;
        document.getElementById('btn-nxt').onclick = () => { currentQ++; attempts = 0; runQuiz(lesson); };
    } else {
        area.innerHTML += `<button id="btn-retry" class="action-btn-large" style="margin-top:30px;">RETRY FOR SPARE</button>`;
        document.getElementById('btn-retry').onclick = () => {
            area.innerHTML = ""; document.getElementById('mic-box').classList.remove('hidden');
            document.getElementById('btn-speak').classList.remove('active');
            document.getElementById('mic-status').innerText = "Ready for Spare...";
        };
    }
}

function finishQuiz() {
    lifetimeScore += totalScore; localStorage.setItem('animalSocietyScore', lifetimeScore);
    const fn = audio.src.split('/').pop();
    if(!completedLessons.includes(fn)) {
        completedLessons.push(fn); localStorage.setItem('completedAnimalLessons', JSON.stringify(completedLessons));
    }
    feedbackArea.innerHTML = `<h1 style="color:#ccff00; font-size: 60px;">FINISHED!</h1><h2 style="font-size: 40px;">QUIZ SCORE: ${totalScore}</h2><button onclick="location.reload()" class="action-btn-large">SAVE & RETURN</button>`;
}

// UTILITIES
document.getElementById('ctrl-play').onclick = () => audio.play();
document.getElementById('ctrl-pause').onclick = () => audio.pause();
document.getElementById('ctrl-stop').onclick = () => { audio.pause(); audio.currentTime = 0; };
document.getElementById('btn-blind').onclick = () => { transcript.classList.add('hidden'); gameZone.classList.add('hidden'); audio.play(); };

document.getElementById('btn-read').onclick = () => {
    const fn = audio.src.split('/').pop(); const data = lessonData[fn][0];
    transcript.classList.remove('hidden'); gameZone.classList.add('hidden'); transcript.innerHTML = "";
    data.text.split(" ").forEach(w => {
        const span = document.createElement('span'); 
        const clean = w.toLowerCase().replace(/[^a-z0-9ğüşöçı]/gi, "");
        span.innerText = w + " "; span.className = "clickable-word";
        span.onclick = (e) => {
            const tr = data.dict[clean];
            if(tr) {
                if (!wordBucket.some(p => p.en === clean)) wordBucket.push({en: clean, tr: tr});
                popup.innerText = tr; popup.style.left = `${e.clientX}px`; popup.style.top = `${e.clientY - 50}px`;
                popup.classList.remove('hidden'); setTimeout(() => popup.classList.add('hidden'), 2000);
            }
        };
        transcript.appendChild(span);
    });
    audio.play();
};

document.getElementById('btn-game').onclick = () => {
    const fn = audio.src.split('/').pop(); const lesson = lessonData[fn][0];
    transcript.classList.add('hidden'); gameZone.classList.remove('hidden'); feedbackArea.innerHTML = "";
    gameBoard.innerHTML = ""; firstCard = null; gameBoard.style.display = "grid";
    let set = [...wordBucket];
    for (let k in lesson.dict) { if (set.length >= 8) break; if (!set.some(p => p.en === k)) set.push({en: k, tr: lesson.dict[k]}); }
    let deck = [];
    set.forEach(p => { deck.push({text: p.en, match: p.tr}); deck.push({text: p.tr, match: p.en}); });
    deck.sort(() => Math.random() - 0.5);
    deck.forEach(card => {
        const div = document.createElement('div'); div.className = 'game-card'; div.innerText = card.text;
        div.onclick = () => {
            if (div.classList.contains('correct') || div.classList.contains('selected')) return;
            if (firstCard) {
                if (firstCard.innerText === card.match) {
                    div.classList.add('correct'); div.classList.add('correct'); firstCard = null;
                } else {
                    div.classList.add('wrong'); setTimeout(() => { div.classList.remove('wrong'); firstCard.classList.remove('selected'); firstCard = null; }, 500);
                }
            } else { firstCard = div; div.classList.add('selected'); }
        };
        gameBoard.appendChild(div);
    });
};
