/**
 * 数独游戏核心逻辑 (V1.0)
 * Sudoku Game Logic
 * 
 * 架构设计：
 * - 采用类封装，与 Match3Game、Game2048 保持一致
 * - 通过回调函数与页面交互，解耦游戏逻辑和UI
 * - 支持难度选择（简单/中等/困难/超级难）
 * - 错误检测机制：简单/中等/困难允许3次错误，超级难只允许2次错误
 */
class SudokuGame {
    /**
     * 构造函数
     * @param {string} boardId - 游戏容器DOM元素ID
     * @param {Object} callbacks - 回调函数集合
     * @param {Function} callbacks.onMistakesChange - 错误次数变化回调
     * @param {Function} callbacks.onGameOver - 游戏结束回调 (isWin: boolean)
     */
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        this.selectedCell = null; // {r, c}
        this.difficulty = 'easy'; // easy, medium, hard, expert
        this.initialBoard = []; // 初始题目（不可变）
        this.currentBoard = []; // 当前状态
        this.solution = []; // 答案
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.isGameOver = false;
        this.startTime = null;
        this.elapsedTime = 0;
    }

    /**
     * 开始新游戏
     * @param {string} difficulty - 难度：'easy', 'medium', 'hard', 'expert'
     */
    start(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.mistakes = 0;
        this.isGameOver = false;
        this.selectedCell = null;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        
        // 超级难模式：只允许2次错误
        if (difficulty === 'expert') {
            this.maxMistakes = 2;
        } else {
            this.maxMistakes = 3;
        }
        
        // 生成题目
        this.generateBoard();
        this.render();
        
        if(this.callbacks.onMistakesChange) {
            this.callbacks.onMistakesChange(this.mistakes, this.maxMistakes);
        }
    }

    /**
     * 生成数独题目
     */
    generateBoard() {
        // 1. 生成完整解
        this.solution = this.generateSolution();
        
        // 2. 根据难度挖空
        let holes = 30; // easy
        if (this.difficulty === 'medium') holes = 40;
        if (this.difficulty === 'hard') holes = 50;
        if (this.difficulty === 'expert') holes = 62; // 超级难：挖掉62个，只留19个提示
        
        // 深拷贝
        this.initialBoard = this.solution.map(row => [...row]);
        this.currentBoard = this.solution.map(row => [...row]);
        
        // 随机挖空
        let count = 0;
        while(count < holes) {
            let r = Math.floor(Math.random() * 9);
            let c = Math.floor(Math.random() * 9);
            
            if(this.currentBoard[r][c] !== 0) {
                this.currentBoard[r][c] = 0; // 0 表示空
                this.initialBoard[r][c] = 0;
                count++;
            }
        }
    }

    /**
     * 使用回溯法生成完整数独解
     * @returns {Array} 9x9 数独矩阵
     */
    generateSolution() {
        let board = Array(9).fill().map(() => Array(9).fill(0));
        this.fillBoard(board);
        return board;
    }

    /**
     * 回溯填充数独
     * @param {Array} board - 数独矩阵
     * @returns {boolean} 是否成功填充
     */
    fillBoard(board) {
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                if(board[r][c] === 0) {
                    // 随机顺序尝试数字，增加随机性
                    let nums = [1,2,3,4,5,6,7,8,9];
                    nums.sort(() => Math.random() - 0.5);
                    
                    for(let num of nums) {
                        if(this.isValid(board, r, c, num)) {
                            board[r][c] = num;
                            if(this.fillBoard(board)) return true;
                            board[r][c] = 0; // 回溯
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 检查数字是否有效
     * @param {Array} board - 数独矩阵
     * @param {number} r - 行
     * @param {number} c - 列
     * @param {number} num - 数字
     * @returns {boolean} 是否有效
     */
    isValid(board, r, c, num) {
        // 检查行
        for(let i = 0; i < 9; i++) {
            if(board[r][i] === num) return false;
        }
        // 检查列
        for(let i = 0; i < 9; i++) {
            if(board[i][c] === num) return false;
        }
        // 检查3x3宫格
        let boxR = Math.floor(r / 3) * 3;
        let boxC = Math.floor(c / 3) * 3;
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < 3; j++) {
                if(board[boxR + i][boxC + j] === num) return false;
            }
        }
        return true;
    }

    /**
     * 渲染游戏界面
     */
    render() {
        if(!this.boardEl) return;
        
        this.boardEl.innerHTML = '';
        
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                
                const value = this.currentBoard[r][c];
                
                // 显示数字
                if(value !== 0) {
                    cell.innerText = value;
                }
                
                // 样式处理
                if(this.initialBoard[r][c] !== 0) {
                    // 初始数字（不可修改）
                    cell.classList.add('fixed');
                } else if(value !== 0) {
                    // 用户填入的数字
                    cell.classList.add('user-filled');
                    // 检查是否正确
                    if(value !== this.solution[r][c]) {
                        cell.classList.add('error');
                    }
                }
                
                // 选中高亮
                if(this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === c) {
                    cell.classList.add('selected');
                }
                // 同数字高亮（辅助功能）
                else if(this.selectedCell && 
                        this.currentBoard[this.selectedCell.r][this.selectedCell.c] !== 0 && 
                        value === this.currentBoard[this.selectedCell.r][this.selectedCell.c]) {
                    cell.classList.add('highlight-same');
                }
                
                // 宫格边界（加粗）
                if((c + 1) % 3 === 0 && c !== 8) {
                    cell.style.borderRight = '2px solid #555';
                }
                if((r + 1) % 3 === 0 && r !== 8) {
                    cell.style.borderBottom = '2px solid #555';
                }

                cell.onclick = () => this.selectCell(r, c);
                this.boardEl.appendChild(cell);
            }
        }
    }

    /**
     * 选择单元格
     * @param {number} r - 行
     * @param {number} c - 列
     */
    selectCell(r, c) {
        if(this.isGameOver) return;
        // 初始数字不可选择
        if(this.initialBoard[r][c] !== 0) return;
        
        this.selectedCell = {r, c};
        this.render();
    }

    /**
     * 输入数字
     * @param {number} num - 数字 1-9，0表示擦除
     */
    inputNumber(num) {
        if(this.isGameOver || !this.selectedCell) return;
        
        const {r, c} = this.selectedCell;
        
        // 不可修改初始数字
        if(this.initialBoard[r][c] !== 0) return;
        
        // 擦除
        if(num === 0) {
            this.currentBoard[r][c] = 0;
            this.render();
            return;
        }
        
        // 填入数字
        this.currentBoard[r][c] = num;
        
        // 检查正确性
        if(num !== this.solution[r][c]) {
            this.mistakes++;
            if(this.callbacks.onMistakesChange) {
                this.callbacks.onMistakesChange(this.mistakes, this.maxMistakes);
            }
            
            // 超过最大错误次数，游戏失败
            if(this.mistakes >= this.maxMistakes) {
                this.isGameOver = true;
                if(this.callbacks.onGameOver) {
                    this.callbacks.onGameOver(false); // 失败
                }
            }
        } else {
            // 检查是否完成
            if(this.checkWin()) {
                this.isGameOver = true;
                this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
                if(this.callbacks.onGameOver) {
                    this.callbacks.onGameOver(true, this.elapsedTime); // 胜利，传递用时
                }
            }
        }
        
        this.render();
    }
    
    /**
     * 擦除当前选中单元格
     */
    erase() {
        this.inputNumber(0);
    }

    /**
     * 检查是否完成
     * @returns {boolean} 是否完成
     */
    checkWin() {
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                if(this.currentBoard[r][c] !== this.solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 获取当前用时（秒）
     * @returns {number} 用时
     */
    getElapsedTime() {
        if(this.startTime) {
            return Math.floor((Date.now() - this.startTime) / 1000);
        }
        return this.elapsedTime;
    }
}
