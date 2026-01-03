fetch('data/krankenkassen_u1.json').then(r=>r.json()).then(d=>{
const s=document.getElementById('kassenSelect');
d.sort((a,b)=>a.name.localeCompare(b.name,'de'));
d.forEach((k,i)=>{const o=document.createElement('option');o.value=i;o.text=k.name;s.appendChild(o)});
});