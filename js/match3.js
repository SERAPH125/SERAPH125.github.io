    // V4.1: 增加 manualTriggers 参数，用于处理主动触发的特殊道具
    async processMatches(matchGroups, manualTriggers = []) {
        let pointsToRemove = new Set();
        let itemsToCreate = []; // {r, c, special}

        // 1. 处理自然匹配
        for (let group of matchGroups) {
            group.forEach(p => pointsToRemove.add(`${p.r},${p.c}`));
            
            if (group.length === 4) {
                let target = this.findTargetForSpecial(group);
                // 确保新生成的道具位置不被标记为移除（虽然逻辑上是要移除旧的生成新的，
                // 但为了避免 expandExplosions 误伤未来生成的位置，或者逻辑冲突）
                // 实际上我们是先移除旧DOM，再在同位置createItem。
                // 关键点：如果是4/5连，生成新道具是替代原来的消除，
                // 所以这个位置虽然在pointsToRemove里，但稍后我们会覆盖它。
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
        // 注意：这里需要先移除，但要保留 itemsToCreate 中预定的位置
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
        // 关键逻辑：这一步是在“消除”之后，“下落”之前执行的。
        // 所以新生成的道具会占据原本的位置，不会掉下去，也不会消失。
        // 它们会参与后续的逻辑（作为障碍物阻挡下落，或者自己下落）
        for (let newItem of itemsToCreate) {
            // 如果位置上有残留（异常情况），先移除
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
        // 这里的关键：所有东西（包括刚才生成的炸弹/彩虹）都已经就位。
        // findMatches 会扫描整个棋盘。
        // 如果刚才生成的炸弹（比如）恰好落下来凑成了 4 个炸弹连在一起（极低概率，因为炸弹不参与普通匹配），
        // 或者炸弹落下后，周围的普通糖果凑成了新的 4/5 连。
        // 那么是的！新的 4/5 连会再次触发 processMatches，再次生成新的炸弹/彩虹！
        // 这就是“无限连击”的快乐！
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
