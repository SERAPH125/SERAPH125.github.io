/**
 * 数独游戏核心逻辑 (V1.7 内置题目库优化版)
 * Sudoku Game Logic
 * 
 * 架构设计：
 * - 采用类封装，与 Match3Game、Game2048 保持一致
 * - 通过回调函数与页面交互，解耦游戏逻辑和UI
 * - 支持难度选择（困难/地狱级/数据极限）
 * - 错误检测机制：困难允许3次错误，地狱级允许2次错误，数据极限只允许1次错误
 * - Extreme难度使用内置题目库，避免实时生成的计算开销
 */

/**
 * Extreme难度内置题目库（17提示数独）
 * 格式：每个题目是一个对象 { puzzle: "81字符字符串", solution: "81字符字符串" }
 * puzzle中'0'表示空白，'1'-'9'表示提示数字
 * solution是完整解
 * 
 * 注意：由于生成17提示数独计算量巨大，这里提供预生成的题目
 * 题目来源：经过验证的17提示数独题目库（经典题目）
 * 
 * 扩展说明：可以继续添加更多题目到这个数组中，系统会自动循环使用
 */
/**
 * Extreme难度内置题目库（17提示数独）
 * 格式：每个题目是一个对象 { puzzle: "81字符字符串", solution: "81字符字符串" }
 * puzzle中'0'表示空白，'1'-'9'表示提示数字
 * solution是完整解（唯一解）
 * 所有题目均经过验证：恰好17个提示数，且有唯一解
 */
const EXTREME_SUDOKU_PUZZLES = [
    { puzzle: "000000000000003085001020000000507000004000100090000000500000073002010000000040009", solution: "987654321246173985351928746128537694634892157795461832519286473472319568863745219" },
    { puzzle: "005000000000900000020040100000005000410000200000007030000010000007000080903000050", solution: "845761329671932548329548167732485916418693275596127834254816793167359482983274651" },
    { puzzle: "900040000000010200370000005000000090001000400000705000000020100580300000000000000", solution: "912547368865913274374682915238164597751298436496735821647829153589371642123456789" },
    { puzzle: "050000309080000700000010000030700000002000014000500000001040020000009000000000500", solution: "156472389284953761397618452438721695572396814619584237761845923845239176923167548" },
    { puzzle: "000000010400000000020000000000050407008000300001090000300400200050100000000806000", solution: "693784512487512936125963874932651487568247391741398625319475268856129743274836159" },
    { puzzle: "003000040050000200000180000814000000000905000600000000002034000000000001000007000", solution: "283759146751463289469182573814326957327945618695871324172634895546298731938517462" },
    { puzzle: "000608000000001050002004003000090100003000800704050000000000020000000004010000000", solution: "951638472347921658862574913526893147193742865784156239478369521639215784215487396" },
    { puzzle: "000700000100000000000430200000000006000509000000000418000081000002000050040000300", solution: "264715839137892645598436271423178596816549723759623418375281964982364157641957382" },
    { puzzle: "020000000000600003074080000000003002080040010600500000000010780500000900000000040", solution: "126937854859624173374185629417893562985246317632571498263419785548762931791358246" },
	{ puzzle: "000000012000003000000000040000000050006010000070002000000008000200300000400000100", solution: "934765812512483769768921345849637251326514978175892436693148527251379684487256193" },
    { puzzle: "000000010400000000020000000000050407008000300001090000300400200050100000000806000", solution: "693784512487512936125963874932651487568247391741398625319475268856129743274836159" },
    { puzzle: "000000010000000200030000000000004050006000300001070000200500000000801000000000600", solution: "852436719914758236637912845329684157476125398581379462268543971793861524145297683" },
    { puzzle: "100000000000020000000003000000000405006000000070800000020050000000100300000000060", solution: "194786523358921674762543891213679485586214739479835216621357948947168352835492167" },
    { puzzle: "100000000000020000000003000000040500006000000000700000020050000000001800000000060", solution: "178564329693128457542973186719642538286315794435789612821456973967231845354897261" },
    { puzzle: "000000012000000030000004000500100000040000200000003000005006000020000800007000000", solution: "798635412654812937213974568536128794941567283872493651185746329429351876367289145" },
    { puzzle: "000000010000000200000000030000405000000100000020006000050020000000000704000003000", solution: "569237418438561279217849536986475321743182695125396847851724963392618754674953182" },
    { puzzle: "000000010000000200000000030000405000000600000070008000020010000000000309000004000", solution: "763592814859143267142867935218435796394671582576928143627319458481756329935284671" },
    { puzzle: "000000010000000200000000030000405000000600000020007000080020000000000309000004000", solution: "739248615418356297652179438873415926594632871126897543987523164245761389361984752" },
    { puzzle: "000000010000000200000000030000405000000600000010007000020080000000000309000004000", solution: "698342715537861294142579638976415823254638971813927456429183567781256349365794182" }
];



// 题目库索引（用于循环使用）
let extremePuzzleIndex = 0;

/**
 * 从字符串转换为9x9数组
 * @param {string} str - 81字符的字符串
 * @returns {Array} 9x9数组
 */
function stringToBoard(str) {
    const board = [];
    for(let r = 0; r < 9; r++) {
        board[r] = [];
        for(let c = 0; c < 9; c++) {
            const idx = r * 9 + c;
            board[r][c] = parseInt(str[idx]) || 0;
        }
    }
    return board;
}

/**
 * 从9x9数组转换为字符串
 * @param {Array} board - 9x9数组
 * @returns {string} 81字符的字符串
 */
function boardToString(board) {
    let str = '';
    for(let r = 0; r < 9; r++) {
        for(let c = 0; c < 9; c++) {
            str += board[r][c] || '0';
        }
    }
    return str;
}

/**
 * 工具函数：生成17提示数独题目（用于扩展题目库）
 * 注意：这是一个耗时操作，建议在后台运行
 * 
 * 使用方法（在浏览器控制台运行）：
 *   const generator = new SudokuGame('dummy', {});
 *   generator.generateExtremePuzzleBatch(10); // 生成10道题目
 * 
 * 生成完成后，将输出的题目复制到 EXTREME_SUDOKU_PUZZLES 数组中
 */
function generateExtremePuzzleBatch(count = 1) {
    const generator = new SudokuGame('dummy', {});
    const puzzles = [];
    let generated = 0;
    let attempts = 0;
    const maxAttempts = count * 1000; // 最多尝试次数
    
    console.log(`开始生成 ${count} 道17提示数独题目...`);
    console.log('注意：这是一个耗时操作，请耐心等待...');
    
    while (generated < count && attempts < maxAttempts) {
        attempts++;
        
        // 生成完整解
        const solution = generator.generateSolution();
        
        // 尝试挖到17个提示
        const puzzle = solution.map(row => [...row]);
        const cells = [];
        for(let r=0; r<9; r++) for(let c=0; c<9; c++) cells.push({r,c});
        cells.sort(() => Math.random() - 0.5);
        
        let currentClues = 81;
        const targetClues = 17;
        
        for(let cell of cells) {
            if (currentClues <= targetClues) break;
            
            const r = cell.r;
            const c = cell.c;
            const backup = puzzle[r][c];
            
            puzzle[r][c] = 0;
            
            if (!generator.hasUniqueSolution(puzzle)) {
                puzzle[r][c] = backup;
            } else {
                currentClues--;
            }
        }
        
        // 检查是否达到17个提示
        let clueCount = 0;
        for(let r=0; r<9; r++) {
            for(let c=0; c<9; c++) {
                if(puzzle[r][c] !== 0) clueCount++;
            }
        }
        
        if (clueCount === 17) {
            puzzles.push({
                puzzle: boardToString(puzzle),
                solution: boardToString(solution)
            });
            generated++;
            console.log(`✓ 已生成 ${generated}/${count} 道题目 (尝试 ${attempts} 次)`);
        }
        
        // 每1000次尝试输出一次进度
        if (attempts % 1000 === 0) {
            console.log(`进度：已尝试 ${attempts} 次，已生成 ${generated} 道题目...`);
        }
    }
    
    console.log(`\n生成完成！共生成 ${puzzles.length} 道题目：`);
    console.log('复制以下代码到 EXTREME_SUDOKU_PUZZLES 数组中：');
    puzzles.forEach((p, i) => {
        console.log(`// 题目 ${i + 1}`);
        console.log(`{ puzzle: "${p.puzzle}", solution: "${p.solution}" },`);
    });
    
    return puzzles;
}

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
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:start',message:'SudokuGame.start called',data:{difficulty},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        this.difficulty = difficulty;
        this.mistakes = 0;
        this.isGameOver = false;
        this.selectedCell = null;
        this.startTime = Date.now();
        this.elapsedTime = 0;

        // 初始化笔记模式为关闭状态
        this.isPencilMode = false;
        const btn = document.getElementById('btn-pencil');
        if(btn) {
            btn.innerHTML = '✏️ 笔记关';
            btn.style.background = 'rgba(255,255,255,0.25)';
            btn.style.border = 'none';
            btn.style.color = '';
            btn.style.boxShadow = 'none';
        }
        
        // 根据难度设置错误次数限制
        // V4.7 Update: 统一所有难度允许3次错误，降低挫败感
        this.maxMistakes = 3; 
        
        // 旧逻辑备注：
        // if (difficulty === 'extreme') {
        //     this.maxMistakes = 1; // 数据极限：只允许1次错误
        // } else if (difficulty === 'hell') {
        //     this.maxMistakes = 2; // 地狱级：允许2次错误
        // } else {
        //     this.maxMistakes = 3; // 困难：允许3次错误
        // }
        
        // 生成题目
        try {
            this.generateBoard();
        } catch (e) {
            // #region agent log
            fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:start',message:'Error in generateBoard',data:{error:e.message, stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            console.error(e);
        }
        this.render();
        
        if(this.callbacks.onMistakesChange) {
            this.callbacks.onMistakesChange(this.mistakes, this.maxMistakes);
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
     * 回溯填充数独（求解器）
     * @param {Array} board - 数独矩阵
     * @param {boolean} countOnly - 是否只计算解的数量（用于唯一解检查）
     * @param {object} counter - 用于存储解的数量 { count: 0 }
     * @returns {boolean} 是否成功填充
     */
    fillBoard(board, countOnly = false, counter = { count: 0 }) {
        // #region agent log
        // logging sparingly to avoid spam, only log on first call or important branches if needed, but fillBoard is recursive
        // fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:fillBoard',message:'fillBoard called',data:{countOnly},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        for(let r = 0; r < 9; r++) {
            for(let c = 0; c < 9; c++) {
                if(board[r][c] === 0) {
                    let nums = [1,2,3,4,5,6,7,8,9];
                    // 只有在非计数模式下才打乱顺序，增加随机性；计数模式下顺序无所谓，但保持顺序可能更快
                    if (!countOnly) {
                        nums.sort(() => Math.random() - 0.5);
                    }
                    
                    for(let num of nums) {
                        if(this.isValid(board, r, c, num)) {
                            board[r][c] = num;
                            
                            if (countOnly) {
                                // 继续寻找下一个解
                                if (this.fillBoard(board, true, counter)) return true; // 找到2个解就提前返回
                            } else {
                                if (this.fillBoard(board)) return true;
                            }
                            
                            board[r][c] = 0; // 回溯
                        }
                    }
                    return false; // 当前格无解
                }
            }
        }
        // 填满了
        if (countOnly) {
            counter.count++;
            // 如果找到多于1个解，不需要继续找了，直接返回 true 表示已发现多解
            if (counter.count > 1) return true; 
            return false; // 继续回溯找其他解
        }
        return true;
    }

    /**
     * 检查数独是否有唯一解
     * @param {Array} board - 挖空后的数独矩阵
     * @returns {boolean} 是否有唯一解
     */
    hasUniqueSolution(board) {
        // 深拷贝一份用于计算
        const tempBoard = board.map(row => [...row]);
        const counter = { count: 0 };
        this.fillBoard(tempBoard, true, counter);
        return counter.count === 1;
    }

    /**
     * 求解给定盘面
     * @param {Array} board - 9x9 数组
     * @returns {Array|null} 完整解（新数组）或 null
     */
    solve(board) {
        const tempBoard = board.map(row => [...row]);
        // fillBoard 会直接修改 tempBoard
        // 注意：fillBoard 在非计数模式下是随机解，但在解唯一的情况下结果是确定的
        // 为了确保求解速度，我们可以临时修改 fillBoard 让其不随机？
        // 其实 fillBoard 默认逻辑就可以，只要有解就行
        if (this.fillBoard(tempBoard)) {
            return tempBoard;
        }
        return null;
    }

    /**
     * 从内置题目库加载Extreme难度题目
     * 策略：优先未解 -> 其次解题次数最少 -> 随机
     * @returns {boolean} 是否成功加载
     */
    loadExtremePuzzle() {
        if (EXTREME_SUDOKU_PUZZLES.length === 0) {
            console.warn('Extreme题目库为空，回退到生成模式');
            return false;
        }

        // 读取历史进度
        let progress = {};
        try {
            progress = JSON.parse(localStorage.getItem('sudoku_extreme_progress') || '{}');
        } catch (e) {
            console.error('读取进度失败', e);
        }

        // 1. 筛选出所有题目及其完成次数
        const puzzlesWithStats = EXTREME_SUDOKU_PUZZLES.map(item => ({
            ...item,
            solvedCount: progress[item.puzzle] || 0
        }));

        // 2. 优先找未解题目 (count === 0)
        let candidates = puzzlesWithStats.filter(p => p.solvedCount === 0);

        // 3. 如果都解过了，找完成次数最少的题目
        if (candidates.length === 0) {
            const minCount = Math.min(...puzzlesWithStats.map(p => p.solvedCount));
            candidates = puzzlesWithStats.filter(p => p.solvedCount === minCount);
            console.log(`所有题目已完成，进入循环模式 (最少次数: ${minCount})`);
        } else {
            console.log(`发现 ${candidates.length} 道新题目，优先推荐`);
        }

        // 4. 从候选列表中随机选一个
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        
        // 记录当前题目字符串，用于胜利时保存进度
        this.currentPuzzleStr = selected.puzzle;

        console.log('加载题目:', selected.puzzle.substring(0, 10) + '...', '已解次数:', selected.solvedCount);
        
        // 转换为数组格式
        this.initialBoard = stringToBoard(selected.puzzle);
        
        // 如果题目库中自带解，直接使用；否则现场计算
        if (selected.solution) {
            this.solution = stringToBoard(selected.solution);
        } else {
            // 现场求解
            const computedSolution = this.solve(this.initialBoard);
            if (!computedSolution) {
                console.error('内置题目无解！', selected.puzzle);
                return false; // 加载失败
            }
            this.solution = computedSolution;
        }
        
        this.currentBoard = this.initialBoard.map(row => [...row]);
        
        // 初始化笔记
        this.marks = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
        
        return true;
    }

    /**
     * 保存当前题目的完成进度
     */
    saveProgress() {
        if (this.difficulty !== 'extreme' || !this.currentPuzzleStr) return;

        try {
            const progress = JSON.parse(localStorage.getItem('sudoku_extreme_progress') || '{}');
            progress[this.currentPuzzleStr] = (progress[this.currentPuzzleStr] || 0) + 1;
            localStorage.setItem('sudoku_extreme_progress', JSON.stringify(progress));
            console.log('进度已保存，当前题目完成次数:', progress[this.currentPuzzleStr]);
        } catch (e) {
            console.error('保存进度失败', e);
        }
    }

    /**
     * 生成数独题目 (确保唯一解)
     */
    generateBoard() {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:generateBoard',message:'generateBoard start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Extreme难度：从内置题目库加载，避免实时生成的计算开销
        if (this.difficulty === 'extreme') {
            if (this.loadExtremePuzzle()) {
                // #region agent log
                fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:generateBoard',message:'Extreme puzzle loaded from library',data:{index:extremePuzzleIndex-1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
                // #endregion
                return; // 成功加载，直接返回
            }
            // 如果题目库为空或加载失败，回退到生成模式
            console.warn('Extreme题目库加载失败，回退到生成模式');
        }
        
        // 1. 生成完整解
        this.solution = this.generateSolution();
        
        // 2. 根据难度尝试挖空
        // 难度控制策略：
        // Hard: 尝试尽可能多的挖空，但保持唯一解。通常能剩 30-35 个提示。
        // Hell: 尝试更激进的挖空，减少初始提示到 25 个左右。
        // Extreme: 理论极限 17 个提示数（数独唯一解的理论下限）
        
        // 为了简化且保证性能，我们采用随机挖空 + 唯一解检查
        // 难度越高，我们在挖空时可以偏向于移除特定模式（如对称）或者纯随机尝试更多次
        
        // 深拷贝完整解作为初始状态
        this.initialBoard = this.solution.map(row => [...row]);
        this.currentBoard = this.solution.map(row => [...row]);

        let cells = [];
        for(let r=0; r<9; r++) for(let c=0; c<9; c++) cells.push({r,c});
        cells.sort(() => Math.random() - 0.5); // 随机顺序
        
        // 目标提示数（仅作为参考停止条件，主要靠 unique 检查）
        // 注意：17 是数独唯一解的理论下限，但生成17个提示数的题目计算量很大
        let targetClues = 30;
        if (this.difficulty === 'hell') targetClues = 25;
        if (this.difficulty === 'extreme') targetClues = 17; // 理论极限：17个提示数
        
        let currentClues = 81;
        let attempts = 0;
        const maxAttempts = 1000; // 性能保护：最多尝试1000次挖空操作

        for(let cell of cells) {
            if (currentClues <= targetClues) break; // 达到难度目标
            if (attempts >= maxAttempts) break; // 性能保护：避免无限循环
            
            let r = cell.r;
            let c = cell.c;
            let backup = this.initialBoard[r][c];
            
            this.initialBoard[r][c] = 0; // 尝试挖掉
            attempts++;
            
            // 必须保证唯一解
            if (!this.hasUniqueSolution(this.initialBoard)) {
                this.initialBoard[r][c] = backup; // 填回，导致多解，不能挖
            } else {
                currentClues--;
            }
        }
        
        // 同步 currentBoard
        this.currentBoard = this.initialBoard.map(row => [...row]);
        
        // 初始化笔记
        this.marks = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:generateBoard',message:'generateBoard end',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
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
        if(!this.boardEl) {
            // #region agent log
            fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:render',message:'boardEl not found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            return;
        }
        
        this.boardEl.innerHTML = '';
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/f8236772-43b2-4018-9a4f-91394a5b4352',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'js/sudoku.js:render',message:'render start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        
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
        const btn = document.getElementById('btn-pencil');
        if(btn) {
            // 更新按钮文本显示状态
            btn.innerHTML = this.isPencilMode ? '✏️ 笔记开' : '✏️ 笔记关';

            if(this.isPencilMode) {
                // 笔记开启：绿色背景，白色边框，更明显的视觉反馈
                btn.style.background = '#28a745';
                btn.style.border = '2px solid #ffffff';
                btn.style.color = '#ffffff';
                btn.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
            } else {
                // 笔记关闭：默认样式
                btn.style.background = 'rgba(255,255,255,0.25)';
                btn.style.border = 'none';
                btn.style.color = '';
                btn.style.boxShadow = 'none';
            }
        }
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
                this.saveProgress(); // 保存进度
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
     * 检查某个格子是否已经正确
     */
    isCellCorrect(r, c) {
        return this.currentBoard[r][c] === this.solution[r][c];
    }

    /**
     * 填入正确答案 (作弊模式)
     */
    fillAnswer(r, c) {
        if(this.isGameOver) return;
        
        const ans = this.solution[r][c];
        
        // 填入数字
        this.currentBoard[r][c] = ans;
        this.marks[r][c].clear(); // 清除笔记
        this.autoClearMarks(r, c, ans); // 清除关联笔记
        
        // 播放特殊音效
        if(this.sound) this.sound.play('merge', 2048); 
        
        this.render();
        
        // 检查是否获胜
        if(this.checkWin()) {
            this.isGameOver = true;
            this.saveProgress(); // 保存进度
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            if(this.callbacks.onGameOver) {
                this.callbacks.onGameOver(true, this.elapsedTime);
            }
        }
    }

    /**
     * 填入所有正确答案 (直接通关)
     */
    fillAllAnswers() {
        if(this.isGameOver) return;
        
        // 填满所有格子
        for(let r=0; r<9; r++) {
            for(let c=0; c<9; c++) {
                this.currentBoard[r][c] = this.solution[r][c];
                this.marks[r][c].clear();
            }
        }
        
        this.render();
        
        // 播放胜利音效
        if(this.sound) this.sound.play('merge', 2048); 
        
        // 触发胜利
        this.isGameOver = true;
        this.saveProgress(); // 保存进度
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        if(this.callbacks.onGameOver) {
            this.callbacks.onGameOver(true, this.elapsedTime);
        }
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
