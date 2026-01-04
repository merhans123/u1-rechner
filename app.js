/* ======================================================
   U1-Rechner – FINALER STAND (ES5)
   Enthält:
   - 30-stel-Methode (360 Tage)
   - Arbeitstage-Modus (3/4/5 Tage)
   - Wirtschaftlichkeitsintervalle
   - Break-Even je Tarif
   - Hinweise für nie optimale Tarife
   ====================================================== */

var daten = [];
var tageJahr = 360;

/* ---------- Modus wechseln ---------- */
function setModus(modus) {
  if (modus === "360") {
    tageJahr = 360;
  }
  render();
}

function setArbeitstage(tageProWoche) {
  tageJahr = tageProWoche * 52;
  render();
}

/* ---------- Berechnung ---------- */
function wirtschaftlichkeit(t, tage) {
  return t.umlagesatz_prozent - (t.erstattung_prozent / tageJahr * tage);
}

function breakEven(t) {
  return Math.ceil((t.umlagesatz_prozent * tageJahr) / t.erstattung_prozent);
}

function berechneIntervalle(u1) {
  var res = [];
  var cur = null;
  var t, i, best, wBest, w;

  for (t = 0; t <= tageJahr; t++) {
    best = u1[0];
    wBest = wirtschaftlichkeit(best, t);

    for (i = 1; i < u1.length; i++) {
      w = wirtschaftlichkeit(u1[i], t);
      if (w < wBest) {
        best = u1[i];
        wBest = w;
      }
    }

    if (!cur || cur.tarif !== best) {
      if (cur) cur.bis = t - 1;
      cur = { von: t, bis: null, tarif: best };
      res.push(cur);
    }
  }

  if (cur) cur.bis = tageJahr;
  return res;
}

/* ---------- Suche ---------- */
function filterKassen() {
  var q = document.getElementById("kassenSuche").value.toLowerCase();
  var o = document.getElementById("kassenSelect").options;
  for (var i = 0; i < o.length; i++) {
    o[i].style.display =
      o[i].text.toLowerCase().indexOf(q) >= 0 ? "" : "none";
  }
}

/* ---------- Render ---------- */
function render() {
  var out = document.getElementById("ergebnisse");
  out.innerHTML = "";
  var sel = document.getElementById("kassenSelect").selectedOptions;
  for (var i = 0; i < sel.length; i++) {
    out.appendChild(renderKasse(daten[sel[i].value]));
  }
}

function renderKasse(k) {
  var d = document.createElement("div");
  d.className = "kasse";

  var h = document.createElement("h3");
  h.textContent = k.kasse;
  d.appendChild(h);

  var u1 = k.u1;
  var intervalle = berechneIntervalle(u1);
  var verwendet = [];

  /* Tabelle 1 – wirtschaftlich sinnvoll */
  var t1 = document.createElement("table");
  var tr = document.createElement("tr");
  ["von", "bis", "Erstattung", "Umlagesatz"].forEach(function (x) {
    var th = document.createElement("th");
    th.textContent = x;
    tr.appendChild(th);
  });
  t1.appendChild(tr);

  intervalle.forEach(function (r) {
    verwendet.push(r.tarif);
    tr = document.createElement("tr");
    [
      r.von,
      r.bis,
      r.tarif.erstattung_prozent + "%",
      r.tarif.umlagesatz_prozent + "%"
    ].forEach(function (v) {
      var td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    t1.appendChild(tr);
  });

  d.appendChild(t1);

  /* Tabelle 2 – Break-Even */
  var t2 = document.createElement("table");
  tr = document.createElement("tr");
  ["Tarif", "Erstattung > Jahresbeitrag ab Tag"].forEach(function (x) {
    var th = document.createElement("th");
    th.textContent = x;
    tr.appendChild(th);
  });
  t2.appendChild(tr);

  u1.forEach(function (t) {
    tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      t.erstattung_prozent +
      "% / " +
      t.umlagesatz_prozent +
      "%</td><td>" +
      breakEven(t) +
      "</td>";
    t2.appendChild(tr);
  });

  d.appendChild(t2);

  /* Tabelle 3 – Hinweise */
  var hatHinweis = false;
  var t3 = document.createElement("table");
  tr = document.createElement("tr");
  ["Tarif", "Hinweis"].forEach(function (x) {
    var th = document.createElement("th");
    th.textContent = x;
    tr.appendChild(th);
  });
  t3.appendChild(tr);

  u1.forEach(function (t) {
    if (verwendet.indexOf(t) === -1) {
      hatHinweis = true;
      tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        t.erstattung_prozent +
        "% / " +
        t.umlagesatz_prozent +
        "%</td><td class='hinweis'>" +
        "Dieser Tarif wird in keinem Kranktage-Bereich der kostengünstigste. " +
        "Die Erstattung übersteigt den Jahresbeitrag ab Tag " +
        breakEven(t) +
        ", dennoch ist ein anderer Tarif über den gesamten Zeitraum wirtschaftlich günstiger." +
        "</td>";
      t3.appendChild(tr);
    }
  });

  if (hatHinweis) d.appendChild(t3);

  return d;
}

/* ---------- Init ---------- */
function init() {
  var x = new XMLHttpRequest();
  x.open("GET", "./data/krankenkassen_u1.json", true);
  x.onreadystatechange = function () {
    if (x.readyState === 4 && x.status === 200) {
      daten = JSON.parse(x.responseText);
      daten.sort(function (a, b) {
        return a.kasse.localeCompare(b.kasse, "de");
      });

      var s = document.getElementById("kassenSelect");
      daten.forEach(function (k, i) {
        var o = document.createElement("option");
        o.value = i;
        o.textContent = k.kasse;
        s.appendChild(o);
      });

      s.onchange = render;
      document.getElementById("kassenSuche").onkeyup = filterKassen;
    }
  };
  x.send();
}

window.onload = init;
