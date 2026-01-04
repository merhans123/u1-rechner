var daten = [];
var tageJahr = 360;

function wirtschaftlichkeit(t, tage){
  return t.umlagesatz - (t.erstattung / tageJahr * tage);
}

function breakEven(t){
  return Math.ceil((t.umlagesatz * tageJahr) / t.erstattung);
}

function berechneIntervalle(u1){
  var res = [], cur = null, t, i, best, wBest, w;
  for(t = 0; t <= tageJahr; t++){
    best = u1[0];
    wBest = wirtschaftlichkeit(best, t);
    for(i = 1; i < u1.length; i++){
      w = wirtschaftlichkeit(u1[i], t);
      if(w < wBest){
        best = u1[i];
        wBest = w;
      }
    }
    if(!cur || cur.tarif !== best){
      if(cur) cur.bis = t - 1;
      cur = { von: t, bis: null, tarif: best };
      res.push(cur);
    }
  }
  if(cur) cur.bis = tageJahr;
  return res;
}

function filterKassen(){
  var q = document.getElementById("kassenSuche").value.toLowerCase();
  var o = document.getElementById("kassenSelect").options, i;
  for(i = 0; i < o.length; i++){
    o[i].style.display = o[i].text.toLowerCase().indexOf(q) >= 0 ? "" : "none";
  }
}

function render(){
  var out = document.getElementById("ergebnisse");
  out.innerHTML = "";
  var sel = document.getElementById("kassenSelect").selectedOptions, i;
  for(i = 0; i < sel.length; i++){
    out.appendChild(renderKasse(daten[sel[i].value]));
  }
}

function renderKasse(k){
  var d = document.createElement("div");
  d.className = "kasse";

  var h = document.createElement("h3");
  h.appendChild(document.createTextNode(k.kasse));
  d.appendChild(h);

  var ints = berechneIntervalle(k.u1);
  var used = [];
  var i;

  var t = document.createElement("table");
  var tr = document.createElement("tr");
  ["von","bis","Erstattung","Umlagesatz"].forEach(function(x){
    var th = document.createElement("th");
    th.appendChild(document.createTextNode(x));
    tr.appendChild(th);
  });
  t.appendChild(tr);

  for(i = 0; i < ints.length; i++){
    used.push(ints[i].tarif);
    tr = document.createElement("tr");
    [ints[i].von, ints[i].bis, ints[i].tarif.erstattung + "%", ints[i].tarif.umlagesatz + "%"]
      .forEach(function(v){
        var td = document.createElement("td");
        td.appendChild(document.createTextNode(v));
        tr.appendChild(td);
      });
    t.appendChild(tr);
  }
  d.appendChild(t);

  var t2 = document.createElement("table");
  tr = document.createElement("tr");
  ["Tarif","Hinweis"].forEach(function(x){
    var th = document.createElement("th");
    th.appendChild(document.createTextNode(x));
    tr.appendChild(th);
  });
  t2.appendChild(tr);

  for(i = 0; i < k.u1.length; i++){
    if(used.indexOf(k.u1[i]) === -1){
      tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.appendChild(document.createTextNode(
        k.u1[i].erstattung + "% / " + k.u1[i].umlagesatz + "%"
      ));
      var td2 = document.createElement("td");
      td2.className = "hinweis";
      td2.appendChild(document.createTextNode(
        "Dieser Tarif wird in keinem Kranktage-Bereich der kostengünstigste. " +
        "Die Erstattung übersteigt zwar ggf. den Jahresbeitrag ab Tag " +
        breakEven(k.u1[i]) +
        ", dennoch ist ein anderer Tarif über den gesamten Zeitraum wirtschaftlich günstiger."
      ));
      tr.appendChild(td1);
      tr.appendChild(td2);
      t2.appendChild(tr);
    }
  }
  d.appendChild(t2);
  return d;
}

function init(){
  var x = new XMLHttpRequest();
  x.open("GET","./data/krankenkassen_u1.json",true);
  x.onreadystatechange = function(){
    if(x.readyState === 4 && x.status === 200){
      daten = JSON.parse(x.responseText);
      daten.sort(function(a,b){
        return a.kasse.localeCompare(b.kasse,"de");
      });
      var s = document.getElementById("kassenSelect"), i;
      for(i = 0; i < daten.length; i++){
        var o = document.createElement("option");
        o.value = i;
        o.appendChild(document.createTextNode(daten[i].kasse));
        s.appendChild(o);
      }
      s.onchange = render;
      document.getElementById("kassenSuche").onkeyup = filterKassen;
    }
  };
  x.send();
}

window.onload = init;
