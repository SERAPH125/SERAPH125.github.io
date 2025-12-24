// 工具函数库
// 存放日期格式化、辅助计算等通用函数

const utils = {
    // 获取本地时间字符串 (YYYY-MM-DD)，强制使用本地时间而非UTC
    getTodayStr() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 生成唯一ID (基于时间戳)
    generateId() {
        return Date.now();
    },

    // 修复历史记录ID (确保每个记录都有ID)
    fixListIds(list) {
        if (list && list.length > 0) {
            list.forEach((item, index) => {
                if (!item.id) item.id = Date.now() + index;
            });
        }
        return list;
    },

    // 获取时间问候语
    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 6) return "凌晨好！🌙";
        if (hour < 9) return "早安！☀️";
        if (hour < 12) return "上午好！☕";
        if (hour < 14) return "午安！🍱";
        if (hour < 18) return "下午好！🍵";
        if (hour < 22) return "晚上好！✨";
        return "晚安！💤";
    },

    // 获取时间图标
    getTimeIcon() {
        const hour = new Date().getHours();
        if (hour < 6) return "🌌";
        if (hour < 18) return "☀️";
        return "🌙";
    }
};

// 暴露全局对象
window.utils = utils;

