const TAPEPLAYER_TEMPLATE = `
<div class="tapeplayer">
<div class="mainarea" id="mainarea">
<div id="playertray">
    <img src="tapeplayer/empty.png" class="emptyplayer" id="emptyplayer"></img>
    <div id="tapecontainer">
        <img src="tapeplayer/reel.png" class="spinningreel" id="rightreel"></img>
        <img src="tapeplayer/reel.png" class="spinningreel" id="leftreel"></img>
        <img src="tapeplayer/cassette.png" class="tapebody" id="tapebody"></img>
        <img src="tapeplayer/sprocket.png" class="spinningsprocket" id="leftsprocket"></img>
        <img src="tapeplayer/sprocket.png" class="spinningsprocket" id="rightsprocket"></img>
    </div>
</div>

</div>
<div class="buttonbackground">
    <button id="playbutton" class="button" type="button">Play</button>
</div>
<div class="buttonbackground">
    <button id="revbutton" class="button" type="button">Rev</button>
</div>
<div class="buttonbackground">
    <button id="ffbutton" class="button" type="button">FF</button>
</div>
<div class="buttonbackground">
    <button id="stopbutton" class="button" type="button">Stop</button>
</div>
<div class="buttonbackground">
    <button id="ejectbutton" class="button" type="button">Eject</button>
</div>
</div>

<audio id="tape" class="hiddenaudio" src="" controls preload="metadata"></audio>`

const TAPEPLAYER_CSS = `
.tapeplayer {
    display: grid;
    min-width: 100%;
    grid-template: "a a a a a" 
                   "b c d e f" 3em;
}

.mainarea {
    grid-column: 1/6;
    grid-row: 1;
    z-index: -50;
}

#playertray {
    position: relative;
    margin: 0;
    border: none;
    padding: 0;
    width: 100%;
}

.emptyplayer {
    display: block;
    position: absolute;
    width: 100%;
    top: 0%;
    left: 0%;
    z-index: -30;
}

#tapecontainer {
    position: relative;
    margin: 0;
    border: none;
    padding: 0;
    width: 100%;
    top: 0%;
    left: 0%;
}   



.tapebody {
    display: block;
    width: 100%;
}

#leftsprocket {
    top: 35%;
    left: 25%; 
    width: 13%;
}

#rightsprocket {
    top: 35%;
    width: 13%;
    left: 62%;
}

#leftreel {
    top: 13.8%;
    left: 11.1%;
    width: 40%;
    clip-path: circle(50%)
}

#rightreel {
    top: 13.8%;
    left: 48.5%;
    width: 40%;
    clip-path:circle(27.5%)
}

.spinningreel {
    display: block;
    position: absolute;
    z-index: -10;
    animation-play-state: paused;
    animation-name: spinClockwise;
    animation-direction: normal;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
}

.spinningsprocket {
    display: block;
    position: absolute;
    z-index: 10;
    animation-play-state: paused;
    animation-name: spinClockwise;
    animation-direction: normal;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
}


.buttonbackground {
    border: none;
    margin: 0px;
    padding: 0px;
    grid-row: 2;
    background: grey;

}

.tapeplayer .button {
    border: 1px solid black;
    text-align: center;
    width: 100%;
    height: 100%;
    text-color: black;
}

.tapeplayer .button:disabled {
    text-color: darkgrey;
}

.toggled {
    transform-origin: 50% 0%;
    transform: rotate3d(1, 0, 0, 30deg);
}

.hiddenaudio {
    display: none;
}

@keyframes spinClockwise {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(359deg);
    }
  }
}
`

const STATE_EMPTY = 0
const STATE_STOPPED = 1
const STATE_PLAYING = 2
const STATE_SCRUBBING_FORWARD = 3
const STATE_SCRUBBING_BACK = 4

class ASTapePlayer extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({mode : 'open'});
      
      let template = document.getElementById("tapeplayer_id")
      let clonedTemplate = template.content.cloneNode(true)
      
      const style = document.createElement('style');
      style.innerHTML = TAPEPLAYER_CSS
      shadow.appendChild(style)
      shadow.appendChild(clonedTemplate) 

      this.state = STATE_EMPTY
    }

    connectedCallback() {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.shadowRoot.getElementById("playbutton").addEventListener("click", this.playAudio.bind(this))
        this.shadowRoot.getElementById("stopbutton").addEventListener("click", this.stopAudio.bind(this))
        this.shadowRoot.getElementById("ffbutton").addEventListener("click", this.fastForwardAudio.bind(this))
        this.shadowRoot.getElementById("revbutton").addEventListener("click", this.rewindAudio.bind(this))
        this.shadowRoot.getElementById("ejectbutton").addEventListener("click", this.ejectTape.bind(this))

        this.tapeElement = this.shadowRoot.getElementById("tape")
        this.tapeElement.addEventListener("timeupdate", (() => {this.setReelRatio(this.tapeElement.currentTime / this.tapeElement.duration)}).bind(this))
        // we never want the tape to actually end, since we are pretending it is a tape - stop just before it ends
        this.tapeElement.addEventListener("ended", (() => {this.stopAudio(); this.tapeElement.currentTime = this.tapeElement.duration - 0.05;}).bind(this))

        this.loadSounds()
        this.initialPlay = false
        if (this.tapeAudioSource == undefined) {
            this.tapeAudioSource = this.audioContext.createMediaElementSource(this.tapeElement)
            var gainNode = this.audioContext.createGain()
            this.tapeAudioSource.connect(gainNode)
            gainNode.connect(this.audioContext.destination)
        }

        this.setToggleButtons()
    }

    static get observedAttributes() { return [] }

    attributeChangedCallback(name, oldValue, newValue) {

      }

    async loadSounds() {
        const sounds = ["tapeplayer/play.mp3", "tapeplayer/stop.mp3", "tapeplayer/ffrev.mp3", "tapeplayer/scrubbing.wav"]
        let promises = []
        sounds.forEach((e => {
            promises.push(this.getAudioBuffer(e))
        }).bind(this))

        Promise.all(promises).then(((values) => {
            this.playAudioBuffer = values[0]
            this.stopAudioBuffer = values[1]
            this.ffrevAudioBuffer = values[2]
            this.scrubbingAudioBuffer = values[3]
        }).bind(this))
    }

    async resumeAudio() {
        return this.audioContext.resume()
    }

    playAudioFromBufferAndWait(buffer)
    {
        if (buffer == undefined) {
            buffer = new AudioBuffer()
        }
        let audioBufferSourceNode = this.audioContext.createBufferSource()
        audioBufferSourceNode.buffer = buffer
        audioBufferSourceNode.connect(this.audioContext.destination)

        return new Promise(resolve => {
            const callback = e => {
                audioBufferSourceNode.removeEventListener("ended", callback)
                audioBufferSourceNode.disconnect()
                resolve()
            }
            audioBufferSourceNode.addEventListener("ended", callback)
            audioBufferSourceNode.start()
        })
    }

    async playAudio()
    {
        if (this.state != STATE_STOPPED) return
        this.state = STATE_PLAYING
        this.setToggleButtons()
        this.animateReels(1)

        await this.resumeAudio();

        await this.playAudioFromBufferAndWait(this.playAudioBuffer)
        this.initialPlay = true
        this.tapeElement.play()
    }

    async decodeAudioBuffer(buffer)
    {
        // Safari doesn't support the promise-based decodeAudioData call but it is easy to emulate
        return new Promise((resolve, reject) => {
            this.audioContext.decodeAudioData(buffer, resolve, reject)
        })
    }

    async getAudioBuffer(audioFile)
    {
        let response = await fetch(audioFile)
        if (response.ok) {
            let buffer = await response.arrayBuffer()
            let decodedAudioBuffer = await this.decodeAudioBuffer(buffer)
            return decodedAudioBuffer
        }

        return new AudioBuffer()
    }

    setToggleButtons()
    {
        let buttonElementIds = ["playbutton", "revbutton", "ffbutton", "stopbutton", "ejectbutton"]
        if (this.state == STATE_EMPTY) {
            this.shadowRoot.getElementById("tapecontainer").style.visibility = "hidden"
            buttonElementIds.forEach((e => {this.shadowRoot.getElementById(e).disabled = true}).bind(this))
        } else {
            this.shadowRoot.getElementById("tapecontainer").style.visibility = "visible"
            let buttonDown = [(this.state == STATE_PLAYING), (this.state == STATE_SCRUBBING_BACK), (this.state == STATE_SCRUBBING_FORWARD), false, false]
            let buttonEnabled = [(this.state == STATE_STOPPED), (this.state == STATE_STOPPED), (this.state == STATE_STOPPED), true, true]

            for (let i = 0; i < 5; ++i) {
                let element = this.shadowRoot.getElementById(buttonElementIds[i])
                if (buttonDown[i]) {
                    element.classList.add("toggled")
                } else {
                    element.classList.remove("toggled")
                }
                element.disabled = !buttonEnabled[i]
            }
        }
    }

    stopAudio()
    {
        if (this.state == STATE_STOPPED) return

        this.playAudioFromBufferAndWait(this.stopAudioBuffer)
        this.tapeElement.pause()
        this.animateReels(0.0)
        this.state = STATE_STOPPED

        let element = this.shadowRoot.getElementById("stopbutton")
        element.classList.add("toggled")
        setTimeout(()=>{element.classList.remove("toggled")}, 100)

        this.setToggleButtons()
    }

    ejectTape()
    {
        this.stopAudio()
        this.state = STATE_EMPTY
        this.tapeElement.src=""

        this.setToggleButtons()
        this.dispatchEvent(new Event("eject"))
    }

    insertTape(image, audio)
    {
        this.stopAudio()
        this.tapeElement.src=audio
        this.shadowRoot.getElementById("tapebody").src=image

        this.tapeElement.play();
        this.tapeElement.pause();

        this.state = STATE_STOPPED
        this.setToggleButtons()

    }

    async scrub(direction)
    {
        if (this.state != STATE_STOPPED) return

        this.state = (direction > 0)?STATE_SCRUBBING_FORWARD:STATE_SCRUBBING_BACK
        this.setToggleButtons()

        await this.playAudioFromBufferAndWait(this.ffrevAudioBuffer)

        let element = this.tapeElement

        if (this.scrubbingAudioBuffer == undefined) {
            this.scrubbingAudioBuffer = new AudioBuffer()
        }
        let scrubbingSourceNode = this.audioContext.createBufferSource()
        scrubbingSourceNode.buffer = this.scrubbingAudioBuffer
        scrubbingSourceNode.connect(this.audioContext.destination)
        scrubbingSourceNode.loop = true
        scrubbingSourceNode.start()

        let speed = 8 * direction

        let startTime = 0
        let currentTime = element.currentTime
        let endTime = element.duration
        console.log(currentTime, " --", endTime )

        while ((this.state == STATE_SCRUBBING_FORWARD) || (this.state == STATE_SCRUBBING_BACK)) {
            if ((direction > 0) && ((endTime - currentTime) < 0.05)) {
                currentTime = endTime - 0.5
                this.stopAudio()
                break
            }

            if ((direction < 0) && (currentTime < 0.05)) {
                currentTime = 0
                this.stopAudio()
                break
            }

            currentTime = Math.min(currentTime + speed, endTime)
            currentTime = Math.max(currentTime, 0)

            this.animateReels(speed)
            this.setReelRatio(currentTime / endTime)
            let timeoutPromise = new Promise(resolve => {
                setTimeout(resolve, 100)
            })
            await timeoutPromise
        }
        element.currentTime = currentTime
        console.log("currentTime = " + element.currentTime)
        scrubbingSourceNode.stop()
        scrubbingSourceNode.disconnect()
        this.tapeElement.play()
        this.tapeElement.pause()
    }

    animateReels(speed)
    {
        let elements = [this.shadowRoot.getElementById("leftsprocket"), 
                        this.shadowRoot.getElementById("rightsprocket"),
                        this.shadowRoot.getElementById("leftreel"),
                        this.shadowRoot.getElementById("rightreel")
                    ]

        if (Math.abs(speed) > 0.01) {
            let reelSpeed = Math.max(1, 6 / Math.abs(speed))
            let direction = (speed > 0)?"reverse":"normal"
            elements.forEach(e => {
                if (e.style.animationDirection !== direction) {
                    e.style.animationDirection = direction
                } 
                e.style.animationDuration = reelSpeed.toString() + "s"
                e.style.animationPlayState = "running"
            })
        } else {
            elements.forEach(e => {
                e.style.animationPlayState = "paused"
            })
        }
    }

    setReelRatio(r)
    {
        if (this.lastReelRatio == undefined) {
            this.lastReelRatio = 0
        }
        let now = Date.now()

        if ((now - this.lastReelRatio) < 100) {
            return
        }

        this.lastReelRatio = now

        let smallest = 27.5
        let largest = 50
        let distance = 50 - 27.5
        this.shadowRoot.getElementById("leftreel").style.clipPath = "circle(" + (largest - distance * r) + "%)"
        this.shadowRoot.getElementById("rightreel").style.clipPath = "circle(" + (smallest + distance * r) + "%)"
    }

    async fastForwardAudio()
    {
        this.scrub(1)
    }

    async rewindAudio()
    {
        this.scrub(-1)
    }

    isEmpty()
    {
        return (this.state == STATE_EMPTY)
    }
}


const templateElement = document.createElement("template")
templateElement.id = "tapeplayer_id"
templateElement.innerHTML = TAPEPLAYER_TEMPLATE
document.body.appendChild(templateElement)

window.customElements.define('as-tape-player', ASTapePlayer);
