let data = null;

async function loadData() {
  const response = await fetch('u1-stammdaten-2026.json');
  data = await response.json();
  populateKassen();
}

function populateKassen() {
  const select = document.getElementById('kasseSelect');
  data.krankenkassen.forEach(kasse => {
    const option = document.createElement('option');
    option.value = kasse.bnr;
    option.textContent = kasse.name;
    select.appendChild(option);
  });
}

function calculateBreakEven(tariffs, workdaysPerWeek) {
  const sorted = tariffs.slice().sort((a,b) => a.erstattung - b.erstattung);
  const results = [];
  const daysPerYear = workdaysPerWeek * 52;
  
  for(let i=0; i<sorted.length-1; i++) {
    const t1 = sorted[i];
    const t2 = sorted[i+1];
    const breakEvenQuote = (t2.umlagesatz - t1.umlagesatz)/(t2.erstattung - t1.erstattung);
    const breakEvenDays = breakEvenQuote/100 * daysPerYear;
    results.push({
      von: t1.erstattung + '%',
      nach: t2.erstattung + '%',
      breakEvenQuote: (breakEvenQuote*100).toFixed(2) + '%',
      breakEvenDays: breakEvenDays.toFixed(1)
    });
  }
  return results;
}

document.getElementById('calculateBtn').addEventListener('click', () => {
  const bnr = document.getElementById('kasseSelect').value;
  const workdays = parseInt(document.getElementById('workdaysInput').value, 10);
  const kasse = data.krankenkassen.find(k => k.bnr === bnr);
  const results = calculateBreakEven(kasse.u1_tarife, workdays);
  displayResults(results);
});

function displayResults(results) {
  const div = document.getElementById('results');
  div.innerHTML = '';
  results.forEach(r => {
    const p = document.createElement('p');
    p.textContent = `Von ${r.von} zu ${r.nach}: Break-Even bei ${r.breakEvenDays} Tagen (${r.breakEvenQuote})`;
    div.appendChild(p);
  });
}

loadData();
