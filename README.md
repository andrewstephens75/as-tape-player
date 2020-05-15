This is a deeply silly idea, created in 2020 where whimsical ideas were badly needed. This wraps a normal audio control in a UI that emulates the look and functionality of an old-school cassette deck. Not even a good cassette deck either - a cheap one with no auto-reverse or scrubbing.

It was designed as part of a larger, private project so is not really standalone but it requires only a single javascript call to load a tape. 

Someone, somewhere may somehow find this useful so I am releasing it with the MIT license.

## Usage

Include this in your html where convenient.
```
<script src="tapeplayer/tapeplayer.js">
```

Add the `<as-tape-player>` element anywhere you like.
```
 <as-tape-player id="tapeplayer"></as-tape-player>
 ```

Make the call to load a tape - should be done in response to a user action because some browsers block audio otherwise.
```
document.getElementById("tapeplayer).insertTape("url-to-image-of-tape.png", "url-to-audio.mp3")
```

