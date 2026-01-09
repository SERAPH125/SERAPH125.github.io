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
            
            // 尝试获取云端数据
            const query = new AV.Query('LoveData');
            query.first().then((data) => {
                if (data) {
                    this.cloudObj = data;
                    callbacks.onCloudDataLoaded(data.get('content'));
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

        // 复制数据并排除相册 (相册独立存储)
        const dataToSync = JSON.parse(JSON.stringify(data));
        delete dataToSync.album;

        this.cloudObj.set('content', dataToSync);
        this.cloudObj.save().then(() => {
            if(callbacks && callbacks.onSuccess) callbacks.onSuccess();
        }).catch(err => {
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

