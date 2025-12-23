/**
 * 甜蜜消消乐核心逻辑 (V4.1 连击与道具优化版)
 * Match-3 Game Logic with Combos & Power-ups
 */
class Match3Game {
    constructor(boardId, callbacks) {
        this.boardEl = document.getElementById(boardId);
        this.callbacks = callbacks;
        this.width = 7;
        this.height = 7;
        // 增加到 7 种元素，提升难度
        this.items = ['❤️', '🍬', '🍪', '🎁', '🧸', '🌹', '💎'];
        this.grid = []; // 存储对象: { type: string, id: number, el: HTMLElement, special: string|null }
        this.score = 0;
        this.moves = 20;
        this.selected = null; // {r, c}
        this.lastSwap = null; // 记录最后一次交换操作 {p1, p2}
        this.isProcessing = false;
        this.uniqueIdCounter = 0;
        
        this.updateBoardMetrics();
        window.addEventListener('resize', () => this.updateBoardMetrics());
    }

    updateBoardMetrics() {
        if (!this.boardEl) return;
        // 响应式调整逻辑
    }

    getPositionStyle(r, c) {
        const step = 100 / this.width;
        return {
            left: `calc(${c * step}% + 2px)`,
            top: `calc(${r * step}% + 2px)`
        };
    }

    start() {
        this.score = 0;
        this.moves = 20;
        this.callbacks.onScoreChange(this.score);
        this.callbacks.onMovesChange(this.moves);
        this.initGrid();
    }

    initGrid() {
        this.boardEl.innerHTML = '';
        this.grid = [];
        
        for (let r = 0; r < this.height; r++) {
            let row = [];
            for (let c = 0; c < this.width; c++) {
                let type;
                // 开局保证无匹配
                do {
                    type = this.randomItem();
                } while (
                    (c >= 2 && row[c-1].type === type && row[c-2].type === type) ||
                    (r >= 2 && this.grid[r-1][c].type === type && this.grid[r-2][c].type === type)
                );
                
                row.push(this.createItem(r, c, type));
            }
            this.grid.push(row);
        }
    }

    createItem(r, c, type, special = null) {
        const id = this.uniqueIdCounter++;
        const el = document.createElement('div');
        el.className = 'cell';
        el.innerText = type;
        el.dataset.id = id;
        
        // 特殊道具样式
        if (special === 'bomb') {
            el.innerText = '💣';
            el.classList.add('item-bomb');
        } else if (special === 'rainbow') {
            el.innerText = '🌈';
            el.classList.add('item-rainbow');
        }
        
        const pos = this.getPositionStyle(r, c);
        el.style.left = pos.left;
        el.style.top = pos.top;
        
        el.onclick = () => this.handleClick(r, c);
        
        this.boardEl.appendChild(el);
        
        return { type, id, el, special };
    }

    randomItem() {
        return this.items[Math.floor(Math.random() * this.items.length)];
    }

    render() {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const item = this.grid[r][c];
                if (item) {
                    const pos = this.getPositionStyle(r, c);
                    item.el.style.left = pos.left;
                    item.el.style.top = pos.top;
                    item.el.onclick = () => this.handleClick(r, c);
                    
                    if (this.selected && this.selected.r === r && this.selected.c === c) {
                        item.el.classList.add('selected');
                    } else {
                        item.el.classList.remove('selected');
                    }
                }
            }
        }
    }

    async handleClick(r, c) {
        if (this.isProcessing) return;
        const item = this.grid[r][c];
        if (!item) return;

        // V4.1: 双击特殊道具直接触发
        if (item.special && this.selected && this.selected.r === r && this.selected.c === c) {
            this.selected = null;
            item.el.classList.remove('selected');
            
            // 直接触发爆炸
            this.moves--;
            this.callbacks.onMovesChange(this.moves);
            this.isProcessing = true;
            await this.processMatches([], [{r, c}]); // 手动传入触发点
            this.isProcessing = false;
            if (this.moves <= 0) setTimeout(() => this.callbacks.onGameOver(this.score), 500);
            return;
        }

        if (!this.selected) {
            this.selected = { r, c };
            item.el.classList.add('selected');
        } else {
            const prev = this.selected;
            const curr = { r, c };
            
            if (prev.r === r && prev.c === c) {
                // 已处理：再次点击取消选择（如果是普通道具），或者触发特殊效果（上面逻辑）
                // 此时如果是普通道具，走这里取消
                this.selected = null;
                item.el.classList.remove('selected');
                return;
            }

            const dist = Math.abs(prev.r - r) + Math.abs(prev.c - c);
            if (dist === 1) {
                this.selected = null;
                this.grid[prev.r][prev.c].el.classList.remove('selected');
                
                this.lastSwap = { p1: prev, p2: curr }; 
                this.swap(prev, curr);
            } else {
                this.grid[prev.r][prev.c].el.classList.remove('selected');
                this.selected = curr;
                item.el.classList.add('selected');
            }
        }
    }

    async swap(p1, p2) {
        this.isProcessing = true;
        
        const item1 = this.grid[p1.r][p1.c];
        const item2 = this.grid[p2.r][p2.c];
        
        // 交换
        this.grid[p1.r][p1.c] = item2;
        this.grid[p2.r][p2.c] = item1;
        
        this.render();
        await this.wait(300);

        // 检查匹配
        const matchGroups = this.findMatches();
        
        // V4.1: 特殊道具交换逻辑
        // 只要交换的一方是特殊道具，就视为有效交换，直接触发效果
        const hasSpecial = (item1 && item1.special) || (item2 && item2.special);

        if (matchGroups.length > 0 || hasSpecial) {
            this.moves--;
            this.callbacks.onMovesChange(this.moves);
            
            // 如果是特殊道具触发，需要把特殊道具本身加入消除队列
            // processMatches 会处理爆炸逻辑
            let manualTriggers = [];
            if (hasSpecial) {
                 // 简单的处理：如果交换了道具，把道具本身标记为待处理
                 // 这里有一个细节：如果是两个道具交换，两个都触发？
                 if(item1.special) manualTriggers.push(p2); // p2是item1的新位置
                 if(item2.special) manualTriggers.push(p1); // p1是item2的新位置
            }

            await this.processMatches(matchGroups, manualTriggers);
        } else {
            // 无效交换，还原
            this.grid[p1.r][p1.c] = item1;
            this.grid[p2.r][p2.c] = item2;
            this.render();
            await this.wait(300);
            this.lastSwap = null;
        }

        this.isProcessing = false;
        
        if (this.moves <= 0) {
            setTimeout(() => this.callbacks.onGameOver(this.score), 500);
        }
    }

    findMatches() {
        let horizontalGroups = [];
        let verticalGroups = [];

        // 横向扫描
        for (let r = 0; r < this.height; r++) {
            let matchLen = 1;
            for (let c = 0; c < this.width; c++) {
                let current = this.grid[r][c];
                let next = (c < this.width - 1) ? this.grid[r][c+1] : null;

                if (current && next && current.type === next.type && !current.special && !next.special) {
                    matchLen++;
                } else {
                    if (matchLen >= 3) {
                        let group = [];
                        for (let k = 0; k < matchLen; k++) {
                            group.push({r, c: c - k});
                        }
                        horizontalGroups.push(group);
                    }
                    matchLen = 1;
                }
            }
        }

        // 纵向扫描
        for (let c = 0; c < this.width; c++) {
            let matchLen = 1;
            for (let r = 0; r < this.height; r++) {
                let current = this.grid[r][c];
                let next = (r < this.height - 1) ? this.grid[r+1][c] : null;

                if (current && next && current.type === next.type && !current.special && !next.special) {
                    matchLen++;
                } else {
                    if (matchLen >= 3) {
                        let group = [];
                        for (let k = 0; k < matchLen; k++) {
                            group.push({r: r - k, c});
                        }
                        verticalGroups.push(group);
                    }
                    matchLen = 1;
                }
            }
        }

        return [...horizontalGroups, ...verticalGroups];
    }

    // V4.1: 增加 manualTriggers 参数，用于处理主动触发的特殊道具
    async processMatches(matchGroups, manualTriggers = []) {
        let pointsToRemove = new Set();
        let itemsToCreate = []; // {r, c, special}

        // 1. 处理自然匹配
        for (let group of matchGroups) {
            group.forEach(p => pointsToRemove.add(`${p.r},${p.c}`));
            
            if (group.length === 4) {
                let target = this.findTargetForSpecial(group);
                itemsToCreate.push({r: target.r, c: target.c, special: 'bomb'});
            } else if (group.length >= 5) {
                let target = this.findTargetForSpecial(group);
                itemsToCreate.push({r: target.r, c: target.c, special: 'rainbow'});
            }
        }

        // 2. 将 manualTriggers 加入待移除列表，以便触发 expandExplosions
        for (let p of manualTriggers) {
            pointsToRemove.add(`${p.r},${p.c}`);
        }

        // 3. 转换 Set 为 Array
        let removeList = Array.from(pointsToRemove).map(s => {
            const [r, c] = s.split(',').map(Number);
            return {r, c};
        });

        // 4. 爆炸逻辑 (递归扩展 removeList)
        removeList = this.expandExplosions(removeList);

        // 5. 执行消除动画
        for (let p of removeList) {
            const item = this.grid[p.r][p.c];
            if (item) {
                item.el.classList.add('matched');
                if (item.special) item.el.classList.add('exploding');
            }
        }
        await this.wait(300);

        // 6. 移除 DOM 和 Data
        for (let p of removeList) {
            const item = this.grid[p.r][p.c];
            if (item) {
                item.el.remove();
                this.grid[p.r][p.c] = null;
                this.score += item.special ? 50 : 10;
            }
        }
        this.callbacks.onScoreChange(this.score);

        // 7. 生成新道具 (炸弹/彩虹)
        for (let newItem of itemsToCreate) {
            if (this.grid[newItem.r][newItem.c]) {
                this.grid[newItem.r][newItem.c].el.remove();
            }
            const type = newItem.special === 'bomb' ? '💣' : '🌈';
            this.grid[newItem.r][newItem.c] = this.createItem(newItem.r, newItem.c, type, newItem.special);
            this.grid[newItem.r][newItem.c].el.classList.add('new-item');
        }

        // 8. 下落
        this.applyGravity();
        this.render();
        await this.wait(300);

        // 9. 填充
        this.fillNewItems();
        await this.wait(300);

        // 10. 连击 (Chain Reaction)
        const newGroups = this.findMatches();
        if (newGroups.length > 0) {
            await this.processMatches(newGroups);
        } else {
            // 检查死局
             if (!this.hasPossibleMoves()) {
                await this.shuffleBoard();
            }
        }
    }

    findTargetForSpecial(group) {
        if (this.lastSwap) {
            for (let p of group) {
                if ((p.r === this.lastSwap.p1.r && p.c === this.lastSwap.p1.c) ||
                    (p.r === this.lastSwap.p2.r && p.c === this.lastSwap.p2.c)) {
                    return p;
                }
            }
        }
        return group[Math.floor(group.length / 2)];
    }

    expandExplosions(points) {
        let queue = [...points];
        let processed = new Set(points.map(p => `${p.r},${p.c}`));
        let finalPoints = [...points];

        while (queue.length > 0) {
            const current = queue.shift();
            const item = this.grid[current.r][current.c];

            if (item && item.special) {
                let newTargets = [];
                
                if (item.special === 'bomb') {
                    // 3x3 爆炸
                    for (let r = current.r - 1; r <= current.r + 1; r++) {
                        for (let c = current.c - 1; c <= current.c + 1; c++) {
                            if (r >= 0 && r < this.height && c >= 0 && c < this.width) {
                                newTargets.push({r, c});
                            }
                        }
                    }
                } else if (item.special === 'rainbow') {
                    // 全屏随机一种颜色
                    const normalTypes = this.items.filter(t => !['💣','🌈'].includes(t));
                    const targetType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
                    for (let r = 0; r < this.height; r++) {
                        for (let c = 0; c < this.width; c++) {
                            if (this.grid[r][c] && this.grid[r][c].type === targetType) {
                                newTargets.push({r, c});
                            }
                        }
                    }
                }

                for (let t of newTargets) {
                    const key = `${t.r},${t.c}`;
                    if (!processed.has(key)) {
                        processed.add(key);
                        queue.push(t);
                        finalPoints.push(t);
                    }
                }
            }
        }
        return finalPoints;
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
        for (let c = 0; c < this.width; c++) {
            let startRow = -1;
            for (let r = this.height - 1; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    startRow = r;
                    break;
                }
            }
            if (startRow !== -1) {
                for (let r = startRow; r >= 0; r--) {
                    if (this.grid[r][c] === null) {
                        const type = this.randomItem();
                        const newItem = this.createItem(r, c, type);
                        newItem.el.classList.add('new-item');
                        this.grid[r][c] = newItem;
                    }
                }
            }
        }
    }

    hasPossibleMoves() {
        // 简单模拟检查
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width - 1; c++) {
                this.tempSwap(r, c, r, c+1);
                if (this.findMatches().length > 0) {
                    this.tempSwap(r, c, r, c+1);
                    return true;
                }
                this.tempSwap(r, c, r, c+1);
            }
        }
        for (let r = 0; r < this.height - 1; r++) {
            for (let c = 0; c < this.width; c++) {
                this.tempSwap(r, c, r+1, c);
                if (this.findMatches().length > 0) {
                    this.tempSwap(r, c, r+1, c);
                    return true;
                }
                this.tempSwap(r, c, r+1, c);
            }
        }
        // 只要有道具在场，就不算死局
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (this.grid[r][c] && this.grid[r][c].special) return true;
            }
        }
        return false;
    }

    tempSwap(r1, c1, r2, c2) {
        if (!this.grid[r1][c1] || !this.grid[r2][c2]) return;
        let temp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = temp;
    }

    async shuffleBoard() {
        const hint = document.createElement('div');
        hint.innerText = "无解！自动洗牌中...";
        hint.style.position = 'absolute';
        hint.style.top = '50%';
        hint.style.left = '50%';
        hint.style.transform = 'translate(-50%, -50%)';
        hint.style.background = 'rgba(0,0,0,0.7)';
        hint.style.color = 'white';
        hint.style.padding = '10px 20px';
        hint.style.borderRadius = '20px';
        hint.style.zIndex = '100';
        this.boardEl.appendChild(hint);
        
        await this.wait(1000);
        
        let allItems = [];
        for(let r=0; r<this.height; r++) {
            for(let c=0; c<this.width; c++) {
                if(this.grid[r][c]) {
                    allItems.push(this.grid[r][c]);
                }
            }
        }
        
        allItems.sort(() => Math.random() - 0.5);
        
        let idx = 0;
        for(let r=0; r<this.height; r++) {
            for(let c=0; c<this.width; c++) {
                this.grid[r][c] = allItems[idx++];
            }
        }
        
        this.render();
        hint.remove();
        
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.wait(500);
            await this.processMatches(matches);
        } else if (!this.hasPossibleMoves()) {
            this.shuffleBoard(); 
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
