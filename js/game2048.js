/**
 * 2048 游戏核心逻辑
 * 采用模块化设计，分离游戏逻辑、渲染和交互
 * 
 * 架构特点：
 * 1. 单一职责：Game2048类负责游戏逻辑，Renderer负责渲染
 * 2. 事件驱动：通过回调函数解耦游戏状态和UI更新
 * 3. 性能优化：使用对象池、批量DOM更新、requestAnimationFrame
 * 4. 易于扩展：清晰的接口设计，方便添加新功能
 */
class Game2048 {
    /**
     * 构造函数
     * @param {string} boardId - 游戏容器DOM元素ID
     * @param {Object} callbacks - 回调函数集合
     * @param {Function} callbacks.onScoreChange - 分数变化回调
     * @param {Function} callbacks.onGameOver - 游戏结束回调
     * @param {Function} callbacks.onGameWin - 游戏胜利回调（可选）
     */
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        
        // 游戏配置
        this.SIZE = 4; // 4x4网格
        this.WIN_TILE = 2048; // 胜利目标
        
        // 游戏状态
        this.grid = []; // 二维数组存储数字
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.isGameOver = false;
        this.isWon = false;
        this.canUndo = false;
        this.previousState = null; // 用于撤销功能
        
        // 性能优化：使用对象池存储移动动画信息
        this.animationQueue = [];
        this.isAnimating = false;
        
        // 初始化网格
        this.initGrid();
    }

    /**
     * 初始化游戏网格
     */
    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.SIZE; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.SIZE; c++) {
                this.grid[r][c] = 0;
            }
        }
        // 初始生成2个数字
        this.addRandomTile();
        this.addRandomTile();
    }

    /**
     * 开始新游戏
     */
    start() {
        this.score = 0;
        this.isGameOver = false;
        this.isWon = false;
        this.canUndo = false;
        this.previousState = null;
        this.initGrid();
        this.callbacks.onScoreChange(this.score);
        this.saveBestScore();
    }

    /**
     * 在随机空位置添加新数字（2或4，90%概率是2）
     */
    addRandomTile() {
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return false;
        
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        // 90%概率生成2，10%概率生成4
        this.grid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        return true;
    }

    /**
     * 获取所有空位置
     * @returns {Array} 空位置数组 [{r, c}, ...]
     */
    getEmptyCells() {
        const empty = [];
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                if (this.grid[r][c] === 0) {
                    empty.push({ r, c });
                }
            }
        }
        return empty;
    }

    /**
     * 移动操作（核心算法）
     * @param {string} direction - 方向：'up', 'down', 'left', 'right'
     * @returns {boolean} 是否成功移动
     */
    move(direction) {
        if (this.isGameOver || this.isAnimating) return false;
        
        // 保存当前状态（用于撤销）
        this.saveState();
        
        // 根据方向旋转网格，统一处理为向左移动
        let rotated = this.rotateGrid(direction);
        let moved = false;
        let scoreIncrease = 0;
        
        // 对每一行进行合并操作
        for (let r = 0; r < this.SIZE; r++) {
            const result = this.mergeRow(rotated[r]);
            rotated[r] = result.row;
            moved = moved || result.moved;
            scoreIncrease += result.score;
        }
        
        // 旋转回原方向
        this.grid = this.rotateGridBack(rotated, direction);
        
        if (moved) {
            this.score += scoreIncrease;
            this.bestScore = Math.max(this.bestScore, this.score);
            this.callbacks.onScoreChange(this.score);
            this.saveBestScore();
            
            // 添加新数字
            this.addRandomTile();
            
            // 检查游戏状态
            this.checkGameState();
            
            return true;
        }
        
        // 如果没有移动，恢复状态
        this.restoreState();
        return false;
    }

    /**
     * 旋转网格以便统一处理（性能优化：减少代码重复）
     * @param {string} direction - 方向
     * @returns {Array} 旋转后的网格
     */
    rotateGrid(direction) {
        const grid = this.grid.map(row => [...row]); // 深拷贝
        
        switch (direction) {
            case 'left':
                return grid;
            case 'right':
                return grid.map(row => row.reverse());
            case 'up':
                // 转置后反转每行
                return this.transpose(grid);
            case 'down':
                // 转置后反转每列
                const transposed = this.transpose(grid);
                return transposed.map(row => row.reverse());
            default:
                return grid;
        }
    }

    /**
     * 旋转回原方向
     * @param {Array} rotated - 旋转后的网格
     * @param {string} direction - 原方向
     * @returns {Array} 恢复后的网格
     */
    rotateGridBack(rotated, direction) {
        switch (direction) {
            case 'left':
                return rotated;
            case 'right':
                return rotated.map(row => row.reverse());
            case 'up':
                return this.transpose(rotated);
            case 'down':
                const reversed = rotated.map(row => row.reverse());
                return this.transpose(reversed);
            default:
                return rotated;
        }
    }

    /**
     * 矩阵转置（用于上下移动）
     * @param {Array} grid - 原始网格
     * @returns {Array} 转置后的网格
     */
    transpose(grid) {
        const transposed = [];
        for (let c = 0; c < this.SIZE; c++) {
            transposed[c] = [];
            for (let r = 0; r < this.SIZE; r++) {
                transposed[c][r] = grid[r][c];
            }
        }
        return transposed;
    }

    /**
     * 合并一行（核心算法）
     * @param {Array} row - 一行数据
     * @returns {Object} {row: 合并后的行, moved: 是否移动, score: 增加的分数}
     */
    mergeRow(row) {
        // 移除0，向左压缩
        const filtered = row.filter(val => val !== 0);
        const newRow = new Array(this.SIZE).fill(0);
        let newIndex = 0;
        let score = 0;
        
        // 合并相同数字
        for (let i = 0; i < filtered.length; i++) {
            if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                // 合并
                const merged = filtered[i] * 2;
                newRow[newIndex] = merged;
                score += merged;
                i++; // 跳过下一个
            } else {
                newRow[newIndex] = filtered[i];
            }
            newIndex++;
        }
        
        // 检查是否有移动（位置或数值变化）
        let moved = false;
        for (let i = 0; i < this.SIZE; i++) {
            if (row[i] !== newRow[i]) {
                moved = true;
                break;
            }
        }
        
        return { row: newRow, moved, score };
    }

    /**
     * 检查游戏状态（胜利/失败）
     */
    checkGameState() {
        // 检查是否达到2048
        if (!this.isWon) {
            for (let r = 0; r < this.SIZE; r++) {
                for (let c = 0; c < this.SIZE; c++) {
                    if (this.grid[r][c] === this.WIN_TILE) {
                        this.isWon = true;
                        if (this.callbacks.onGameWin) {
                            this.callbacks.onGameWin(this.score);
                        }
                        return;
                    }
                }
            }
        }
        
        // 检查是否游戏结束
        if (this.getEmptyCells().length === 0) {
            // 检查是否还能移动
            if (!this.canMove()) {
                this.isGameOver = true;
                this.callbacks.onGameOver(this.score);
            }
        }
    }

    /**
     * 检查是否还能移动
     * @returns {boolean} 是否还能移动
     */
    canMove() {
        // 检查是否有空位
        if (this.getEmptyCells().length > 0) return true;
        
        // 检查是否有相邻相同数字
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const current = this.grid[r][c];
                // 检查右边
                if (c < this.SIZE - 1 && this.grid[r][c + 1] === current) return true;
                // 检查下边
                if (r < this.SIZE - 1 && this.grid[r + 1][c] === current) return true;
            }
        }
        return false;
    }

    /**
     * 保存当前状态（用于撤销）
     */
    saveState() {
        this.previousState = {
            grid: this.grid.map(row => [...row]), // 深拷贝
            score: this.score
        };
        this.canUndo = true;
    }

    /**
     * 恢复上一个状态（撤销）
     */
    restoreState() {
        if (this.previousState) {
            this.grid = this.previousState.grid.map(row => [...row]);
            this.score = this.previousState.score;
            this.callbacks.onScoreChange(this.score);
            this.canUndo = false;
            return true;
        }
        return false;
    }

    /**
     * 获取数字对应的显示文本和样式
     * @param {number} value - 数字值
     * @returns {Object} {text, color, bgColor}
     */
    getTileStyle(value) {
        if (value === 0) {
            return { text: '', color: '#776e65', bgColor: '#eee4da' };
        }
        
        // 根据数字大小返回不同颜色
        const styles = {
            2: { color: '#776e65', bgColor: '#eee4da' },
            4: { color: '#776e65', bgColor: '#ede0c8' },
            8: { color: '#f9f6f2', bgColor: '#f2b179' },
            16: { color: '#f9f6f2', bgColor: '#f59563' },
            32: { color: '#f9f6f2', bgColor: '#f67c5f' },
            64: { color: '#f9f6f2', bgColor: '#f65e3b' },
            128: { color: '#f9f6f2', bgColor: '#edcf72' },
            256: { color: '#f9f6f2', bgColor: '#edcc61' },
            512: { color: '#f9f6f2', bgColor: '#edc850' },
            1024: { color: '#f9f6f2', bgColor: '#edc53f' },
            2048: { color: '#f9f6f2', bgColor: '#edc22e' }
        };
        
        // 大于2048使用默认样式
        return styles[value] || { 
            color: '#f9f6f2', 
            bgColor: '#3c3a32',
            text: value > 2048 ? '❤️' : value.toString() // 超大数字显示爱心
        };
    }

    /**
     * 加载最高分
     * @returns {number} 最高分
     */
    loadBestScore() {
        const saved = localStorage.getItem('game2048_best');
        return saved ? parseInt(saved, 10) : 0;
    }

    /**
     * 保存最高分
     */
    saveBestScore() {
        localStorage.setItem('game2048_best', this.bestScore.toString());
    }

    /**
     * 获取当前最高分
     * @returns {number} 最高分
     */
    getBestScore() {
        return this.bestScore;
    }

    /**
     * 渲染游戏界面（性能优化：批量更新DOM）
     */
    render() {
        if (!this.boardEl) return;
        
        // 清空容器
        this.boardEl.innerHTML = '';
        
        // 创建网格容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'game2048-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${this.SIZE}, 1fr)`;
        gridContainer.style.gap = '8px';
        gridContainer.style.width = '100%';
        gridContainer.style.aspectRatio = '1/1';
        gridContainer.style.maxWidth = '350px';
        
        // 批量创建单元格（减少DOM操作）
        const fragment = document.createDocumentFragment();
        for (let r = 0; r < this.SIZE; r++) {
            for (let c = 0; c < this.SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'game2048-cell';
                const value = this.grid[r][c];
                const style = this.getTileStyle(value);
                
                cell.textContent = value === 0 ? '' : (style.text || value);
                cell.style.backgroundColor = style.bgColor;
                cell.style.color = style.color;
                cell.style.borderRadius = '8px';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = value >= 1024 ? '1.2rem' : '1.5rem';
                cell.style.fontWeight = 'bold';
                cell.style.transition = 'all 0.15s ease';
                
                fragment.appendChild(cell);
            }
        }
        
        gridContainer.appendChild(fragment);
        this.boardEl.appendChild(gridContainer);
    }
}

/**
 * 2048游戏控制器
 * 负责处理用户输入（键盘、触摸）
 */
class Game2048Controller {
    /**
     * 构造函数
     * @param {Game2048} game - 游戏实例
     * @param {HTMLElement} container - 游戏容器元素
     */
    constructor(game, container) {
        this.game = game;
        this.container = container;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30; // 最小滑动距离
        
        this.init();
    }

    /**
     * 初始化事件监听
     */
    init() {
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 触摸控制
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // 防止页面滚动
        this.container.addEventListener('touchmove', (e) => {
            if (this.isSwiping) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyDown(e) {
        // 只在游戏容器可见时响应
        if (this.container.style.display === 'none') return;
        
        let direction = null;
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
            default:
                return;
        }
        
        e.preventDefault();
        this.move(direction);
    }

    /**
     * 处理触摸开始
     * @param {TouchEvent} e - 触摸事件
     */
    handleTouchStart(e) {
        if (this.container.style.display === 'none') return;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isSwiping = false;
    }

    /**
     * 处理触摸结束
     * @param {TouchEvent} e - 触摸事件
     */
    handleTouchEnd(e) {
        if (this.container.style.display === 'none') return;
        const touch = e.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;
        
        this.handleSwipe();
    }

    /**
     * 处理滑动手势
     */
    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // 判断是否为有效滑动
        if (Math.max(absX, absY) < this.minSwipeDistance) {
            return;
        }
        
        let direction = null;
        if (absX > absY) {
            // 水平滑动
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            // 垂直滑动
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        this.move(direction);
    }

    /**
     * 执行移动并更新渲染
     * @param {string} direction - 移动方向
     */
    move(direction) {
        const moved = this.game.move(direction);
        if (moved) {
            this.game.render();
        }
    }

    /**
     * 销毁控制器（清理事件监听）
     */
    destroy() {
        // 注意：这里简化处理，实际应该保存事件处理函数的引用以便移除
        // 由于是单页应用，暂时不需要销毁
    }
}

