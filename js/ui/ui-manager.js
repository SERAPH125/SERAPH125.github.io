// UI管理逻辑
// 负责弹窗、Toast、樱花特效等通用 UI 组件

const uiManager = {
    // 显示提示
    showToast(msg) {
        alert(msg);
    },

    // 樱花特效循环
    startSakuraLoop(score) {
        const loop = () => {
            let delay = 300;
            if (score < 0) {
                delay = 300 + Math.abs(score) * 5; 
            }
            if (score > -1000) {
                this.createPetal();
                setTimeout(loop, delay);
            } else {
                setTimeout(loop, 2000);
            }
        };
        loop();
    },

    // 樱花特效函数
    createPetal() {
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
    },

    // 检测iOS并提示添加主屏幕
    checkIOSInstall() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone === true;

        if (isIOS && !isStandalone) {
            setTimeout(() => {
                const guide = document.getElementById('ios-install-guide');
                if (guide) guide.style.display = 'block';
            }, 2000);
        }
    },
    
    // 生成动态桌面图标
    generateIcon() {
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
    }
};

// 暴露全局对象
window.uiManager = uiManager;

