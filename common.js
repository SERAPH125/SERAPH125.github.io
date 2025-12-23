// 核心应用逻辑 - 公共JS文件
// 所有页面共享的数据和功能

// 全局应用对象
const app = {
    data: { 
        score: 0, 
        history: [],
        wishes: [],
        album: [],
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
        nextAnniversary: null // { name: '生日', date: '2023-12-25' }
    },
    currentUser: 'boy', // 默认 'boy', 可切换为 'girl'
    deductStep: 0,
    currentCat: '💖',
    cloudObj: null,
    tempPhotoData: null,
    pendingUseItem: null,
    sizeWarningShown: false, // 防止重复弹窗

    ranks: [
        { limit: 0, title: "周金霞的新手男友" },
        { limit: 100, title: "周金霞的青铜男友" },
        { limit: 300, title: "周金霞的黄金男友" },
        { limit: 600, title: "周金霞的钻石男友" },
        { limit: 1000, title: "周金霞的完美老公" },
        { limit: 5000, title: "周金霞的家庭帝位" }
    ],

    mercyLevels: {
        1: [ 
            "宝宝，看在我这么可爱的份上，这次就算了吧？🥺",
            "呜呜呜，扣分会心碎的，亲一口抵消好不好？😚",
            "我保证下次不敢了！让我给你捏捏肩将功补过吧！💆‍♂️",
            "你的小可爱正在请求原谅... 进度 99%... ❤️",
            "糟糕，监测到扣分会引发男友抑郁，建议撤销！⚠️",
            "不要扣分嘛，我给你学小猫叫？喵~ 🐱",
            "手下留情！我愿意承包今天的开心！✨",
            "看我真诚的大眼睛，像是会故意犯错的人吗？👀",
            "再给一次机会嘛，我一定好好表现！💪",
            "扣分好痛痛，需要宝宝呼呼才能好~ 🌬️"
        ],
        2: [ 
            "只要不扣分，今晚洗碗、拖地、暖被窝我全包了！🥣",
            "据算命先生说，今天扣分会影响财运哦，要不改天？🙏",
            "给个机会嘛长官！小的愿意肉偿... (羞涩) 👉👈",
            "不要啊！我给你买奶茶行不行？🥤",
            "扣分事小，气坏身体事大！来，笑一个嘛~ 😄",
            "暂缓扣分申请已提交，请审批：同意(推荐) / 驳回(需亲一口) 📝",
            "能不能用一个拥抱来抵消这次扣分？🫂",
            "如果放过我，周末带你去吃好吃的！🍲",
            "冷静！冲动是魔鬼，要不先记账上？📒",
            "老板！再给我打个工的机会吧，不要开除我！💼"
        ],
        3: [ 
            "这是最后的机会了...你真的舍得让你男朋友变成负分罪人吗？😭",
            "心痛！感觉不会再爱了...除非你不扣分！💔",
            "警报！如果扣分，你的男朋友可能会哭晕在厕所！🚽",
            "手下留情！只要不扣，我答应你一个愿望！🌟",
            "我已经躺平任嘲了，但能不能别扣分？🛌",
            "苍天啊！大地啊！谁来救救这个可怜的孩子！🌧️",
            "一旦扣分，你的男朋友将失去快乐机能 1 小时！🤖",
            "我错了！我真的错了！除了扣分什么都行！🧎‍♂️",
            "看着我破碎的心，你真的忍心再补一刀吗？🏺",
            "最后的请求：能不能把扣分换成亲亲？😘"
        ]
    },

    tasks: [
        "给女朋友唱一首情歌 🎤", 
        "公主抱做3个深蹲 🏋️", 
        "深情对视1分钟不许笑 💑", 
        "夸女朋友的三个优点 ✨", 
        "给女朋友讲个睡前故事 📖",
        "给女朋友按摩肩膀 5 分钟 💆‍♂️",
        "模仿女朋友生气的样子（要可爱） 😠",
        "讲一个冷笑话逗女朋友开心 ❄️",
        "坦白一件小时候的糗事 🙈",
        "给女朋友画一幅画像（灵魂画手上线） 🎨",
        "为女朋友梳头发/吹头发 💇‍♂️",
        "拍一张女朋友最美的照片 📷",
        "用方言说\"我爱你\" 🗣️",
        "答应女朋友一个小小的无理取闹 😈",
        "做10个俯卧撑并说\"我身体倍儿棒\" 💪"
    ],

    products: [
        // owner: 'boy' (默认) - 男生购买，服务者是女生
        { id: 1, icon: '🥤', name: '请喝奶茶', price: 100, owner: 'boy' },
        { id: 5, icon: '🍜', name: '爱心宵夜', price: 150, owner: 'boy' },
        { id: 11, icon: '🛌', name: '周末赖床卡', price: 150, owner: 'boy' },
        { id: 2, icon: '💆‍♂️', name: '享受按摩(30min)', price: 200, owner: 'boy' },
        { id: 3, icon: '🧹', name: '免做家务卡', price: 300, owner: 'boy' },
        { id: 12, icon: '🤐', name: '停止唠叨(30min)', price: 300, owner: 'boy' },
        { id: 13, icon: '🍗', name: '大餐点菜权', price: 350, owner: 'boy' },
        { id: 14, icon: '🎮', name: '游戏畅玩之夜', price: 400, owner: 'boy' },
        { id: 4, icon: '🎬', name: '陪看电影(任选)', price: 500, owner: 'boy' },
        { id: 15, icon: '👗', name: '指定穿搭券', price: 600, owner: 'boy' },
        { id: 16, icon: '🤝', name: '冷战终止卡', price: 666, owner: 'boy' },
        { id: 17, icon: '🎫', name: '无理由原谅卡', price: 888, owner: 'boy' },
        { id: 18, icon: '🍺', name: '兄弟局通行证', price: 1200, owner: 'boy' },
        { id: 6, icon: '🎁', name: '清空购物车(¥1000内)', price: 5000, owner: 'boy' },
        { id: 19, icon: '✈️', name: '周边双人游', price: 10000, owner: 'boy' },
        { id: 20, icon: '👑', name: '家庭帝位体验卡(1天)', price: 99999, owner: 'boy' },
        
        // owner: 'girl' - 女生购买，服务者是男生 (消耗甜度)
        { id: 101, icon: '🥤', name: '我要喝奶茶', price: 50, owner: 'girl', desc: '刘智勇立刻点单配送' },
        { id: 102, icon: '🧧', name: '5.20元红包', price: 100, owner: 'girl', desc: '见者有份，立刻转账' },
        { id: 103, icon: '💆‍♀️', name: '男友特供按摩', price: 150, owner: 'girl', desc: '享受专业按摩(30min)' },
        { id: 104, icon: '🛍️', name: '全能拎包侠', price: 200, owner: 'girl', desc: '陪逛2小时不许喊累' },
        { id: 108, icon: '💇‍♀️', name: '吹头发服务', price: 220, owner: 'girl', desc: '温柔吹干，不许扯痛' },
        { id: 109, icon: '🐱', name: '学猫叫三声', price: 50, owner: 'girl', desc: '毫无尊严地哄我开心' },
        { id: 105, icon: '🚗', name: '专属司机服务', price: 300, owner: 'girl', desc: '随叫随到，专车接送' },
        { id: 110, icon: '🚫', name: '这局不许赢', price: 350, owner: 'girl', desc: '玩游戏时必须让着我' },
        { id: 111, icon: '📸', name: '专属摄影师', price: 500, owner: 'girl', desc: '拍照直到满意为止' },
        { id: 107, icon: '🌹', name: '浪漫约会夜', price: 800, owner: 'girl', desc: '刘智勇策划并买单' },
        { id: 112, icon: '🏰', name: '一日女王卡', price: 1500, owner: 'girl', desc: '今天说什么都得听' }
    ],

    loveQuotes: [
        "这是我们相爱的第 N 天，每一天都更爱你一點。",
        "斯人若彩虹，遇上方知有。",
        "想和你一起去看春夏秋冬，驻足在每一处风景。",
        "醒来觉得甚是爱你。",
        "海底月是天上月，眼前人是心上人。",
        "喜欢你，是我做过最坚持的事。",
        "你是我平淡岁月里最耀眼的星辰。",
        "即使世界荒芜，总有一个人，他会是你的信徒。",
        "遇见你，所有星星都落到了我头上。",
        "一想到你，我的嘴角就忍不住上扬。",
        "和你在一起的时光，全都很耀眼。",
        "在这个星球上，你是我最特别的引力。",
        "想把世界上最好的都给你，却发现世上最好的是你。",
        "你是我最意外的勇敢，也是我最温暖的归宿。",
        "春风十里不如你，梦里梦外都是你。",
        "今天的风很甜，因为里面有你的味道。",
        "世界很一般，但你超有趣。",
        "今天天气不错，适合想你，也适合见你。",
        "即使心情不好，见到你也会偷偷笑一下。",
        "想和你分享今天遇到的所有小猫小狗。",
        "你不用多好，我喜欢就好。",
        "其实我很好哄，比如你对我笑一笑。",
        "你是我平淡生活里的惊喜，专门治愈我的不开心。",
        "只要看到你的消息，我就能开心好久。",
        "想做你的充电宝，随时给你满满的能量。",
        "今天的可爱指标已达标，请查收。",
        "别难过，我带你去吃好吃的。",
        "你是我的未完待续，也是我的现在进行时。"
    ],

    // 获取本地时间字符串 (YYYY-MM-DD)
    getTodayStr() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 初始化LeanCloud
    initLeanCloud(appId, appKey, serverURL) {
        this.createInitialData = (LoveData) => {
            const newData = new LoveData();
            newData.set('content', this.data);
            newData.save().then((obj) => {
                this.cloudObj = obj;
                this.updateSyncStatus(true);
                // 新增：初始化相册
                this.syncAlbum();
            }).catch(err => {
                console.error('Initial save failed', err);
                this.updateSyncStatus(false);
            });
        };

        try {
            if(!window.AV) {
                return;
            }
            AV.init({ appId, appKey, serverURL: serverURL }); 
            
            const LoveData = AV.Object.extend('LoveData');
            const query = new AV.Query('LoveData');
            
            query.first().then((data) => {
                if (data) {
                    this.cloudObj = data;
                    const remoteData = data.get('content');
                    
                    // --- Merge Logic Start ---
                    // 防止云端旧数据覆盖本地刚刚发生的签到行为
                    const todayStr = this.getTodayStr();
                    let useLocalForAuth = false;

                    // 检查本地是否有新的签到
                    if (this.data.lastSignInDate_Boy === todayStr && remoteData.lastSignInDate_Boy !== todayStr) {
                        remoteData.lastSignInDate_Boy = todayStr;
                        useLocalForAuth = true;
                    }
                    if (this.data.lastSignInDate_Girl === todayStr && remoteData.lastSignInDate_Girl !== todayStr) {
                        remoteData.lastSignInDate_Girl = todayStr;
                        useLocalForAuth = true;
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

                    // 如果本地有新签到，优先使用本地分数（因为它包含了签到奖励）
                    if (useLocalForAuth) {
                        remoteData.score = this.data.score;
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
                    // 双人签到数据兼容
                    if (this.data.lastSignInDate_Boy === undefined) this.data.lastSignInDate_Boy = this.data.lastSignInDate || null;
                    if (this.data.lastSignInDate_Girl === undefined) this.data.lastSignInDate_Girl = null;
                if (this.data.signInLog === undefined) this.data.signInLog = [];
                if (this.data.signInStreak === undefined) this.data.signInStreak = 0;
                // 甜度系统兼容
                if (this.data.girlSweetness === undefined) this.data.girlSweetness = 0;
                if (this.data.girlHistory === undefined) this.data.girlHistory = [];

                this.fixHistoryIds();
                this.saveToLocal();
                    
                    // 数据加载完成后，尝试渲染当前页面
                    if (typeof this.render === 'function') this.render();
                    
                    this.updateSyncStatus(true);
                    
                    // 启动相册同步
                    this.syncAlbum();
                } else {
                    this.createInitialData(LoveData);
                }
            }).catch(err => {
                if (err.code === 101) {
                    this.createInitialData(LoveData);
                } else {
                    console.error(err);
                    this.updateSyncStatus(false);
                    // 即使云端失败，也加载本地数据并渲染
                    this.loadLocalData();
                    this.fixHistoryIds();
                    if (typeof this.render === 'function') this.render();
                }
            });

        } catch(e) {
            console.error(e);
            this.updateSyncStatus(false);
            // 发生异常时也加载本地数据
            this.loadLocalData();
            if (typeof this.render === 'function') this.render();
        }
    },

    // 初始化（通用部分）
    initCommon() {
        const presetAppId = "MekXCArJv2zcoNj63pPBf2wz-gzGzoHsz";
        const presetAppKey = "4gtuHZVj2S6XlF79Av5l7WKz";
        const presetServerURL = "https://mekxcarj.lc-cn-n1-shared.com";
        
        // 修复：仅当本地没有配置时才写入默认值，避免覆盖用户设置
        if (!localStorage.getItem('lean_app_id')) {
            localStorage.setItem('lean_app_id', presetAppId);
        }
        if (!localStorage.getItem('lean_app_key')) {
            localStorage.setItem('lean_app_key', presetAppKey);
        }
        if (!localStorage.getItem('lean_server_url')) {
            localStorage.setItem('lean_server_url', presetServerURL);
        }

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
        this.initLeanCloud(presetAppId, presetAppKey, presetServerURL);
        
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
        const loop = () => {
            let delay = 300;
            if (this.data.score < 0) {
                delay = 300 + Math.abs(this.data.score) * 5; 
            }
            if (this.data.score > -1000) {
                createPetal();
                setTimeout(loop, delay);
            } else {
                setTimeout(loop, 2000);
            }
        };
        loop();
    },

    // 加载本地数据
    loadLocalData() {
        const saved = localStorage.getItem('bf_app_v2'); 
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data = { ...this.data, ...parsed };
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
            } catch(e) {
                console.error("Local data parse error", e);
            }
        }
    },

    // 保存到本地
    saveToLocal() {
        try {
            localStorage.setItem('bf_app_v2', JSON.stringify(this.data));
        } catch (e) {
            console.error("Local save error", e);
            alert('本地存储空间已满！请删除一些照片或愿望再试。');
        }
    },

    // 保存数据（同步到云端）
    saveData() {
        this.saveToLocal();
        // 任何数据变更后都重新渲染当前页面
        if (typeof this.render === 'function') this.render();

        if (this.cloudObj) {
            // 复制一份数据，排除 album
            const dataToSync = JSON.parse(JSON.stringify(this.data));
            delete dataToSync.album; // 相册走独立表，不存这里

            this.cloudObj.set('content', dataToSync);
            this.cloudObj.save().then(() => {
                console.log('云端同步成功 (主数据)');
            }).catch(err => {
                console.error('云端同步失败', err);
            });
        }
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
        const username = userRole === 'boy' ? '男朋友' : '周金霞';
        
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
        } else {
            return false; // 未知游戏
        }
        
        // 检查分数是否达标
        if (score >= minScore) {
            // 检查今天是否已经领取过游戏奖励
            const todayStr = this.getTodayStr();
            const lastGameReward = localStorage.getItem(`game_reward_${gameName}_${todayStr}`);
            
            if (lastGameReward) {
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
                
                localStorage.setItem(`game_reward_${gameName}_${todayStr}`, 'true');
                return true; // 奖励发放成功
            }
        }
        return false;
    },

    // 修复历史记录ID
    fixHistoryIds() {
        if (this.data.history && this.data.history.length > 0) {
            this.data.history.forEach((item, index) => {
                if (!item.id) item.id = Date.now() + index;
            });
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
        alert(msg);
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
    }
};

// 樱花特效函数
function createPetal() {
    const container = document.getElementById('sakura-container');
    if (!container) return;
    
    const petal = document.createElement('div');
    petal.className = 'petal';
    const size = Math.random() * 10 + 5;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.left = `${Math.random() * 100}vw`;
    petal.style.animationDuration = `${Math.random() * 3 + 2}s`;
    petal.style.opacity = Math.random();
    container.appendChild(petal);
    
    setTimeout(() => petal.remove(), 5000);
}

// 检测iOS并提示添加主屏幕
function checkIOSInstall() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true;

    if (isIOS && !isStandalone) {
        setTimeout(() => {
            const guide = document.getElementById('ios-install-guide');
            if (guide) guide.style.display = 'block';
        }, 2000);
    }
}

// 动态生成桌面图标
(function generateIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 180, 180);
    gradient.addColorStop(0, '#ff9a9e');
    gradient.addColorStop(1, '#fecfef');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(0, 0, 180, 180, 40);
    } else {
        ctx.rect(0, 0, 180, 180);
    }
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', 90, 95);

    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = canvas.toDataURL('image/png');
    document.head.appendChild(link);

    const manifest = {
        name: "周金霞男友",
        short_name: "周金霞男友",
        start_url: ".",
        display: "standalone",
        background_color: "#fff0f3",
        theme_color: "#ff8fa3",
        icons: [{
            src: canvas.toDataURL('image/png'),
            sizes: "180x180",
            type: "image/png"
        }]
    };
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
    document.head.appendChild(manifestLink);
})();

// 页面加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkIOSInstall);
} else {
    checkIOSInstall();
}
