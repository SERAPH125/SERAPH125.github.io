// 核心应用逻辑 - 公共JS文件
// 所有页面共享的数据和功能

// 全局应用对象
const app = {
    data: { 
        score: 0, 
        history: [],
        wishes: [],
        album: [],
        // 姨妈助手数据 (V4.13 完整版)
        periodData: {
            records: [], // [{ date: '2024-01-01', id: timestamp, symptoms: { pain: 0-5, mood: 'happy', note: '' } }] 历史记录数组
            averageCycle: 28, // 平均周期天数
            minCycle: null, // 最短周期
            maxCycle: null, // 最长周期
            lastRecord: null, // 最后一次记录的日期
            stdDeviation: null, // 周期标准差（规律性）
            // 提醒配置
            reminder: {
                enabled: true, // 是否启用提醒
                daysBefore: [3, 1, 0], // 提前提醒天数 [3天前, 1天前, 当天]
                reminderTime: '09:00' // 提醒时间
            },
            // 统计缓存
            stats: {
                thisMonth: { count: 0, avgCycle: null }, // 本月统计
                thisYear: { count: 0, avgCycle: null } // 本年度统计
            }
        },
        // 兼容旧版本数据
        periodDate: null,
        inventory: [],
        // 签到相关升级
        lastSignInDate_Boy: null,
        lastSignInDate_Girl: null,
        signInStreak: 0,
        signInLog: [], // { date: '2023-10-01', user: 'boy' }
        // 甜度系统
        girlSweetness: 0,
        girlHistory: [],
        // 纪念日 (V3.4)
        nextAnniversary: null, // { name: '生日', date: '2023-12-25' }
        // 年度计划 (V3.6)
        annualPlan: [] // [{ id, category, name, target, current, completed, icon }]
    },
    currentUser: 'boy', // 默认 'boy', 可切换为 'girl'
    deductStep: 0,
    currentCat: '💖',
    cloudObj: null,
    tempPhotoData: null,
    pendingUseItem: null,
    sizeWarningShown: false, // 防止重复弹窗

    ranks: appConfig.ranks,
    mercyLevels: appConfig.mercyLevels,
    tasks: appConfig.tasks,
    products: appConfig.products,
    loveQuotes: appConfig.loveQuotes,

    // 获取本地时间字符串 (YYYY-MM-DD)
    getTodayStr() {
        return utils.getTodayStr();
    },

    // 初始化LeanCloud
    initLeanCloud(appId, appKey, serverURL) {
        // 使用 storageManager
        storageManager.initLeanCloud({
            onCloudDataLoaded: (remoteData) => {
                this.handleCloudMerge(remoteData);
            },
            onCloudDataNotFound: (LoveData) => {
                storageManager.createInitialData(LoveData, this.data, {
                    onSyncSuccess: () => {
                        this.cloudObj = storageManager.cloudObj;
                        this.updateSyncStatus(true);
                        this.syncAlbum();
                    },
                    onSyncError: (err) => {
                         console.error('Initial save failed', err);
                         this.updateSyncStatus(false);
                    }
                });
            },
            onCloudError: (err) => {
                console.error(err);
                this.updateSyncStatus(false);
                this.loadLocalData();
                this.fixHistoryIds();
                if (typeof this.render === 'function') this.render();
            }
        });
    },

    // 处理云端数据合并逻辑
    handleCloudMerge(remoteData) {
        this.cloudObj = storageManager.cloudObj;
        
        // --- Merge Logic Start ---
        // 防止云端旧数据覆盖本地刚刚发生的签到行为
        const todayStr = this.getTodayStr();
        let useLocalForAuth = false;
        let boySignedIn = false;
        let girlSignedIn = false;

        // 检查本地是否有新的签到
        if (this.data.lastSignInDate_Boy === todayStr && remoteData.lastSignInDate_Boy !== todayStr) {
            remoteData.lastSignInDate_Boy = todayStr;
            useLocalForAuth = true;
            boySignedIn = true;
        }
        if (this.data.lastSignInDate_Girl === todayStr && remoteData.lastSignInDate_Girl !== todayStr) {
            remoteData.lastSignInDate_Girl = todayStr;
            useLocalForAuth = true;
            girlSignedIn = true;
        }

        // 通用数组合并函数 (基于ID去重)
        const mergeArray = (localArr, remoteArr) => {
            if (!localArr) return remoteArr || [];
            if (!remoteArr) return localArr || [];
            const localMap = new Map(localArr.map(item => [item.id, item]));
            const merged = [...localArr];
            remoteArr.forEach(remoteItem => {
                if (!localMap.has(remoteItem.id)) {
                    merged.push(remoteItem);
                }
            });
            // 按ID倒序排列 (通常ID是时间戳)
            return merged.sort((a, b) => b.id - a.id);
        };

        // 合并各个核心数据列表
        remoteData.history = mergeArray(this.data.history, remoteData.history);
        remoteData.girlHistory = mergeArray(this.data.girlHistory, remoteData.girlHistory); // 甜度记录
        remoteData.wishes = mergeArray(this.data.wishes, remoteData.wishes);
        // 相册不再合并，而是独立同步
        // remoteData.album = mergeArray(this.data.album, remoteData.album);
        remoteData.inventory = mergeArray(this.data.inventory, remoteData.inventory);
        // 年度计划合并（基于ID去重）
        remoteData.annualPlan = mergeArray(this.data.annualPlan, remoteData.annualPlan || []);

        // 如果本地有新签到，优先使用本地分数（因为它包含了签到奖励）
        // V4.10 Fix: 修复女生签到后甜度被云端旧数据覆盖的问题
        if (useLocalForAuth) {
            // 如果男生签到，优先使用本地积分
            if (boySignedIn) {
                remoteData.score = this.data.score;
            }
            // 如果女生签到，优先使用本地甜度
            if (girlSignedIn) {
                remoteData.girlSweetness = this.data.girlSweetness;
            }
            // 这里我们信任本地刚刚签到后的状态
        }
        
        this.data = remoteData;
        
        // 如果发生了合并，立即保存回云端
        if (useLocalForAuth) {
            this.saveData();
        }
        // --- Merge Logic End ---
        
        // 数据兼容性处理
        if (!this.data.wishes) this.data.wishes = [];
        if (!this.data.periodDate) this.data.periodDate = null;
        if (!this.data.inventory) this.data.inventory = [];
        
        // 姨妈助手数据迁移：将旧版本 periodDate 迁移到新版本 periodData
        if (!this.data.periodData) {
            this.data.periodData = {
                records: [],
                averageCycle: 28,
                minCycle: null,
                maxCycle: null,
                lastRecord: null
            };
        }
        // 如果存在旧版本的 periodDate，迁移到新结构
        if (this.data.periodDate && this.data.periodData.records.length === 0) {
            this.data.periodData.records.push({
                date: this.data.periodDate,
                id: Date.now()
            });
            this.data.periodData.lastRecord = this.data.periodDate;
            this.data.periodData.averageCycle = 28; // 默认值
            // 计算周期统计（如果只有一条记录，无法计算，保持默认值）
            this.updatePeriodStats();
        }
        // 确保 periodData 结构完整
        if (!this.data.periodData.records) this.data.periodData.records = [];
        if (!this.data.periodData.averageCycle) this.data.periodData.averageCycle = 28;
        if (!this.data.periodData.lastRecord) this.data.periodData.lastRecord = null;
        if (!this.data.periodData.reminder) {
            this.data.periodData.reminder = {
                enabled: true,
                daysBefore: [3, 1, 0],
                reminderTime: '09:00'
            };
        }
        if (!this.data.periodData.stats) {
            this.data.periodData.stats = {
                thisMonth: { count: 0, avgCycle: null },
                thisYear: { count: 0, avgCycle: null }
            };
        }
        // 双人签到数据兼容
        if (this.data.lastSignInDate_Boy === undefined) this.data.lastSignInDate_Boy = this.data.lastSignInDate || null;
        if (this.data.lastSignInDate_Girl === undefined) this.data.lastSignInDate_Girl = null;
        if (this.data.signInLog === undefined) this.data.signInLog = [];
        if (this.data.signInStreak === undefined) this.data.signInStreak = 0;
        // 甜度系统兼容
        if (this.data.girlSweetness === undefined) this.data.girlSweetness = 0;
        if (this.data.girlHistory === undefined) this.data.girlHistory = [];
        // 年度计划兼容
        if (this.data.annualPlan === undefined) this.data.annualPlan = [];

        this.fixHistoryIds();
        this.saveToLocal();
        
        // 数据加载完成后，尝试渲染当前页面
        if (typeof this.render === 'function') this.render();
        
        this.updateSyncStatus(true);
        
        // 启动相册同步
        this.syncAlbum();
    },

    // 初始化（通用部分）
    initCommon() {
        storageManager.init(); // 初始化默认配置

        // 核心修复：强制优先读取本地身份设置，不受云端影响
        const savedRole = localStorage.getItem('user_role');
        if (savedRole) {
            this.currentUser = savedRole;
            console.log('身份已恢复为本地设置:', this.currentUser);
        } else {
            // 如果是第一次打开（无缓存），默认设为 boy 并保存，避免歧义
            // 或者你希望第一次打开弹窗询问？目前先保持默认 boy
            this.currentUser = 'boy'; 
            localStorage.setItem('user_role', 'boy');
        }

        // 初始化主题
        const savedTheme = localStorage.getItem('app_theme') || 'pink';
        this.applyTheme(savedTheme);

        // 先加载本地数据，保证界面快速响应
        this.loadLocalData();
        this.fixHistoryIds();
        this.updateDays();
        
        // 再尝试连接云端同步
        this.initLeanCloud(); // 不再需要传参，从 storageManager 读取
        
        this.startSakuraLoop();
        this.showDailyQuote();
    },

    // 切换用户角色
    switchUserRole(role) {
        this.currentUser = role;
        localStorage.setItem('user_role', role);
        this.showToast(`身份已切换为：${role === 'boy' ? '男朋友' : '周金霞'}`);
        // 刷新页面以应用新身份
        setTimeout(() => location.reload(), 500);
    },

    // 切换主题
    switchTheme(themeName) {
        localStorage.setItem('app_theme', themeName);
        this.applyTheme(themeName);
        this.showToast('主题切换成功！🎨');
        // 如果在设置页，重新渲染以更新选中状态
        if (typeof this.render === 'function') this.render();
    },

    // 应用主题
    applyTheme(themeName) {
        document.body.className = `theme-${themeName}`;
    },

    // 更新恋爱天数
    updateDays() {
        const startDate = new Date('2025-08-10T00:00:00');
        const now = new Date();
        const diff = now - startDate;
        let days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days < 0) days = 0;
        const daysEl = document.getElementById('days-count');
        if (daysEl) daysEl.innerText = days + 1;
    },

    // 樱花特效循环
    startSakuraLoop() {
        uiManager.startSakuraLoop(this.data.score);
    },

    // 加载本地数据
    loadLocalData() {
        const loaded = storageManager.loadFromLocal('bf_app_v2');
        if (loaded) {
            this.data = { ...this.data, ...loaded };
            
            // 再次确保字段存在
            if(!this.data.wishes) this.data.wishes = [];
            if(!this.data.album) this.data.album = [];
            if(!this.data.inventory) this.data.inventory = [];
            // 双人签到兼容
            if (this.data.lastSignInDate_Boy === undefined) this.data.lastSignInDate_Boy = this.data.lastSignInDate || null;
            if (this.data.lastSignInDate_Girl === undefined) this.data.lastSignInDate_Girl = null;
            if (this.data.signInLog === undefined) this.data.signInLog = [];
            if (this.data.signInStreak === undefined) this.data.signInStreak = 0;
            // 甜度系统兼容
            if (this.data.girlSweetness === undefined) this.data.girlSweetness = 0;
            if (this.data.girlHistory === undefined) this.data.girlHistory = [];
            // 年度计划兼容
            if (this.data.annualPlan === undefined) this.data.annualPlan = [];
        }
    },

    // 保存到本地
    saveToLocal() {
        storageManager.saveToLocal('bf_app_v2', this.data);
    },

    // 保存数据（同步到云端）
    saveData() {
        this.saveToLocal();
        // 任何数据变更后都重新渲染当前页面
        if (typeof this.render === 'function') this.render();

        storageManager.saveToCloud(this.data, {
            onSuccess: () => console.log('云端同步成功 (主数据)'),
            onError: (err) => console.error('云端同步失败', err)
        });
    },

    // --- 相册独立存储逻辑 (V3.4 方案三) ---
    
    // 同步相册（拉取）
    syncAlbum() {
        if (!window.AV) return;
        const query = new AV.Query('LoveAlbum');
        query.descending('createdAt');
        query.limit(100); // 限制每次加载 100 张
        query.find().then((photos) => {
            const cloudAlbum = photos.map(p => {
                const attr = p.attributes;
                return {
                    id: p.id, // 使用 LeanCloud 的 ObjectId
                    url: attr.url,
                    caption: attr.caption,
                    location: attr.location,
                    date: attr.date,
                    timestamp: p.createdAt.getTime()
                };
            });

            // 迁移逻辑：如果本地有数据但云端为空（或少于本地），且未迁移过
            if ((!this.data.album || this.data.album.length > 0) && cloudAlbum.length === 0 && !this.data.albumMigrated) {
                console.log('检测到旧版相册数据，开始迁移...');
                this.migrateAlbum();
            } else {
                this.data.album = cloudAlbum;
                this.saveToLocal();
                if (typeof this.render === 'function') this.render();
                console.log('相册同步完成，共加载', cloudAlbum.length, '张');
            }
        }).catch(err => {
            console.error('相册同步失败', err);
        });
    },

    // 迁移旧照片
    migrateAlbum() {
        if (!this.data.album || this.data.album.length === 0) return;
        
        const tasks = this.data.album.map(photo => {
            return this.uploadPhoto({
                url: photo.url,
                caption: photo.caption,
                location: photo.location,
                date: photo.date
            }, true); // true 表示是迁移，不重复刷新
        });

        Promise.all(tasks).then(() => {
            this.data.albumMigrated = true;
            this.saveData(); // 保存迁移标记
            this.syncAlbum(); // 重新拉取
            alert('旧版相册已成功升级为“无限容量”相册！🎉');
        });
    },

    // 上传照片
    uploadPhoto(photoData, isMigration = false) {
        if (!window.AV) return Promise.reject('Cloud not ready');
        
        const LoveAlbum = AV.Object.extend('LoveAlbum');
        const photo = new LoveAlbum();
        
        photo.set('url', photoData.url);
        photo.set('caption', photoData.caption);
        photo.set('location', photoData.location);
        photo.set('date', photoData.date || new Date().toLocaleDateString());
        
        return photo.save().then((saved) => {
            if (!isMigration) {
                this.syncAlbum(); // 刷新显示
            }
            return saved;
        });
    },

    // 删除照片
    removePhoto(id) {
        if (!window.AV) return Promise.reject('Cloud not ready');
        // id 是 LeanCloud 的 objectId
        const photo = AV.Object.createWithoutData('LoveAlbum', id);
        return photo.destroy().then(() => {
            this.syncAlbum(); // 刷新
        });
    },

    // --- End 相册逻辑 ---

    // --- 排行榜系统 (V3.8) ---
    
    // 获取排行榜数据
    fetchLeaderboard(gameType) {
        if (!window.AV) return Promise.resolve([]);
        
        const query = new AV.Query('GameLeaderboard');
        query.equalTo('gameType', gameType);
        query.descending('score');
        query.limit(20); // 取前20名
        
        return query.find().then(results => {
            return results.map(r => ({
                username: r.get('username'),
                userRole: r.get('userRole'), // 'boy' or 'girl'
                score: r.get('score'),
                date: r.createdAt.toLocaleDateString()
            }));
        }).catch(err => {
            console.error('获取排行榜失败', err);
            return [];
        });
    },

    // 上传游戏分数 (自动更新最高分)
    uploadGameScore(gameType, score) {
        if (!window.AV) return Promise.resolve(false);
        
        const userRole = this.currentUser;
        const username = userRole === 'boy' ? '刘智勇' : '周金霞';
        
        // 1. 查询该用户在该游戏的历史最高分
        const query = new AV.Query('GameLeaderboard');
        query.equalTo('gameType', gameType);
        query.equalTo('userRole', userRole);
        
        return query.first().then(record => {
            if (record) {
                // 如果有记录，检查是否破纪录
                const oldScore = record.get('score');
                if (score > oldScore) {
                    record.set('score', score);
                    record.set('username', username); // 更新可能的名字变化
                    return record.save().then(() => 'update');
                }
                return 'no_change';
            } else {
                // 如果没记录，创建新记录
                const GameLeaderboard = AV.Object.extend('GameLeaderboard');
                const newRecord = new GameLeaderboard();
                newRecord.set('gameType', gameType);
                newRecord.set('userRole', userRole);
                newRecord.set('username', username);
                newRecord.set('score', score);
                return newRecord.save().then(() => 'create');
            }
        }).catch(err => {
            console.error('上传分数失败', err);
            // 第一次使用可能没有 Class，需要允许自动创建
            if (err.code === 101) {
                 // Class 不存在，直接创建
                const GameLeaderboard = AV.Object.extend('GameLeaderboard');
                const newRecord = new GameLeaderboard();
                newRecord.set('gameType', gameType);
                newRecord.set('userRole', userRole);
                newRecord.set('username', username);
                newRecord.set('score', score);
                return newRecord.save().then(() => 'create');
            }
        });
    },

    // --- End 排行榜系统 ---

    // 获取等级
    getRank() {
        if (this.data.score < 0) {
            if (this.data.score > -100) return "膝盖有点疼的罪人";
            if (this.data.score > -300) return "跪在搓衣板上的罪人";
            if (this.data.score > -500) return "睡在门口地垫的罪人";
            return "已被逐出家门的流浪汉";
        }
        let title = this.ranks[0].title;
        for (let r of this.ranks) {
            if (this.data.score >= r.limit) title = r.title;
        }
        return title;
    },

    // 执行分数变化
    executeChange(amount, reason) {
        this.data.score += amount;
        this.data.history.unshift({ 
            id: Date.now(), 
            time: new Date().toLocaleString(), 
            reason, 
            amount 
        });
        if (this.data.history.length > 50) this.data.history.pop();
        this.saveData();
    },

    // 游戏积分结算接口 (Game Integration)
    // 供 games.html 调用，具有防刷机制（简单版）
    submitGameScore(gameName, score) {
        // 先尝试上传到排行榜 (后台静默进行)
        this.uploadGameScore(gameName, score);
        
        let minScore = 0;
        let reward = 0;
        
        // 不同游戏的奖励规则
        if (gameName === 'match3') {
            minScore = 1000;
            reward = 5;
        } else if (gameName === '2048') {
            minScore = 2048; // 需要达到2048分
            reward = 15; // 奖励更多
        } else if (gameName === 'sudoku') {
            // 数独：完成即可获得奖励（score 是转换后的分数，完成时 score > 0）
            minScore = 1; // 只要完成就有奖励
            reward = 10; // 完成数独奖励
        } else {
            return false; // 未知游戏
        }
        
        // 检查分数是否达标
        if (score >= minScore) {
            // 检查今天是否已经领取过游戏奖励
            const todayStr = this.getTodayStr(); // 统一使用 utils.getTodayStr()
            const rewardKey = `game_reward_${gameName}_${todayStr}`; // V4.9 Fix: 确保 key 使用正确的日期
            
            // Debug: 打印日期和 Key
            console.log(`Checking game reward for ${gameName}: ${rewardKey}`);
            
            const lastGameReward = localStorage.getItem(rewardKey);
            
            if (lastGameReward === 'true') {
                return false; // 今天已经领过奖励
            } else {
                // 首次达标，发放奖励
                const reason = `游戏挑战成功：${gameName} (${score}分)`;
                
                // 根据身份区分奖励类型
                if (this.currentUser === 'girl') {
                    this.addGirlSweetness(reward, reason); // 女生加甜度
                } else {
                    this.executeChange(reward, reason); // 男生加积分
                }
                
                localStorage.setItem(rewardKey, 'true');
                return true; // 奖励发放成功
            }
        }
        return false;
    },

    // 修复历史记录ID
    fixHistoryIds() {
        if (this.data.history) {
            this.data.history = utils.fixListIds(this.data.history);
        }
    },

    // 更新同步状态
    updateSyncStatus(isOnline) {
        const dot = document.getElementById('sync-dot');
        const text = document.getElementById('sync-text');
        if(dot && text) {
            if(isOnline) {
                dot.className = 'status-dot online';
                text.innerText = '云端已连接 (实时同步中)';
            } else {
                dot.className = 'status-dot offline';
                text.innerText = '离线模式 (数据未同步)';
            }
        }
    },

    // 连接云端
    connectCloud() {
        const appId = document.getElementById('lean-app-id').value.trim();
        const appKey = document.getElementById('lean-app-key').value.trim();
        if(!appId || !appKey) return alert('请输入 App ID 和 Key');
        
        localStorage.setItem('lean_app_id', appId);
        localStorage.setItem('lean_app_key', appKey);
        
        const prefix = appId.substring(0, 8).toLowerCase();
        const serverURL = `https://${prefix}.api.lncldglobal.com`;
        localStorage.setItem('lean_server_url', serverURL);

        // 更新 storageManager 的配置缓存
        storageManager.init();

        alert('配置已保存，正在尝试连接...');
        location.reload();
    },

    // 强制同步
    forceSync() {
        if(!this.cloudObj) return alert('请先连接云端！');
        this.saveData();
        alert('正在强制同步...');
    },

    // 显示提示
    showToast(msg) {
        uiManager.showToast(msg);
    },

    // 显示每日一句
    showDailyQuote() {
        const quote = this.loveQuotes[Math.floor(Math.random() * this.loveQuotes.length)];
        const el = document.getElementById('daily-quote');
        if(el) el.innerText = `" ${quote} "`;
    },

    // 多页面兼容函数
    switchTab(tab) {
        // 预留
    },

    // 增加甜度
    addGirlSweetness(amount, reason) {
        this.data.girlSweetness = (this.data.girlSweetness || 0) + amount;
        if(!this.data.girlHistory) this.data.girlHistory = [];
        this.data.girlHistory.unshift({
            id: Date.now(),
            time: new Date().toLocaleString(),
            reason,
            amount
        });
        if(this.data.girlHistory.length > 50) this.data.girlHistory.pop();
        
        // 自动兑换检查已移除，支持无限积累
        this.showToast(`记录成功！甜度 ${amount >= 0 ? '+' : ''}${amount} 💕`);
        this.saveData();
    },

    // 积分交易 (查看答案专用)
    // fromUser: 'boy' or 'girl'
    // amount: 交易数量
    // reason: 原因
    tradePoints(fromUser, amount, reason) {
        if (amount <= 0) return false;

        if (fromUser === 'girl') {
            // 女生扣甜度，男生加积分
            if ((this.data.girlSweetness || 0) < amount) {
                alert('甜度不足，无法查看答案！快去哄哄男朋友赚甜度吧~ 💕');
                return false;
            }
            this.addGirlSweetness(-amount, `[支出] ${reason}`);
            this.executeChange(amount, `[收入] 女朋友${reason}`); // executeChange 默认给男生加分
            return true;
        } else {
            // 男生扣积分，女生加甜度
            if ((this.data.score || 0) < amount) {
                alert('积分不足，无法查看答案！快去努力表现赚积分吧！💪');
                return false;
            }
            this.executeChange(-amount, `[支出] ${reason}`);
            this.addGirlSweetness(amount, `[收入] 男朋友${reason}`);
            return true;
        }
    },

    // 更新周期统计数据（平均/最短/最长周期）
    updatePeriodStats() {
        const periodData = this.data.periodData || { records: [] };
        const records = periodData.records || [];
        
        if (records.length < 2) {
            // 少于2条记录，无法计算周期，使用默认值
            periodData.averageCycle = 28;
            periodData.minCycle = null;
            periodData.maxCycle = null;
            periodData.stdDeviation = null;
            this.updatePeriodMonthlyStats();
            return;
        }
        
        // 按日期排序（从早到晚）
        const sortedRecords = [...records].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        // 计算每个周期的天数
        const cycles = [];
        for (let i = 1; i < sortedRecords.length; i++) {
            const prevDate = new Date(sortedRecords[i - 1].date + 'T00:00:00');
            const currDate = new Date(sortedRecords[i].date + 'T00:00:00');
            const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
            if (daysDiff > 0 && daysDiff < 60) { // 过滤异常数据（周期应该在合理范围内）
                cycles.push(daysDiff);
            }
        }
        
        if (cycles.length > 0) {
            // 计算平均值
            const sum = cycles.reduce((a, b) => a + b, 0);
            periodData.averageCycle = Math.round(sum / cycles.length);
            // 计算最短和最长
            periodData.minCycle = Math.min(...cycles);
            periodData.maxCycle = Math.max(...cycles);
            
            // 计算标准差（周期规律性）
            if (cycles.length >= 2) {
                const mean = sum / cycles.length;
                const variance = cycles.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / cycles.length;
                periodData.stdDeviation = Math.round(variance * 100) / 100; // 保留2位小数
            } else {
                periodData.stdDeviation = null;
            }
        } else {
            // 如果没有有效周期数据，使用默认值
            periodData.averageCycle = 28;
            periodData.minCycle = null;
            periodData.maxCycle = null;
            periodData.stdDeviation = null;
        }
        
        // 更新本月/本年度统计
        this.updatePeriodMonthlyStats();
    },

    // 更新本月/本年度统计
    updatePeriodMonthlyStats() {
        const periodData = this.data.periodData || { records: [] };
        const records = periodData.records || [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // 本月统计
        const thisMonthRecords = records.filter(r => {
            const recordDate = new Date(r.date + 'T00:00:00');
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });
        periodData.stats.thisMonth.count = thisMonthRecords.length;
        
        // 本年度统计
        const thisYearRecords = records.filter(r => {
            const recordDate = new Date(r.date + 'T00:00:00');
            return recordDate.getFullYear() === currentYear;
        });
        periodData.stats.thisYear.count = thisYearRecords.length;
        
        // 计算本月平均周期（需要至少2条记录）
        if (thisMonthRecords.length >= 2) {
            const sorted = [...thisMonthRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
            const cycles = [];
            for (let i = 1; i < sorted.length; i++) {
                const prevDate = new Date(sorted[i - 1].date + 'T00:00:00');
                const currDate = new Date(sorted[i].date + 'T00:00:00');
                const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
                if (daysDiff > 0 && daysDiff < 60) cycles.push(daysDiff);
            }
            if (cycles.length > 0) {
                periodData.stats.thisMonth.avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
            }
        }
        
        // 计算本年度平均周期
        if (thisYearRecords.length >= 2) {
            const sorted = [...thisYearRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
            const cycles = [];
            for (let i = 1; i < sorted.length; i++) {
                const prevDate = new Date(sorted[i - 1].date + 'T00:00:00');
                const currDate = new Date(sorted[i].date + 'T00:00:00');
                const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
                if (daysDiff > 0 && daysDiff < 60) cycles.push(daysDiff);
            }
            if (cycles.length > 0) {
                periodData.stats.thisYear.avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
            }
        }
    },

    // 预测下次日期范围（考虑周期波动）
    predictNextPeriodRange() {
        const periodData = this.data.periodData || {};
        const lastRecord = periodData.lastRecord;
        if (!lastRecord) return null;
        
        const lastDate = new Date(lastRecord + 'T00:00:00');
        const avgCycle = periodData.averageCycle || 28;
        const stdDev = periodData.stdDeviation || 0;
        
        // 基础预测日期
        const baseDate = new Date(lastDate);
        baseDate.setDate(lastDate.getDate() + avgCycle);
        
        // 考虑标准差，给出范围（±1个标准差）
        const stdDevDays = Math.round(Math.sqrt(stdDev)) || 2; // 标准差的天数
        const minDate = new Date(baseDate);
        minDate.setDate(baseDate.getDate() - stdDevDays);
        const maxDate = new Date(baseDate);
        maxDate.setDate(baseDate.getDate() + stdDevDays);
        
        return {
            base: baseDate,
            min: minDate,
            max: maxDate,
            range: stdDevDays * 2
        };
    },

    // 检查是否需要提醒
    checkPeriodReminder() {
        const periodData = this.data.periodData || {};
        if (!periodData.reminder || !periodData.reminder.enabled) return null;
        if (!periodData.lastRecord) return null;
        
        const prediction = this.predictNextPeriodRange();
        if (!prediction) return null;
        
        const today = new Date();
        const todayStr = this.getTodayStr();
        const todayDate = new Date(todayStr + 'T00:00:00');
        const baseDate = prediction.base;
        
        // 计算距离天数
        const daysUntil = Math.ceil((baseDate - todayDate) / (1000 * 60 * 60 * 24));
        
        // 检查是否在提醒天数列表中
        const reminderDays = periodData.reminder.daysBefore || [3, 1, 0];
        if (reminderDays.includes(daysUntil)) {
            return {
                daysUntil: daysUntil,
                date: baseDate,
                message: daysUntil === 0 ? '就是今天！记得多喝热水，注意保暖哦 ❤️' :
                        daysUntil === 1 ? '明天就要来了，提前准备好哦~' :
                        `还有${daysUntil}天就要来了，记得提前准备~`
            };
        }
        
        return null;
    }
};

// 页面加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        uiManager.checkIOSInstall();
        uiManager.generateIcon();
    });
} else {
    uiManager.checkIOSInstall();
    uiManager.generateIcon();
}
