/**
 * 甜蜜消消乐核心逻辑
 * Match-3 Game Logic
 */
class Match3Game {
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        this.width = 7;
        this.height = 7;
        this.items = ['❤️', '🍬', '🍪', '🎁', '🧸', '🌹'];
        this.grid = [];
        this.score = 0;
        this.moves = 20;
        this.selected = null; // {r, c}
        this.isProcessing = false;
    }

    start() {
        this.score = 0;
        this.moves = 20;
        this.callbacks.onScoreChange(this.score);
        this.callbacks.onMovesChange(this.moves);
        this.initGrid();
        this.render();
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.height; r++) {
            let row = [];
            for (let c = 0; c < this.width; c++) {
                row.push(this.randomItem());
            }
            this.grid.push(row);
        }
        // 初始消除检查，避免开局就有消除
        // 简化版：暂不处理开局消除，让用户自己消
    }

    randomItem() {
        return this.items[Math.floor(Math.random() * this.items.length)];
    }

    render() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.innerText = this.grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                if (this.selected && this.selected.r === r && this.selected.c === c) {
                    cell.classList.add('selected');
                }
                cell.onclick = () => this.handleClick(r, c);
                this.boardEl.appendChild(cell);
            }
        }
    }

    handleClick(r, c) {
        if (this.isProcessing) return;

        if (!this.selected) {
            this.selected = { r, c };
            this.render();
        } else {
            const dist = Math.abs(this.selected.r - r) + Math.abs(this.selected.c - c);
            if (dist === 1) {
                this.swap(this.selected, { r, c });
                this.selected = null;
            } else {
                this.selected = { r, c }; // 重新选择
                this.render();
            }
        }
    }

    async swap(p1, p2) {
        this.isProcessing = true;
        
        // 交换数据
        let temp = this.grid[p1.r][p1.c];
        this.grid[p1.r][p1.c] = this.grid[p2.r][p2.c];
        this.grid[p2.r][p2.c] = temp;
        
        this.render();
        await this.wait(200);

        // 检查消除
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.moves--;
            this.callbacks.onMovesChange(this.moves);
            await this.processMatches(matches);
        } else {
            // 无效交换，还原
            temp = this.grid[p1.r][p1.c];
            this.grid[p1.r][p1.c] = this.grid[p2.r][p2.c];
            this.grid[p2.r][p2.c] = temp;
            this.render();
        }

        this.isProcessing = false;
        
        if (this.moves <= 0) {
            setTimeout(() => this.callbacks.onGameOver(this.score), 500);
        }
    }

    findMatches() {
        let matchedSet = new Set();
        
        // 横向
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width - 2; c++) {
                let item = this.grid[r][c];
                if (item && item === this.grid[r][c+1] && item === this.grid[r][c+2]) {
                    matchedSet.add(`${r},${c}`);
                    matchedSet.add(`${r},${c+1}`);
                    matchedSet.add(`${r},${c+2}`);
                }
            }
        }
        
        // 纵向
        for (let r = 0; r < this.height - 2; r++) {
            for (let c = 0; c < this.width; c++) {
                let item = this.grid[r][c];
                if (item && item === this.grid[r+1][c] && item === this.grid[r+2][c]) {
                    matchedSet.add(`${r},${c}`);
                    matchedSet.add(`${r+1},${c}`);
                    matchedSet.add(`${r+2},${c}`);
                }
            }
        }
        
        return Array.from(matchedSet).map(s => {
            const [r, c] = s.split(',').map(Number);
            return { r, c };
        });
    }

    async processMatches(matches) {
        // 1. 消除动画
        matches.forEach(p => {
            this.grid[p.r][p.c] = null; // 标记为空
        });
        
        // 增加分数 (每个消除 10 分)
        this.score += matches.length * 10;
        this.callbacks.onScoreChange(this.score);
        
        this.render();
        await this.wait(300);

        // 2. 下落填充
        this.applyGravity();
        this.render();
        await this.wait(300);

        // 3. 填充新块
        this.fillNewItems();
        this.render();
        await this.wait(300);

        // 4. 连击检查
        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        }
    }

    applyGravity() {
        for (let c = 0; c < this.width; c++) {
            let emptySlots = 0;
            for (let r = this.height - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    emptySlots++;
                } else if (emptySlots > 0) {
                    this.grid[r + emptySlots][c] = this.grid[r][c];
                    this.grid[r][c] = null;
                }
            }
        }
    }

    fillNewItems() {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (this.grid[r][c] === null) {
                    this.grid[r][c] = this.randomItem();
                }
            }
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
