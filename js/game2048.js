/**
 * 2048 游戏核心逻辑 (V4.2 音效增强版)
 * 采用模块化设计，分离游戏逻辑、渲染和交互
 */

// SoundManager 已移至 common.js，此处直接使用

// 辅助类：网格管理
class Grid {
    constructor(size, previousState) {
        this.size = size;
        this.cells = previousState ? this.fromState(previousState) : this.empty();
    }

    empty() {
        const cells = [];
        for (let x = 0; x < this.size; x++) {
            const row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(null);
            }
        }
        return cells;
    }

    fromState(state) {
        const cells = [];
        for (let x = 0; x < this.size; x++) {
            const row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                const tile = state[x][y];
                row.push(tile ? new Tile(tile.position, tile.value) : null);
            }
        }
        return cells;
    }

    randomAvailableCell() {
        const cells = this.availableCells();
        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    }

    availableCells() {
        const cells = [];
        this.eachCell((x, y, tile) => {
            if (!tile) {
                cells.push({ x: x, y: y });
            }
        });
        return cells;
    }

    eachCell(callback) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                callback(x, y, this.cells[x][y]);
            }
        }
    }

    cellsAvailable() {
        return !!this.availableCells().length;
    }

    cellAvailable(cell) {
        return !this.cellOccupied(cell);
    }

    cellOccupied(cell) {
        return !!this.cellContent(cell);
    }

    cellContent(cell) {
        if (this.withinBounds(cell)) {
            return this.cells[cell.x][cell.y];
        } else {
            return null;
        }
    }

    insertTile(tile) {
        this.cells[tile.x][tile.y] = tile;
    }

    removeTile(tile) {
        this.cells[tile.x][tile.y] = null;
    }

    withinBounds(position) {
        return position.x >= 0 && position.x < this.size &&
               position.y >= 0 && position.y < this.size;
    }

    serialize() {
        const cellState = [];
        for (let x = 0; x < this.size; x++) {
            const row = cellState[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
            }
        }
        return {
            size: this.size,
            cells: cellState
        };
    }
}

// 辅助类：数字块
class Tile {
    constructor(position, value) {
        this.x = position.x;
        this.y = position.y;
        this.value = value || 2;

        this.previousPosition = null;
        this.mergedFrom = null; // Tracks tiles that merged together
    }

    savePosition() {
        this.previousPosition = { x: this.x, y: this.y };
    }

    updatePosition(position) {
        this.x = position.x;
        this.y = position.y;
    }

    serialize() {
        return {
            position: {
                x: this.x,
                y: this.y
            },
            value: this.value
        };
    }
}

class Game2048 {
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        
        this.size = 4;
        this.startTiles = 2;
        
        // 游戏状态
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.over = false;
        this.won = false;
        this.keepPlaying = false;
        
        // 撤销支持
        this.history = [];

        // 音效系统
        if (typeof SoundManager !== 'undefined') {
            this.sound = new SoundManager('game2048_sound');
        } else {
            console.warn('SoundManager not available');
            this.sound = null;
        }

        this.setup();
    }

    setup() {
        this.grid = new Grid(this.size);
        this.score = 0;
        this.over = false;
        this.won = false;
        this.keepPlaying = false;

        // 添加初始块
        this.addStartTiles();
        
        this.actuate();
    }

    start() {
        this.setup();
        this.callbacks.onScoreChange(this.score);
    }

    addStartTiles() {
        for (let i = 0; i < this.startTiles; i++) {
            this.addRandomTile();
        }
    }

    addRandomTile() {
        if (this.grid.cellsAvailable()) {
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = new Tile(this.grid.randomAvailableCell(), value);
            this.grid.insertTile(tile);
        }
    }

    actuate() {
        // 渲染部分
        window.requestAnimationFrame(() => {
            this.clearContainer();
            
            // 绘制背景网格
            const bgContainer = document.createElement('div');
            bgContainer.className = 'game2048-grid-bg';
            for(let i=0; i<16; i++) {
                const cell = document.createElement('div');
                cell.className = 'game2048-cell-bg';
                bgContainer.appendChild(cell);
            }

            // 绘制Tile容器
            const tileContainer = document.createElement('div');
            tileContainer.className = 'tile-container';
            
            this.grid.eachCell((x, y, tile) => {
                if (tile) {
                    this.addTile(tile, tileContainer);
                }
            });

            const wrapper = document.createElement('div');
            wrapper.className = 'game2048-grid-container';
            wrapper.appendChild(bgContainer);
            wrapper.appendChild(tileContainer);
            
            this.boardEl.appendChild(wrapper);

            // 更新分数
            this.callbacks.onScoreChange(this.score);

            if (this.over) {
                this.callbacks.onGameOver(this.score);
            } else if (this.won && !this.keepPlaying) {
                this.keepPlaying = true; // 避免重复弹窗
                if(this.callbacks.onGameWin) this.callbacks.onGameWin(this.score);
            }
        });
    }

    clearContainer() {
        this.boardEl.innerHTML = '';
    }

    addTile(tile, container) {
        const element = document.createElement('div');
        const position = tile.previousPosition || { x: tile.x, y: tile.y };
        
        // 计算位置 (基于百分比)
        // x是列(col), y是行(row) -- 注意：这里我们通常习惯 x=col, y=row
        // CSS Grid 是 gap: 10px, padding: 10px
        // 计算逻辑：position = calc(25% * index)
        const getPos = (i) => `calc(${i * 25}%)`;

        element.style.left = getPos(tile.y); // y是col
        element.style.top = getPos(tile.x);  // x是row
        
        // 样式类
        const style = this.getTileStyle(tile.value);
        element.classList.add('tile');
        element.style.backgroundColor = style.bgColor;
        element.style.color = style.color;
        element.textContent = style.text || tile.value;
        
        if (tile.value > 2048) element.classList.add('tile-super');

        if (tile.previousPosition) {
            // 确保渲染后再应用移动动画
            window.requestAnimationFrame(() => {
                element.style.left = getPos(tile.y);
                element.style.top = getPos(tile.x);
            });
        } else if (tile.mergedFrom) {
            element.classList.add('tile-merged');
            // 渲染两个合并源
            tile.mergedFrom.forEach((merged) => {
                this.addTile(merged, container);
            });
        } else {
            element.classList.add('tile-new');
        }

        container.appendChild(element);
    }

    getTileStyle(value) {
        // 与之前保持一致的样式逻辑
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
        
        return styles[value] || { 
            color: '#f9f6f2', 
            bgColor: '#3c3a32',
            text: value > 2048 ? '❤️' : value
        };
    }

    saveState() {
        this.history.push({
            grid: this.grid.serialize(),
            score: this.score,
            over: this.over,
            won: this.won,
            keepPlaying: this.keepPlaying
        });
        if(this.history.length > 10) this.history.shift(); // 最多保存10步
    }

    restoreState() {
        if(this.history.length === 0) return false;
        
        const state = this.history.pop();
        this.score = state.score;
        this.over = state.over;
        this.won = state.won;
        this.keepPlaying = state.keepPlaying;
        
        // 恢复 Grid
        this.grid = new Grid(state.grid.size);
        state.grid.cells.forEach((row, x) => {
            row.forEach((cellData, y) => {
                if(cellData) {
                    this.grid.cells[x][y] = new Tile({x,y}, cellData.value);
                }
            });
        });
        
        this.actuate();
        return true;
    }

    // 核心移动逻辑
    move(direction) {
        if (this.isGameTerminated()) return false;

        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);
        let moved = false;

        // 保存状态用于撤销
        this.saveState();
        
        // 准备移动
        this.prepareTiles();

        traversals.x.forEach((x) => {
            traversals.y.forEach((y) => {
                const cell = { x: x, y: y };
                const tile = this.grid.cellContent(cell);

                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = this.grid.cellContent(positions.next);

                    if (next && next.value === tile.value && !next.mergedFrom) {
                        // 合并
                        const merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        this.grid.insertTile(merged);
                        this.grid.removeTile(tile);

                        // Converge the two tiles' positions
                        tile.updatePosition(positions.next);

                        // Update score
                        this.score += merged.value;
                        if(this.score > this.bestScore) {
                           this.bestScore = this.score;
                           this.saveBestScore();
                        }

                        // 播放合并音效
                        this.sound.play('merge', merged.value);

                        if (merged.value === 2048) this.won = true;
                    } else {
                        this.moveTile(tile, positions.farthest);
                    }

                    if (!this.positionsEqual(cell, tile)) {
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            // 播放移动音效
            this.sound.play('move');
            
            this.addRandomTile();
            // 生成音效只在特定情况下播放（避免过于频繁）
            // 这里暂时不播放，因为每次移动都会生成，音效会太频繁
            
            if (!this.movesAvailable()) {
                this.over = true;
            }
            this.actuate();
            return true;
        } else {
            // 没移动，把刚才保存的状态吐出来
            this.history.pop(); 
            return false;
        }
    }

    prepareTiles() {
        this.grid.eachCell((x, y, tile) => {
            if (tile) {
                tile.mergedFrom = null;
                tile.savePosition();
            }
        });
    }

    moveTile(tile, cell) {
        this.grid.cells[tile.x][tile.y] = null;
        this.grid.cells[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    }

    // 方向向量
    getVector(direction) {
        const map = {
            'up':    { x: -1, y: 0 },
            'right': { x: 0,  y: 1 },
            'down':  { x: 1,  y: 0 },
            'left':  { x: 0,  y: -1 }
        };
        return map[direction];
    }

    buildTraversals(vector) {
        const traversals = { x: [], y: [] };

        for (let pos = 0; pos < this.size; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        // Always traverse from the farthest cell in the chosen direction
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    }

    findFarthestPosition(cell, vector) {
        let previous;

        // Progress towards the vector direction until an obstacle is found
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.grid.withinBounds(cell) &&
                 this.grid.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell // Used to check if a merge is required
        };
    }

    movesAvailable() {
        return this.grid.cellsAvailable() || this.tileMatchesAvailable();
    }

    tileMatchesAvailable() {
        const self = this;
        let tile;

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                tile = this.grid.cellContent({ x: x, y: y });

                if (tile) {
                    for (let direction = 0; direction < 4; direction++) {
                        const vector = self.getVector(['up', 'right', 'down', 'left'][direction]);
                        const cell  = { x: x + vector.x, y: y + vector.y };

                        const other = self.grid.cellContent(cell);

                        if (other && other.value === tile.value) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    positionsEqual(first, second) {
        return first.x === second.x && first.y === second.y;
    }
    
    isGameTerminated() {
        return this.over || (this.won && !this.keepPlaying);
    }

    loadBestScore() {
        return parseInt(localStorage.getItem('game2048_best') || 0);
    }

    saveBestScore() {
        localStorage.setItem('game2048_best', this.bestScore);
    }
    
    getBestScore() {
        return this.bestScore;
    }
}

class Game2048Controller {
    constructor(game, container) {
        this.game = game;
        this.container = container;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
        if (this.container.style.display === 'none') return;
        
            const map = {
                38: 'up', 87: 'up',
                39: 'right', 68: 'right',
                40: 'down', 83: 'down',
                37: 'left', 65: 'left'
            };
            
            const direction = map[e.which];
            if (direction) {
        e.preventDefault();
                // 首次交互时初始化音效
                if (this.game.sound) this.game.sound.init();
                this.game.move(direction);
            }
        });

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            if (e.changedTouches.length > 0) {
                this.touchEndX = e.changedTouches[0].clientX;
                this.touchEndY = e.changedTouches[0].clientY;
        this.handleSwipe();
    }
        }, { passive: true });
        
        this.container.addEventListener('touchmove', (e) => {
             e.preventDefault();
        }, { passive: false });
    }

    handleSwipe() {
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) > 30) {
            // 首次交互时初始化音效
            if (this.game.sound) this.game.sound.init();
            
            if (absDx > absDy) {
                this.game.move(dx > 0 ? 'right' : 'left');
        } else {
                this.game.move(dy > 0 ? 'down' : 'up');
            }
        }
    }
}
