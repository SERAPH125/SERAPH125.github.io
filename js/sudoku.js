/**
 * 数独游戏核心逻辑 (V1.0)
 * Sudoku Game Logic
 * 
 * 架构设计：
 * - 采用类封装，与 Match3Game、Game2048 保持一致
 * - 通过回调函数与页面交互，解耦游戏逻辑和UI
 * - 支持难度选择（困难/地狱级/数据极限）
 * - 错误检测机制：困难允许3次错误，地狱级允许2次错误，数据极限只允许1次错误
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
        this.difficulty = 'hard'; // hard, hell, extreme
        this.initialBoard = []; // 初始题目（不可变）
        this.currentBoard = []; // 当前状态
        this.solution = []; // 答案
        
        // 笔记功能
        this.isPencilMode = false;
        this.marks = []; // 9x9 数组，每个元素是 Set<number>
        
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.isGameOver = false;
        this.startTime = null;
        this.elapsedTime = 0;
        
        // 音效系统
        if (typeof SoundManager !== 'undefined') {
            this.sound = new SoundManager('sudoku_sound');
            // 数独也可以有自己的风格，默认用 soft
            if(!localStorage.getItem('sudoku_sound_style')) {
                localStorage.setItem('sudoku_sound_style', 'soft');
            }
        } else {
            this.sound = null;
        }
    }

    /**
     * 开始新游戏
     * @param {string} difficulty - 难度：'hard', 'hell', 'extreme'
     */
    start(difficulty = 'hard') {
        this.difficulty = difficulty;
        this.mistakes = 0;
        this.isGameOver = false;
        this.selectedCell = null;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        
        // 根据难度设置错误次数限制
        if (difficulty === 'extreme') {
            this.maxMistakes = 1; // 数据极限：只允许1次错误
        } else if (difficulty === 'hell') {
            this.maxMistakes = 2; // 地狱级：允许2次错误
        } else {
            this.maxMistakes = 3; // 困难：允许3次错误
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
        let holes = 50; // 困难：挖掉50个，留31个提示
        if (this.difficulty === 'hell') {
            holes = 62; // 地狱级：挖掉62个，只留19个提示
        } else if (this.difficulty === 'extreme') {
            holes = 70; // 数据极限：挖掉70个，只留11个提示（接近理论极限）
        }
        
        // 深拷贝
        this.initialBoard = this.solution.map(row => [...row]);
        this.currentBoard = this.solution.map(row => [...row]);
        
        // 初始化笔记数据
        this.marks = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
        
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
                
                // 显示数字或笔记
                if(value !== 0) {
                    cell.innerText = value;
                } else {
                    // 显示笔记
                    const cellMarks = this.marks[r][c];
                    if(cellMarks.size > 0) {
                        const marksContainer = document.createElement('div');
                        marksContainer.className = 'cell-marks';
                        // 1-9 占位
                        for(let i=1; i<=9; i++) {
                            const markEl = document.createElement('div');
                            markEl.className = 'mark-num';
                            if(cellMarks.has(i)) {
                                markEl.innerText = i;
                                // 如果该数字也是当前高亮数字，给笔记也加点颜色？
                                if(this.selectedCell && 
                                   this.currentBoard[this.selectedCell.r][this.selectedCell.c] === i) {
                                    markEl.style.color = '#007bff';
                                    markEl.style.fontWeight = 'bold';
                                }
                            }
                            marksContainer.appendChild(markEl);
                        }
                        cell.appendChild(marksContainer);
                    }
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
        
        // V4.1: 允许选择初始数字以高亮相同数字，但后续操作会拦截修改
        this.selectedCell = {r, c};
        
        // 播放轻微点击音效
        if(this.sound) this.sound.play('move');
        
        this.render();
    }

    /**
     * 自动填充所有候选笔记
     */
    autoFillNotes() {
        if(this.isGameOver) return;
        
        // 遍历所有格子
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                // 只对空白格操作
                if(this.currentBoard[r][c] === 0) {
                    this.marks[r][c].clear(); // 先清空旧笔记
                    
                    // 检查 1-9 每个数字是否可能
                    for(let num = 1; num <= 9; num++) {
                        if(this.isValid(this.currentBoard, r, c, num)) {
                            this.marks[r][c].add(num);
                        }
                    }
                }
            }
        }
        
        if(this.sound) this.sound.play('spawn'); // 播放音效
        this.render();
    }

    /**
     * 清空所有笔记
     */
    clearAllNotes() {
        if(this.isGameOver) return;
        
        let hasCleared = false;
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                if(this.marks[r][c].size > 0) {
                    this.marks[r][c].clear();
                    hasCleared = true;
                }
            }
        }
        
        if(hasCleared) {
            if(this.sound) this.sound.play('spawn'); // 播放音效
            this.render();
        }
    }

    /**
     * 切换笔记模式
     */
    togglePencil() {
        this.isPencilMode = !this.isPencilMode;
        const btnText = document.getElementById('pencil-status');
        const btn = document.getElementById('btn-pencil');
        if(btnText) btnText.innerText = this.isPencilMode ? '开' : '关';
        if(btn) btn.style.background = this.isPencilMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
    }

    /**
     * 输入数字
     * @param {number} num - 数字 1-9，0表示擦除
     */
    inputNumber(num) {
        if(this.isGameOver || !this.selectedCell) return;
        
        const {r, c} = this.selectedCell;
        
        // 不可修改初始数字
        if(this.initialBoard[r][c] !== 0) {
            return;
        }
        
        // 擦除
        if(num === 0) {
            this.currentBoard[r][c] = 0;
            this.marks[r][c].clear(); // 同时清除笔记
            if(this.sound) this.sound.play('spawn'); 
            this.render();
            return;
        }
        
        // 笔记模式逻辑
        if(this.isPencilMode) {
            // 如果该格已有确定的数字，笔记模式下点击无效，或者你希望先清除数字再记笔记？
            // 通常逻辑：如果有数字，先清除数字？或者如果数字不对，才允许改？
            // 简单逻辑：如果有非0数字，笔记模式不生效，或者覆盖？
            // 这里采用：如果当前格是空的，则切换标记；如果已有数字，先不动（需先擦除）
            if(this.currentBoard[r][c] === 0) {
                if(this.marks[r][c].has(num)) {
                    this.marks[r][c].delete(num);
                } else {
                    this.marks[r][c].add(num);
                }
                if(this.sound) this.sound.play('move'); // 轻微音效
                this.render();
            }
            return;
        }
        
        // 正常填数模式
        this.currentBoard[r][c] = num;
        this.marks[r][c].clear(); // 填入数字后清除该格笔记
        
        // 自动清除同行、同列、同宫格的其他格子的该数字标记 (智能辅助)
        this.autoClearMarks(r, c, num);
        
        // 播放填入音效
        if(this.sound) this.sound.play('merge', 100); 

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
     * 自动清除关联区域的笔记
     */
    autoClearMarks(r, c, num) {
        // 行
        for(let i=0; i<9; i++) if(i!==c) this.marks[r][i].delete(num);
        // 列
        for(let i=0; i<9; i++) if(i!==r) this.marks[i][c].delete(num);
        // 宫
        let boxR = Math.floor(r/3)*3;
        let boxC = Math.floor(c/3)*3;
        for(let i=0; i<3; i++) {
            for(let j=0; j<3; j++) {
                if(boxR+i !== r || boxC+j !== c) {
                    this.marks[boxR+i][boxC+j].delete(num);
                }
            }
        }
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
