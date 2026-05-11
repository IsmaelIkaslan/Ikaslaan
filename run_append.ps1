$d = "C:\Users\ismae\Desktop\Mini juego ikaslaan\public\js\world.js"
$lines = @(
  "  _drawNPCs() { this.npcs.forEach(npc => this._drawNPC(npc)); },",
  "  _drawNPC(npc) {",
  "    const ctx = this.ctx; const flip = npc.dir === 
'
left
'
 ? -1 : 1;",
  "    const wb = npc.moving ? Math.sin(this.time * 0.2) * 2 : 0;",
  "    ctx.save(); ctx.translate(Math.floor(npc.x), Math.floor(npc.y) + wb); ctx.scale(flip, 1);",
  "    ctx.fillStyle = 
'
rgba(0,0,0,0.15)
'
; ctx.beginPath(); ctx.ellipse(0,28,10,4,0,0,Math.PI*2); ctx.fill();",
  "    const ls = npc.moving ? Math.sin(this.time * 0.25) * 5 : 0;",
  "    ctx.fillStyle = 
'
#4a3020
'
; ctx.fillRect(-6,14,5,14+ls); ctx.fillRect(1,14,5,14-ls);",
  "    ctx.fillStyle = 
'
#2a1800
'
; ctx.fillRect(-8,26+ls,7,4); ctx.fillRect(-1,26-ls,7,4);",
  "    ctx.fillStyle = npc.shirtColor || 
'
#3498db
'
; ctx.fillRect(-8,-2,16,18);",
  "    const as = npc.moving ? Math.sin(this.time * 0.25) * 6 : 0;",
  "    ctx.fillStyle = npc.shirtColor || 
'
#3498db
'
; ctx.fillRect(-14,-2+as,6,12); ctx.fillRect(8,-2-as,6,12);",
  "    ctx.fillStyle = npc.skinTone || 
'
#f4c4a0
'
;",
  "    ctx.beginPath(); ctx.ellipse(-11,10+as,3,3,0,0,Math.PI*2); ctx.fill();",
  "    ctx.beginPath(); ctx.ellipse(11,10-as,3,3,0,0,Math.PI*2); ctx.fill();",
  "    ctx.fillRect(-3,-8,6,8);",
  "    ctx.beginPath(); ctx.ellipse(0,-16,9,10,0,0,Math.PI*2); ctx.fill();",
  "    ctx.fillStyle = 
'
#333
'
;",
  "    ctx.beginPath(); ctx.ellipse(-3,-17,2,2,0,0,Math.PI*2); ctx.fill();",
  "    ctx.beginPath(); ctx.ellipse(3,-17,2,2,0,0,Math.PI*2); ctx.fill();",
  "    ctx.fillStyle = 
'
#fff
'
;",
  "    ctx.beginPath(); ctx.ellipse(-2.5,-17.5,0.8,0.8,0,0,Math.PI*2); ctx.fill();",
  "    ctx.beginPath(); ctx.ellipse(3.5,-17.5,0.8,0.8,0,0,Math.PI*2); ctx.fill();",
  "    ctx.fillStyle = 
'
#c06040
'
; ctx.fillRect(-2,-12,4,2);",
  "    if (npc.hat === 0) { ctx.fillStyle=
'
#e74c3c
'
; ctx.fillRect(-10,-26,20,6); ctx.fillRect(-8,-32,16,8); ctx.fillRect(-12,-22,6,4); }",
  "    else if (npc.hat === 1) { ctx.fillStyle=
'
#8B5e3c
'
; ctx.fillRect(-12,-26,24,5); ctx.fillRect(-7,-34,14,10); ctx.fillStyle=
'
#c8a46e
'
; ctx.fillRect(-7,-26,14,3); }",
  "    else { ctx.fillStyle=
'
#4a2800
'
; ctx.fillRect(-9,-26,18,8); ctx.fillRect(-9,-20,4,4); ctx.fillRect(5,-20,4,4); }",
  "    ctx.restore();",
  "    ctx.save(); ctx.font=
'
8px monospace
'
; ctx.textAlign=
'
center
'
;",
  "    ctx.fillStyle=
'
rgba(0,0,0,0.55)
'
; ctx.fillRect(npc.x-20,npc.y-52,40,12);",
  "    ctx.fillStyle=
'
#fff
'
; ctx.fillText(npc.name,npc.x,npc.y-43); ctx.restore();",
  "    if (npc.talking) this._drawSpeechBubble(npc.x, npc.y-60, npc.want.label);",
  "  },",
  "  _drawSpeechBubble(x, y, text) {",
  "    const ctx = this.ctx; const pad = 6;",
  "    ctx.font = 
'
9px monospace
'
; const tw = ctx.measureText(text).width;",
  "    const bw = tw + pad * 2; const bh = 18;",
  "    ctx.save();",
  "    ctx.fillStyle = 
'
rgba(255,255,255,0.92)
'
; ctx.strokeStyle = 
'
#333
'
; ctx.lineWidth = 1.5;",
  "    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x-bw/2,y-bh,bw,bh,4); else ctx.rect(x-bw/2,y-bh,bw,bh);",
  "    ctx.fill(); ctx.stroke();",
  "    ctx.fillStyle = 
'
rgba(255,255,255,0.92)
'
;",
  "    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.lineTo(x,y+8); ctx.closePath(); ctx.fill(); ctx.stroke();",
  "    ctx.fillStyle = 
'
#222
'
; ctx.textAlign = 
'
center
'
; ctx.fillText(text,x,y-5);",
  "    ctx.restore();",
  "  },",
  ""
)
Add-Content -Path $d -Value $lines -Encoding UTF8
Write-Host "NPC done, lines: $((Get-Content $d).Count)"