$(document).ready(function() {
    // Error logging function
    function logError(message, error = null) {
        console.error(`Sudoku Game Error: ${message}`, error);
        // Optional: Send error to a logging service
        try {
            if (error) {
                $('#error-display').text(`Error: ${message}`).show();
            }
        } catch (displayError) {
            console.error('Error displaying error message', displayError);
        }
    }

    const board = $('#sudoku-board');
    let currentGame = [];
    let solvedGame = [];
    let currentLevel = 1;
    let totalSolvedPuzzles = 0;

    // Enhanced sound management
    const sounds = {
        click: new Audio('sounds/click.mp3'),
        success: new Audio('sounds/success.mp3'),
        error: new Audio('sounds/error.mp3'),
        hint: new Audio('sounds/hint.mp3'),
        background: new Audio('sounds/background.mp3')
    };

    // Safely play sound
    function playSound(soundElement) {
        try {
            soundElement.play().catch(error => {
                logError('Failed to play sound', error);
            });
        } catch (error) {
            logError('Sound playback error', error);
        }
    }

    // Global sound effect for button clicks
    function attachButtonSoundEffects() {
        $('button, .number-button').on('click', function() {
            playSound(sounds.click);
        });
    }

    // Dynamic Difficulty Configuration
    const DifficultyConfig = {
        baseRemoveCells: 20,
        cellRemovalIncrement: 2,
        complexityFactors: [
            { name: 'symmetry', weight: 0.2 },
            { name: 'patternComplexity', weight: 0.3 },
            { name: 'strategicHoles', weight: 0.5 }
        ]
    };

    function calculateDynamicDifficulty(level) {
        // Exponential difficulty scaling
        const cellsToRemove = Math.min(
            DifficultyConfig.baseRemoveCells + 
            (level * DifficultyConfig.cellRemovalIncrement),
            65  // Maximum cells that can be removed
        );

        // Additional complexity factors
        const complexityMultiplier = 1 + (Math.log(level) / 10);
        
        return {
            cellsToRemove: Math.floor(cellsToRemove * complexityMultiplier),
            strategicRemovals: level > 5,
            symmetryConstraints: level > 10
        };
    }

    // Wrap critical functions with error handling
    function safeGenerateSudoku(level) {
        try {
            return generateSudoku(level);
        } catch (error) {
            logError('Failed to generate Sudoku', error);
            // Fallback to a default board
            return Array.from({length: 9}, () => Array(9).fill(0));
        }
    }

    function generateSudoku(level) {
        const difficultyParams = calculateDynamicDifficulty(level);

        function isValid(board, row, col, num) {
            // Check row, column, and 3x3 box constraints
            for (let x = 0; x < 9; x++) {
                if (board[row][x] === num || 
                    board[x][col] === num || 
                    board[3 * Math.floor(row / 3) + Math.floor(x / 3)][3 * Math.floor(col / 3) + x % 3] === num) {
                    return false;
                }
            }
            return true;
        }

        function solveSudoku(board) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0) {
                        // Randomize number order for more varied solutions
                        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
                        for (let num of nums) {
                            if (isValid(board, row, col, num)) {
                                board[row][col] = num;
                                
                                if (solveSudoku(board)) {
                                    return true;
                                }
                                
                                board[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }

        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function applyStrategicRemovals(board, cellsToRemove) {
            let removedCount = 0;
            const strategicPatterns = [
                (row, col) => row % 3 === col % 3,  // Diagonal pattern
                (row, col) => (row + col) % 4 === 0,  // Checkerboard-like
                (row, col) => Math.abs(row - col) <= 2  // Near-diagonal
            ];

            while (removedCount < cellsToRemove) {
                const row = Math.floor(Math.random() * 9);
                const col = Math.floor(Math.random() * 9);

                // Apply strategic removal based on level
                const strategicPattern = strategicPatterns[
                    Math.min(Math.floor(level / 5), strategicPatterns.length - 1)
                ];

                if (board[row][col] !== 0 && 
                    (level <= 5 || strategicPattern(row, col))) {
                    board[row][col] = 0;
                    removedCount++;
                }
            }
        }

        // Create a full solved board
        let board = Array.from({length: 9}, () => Array(9).fill(0));
        solveSudoku(board);
        solvedGame = JSON.parse(JSON.stringify(board));

        // Remove cells based on dynamic difficulty
        applyStrategicRemovals(board, difficultyParams.cellsToRemove);

        return board;
    }

    function handleCellClick(row, col) {
        try {
            playSound(sounds.click);
            $('.sudoku-cell').removeClass('selected');
            $(`[data-row="${row}"][data-col="${col}"]`).addClass('selected');
            
            // Reset error showing flag when user interacts with the board
            showErrorsOnCheck = false;
            
            // Hide any previous error feedback
            $('#game-feedback').hide();
        } catch (error) {
            logError('Cell click error', error);
        }
    }

    function fillSelectedCell(number) {
        try {
            const selectedCell = $('.sudoku-cell.selected');
            if (selectedCell.length && !selectedCell.hasClass('pre-filled')) {
                selectedCell.text(number).attr('data-value', number);
                checkGameProgress();
            }
        } catch (error) {
            logError('Fill cell error', error);
        }
    }

    function updateLevelDisplay() {
        $('#current-level').text(`Level: ${currentLevel}`);
    }

    function renderBoard(gameBoard) {
        board.empty();
        gameBoard.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = $('<div>')
                    .addClass('sudoku-cell')
                    .attr('data-row', rowIndex)
                    .attr('data-col', colIndex)
                    .attr('data-value', cell);
                
                if (cell !== 0) {
                    cellElement.text(cell).addClass('pre-filled');
                }

                cellElement.on('click', () => handleCellClick(rowIndex, colIndex));
                board.append(cellElement);
            });
        });

        updateLevelDisplay();
    }

    function createNumberPad() {
        // Check if number pad already exists
        if ($('.number-pad').length > 0) {
            return;
        }

        // Create number pad
        const numberPad = $('<div>').addClass('number-pad');
        
        // Create number buttons (1-9)
        for (let i = 1; i <= 9; i++) {
            const numberButton = $('<button>')
                .addClass('number-button btn btn-outline-primary')
                .text(i)
                .on('click', function() {
                    const selectedCell = $('.sudoku-cell.selected');
                    if (selectedCell.length > 0) {
                        const row = parseInt(selectedCell.attr('data-row'));
                        const col = parseInt(selectedCell.attr('data-col'));
                        
                        // Update cell value
                        updateCellValue(row, col, i);
                    }
                });
            
            numberPad.append(numberButton);
        }

        // Add clear button
        const clearButton = $('<button>')
            .addClass('number-button btn btn-outline-danger')
            .html('<i class="fas fa-times"></i>')
            .on('click', function() {
                const selectedCell = $('.sudoku-cell.selected');
                if (selectedCell.length > 0) {
                    const row = parseInt(selectedCell.attr('data-row'));
                    const col = parseInt(selectedCell.attr('data-col'));
                    
                    // Clear cell value
                    updateCellValue(row, col, 0);
                }
            });
        
        numberPad.append(clearButton);

        // Add number pad to game controls
        $('.game-controls').after(numberPad);
    }

    function updateCellValue(row, col, value) {
        currentGame[row][col] = value;
        const $cell = $(`[data-row="${row}"][data-col="${col}"]`);
        $cell.text(value).attr('data-value', value);
        checkGameProgress();
    }

    let showErrorsOnCheck = false;

    function checkGameProgress() {
        try {
            const currentBoard = getCurrentBoard();
            const validationResult = validateBoard(currentBoard);

            if (validationResult.isComplete) {
                // Game is completely solved
                playSound(sounds.success);
                totalSolvedPuzzles++;
                
                // Dynamic level progression
                if (totalSolvedPuzzles % 3 === 0) {
                    currentLevel++;
                }
                
                showGameCompletionFeedback(true);
                
                // Reset error showing flag
                showErrorsOnCheck = false;
            } else {
                // Only show errors if the check button was clicked
                if (showErrorsOnCheck && validationResult.errors.length > 0) {
                    playSound(sounds.error);
                    showGameCompletionFeedback(false, validationResult.errors);
                } else {
                    // Clear any previous feedback
                    $('#game-feedback').hide();
                }
            }
        } catch (error) {
            logError('Game check failed', error);
            playSound(sounds.error);
        }
    }

    function validateBoard(board) {
        const errors = [];

        // Only validate cells that are filled
        const filledCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const currentValue = board[row][col];
                if (currentValue !== 0) {
                    filledCells.push({ row, col, value: currentValue });
                }
            }
        }

        // Check only filled cells against the solution
        filledCells.forEach(cell => {
            const solvedValue = solvedGame[cell.row][cell.col];
            if (cell.value !== solvedValue) {
                errors.push(`Incorrect number at (${cell.row + 1}, ${cell.col + 1})`);
            }
        });

        // Check if all cells are filled correctly
        const isComplete = board.every((row, rowIndex) => 
            row.every((cell, colIndex) => 
                cell === solvedGame[rowIndex][colIndex]
            )
        );

        return {
            isComplete: isComplete,
            errors: errors
        };
    }

    function showGameCompletionFeedback(isSuccess, errors = []) {
        const $feedbackArea = $('#game-feedback');
        
        if (isSuccess) {
            // Increment level
            currentLevel++;
            
            $feedbackArea.html(`
                <div class="alert alert-success">
                    <i class="fas fa-trophy me-2"></i>Congratulations! Puzzle Solved!
                    <p>Level: ${currentLevel}</p>
                </div>
            `).show();

            // Trigger level up animation
            $('.sudoku-board').addClass('level-up-animation');
            
            // Reset and generate new puzzle
            setTimeout(() => {
                $('.sudoku-board').removeClass('level-up-animation');
                
                // Reset game state
                resetGameState();
            }, 2000);
        } else {
            if (errors.length > 0) {
                $feedbackArea.html(`
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Some numbers are incorrect:
                        <ul>
                            ${errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                `).show();

                // Highlight problematic areas
                highlightErrors(errors);
            } else {
                $feedbackArea.html(`
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Keep trying! You're making progress.
                    </div>
                `).show();
            }
        }

        // Auto-hide feedback after 5 seconds
        setTimeout(() => {
            $feedbackArea.fadeOut();
        }, 5000);
    }

    function highlightErrors(errors) {
        // Reset previous highlights
        $('.sudoku-cell').removeClass('error-cell');

        errors.forEach(error => {
            const match = error.match(/\((\d+), (\d+)\)/);
            if (match) {
                const row = parseInt(match[1]) - 1;
                const col = parseInt(match[2]) - 1;
                $(`.sudoku-cell[data-row="${row}"][data-col="${col}"]`).addClass('error-cell');
            }
        });
    }

    function getCurrentBoard() {
        return currentGame.map((row, rowIndex) => 
            row.map((cell, colIndex) => 
                cell !== 0 ? cell : parseInt($(`[data-row="${rowIndex}"][data-col="${colIndex}"]`).attr('data-value')) || 0
            )
        );
    }

    function resetGameState() {
        // Remove existing number pad to prevent duplication
        $('.number-pad').remove();

        // Generate new puzzle
        currentGame = safeGenerateSudoku(currentLevel);
        
        // Render new board
        renderBoard(currentGame);
        
        // Recreate number pad
        createNumberPad();
        
        // Reset error showing flag
        showErrorsOnCheck = false;
        
        // Hide any previous feedback
        $('#game-feedback').hide();
    }

    function solveGame() {
        try {
            // Disable solve button during solving
            const $solveButton = $('#solve-game');
            $solveButton.prop('disabled', true);
            
            // Reset error showing flag
            showErrorsOnCheck = false;
            
            // Hide any previous feedback
            $('#game-feedback').hide();

            // Gradual solution reveal
            let revealedCells = 0;
            const totalCells = 81;
            const revealInterval = setInterval(() => {
                if (revealedCells < totalCells) {
                    // Find next cell to reveal
                    for (let row = 0; row < 9; row++) {
                        for (let col = 0; col < 9; col++) {
                            if (currentGame[row][col] === 0) {
                                // Reveal correct number
                                currentGame[row][col] = solvedGame[row][col];
                                
                                // Update cell in UI
                                const $cell = $(`[data-row="${row}"][data-col="${col}"]`);
                                $cell.text(solvedGame[row][col])
                                     .addClass('solved-cell')
                                     .attr('data-value', solvedGame[row][col]);
                                
                                revealedCells++;
                                
                                // Play subtle sound for each cell reveal
                                playSound(sounds.click);
                                
                                // Break after revealing one cell
                                return;
                            }
                        }
                    }
                } else {
                    // All cells revealed
                    clearInterval(revealInterval);
                    
                    // Re-enable solve button
                    $solveButton.prop('disabled', false);
                    
                    // Play success sound
                    playSound(sounds.success);
                    
                    // Show completion feedback
                    showGameCompletionFeedback(true);
                }
            }, 100); // Adjust speed of reveal
        } catch (error) {
            logError('Solve game failed', error);
            playSound(sounds.error);
        }
    }

    $('#solve-game').on('click', function() {
        solveGame();
    });

    function updateLevelDisplay() {
        $('#current-level').text(`Level: ${currentLevel}`);
    }

    // Add global error handler
    window.addEventListener('error', function(event) {
        logError('Unhandled error', event.error);
    });

    // Button event handlers with error handling
    $('#new-game').on('click', function() {
        try {
            currentGame = safeGenerateSudoku(currentLevel);
            renderBoard(currentGame);
        } catch (error) {
            logError('New game generation failed', error);
        }
    });

    $('#check-game').on('click', function() {
        // Set flag to show errors
        showErrorsOnCheck = true;
        
        // Perform game progress check
        checkGameProgress();
    });

    // Music toggle with error handling
    $('#music-toggle').on('click', function() {
        try {
            const backgroundMusic = sounds.background;
            if (backgroundMusic.paused) {
                backgroundMusic.loop = true;
                backgroundMusic.play();
                $(this).html('<i class="fas fa-volume-up"></i>');
            } else {
                backgroundMusic.pause();
                $(this).html('<i class="fas fa-volume-mute"></i>');
            }
        } catch (error) {
            logError('Music toggle failed', error);
        }
    });

    // Touch and Mobile Support
    board.on('touchstart', '.sudoku-cell', function(e) {
        e.preventDefault();
        const row = $(this).data('row');
        const col = $(this).data('col');
        handleCellClick(row, col);
    });

    // Hint system
    let hintsUsed = 0;
    const MAX_HINTS = 3;

    function provideHint() {
        // Check if hints are available
        if (hintsUsed >= MAX_HINTS) {
            logError('No more hints available');
            playSound(sounds.error);
            return;
        }

        // Find an empty cell that can be filled
        const emptyCell = findHintCell();
        
        if (!emptyCell) {
            logError('No cells available for hint');
            playSound(sounds.error);
            return;
        }

        // Reveal the correct number
        const { row, col, number } = emptyCell;
        const $cell = $(`[data-row="${row}"][data-col="${col}"]`);
        
        // Animate and fill the hint
        $cell.text(number)
             .attr('data-value', number)
             .addClass('hint-cell');
        
        // Update game state
        currentGame[row][col] = number;
        hintsUsed++;

        // Update hint button
        updateHintButton();

        // Play hint sound
        playSound(sounds.hint);

        // Optional: Check game progress after hint
        checkGameProgress();
    }

    function findHintCell() {
        // Find an empty cell with a unique solution
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (currentGame[row][col] === 0) {
                    const number = solvedGame[row][col];
                    return { row, col, number };
                }
            }
        }
        return null;
    }

    function updateHintButton() {
        const $hintButton = $('#hint-game');
        const remainingHints = MAX_HINTS - hintsUsed;
        
        if (remainingHints <= 0) {
            $hintButton.prop('disabled', true)
                       .html('<i class="fas fa-lightbulb"></i> No Hints');
        } else {
            $hintButton.html(`<i class="fas fa-lightbulb"></i> Hints (${remainingHints})`);
        }
    }

    // Add hint button to game controls
    function addHintButton() {
        const hintButton = $('<button>')
            .attr('id', 'hint-game')
            .addClass('btn btn-warning me-2')
            .html('<i class="fas fa-lightbulb"></i> Hints (3)')
            .on('click', provideHint);
        
        $('.game-controls').append(hintButton);
    }

    // Initial setup with error handling
    try {
        currentGame = safeGenerateSudoku(currentLevel);
        renderBoard(currentGame);

        // Attach sound effects to buttons
        attachButtonSoundEffects();

        // Add hint button
        addHintButton();

        // Create number pad
        createNumberPad();

        // Add feedback area
        addFeedbackArea();

        // Initial hint button setup
        updateHintButton();
    } catch (error) {
        logError('Initial game setup failed', error);
    }

    function addFeedbackArea() {
        const feedbackArea = $('<div>')
            .attr('id', 'game-feedback')
            .addClass('text-center my-3')
            .hide();
        
        $('.game-controls').after(feedbackArea);
    }
});