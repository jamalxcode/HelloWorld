const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let targetWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
let currentGuess = 0;

function createBoard() {
    const board = document.getElementById('board');
    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        for (let j = 0; j < WORD_LENGTH; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function checkGuess(guess) {
    guess = guess.toLowerCase();
    if (guess.length !== WORD_LENGTH || !WORD_LIST.includes(guess)) {
        document.getElementById('result').textContent = 'Invalid guess';
        return;
    }
    const row = document.getElementsByClassName('row')[currentGuess];
    for (let i = 0; i < WORD_LENGTH; i++) {
        const cell = row.children[i];
        cell.textContent = guess[i];
        if (guess[i] === targetWord[i]) {
            cell.classList.add('correct');
        } else if (targetWord.includes(guess[i])) {
            cell.classList.add('present');
        } else {
            cell.classList.add('absent');
        }
    }

    if (guess === targetWord) {
        document.getElementById('result').textContent = 'You guessed it!';
        document.getElementById('submit').disabled = true;
    } else {
        currentGuess++;
        if (currentGuess >= MAX_GUESSES) {
            document.getElementById('result').textContent = 'Game over! The word was ' + targetWord + '.';
            document.getElementById('submit').disabled = true;
        }
    }
}

document.getElementById('submit').addEventListener('click', function() {
    const guessInput = document.getElementById('guess');
    checkGuess(guessInput.value);
    guessInput.value = '';
    guessInput.focus();
});

createBoard();
