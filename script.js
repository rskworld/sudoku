$(document).ready(function() {
    toastr.options = {
        closeButton: true,
        debug: false,
        newestOnTop: false,
        progressBar: true,
        positionClass: "toast-top-right",
        preventDuplicates: true,
        onclick: null,
        showDuration: "300",
        hideDuration: "1000",
        timeOut: "5000",
        extendedTimeOut: "1000",
        showEasing: "swing",
        hideEasing: "linear",
        showMethod: "fadeIn",
        hideMethod: "fadeOut"
    };

    class SlidingPuzzle {
        constructor(size = 4) {
            this.logger = {
                info: (message) => console.log(`[RSKWORLD] ${message}`),
                warn: (message) => console.warn(`[RSKWORLD] ${message}`),
                error: (message) => console.error(`[RSKWORLD] ${message}`)
            };

            this.size = size;
            this.board = [];
            this.emptyTile = { x: size - 1, y: size - 1 };
            this.moves = 0;
            this.level = 1;
            
            this.isMusicEnabled = true;
            this.isSoundEffectsEnabled = true;
            this.highScore = this.getHighScore();
            
            this.touchStartX = null;
            this.touchStartY = null;

            this.setupMobileResponsiveness();
            
            this.initializeAudio();
            this.initializeBoard();
            this.setupEventListeners();
            this.setupKeyboardControls();
            this.updateHighScoreDisplay();

            this.buttonClickSound = document.getElementById('button-click-sound');

            this.logger.info('Sliding Puzzle Game Initialized');
        }

        initializeAudio() {
            this.moveSound = document.getElementById('move-sound');
            this.winSound = document.getElementById('win-sound');
            this.backgroundMusic = document.getElementById('background-music');
        }

        initializeBoard() {
            $('#game-board').empty();
            this.board = [];
            let number = 1;
            for (let y = 0; y < this.size; y++) {
                this.board[y] = [];
                for (let x = 0; x < this.size; x++) {
                    if (x === this.emptyTile.x && y === this.emptyTile.y) {
                        this.board[y][x] = null;
                    } else {
                        this.board[y][x] = number++;
                    }
                }
            }
            this.advancedShuffle();
            this.renderBoard();
        }

        advancedShuffle() {
            try {
                const flatBoard = _.flatten(this.board).filter(tile => tile !== null);
                const shuffledTiles = _.shuffle(flatBoard);
                
                let index = 0;
                for (let y = 0; y < this.size; y++) {
                    for (let x = 0; x < this.size; x++) {
                        if (x === this.emptyTile.x && y === this.emptyTile.y) {
                            this.board[y][x] = null;
                        } else {
                            this.board[y][x] = shuffledTiles[index++];
                        }
                    }
                }

                if (!this.isPuzzleSolvable()) {
                    this.logger.warn('Generated unsolvable puzzle, reshuffling');
                    this.advancedShuffle();
                }

                this.moves = 0;
                $('#moves-counter').text('Moves: 0');
                this.logger.info('Advanced shuffle completed');
            } catch (error) {
                this.handleError(error);
            }
        }

        isPuzzleSolvable() {
            const flatBoard = _.flatten(this.board).filter(tile => tile !== null);
            
            let inversions = 0;
            for (let i = 0; i < flatBoard.length; i++) {
                for (let j = i + 1; j < flatBoard.length; j++) {
                    if (flatBoard[i] > flatBoard[j]) {
                        inversions++;
                    }
                }
            }

            const emptyRowFromBottom = this.size - Math.floor(this.emptyTile.y);
            
            return emptyRowFromBottom % 2 === 0 
                ? inversions % 2 === 0 
                : inversions % 2 === 1;
        }

        setupEventListeners() {
            $('#shuffle-btn').on('click', () => {
                this.playButtonClickSound();
                this.advancedShuffle();
                this.renderBoard();
                toastr.info('Puzzle Shuffled!', 'Shuffle');
            });
            
            $('#music-btn').on('click', () => {
                this.playButtonClickSound();
                this.toggleMusic();
            });

            $('#sfx-btn').on('click', () => {
                this.playButtonClickSound();
                this.toggleSoundEffects();
            });
            
            $('#play-btn').on('click', () => {
                this.playButtonClickSound();
                this.initializeBoard();
                toastr.success('New Game Started!', 'Play');
            });

            $('#help-btn').on('click', () => {
                this.playButtonClickSound();
                $('#helpModal').modal('show');
            });
        }

        toggleMusic() {
            this.isMusicEnabled = !this.isMusicEnabled;
            const $musicIcon = $('#music-icon');
            
            if (this.isMusicEnabled) {
                $musicIcon.removeClass('fa-music-slash').addClass('fa-music');
                this.backgroundMusic.play();
                toastr.info('Background Music Enabled', 'Music');
            } else {
                $musicIcon.removeClass('fa-music').addClass('fa-music-slash');
                this.backgroundMusic.pause();
                toastr.info('Background Music Disabled', 'Music');
            }
        }

        toggleSoundEffects() {
            this.isSoundEffectsEnabled = !this.isSoundEffectsEnabled;
            const $sfxIcon = $('#sfx-icon');
            
            if (this.isSoundEffectsEnabled) {
                $sfxIcon.removeClass('fa-volume-mute').addClass('fa-volume-up');
                toastr.info('Sound Effects Enabled', 'SFX');
            } else {
                $sfxIcon.removeClass('fa-volume-up').addClass('fa-volume-mute');
                toastr.info('Sound Effects Disabled', 'SFX');
            }
        }

        playButtonClickSound() {
            if (this.isSoundEffectsEnabled && this.buttonClickSound) {
                const sound = this.buttonClickSound.cloneNode(true);
                sound.play();
            }
        }

        saveHighScore() {
            localStorage.setItem('slidingPuzzleHighScore', this.highScore);
        }

        getHighScore() {
            return parseInt(localStorage.getItem('slidingPuzzleHighScore')) || 0;
        }

        updateHighScoreDisplay() {
            $('#high-score-display').text(`High Score: ${this.highScore}`);
        }

        playSound(sound) {
            if (this.isSoundEffectsEnabled && sound) {
                sound.play();
            }
        }

        logGameState() {
            this.logger.info(JSON.stringify({
                board: this.board,
                emptyTile: this.emptyTile,
                moves: this.moves,
                level: this.level
            }, null, 2));
        }

        handleError(error) {
            this.logger.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
                footer: 'Something went wrong!'
            });
        }

        setupKeyboardControls() {
            $(document).on('keydown', (e) => {
                e.preventDefault();
                const emptyX = this.emptyTile.x;
                const emptyY = this.emptyTile.y;

                switch(e.key) {
                    case 'ArrowUp':
                        if (emptyY < this.size - 1) {
                            this.moveTile(emptyX, emptyY + 1);
                        }
                        break;
                    case 'ArrowDown':
                        if (emptyY > 0) {
                            this.moveTile(emptyX, emptyY - 1);
                        }
                        break;
                    case 'ArrowLeft':
                        if (emptyX < this.size - 1) {
                            this.moveTile(emptyX + 1, emptyY);
                        }
                        break;
                    case 'ArrowRight':
                        if (emptyX > 0) {
                            this.moveTile(emptyX - 1, emptyY);
                        }
                        break;
                }
            });
        }

        setupMobileResponsiveness() {
            document.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });

            $('body, html').css({
                'touch-action': 'none',
                'overflow': 'hidden',
                '-ms-touch-action': 'none',
                '-webkit-user-select': 'none',
                'user-select': 'none'
            });

            $('head').append(
                '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">'
            );

            const resizeBoard = () => {
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const gameBoard = $('#game-board');
                
                const boardSize = Math.min(screenWidth * 0.9, screenHeight * 0.5);
                
                gameBoard.css({
                    'width': `${boardSize}px`,
                    'height': `${boardSize}px`,
                    'max-width': '100%',
                    'margin': '0 auto'
                });

                const tileSize = boardSize / this.size;
                $('.puzzle-tile').css({
                    'width': `${tileSize}px`,
                    'height': `${tileSize}px`,
                    'font-size': `${tileSize * 0.5}px`
                });
            };

            resizeBoard();
            $(window).on('resize orientationchange', resizeBoard);
        }

        renderBoard() {
            const $gameBoard = $('#game-board');
            $gameBoard.empty();
            $gameBoard.css('grid-template-columns', `repeat(${this.size}, 1fr)`);

            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    const $tile = $('<div>')
                        .addClass('puzzle-tile')
                        .data('x', x)
                        .data('y', y)
                        .attr('data-rskworld-game', 'sliding-puzzle')
                        .attr('data-rskworld-contact', 'https://rskworld.in/contact.php');

                    if (this.board[y][x] === null) {
                        $tile.addClass('empty');
                    } else {
                        $tile.text(this.board[y][x]);
                    }

                    $tile
                        .on('click touchstart', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const eventType = e.type;
                            
                            if (eventType === 'touchstart') {
                                const touch = e.originalEvent.touches[0];
                                const touchX = touch.clientX;
                                const touchY = touch.clientY;
                                
                                this.touchStartX = touchX;
                                this.touchStartY = touchY;
                                
                                $(e.target).addClass('touch-active');
                            }

                            this.moveTile(x, y);
                        })
                        .on('touchmove', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        })
                        .on('touchend', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            $('.puzzle-tile').removeClass('touch-active');
                        });

                    $gameBoard.append($tile);
                }
            }

            $gameBoard.on('touchstart touchmove touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        moveTile(x, y) {
            event.preventDefault();
            event.stopPropagation();

            if (this.isAdjacent(x, y)) {
                this.playSound(this.moveSound);
                this.swapTiles(x, y, this.emptyTile.x, this.emptyTile.y);
                this.emptyTile = { x, y };
                this.moves++;
                $('#moves-counter').text(`Moves: ${this.moves}`);
                this.renderBoard();
                
                if (this.checkWin()) {
                    this.handleWin();
                }
            }
        }

        isAdjacent(x, y) {
            return (
                (Math.abs(x - this.emptyTile.x) === 1 && y === this.emptyTile.y) ||
                (Math.abs(y - this.emptyTile.y) === 1 && x === this.emptyTile.x)
            );
        }

        swapTiles(x1, y1, x2, y2) {
            [this.board[y1][x1], this.board[y2][x2]] = [this.board[y2][x2], this.board[y1][x1]];
        }

        checkWin() {
            let number = 1;
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    if (x === this.emptyTile.x && y === this.emptyTile.y) continue;
                    if (this.board[y][x] !== number++) return false;
                }
            }
            return true;
        }

        increaseDifficulty() {
            if (this.level % 3 === 0 && this.size < 6) {
                this.size++;
                this.logger.info(`Difficulty increased. New grid size: ${this.size}x${this.size}`);
                toastr.success(`Difficulty Increased to ${this.size}x${this.size}!`, 'Level Up');
            }
        }

        handleWin() {
            try {
                Swal.fire({
                    title: 'Congratulations!',
                    html: `You solved the puzzle in ${this.moves} moves!`,
                    icon: 'success',
                    confirmButtonText: 'Play Again',
                    animation: true,
                    customClass: {
                        popup: 'animate__animated animate__bounceIn'
                    }
                });

                this.increaseDifficulty();
                toastr.success(`Level Up! You are now on Level ${this.level}`, 'Congratulations');

                this.playSound(this.winSound);
                this.level++;
                $('#level-display').text(`Level: ${this.level}`);
                
                if (this.moves < this.highScore || this.highScore === 0) {
                    this.highScore = this.moves;
                    this.saveHighScore();
                    this.updateHighScoreDisplay();
                }

                $('.puzzle-tile:not(.empty)').addClass('correct');
                
                setTimeout(() => {
                    $('.puzzle-tile').removeClass('correct');
                    this.initializeBoard();
                }, 1500);

                this.logGameState();
            } catch (error) {
                this.handleError(error);
            }
        }
    }

    try {
        const game = new SlidingPuzzle();
    } catch (error) {
        console.error('RSKWORLD Game Initialization Failed:', error);
        Swal.fire({
            icon: 'error',
            title: 'RSKWORLD Game Error',
            text: 'Unable to start the game. Please refresh the page.'
        });
    }
});