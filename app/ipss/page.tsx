"use client";
import { useState } from "react";

const QS = [
  { id:1, cat:"Tømning", q:"Har du svag stråle, når du lader vandet?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:2, cat:"Tømning", q:"Stopper og starter strålen, mens du lader vandet?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:3, cat:"Tømning", q:"Skal du presse for at starte vandladningen?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:4, cat:"Tømning", q:"Tager det lang tid at lade vandet?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:5, cat:"Fyldning", q:"Lader du vandet hyppigere end tidligere?", opts:["Nej","Ja, lidt hyppigere","Ja, noget hyppigere","Ja, meget hyppigere"] },
  { id:6, cat:"Fyldning", q:"Er det svært at vente, når du får trang?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:7, cat:"Fyldning", q:"Skal du op om natten for at lade vandet?", opts:["Nej","Ja, 1 gang","Ja, 2-3 gange","Ja, 4+ gange"] },
  { id:8, cat:"Fyldning", q:"Har du ufrivillig urinafgang?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:9, cat:"Andre", q:"Fornemmelse af at blæren ikke er helt tømt?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:10, cat:"Andre", q:"Drypper det efter vandladningen?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:11, cat:"Andre", q:"Smerter eller svie ved vandladning?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:12, cat:"Andre", q:"Blod i urinen?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:13, cat:"Seksuel", q:"Problemer med at få rejsning?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:14, cat:"Seksuel", q:"Problemer med at gennemføre samleje?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
  { id:15, cat:"Seksuel", q:"Problemer med sædafgang?", opts:["Nej","Ja, af og til","Ja, som regel","Ja, altid"] },
];
const GENE = ["Slet ikke","Lidt generet","Noget generet","Meget generet"];

type Step = "intro" | "questions" | "result";

export default function IPSSPage() {
  const [step, setStep] = useState<Step>("intro");
  const [skipSex, setSkipSex] = useState(false);
  const [answers, setAnswers] = useState<Record<number,{a:number;b:number}>>({});
  const [qi, setQi] = useState(0);
  const qs = skipSex ? QS.filter((q) => q.cat !== "Seksuel") : QS;
  const q = qs[qi];

  function setA(id: number, a: number) { setAnswers((p) => ({ ...p, [id]: { a, b: a === 0 ? 0 : (p[id]?.b ?? 0) } })); }
  function setB(id: number, b: number) { setAnswers((p) => ({ ...p, [id]: { ...p[id], b } })); }

  if (step === "intro") return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">DAN-PSS</h1>
      <p className="text-[var(--muted)] mb-6">Dansk Prostata Symptom Score — 12 spørgsmål om vandladning + 3 valgfrie om seksualfunktion.</p>
      <div className="rounded-2xl p-4 mb-6" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
        <p className="font-semibold mb-3">Inkluder seksualfunktion?</p>
        <p className="text-xs text-[var(--muted)] mb-3">Sp. 13-15 er valgfrie og tæller ikke med i samlet score.</p>
        <div className="flex gap-3">{[false,true].map((v) => (<button key={String(v)} onClick={() => setSkipSex(v)} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ background:skipSex===v?"var(--accent)":"var(--surface)", borderColor:skipSex===v?"var(--accent)":"var(--border)", color:skipSex===v?"#fff":"var(--text)" }}>{v?"Nej, spring over":"Ja"}</button>))}</div>
      </div>
      <button onClick={() => { setStep("questions"); setQi(0); setAnswers({}); }} className="w-full py-5 rounded-2xl text-xl font-bold" style={{ background:"var(--accent)", color:"#fff" }}>Start skema →</button>
    </div>
  );

  if (step === "questions" && q) {
    const ans = answers[q.id];
    const pct = ((qi+1)/qs.length)*100;
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-4"><span className="text-sm text-[var(--muted)]">{qi+1}/{qs.length}</span><div className="flex-1 h-2 rounded-full" style={{ background:"var(--border)" }}><div className="h-2 rounded-full" style={{ width:`${pct}%`, background:"var(--accent)" }} /></div></div>
        <p className="text-xs font-semibold mb-1" style={{ color:"var(--accent)" }}>{q.cat}</p>
        <h2 className="text-xl font-bold mb-4">Sp. {q.id}: {q.q}</h2>
        <div className="space-y-2 mb-6">{q.opts.map((o,i) => (<button key={i} onClick={() => setA(q.id,i)} className="w-full py-3 px-4 rounded-xl border-2 text-left font-medium" style={{ background:ans?.a===i?"var(--accent)":"var(--surface)", borderColor:ans?.a===i?"var(--accent)":"var(--border)", color:ans?.a===i?"#fff":"var(--text)" }}>{o}</button>))}</div>
        {ans && ans.a > 0 && <><p className="font-semibold mb-3">Hvor meget er du generet?</p><div className="space-y-2 mb-6">{GENE.map((o,i) => (<button key={i} onClick={() => setB(q.id,i)} className="w-full py-3 px-4 rounded-xl border-2 text-left font-medium" style={{ background:ans?.b===i?"var(--warning)":"var(--surface)", borderColor:ans?.b===i?"var(--warning)":"var(--border)", color:ans?.b===i?"#000":"var(--text)" }}>{o}</button>))}</div></>}
        <div className="flex gap-3"><button onClick={() => qi>0?setQi(qi-1):setStep("intro")} className="flex-1 py-4 rounded-2xl font-semibold" style={{ background:"var(--surface)", border:"2px solid var(--border)", color:"var(--muted)" }}>{qi>0?"← Forrige":"Annuller"}</button><button onClick={() => qi<qs.length-1?setQi(qi+1):setStep("result")} disabled={!ans} className="flex-grow py-4 rounded-2xl font-bold disabled:opacity-40" style={{ background:"var(--accent)", color:"#fff" }}>{qi===qs.length-1?"Se resultat":"Næste →"}</button></div>
      </div>
    );
  }

  if (step === "result") {
    const main = QS.filter((q) => q.cat !== "Seksuel");
    const sex = QS.filter((q) => q.cat === "Seksuel");
    const total = main.reduce((s,q) => s + (answers[q.id]?.a??0) * (answers[q.id]?.b??0), 0);
    const sexTotal = sex.reduce((s,q) => s + (answers[q.id]?.a??0) * (answers[q.id]?.b??0), 0);
    const sev = total >= 25 ? "Svære" : total >= 13 ? "Moderate" : "Lette";
    const sevColor = total >= 25 ? "var(--danger)" : total >= 13 ? "var(--warning)" : "var(--success)";
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">DAN-PSS Resultat</h1>
        <div className="rounded-2xl p-6 mb-6 text-center" style={{ border:`2px solid ${sevColor}` }}><p className="text-6xl font-bold" style={{ color:sevColor }}>{total}</p><p className="text-lg font-semibold mt-1" style={{ color:sevColor }}>{sev} symptomer</p><p className="text-xs text-[var(--muted)] mt-2">Skala 0-108 · Let: 0-12 · Moderat: 13-24 · Svær: 25+</p></div>
        {!skipSex && <div className="rounded-xl p-4 mb-6" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}><p className="font-semibold">❤️ Seksualfunktion (separat): {sexTotal}</p><p className="text-xs text-[var(--muted)]">Tæller ikke med i samlet score</p></div>}
        <button onClick={() => { setStep("intro"); setAnswers({}); setQi(0); }} className="w-full py-4 rounded-2xl text-lg font-bold" style={{ background:"var(--accent)", color:"#fff" }}>🔄 Udfyld igen</button>
        <p className="text-xs text-[var(--muted)] text-center mt-6">DAN-PSS erstatter ikke lægelig vurdering. Kilde: DSAM Bilag 2.</p>
      </div>
    );
  }
  return null;
}
