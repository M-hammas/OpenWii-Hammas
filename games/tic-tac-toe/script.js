"use strict";

import { GameLink } from "../../core/net.js";

/* =========================================================
   ULTIMATE TIC TAC TOE
   Vanilla JS game engine
   Sections: DOM refs | State | Storage | Timer | Sound |
             Theme | Mode/UI | Moves | AI | Win detection |
             Stats | History | Result/Confetti | Init
========================================================= */


/* ---------------------------------------------------------
   DOM REFERENCES
--------------------------------------------------------- */

const boardEl = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const winningLineEl = document.getElementById("winningLine");

const gameModeSelect = document.getElementById("gameMode");
const difficultyBox = document.getElementById("difficultyBox");
const difficultySelect = document.getElementById("difficulty");

const themeBtn = document.getElementById("themeBtn");
const soundBtn = document.getElementById("soundBtn");

const turnText = document.getElementById("turn");
const timerText = document.getElementById("timer");
const aiStatus = document.getElementById("aiStatus");
const message = document.getElementById("message");

const restartBtn = document.getElementById("restartBtn");
const newGameBtn = document.getElementById("newGameBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

const xScoreDisplay = document.getElementById("xScore");
const oScoreDisplay = document.getElementById("oScore");
const drawScoreDisplay = document.getElementById("drawScore");
const oScoreLabel = document.getElementById("oScoreLabel");

const gamesPlayedDisplay = document.getElementById("gamesPlayed");
const winRateDisplay = document.getElementById("winRate");
const streakDisplay = document.getElementById("streak");
const bestStreakDisplay = document.getElementById("bestStreak");
const avgTimeDisplay = document.getElementById("avgTime");

const historyList = document.getElementById("historyList");

const confettiContainer = document.getElementById("confetti");

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const playAgainBtn = document.getElementById("playAgainBtn");


/* ---------------------------------------------------------
   GAME CONSTANTS
--------------------------------------------------------- */

const WIN_PATTERNS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const STORAGE_KEY = "ultimateTTT_data_v2";


/* ---------------------------------------------------------
   GAME STATE
--------------------------------------------------------- */

const state = {
    // IMPORTANT: Tic Tac Toe always has 9 positions.
    board: [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ],

    currentPlayer: "X",

    gameActive: true,

    aiThinking: false,

    mode: "pvp",

    difficulty: "medium",

    xScore: 0,

    oScore: 0,

    drawScore: 0,

    stats: {
        totalGames: 0,
        xWins: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalSeconds: 0
    },

    history: [],

    soundOn: true,

    theme: "dark",

    timerSeconds: 0,

    timerInterval: null
};


/* ---------------------------------------------------------
   LOCAL STORAGE
--------------------------------------------------------- */

function saveData() {
    const payload = {
        xScore: state.xScore,
        oScore: state.oScore,
        drawScore: state.drawScore,
        stats: state.stats,
        history: state.history,
        soundOn: state.soundOn,
        theme: state.theme,
        mode: state.mode,
        difficulty: state.difficulty
    };

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(payload)
        );
    } catch (err) {
        // Storage can fail.
        // The game still works during this session.
    }
}


function loadData() {
    let saved = null;

    try {
        saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );
    } catch (err) {
        saved = null;
    }

    if (!saved) {
        return;
    }

    state.xScore =
        Number(saved.xScore) || 0;

    state.oScore =
        Number(saved.oScore) || 0;

    state.drawScore =
        Number(saved.drawScore) || 0;


    if (saved.stats) {
        state.stats.totalGames =
            Number(saved.stats.totalGames) || 0;

        state.stats.xWins =
            Number(saved.stats.xWins) || 0;

        state.stats.draws =
            Number(saved.stats.draws) || 0;

        state.stats.currentStreak =
            Number(saved.stats.currentStreak) || 0;

        state.stats.bestStreak =
            Number(saved.stats.bestStreak) || 0;

        state.stats.totalSeconds =
            Number(saved.stats.totalSeconds) || 0;
    }


    if (Array.isArray(saved.history)) {
        state.history =
            saved.history.slice(0, 20);
    }


    state.soundOn =
        saved.soundOn !== false;


    state.theme =
        saved.theme === "light"
            ? "light"
            : "dark";


    state.mode =
        saved.mode === "cpu"
            ? "cpu"
            : "pvp";


    state.difficulty =
        ["easy", "medium", "hard"].includes(
            saved.difficulty
        )
            ? saved.difficulty
            : "medium";
}


/* ---------------------------------------------------------
   TIMER
--------------------------------------------------------- */

function formatTime(totalSeconds) {
    const m =
        Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, "0");

    const s =
        Math.floor(totalSeconds % 60)
            .toString()
            .padStart(2, "0");

    return `${m}:${s}`;
}


function startTimer() {
    stopTimer();

    state.timerSeconds = 0;

    timerText.textContent =
        formatTime(0);

    state.timerInterval =
        setInterval(() => {
            state.timerSeconds += 1;

            timerText.textContent =
                formatTime(
                    state.timerSeconds
                );
        }, 1000);
}


function stopTimer() {
    if (state.timerInterval) {
        clearInterval(
            state.timerInterval
        );

        state.timerInterval = null;
    }
}


function resetTimerDisplay() {
    stopTimer();

    state.timerSeconds = 0;

    timerText.textContent =
        formatTime(0);
}


/* ---------------------------------------------------------
   SOUND
--------------------------------------------------------- */

const soundManager = (() => {

    const sounds = {
        click:
            new Audio(
                "sounds/click.wav"
            ),

        win:
            new Audio(
                "sounds/win.wav"
            ),

        draw:
            new Audio(
                "sounds/draw.wav"
            ),

        lose:
            new Audio(
                "sounds/lose.wav"
            )
    };


    Object.values(sounds).forEach(
        (audio) => {
            audio.preload = "auto";

            audio.volume = 0.7;
        }
    );


    function play(name) {
        if (!state.soundOn) {
            return;
        }

        const audio = sounds[name];

        if (!audio) {
            return;
        }

        try {
            audio.currentTime = 0;

            const promise =
                audio.play();

            if (promise) {
                promise.catch(() => {});
            }

        } catch (error) {
            console.log(
                "Sound playback error:",
                error
            );
        }
    }


    return {

        click() {
            play("click");
        },

        button() {
            play("click");
        },

        win() {
            play("win");
        },

        draw() {
            play("draw");
        },

        lose() {
            play("lose");
        }

    };

})();


function toggleSound() {
    state.soundOn =
        !state.soundOn;

    updateSoundUI();

    saveData();
}


function updateSoundUI() {
    soundBtn.textContent =
        state.soundOn
            ? "🔊 On"
            : "🔇 Off";

    soundBtn.setAttribute(
        "aria-pressed",
        String(state.soundOn)
    );
}


/* ---------------------------------------------------------
   THEME
--------------------------------------------------------- */

function applyTheme() {

    document.body.classList.toggle(
        "light",
        state.theme === "light"
    );


    themeBtn.textContent =
        state.theme === "light"
            ? "☀ Light"
            : "🌙 Dark";


    themeBtn.setAttribute(
        "aria-pressed",
        String(
            state.theme === "light"
        )
    );
}


function toggleTheme() {

    state.theme =
        state.theme === "light"
            ? "dark"
            : "light";

    applyTheme();

    saveData();
}


/* ---------------------------------------------------------
   MODE / DIFFICULTY UI
--------------------------------------------------------- */

function applyModeUI() {

    gameModeSelect.value =
        state.mode;

    difficultySelect.value =
        state.difficulty;


    difficultyBox.hidden =
        state.mode !== "cpu";


    oScoreLabel.textContent =
        state.mode === "cpu"
            ? "🤖 Computer"
            : "⭕ Player O";
}


function handleModeChange() {

    state.mode =
        gameModeSelect.value;

    applyModeUI();

    saveData();

    restartRound();
}


function handleDifficultyChange() {

    state.difficulty =
        difficultySelect.value;

    saveData();

    restartRound();
}


/* ---------------------------------------------------------
   BOARD RENDERING
--------------------------------------------------------- */

function renderCell(index) {

    const cell =
        cells[index];

    const value =
        state.board[index];


    cell.textContent =
        value;


    cell.classList.remove(
        "x",
        "o",
        "filled"
    );


    if (value === "X") {

        cell.classList.add(
            "x",
            "filled"
        );
    }


    if (value === "O") {

        cell.classList.add(
            "o",
            "filled"
        );
    }


    const pos =
        `Row ${Math.floor(index / 3) + 1}, Column ${(index % 3) + 1}`;


    cell.setAttribute(
        "aria-label",
        value
            ? `${pos}, ${value}`
            : `${pos}, empty`
    );
}


function renderBoard() {

    for (let i = 0; i < 9; i++) {

        renderCell(i);

    }

}


function lockBoard(locked) {

    boardEl.classList.toggle(
        "locked",
        locked
    );
}


/* ---------------------------------------------------------
   PLAYER MOVES
--------------------------------------------------------- */

function handleCellActivate(index) {

    if (
        state.aiThinking ||
        !state.gameActive
    ) {
        return;
    }


    if (
        state.board[index] !== ""
    ) {
        return;
    }


    playMove(
        index,
        state.currentPlayer
    );
}


/* ---------------------------------------------------------
   OPENWII PHONE CONTROLLER
--------------------------------------------------------- */

let controllerCursor = 0;
let controllerPreviousButtons = {};

function moveControllerCursor(direction) {

    const row = Math.floor(controllerCursor / 3);
    const col = controllerCursor % 3;

    let newRow = row;
    let newCol = col;

    if (direction === "up") newRow = Math.max(0, row - 1);
    if (direction === "down") newRow = Math.min(2, row + 1);
    if (direction === "left") newCol = Math.max(0, col - 1);
    if (direction === "right") newCol = Math.min(2, col + 1);

    controllerCursor = newRow * 3 + newCol;

    const cell = cells[controllerCursor];

    if (cell) {
        cell.focus({
            preventScroll: true
        });
    }
}

function handleOpenWiiButton(button) {

    if (
        button === "up" ||
        button === "down" ||
        button === "left" ||
        button === "right"
    ) {
        moveControllerCursor(button);
        return;
    }

    if (
        button === "A" ||
        button === "2"
    ) {
        const cell = cells[controllerCursor];

        if (cell) {
            cell.focus({
                preventScroll: true
            });
        }

        handleCellActivate(controllerCursor);
        return;
    }

    if (button === "1") {
        restartRound();
    }
}

const controllerLink = new GameLink({

    onCommand: (cmd, slot) => {

        if (slot !== 0 || !cmd) {
            return;
        }

        if (cmd.type === "home") {
            location.href = "/";
            return;
        }

        if (cmd.type === "button") {

            const button = cmd.menuDirection || cmd.button;

            if (cmd.pressed === false) {
                controllerPreviousButtons[cmd.button] = false;
                return;
            }

            handleOpenWiiButton(button);
            controllerPreviousButtons[cmd.button] = true;
            return;
        }

        if (cmd.type === "button-up") {

            controllerPreviousButtons[cmd.button] = false;
            return;
        }

        if (cmd.type === "buttons") {

            const nextButtons = cmd.buttons || {};

            for (const button of [
                "up",
                "down",
                "left",
                "right",
                "A",
                "B",
                "1",
                "2"
            ]) {

                const pressed = nextButtons[button] === true;

                if (
                    pressed &&
                    !controllerPreviousButtons[button]
                ) {
                    handleOpenWiiButton(button);
                }

                controllerPreviousButtons[button] = pressed;
            }
        }
    },

    onPresence: () => {
        sendControllerProfile();
    }
});

function sendControllerProfile() {

    controllerLink.feedback({
        type: "controller-profile",
        profile: "wheel",
        slot: 0
    });
}

const controllerProfileTimer = setInterval(
    sendControllerProfile,
    850
);

window.addEventListener("pagehide", () => {

    clearInterval(controllerProfileTimer);

    controllerLink.feedback({
        type: "controller-profile",
        profile: "default",
        slot: 0
    });
});
function playMove(index, player) {

    state.board[index] =
        player;


    renderCell(index);


    cells[index].classList.add(
        "pop"
    );


    setTimeout(() => {

        cells[index].classList.remove(
            "pop"
        );

    }, 300);


    soundManager.click();


    const result =
        evaluateBoard(
            state.board
        );


    if (
        result.winner ||
        result.isDraw
    ) {

        finishRound(result);

        return;
    }


    state.currentPlayer =
        state.currentPlayer === "X"
            ? "O"
            : "X";


    turnText.textContent =
        `Player ${state.currentPlayer} Turn`;


    if (
        state.mode === "cpu" &&
        state.currentPlayer === "O"
    ) {

        triggerComputerMove();

    }
}


/* ---------------------------------------------------------
   BOARD CLICK / KEYBOARD
--------------------------------------------------------- */

cells.forEach((cell) => {

    cell.addEventListener(
        "click",
        () => {

            handleCellActivate(
                Number(
                    cell.dataset.index
                )
            );

        }
    );


    cell.addEventListener(
        "keydown",
        (e) => {

            if (
                e.key === "Enter" ||
                e.key === " "
            ) {

                e.preventDefault();


                handleCellActivate(
                    Number(
                        cell.dataset.index
                    )
                );

            }

        }
    );

});


/* ---------------------------------------------------------
   WIN / DRAW DETECTION
--------------------------------------------------------- */

function evaluateBoard(boardArr) {

    for (
        const pattern
        of WIN_PATTERNS
    ) {

        const [
            a,
            b,
            c
        ] = pattern;


        if (
            boardArr[a] !== "" &&
            boardArr[a] === boardArr[b] &&
            boardArr[a] === boardArr[c]
        ) {

            return {

                winner:
                    boardArr[a],

                pattern,

                isDraw: false

            };

        }

    }


    if (
        !boardArr.includes("")
    ) {

        return {

            winner: null,

            pattern: null,

            isDraw: true

        };

    }


    return {

        winner: null,

        pattern: null,

        isDraw: false

    };

}


/* ---------------------------------------------------------
   AI LOGIC
--------------------------------------------------------- */

function getEmptyIndices(boardArr) {

    const empty = [];


    for (
        let i = 0;
        i < 9;
        i++
    ) {

        if (
            boardArr[i] === ""
        ) {

            empty.push(i);

        }

    }


    return empty;
}


function findWinningMove(
    boardArr,
    player
) {

    for (
        const pattern
        of WIN_PATTERNS
    ) {

        const [
            a,
            b,
            c
        ] = pattern;


        const values = [
            boardArr[a],
            boardArr[b],
            boardArr[c]
        ];


        const playerCount =
            values.filter(
                v => v === player
            ).length;


        const emptyCount =
            values.filter(
                v => v === ""
            ).length;


        if (
            playerCount === 2 &&
            emptyCount === 1
        ) {

            if (
                boardArr[a] === ""
            ) {
                return a;
            }


            if (
                boardArr[b] === ""
            ) {
                return b;
            }


            if (
                boardArr[c] === ""
            ) {
                return c;
            }

        }

    }


    return -1;
}


/* ---------------------------------------------------------
   EASY AI
   Frequently makes mistakes.
--------------------------------------------------------- */

function getEasyMove(boardArr) {

    const empty =
        getEmptyIndices(
            boardArr
        );


    if (
        empty.length === 0
    ) {

        return -1;

    }


    /*
     * 25% chance to take
     * an available winning move.
     */

    if (
        Math.random() < 0.25
    ) {

        const win =
            findWinningMove(
                boardArr,
                "O"
            );


        if (
            win !== -1
        ) {

            return win;

        }

    }


    /*
     * 20% chance to block
     * the player's winning move.
     */

    if (
        Math.random() < 0.20
    ) {

        const block =
            findWinningMove(
                boardArr,
                "X"
            );


        if (
            block !== -1
        ) {

            return block;

        }

    }


    /*
     * Otherwise choose randomly.
     */

    return empty[
        Math.floor(
            Math.random() *
            empty.length
        )
    ];
}


/* ---------------------------------------------------------
   MEDIUM AI
   Smart most of the time,
   but makes occasional mistakes.
--------------------------------------------------------- */

function getMediumMove(boardArr) {

    const empty =
        getEmptyIndices(
            boardArr
        );


    if (
        empty.length === 0
    ) {

        return -1;

    }


    /*
     * 20% chance to make
     * a random mistake.
     */

    if (
        Math.random() < 0.20
    ) {

        return empty[
            Math.floor(
                Math.random() *
                empty.length
            )
        ];

    }


    /*
     * First priority:
     * take a winning move.
     */

    const win =
        findWinningMove(
            boardArr,
            "O"
        );


    if (
        win !== -1
    ) {

        return win;

    }


    /*
     * Second priority:
     * block the player.
     */

    const block =
        findWinningMove(
            boardArr,
            "X"
        );


    if (
        block !== -1
    ) {

        return block;

    }


    /*
     * Third priority:
     * center.
     */

    if (
        boardArr[4] === ""
    ) {

        return 4;

    }


    /*
     * Fourth priority:
     * corners.
     */

    const corners =
        [0, 2, 6, 8].filter(
            i =>
                boardArr[i] === ""
        );


    if (
        corners.length > 0
    ) {

        return corners[
            Math.floor(
                Math.random() *
                corners.length
            )
        ];

    }


    /*
     * Last option:
     * any empty square.
     */

    return empty[
        Math.floor(
            Math.random() *
            empty.length
        )
    ];
}


/* ---------------------------------------------------------
   MINIMAX
   Used by Hard AI.
--------------------------------------------------------- */

function minimax(
    boardArr,
    depth,
    isMaximizing
) {

    const result =
        evaluateBoard(
            boardArr
        );


    if (
        result.winner === "O"
    ) {

        return 10 - depth;

    }


    if (
        result.winner === "X"
    ) {

        return depth - 10;

    }


    if (
        result.isDraw
    ) {

        return 0;

    }


    if (
        isMaximizing
    ) {

        let bestScore =
            -Infinity;


        for (
            const index
            of getEmptyIndices(
                boardArr
            )
        ) {

            boardArr[index] =
                "O";


            const score =
                minimax(
                    boardArr,
                    depth + 1,
                    false
                );


            boardArr[index] =
                "";


            bestScore =
                Math.max(
                    bestScore,
                    score
                );

        }


        return bestScore;

    }


    let bestScore =
        Infinity;


    for (
        const index
        of getEmptyIndices(
            boardArr
        )
    ) {

        boardArr[index] =
            "X";


        const score =
            minimax(
                boardArr,
                depth + 1,
                true
            );


        boardArr[index] =
            "";


        bestScore =
            Math.min(
                bestScore,
                score
            );

    }


    return bestScore;
}


/* ---------------------------------------------------------
   PERFECT HARD MOVE
--------------------------------------------------------- */

function getPerfectHardMove(
    boardArr
) {

    let bestScore =
        -Infinity;

    let bestMoves = [];


    for (
        const index
        of getEmptyIndices(
            boardArr
        )
    ) {

        boardArr[index] =
            "O";


        const score =
            minimax(
                boardArr,
                0,
                false
            );


        boardArr[index] =
            "";


        if (
            score > bestScore
        ) {

            bestScore =
                score;

            bestMoves =
                [index];

        } else if (
            score === bestScore
        ) {

            bestMoves.push(
                index
            );

        }

    }


    if (
        bestMoves.length === 0
    ) {

        return -1;

    }


    return bestMoves[
        Math.floor(
            Math.random() *
            bestMoves.length
        )
    ];
}


/* ---------------------------------------------------------
   HARD AI
   Very strong, but not perfect.
--------------------------------------------------------- */

function getHardMove(boardArr) {

    const empty =
        getEmptyIndices(
            boardArr
        );


    if (
        empty.length === 0
    ) {

        return -1;

    }


    /*
     * 10% chance of making
     * an intentional mistake.
     *
     * This prevents Hard mode
     * from becoming impossible.
     */

    if (
        Math.random() < 0.10
    ) {

        return empty[
            Math.floor(
                Math.random() *
                empty.length
            )
        ];

    }


    /*
     * Otherwise use perfect
     * Minimax.
     */

    return getPerfectHardMove(
        boardArr
    );
}


/* ---------------------------------------------------------
   SELECT AI DIFFICULTY
--------------------------------------------------------- */

function getComputerMove() {

    if (
        state.difficulty === "easy"
    ) {

        return getEasyMove(
            state.board
        );

    }


    if (
        state.difficulty === "medium"
    ) {

        return getMediumMove(
            state.board
        );

    }


    return getHardMove(
        state.board
    );
}


/* ---------------------------------------------------------
   COMPUTER TURN
--------------------------------------------------------- */

function triggerComputerMove() {

    state.aiThinking =
        true;


    lockBoard(true);


    aiStatus.hidden =
        false;


    const delay =
        400 +
        Math.random() * 300;


    setTimeout(() => {

        if (
            !state.gameActive
        ) {

            state.aiThinking =
                false;

            aiStatus.hidden =
                true;

            lockBoard(false);

            return;

        }


        const move =
            getComputerMove();


        state.aiThinking =
            false;


        aiStatus.hidden =
            true;


        lockBoard(false);


        if (
            move !== -1
        ) {

            /*
             * playMove() handles
             * click sound.
             */

            playMove(
                move,
                "O"
            );

        }

    }, delay);
}


/* ---------------------------------------------------------
   STATISTICS
--------------------------------------------------------- */

function updateStatsAfterGame(
    result,
    durationSeconds
) {

    const s =
        state.stats;


    s.totalGames += 1;


    s.totalSeconds +=
        durationSeconds;


    if (
        result.isDraw
    ) {

        s.draws += 1;

        s.currentStreak =
            0;

    } else if (
        result.winner === "X"
    ) {

        s.xWins += 1;

        s.currentStreak += 1;


        if (
            s.currentStreak >
            s.bestStreak
        ) {

            s.bestStreak =
                s.currentStreak;

        }

    } else {

        s.currentStreak =
            0;

    }
}


function updateStatsUI() {

    const s =
        state.stats;


    gamesPlayedDisplay.textContent =
        s.totalGames;


    const winRate =
        s.totalGames > 0
            ? Math.round(
                (
                    s.xWins /
                    s.totalGames
                ) *
                100
            )
            : 0;


    winRateDisplay.textContent =
        `${winRate}%`;


    streakDisplay.textContent =
        s.currentStreak;


    bestStreakDisplay.textContent =
        s.bestStreak;


    const avg =
        s.totalGames > 0
            ? s.totalSeconds /
              s.totalGames
            : 0;


    avgTimeDisplay.textContent =
        formatTime(avg);
}


function updateScoreUI() {

    xScoreDisplay.textContent =
        state.xScore;


    oScoreDisplay.textContent =
        state.oScore;


    drawScoreDisplay.textContent =
        state.drawScore;
}


/* ---------------------------------------------------------
   MATCH HISTORY
--------------------------------------------------------- */

function resultLabel(result) {

    if (
        result.isDraw
    ) {

        return "🤝 Draw";

    }


    if (
        result.winner === "X"
    ) {

        return "🏆 Player X Won";

    }


    return state.mode === "cpu"
        ? "🤖 Computer Won"
        : "🏆 Player O Won";
}


function addHistoryEntry(
    result,
    durationSeconds
) {

    const entry = {

        result:
            resultLabel(result),

        mode:
            state.mode === "cpu"
                ? `vs Computer (${capitalize(state.difficulty)})`
                : "Player vs Player",

        duration:
            formatTime(
                durationSeconds
            ),

        date:
            new Date().toLocaleString()

    };


    state.history.unshift(
        entry
    );


    state.history =
        state.history.slice(
            0,
            20
        );
}


function capitalize(str) {

    return (
        str.charAt(0).toUpperCase() +
        str.slice(1)
    );
}


function renderHistory() {

    historyList.innerHTML =
        "";


    if (
        state.history.length === 0
    ) {

        const li =
            document.createElement(
                "li"
            );


        li.className =
            "empty-entry";


        li.textContent =
            "No matches played yet.";


        historyList.appendChild(
            li
        );


        return;
    }


    state.history.forEach(
        (entry) => {

            const li =
                document.createElement(
                    "li"
                );


            const resultSpan =
                document.createElement(
                    "span"
                );


            resultSpan.className =
                "h-result";


            resultSpan.textContent =
                entry.result;


            const metaSpan =
                document.createElement(
                    "span"
                );


            metaSpan.className =
                "h-meta";


            metaSpan.textContent =
                `${entry.mode} • ${entry.duration} • ${entry.date}`;


            li.appendChild(
                resultSpan
            );


            li.appendChild(
                metaSpan
            );


            historyList.appendChild(
                li
            );

        }
    );
}


function clearHistory() {

    const confirmed =
        window.confirm(
            "Clear all match history? This cannot be undone."
        );


    if (
        !confirmed
    ) {

        return;

    }


    state.history =
        [];


    renderHistory();


    saveData();
}


/* ---------------------------------------------------------
   WINNING LINE + CONFETTI
--------------------------------------------------------- */

function drawWinningLine(
    pattern
) {

    if (
        !pattern
    ) {

        return;

    }


    const [
        startIdx,
        ,
        endIdx
    ] = pattern;


    const boardRect =
        boardEl.getBoundingClientRect();


    const startRect =
        cells[
            startIdx
        ].getBoundingClientRect();


    const endRect =
        cells[
            endIdx
        ].getBoundingClientRect();


    const startX =
        startRect.left +
        startRect.width / 2 -
        boardRect.left;


    const startY =
        startRect.top +
        startRect.height / 2 -
        boardRect.top;


    const endX =
        endRect.left +
        endRect.width / 2 -
        boardRect.left;


    const endY =
        endRect.top +
        endRect.height / 2 -
        boardRect.top;


    const length =
        Math.hypot(
            endX - startX,
            endY - startY
        ) + 20;


    const angle =
        Math.atan2(
            endY - startY,
            endX - startX
        ) *
        (180 / Math.PI);


    winningLineEl.style.left =
        `${startX - 10}px`;


    winningLineEl.style.top =
        `${startY - 4}px`;


    winningLineEl.style.transform =
        `rotate(${angle}deg)`;


    winningLineEl.style.width =
        "0px";


    winningLineEl.classList.add(
        "show"
    );


    requestAnimationFrame(
        () => {

            winningLineEl.style.width =
                `${length}px`;

        }
    );
}


function hideWinningLine() {

    winningLineEl.classList.remove(
        "show"
    );


    winningLineEl.style.width =
        "0px";
}


function launchConfetti(
    count = 60
) {

    const colors = [
        "#00f7ff",
        "#ff00e5",
        "#00ff9d",
        "#ffd166",
        "#ffffff"
    ];


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const piece =
            document.createElement(
                "div"
            );


        piece.className =
            "confetti-piece";


        piece.style.left =
            `${Math.random() * 100}vw`;


        piece.style.background =
            colors[
                Math.floor(
                    Math.random() *
                    colors.length
                )
            ];


        piece.style.animationDuration =
            `${1.6 + Math.random() * 1.2}s`;


        piece.style.animationDelay =
            `${Math.random() * 0.3}s`;


        piece.style.borderRadius =
            Math.random() > 0.5
                ? "50%"
                : "2px";


        confettiContainer.appendChild(
            piece
        );


        setTimeout(() => {

            piece.remove();

        }, 3200);

    }
}


/* ---------------------------------------------------------
   ROUND LIFECYCLE
--------------------------------------------------------- */

function finishRound(result) {

    state.gameActive =
        false;


    stopTimer();


    lockBoard(true);


    const duration =
        state.timerSeconds;


    if (
        result.isDraw
    ) {

        state.drawScore += 1;


        turnText.textContent =
            "Draw!";


        message.textContent =
            "🤝 Match Draw";


        soundManager.draw();


        showResultModal(
            "🤝 DRAW GAME",
            "Nobody wins this round."
        );

    } else {

        cells.forEach(
            (c, i) => {

                if (
                    result.pattern.includes(i)
                ) {

                    c.classList.add(
                        "win-cell"
                    );

                }

            }
        );


        drawWinningLine(
            result.pattern
        );


        const isComputer =
            state.mode === "cpu";


        if (
            result.winner === "X"
        ) {

            state.xScore += 1;


            turnText.textContent =
                "Player X Wins!";


            message.textContent =
                "🎉 Congratulations!";


            soundManager.win();


            launchConfetti();


            showResultModal(
                "🏆 PLAYER X WINS!",
                "Great game — go again?"
            );

        } else {

            state.oScore += 1;


            turnText.textContent =
                isComputer
                    ? "Computer Wins!"
                    : "Player O Wins!";


            message.textContent =
                isComputer
                    ? "🤖 The computer takes this round."
                    : "🎉 Congratulations!";


            if (
                isComputer
            ) {

                soundManager.lose();

            } else {

                soundManager.win();

            }


            launchConfetti();


            showResultModal(
                isComputer
                    ? "🤖 COMPUTER WINS"
                    : "🏆 PLAYER O WINS!",
                "Better luck next round."
            );

        }

    }


    updateScoreUI();


    updateStatsAfterGame(
        result,
        duration
    );


    updateStatsUI();


    addHistoryEntry(
        result,
        duration
    );


    renderHistory();


    saveData();
}


function showResultModal(
    title,
    subtitle
) {

    resultTitle.textContent =
        title;


    resultSubtitle.textContent =
        subtitle;


    resultModal.hidden =
        false;
}


function hideResultModal() {

    resultModal.hidden =
        true;
}


/* ---------------------------------------------------------
   RESTART ROUND
--------------------------------------------------------- */

function restartRound() {

    stopTimer();


    hideResultModal();


    hideWinningLine();


    /*
     * IMPORTANT:
     * Always reset exactly 9 cells.
     */

    state.board = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ];


    state.currentPlayer =
        "X";


    state.gameActive =
        true;


    state.aiThinking =
        false;


    renderBoard();


    lockBoard(false);


    cells.forEach(
        (c) => {

            c.classList.remove(
                "win-cell"
            );

        }
    );


    turnText.textContent =
        "Player X Turn";


    message.textContent =
        "Ready To Play";


    aiStatus.hidden =
        true;


    startTimer();
}


/* ---------------------------------------------------------
   NEW MATCH
--------------------------------------------------------- */

function newMatch() {

    state.xScore =
        0;

    state.oScore =
        0;

    state.drawScore =
        0;


    updateScoreUI();


    restartRound();


    saveData();
}


/* ---------------------------------------------------------
   RESET ALL DATA
--------------------------------------------------------- */

function resetAllData() {

    const confirmed =
        window.confirm(
            "Reset ALL data? This permanently deletes scores, statistics, streaks, and match history. This cannot be undone."
        );


    if (
        !confirmed
    ) {

        return;

    }


    state.xScore =
        0;


    state.oScore =
        0;


    state.drawScore =
        0;


    state.stats = {

        totalGames: 0,

        xWins: 0,

        draws: 0,

        currentStreak: 0,

        bestStreak: 0,

        totalSeconds: 0

    };


    state.history =
        [];


    updateScoreUI();


    updateStatsUI();


    renderHistory();


    restartRound();


    saveData();
}


/* ---------------------------------------------------------
   EVENT LISTENERS
--------------------------------------------------------- */

restartBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        restartRound();

    }
);


newGameBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        newMatch();

    }
);


clearHistoryBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        clearHistory();

    }
);


resetAllBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        resetAllData();

    }
);


playAgainBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        restartRound();

    }
);


gameModeSelect.addEventListener(
    "change",
    handleModeChange
);


difficultySelect.addEventListener(
    "change",
    handleDifficultyChange
);


themeBtn.addEventListener(
    "click",
    () => {

        soundManager.button();

        toggleTheme();

    }
);


soundBtn.addEventListener(
    "click",
    () => {

        /*
         * Play button sound first.
         * Then toggle sound.
         */

        if (
            state.soundOn
        ) {

            soundManager.button();

        }


        toggleSound();

    }
);


window.addEventListener(
    "resize",
    () => {

        /*
         * Hide winning line
         * after window resize.
         */

        if (
            winningLineEl.classList.contains(
                "show"
            )
        ) {

            hideWinningLine();

        }

    }
);


/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */

function init() {

    loadData();


    applyTheme();


    updateSoundUI();


    applyModeUI();


    updateScoreUI();


    updateStatsUI();


    renderHistory();


    renderBoard();


    restartRound();

}


document.addEventListener(
    "DOMContentLoaded",
    init
);