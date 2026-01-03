var daten = [];

function filterKassen() {
  var input = document.getElementById("kassenSuche");
  var filter = input.value.toLowerCase();
  var select = document.getElementById("kassenSelect");
  var options = select.options;
  var i;

  for (i = 0; i < options.length; i++) {
    var txt = options[i].text.toLowerCase();
    if (txt.indexOf(filter) > -1) {
      options[i].style.display = "";
    } else {
      options[i].style.display = "none";
    }
  }
}

function render() {
  var out = document.getElementById("ergebnisse");
  out.innerHTML = "";

  var sel = document.getElementById("kassenSelect");
  var opts = sel.selectedOptions;
  var i;

  for (i = 0; i < opts.length; i++) {
    var kasse = daten[opts[i].value];
    var div = document.createElement("div");
    div.className = "kasse";

    var h = document.createElement("h3");
    h.appendChild(document.createTextNode(kasse.kasse));
    div.appendChild(h);

    out.appendChild(div);
  }
}

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

      var suche = document.getElementById("kassenSuche");
      suche.onkeyup = filterKassen;
    }
  };
  xhr.send();
}

window.onload = init;
