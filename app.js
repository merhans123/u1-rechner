/* ===============================
   U1-Rechner – app.js (ES5)
   ITSG-kompatibel + robust
   =============================== */

var daten = [];
var tageJahr = 360;

/* --- Tarif normalisieren (ITSG / eigene JSON) --- */
function normalizeTarif(t) {
  return {
    erstattung: parseFloat(
      t.erstattung ||
      t.Erstattung ||
      t.Erstattungssatz ||
      t.erstattungssatz
    ),
    umlagesatz: parseFloat(
      t.umlagesatz ||
      t.Umlagesatz ||
      t.umlage ||
      t.Umlagesatz
    )
  };
}

/* --- Wirtschaftlichkeit (relativ, lohnunabhängig) --- */
function wirtschaftlichkeit(t, tage) {
  return t.umlagesatz - (t.erstattung / tageJahr * tage);
}

/* --- Break-Even-Tag --- */
function breakEven(t) {
  if (!t.erstattung || !t.umlagesatz) return null;
  return Math.ceil((t.umlagesatz * tageJahr) / t.erstattung);
}

/* --- Intervalle berechnen (0–360) --- */
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

/* --- Suche --- */
function filterKassen() {
  var q = document.getElementById("kassenSuche").value.toLowerCase();
  var opts = document.getElementById("kassenSelect").options;
  var i;

  for (i = 0; i < opts.length; i++) {
    opts[i].style.display =
      opts[i].text.toLowerCase().indexOf(q) >= 0 ? "" : "none";
  }
}

/* --- Render gesamt --- */
function render() {
  var out = document.getElementById("ergebnisse");
  out.innerHTML = "";

  var sel = document.getElementById("kassenSelect").selectedOptions;
  var i;

  for (i = 0; i < sel.length; i++) {
    out.appendChild(renderKasse(daten[sel[i].value]));
  }
}

/* --- Render einzelne Krankenkasse --- */
function renderKasse(k) {
  var div = document.createElement("div");
  div.className = "kasse";

  var h = document.createElement("h3");
  h.appendChild(document.createTextNode(k.kasse));
  div.appendChild(h);

  /* Tarife normalisieren */
  var u1 = [];
  var i;
  for (i = 0; i < k.u1.length; i++) {
    var t = normalizeTarif(k.u1[i]);
    if (!isNaN(t.erstattung) && !isNaN(t.umlagesatz)) {
      u1.push(t);
    }
  }

  if (u1.length === 0) {
    var p = document.createElement("p");
    p.appendChild(document.createTextNode(
      "Für diese Krankenkasse sind keine gültigen U1-Tarife vorhanden."
    ));
    div.appendChild(p);
    return div;
  }

  /* Intervalle */
  var intervalle = berechneIntervalle(u1);
  var used = [];

  /* Tabelle 1 */
  var table = document.createElement("table");
  var tr = document.createElement("tr");
  ["von", "bis", "Erstattung", "Umlagesatz"].forEach(function (x) {
    var th = document.createElement("th");
    th.appendChild(document.createTextNode(x));
    tr.appendChild(th);
  });
  table.appendChild(tr);

  for (i = 0; i < intervalle.length; i++) {
    var r = intervalle[i];
    used.push(r.tarif);

    tr = document.createElement("tr");
    [
      r.von,
      r.bis,
      r.tarif.erstattung + "%",
      r.tarif.umlagesatz + "%"
    ].forEach(function (v) {
      var td = document.createElement("td");
      td.appendChild(document.createTextNode(v));
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }

  div.appendChild(table);

  /* Tabelle 2 – Hinweise */
  var t2 = document.createElement("table");
  tr = document.createElement("tr");
  ["Tarif", "Hinweis"].forEach(function (x) {
    var th = document.createElement("th");
    th.appendChild(document.createTextNode(x));
    tr.appendChild(th);
  });
  t2.appendChild(tr);

  for (i = 0; i < u1.length; i++) {
    if (used.indexOf(u1[i]) === -1) {
      tr = document.createElement("tr");

      var td1 = document.createElement("td");
      td1.appendChild(document.createTextNode(
        u1[i].erstattung + "% / " + u1[i].umlagesatz + "%"
      ));

      var td2 = document.createElement("td");
      td2.className = "hinweis";
      var be = breakEven(u1[i]);
      td2.appendChild(document.createTextNode(
        "Dieser Tarif wird in keinem Kranktage-Bereich der kostengünstigste. " +
        (be ? "Die Erstattung übersteigt den Jahresbeitrag ab Tag " + be + ", " : "") +
        "dennoch ist ein anderer Tarif über den gesamten Zeitraum wirtschaftlich günstiger."
      ));

      tr.appendChild(td1);
      tr.appendChild(td2);
      t2.appendChild(tr);
    }
  }

  div.appendChild(t2);
  return div;
}

/* --- Init --- */
function init() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./data/krankenkassen_u1.json", true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      daten = JSON.parse(xhr.responseText);
      daten.sort(function (a, b) {
        return a.kasse.localeCompare(b.kasse, "de");
      });

      var sel = document.getElementById("kassenSelect");
      var i;
      for (i = 0; i < daten.length; i++) {
        var o = document.createElement("option");
        o.value = i;
        o.appendChild(document.createTextNode(daten[i].kasse));
        sel.appendChild(o);
      }

      sel.onchange = render;
      document.getElementById("kassenSuche").onkeyup = filterKassen;
    }
  };
  xhr.send();
}

window.onload = init;
