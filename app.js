// app.js — überarbeitet: Validierung, Typ-Normalisierung, Tie-Breaker, CSV-Escaping, Filter-Deselect, Cache

document.addEventListener('DOMContentLoaded', () => {
  // Zustand
  let daten = [];
  let modus = "360";
  let arbeitstageProJahr = 260;

  // DOM-Referenzen
  const kassenSelect = document.getElementById("kassenSelect");
  const kassenSuche = document.getElementById("kassenSuche");
  const csvAlleBtn = document.getElementById("csvAlle");
  const arbeitstageOptionenEl = document.getElementById("arbeitstageOptionen");
  const ergebnisseEl = document.getElementById("ergebnisse");

  // Cache für berechnete Intervalle: key = `${kassenIndex}-${faktor}`
  const intervalCache = new Map();

  // Hilfsfunktion: sichere Number-Konvertierung
  const toNumber = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Daten laden und normalisieren
  fetch("data/krankenkassen_u1.json")
    .then(r => {
      if (!r.ok) throw new Error(`Netzwerkfehler: ${r.status} ${r.statusText}`);
      return r.json();
    })
    .then(j => {
      // Normalisieren: name sicherstellen, u1 als Array, numerische Felder
      daten = (Array.isArray(j) ? j : []).map(k => {
        const u1 = Array.isArray(k.u1) ? k.u1 : [];
        return {
          name: String(k.name || "Unbekannte Kasse"),
          u1: u1.map(t => ({
            // Felder: erstattung, umlagesatz (werden als Zahlen erwartet)
            erstattung: toNumber(t.erstattung),
            umlagesatz: toNumber(t.umlagesatz),
            // Optional: Bezeichner falls vorhanden
            label: t.label || (t.erstattung + "% / " + t.umlagesatz + "%")
          }))
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "de"));
      initSelect();
      initModus();
    })
    .catch(err => {
      console.error("Fehler beim Laden der Kassen-Daten:", err);
      ergebnisseEl.textContent = "Fehler beim Laden der Daten. Siehe Konsole.";
    });

  // Init-Modus / Radios
  function initModus() {
    document.querySelectorAll('input[name="modus"]').forEach(r => {
      r.addEventListener("change", e => {
        modus = e.target.value;
        arbeitstageOptionenEl.style.display = modus === "arbeitstage" ? "block" : "none";
        intervalCache.clear();
        render();
      });
    });

    document.querySelectorAll('input[name="tagewoche"]').forEach(r => {
      r.addEventListener("change", e => {
        const val = parseInt(e.target.value, 10);
        arbeitstageProJahr = Number.isFinite(val) && val > 0 ? val * 52 : 260;
        intervalCache.clear();
        render();
      });
    });

    // initialer Sichtbarkeitszustand (falls Radio bereits gesetzt)
    const selected = document.querySelector('input[name="modus"]:checked');
    if (selected) {
      modus = selected.value;
      arbeitstageOptionenEl.style.display = modus === "arbeitstage" ? "block" : "none";
    }
  }

  function initSelect() {
    // Select füllen
    daten.forEach((k, i) => {
      const o = document.createElement("option");
      o.value = i; // Index in daten
      o.textContent = k.name;
      kassenSelect.appendChild(o);
    });

    kassenSuche.addEventListener("input", filterSelect);
    kassenSelect.addEventListener("change", () => {
      render();
    });
    csvAlleBtn.addEventListener("click", exportCSVAlle);
  }

  // Filter: versteckte Optionen werden auch deselektiert (um Verwirrung zu vermeiden)
  function filterSelect(e) {
    const val = String(e.target.value || "").trim().toLowerCase();
    [...kassenSelect.options].forEach(o => {
      const visible = o.textContent.toLowerCase().includes(val);
      o.style.display = visible ? "" : "none";
      if (!visible && o.selected) o.selected = false;
    });
    render();
  }

  // Faktor: 360 oder Arbeitstage pro Jahr (defensiv)
  function faktor() {
    if (modus === "360") return 360;
    // defensiv: min 1
    return (Number.isFinite(arbeitstageProJahr) && arbeitstageProJahr > 0) ? arbeitstageProJahr : 260;
  }

  // Wirtschaftlichkeit: kleinere Werte sind besser (Kosten)
  function wirtschaftlichkeit(tarif, tage) {
    // Schütze gegen ungültige Daten
    const erst = toNumber(tarif.erstattung);
    const uml = toNumber(tarif.umlagesatz);
    const f = faktor();
    if (f <= 0) return Number.POSITIVE_INFINITY;
    return uml - (erst / f * tage);
  }

  // berechneIntervalle mit Cache und Schutz gegen leere Tarife
  function berechneIntervalleFor(kassenIndex) {
    const kasse = daten[kassenIndex];
    const f = faktor();
    const cacheKey = `${kassenIndex}-${f}`;
    if (intervalCache.has(cacheKey)) return intervalCache.get(cacheKey);

    const u1 = Array.isArray(kasse.u1) ? kasse.u1 : [];
    if (u1.length === 0) {
      const empty = [];
      intervalCache.set(cacheKey, empty);
      return empty;
    }

    const result = [];
    let current = null;

    for (let t = 0; t <= f; t++) {
      // bestes Tarif-Objekt für t, mit Tie-Breaker (bei Gleichstand: niedrigster Umlagesatz)
      const best = u1.reduce((a, b) => {
        const va = wirtschaftlichkeit(a, t);
        const vb = wirtschaftlichkeit(b, t);
        if (va !== vb) return va < vb ? a : b;
        // Tie-breaker: kleinerer umlagesatz bevorzugen, sonst erstattung höher
        if (a.umlagesatz !== b.umlagesatz) return a.umlagesatz < b.umlagesatz ? a : b;
        return a.erstattung >= b.erstattung ? a : b;
      });

      if (!current || current.tarif !== best) {
        if (current) current.bis = t - 1;
        current = { von: t, bis: null, tarif: best };
        result.push(current);
      }
    }
    if (current) current.bis = f;
    intervalCache.set(cacheKey, result);
    return result;
  }

  // CSV-Escape und BOM für Excel-kompatible Umlaute
  function csvEscape(s) {
    return '"' + String(s === null || s === undefined ? "" : s).replace(/"/g, '""') + '"';
  }

  function exportCSVAlle() {
    const selected = [...kassenSelect.selectedOptions];
    if (selected.length === 0) {
      alert("Bitte mindestens eine Krankenkasse auswählen.");
      return;
    }

    const rows = [
      ["Krankenkasse", "von", "bis", "Erstattung (%)", "Umlagesatz (%)"]
    ];

    selected.forEach(opt => {
      const idx = opt.value;
      const kasse = daten[idx];
      if (!kasse) return;
      const intervalle = berechneIntervalleFor(idx);
      if (intervalle.length === 0) {
        rows.push([kasse.name, "", "", "", ""]);
      } else {
        intervalle.forEach(i => {
          rows.push([kasse.name, i.von, i.bis, i.tarif.erstattung, i.tarif.umlagesatz]);
        });
      }
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "u1_sammelexport.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Render-Funktionen mit Fehler-Schutz
  function render() {
    ergebnisseEl.innerHTML = "";
    const selected = [...kassenSelect.selectedOptions];
    if (selected.length === 0) {
      ergebnisseEl.textContent = "Keine Krankenkasse ausgewählt.";
      return;
    }

    selected.forEach(opt => {
      const idx = opt.value;
      const kasse = daten[idx];
      if (!kasse) return;
      try {
        ergebnisseEl.appendChild(renderKasse(idx, kasse));
      } catch (e) {
        console.error("Fehler beim Rendern der Kasse", kasse, e);
        const errDiv = document.createElement("div");
        errDiv.className = "kasse fehler";
        errDiv.textContent = `Fehler beim Berechnen für ${kasse.name}. Siehe Konsole.`;
        ergebnisseEl.appendChild(errDiv);
      }
    });
  }

  function renderKasse(kassenIndex, kasse) {
    const div = document.createElement("div");
    div.className = "kasse";

    const intervalle = berechneIntervalleFor(kassenIndex);
    const verwendete = new Set(intervalle.map(i => i.tarif));

    let html = `<h3>${kasse.name}</h3>`;

    if (intervalle.length === 0) {
      html += `<p>Für diese Krankenkasse sind keine U1-Tarife hinterlegt.</p>`;
      div.innerHTML = html;
      return div;
    }

    html += `<h4>Wirtschaftlich sinnvoller Tarif (nach Krankentagen)</h4>`;
    html += "<table><tr><th>von</th><th>bis</th><th>Erstattung</th><th>Umlagesatz</th></tr>";
    intervalle.forEach(i => {
      html += `<tr><td>${i.von}</td><td>${i.bis}</td><td>${i.tarif.erstattung}%</td><td>${i.tarif.umlagesatz}%</td></tr>`;
    });
    html += "</table>";

    html += "<h4>Weitere angebotene Tarife</h4><table><tr><th>Tarif</th><th>Hinweis</th></tr>";
    kasse.u1.forEach(t => {
      if (!verwendete.has(t)) {
        const label = t.label || `${t.erstattung}% / ${t.umlagesatz}%`;
        html += `<tr><td>${label}</td>
          <td class='hinweis'>In keinem Kranktage-Bereich wirtschaftlich optimal</td></tr>`;
      }
    });
    html += "</table>";

    div.innerHTML = html;
    return div;
  }

});
