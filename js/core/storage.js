// 数据存储管理逻辑
// 负责 LocalStorage 和 LeanCloud 的数据读写与同步

const storageManager = {
    // LeanCloud 配置
    config: {
        appId: "MekXCArJv2zcoNj63pPBf2wz-gzGzoHsz",
        appKey: "4gtuHZVj2S6XlF79Av5l7WKz",
        serverURL: "https://mekxcarj.lc-cn-n1-shared.com"
    },
    
    // 云端对象缓存
    cloudObj: null,
    planCloudObj: null,

    // 初始化配置 (优先读取本地，否则使用默认)
    init() {
        if (!localStorage.getItem('lean_app_id')) {
            localStorage.setItem('lean_app_id', this.config.appId);
        }
        if (!localStorage.getItem('lean_app_key')) {
            localStorage.setItem('lean_app_key', this.config.appKey);
        }
        if (!localStorage.getItem('lean_server_url')) {
            localStorage.setItem('lean_server_url', this.config.serverURL);
        }
    },

    // 获取当前 LeanCloud 配置
    getCloudConfig() {
        return {
            appId: localStorage.getItem('lean_app_id') || this.config.appId,
            appKey: localStorage.getItem('lean_app_key') || this.config.appKey,
            serverURL: localStorage.getItem('lean_server_url') || this.config.serverURL
        };
    },

    // 初始化 LeanCloud SDK
    initLeanCloud(callbacks) {
        const { appId, appKey, serverURL } = this.getCloudConfig();
        
        try {
            if(!window.AV) return;
            AV.init({ appId, appKey, serverURL });
            
            // 尝试获取云端数据 (并行查询主数据和计划数据)
            const queryLove = new AV.Query('LoveData');
            const queryPlan = new AV.Query('PlanData');
            
            Promise.all([
                queryLove.first().catch(e => { console.warn('LoveData fetch failed', e); return null; }),
                queryPlan.first().catch(e => { console.warn('PlanData fetch failed', e); return null; })
            ]).then(([loveObj, planObj]) => {
                if (loveObj) {
                    this.cloudObj = loveObj;
                    let finalContent = loveObj.get('content') || {};
                    
                    // 合并计划数据
                    if (planObj) {
                        this.planCloudObj = planObj;
                        const planContent = planObj.get('content') || {};
                        // 如果 PlanData 中有数据，覆盖主数据中的 annualPlan
                        if (planContent.annualPlan) {
                            finalContent.annualPlan = planContent.annualPlan;
                        }
                    } else {
                        // 如果没有 PlanData，但主数据中有 annualPlan，暂时不需要做特殊处理
                        // 下次保存时会自动创建 PlanData
                        console.log('No PlanData found, using data from LoveData');
                    }
                    
                    callbacks.onCloudDataLoaded(finalContent);
                } else {
                    callbacks.onCloudDataNotFound(AV.Object.extend('LoveData'));
                }
            }).catch(err => {
                callbacks.onCloudError(err);
            });
            
        } catch(e) {
            console.error('LeanCloud init error:', e);
            callbacks.onCloudError(e);
        }
    },

    // 创建初始云端数据
    createInitialData(LoveData, initialContent, callbacks) {
        const newData = new LoveData();
        newData.set('content', initialContent);
        newData.save().then((obj) => {
            this.cloudObj = obj;
            callbacks.onSyncSuccess();
        }).catch(err => {
            callbacks.onSyncError(err);
        });
    },

    // 保存数据到云端
    saveToCloud(data, callbacks) {
        if (!this.cloudObj) return;

        // 1. 准备主数据 (排除相册和计划)
        const mainDataToSync = JSON.parse(JSON.stringify(data));
        delete mainDataToSync.album;
        const annualPlanData = mainDataToSync.annualPlan; // 暂存计划数据
        delete mainDataToSync.annualPlan; // 从主数据中移除

        // 2. 准备计划数据
        const planDataToSync = {
            annualPlan: annualPlanData || []
        };

        // 3. 并行保存
        const promises = [];

        // 保存主数据
        this.cloudObj.set('content', mainDataToSync);
        promises.push(this.cloudObj.save());

        // 保存计划数据
        if (this.planCloudObj) {
            this.planCloudObj.set('content', planDataToSync);
            promises.push(this.planCloudObj.save());
        } else {
            // 如果还没有 PlanData 对象，创建一个新的
            const PlanData = AV.Object.extend('PlanData');
            const newPlanObj = new PlanData();
            newPlanObj.set('content', planDataToSync);
            // 存入 promises 并更新 this.planCloudObj
            promises.push(newPlanObj.save().then(obj => {
                this.planCloudObj = obj;
                return obj;
            }));
        }

        Promise.all(promises).then(() => {
            if(callbacks && callbacks.onSuccess) callbacks.onSuccess();
        }).catch(err => {
            console.error('Save to cloud error:', err);
            if(callbacks && callbacks.onError) callbacks.onError(err);
        });
    },

    // 本地存储：保存
    saveToLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Local save error", e);
            alert('本地存储空间已满！请删除一些数据再试。');
        }
    },

    // 本地存储：读取
    loadFromLocal(key) {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch(e) {
                console.error("Local load error", e);
                return null;
            }
        }
        return null;
    }
};

// 暴露全局对象
window.storageManager = storageManager;

