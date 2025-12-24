/**
 * 音效管理器 (V4.3 多风格音效版)
 * 使用 Web Audio API 生成音效，无需外部音频文件
 * 支持多种音效风格：清脆、击鼓、电子、柔和等
 * 放在 common.js 中供所有游戏复用
 */
class SoundManager {
    constructor(storageKey = 'game_sound') {
        this.audioContext = null;
        this.storageKey = storageKey;
        this.enabled = localStorage.getItem(storageKey) !== 'false'; // 默认开启
        this.lastPlayTime = {}; // 防抖：记录上次播放时间
        this.minInterval = 50; // 最小播放间隔（毫秒）
        
        // 音效风格系统
        this.styles = ['crisp', 'drum', 'electronic', 'soft', 'classic'];
        this.styleNames = {
            'crisp': '清脆',
            'drum': '击鼓',
            'electronic': '电子',
            'soft': '柔和',
            'classic': '经典'
        };
        // 从localStorage读取保存的风格，默认清脆
        this.currentStyle = localStorage.getItem(storageKey + '_style') || 'crisp';
    }

    /**
     * 切换到下一个音效风格
     * @returns {string} 新的风格名称
     */
    nextStyle() {
        const currentIndex = this.styles.indexOf(this.currentStyle);
        const nextIndex = (currentIndex + 1) % this.styles.length;
        this.currentStyle = this.styles[nextIndex];
        localStorage.setItem(this.storageKey + '_style', this.currentStyle);
        return this.styleNames[this.currentStyle];
    }

    /**
     * 获取当前风格名称
     * @returns {string} 风格名称
     */
    getCurrentStyleName() {
        return this.styleNames[this.currentStyle] || '清脆';
    }

    /**
     * 初始化音频上下文（延迟初始化，等待用户交互）
     */
    init() {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    /**
     * 启用/禁用音效
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem(this.storageKey, enabled);
    }

    /**
     * 播放音效
     * @param {string} type - 音效类型：'move', 'merge', 'spawn'
     * @param {number} value - 可选：合并时的数字值（用于调整音调）
     */
    play(type, value = 0) {
        if (!this.enabled) return;
        
        // 延迟初始化（首次用户交互时）
        if (!this.audioContext) {
            this.init();
            if (!this.audioContext) return;
        }
        
        // 防抖：避免音效过于频繁
        const now = Date.now();
        if (this.lastPlayTime[type] && (now - this.lastPlayTime[type]) < this.minInterval) {
            return;
        }
        this.lastPlayTime[type] = now;
        
        // 如果音频上下文被暂停（浏览器策略），尝试恢复
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                // 恢复后立即播放（异步）
                this.playInternal(type, value);
            }).catch(() => {});
            return; // 本次不播放，等待恢复后播放
        }
        
        this.playInternal(type, value);
    }

    /**
     * 内部播放方法
     * @private
     */
    playInternal(type, value = 0) {
        if (!this.enabled || !this.audioContext || this.audioContext.state === 'closed') return;

        try {
            const currentTime = this.audioContext.currentTime;
            const style = this.currentStyle;

            // 根据风格和类型生成音效参数
            const params = this.getSoundParams(type, value, style);
            
            if (params.waveform === 'drum') {
                // 击鼓风格：使用噪声生成器模拟鼓声
                this.playDrumSound(params, currentTime);
            } else {
                // 其他风格：使用振荡器
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = params.waveform;
                oscillator.frequency.value = params.frequency;
                
                // 应用包络（音量变化曲线）
                gainNode.gain.setValueAtTime(params.attackVolume, currentTime);
                gainNode.gain.exponentialRampToValueAtTime(params.sustainVolume, currentTime + params.attackTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + params.duration);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start(currentTime);
                oscillator.stop(currentTime + params.duration);
            }
        } catch(e) {
            console.warn('Sound playback error', e);
        }
    }

    /**
     * 获取音效参数（根据风格和类型）
     * @private
     */
    getSoundParams(type, value, style) {
        const baseParams = {
            crisp: {
                move: { waveform: 'square', frequency: 200, attackVolume: 0.12, sustainVolume: 0.05, attackTime: 0.02, duration: 0.08 },
                merge: { waveform: 'sine', frequency: 300 + (value / 2048) * 400, attackVolume: 0.18, sustainVolume: 0.08, attackTime: 0.01, duration: 0.12 },
                spawn: { waveform: 'sine', frequency: 150, attackVolume: 0.1, sustainVolume: 0.04, attackTime: 0.03, duration: 0.1 }
            },
            drum: {
                move: { waveform: 'drum', frequency: 80, attackVolume: 0.15, sustainVolume: 0.02, attackTime: 0.01, duration: 0.15 },
                merge: { waveform: 'drum', frequency: 100 + (value / 2048) * 150, attackVolume: 0.2, sustainVolume: 0.03, attackTime: 0.005, duration: 0.2 },
                spawn: { waveform: 'drum', frequency: 60, attackVolume: 0.12, sustainVolume: 0.02, attackTime: 0.01, duration: 0.12 }
            },
            electronic: {
                move: { waveform: 'sawtooth', frequency: 180, attackVolume: 0.1, sustainVolume: 0.06, attackTime: 0.01, duration: 0.1 },
                merge: { waveform: 'sawtooth', frequency: 250 + (value / 2048) * 500, attackVolume: 0.16, sustainVolume: 0.1, attackTime: 0.005, duration: 0.15 },
                spawn: { waveform: 'triangle', frequency: 120, attackVolume: 0.08, sustainVolume: 0.05, attackTime: 0.02, duration: 0.12 }
            },
            soft: {
                move: { waveform: 'sine', frequency: 120, attackVolume: 0.06, sustainVolume: 0.03, attackTime: 0.05, duration: 0.15 },
                merge: { waveform: 'sine', frequency: 180 + (value / 2048) * 200, attackVolume: 0.1, sustainVolume: 0.05, attackTime: 0.03, duration: 0.2 },
                spawn: { waveform: 'sine', frequency: 100, attackVolume: 0.05, sustainVolume: 0.03, attackTime: 0.04, duration: 0.15 }
            },
            classic: {
                move: { waveform: 'sine', frequency: 150, attackVolume: 0.1, sustainVolume: 0.04, attackTime: 0.02, duration: 0.1 },
                merge: { waveform: 'sine', frequency: 200 + (value / 2048) * 300, attackVolume: 0.15, sustainVolume: 0.06, attackTime: 0.01, duration: 0.15 },
                spawn: { waveform: 'sine', frequency: 100, attackVolume: 0.08, sustainVolume: 0.03, attackTime: 0.03, duration: 0.1 }
            }
        };

        return baseParams[style]?.[type] || baseParams.crisp[type];
    }

    /**
     * 播放击鼓音效（使用噪声生成器）
     * @private
     */
    playDrumSound(params, currentTime) {
        // 创建噪声缓冲区（模拟鼓声）
        const bufferSize = this.audioContext.sampleRate * params.duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // 生成噪声并应用包络
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const noise = (Math.random() * 2 - 1) * 0.3;
            // 应用衰减包络
            const envelope = Math.exp(-t * 15) * (1 - t / params.duration);
            data[i] = noise * envelope * params.attackVolume;
        }
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 应用频率调制（通过播放速度）
        source.playbackRate.value = params.frequency / 100;
        
        gainNode.gain.setValueAtTime(params.attackVolume, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + params.duration);
        
        source.start(currentTime);
        source.stop(currentTime + params.duration);
    }
}

