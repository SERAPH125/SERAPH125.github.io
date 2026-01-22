/**
 * 扫雷游戏核心逻辑
 * Minesweeper Game Logic
 */

class MinesweeperGame {
    /**
     * 构造函数
     * @param {string} boardId - 游戏容器DOM元素ID
     * @param {Object} callbacks - 回调函数集合
     * @param {Function} callbacks.onMineCountChange - 剩余雷数变化回调
     * @param {Function} callbacks.onGameOver - 游戏结束回调 (isWin: boolean, time: number)
     */
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        this.board = [];
        this.rows = 0;
        this.cols = 0;
        this.totalMines = 0;
        this.flagsPlaced = 0;
        this.isGameOver = false;
        this.startTime = null;
        this.elapsedTime = 0; // 秒
        this.firstClick = true; // 第一次点击保护

        // 音效系统
        if (typeof SoundManager !== 'undefined') {
            this.sound = new SoundManager('minesweeper_sound');
            // 默认风格
            if(!localStorage.getItem('minesweeper_sound_style')) {
                localStorage.setItem('minesweeper_sound_style', 'soft');
            }
        } else {
            this.sound = null;
        }
    }

    /**
     * 开始新游戏
     * @param {string} difficulty - 难度：'easy', 'medium', 'hard'
     */
    start(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.isGameOver = false;
        this.flagsPlaced = 0;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.firstClick = true;

        // 设置难度参数 (针对移动端优化尺寸)
        switch(difficulty) {
            case 'medium':
                this.rows = 10;
                this.cols = 10;
                this.totalMines = 15;
                break;
            case 'hard':
                this.rows = 12;
                this.cols = 12;
                this.totalMines = 25;
                break;
            case 'easy':
            default:
                this.rows = 8;
                this.cols = 8;
                this.totalMines = 8;
                break;
        }

        this.initBoard();
        this.render();
        this.updateMineCount();
    }

    /**
     * 初始化棋盘 (全空，第一次点击后生成雷)
     */
    initBoard() {
        this.board = [];
        for(let r = 0; r < this.rows; r++) {
            const row = [];
            for(let c = 0; c < this.cols; c++) {
                row.push({
                    r, c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            this.board.push(row);
        }
    }

    /**
     * 生成地雷 (保证第一次点击的位置及其周围没有雷)
     * @param {number} safeR - 第一次点击的行
     * @param {number} safeC - 第一次点击的列
     */
    generateMines(safeR, safeC) {
        let minesToPlace = this.totalMines;
        while(minesToPlace > 0) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            // 检查是否在安全区 (点击点及其周围9格)
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;

            if(!this.board[r][c].isMine) {
                this.board[r][c].isMine = true;
                minesToPlace--;
            }
        }
        this.calculateNumbers();
    }

    /**
     * 计算每个格子的周围雷数
     */
    calculateNumbers() {
        for(let r = 0; r < this.rows; r++) {
            for(let c = 0; c < this.cols; c++) {
                if(this.board[r][c].isMine) continue;
                
                let count = 0;
                for(let i = -1; i <= 1; i++) {
                    for(let j = -1; j <= 1; j++) {
                        const nr = r + i;
                        const nc = c + j;
                        if(nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                            if(this.board[nr][nc].isMine) count++;
                        }
                    }
                }
                this.board[r][c].neighborMines = count;
            }
        }
    }

    /**
     * 渲染棋盘
     */
    render() {
        if(!this.boardEl) return;
        this.boardEl.innerHTML = '';
        
        // 设置CSS grid布局
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.boardEl.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

        for(let r = 0; r < this.rows; r++) {
            for(let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                const cellEl = document.createElement('div');
                cellEl.className = 'minesweeper-cell';
                
                if(cell.isRevealed) {
                    cellEl.classList.add('revealed');
                    if(cell.isMine) {
                        cellEl.classList.add('mine');
                        cellEl.innerText = '💣';
                    } else if(cell.neighborMines > 0) {
                        cellEl.innerText = cell.neighborMines;
                        cellEl.setAttribute('data-num', cell.neighborMines); // 用于CSS着色
                        cellEl.style.color = this.getNumberColor(cell.neighborMines);
                    }
                } else if(cell.isFlagged) {
                    cellEl.classList.add('flagged');
                    cellEl.innerText = '🚩';
                }

                // 绑定事件
                // PC: 左键点击翻开，右键插旗
                cellEl.onclick = () => this.handleClick(r, c);
                cellEl.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.handleRightClick(r, c);
                };
                
                // Mobile: 长按插旗 (模拟)
                let pressTimer;
                cellEl.addEventListener('touchstart', (e) => {
                    if(this.isGameOver || cell.isRevealed) return;
                    pressTimer = setTimeout(() => {
                        this.handleRightClick(r, c);
                        e.preventDefault(); // 阻止后续click
                    }, 500); // 500ms长按
                });
                cellEl.addEventListener('touchend', () => clearTimeout(pressTimer));
                cellEl.addEventListener('touchmove', () => clearTimeout(pressTimer));

                this.boardEl.appendChild(cellEl);
            }
        }
    }

    getNumberColor(num) {
        const colors = [
            '', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'
        ];
        return colors[num] || 'black';
    }

    /**
     * 处理点击 (翻开)
     */
    handleClick(r, c) {
        if(this.isGameOver) return;
        
        const cell = this.board[r][c];
        if(cell.isFlagged || cell.isRevealed) return;

        // 第一次点击：生成雷
        if(this.firstClick) {
            this.generateMines(r, c);
            this.firstClick = false;
        }

        // 踩雷
        if(cell.isMine) {
            this.gameOver(false);
            return;
        }

        // 翻开格子
        this.reveal(r, c);
        
        if(this.sound) this.sound.play('move'); // 音效

        // 检查胜利
        if(this.checkWin()) {
            this.gameOver(true);
        } else {
            this.render();
        }
    }

    /**
     * 处理右键 (插旗)
     */
    handleRightClick(r, c) {
        if(this.isGameOver) return;
        
        const cell = this.board[r][c];
        if(cell.isRevealed) return;

        if(cell.isFlagged) {
            cell.isFlagged = false;
            this.flagsPlaced--;
            if(this.sound) this.sound.play('move'); // 移除旗子音效
        } else {
            cell.isFlagged = true;
            this.flagsPlaced++;
            if(this.sound) this.sound.play('spawn'); // 插旗音效
        }

        this.updateMineCount();
        this.render();
    }

    /**
     * 递归翻开格子 (Flood Fill)
     */
    reveal(r, c) {
        const cell = this.board[r][c];
        if(cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;

        // 如果是空格 (周围无雷)，自动翻开周围
        if(cell.neighborMines === 0) {
            for(let i = -1; i <= 1; i++) {
                for(let j = -1; j <= 1; j++) {
                    const nr = r + i;
                    const nc = c + j;
                    if(nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        this.reveal(nr, nc);
                    }
                }
            }
        }
    }

    /**
     * 更新雷数显示
     */
    updateMineCount() {
        if(this.callbacks.onMineCountChange) {
            this.callbacks.onMineCountChange(this.totalMines - this.flagsPlaced);
        }
    }

    /**
     * 检查胜利条件 (所有非雷格子都被翻开)
     */
    checkWin() {
        for(let r = 0; r < this.rows; r++) {
            for(let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if(!cell.isMine && !cell.isRevealed) return false;
            }
        }
        return true;
    }

    /**
     * 游戏结束
     */
    gameOver(isWin) {
        this.isGameOver = true;
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        
        // 翻开所有雷
        if(!isWin) {
            for(let r = 0; r < this.rows; r++) {
                for(let c = 0; c < this.cols; c++) {
                    if(this.board[r][c].isMine) {
                        this.board[r][c].isRevealed = true;
                        if(this.sound) this.sound.play('merge', 1024); // 爆炸音效
                    }
                }
            }
            this.render();
        } else {
            // 胜利时，自动标记剩下的雷
             for(let r = 0; r < this.rows; r++) {
                for(let c = 0; c < this.cols; c++) {
                    if(this.board[r][c].isMine) {
                        this.board[r][c].isFlagged = true;
                    }
                }
            }
            this.render();
            if(this.sound) this.sound.play('merge', 2048); // 胜利音效
        }

        if(this.callbacks.onGameOver) {
            this.callbacks.onGameOver(isWin, this.elapsedTime);
        }
    }
    
    // 获取当前用时
    getElapsedTime() {
        return this.isGameOver ? this.elapsedTime : Math.floor((Date.now() - this.startTime) / 1000);
    }
}
