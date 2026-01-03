let daten = [];
let modus = "360";
let arbeitstageProJahr = 260;

fetch("data/krankenkassen_u1.json")
  .then(r => r.json())
  .then(j => {
    daten = j.sort((a, b) => a.name.localeCompare(b.name, "de"));
    initSelect();
    initModus();
  });

function initModus() {
  document.querySelectorAll('input[name="modus"]').forEach(r => {
    r.addEventListener("change", e => {
      modus = e.target.value;
      document.getElementById("arbeitstageOptionen").style.display =
        modus === "arbeitstage" ? "block" : "none";
      render();
    });
  });

  document.querySelectorAll('input[name="tagewoche"]').forEach(r => {
    r.addEventListener("change", e => {
      arbeitstageProJahr = parseInt(e.target.value) * 52;
      render();
    });
  });
}

function initSelect() {
  const sel = document.getElementById("kassenSelect");
  daten.forEach((k, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = k.name;
    sel.appendChild(o);
  });

  document.getElementById("kassenSuche").addEventListener("input", filterSelect);
  sel.addEventListener("change", render);
  document.getElementById("csvAlle").addEventListener("click", exportCSVAlle);
}

function filterSelect(e) {
  const val = e.target.value.toLowerCase();
  [...kassenSelect.options].forEach(o => {
    o.style.display = o.textContent.toLowerCase().includes(val) ? "" : "none";
  });
}

function faktor() {
  return modus === "360" ? 360 : arbeitstageProJahr;
}

function wirtschaftlichkeit(tarif, tage) {
  return tarif.umlagesatz - (tarif.erstattung / faktor() * tage);
}

function berechneIntervalle(u1) {
  let result = [];
  let current = null;

  for (let t = 0; t <= faktor(); t++) {
    let best = u1.reduce((a, b) =>
      wirtschaftlichkeit(a, t) < wirtschaftlichkeit(b, t) ? a : b
    );

    if (!current || current.tarif !== best) {
      if (current) current.bis = t - 1;
      current = { von: t, bis: null, tarif: best };
      result.push(current);
    }
  }
  if (current) current.bis = faktor();
  return result;
}

function exportCSVAlle() {
  let csv = "Krankenkasse;von;bis;Erstattung (%);Umlagesatz (%)\n";

  [...kassenSelect.selectedOptions].forEach(opt => {
    const kasse = daten[opt.value];
    const intervalle = berechneIntervalle(kasse.u1);
    intervalle.forEach(i => {
      csv += `${kasse.name};${i.von};${i.bis};${i.tarif.erstattung};${i.tarif.umlagesatz}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "u1_sammelexport.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function render() {
  const out = document.getElementById("ergebnisse");
  out.innerHTML = "";

  [...kassenSelect.selectedOptions].forEach(opt => {
    out.appendChild(renderKasse(daten[opt.value]));
  });
}

function renderKasse(kasse) {
  const div = document.createElement("div");
  div.className = "kasse";
  div.innerHTML = `<h3>${kasse.name}</h3>`;

  const intervalle = berechneIntervalle(kasse.u1);
  const verwendete = new Set(intervalle.map(i => i.tarif));

  let html = `<h4>Wirtschaftlich sinnvoller Tarif</h4>`;
  html += "<table><tr><th>von</th><th>bis</th><th>Erstattung</th><th>Umlagesatz</th></tr>";
  intervalle.forEach(i => {
    html += `<tr><td>${i.von}</td><td>${i.bis}</td><td>${i.tarif.erstattung}%</td><td>${i.tarif.umlagesatz}%</td></tr>`;
  });
  html += "</table>";

  html += "<h4>Weitere angebotene Tarife</h4><table><tr><th>Tarif</th><th>Hinweis</th></tr>";
  kasse.u1.forEach(t => {
    if (!verwendete.has(t)) {
      html += `<tr><td>${t.erstattung}% / ${t.umlagesatz}%</td>
        <td class='hinweis'>In keinem Kranktage-Bereich wirtschaftlich optimal</td></tr>`;
    }
  });
  html += "</table>";

  div.innerHTML += html;
  return div;
}
