class AudioManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";

        this.source = this.ctx.createMediaElementSource(this.audio);
        this.gainNode = this.ctx.createGain();
        this.muffleFilter = this.ctx.createBiquadFilter();
        this.bassNode = this.ctx.createBiquadFilter();
        this.convolver = this.ctx.createConvolver();
        this.reverbGain = this.ctx.createGain();
        this.panner = this.ctx.createStereoPanner();

        this.source.connect(this.bassNode);
        this.bassNode.connect(this.muffleFilter);
        this.muffleFilter.connect(this.panner);
        this.panner.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);

        this.source.connect(this.convolver);
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.gainNode);

        this.muffleFilter.type = 'lowpass';
        this.muffleFilter.frequency.value = 22000;

        this.bassNode.type = 'lowshelf';
        this.bassNode.frequency.value = 60;
        this.bassNode.gain.value = 0;

        this.reverbGain.gain.value = 0;
        this.panner.pan.value = 0;

        this._createImpulse();

        this.panInterval = null;
        this.suspendTimeout = null;
        this.currentSpeedMode = 'normal';

        this.audio.addEventListener('loadedmetadata', () => this._applySpeed());
        this.audio.addEventListener('canplay', () => this._applySpeed());
        this.audio.addEventListener('play', () => this._applySpeed());
        this.audio.addEventListener('playing', () => this._applySpeed());
        this.audio.addEventListener('ratechange', () => {
            if (this.currentSpeedMode === 'slow' && this.audio.playbackRate !== 0.90) {
                this._applySpeed();
            } else if (this.currentSpeedMode === 'fast' && this.audio.playbackRate !== 1.25) {
                this._applySpeed();
            }
        });
    }

    _applySpeed() {
        this.audio.preservesPitch = false;
        this.audio.mozPreservesPitch = false;
        this.audio.webkitPreservesPitch = false;

        if (this.currentSpeedMode === 'slow') {
            this.audio.defaultPlaybackRate = 0.90;
            this.audio.playbackRate = 0.90;
        } else if (this.currentSpeedMode === 'fast') {
            this.audio.defaultPlaybackRate = 1.25;
            this.audio.playbackRate = 1.25;
        } else {
            this.audio.preservesPitch = true;
            this.audio.defaultPlaybackRate = 1.0;
            this.audio.playbackRate = 1.0;
        }
    }

    play(url) {
        if (this.suspendTimeout) {
            clearTimeout(this.suspendTimeout);
            this.suspendTimeout = null;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        if (url) {
            this.audio.src = url;
            this._applySpeed();
        }
        return this.audio.play();
    }

    pause() {
        this.audio.pause();
        if (this.suspendTimeout) clearTimeout(this.suspendTimeout);
        this.suspendTimeout = setTimeout(() => {
            if (this.audio.paused && this.ctx.state === 'running') {
                this.ctx.suspend().catch(() => {});
            }
        }, 2500);
    }

    togglePlay() {
        if (this.audio.paused) this.play();
        else this.pause();
        return !this.audio.paused;
    }

    setBass(active) {
        this.bassNode.gain.value = active ? 15 : 0;
    }

    setSpeed(mode) {
        this.currentSpeedMode = mode;
        this._applySpeed();
    }

    setSlowed(active) {
        this.setSpeed(active ? 'slow' : 'normal');
    }

    setReverb(active) {
        this.reverbGain.gain.value = active ? 1.5 : 0;
    }

    setMuffled(active) {
        this.muffleFilter.frequency.value = active ? 600 : 22000;
    }

    set8D(active) {
        if (this.panInterval) clearInterval(this.panInterval);

        if (active) {
            let panVal = 0;
            let direction = 0.01;
            this.panInterval = setInterval(() => {
                panVal += direction;
                if (panVal >= 1 || panVal <= -1) direction *= -1;
                this.panner.pan.value = Math.max(-1, Math.min(1, panVal));
            }, 20);
        } else {
            this.panner.pan.value = 0;
        }
    }

    setVolume(val) { this.gainNode.gain.value = val; }

    setLoop(active) { this.audio.loop = active; }

    setTime(percent) {
        if (this.audio.duration) {
            this.audio.currentTime = (percent / 100) * this.audio.duration;
        }
    }

    onTimeUpdate(callback) {
        this.audio.ontimeupdate = () => {
            if (this.audio.duration) {
                callback(this.audio.currentTime, this.audio.duration);
            }
        };
    }

    onEnded(callback) {
        this.audio.onended = callback;
    }

    onError(callback) {
        this.audio.onerror = callback;
    }

    get duration() { return this.audio.duration; }
    get currentTime() { return this.audio.currentTime; }
    get paused() { return this.audio.paused; }
    get isPlaying() { return !this.audio.paused; }
    get src() { return this.audio.src; }

    set currentTime(val) { this.audio.currentTime = val; }

    _createImpulse() {
        const rate = this.ctx.sampleRate;
        const length = rate * 2.0;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2.0);
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        this.convolver.buffer = impulse;
    }
}

module.exports = AudioManager;