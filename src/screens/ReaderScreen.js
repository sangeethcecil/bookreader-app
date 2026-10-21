import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, Modal, Pressable, Platform, Image, Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PAGE_COLORS = [
  { bg: '#fffdf7', color: '#2c2c2a' },
  { bg: '#ffffff', color: '#111111' },
  { bg: '#f4ecd8', color: '#3d2b1f' },
  { bg: '#1c1c1e', color: '#e0e0e0' },
  { bg: '#0d2137', color: '#c8d8e8' },
];

const EPUB_VIEWER_HTML = "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nhtml,body{width:100%;height:100%;background:#1a1a1a;overflow:hidden}\n#wrap{display:flex;flex-direction:column;height:100vh}\n#viewer{flex:1;overflow:hidden;display:flex;flex-direction:row;background:#1a1a1a}\n#epubArea{flex:1;overflow:auto;position:relative}#epubArea::-webkit-scrollbar{width:8px;height:8px}#epubArea::-webkit-scrollbar-track{background:transparent}#epubArea::-webkit-scrollbar-thumb{background:transparent;border-radius:4px}#epubArea:hover::-webkit-scrollbar-thumb{background:#2d3748}\n#loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#a0aec0;font-family:sans-serif;text-align:center;z-index:5}\n#chapPanel{display:none;width:240px;min-width:240px;background:#0f0f1a;overflow-y:auto;padding:0;border-right:1px solid #2d3748;flex-shrink:0}\n#chapPanel::-webkit-scrollbar{width:6px}\n#chapPanel::-webkit-scrollbar-track{background:#0f0f1a}\n#chapPanel::-webkit-scrollbar-thumb{background:#2d3748;border-radius:3px}\n#settingsPanel{display:none;width:280px;background:#0f0f1a;border:1px solid #2d3748;border-radius:8px;overflow-y:auto;position:absolute;top:44px;right:4px;max-height:70%;z-index:30;box-shadow:0 4px 20px rgba(0,0,0,0.5);padding:0}\n#settingsPanel::-webkit-scrollbar{width:6px}\n#settingsPanel::-webkit-scrollbar-track{background:#0f0f1a}\n#settingsPanel::-webkit-scrollbar-thumb{background:#2d3748;border-radius:3px}\n#searchPanel{display:none;position:absolute;top:0;left:0;right:0;background:#0f0f1a;z-index:20;padding:12px;max-height:45%;overflow-y:auto;border-bottom:1px solid #2d3748}\n#gridView{display:none;position:absolute;inset:0;background:#1a1a1a;z-index:50;padding:12px;overflow-y:auto}\n#gridGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}\n.gpage{display:flex;flex-direction:column}\n.ghead{font-size:9px;font-weight:700;opacity:0.65;margin-bottom:4px;font-family:sans-serif;flex-shrink:0}\n.gbody{font-size:8px;line-height:1.35;overflow:hidden;font-family:sans-serif;opacity:0.85;flex:1}\n.gpage{border-radius:4px;padding:8px;cursor:pointer;border:2px solid transparent;aspect-ratio:0.7;overflow:hidden;position:relative;font-size:7px;line-height:1.4}\n.gpage:hover{border-color:#63b3ed}\n.gcur{border-color:#48bb78}\n.gpnum{position:absolute;bottom:3px;right:5px;font-size:7px;color:#aaa}\n#bottom{position:absolute;left:0;right:0;bottom:0;background:#0f0f1a;border-top:1px solid #2d3748;padding:14px 20px;font-family:sans-serif;height:72px;z-index:40;transition:opacity .4s ease,transform .4s ease}\n#bottom.br-hidden{opacity:0;transform:translateY(100%);pointer-events:none}\n#progRow{display:flex;align-items:center;gap:10px;margin-bottom:7px}\n#progTrack{flex:1;height:3px;background:#2d3748;border-radius:2px;cursor:pointer}\n#progFill{height:3px;background:#63b3ed;border-radius:2px;width:0%;transition:width 0.3s}\n#progText{font-size:15px;color:#a0aec0;min-width:160px;text-align:right}\n#navRow{display:flex;align-items:center;gap:12px;justify-content:center}\n.nbtn{background:#2b6cb0;border:1px solid #2d3748;border-radius:10px;padding:14px 40px;cursor:pointer;font-size:20px;color:#fff;font-family:sans-serif;font-weight:700;min-width:120px;text-align:center}\n.nbtn:hover{background:#2d3748}\n#playBtn{background:#2b6cb0;color:#fff;border:none;border-radius:50%;width:54px;height:54px;cursor:pointer;font-size:20px;font-family:sans-serif;font-weight:700}\n#speedRow{display:none;align-items:center;gap:6px;font-size:11px;color:#718096}\n#speedRow input{width:70px;accent-color:#63b3ed}\n.panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px;background:#0f0f1a;border-bottom:1px solid #2d3748;position:sticky;top:0;z-index:1}\n.panel-title{font-size:13px;font-weight:500;color:#e2e8f0;font-family:sans-serif}\n.panel-close{background:none;border:none;cursor:pointer;color:#718096;font-size:16px;font-family:sans-serif;padding:2px 6px}\n.panel-close:hover{color:#e2e8f0}\n.chapItem{padding:10px 12px;cursor:pointer;font-size:12px;color:#a0aec0;border-bottom:1px solid #1e2035;font-family:sans-serif}\n.chapItem:hover{background:#1e2035;color:#e2e8f0}\n.chapItem.active{background:#1a365d;color:#63b3ed}\n.sitem{padding:11px 12px;cursor:pointer;font-size:15px;color:#e6edf5;border:1px solid #3a4761;border-radius:6px;margin-bottom:7px;line-height:1.55;font-family:sans-serif;background:#151a29}\n.sitem:hover{border-color:#63b3ed;color:#e2e8f0}\n.smeta{font-size:12px;color:#8fa2bd;margin-bottom:4px;font-weight:600}\n.shl{background:rgba(255,214,0,0.45);color:#fff;font-weight:700;text-decoration:none;border-radius:2px;padding:0 1px}\n.set-section{padding:12px}\n.set-label{font-size:11px;color:#718096;font-family:sans-serif;margin-bottom:8px;margin-top:12px;text-transform:uppercase}\n.font-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:4px}\n.fpreset{padding:6px 8px;border-radius:6px;border:1px solid #2d3748;background:#1e2035;cursor:pointer;font-size:11px;color:#a0aec0;text-align:center;font-family:sans-serif}\n.fpreset:hover,.fpreset.on{border-color:#63b3ed;background:#1a365d;color:#63b3ed}\n.set-row{display:flex;align-items:center;gap:8px;margin-bottom:10px}\n.set-adj{background:#1e2035;border:1px solid #2d3748;border-radius:4px;color:#e2e8f0;cursor:pointer;font-size:16px;width:28px;height:28px;text-align:center;line-height:26px;font-family:sans-serif}\n.set-adj:hover{background:#2d3748}\n.set-val{font-size:12px;color:#e2e8f0;min-width:42px;text-align:center;font-family:sans-serif}\n.set-row-label{font-size:12px;color:#718096;font-family:sans-serif;min-width:75px}\n.color-row{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0}\n.cdot{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent}\n.cdot:hover,.cdot.on{border-color:#63b3ed}\nbody.light{background:#f5f5f5}\nbody.light #viewer,body.light #epubArea{background:#f5f5f5}\nbody.light #chapPanel,body.light #settingsPanel,body.light #searchPanel{background:#ffffff;border-color:#e2e8f0}\nbody.light #gridView{background:#f5f5f5}\nbody.light #bottom{background:#ffffff;border-top-color:#e2e8f0}\nbody.light #progTrack{background:#e2e8f0}\nbody.light #progText{color:#4a5568}\nbody.light .nbtn{background:#f1f5f9;border-color:#cbd5e0;color:#1a202c}\nbody.light .nbtn:hover{background:#e2e8f0}\nbody.light .panel-head{background:#ffffff;border-bottom-color:#e2e8f0}\nbody.light .panel-title{color:#1a202c}\nbody.light .panel-close{color:#718096}\nbody.light .chapItem{color:#4a5568;border-bottom-color:#edf2f7}\nbody.light .chapItem:hover{background:#edf2f7;color:#1a202c}\nbody.light .chapItem.active{background:#ebf8ff;color:#2b6cb0}\nbody.light .sitem{color:#2d3748;border-color:#e2e8f0;background:#ffffff}\nbody.light .sitem:hover{border-color:#2b6cb0;color:#1a202c}\nbody.light .smeta{color:#718096}\nbody.light .set-label{color:#718096}\nbody.light .set-row-label{color:#4a5568}\nbody.light .set-val{color:#1a202c}\nbody.light .fpreset{background:#f7fafc;border-color:#e2e8f0;color:#4a5568}\nbody.light .fpreset:hover,body.light .fpreset.on{background:#ebf8ff;border-color:#2b6cb0;color:#2b6cb0}\nbody.light .set-adj{background:#f7fafc;border-color:#e2e8f0;color:#1a202c}\nbody.light .set-adj:hover{background:#e2e8f0}\n.edgeNav{position:fixed;top:50%;transform:translateY(-50%);width:66px;height:150px;border:none;background:rgba(15,15,26,.5);color:#e2e8f0;font-size:46px;line-height:1;cursor:pointer;z-index:55;border-radius:10px;opacity:.7;transition:opacity .4s ease}\n.edgeNav.br-hidden{opacity:0 !important;pointer-events:none !important}\n.edgeNav.br-active{background:rgba(43,108,176,.95) !important;opacity:1 !important;color:#fff !important}\n.edgeNav:hover{opacity:1;background:rgba(43,108,176,.85)}\nbody.light .edgeNav{background:rgba(255,255,255,.75);color:#1a202c}\nbody.light .edgeNav:hover{background:rgba(43,108,176,.9);color:#fff}\nbody.light .gpage{color:#1a202c}\nbody.light #backTextWrap{background:rgba(255,255,255,.92);border-color:#cbd5e0}\nbody.light #backTextBtn{color:#1a73e8}\nbody.light #loading{color:#4a5568}\n</style>\n</head>\n<body>\n<div id=\"wrap\">\n<button id=\"navPrev\" class=\"edgeNav\" style=\"left:6px\" title=\"Previous page\">&#8249;</button>\n<button id=\"navNext\" class=\"edgeNav\" style=\"right:6px\" title=\"Next page\">&#8250;</button>\n<div id=\"backTextWrap\" style=\"display:none;position:fixed;top:12px;right:16px;z-index:60;align-items:center;gap:10px;background:rgba(20,24,36,.88);border:1px solid #3a4761;border-radius:8px;padding:7px 12px;box-shadow:0 3px 12px rgba(0,0,0,.45)\">\n  <span id=\"backTextBtn\" style=\"color:#6cb2ff;text-decoration:underline;font:13px sans-serif;cursor:pointer\">&#8617; Back to text</span>\n  <span id=\"backTextClose\" title=\"Dismiss\" style=\"color:#8fa2bd;font:14px sans-serif;cursor:pointer;line-height:1\">&#10005;</span>\n</div>\n  <div id=\"viewer\">\n    <div id=\"chapPanel\"></div>\n    <div id=\"epubArea\">\n      <div id=\"loading\">Loading book...<br><small style=\"color:#4a5568;font-size:11px;margin-top:8px;display:block\">Please wait</small></div>\n      <div id=\"searchPanel\"></div>\n    </div>\n    <div id=\"settingsPanel\">\n      <div class=\"panel-head\">\n        <span class=\"panel-title\">Reading settings</span>\n        <button class=\"panel-close\" onclick=\"hideSettings()\">X</button>\n      </div>\n      <div class=\"set-section\">\n        <div class=\"set-label\">Font style</div>\n        <div class=\"font-grid\" id=\"fontGrid\"></div>\n        <div class=\"set-label\">Font size</div>\n        <div class=\"set-row\">\n          <button class=\"set-adj\" onclick=\"changeSize(-1)\">-</button>\n          <span class=\"set-val\" id=\"sizeVal\">15px</span>\n          <button class=\"set-adj\" onclick=\"changeSize(1)\">+</button>\n        </div>\n        <div class=\"set-label\">Line spacing</div>\n        <div class=\"set-row\">\n          <button class=\"set-adj\" onclick=\"changeLH(-0.1)\">-</button>\n          <span class=\"set-val\" id=\"lhVal\">1.8</span>\n          <button class=\"set-adj\" onclick=\"changeLH(0.1)\">+</button>\n        </div>\n        <div class=\"set-label\">Brightness</div>\n        <div class=\"set-row\">\n          <button class=\"set-adj\" onclick=\"changeBright(-5)\">-</button>\n          <span class=\"set-val\" id=\"brightVal\">97%</span>\n          <button class=\"set-adj\" onclick=\"changeBright(5)\">+</button>\n        </div>\n        <div class=\"set-label\">Page color</div>\n        <div class=\"color-row\" id=\"colorRow\"></div>\n      </div>\n    </div>\n  </div>\n  <div id=\"bottom\">\n    <div id=\"progRow\">\n      <div id=\"progTrack\"><div id=\"progFill\"></div></div>\n      <span id=\"progText\">Loading...</span>\n      <span id=\"buildTag\" style=\"font-size:11px;color:#718096;margin-left:10px\">v51</span>\n    </div>\n    <div id=\"navRow\">\n      <button class=\"nbtn\" id=\"prevBtn\">Prev</button>\n      <button id=\"playBtn\">Play</button>\n      <div id=\"speedRow\">Speed: <input type=\"range\" min=\"0.5\" max=\"2\" step=\"0.25\" value=\"1\" id=\"speedSlider\"><span id=\"speedVal\">1x</span></div>\n      <button class=\"nbtn\" id=\"nextBtn\">Next</button>\n      <div id=\"zoomRow\" style=\"display:none;align-items:center;gap:6px;margin-left:10px\">\n        <button class=\"nbtn\" id=\"zoomOut\" style=\"padding:8px 16px;font-size:18px;min-width:0\">&#8722;</button>\n        <span id=\"zoomVal\" style=\"font-size:14px;color:#cbd5e0;min-width:52px;text-align:center\">100%</span>\n        <button class=\"nbtn\" id=\"zoomIn\" style=\"padding:8px 16px;font-size:18px;min-width:0\">+</button>\n      </div>\n    </div>\n  </div>\n</div>\n<script>\nvar BOOK_URL = '{{BOOK_URL}}';\nvar CFG = {font:'{{FONT}}',size:{{SIZE}},lineHeight:{{LH}},brightness:{{BRIGHT}},bg:'{{BG}}',color:'{{COLOR}}'};\nvar book, rendition, toc=[], locations=[], curPct=0, ttsOn=false, ttsSpeed=1, viewMode=0, lastSearchCfi=null;\n\nvar FONTS=[{l:'Georgia',v:'Georgia'},{l:'Serif',v:'serif'},{l:'Sans',v:'sans-serif'},{l:'Mono',v:'monospace'},{l:'Palatino',v:'Palatino'},{l:'Garamond',v:'Garamond'},{l:'Verdana',v:'Verdana'},{l:'Arial',v:'Arial'},{l:'Times',v:'Times New Roman'},{l:'Courier',v:'Courier New'}];\nvar COLORS=[{bg:'#fffdf7',c:'#2c2c2a'},{bg:'#ffffff',c:'#111111'},{bg:'#f4ecd8',c:'#3d2b1f'},{bg:'#1c1c1e',c:'#e0e0e0'},{bg:'#0d2137',c:'#c8d8e8'}];\nvar NOTE_COLORS=[{fill:'#ffd54f','fill-opacity':'0.40'},{fill:'#81c784','fill-opacity':'0.45'},{fill:'#64b5f6','fill-opacity':'0.45'},{fill:'#f06292','fill-opacity':'0.40'},{fill:'#ba68c8','fill-opacity':'0.40'},{fill:'#4dd0e1','fill-opacity':'0.45'}];\nvar noteColorIdx=0;\n\n// ── Per-book format profile, detected from the OPF package ──\nvar fxlZoom=1;\nvar BOOK_PROFILE={layout:'reflowable',fxl:false,spread:'auto',orientation:'auto',flow:'auto',tocSource:'none',overlays:false,encrypted:false,viewport:null};\nfunction setZoom(z){\n  fxlZoom=Math.max(0.5,Math.min(3,Math.round(z*20)/20));\n  var el=document.getElementById('zoomVal');if(el)el.textContent=Math.round(fxlZoom*100)+'%';\n  applyTheme(CFG);\n}\n// ── Cross-reference history ──\n// Following a footnote/cross-reference jumps you away from where you were\n// reading. The stack remembers every jump so you can snap back.\nvar navStack=[];\nvar __flashPrev=null,__flashNext=null;\nfunction flashNav(which){\n  try{\n    var el=document.getElementById(which==='next'?'navNext':'navPrev');\n    if(!el)return;\n    el.classList.add('br-active');\n    if(which==='next'){clearTimeout(__flashNext);__flashNext=setTimeout(function(){el.classList.remove('br-active');},320);}\n    else{clearTimeout(__flashPrev);__flashPrev=setTimeout(function(){el.classList.remove('br-active');},320);}\n  }catch(e){}\n}\nfunction updateBackBtn(){\n  try{\n    var w=document.getElementById('backTextWrap');\n    var b=document.getElementById('backTextBtn');\n    if(!w||!b)return;\n    w.style.display=navStack.length?'flex':'none';\n    b.textContent='\\u21a9 Back to text'+(navStack.length>1?(' ('+navStack.length+')'):'');\n  }catch(e){}\n}\nfunction dismissBackText(){ navStack=[]; updateBackBtn(); }\nfunction pushNav(){\n  try{\n    if(!rendition)return;\n    var cur=rendition.currentLocation();\n    if(cur&&cur.start&&cur.start.cfi){\n      navStack.push(cur.start.cfi);\n      if(navStack.length>30)navStack.shift();\n    }\n  }catch(e){}\n  updateBackBtn();\n}\nfunction popNav(){\n  if(!navStack.length)return;\n  var cfi=navStack.pop();\n  try{rendition.display(cfi);}catch(e){}\n  updateBackBtn();\n}\nfunction allSpineHrefs(){\n  var out=[];\n  try{\n    var si=book.spine.spineItems;\n    if(si&&si.length){for(var i=0;i<si.length;i++){if(si[i]&&si[i].href)out.push(si[i].href);}}\n  }catch(e){}\n  if(!out.length){try{book.spine.each(function(s){if(s&&s.href)out.push(s.href);});}catch(e){}}\n  if(!out.length){try{var it=book.spine.items;if(it&&it.length){for(var j=0;j<it.length;j++){if(it[j]&&it[j].href)out.push(it[j].href);}}}catch(e){}}\n  return out;\n}\n// Turn whatever the book wrote (a bare \"2.htm\", a path, or \"#anchor\") into real\n// spine sections. epub.js's own lookup is the authority: if spine.get() can't\n// find it, display() cannot navigate there — so we only ever pass it targets it\n// can actually resolve, and we carry the spine INDEX as a second way in.\nfunction resolveTargets(raw){\n  var src=raw||'';\n  var hash='',base='';\n  var hi=src.indexOf('#');\n  if(hi>=0){base=src.slice(0,hi);hash=src.slice(hi);}else{base=src;}\n  var curHref='';\n  try{var cur=rendition.currentLocation();if(cur&&cur.start&&cur.start.href)curHref=cur.start.href;}catch(e){}\n  var fn=(base.match(/([^\\/\\\\]+)$/)||[])[1]||'';\n  var cands=[];\n  if(!base){\n    if(curHref)cands.push(curHref.split('#')[0]+hash);\n  }else{\n    cands.push(base+hash);\n    var sp=allSpineHrefs();\n    for(var i=0;i<sp.length;i++){\n      if(sp[i]===base)cands.unshift(sp[i]+hash);\n      else if(fn&&sp[i].slice(-fn.length)===fn)cands.push(sp[i]+hash);\n    }\n    if(curHref&&fn)cands.push(curHref.replace(/[^\\/]*$/,'')+fn+hash);\n  }\n  var seenCand={},seenOut={},out=[];\n  for(var q=0;q<cands.length;q++){\n    var cand=cands[q];\n    if(!cand||seenCand[cand])continue;\n    seenCand[cand]=1;\n    var file=cand.split('#')[0];\n    var frag=cand.slice(file.length);\n    var sec=null;\n    try{sec=book.spine.get(cand)||book.spine.get(file);}catch(e){}\n    if(sec){\n      var real=(sec.href||file)+frag;\n      // NOTE: dedup the OUTPUT separately from the candidates — using one set\n      // for both silently discarded every result.\n      if(!seenOut[real]){seenOut[real]=1;out.push({href:real,index:(typeof sec.index==='number'?sec.index:-1)});}\n    }\n  }\n  return out;\n}\nfunction navigateToTargets(targets){\n  if(!targets||!targets.length){\n    try{console.warn('[reader] link target not found in spine');}catch(e){}\n    toast('Could not open that link');\n    return;\n  }\n  function attempt(i){\n    if(i>=targets.length){\n      try{console.warn('[reader] link could not be displayed:',targets);}catch(e){}\n      toast('Could not open that link');\n      return;\n    }\n    var t=targets[i];\n    var before='';\n    try{before=rendition.currentLocation().start.href;}catch(e){}\n    var pr=null;\n    try{pr=t.href?rendition.display(t.href):null;}catch(e){pr=null;}\n    function verify(){\n      var now='';\n      try{now=rendition.currentLocation().start.href;}catch(e){}\n      if(t.href&&now&&now.split('#')[0]===t.href.split('#')[0])return;   // it moved: done\n      // href didn't take us there — fall back to the spine index, which is a\n      // completely different code path inside epub.js\n      if(t.index>=0){try{rendition.display(t.index);return;}catch(e){}}\n      attempt(i+1);\n    }\n    if(pr&&typeof pr.then==='function'){pr.then(function(){setTimeout(verify,400);}).catch(function(){attempt(i+1);});}\n    else{setTimeout(verify,400);}\n  }\n  attempt(0);\n}\n// Direct entry point for the content frame. The reader iframe is sandboxed\n// with allow-same-origin, so a link inside the book can call this straight\n// through instead of relying on a postMessage round trip.\nwindow.__brNav=function(raw){try{pushNav();navigateToTargets(resolveTargets(raw));return true;}catch(e){return false;}};\nfunction toast(msg){\n  try{\n    var t=document.getElementById('brToast');\n    if(!t){\n      t=document.createElement('div');t.id='brToast';\n      t.style.cssText='position:fixed;left:50%;bottom:100px;transform:translateX(-50%);background:rgba(20,24,36,.95);color:#e6edf5;border:1px solid #3a4761;border-radius:8px;padding:10px 16px;font:13px sans-serif;z-index:99;pointer-events:none';\n      document.body.appendChild(t);\n    }\n    t.textContent=msg;t.style.display='block';\n    clearTimeout(window.__brToastT);\n    window.__brToastT=setTimeout(function(){t.style.display='none';},2600);\n  }catch(e){}\n}\nfunction postProfile(){try{window.parent.postMessage({action:'profile',profile:BOOK_PROFILE},'*');}catch(e){}}\nfunction detectProfile(){\n  try{\n    var pk=book.packaging||{};var md=pk.metadata||{};\n    BOOK_PROFILE.layout=md.layout||'reflowable';\n    BOOK_PROFILE.fxl=(BOOK_PROFILE.layout==='pre-paginated');\n    BOOK_PROFILE.spread=md.spread||'auto';\n    BOOK_PROFILE.orientation=md.orientation||'auto';\n    BOOK_PROFILE.flow=md.flow||'auto';\n    BOOK_PROFILE.viewport=md.viewport||null;\n    BOOK_PROFILE.tocSource=pk.navPath?'nav':(pk.ncxPath?'ncx':'none');\n    try{\n      var man=pk.manifest||{};\n      for(var k in man){if(man[k]&&man[k].type==='application/smil'){BOOK_PROFILE.overlays=true;break;}}\n    }catch(e){}\n  }catch(e){}\n  postProfile();\n  try{var zr=document.getElementById('zoomRow');if(zr)zr.style.display=BOOK_PROFILE.fxl?'flex':'none';}catch(e){}\n  // encryption.xml is not exposed by epub.js, so probe the archive directly\n  try{\n    if(book.archive&&book.archive.request){\n      var p=book.archive.request('META-INF/encryption.xml');\n      if(p&&p.then){p.then(function(){BOOK_PROFILE.encrypted=true;postProfile();}).catch(function(){});}\n    }\n  }catch(e){}\n}\n\nfunction loadScript(src,cb){var el=document.createElement('script');el.src=src;el.onload=cb;el.onerror=function(){document.getElementById('loading').textContent='Failed to load reader.';};document.head.appendChild(el);}\n\nfunction init(){\n  try{\n    book=ePub(BOOK_URL,{openAs:'epub'});\n    setupRendition(0);\n    book.loaded.navigation.then(function(nav){toc=(nav&&nav.toc)?nav.toc:[];renderChapPanel();}).catch(function(){});\n    book.ready.then(function(){\n      detectProfile();\n      if(BOOK_PROFILE.fxl&&viewMode!==1){setupRendition(1);}\n    }).catch(function(){});\n    book.ready.then(function(){return book.locations.generate(1024);}).then(function(locs){locations=locs||[];updateProgress();}).catch(function(){});\n    renderFontGrid();renderColorDots();updateSettingsUI();\n  }catch(e){document.getElementById('loading').textContent='Error: '+e.message;}\n}\n\nfunction getViewerSize(){\n  var v=document.getElementById('epubArea');\n  return {width:v?v.clientWidth:window.innerWidth,height:v?v.clientHeight:window.innerHeight};\n}\nvar savedLocation=null;var savedHref=null;\nfunction saveLocation(){if(rendition){try{savedLocation=rendition.currentLocation();if(savedLocation&&savedLocation.start){savedHref=savedLocation.start.href;}}catch(e){}}}\nfunction scrollToTop(){\n  var ea=document.getElementById('epubArea');if(ea){ea.scrollTop=0;}\n  try{if(rendition){var cs=rendition.getContents();if(cs){cs.forEach(function(c){\n    if(c&&c.window){c.window.scrollTo(0,0);}\n    if(c&&c.document){c.document.body.scrollTop=0;c.document.documentElement.scrollTop=0;}\n  });}}}catch(e){}\n}\nfunction setupRendition(mode){\n  saveLocation();\n  viewMode=mode;\n  if(rendition){try{rendition.destroy();}catch(e){}}\n  var sz=getViewerSize();\n  if(sz.width===0||sz.height===0){setTimeout(function(){setupRendition(mode);},100);return;}\n  var opts={width:sz.width,height:sz.height,spread:'none',minSpreadWidth:9999,flow:'scrolled-doc',allowScriptedContent:false,allowPopups:false};\n  if(BOOK_PROFILE.fxl){\n    // Fixed layout: pre-paginated spreads, no scrolling, book controls its own geometry\n    opts.flow='paginated';opts.layout='pre-paginated';opts.minSpreadWidth=0;\n    opts.spread=(BOOK_PROFILE.spread&&BOOK_PROFILE.spread!=='auto')?BOOK_PROFILE.spread:'auto';\n  }\n  if(mode===1&&!BOOK_PROFILE.fxl){opts.spread='auto';opts.minSpreadWidth=400;opts.flow='paginated';}\n  rendition=book.renderTo('epubArea',opts);\n  rendition.hooks.content.register(function(contents){\n    injectStyles(contents);\n    try{if(contents&&contents.window){contents.window.scrollTo(0,0);}if(contents&&contents.document){contents.document.body.scrollTop=0;contents.document.documentElement.scrollTop=0;}}catch(e){}\n  });\n  rendition.on('relocated',function(loc){if(loc&&loc.start){curPct=Math.round(loc.start.percentage*100);updateProgress();setTimeout(scrollToTop,50);}});\n  rendition.on('selected',function(cfiRange,contents){try{var sel=contents.window.getSelection();var txt=sel?sel.toString().trim():'';if(txt&&txt.length>2){try{var st=NOTE_COLORS[noteColorIdx%NOTE_COLORS.length];noteColorIdx++;rendition.annotations.highlight(cfiRange,{cfi:cfiRange},function(ev){window.parent.postMessage({action:'showNote',cfi:cfiRange},'*');},'note-hl',st);}catch(e2){}window.parent.postMessage({action:'addNote',text:txt,cfi:cfiRange,page:curPct},'*');}}catch(e){}});\n  applyTheme(CFG);\n  var displayTarget=undefined;\n  if(savedLocation&&savedLocation.start&&savedLocation.start.cfi){displayTarget=savedLocation.start.cfi;}\n  if(displayTarget){\n    rendition.display(displayTarget).then(function(){var el=document.getElementById('loading');if(el)el.style.display='none';updateProgress();}).catch(function(){\n      if(savedHref){rendition.display(savedHref).then(function(){var el=document.getElementById('loading');if(el)el.style.display='none';updateProgress();}).catch(function(){rendition.display();});}\n      else{rendition.display();}\n    });\n  } else {\n    book.ready.then(function(){var sp=book.spine.items;var sh=(sp.length>1)?sp[1].href:undefined;rendition.display(sh).then(function(){var el=document.getElementById('loading');if(el)el.style.display='none';updateProgress();}).catch(function(){rendition.display();});});\n  }\n  \n}\n\n// epub.js builds each content document's <base href> from\n// window.location.origin + the section path. In a srcDoc iframe the origin is\n// opaque, so the string \"null\" ends up in the URL — the \"null\" seen in links.\n// Rewrite it with the app's real origin (the reader is same-origin with it).\n// ── Reader chrome (bottom bar) hide/show ──\nvar chromeOn=true;\nfunction setChrome(v){\n  v=(v!==false);\n  if(chromeOn===v)return;\n  chromeOn=v;\n  // Fade the bars out as overlays. Nothing changes size, so the book is never\n  // re-laid-out — that re-layout was what caused the flicker.\n  try{\n    var b=document.getElementById('bottom');if(b)b.classList.toggle('br-hidden',!v);\n    var p=document.getElementById('navPrev');if(p)p.classList.toggle('br-hidden',!v);\n    var n=document.getElementById('navNext');if(n)n.classList.toggle('br-hidden',!v);\n  }catch(e){}\n}\nvar __chromePing=0;\nfunction chromePing(){\n  var now=Date.now();\n  if(now-__chromePing<250)return;\n  __chromePing=now;\n  try{window.parent.postMessage({action:'chromeShow'},'*');}catch(e){}\n}\ndocument.addEventListener('mousemove',chromePing);\ndocument.addEventListener('touchstart',chromePing);\nfunction fixBase(doc){\n  try{\n    var b=doc&&doc.querySelector?doc.querySelector('base'):null;\n    if(!b)return;\n    var href=b.getAttribute('href')||'';\n    if(href.indexOf('null/')!==0&&href.indexOf('null\\\\')!==0)return;\n    var org='';\n    try{if(window.parent&&window.parent.location&&window.parent.location.origin)org=window.parent.location.origin;}catch(e){}\n    if(!org)return;\n    b.setAttribute('href',org+'/'+href.slice(5));\n  }catch(e){}\n}\nfunction injectStyles(contents){\n  if(!contents||!contents.document)return;\n  try{\n    var doc=contents.document;\n    var sid='reader-style';\n    var ex=doc.getElementById(sid);if(ex)ex.remove();\n    var s=doc.createElement('style');s.id=sid;\n    var ff=CFG.font,fs=CFG.size,lh=CFG.lineHeight,bg=CFG.bg,tc=CFG.color,br=CFG.brightness;\n    var isDark=(tc==='#e0e0e0'||tc==='#c8d8e8');\n    var css='';\n    // ── Universal: prevent dark-mode media query from activating on ANY epub ──\n    css+='html{color-scheme:light !important;}';\n    // Override the epub's own @media dark mode for ALL elements, not just known classes\n    css+='@media(prefers-color-scheme:dark){';\n    css+='html,body{background:'+bg+' !important;color:'+tc+' !important;}';\n    css+='*{color:'+tc+' !important;background-color:transparent !important;}';\n    css+='body{background:'+bg+' !important;}';\n    // Re-color borders that the epub's dark mode may have changed\n    css+='[class]{border-color:'+(isDark?'#555':'#999')+' !important;}';\n    css+='}';\n    // ── Universal: apply font/size/line-height to all text ──\n    css+='body,p,div,span,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,em,strong,b,i,a{font-family:'+ff+' !important;font-size:'+fs+'px !important;line-height:'+lh+' !important;color:'+tc+' !important;}';\n    // But don't override font sizes for headings that have their own relative sizing\n    css+='h1{font-size:'+(fs*1.6)+'px !important;}h2{font-size:'+(fs*1.4)+'px !important;}h3{font-size:'+(fs*1.2)+'px !important;}h4{font-size:'+(fs*1.1)+'px !important;}';\n    // ── Universal: strip the epub's own background colours (banners, tinted boxes)\n    //    so the page colour chosen in Aa applies uniformly ──\n    css+='body,p,div,span,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,section,header,footer,article,aside,table,tr,ul,ol,figure,figcaption{background-color:transparent !important;background-image:none !important;}';\n    // ── Universal: make text selectable/copyable ──\n    css+='body,p,div,span,h1,h2,h3,h4,h5,h6,li,td,th,blockquote{-webkit-user-select:text !important;user-select:text !important;}';\n    // ── Universal: every real link looks like a link (blue + underline) ──\n    css+='a[href]{color:'+(isDark?'#6cb2ff':'#1a73e8')+' !important;text-decoration:underline !important;cursor:pointer !important;}';\n    css+='a[href]:hover{color:'+(isDark?'#9ccdff':'#0b57d0')+' !important;}';\n    // ── Universal: body background + brightness filter ──\n    css+='body{background:'+bg+' !important;filter:brightness('+br+'%) !important;padding:64px 28px 96px !important;}';\n    // ── Universal: image handling — fit any image within viewport ──\n    css+='img{max-width:100% !important;height:auto !important;object-fit:contain !important;}';\n    // Images that are the sole content (full-page scans) should center and fit viewport height\n    css+='body>div>img:only-child,body>img:only-child{max-height:none !important;width:100% !important;margin:0 auto !important;display:block !important;}';\n    // ── Scrollbar ──\n    css+='html::-webkit-scrollbar{width:8px;}html::-webkit-scrollbar-track{background:transparent;}html::-webkit-scrollbar-thumb{background:transparent;}html:hover::-webkit-scrollbar-thumb{background:rgba(150,150,150,0.4);}';\n    // ── DB.epub specific overrides (harmless if classes don't exist) ──\n    css+='.generic-page-image{width:100% !important;margin:0 !important;padding:0 !important;}.generic-page-image img{width:100% !important;max-width:100% !important;height:auto !important;max-height:none !important;object-fit:contain !important;margin:0 auto !important;display:block !important;}';\n    css+='.generic-page-image{margin:0;padding:0;}';\n    css+='.su-logo{max-width:1.4em !important;max-height:1.4em !important;height:auto !important;}';\n    css+='.prayer-icon{max-width:2em !important;max-height:2em !important;height:auto !important;}';\n    css+='.watermark{display:none !important;}';css+='[ref=\"note-hl\"],[ref=\"note-hl\"] *,.note-hl,.note-hl *,.epubjs-hl,.epubjs-hl *,[ref=\"search-hl\"],[ref=\"search-hl\"] *{cursor:pointer !important;}';\n    if(BOOK_PROFILE.fxl){\n      // Fixed-layout books position and paint everything themselves.\n      // Overriding fonts/sizes/backgrounds would destroy the page.\n      // Only neutralise the epub's dark-mode rules.\n      css='html{color-scheme:light !important;zoom:'+fxlZoom+';}@media(prefers-color-scheme:dark){html,body{background:transparent !important;}}a[href]{text-decoration:underline !important;cursor:pointer !important;}';\n    }\n    s.textContent=css;\n    doc.head.appendChild(s);\n    fixBase(doc);\n    setTimeout(function(){try{fixBase(doc);}catch(e){}},350);\n  }catch(e){}\n  try{\n    if(!doc.__brLinks){\n      doc.__brLinks=true;\n      // mousemove inside the book content does NOT reach the reader document\n      // (separate frames), so movement over the text never woke the chrome.\n      // Ping from here too, so ANY movement brings the bars back.\n      doc.addEventListener('mousemove',function(){try{chromePing();}catch(e){}});\n      doc.addEventListener('touchstart',function(){try{chromePing();}catch(e){}});\n      doc.addEventListener('click',function(ev){\n        var el=ev.target;\n        while(el&&el.nodeType===1&&el.tagName!=='A'){el=el.parentNode;}\n        if(!el||el.tagName!=='A')return;\n        var href=el.getAttribute('href')||'';\n        if(!href)return;\n        if(/^(file|javascript|vbscript|data):/i.test(href)){ev.preventDefault();return;}\n        if(href.indexOf('://')>-1||href.indexOf('mailto:')===0){ev.preventDefault();ev.stopPropagation();try{window.open(href,'_blank');}catch(e){}return;}\n        ev.preventDefault();\n        // epub.js also attaches its own onclick to every link and navigates\n        // AFTER us — which can override a correct jump with a wrong one.\n        // Capture + stopPropagation makes our resolution the only one.\n        ev.stopPropagation();\n        var abs='';try{abs=el.href||'';}catch(e){}\n        // This listener is created by the reader's own script, so its scope\n        // chain is the READER's window — `window.parent` here is the APP, not\n        // the reader. Posting there never reached the reader. Call the reader's\n        // functions directly: no cross-frame step exists at all.\n        try{ pushNav(); navigateToTargets(resolveTargets(href)); }catch(e){}\n      },true);\n    }\n  }catch(e){}\n}\n\nfunction applyTheme(cfg){\n  CFG=cfg;\n  if(!rendition)return;\n  if(BOOK_PROFILE.fxl){\n    // Fixed layout: only brightness. Fonts/sizes/padding would wreck the page.\n    rendition.themes.override({'body':{'filter':'brightness('+cfg.brightness+'%) !important'}});\n  }else{\n    rendition.themes.override({'body':{'font-family':cfg.font+' !important','font-size':cfg.size+'px !important','line-height':cfg.lineHeight+' !important','background':cfg.bg+' !important','color':cfg.color+' !important','filter':'brightness('+cfg.brightness+'%) !important','padding':'20px 28px !important'}});\n  }\n  try{\n    var contents=rendition.getContents();\n    contents.forEach(function(c){injectStyles(c);});\n  }catch(e){}\n}\nfunction updateProgress(){\n  var total=locations.length||100;\n  var pg=Math.max(1,Math.round(curPct/100*total));\n  document.getElementById('progFill').style.width=curPct+'%';\n  document.getElementById('progText').textContent='Page '+pg+' of '+total+' - '+curPct+'%';\n}\n\nfunction scrollToBottom(){try{var ea=document.getElementById('epubArea');if(ea)ea.scrollTop=ea.scrollHeight;}catch(e){}}\n// Advance one screen inside the current section. Many books (and every\n// single-document book) have more content than one screen, and rendition.next()\n// only moves between spine items — so it would do nothing.\nfunction scrollStep(dir){\n  try{\n    var ea=document.getElementById('epubArea');\n    if(!ea)return false;\n    var moreV=(dir>0)?((ea.scrollHeight-ea.scrollTop-ea.clientHeight)>24):(ea.scrollTop>24);\n    var moreH=(dir>0)?((ea.scrollWidth-ea.scrollLeft-ea.clientWidth)>24):(ea.scrollLeft>24);\n    if(moreH&&!moreV){ea.scrollLeft=ea.scrollLeft+dir*ea.clientWidth*0.9;return true;}\n    if(moreV){ea.scrollTop=ea.scrollTop+dir*ea.clientHeight*0.9;return true;}\n    if(moreH){ea.scrollLeft=ea.scrollLeft+dir*ea.clientWidth*0.9;return true;}\n  }catch(e){}\n  return false;\n}\nfunction prevPage(){\n  if(viewMode===1){if(rendition)rendition.prev();return;}\n  if(scrollStep(-1))return;\n  if(rendition)rendition.prev();\n  setTimeout(scrollToBottom,120);\n}\nfunction nextPage(){\n  if(viewMode===1){if(rendition)rendition.next();return;}\n  if(scrollStep(1))return;\n  if(rendition)rendition.next();\n  setTimeout(scrollToTop,120);\n}\n\nfunction seekProg(e){\n  var rect=e.currentTarget.getBoundingClientRect();\n  var pct=(e.clientX-rect.left)/rect.width;\n  curPct=Math.round(pct*100);\n  if(locations.length){var idx=Math.min(Math.floor(pct*locations.length),locations.length-1);if(rendition)rendition.display(locations[idx]);}\n}\n\nfunction escTxt(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}\nfunction escAttr(s){return (s||'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;');}\nfunction renderChapPanel(){\n  var panel=document.getElementById('chapPanel');\n  var head='<div class=\"panel-head\"><span class=\"panel-title\">Contents</span><button class=\"panel-close\" onclick=\"hideChap()\">X</button></div>';\n  if(!toc.length){panel.innerHTML=head+'<div style=\"padding:12px;color:#718096;font-size:12px;font-family:sans-serif\">No chapters found.</div>';return;}\n  // Render the WHOLE hierarchy at once: every chapter with its sub-entries\n  // beneath it, indented. No drilling down, no second click.\n  function build(items,depth){\n    var out='';\n    for(var i=0;i<items.length;i++){\n      var c=items[i];if(!c)continue;\n      var label=((c.label||'').trim())||'(untitled)';\n      out+='<div class=\"chapItem'+(depth?' chapSub':'')+'\" data-href=\"'+escAttr(c.href||'')+'\" style=\"padding-left:'+(12+depth*14)+'px\">'+escTxt(label)+'</div>';\n      if(c.subitems&&c.subitems.length)out+=build(c.subitems,depth+1);\n    }\n    return out;\n  }\n  panel.innerHTML=head+build(toc,0);\n  var els=panel.querySelectorAll('.chapItem');\n  Array.prototype.forEach.call(els,function(el){\n    el.addEventListener('click',function(){\n      var href=el.getAttribute('data-href');if(!href||!rendition)return;\n      pushNav();\n      Array.prototype.forEach.call(els,function(e){e.classList.remove('active');});\n      el.classList.add('active');\n      rendition.display(href).catch(function(){var p=href.split('#');if(p.length>1)rendition.display(p[0]).catch(function(){});});\n    });\n  });\n}\n\nfunction showChap(){var p=document.getElementById('chapPanel');p.style.display='flex';p.style.flexDirection='column';}\nfunction toggleChap(){\n  var p=document.getElementById('chapPanel');\n  if(!p)return;\n  if(p.style.display==='flex'||p.style.display==='block'){p.style.display='none';}\n  else{p.style.display='flex';p.style.flexDirection='column';}\n}\nfunction hideChap(){document.getElementById('chapPanel').style.display='none';}\n\nfunction tocLabelFor(href){\n  if(!href)return '';\n  var base=href.split('#')[0];\n  for(var k=0;k<toc.length;k++){\n    if(toc[k]&&toc[k].href&&toc[k].href.split('#')[0]===base)return (toc[k].label||'').trim();\n  }\n  return '';\n}\nfunction doSearch(q){\n  if(!q||!book)return;\n  var panel=document.getElementById('searchPanel');\n  var ql=q.toLowerCase();\n  panel.innerHTML='<p style=\"color:#718096;font-size:12px;font-family:sans-serif;padding:4px\">Searching...</p>';\n  panel.style.display='block';\n  var results=[];\n  var secs=[];\n  try{book.spine.each(function(sc){if(sc&&sc.linear!==false)secs.push(sc);});}catch(e){}\n  var i=0;\n  function render(){\n    var head='<div style=\"display:flex;justify-content:space-between;margin-bottom:8px;font-family:sans-serif\"><span style=\"font-size:12px;color:#a0aec0\">'+results.length+' result'+(results.length===1?'':'s')+'</span><button onclick=\"closeSearch()\" style=\"background:none;border:none;cursor:pointer;color:#718096;font-size:12px\">X Close</button></div>';\n    if(!results.length){panel.innerHTML=head+'<p style=\"color:#718096;font-size:12px;font-family:sans-serif\">No results for \"'+q+'\".</p>';return;}\n    var items=results.slice(0,40).map(function(r,idx){\n      var exc=(r.excerpt||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');\n      var at=exc.toLowerCase().indexOf(ql);\n      if(at>=0){exc=exc.substring(0,at)+'<span class=\"shl\">'+exc.substring(at,at+q.length)+'</span>'+exc.substring(at+q.length);}\n      return '<div class=\"sitem\" data-ridx=\"'+idx+'\"><div class=\"smeta\">'+(r.label||'')+'</div>'+exc+'</div>';\n    }).join('');\n    panel.innerHTML=head+items;\n    panel.querySelectorAll('.sitem').forEach(function(el){\n      el.addEventListener('click',function(){\n        var r=results[parseInt(el.getAttribute('data-ridx'))];\n        if(!r||!rendition)return;\n        pushNav();\n        function markHit(){\n          if(!r.cfi)return;\n          setTimeout(function(){\n            try{if(lastSearchCfi){rendition.annotations.remove(lastSearchCfi,'highlight');}}catch(e){}\n            try{rendition.annotations.highlight(r.cfi,{},{},'search-hl',{fill:'#ff9800','fill-opacity':'0.55'});lastSearchCfi=r.cfi;}catch(e){}\n          },450);\n        }\n        if(r.cfi){rendition.display(r.cfi).then(markHit).catch(function(){if(r.href)rendition.display(r.href).then(markHit);});}\n        else if(r.href){rendition.display(r.href).then(markHit);}\n        closeSearch();\n      });\n    });\n  }\n  function step(){\n    if(i>=secs.length){render();return;}\n    var sec=secs[i++];\n    var label='';\n    try{label=tocLabelFor(sec.href)||((sec.idref||sec.href||'')+'').replace(/\\.x?html?$/i,'');}catch(e){}\n    var p=null;\n    try{p=(typeof sec.load==='function')?sec.load(book.load.bind(book)):null;}catch(e){p=null;}\n    if(!p&&typeof book.load==='function'){try{p=book.load(sec.url||sec.href);}catch(e){p=null;}}\n    if(p&&typeof p.then==='function'){\n      p.then(function(){\n        var hits=[];\n        try{if(typeof sec.find==='function'){hits=sec.find(q)||[];}}catch(e){hits=[];}\n        if(hits.length){\n          hits.forEach(function(h){results.push({cfi:h.cfi,excerpt:h.excerpt,label:label,href:sec.href});});\n        }else{\n          try{\n            var txt=(sec.document&&sec.document.body)?sec.document.body.textContent:'';\n            var at=txt.toLowerCase().indexOf(ql);\n            if(at>=0){results.push({excerpt:txt.substring(Math.max(0,at-60),at+140),label:label,href:sec.href});}\n          }catch(e){}\n        }\n        if(results.length&&(i%4===0))render();\n        step();\n      }).catch(function(){step();});\n    }else step();\n  }\n  step();\n}\nfunction closeSearch(){document.getElementById('searchPanel').style.display='none';}\n\n\nfunction cycleView(){saveLocation();viewMode=(viewMode+1)%2;setupRendition(viewMode);}\n\nfunction showSettings(){var p=document.getElementById('settingsPanel');p.style.display='block';renderFontGrid();renderColorDots();updateSettingsUI();}\nfunction hideSettings(){document.getElementById('settingsPanel').style.display='none';}document.addEventListener('click',function(e){var p=document.getElementById('settingsPanel');if(p&&p.style.display!=='none'){var r=p.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){hideSettings();}}});\n\nfunction renderFontGrid(){\n  var grid=document.getElementById('fontGrid');if(!grid)return;\n  grid.innerHTML='';\n  FONTS.forEach(function(f){\n    var b=document.createElement('button');\n    b.className='fpreset'+(CFG.font===f.v?' on':'');\n    b.style.fontFamily=f.v;\n    b.textContent=f.l;\n    b.addEventListener('click',function(){setFont(f.v);});\n    grid.appendChild(b);\n  });\n}\nfunction renderColorDots(){\n  var row=document.getElementById('colorRow');if(!row)return;\n  row.innerHTML='';\n  COLORS.forEach(function(c){\n    var d=document.createElement('div');\n    d.className='cdot'+(CFG.bg===c.bg?' on':'');\n    d.style.background=c.bg;\n    d.addEventListener('click',function(){setPgColor(c.bg,c.c);});\n    row.appendChild(d);\n  });\n}\nfunction updateSettingsUI(){\n  var sv=document.getElementById('sizeVal');var lv=document.getElementById('lhVal');var bv=document.getElementById('brightVal');\n  if(sv)sv.textContent=CFG.size+'px';if(lv)lv.textContent=parseFloat(CFG.lineHeight).toFixed(1);if(bv)bv.textContent=CFG.brightness+'%';\n}\nfunction setFont(f){CFG.font=f;applyTheme(CFG);renderFontGrid();}\nfunction changeSize(d){CFG.size=Math.max(12,Math.min(24,CFG.size+d));applyTheme(CFG);updateSettingsUI();}\nfunction changeLH(d){CFG.lineHeight=Math.max(1.4,Math.min(2.4,parseFloat((CFG.lineHeight+d).toFixed(1))));applyTheme(CFG);updateSettingsUI();}\nfunction changeBright(d){CFG.brightness=Math.max(60,Math.min(100,CFG.brightness+d));applyTheme(CFG);updateSettingsUI();}\nfunction setPgColor(bg,c){CFG.bg=bg;CFG.color=c;applyTheme(CFG);renderColorDots();}\n\nfunction toggleTTS(){ttsOn?stopTTS():startTTS();}\nfunction startTTS(){ttsOn=true;document.getElementById('playBtn').textContent='Pause';document.getElementById('speedRow').style.display='flex';speakCurrent();}\nfunction speakCurrent(){\n  if(!ttsOn||!rendition)return;\n  try{var contents=rendition.getContents();if(!contents||!contents[0])return;\n  var text=(contents[0].content.innerText||contents[0].content.textContent||'').trim().substring(0,3000);\n  if(!text)return;\n  if(window.speechSynthesis){speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.rate=ttsSpeed;u.onend=function(){if(ttsOn){rendition.next().then(function(){setTimeout(speakCurrent,400);});}};speechSynthesis.speak(u);}}catch(e){}\n}\nfunction stopTTS(){ttsOn=false;document.getElementById('playBtn').textContent='Play';document.getElementById('speedRow').style.display='none';if(window.speechSynthesis)speechSynthesis.cancel();}\n\ndocument.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();nextPage();flashNav('next');}if(e.key==='ArrowLeft'){e.preventDefault();prevPage();flashNav('prev');}if(e.key==='ArrowUp'||e.key==='ArrowDown'){/* let browser scroll naturally */}});\n\nwindow.addEventListener('message',function(e){\n  var d=e.data;if(!d)return;\n  if(d.action==='prev')prevPage();\n  if(d.action==='next')nextPage();\n  if(d.action==='search')doSearch(d.query);\n  if(d.action==='chapList'){try{toggleChap();}catch(e){showChap();}}\n  if(d.action==='cycleView')cycleView();\n  if(d.action==='settings'){applyTheme(d.settings);updateSettingsUI();}\n  if(d.action==='showSettings')showSettings();\n  if(d.action==='hideSettings')hideSettings();\n  if(d.action==='tts')startTTS();\n  if(d.action==='ttsStop')stopTTS();\n  if(d.action==='closeSearch'){try{closeSearch();}catch(e){}}\n  if(d.action==='chrome'){try{setChrome(d.visible!==false);}catch(e){}}\n  if(d.action==='goHref'){\n    try{ navigateToTargets(resolveTargets(d.href||d.abs||'')); }catch(e){}\n  }\n  if(d.action==='setUiTheme'){\n    // chrome only: the toolbar + bottom bar + panels. The reading area keeps\n    // whatever page colour was chosen in the Aa settings.\n    document.body.classList.toggle('light',d.theme==='light');\n  }\n  if(d.action==='setNotes'&&d.notes){d.notes.forEach(function(n,i){if(n&&n.cfi){try{var st=NOTE_COLORS[((n.colorIdx!==undefined?n.colorIdx:i)%NOTE_COLORS.length)];rendition.annotations.highlight(n.cfi,{cfi:n.cfi},function(ev){window.parent.postMessage({action:'showNote',cfi:n.cfi},'*');},'note-hl',st);}catch(e){}}});}\n  if(d.action==='removeNote'&&d.cfi){try{rendition.annotations.remove(d.cfi,'highlight');}catch(e){}}\n});\n\ndocument.getElementById('prevBtn').addEventListener('click',function(){prevPage();flashNav('prev');});\ndocument.getElementById('nextBtn').addEventListener('click',function(){nextPage();flashNav('next');});\ndocument.getElementById('playBtn').addEventListener('click',toggleTTS);\ndocument.getElementById('progTrack').addEventListener('click',seekProg);\ndocument.getElementById('backTextBtn').addEventListener('click',popNav);\ndocument.getElementById('backTextClose').addEventListener('click',dismissBackText);\ndocument.getElementById('navPrev').addEventListener('click',function(){prevPage();flashNav('prev');});\ndocument.getElementById('navNext').addEventListener('click',function(){nextPage();flashNav('next');});\ndocument.getElementById('zoomIn').addEventListener('click',function(){setZoom(fxlZoom+0.25);});\ndocument.getElementById('zoomOut').addEventListener('click',function(){setZoom(fxlZoom-0.25);});\ndocument.getElementById('speedSlider').addEventListener('input',function(){ttsSpeed=parseFloat(this.value);document.getElementById('speedVal').textContent=this.value+'x';if(ttsOn){stopTTS();startTTS();}});\n\nvar rsTimer;window.addEventListener('resize',function(){clearTimeout(rsTimer);rsTimer=setTimeout(function(){if(rendition){var sz=getViewerSize();rendition.resize(sz.width,sz.height);}},200);});\nconsole.log('BookReader reader build 51');\ntry{var bt=document.getElementById('buildTag');if(bt)bt.textContent='v51';}catch(e){}\nloadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',function(){\n  loadScript('https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',function(){init();});\n});\n</script>\n</body>\n</html>";// PDFs render with pdf.js instead of a native <iframe>: Chrome blocks
// framing PDFs served with X-Frame-Options/CSP, and pdf.js also lets us
// suppress the browser's download/print controls for paid books.
function buildPdfViewerHtml(url) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#1a1a1a;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
#view{position:absolute;top:0;left:0;right:0;bottom:0;overflow:auto;text-align:center;padding:64px 0 96px}
#view canvas{display:block;box-shadow:0 3px 14px rgba(0,0,0,.55);background:#fff;max-width:96%}
.pageWrap{position:relative;display:inline-block;margin:0 auto 16px;max-width:96%}
.textLayer{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:0.25;line-height:1}
.textLayer span{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
#msg{color:#a0aec0;font-size:14px;text-align:center;padding:40px 20px;line-height:1.5}
#msg input{padding:10px 12px;border-radius:8px;border:1px solid #2d3748;background:#1e2035;color:#e2e8f0;outline:none}
#msg button{padding:10px 20px;border-radius:8px;border:1px solid #2d3748;background:#1e2035;color:#e2e8f0;cursor:pointer}
/* ── bottom bar: identical chrome to the EPUB viewer ── */
#bottom{position:absolute;left:0;right:0;bottom:0;background:#0f0f1a;border-top:1px solid #2d3748;padding:14px 20px;font-family:sans-serif;height:72px;z-index:40;transition:opacity .4s ease,transform .4s ease}
#bottom.br-hidden{opacity:0;transform:translateY(100%);pointer-events:none}
#progRow{display:flex;align-items:center;gap:10px;margin-bottom:7px}
#progTrack{flex:1;height:3px;background:#2d3748;border-radius:2px;cursor:pointer}
#progFill{height:3px;background:#63b3ed;border-radius:2px;width:0%;transition:width 0.3s}
#progText{font-size:15px;color:#a0aec0;min-width:160px;text-align:right}
#navRow{display:flex;align-items:center;gap:10px;justify-content:center}
.nbtn{background:#2b6cb0;border:1px solid #2d3748;border-radius:10px;padding:14px 40px;cursor:pointer;font-size:20px;color:#fff;font-family:sans-serif;font-weight:700;min-width:120px;text-align:center}
.nbtn:hover{background:#2d3748}
.sbtn{background:#1e2035;border:1px solid #2d3748;color:#e2e8f0;border-radius:8px;padding:12px 16px;font-size:14px;cursor:pointer;font-family:sans-serif}
.sbtn:hover{background:#2d3748}
#q{background:#1e2035;border:1px solid #2d3748;color:#e2e8f0;border-radius:8px;padding:11px 12px;font-size:13px;width:170px;outline:none}
/* ── edge chevrons: identical to the EPUB viewer ── */
.edgeNav{position:fixed;top:50%;transform:translateY(-50%);width:66px;height:150px;border:none;background:rgba(15,15,26,.5);color:#e2e8f0;font-size:46px;line-height:1;cursor:pointer;z-index:55;border-radius:10px;opacity:.7;transition:opacity .4s ease}
.edgeNav.br-hidden{opacity:0 !important;pointer-events:none !important}
.edgeNav.br-active{background:rgba(43,108,176,.95) !important;opacity:1 !important;color:#fff !important}
.edgeNav:hover{opacity:1;background:rgba(43,108,176,.85)}
#hits{display:none;position:absolute;bottom:96px;right:14px;width:350px;max-height:52%;overflow:auto;background:#0f0f1a;border:1px solid #2d3748;border-radius:10px;z-index:45;box-shadow:0 6px 22px rgba(0,0,0,.55);padding:8px}
.hithead{font-size:12px;color:#8fa2bd;padding:6px 8px;font-weight:600}
.hit{padding:9px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#e6edf5;line-height:1.45;border-bottom:1px solid #1b2233}
.hit:hover{background:#1b2233}
.hit b{color:#ffb74d}
body.light{background:#f5f5f5}
body.light #view{background:#e9edf2}
body.light #bottom{background:#ffffff;border-top-color:#e2e8f0}
body.light .nbtn{background:#f1f5f9;border-color:#cbd5e0;color:#1a202c}
body.light .sbtn,body.light #q,body.light #msg input,body.light #msg button{background:#f7fafc;border-color:#cbd5e0;color:#1a202c}
body.light .edgeNav{background:rgba(255,255,255,.75);color:#1a202c}
body.light .edgeNav:hover{background:rgba(43,108,176,.9);color:#fff}
body.light #progText{color:#4a5568}
body.light #progTrack{background:#e2e8f0}
body.light #hits{background:#fff;border-color:#e2e8f0}
body.light .hit{color:#2d3748;border-bottom-color:#edf2f7}
body.light #msg{color:#4a5568}
</style></head><body>
<button id="navPrev" class="edgeNav" style="left:6px" title="Previous page">&#8249;</button>
<button id="navNext" class="edgeNav" style="right:6px" title="Next page">&#8250;</button>
<div id="hits"></div>
<div id="view"><div id="msg">Loading PDF…</div></div>
<div id="bottom">
  <div id="progRow">
    <div id="progTrack"><div id="progFill"></div></div>
    <span id="progText">Loading…</span>
    <span id="buildTag" style="font-size:11px;color:#718096;margin-left:10px">v51</span>
  </div>
  <div id="navRow">
    <button class="nbtn" id="prevBtn">Prev</button>
    <button class="sbtn" id="zoomBtn">Actual size</button>
    <input id="q" type="text" placeholder="Search in PDF…" />
    <button class="sbtn" id="find">Find</button>
    <button class="nbtn" id="nextBtn">Next</button>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
var PDF_URL=${JSON.stringify(url)};
var pdfDoc=null,pageNum=1,fitWidth=true,scale=1.4,busy=false,curScale=1,pendingHit=null;
var view=document.getElementById('view'),progText=document.getElementById('progText');
var progFill=document.getElementById('progFill'),progTrack=document.getElementById('progTrack');
var hitsEl=document.getElementById('hits'),qEl=document.getElementById('q');
function fail(m){
  view.innerHTML='<div id="msg">'+m+'</div>';
}
function openDoc(opts){
  pdfjsLib.getDocument(opts).promise.then(function(doc){pdfDoc=doc;pageNum=1;render();})
    .catch(function(e){
      var n=(e&&e.name)||'';
      if(n==='PasswordException'){askPassword();}
      else if(n==='InvalidPDFException'){fail('This file is not a valid PDF.');}
      else{fail('Could not load this PDF. '+((e&&e.message)||''));}
    });
}
function askPassword(){
  view.innerHTML='<div id="msg">This PDF is password protected.<br><br>'
    +'<input id="pdfpw" type="password" placeholder="Password"/>'
    +'<br><br><button id="pdfpwgo">Open PDF</button></div>';
  var go=function(){var el=document.getElementById('pdfpw');var v=(el&&el.value)||'';if(v)openDoc({url:PDF_URL,password:v});};
  var btn=document.getElementById('pdfpwgo');if(btn)btn.addEventListener('click',go);
  var inp=document.getElementById('pdfpw');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter')go();});
}
if(!window.pdfjsLib){fail('Could not load the PDF engine. Check your connection.');}
else{
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  openDoc({url:PDF_URL});
}
function updateProgress(){
  var total=(pdfDoc&&pdfDoc.numPages)||1;
  progFill.style.width=Math.round((pageNum/total)*100)+'%';
  progText.textContent='Page '+pageNum+' of '+total;
  document.getElementById('prevBtn').disabled=(pageNum<=1);
  document.getElementById('nextBtn').disabled=(pageNum>=total);
}
function render(){
  if(!pdfDoc||busy)return;
  busy=true;
  pdfDoc.getPage(pageNum).then(function(page){
    var base=page.getViewport({scale:1});
    var s=fitWidth?Math.max(0.35,(view.clientWidth-28)/base.width):scale;
    curScale=s;
    var vp=page.getViewport({scale:s});
    var canvas=document.createElement('canvas');
    canvas.width=Math.floor(vp.width);canvas.height=Math.floor(vp.height);
    view.innerHTML='';
    var wrap=document.createElement('div');
    wrap.className='pageWrap';
    wrap.style.width=canvas.width+'px';
    wrap.style.height=canvas.height+'px';
    wrap.appendChild(canvas);
    view.appendChild(wrap);
    page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise.then(function(){
      updateProgress();
      try{buildTextLayer(page,vp,wrap);}catch(e){}
      view.scrollTop=0;busy=false;
      if(pendingHit){try{highlightOnPage(page,pendingHit);}catch(e){}pendingHit=null;}
      try{window.parent.postMessage({action:'pdfPage',page:pageNum,total:pdfDoc.numPages},'*');}catch(e){}
    }).catch(function(){busy=false;});
  }).catch(function(){busy=false;});
}
function buildTextLayer(page,vp,wrap){
  page.getTextContent().then(function(tc){
    var layer=document.createElement('div');
    layer.className='textLayer';
    tc.items.forEach(function(it){
      if(!it.str||!it.str.trim())return;
      try{
        var tx=pdfjsLib.Util.transform(vp.transform,it.transform);
        var hgt=Math.hypot(tx[2],tx[3]);
        if(!hgt)return;
        var span=document.createElement('span');
        span.textContent=it.str;
        span.style.left=tx[4]+'px';
        span.style.top=(tx[5]-hgt)+'px';
        span.style.fontSize=hgt+'px';
        layer.appendChild(span);
      }catch(e){}
    });
    wrap.appendChild(layer);
  }).catch(function(){});
}
function highlightOnPage(page,q){
  page.getTextContent().then(function(tc){
    var canvas=view.querySelector('canvas');if(!canvas)return;
    var ctx=canvas.getContext('2d');
    var vp=page.getViewport({scale:curScale});
    var ql=q.toLowerCase();
    tc.items.forEach(function(it){
      if(!it.str||it.str.toLowerCase().indexOf(ql)<0)return;
      try{
        var tx=pdfjsLib.Util.transform(vp.transform,it.transform);
        var hgt=Math.hypot(tx[2],tx[3])||10;
        var wid=(it.width||0)*curScale;
        ctx.save();ctx.fillStyle='rgba(255,152,0,0.42)';ctx.fillRect(tx[4],tx[5]-hgt,wid,hgt*1.2);ctx.restore();
      }catch(e){}
    });
  }).catch(function(){});
}
function escHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escRe(s){return (s||'').replace(/[.*+?^()|[\\]\\\\]/g,'\\\\$&');}
function closeFind(){hitsEl.style.display='none';hitsEl.innerHTML='';}
function doFind(){
  var q=(qEl.value||'').trim();
  if(!q||!pdfDoc)return;
  var ql=q.toLowerCase();
  hitsEl.style.display='block';
  hitsEl.innerHTML='<div class="hithead">Searching…</div>';
  var out=[],n=1;
  var re=new RegExp('('+escRe(q)+')','ig');
  function step(){
    if(n>pdfDoc.numPages){
      if(!out.length){hitsEl.innerHTML='<div class="hithead">No matches for "'+escHtml(q)+'"</div>';return;}
      var html='<div class="hithead">'+out.length+' match'+(out.length===1?'':'es')+'</div>';
      out.forEach(function(h,i){
        html+='<div class="hit" data-i="'+i+'"><div class="hithead" style="padding:0 0 3px">Page '+h.page+'</div>'+escHtml(h.snippet).replace(re,'<b>$1</b>')+'</div>';
      });
      hitsEl.innerHTML=html;
      Array.prototype.forEach.call(hitsEl.querySelectorAll('.hit'),function(el){
        el.addEventListener('click',function(){
          var h=out[parseInt(el.getAttribute('data-i'),10)];
          if(!h)return;
          pendingHit=q;pageNum=h.page;render();closeFind();
        });
      });
      return;
    }
    var pn=n++;
    pdfDoc.getPage(pn).then(function(page){
      page.getTextContent().then(function(tc){
        var text=tc.items.map(function(it){return it.str||'';}).join(' ');
        var at=text.toLowerCase().indexOf(ql);
        if(at>=0)out.push({page:pn,snippet:text.substring(Math.max(0,at-60),Math.min(text.length,at+q.length+90))});
        if(pn%6===0)hitsEl.innerHTML='<div class="hithead">Searching… page '+pn+'</div>';
        step();
      }).catch(function(){step();});
    }).catch(function(){step();});
  }
  step();
}
// ── chrome hide/show: driven by the app, exactly like the EPUB viewer ──
var chromeOn=true;
function setChrome(v){
  v=(v!==false);
  if(chromeOn===v)return;
  chromeOn=v;
  try{
    var b=document.getElementById('bottom');if(b)b.classList.toggle('br-hidden',!v);
    var p=document.getElementById('navPrev');if(p)p.classList.toggle('br-hidden',!v);
    var n=document.getElementById('navNext');if(n)n.classList.toggle('br-hidden',!v);
    if(!v)closeFind();
  }catch(e){}
}
var __fp=null,__fn=null;
function flashNav(which){
  try{
    var el=document.getElementById(which==='next'?'navNext':'navPrev');
    if(!el)return;
    el.classList.add('br-active');
    if(which==='next'){clearTimeout(__fn);__fn=setTimeout(function(){el.classList.remove('br-active');},320);}
    else{clearTimeout(__fp);__fp=setTimeout(function(){el.classList.remove('br-active');},320);}
  }catch(e){}
}
var __cp=0;
function chromePing(){
  var now=Date.now();
  if(now-__cp<250)return;
  __cp=now;
  try{window.parent.postMessage({action:'chromeShow'},'*');}catch(e){}
}
document.addEventListener('mousemove',chromePing);
document.addEventListener('touchstart',chromePing);
function goPrev(){if(pdfDoc&&pageNum>1){pageNum--;render();}}
function goNext(){if(pdfDoc&&pageNum<pdfDoc.numPages){pageNum++;render();}}
document.getElementById('prevBtn').addEventListener('click',function(){goPrev();flashNav('prev');});
document.getElementById('nextBtn').addEventListener('click',function(){goNext();flashNav('next');});
document.getElementById('navPrev').addEventListener('click',function(){goPrev();flashNav('prev');});
document.getElementById('navNext').addEventListener('click',function(){goNext();flashNav('next');});
document.getElementById('zoomBtn').addEventListener('click',function(){fitWidth=!fitWidth;this.textContent=fitWidth?'Actual size':'Fit width';render();});
document.getElementById('find').addEventListener('click',doFind);
qEl.addEventListener('keydown',function(e){if(e.key==='Enter')doFind();});
progTrack.addEventListener('click',function(e){
  if(!pdfDoc)return;
  var r=this.getBoundingClientRect();
  var pct=(e.clientX-r.left)/r.width;
  pageNum=Math.max(1,Math.min(pdfDoc.numPages,Math.round(pct*pdfDoc.numPages)));
  render();
});
document.addEventListener('click',function(e){
  if(hitsEl.style.display!=='block')return;
  var t=e.target;
  if(hitsEl.contains(t))return;
  if(t===qEl||t===document.getElementById('find'))return;
  closeFind();
});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();goNext();flashNav('next');}
  if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();goPrev();flashNav('prev');}
});
window.addEventListener('message',function(e){
  var d=e.data;if(!d)return;
  if(d.action==='prev'){goPrev();flashNav('prev');}
  if(d.action==='next'){goNext();flashNav('next');}
  if(d.action==='chrome'){setChrome(d.visible!==false);}
  if(d.action==='search'){qEl.value=d.query||'';doFind();}
  if(d.action==='closeSearch'){closeFind();}
  if(d.action==='setUiTheme'){document.body.classList.toggle('light',d.theme==='light');}
});
window.addEventListener('resize',function(){if(pdfDoc)render();});
<\/script></body></html>`;
}


function buildViewerHtml(book, settings) {
  const isPdf = book.content_type === 'pdf';
  const fileUrl = book.file_url || '';

  if (isPdf) {
    return buildPdfViewerHtml(fileUrl);
  }

  return EPUB_VIEWER_HTML
    .replace('{{BOOK_URL}}', fileUrl)
    .replace('{{FONT}}', settings.font)
    .replace('{{SIZE}}', settings.size)
    .replace('{{LH}}', settings.lineHeight)
    .replace('{{BRIGHT}}', settings.brightness)
    .replace('{{BG}}', settings.bg)
    .replace('{{COLOR}}', settings.color);
}

function WebViewer({ iframeRef, html, title, onLoad }) {
  const initialHtml = React.useRef(html);

  if (typeof document === 'undefined') {
    return (
      <View style={s.centered}>
        <Text style={s.emptyTxt}>Open in browser to read.</Text>
      </View>
    );
  }
  return (
    <iframe
      ref={iframeRef}
      srcDoc={initialHtml.current}
      style={{ flex: 1, border: 'none', width: '100%', height: '100%', zIndex: 1 }}
      title={title}
      onLoad={onLoad}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}


function ScannedViewer({ pages, currentPage, setCurrentPage, chromeAnim, onChrome }) {
  const page = pages[currentPage];

  if (!page) return <View style={s.centered}><Text style={s.emptyTxt}>No pages found.</Text></View>;

  const go = (d) => {
    if (onChrome) onChrome();
    setCurrentPage(p => Math.max(0, Math.min(pages.length - 1, p + d)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={true}
      >
        <Image
          source={{ uri: page.image_url }}
          style={{
            width: Platform.OS === 'web' ? '100%' : '100%',
            height: Platform.OS === 'web' ? '100vh' : 600,
            resizeMode: 'contain',
          }}
          accessibilityLabel={`Page ${currentPage + 1}`}
        />
      </ScrollView>

      {/* Edge page-turn chevrons — same as the EPUB and PDF readers */}
      <TouchableOpacity
        style={[s.scanChev, { left: 6 }, currentPage === 0 && { opacity: 0.25 }]}
        disabled={currentPage === 0}
        onPress={() => go(-1)}
      >
        <Text style={s.scanChevTxt}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.scanChev, { right: 6 }, currentPage === pages.length - 1 && { opacity: 0.25 }]}
        disabled={currentPage === pages.length - 1}
        onPress={() => go(1)}
      >
        <Text style={s.scanChevTxt}>›</Text>
      </TouchableOpacity>

      {/* Bottom bar — an overlay that hides with the app chrome, like the readers */}
      <Animated.View
        style={[s.scanBottom, { opacity: chromeAnim || 1,
          transform: [{ translateY: (chromeAnim || { interpolate: () => 0 }).interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}
      >
        <View style={s.scanProgress}>
          <View style={[s.scanProgressFill, { width: `${((currentPage + 1) / pages.length) * 100}%` }]} />
        </View>
        <View style={s.scanNavBar}>
          <TouchableOpacity
            style={[s.scanNavBtn, currentPage === 0 && s.scanNavDisabled]}
            disabled={currentPage === 0}
            onPress={() => go(-1)}
          >
            <Text style={s.scanNavTxt}>Prev</Text>
          </TouchableOpacity>
          <Text style={s.scanPageInfo}>
            Page {currentPage + 1} of {pages.length}
          </Text>
          <TouchableOpacity
            style={[s.scanNavBtn, currentPage === pages.length - 1 && s.scanNavDisabled]}
            disabled={currentPage === pages.length - 1}
            onPress={() => go(1)}
          >
            <Text style={s.scanNavTxt}>Next</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

export default function ReaderScreen({ route, navigation }) {
  const { bookId, contentType, preview } = route.params;
  const { profile } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [settings] = useState({
    font: 'Georgia', size: 18, lineHeight: 1.8, brightness: 97,
    bg: '#fffdf7', color: '#2c2c2a',
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [pendingNote, setPendingNote] = useState({ text: '', page: 0, cfi: null });
  const [noteText, setNoteText] = useState('');
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [uiTheme, setUiTheme] = useState(() => {
    try { return (typeof localStorage !== 'undefined' && localStorage.getItem('reader_theme')) || 'dark'; }
    catch (e) { return 'dark'; }
  });
  const [ratingStats, setRatingStats] = useState({ avg: null, count: 0 });
  const [viewNotes, setViewNotes] = useState([]);
  const [showNoteView, setShowNoteView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState([]);
  const [bookProfile, setBookProfile] = useState({});
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimer = useRef(null);
  const chromeAnim = useRef(new Animated.Value(1)).current;

  // Animate the chrome as an overlay: fade + slide, never a layout change.
  useEffect(() => {
    Animated.timing(chromeAnim, {
      toValue: chromeVisible ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [chromeVisible, chromeAnim]);

  // Auto-hide the toolbar after 2s without mouse movement so the reading area
  // can expand; any movement brings it back.
  const showChrome = React.useCallback(() => {
    setChromeVisible(true);
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => setChromeVisible(false), 5000);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.addEventListener('mousemove', showChrome);
    window.addEventListener('touchstart', showChrome);
    showChrome();
    return () => {
      window.removeEventListener('mousemove', showChrome);
      window.removeEventListener('touchstart', showChrome);
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
    };
  }, [showChrome]);

  useEffect(() => {
    sendToViewer({ action: 'chrome', visible: chromeVisible });
  }, [chromeVisible]);
  const [currentPage, setCurrentPage] = useState(0);
  const iframeRef = useRef(null);
  const notesRef = useRef([]);
  const showChromeRef = useRef(null);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { showChromeRef.current = showChrome; }, [showChrome]);

  useEffect(() => { loadBook(); }, [bookId]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onMsg(e) {
      const d = e.data;
      if (!d) return;
      if (d.action === 'addNote') {
        setPendingNote({ text: d.text, page: d.page || 0, cfi: d.cfi || null });
        setNoteText('');
        setShowNoteInput(true);
      }
      if (d.action === 'profile') { setBookProfile(d.profile || {}); }
      if (d.action === 'chromeShow') { showChromeRef.current && showChromeRef.current(); }
      if (d.action === 'showNote') {
        const match = notesRef.current.filter(n => n.cfi === d.cfi);
        if (match.length) { setViewNotes(match); setShowNoteView(true); }
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Leaving the reader must stop read-aloud. The Play/Pause button lives inside
  // the reader iframe, so the app never knew speech was running and it carried
  // on in the background after navigating away. Tell the iframe to stop on
  // blur (navigating away) and on unmount, and cancel speech directly as well.
  useEffect(() => {
    function stopSpeech() {
      try { sendToViewer({ action: 'ttsStop' }); } catch (e) {}
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    }
    let unsub = null;
    if (navigation && navigation.addListener) {
      unsub = navigation.addListener('blur', stopSpeech);
    }
    return () => {
      if (unsub) unsub();
      stopSpeech();
    };
  }, [navigation]);

  async function loadBook() {
    // Admin preview: render the unsaved form data directly, no DB lookup.
    if (preview) { setBook(preview); setLoading(false); return; }
    const { data } = await supabase.from('books').select('*').eq('id', bookId).single();
    setBook(data);
    if (data && data.content_type === 'scanned') {
      const { data: pageData } = await supabase
        .from('book_pages')
        .select('image_url, page_number')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });
      setPages(pageData || []);
    }
    loadNotes();
    loadRating();
    setLoading(false);
  }

  async function loadNotes() {
    if (!bookId) return;
    const { data, error } = await supabase
      .from('notes').select('*').eq('book_id', bookId).order('created_at', { ascending: true });
    if (error) return;
    setNotes((data || []).map(n => ({
      id: n.id,
      text: n.selected_text,
      annotation: n.note_text,
      cfi: n.location,
      time: n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
    })));
  }

  async function loadRating() {
    if (!bookId) return;
    const { data, error } = await supabase.from('ratings').select('rating, user_id').eq('book_id', bookId);
    if (error || !data) { setRatingStats({ avg: null, count: 0 }); return; }

    // restore THIS user's own rating so the stars come back pre-selected
    const { data: { user } } = await supabase.auth.getUser();
    const mine = user ? data.find(r => r.user_id === user.id) : null;
    if (mine && mine.rating) { setRating(mine.rating); setHasRated(true); }
    else { setHasRated(false); }

    if (data.length === 0) { setRatingStats({ avg: null, count: 0 }); return; }
    const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
    setRatingStats({ avg: Math.round(avg * 10) / 10, count: data.length });
  }

  function sendToViewer(msg) {
    if (Platform.OS === 'web' && iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    }
  }

  // reader chrome colours for the current theme
  const T = uiTheme === 'light'
    ? { bar: '#ffffff', border: '#e2e8f0', text: '#1a202c', icon: '#4a5568',
        input: '#f7fafc', inputBorder: '#cbd5e0', inputText: '#1a202c' }
    : { bar: '#0f0f1a', border: '#2d3748', text: '#e2e8f0', icon: '#cbd5e0',
        input: '#1e2035', inputBorder: '#4a5568', inputText: '#e2e8f0' };

  function toggleTheme() {
    const next = uiTheme === 'dark' ? 'light' : 'dark';
    setUiTheme(next);
    try { localStorage.setItem('reader_theme', next); } catch (e) {}
    sendToViewer({ action: 'setUiTheme', theme: next });
  }

  // A highlight is only a PREVIEW while you are deciding. If the note is not
  // actually stored, the highlight is taken back — so a highlight always means
  // a note exists.
  function dropPendingHighlight(cfi) {
    if (cfi) sendToViewer({ action: 'removeNote', cfi });
  }

  function cancelNote() {
    const cfi = pendingNote && pendingNote.cfi;
    setShowNoteInput(false);
    setNoteText('');
    setPendingNote({ text: '', page: 0, cfi: null });
    dropPendingHighlight(cfi);
  }

  async function saveNote() {
    const annotation = noteText.trim();
    // Nothing typed means nothing to keep — treat as a cancel.
    if (!annotation) { cancelNote(); return; }
    const cfi = pendingNote && pendingNote.cfi;
    const quote = pendingNote && pendingNote.text;
    setNoteText('');
    setShowNoteInput(false);
    setPendingNote({ text: '', page: 0, cfi: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.alert('Please log in to save notes.');
      dropPendingHighlight(cfi);
      return;
    }
    const { error } = await supabase.from('notes').insert([{
      user_id: user.id,
      book_id: bookId,
      location: cfi || null,
      scope: 'page',
      selected_text: quote,
      note_text: annotation,
    }]);
    if (error) {
      window.alert('Could not save note: ' + error.message);
      dropPendingHighlight(cfi);
      return;
    }
    loadNotes();
  }

  async function submitRating() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.alert('Please log in to rate.'); return; }
    const { error } = await supabase.from('ratings').upsert(
      { user_id: user.id, book_id: bookId, rating },
      { onConflict: 'user_id,book_id' }
    );
    if (error) { window.alert('Could not save rating: ' + error.message); return; }
    window.alert('Thank you for rating!');
    setShowRatingModal(false);
    loadRating();
  }

  function shareBook() {
    if (Platform.OS !== 'web') return;
    const url = 'https://bookreader.vercel.app/book/' + book.id;
    const txt = 'Check out "' + book.title + '" by ' + book.author + ' on BookReader!';
    if (navigator.share) {
      navigator.share({ title: book.title, text: txt, url });
    } else {
      const choice = window.confirm('Share via WhatsApp? Cancel = Email');
      if (choice) window.open('https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url), '_blank');
      else window.location.href = 'mailto:?subject=' + encodeURIComponent(book.title) + '&body=' + encodeURIComponent(txt + '\n\n' + url);
    }
  }

  if (loading) return <View style={s.centered}><ActivityIndicator color="#63b3ed" size="large" /></View>;
  if (!book) return <View style={s.centered}><Text style={s.emptyTxt}>Book not found.</Text></View>;

  return (
    <View style={s.container}>

      <View style={s.main}>
        <Animated.View
          style={[s.toolbar, s.toolbarOverlay, { backgroundColor: T.bar, borderBottomColor: T.border },
            { opacity: chromeAnim,
              transform: [{ translateY: chromeAnim.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }] }]}
        >
          <TouchableOpacity style={s.tbtn} onPress={() => navigation.goBack()}>
            <Text style={[s.tbtnTxt, { color: T.icon }]}>← Back</Text>
          </TouchableOpacity>
          {book.content_type === 'epub' && (
            <TouchableOpacity style={s.tbtn} onPress={() => sendToViewer({ action: 'chapList' })}>
              <Text style={[s.tbtnTxt, { color: T.icon }]}>☰</Text>
            </TouchableOpacity>
          )}
          {book.content_type !== 'scanned' && (
            <TouchableOpacity style={[s.tbtn, showSearch && s.tbtnOn]} onPress={() => setShowSearch(v => !v)}>
              <Text style={[s.tbtnTxt, { color: T.icon }]}>🔍</Text>
            </TouchableOpacity>
          )}
          <Text style={[s.bookTitle, { color: T.text }]} numberOfLines={1}>{book.title}</Text>
          <TouchableOpacity style={s.tbtn} onPress={toggleTheme} accessibilityLabel="Toggle light or dark mode">
            <Text style={[s.tbtnTxt, { color: T.icon }]}>{uiTheme === 'dark' ? '☀' : '☾'}</Text>
          </TouchableOpacity>
          {book.content_type === 'epub' && (
            <>
              {!bookProfile.fxl && (
                <>
                  <TouchableOpacity style={s.tbtn} onPress={() => sendToViewer({ action: 'showSettings' })}>
                    <Text style={[s.tbtnTxt, { color: T.icon }]}>Aa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.tbtn} onPress={() => sendToViewer({ action: 'cycleView' })}>
                    <Text style={[s.tbtnTxt, { color: T.icon }]}>⊞</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
          <TouchableOpacity style={s.tbtn} onPress={() => setShowNotesModal(true)}>
            <Text style={[s.tbtnTxt, { color: T.icon }]}>🗒</Text>
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity style={s.tbtn} onPress={() => setShowDotMenu(v => !v)}>
              <Text style={[s.tbtnTxt, { color: T.icon }]}>⋮</Text>
            </TouchableOpacity>
            {showDotMenu && (
              <View style={s.dotMenu}>
                {[
                  ['📖 About book', () => { setShowAboutModal(true); setShowDotMenu(false); }],
                  ['🗒 Notes', () => { setShowNotesModal(true); setShowDotMenu(false); }],
                  ['📤 Share', () => { shareBook(); setShowDotMenu(false); }],
                  ['⭐ Rate', () => { setShowRatingModal(true); setShowDotMenu(false); }],
                ].map(([label, fn]) => (
                  <TouchableOpacity key={label} style={s.dmi} onPress={fn}>
                    <Text style={s.dmiTxt}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {profile?.is_admin ? (
            <TouchableOpacity style={[s.tbtn, { marginLeft: 'auto' }]} onPress={() => navigation.navigate('Admin')}>
              <Text style={[s.tbtnTxt, { color: T.icon }]}>⚙ Admin</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {showSearch && (
          <View style={[s.inlineSearch, { backgroundColor: T.bar, borderBottomColor: T.border }, { marginTop: 62 }]}>
            <TextInput
              style={[s.searchInput, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.inputText }]}
              placeholder="Search in book..."
              placeholderTextColor="#4a5568"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => sendToViewer({ action: 'search', query: searchQuery })}
              returnKeyType="search"
            />
            <TouchableOpacity style={s.sBtn} onPress={() => sendToViewer({ action: 'search', query: searchQuery })}>
              <Text style={s.sBtnTxt}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); sendToViewer({ action: 'closeSearch' }); }}>
              <Text style={s.iconTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.readerBody}>
          {book.content_type === 'scanned' ? (
            <ScannedViewer
              pages={pages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              chromeAnim={chromeAnim}
              onChrome={showChrome}
            />
          ) : (
            <WebViewer
              iframeRef={iframeRef}
              html={buildViewerHtml(book, settings)}
              title={book.title}
              onLoad={() => {
              setTimeout(() => sendToViewer({ action: 'settings', settings }), 1500);
              setTimeout(() => sendToViewer({ action: 'setUiTheme', theme: uiTheme }), 1800);
              setTimeout(() => {
                const all = notesRef.current;
                const saved = all.map((n, i) => ({ cfi: n.cfi, colorIdx: i })).filter(x => x.cfi);
                if (saved.length) sendToViewer({ action: 'setNotes', notes: saved });
              }, 2500);
            }}
            />
          )}
        </View>
      </View>

      <Modal visible={showNotesModal} transparent animationType="slide" onRequestClose={() => setShowNotesModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowNotesModal(false)}>
          <Pressable style={s.modal}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>Notes & highlights</Text>
            {notes.length === 0 ? (
              <Text style={s.emptyTxt}>No notes yet. Select text in the reader to add notes.</Text>
            ) : (
              <ScrollView>
                {notes.map((n, i) => (
                  <View key={i} style={s.noteCard}>
                    <Text style={s.noteQuote}>"{n.text}"</Text>
                    <Text style={s.noteAnn}>{n.annotation}</Text>
                    <View style={s.noteFoot}>
                      <Text style={s.noteMeta}>{n.time}</Text>
                      <TouchableOpacity onPress={() => setNotes(ns => ns.filter((_, j) => j !== i))}>
                        <Text style={{ color: '#fc8181', fontSize: 12 }}>🗑 Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showNoteInput} transparent animationType="slide" onRequestClose={cancelNote}>
        <Pressable style={s.overlay} onPress={cancelNote}>
          <Pressable style={s.modal}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>Add note</Text>
            <View style={s.noteQuoteBox}>
              <Text style={s.noteQuoteBoxTxt}>"{pendingNote.text}"</Text>
            </View>
            <TextInput style={s.noteTa} placeholder="Write your note here..." placeholderTextColor="#4a5568" value={noteText} onChangeText={setNoteText} multiline />
            <View style={s.mBtns}>
              <TouchableOpacity style={s.mbtn} onPress={cancelNote}>
                <Text style={s.mbtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mbtn, s.mbtnPrimary]} onPress={saveNote}>
                <Text style={s.mbtnPrimaryTxt}>Save note</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAboutModal} transparent animationType="slide" onRequestClose={() => setShowAboutModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAboutModal(false)}>
          <Pressable style={s.modal}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>About this book</Text>
            <View style={s.aboutWrap}>
              <Text style={s.aboutEmoji}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.aboutTitle}>{book.title}</Text>
                <Text style={s.aboutMeta}>By {book.author}</Text>
                <Text style={s.aboutMeta}>{(book.content_type || '').toUpperCase()}</Text>
                <Text style={s.aboutMeta}>
                  {ratingStats.avg != null
                    ? '★ ' + ratingStats.avg + '  ·  ' + ratingStats.count + ' rating' + (ratingStats.count === 1 ? '' : 's')
                    : 'Not yet rated'}
                </Text>
              </View>
            </View>
            {book.description ? <Text style={s.aboutDesc}>{book.description}</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="slide" onRequestClose={() => setShowRatingModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowRatingModal(false)}>
          <Pressable style={s.modal}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>Rate this book</Text>
            <Text style={s.rateName}>{book.title}</Text>
            {hasRated ? (
              <Text style={{ textAlign: 'center', color: '#68d391', fontSize: 12, marginBottom: 4 }}>
                Your rating: {rating}/5 — submit again to change it
              </Text>
            ) : null}
            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={[s.star, rating >= n && s.starOn]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ textAlign: 'center', color: '#718096', fontSize: 13, marginBottom: 12 }}>
              {['', 'Not for me', 'It was ok', 'Liked it', 'Really liked it', 'Loved it!'][rating] || 'Tap a star to rate'}
            </Text>
            <TouchableOpacity style={[s.mbtn, s.mbtnPrimary, { alignSelf: 'center' }]}
              onPress={submitRating}>
              <Text style={s.mbtnPrimaryTxt}>{hasRated ? 'Update rating' : 'Submit rating'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showNoteView} transparent animationType="slide" onRequestClose={() => setShowNoteView(false)}>
        <Pressable style={s.overlay} onPress={() => setShowNoteView(false)}>
          <Pressable style={s.modal}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>{viewNotes.length > 1 ? 'Notes on this highlight' : 'Note on this highlight'}</Text>
            <ScrollView>
              {viewNotes.map((n, i) => (
                <View key={i} style={s.noteCard}>
                  <Text style={s.noteQuote}>"{n.text}"</Text>
                  <Text style={s.noteAnn}>{n.annotation}</Text>
                  <View style={s.noteFoot}>
                    <Text style={s.noteMeta}>{n.time}</Text>
                    <TouchableOpacity onPress={async () => {
                      if (n.id) await supabase.from('notes').delete().eq('id', n.id);
                      if (n.cfi) sendToViewer({ action: 'removeNote', cfi: n.cfi });
                      setViewNotes(vn => vn.filter(x => x !== n));
                      loadNotes();
                    }}>
                      <Text style={{ color: '#fc8181', fontSize: 12 }}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.mBtns}>
              <TouchableOpacity style={s.mbtn} onPress={() => setShowNoteView(false)}>
                <Text style={s.mbtnTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDotMenu} transparent animationType="fade" onRequestClose={() => setShowDotMenu(false)}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDotMenu(false)}>
          <View style={{
            position: 'absolute', top: 70, right: 16,
            backgroundColor: '#16213e', borderWidth: 1, borderColor: '#2d3748',
            borderRadius: 10, minWidth: 200, padding: 4,
            shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 }, elevation: 50,
          }}>
            {[
              ['📖 About book', () => { setShowAboutModal(true); setShowDotMenu(false); }],
              ['🗒 Notes', () => { setShowNotesModal(true); setShowDotMenu(false); }],
              ['📤 Share', () => { shareBook(); setShowDotMenu(false); }],
              ['⭐ Rate', () => { setShowRatingModal(true); setShowDotMenu(false); }],
            ].map(([label, fn]) => (
              <TouchableOpacity style={s.dmi} onPress={fn} key={label}>
                <Text style={s.dmiTxt}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#1a1a1a' },
  main: { flex: 1, position: 'relative' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  emptyTxt: { color: '#718096', fontSize: 14, textAlign: 'center', padding: 16 },
  chapSide: { width: 220, backgroundColor: '#0f0f1a', borderRightWidth: 1, borderRightColor: '#2d3748' },
  chapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2d3748' },
  chapTitle: { fontSize: 13, fontWeight: '500', color: '#e2e8f0' },
  iconTxt: { color: '#718096', fontSize: 16, padding: 6 },
  chapAction: { margin: 12, padding: 10, backgroundColor: '#1a365d', borderRadius: 6 },
  chapActionTxt: { color: '#63b3ed', fontSize: 13, textAlign: 'center' },
  chapHint: { fontSize: 11, color: '#4a5568', padding: 12, lineHeight: 16 },
  main: { flex: 1, flexDirection: 'column' },
  readerBody: { flex: 1 },
  toolbarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6, backgroundColor: '#0f0f1a', borderBottomWidth: 1, borderBottomColor: '#2d3748' },
  tbtn: { padding: 12, borderRadius: 10 },
  tbtnTxt: { color: '#cbd5e0', fontSize: 20 },
  tbtnOn: { backgroundColor: '#1a365d' },
  bookTitle: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500', color: '#e2e8f0' },
  dotMenu: { position: 'absolute', right: 0, top: 44, backgroundColor: '#16213e', borderWidth: 1, borderColor: '#2d3748', borderRadius: 10, zIndex: 99999, minWidth: 200, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 50 },
  dmi: { padding: 14, paddingHorizontal: 18 },
  dmiTxt: { fontSize: 17, color: '#a0aec0' },
  inlineSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#0f0f1a', borderBottomWidth: 1, borderBottomColor: '#2d3748' },
  searchInput: { flex: 1, padding: 7, backgroundColor: '#1e2035', borderWidth: 1, borderColor: '#4a5568', borderRadius: 6, color: '#e2e8f0', fontSize: 13 },
  sBtn: { padding: 7, paddingHorizontal: 12, backgroundColor: '#2b6cb0', borderRadius: 6 },
  sBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  modal: { backgroundColor: '#16213e', borderRadius: 16, width: '100%', maxWidth: 680, padding: 18, maxHeight: '80%', borderWidth: 1, borderColor: '#2d3748' },
  mHandle: { width: 36, height: 4, backgroundColor: '#2d3748', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  mTitle: { fontSize: 15, fontWeight: '500', color: '#e2e8f0', marginBottom: 14 },
  noteCard: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2d3748', backgroundColor: '#0f0f1a', marginBottom: 8 },
  noteQuote: { fontSize: 12, fontStyle: 'italic', color: '#718096', borderLeftWidth: 3, borderLeftColor: '#63b3ed', paddingLeft: 8, marginBottom: 6, lineHeight: 18 },
  noteAnn: { fontSize: 13, color: '#e2e8f0', lineHeight: 18, marginBottom: 6 },
  noteFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteMeta: { fontSize: 11, color: '#4a5568' },
  noteQuoteBox: { backgroundColor: '#0f0f1a', borderLeftWidth: 3, borderLeftColor: '#63b3ed', padding: 10, borderRadius: 6, marginBottom: 10 },
  noteQuoteBoxTxt: { fontSize: 13, fontStyle: 'italic', color: '#a0aec0', lineHeight: 18 },
  noteTa: { backgroundColor: '#0f0f1a', borderWidth: 1, borderColor: '#4a5568', borderRadius: 6, color: '#e2e8f0', fontSize: 14, padding: 10, minHeight: 80, marginBottom: 10 },
  mBtns: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  mbtn: { padding: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: '#4a5568', backgroundColor: '#1e2035' },
  mbtnTxt: { color: '#e2e8f0', fontSize: 13 },
  mbtnPrimary: { backgroundColor: '#2b6cb0', borderColor: '#2b6cb0' },
  mbtnPrimaryTxt: { color: '#fff', fontSize: 13 },
  aboutWrap: { flexDirection: 'row', gap: 14, marginBottom: 12, alignItems: 'flex-start' },
  aboutEmoji: { fontSize: 36, width: 65, textAlign: 'center', padding: 14, backgroundColor: '#0f0f1a', borderRadius: 6 },
  aboutTitle: { fontSize: 15, fontWeight: '500', color: '#e2e8f0', marginBottom: 4 },
  aboutMeta: { fontSize: 13, color: '#718096', marginBottom: 3 },
  aboutDesc: { fontSize: 14, color: '#a0aec0', lineHeight: 22 },
  rateName: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 6 },
  stars: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 10 },
  star: { fontSize: 28, color: '#2d3748' },
  starOn: { color: '#f6ad55' },
  // Scanned viewer styles
  scanChev: { position: 'absolute', top: '40%', width: 66, height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,15,26,0.5)', borderRadius: 10, zIndex: 55 },
  scanChevTxt: { color: '#e2e8f0', fontSize: 46, lineHeight: 54 },
  scanBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0f0f1a', borderTopWidth: 1, borderTopColor: '#2d3748', paddingVertical: 10, paddingHorizontal: 20, height: 72, zIndex: 40, justifyContent: 'center' },
  scanNavBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, backgroundColor: '#0f0f1a', borderTopWidth: 1, borderTopColor: '#2d3748',
  },
  scanNavBtn: {
    padding: 12, paddingHorizontal: 20, backgroundColor: '#2b6cb0', borderRadius: 8,
  },
  scanNavDisabled: { backgroundColor: '#1e2035' },
  scanNavTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scanPageInfo: { color: '#a0aec0', fontSize: 15, fontWeight: '500' },
  scanProgress: {
    height: 3, backgroundColor: '#0f0f1a',
  },
  scanProgressFill: {
    height: 3, backgroundColor: '#63b3ed',
  },
});
