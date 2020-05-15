function loadTape()
{
    const library = {"mixtape" : {"a" : {"tape-image" : "mixtape-sidea.png", "tape-audio" : "side-a.mp3"},
                                  "b" : {"tape-image" : "mixtape-sideb.png", "tape-audio" : "side-b.mp3"}}}
    let tape = document.getElementById("tapeselect").selectedOptions[0].value
    let side = document.getElementById("sideselect").selectedOptions[0].value

    let tp = document.getElementById("tapeplayer")
    let a = library[tape][side]

    tp.insertTape(a["tape-image"], a["tape-audio"])
}


document.getElementById("insert").addEventListener("click", loadTape);
