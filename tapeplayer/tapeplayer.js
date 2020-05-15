const TAPEPLAYER_TEMPLATE = `
<div class="tapeplayer">
<div class="mainarea" type="button">
    This is the main area
</div>
<button id="playbutton" class="button" type="button">
    Play
</button>
<button id="revbutton" class="button" type="button">
    Rev
</button>
<button id="ffbutton" class="button" type="button">
    FF
</button>
<button id="stopbutton" class="button" type="button">
    Stop
</button>
<button class="button" type="button">
    Eject
</button>
</div>

<audio id="tape" class="hiddenaudio" src="side-b.mp3" preload="metadata"></audio>
<audio id="playbuttonsound" class="hiddenaudio" src="tapeplayer/play.mp3" preload="auto"></audio>
<audio id="stopbuttonsound" class="hiddenaudio" src="tapeplayer/stop.mp3" preload="auto"></audio>
<audio id="ffrevbuttonsound" class="hiddenaudio" src="tapeplayer/ffrev.mp3" preload="auto"></audio>
<audio id="scrubbingsound" class="hiddenaudio" src="tapeplayer/scrubbing.wav" preload="auto" loop></audio>`

const TAPEPLAYER_CSS = `
.tapeplayer {
    display: grid;
    min-width: 100%;
    border: 1px solid black;
    grid-template: "a a a a a" 400px
                   "b c d e f" 3em;
}

.mainarea {
    grid-column: 1/5;
    grid-row: 1;
}

.tapeplayer .button {
    grid-row: 2;
    border: 1px solid black;
    text-align: center;
}

.hiddenaudio {
    display: none;
}
`

const STATE_EMPTY = 0
const STATE_STOPPED = 1
const STATE_PLAYING = 2
const STATE_FAST_FORWARDING = 3
const STATE_REWINDING = 4


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

      this.state = STATE_STOPPED
    }

    connectedCallback() {
        this.shadowRoot.getElementById("playbutton").addEventListener("click", this.playAudio.bind(this))
        this.shadowRoot.getElementById("stopbutton").addEventListener("click", this.stopAudio.bind(this))
        this.shadowRoot.getElementById("ffbutton").addEventListener("click", this.fastForwardAudio.bind(this))
        this.shadowRoot.getElementById("revbutton").addEventListener("click", this.rewindAudio.bind(this))
    }

    playAndWait(id)
    {
        let element = this.shadowRoot.getElementById(id)

        return new Promise(resolve => {
            const callback = e => {
                element.removeEventListener("ended", callback)
                resolve()
            }
            element.addEventListener("ended", callback)
            element.play()
        })
    }

    async playAudio()
    {
        if (this.state != STATE_STOPPED) return
        await this.playAndWait("playbuttonsound")
        this.shadowRoot.getElementById("tape").play()
        this.state = STATE_PLAYING
    }

    stopAudio()
    {
        if (this.state == STATE_STOPPED) return
        if (this.state == STATE_EMPTY) return

        this.shadowRoot.getElementById("stopbuttonsound").play()
        this.shadowRoot.getElementById("tape").pause()
        this.shadowRoot.getElementById("scrubbingsound").pause()
        this.state = STATE_STOPPED
    }

    async scrub(direction)
    {
        if (this.state != STATE_STOPPED) return
        await this.playAndWait("ffrevbuttonsound")
        this.state = STATE_FAST_FORWARDING

        let element = this.shadowRoot.getElementById("tape")
        let scrubbingSound = this.shadowRoot.getElementById("scrubbingsound")
        scrubbingSound.play()

        let speed = 0.5

        while (this.state == STATE_FAST_FORWARDING) {
            let timeoutPromise = new Promise(resolve => {
                setTimeout(resolve, 100)
            })

            if ((direction > 0) && ((element.duration - element.currentTime) < 0.05)) {
                element.currentTime = element.duration
                this.stopAudio()
            }

            if ((direction < 0) && (element.currentTime < 0.05)) {
                element.currentTime = 0
                this.stopAudio()
            }

            element.currentTime = Math.min(element.currentTime + (speed * direction), element.duration)
            if (speed < 6) {
                speed = speed * 1.3
            }
            scrubbingSound.currentTime = 0
            console.log(element.currentTime)

            await timeoutPromise
        }
    }

    async fastForwardAudio()
    {
        this.scrub(1)
    }

    async rewindAudio()
    {
        this.scrub(-1)
    }
}


const templateElement = document.createElement("template")
templateElement.id = "tapeplayer_id"
templateElement.innerHTML = TAPEPLAYER_TEMPLATE
document.body.appendChild(templateElement)

window.customElements.define('as-tape-player', ASTapePlayer);
