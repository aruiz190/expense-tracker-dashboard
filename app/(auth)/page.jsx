"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import { startOfMonth, format } from "date-fns";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { categories } from "../lib/categories";

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [txs, setTxs] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "Food",
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc")
    );
    return onSnapshot(q, (snap) => {
      setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const stats = useMemo(() => {
    const mStart = startOfMonth(new Date()).toISOString().slice(0, 10);
    let income = 0, expense = 0;
    const byCategory = {};
    for (const t of txs) {
      if (t.date < mStart) continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + (t.type==='income' ? t.amount : -t.amount);
    }
    return { income, expense, net: income - expense, byCategory };
  }, [txs]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!user) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return alert("Enter a positive amount.");
    await addDoc(collection(db, "users", user.uid, "transactions"), {
      amount,
      type: form.type,
      category: form.category,
      date: form.date,      // YYYY-MM-DD
      note: form.note,
      createdAt: serverTimestamp()
    });
    setForm((f) => ({ ...f, amount: "", note: "" }));
  }

  function login() { signInWithPopup(auth, googleProvider); }
  function logout() { signOut(auth); }

  if (!user) {
    return (
      <>
        <h1>Expense Tracker Dashboard</h1>
        <p className="badge">Firebase Auth + Firestore + Charts</p>
        <div className="card" style={{marginTop:16}}>
          <h2>Sign in</h2>
          <button className="btn" onClick={login}>Continue with Google</button>
        </div>
      </>
    );
  }

  const barData = {
    labels: Object.keys(stats.byCategory),
    datasets: [{
      label: "Net by Category (this month)",
      data: Object.values(stats.byCategory),
      backgroundColor: Object.keys(stats.byCategory).map(() => "rgba(124,92,255,0.7)")
    }]
  };

  const pieData = {
    labels: ["Income", "Expense"],
    datasets: [{
      data: [stats.income, stats.expense],
      backgroundColor: ["rgba(48,209,88,0.7)", "rgba(255,92,122,0.7)"]
    }]
  };

  return (
    <>
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h1>Expense Tracker Dashboard</h1>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <span className="badge">Logged in as {user.displayName || user.email}</span>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="row grid-3" style={{marginTop:16}}>
        <div className="card"><h2>Income (this month)</h2><div style={{fontSize:28, color:"var(--success)"}}>${stats.income.toFixed(2)}</div></div>
        <div className="card"><h2>Expense (this month)</h2><div style={{fontSize:28, color:"var(--danger)"}}>${stats.expense.toFixed(2)}</div></div>
        <div className="card"><h2>Net</h2><div style={{fontSize:28, color: stats.net>=0 ? "var(--success)" : "var(--danger)"}}>${stats.net.toFixed(2)}</div></div>
      </div>

      <div className="row grid-2" style={{marginTop:16}}>
        <div className="card">
          <h2>Add Transaction</h2>
          <form onSubmit={handleAdd} className="row" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
            <div>
              <label>Amount</label>
              <input className="input" type="number" step="0.01"
                value={form.amount}
                onChange={e => setForm(f=>({...f, amount:e.target.value}))}/>
            </div>
            <div>
              <label>Type</label>
              <select className="select" value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label>Category</label>
              <select className="select" value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))}>
                {categories.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Date</label>
              <input className="input" type="date"
                value={form.date}
                onChange={e=>setForm(f=>({...f, date:e.target.value}))}/>
            </div>
            <div>
              <label>Note</label>
              <input className="input" type="text" placeholder="optional"
                value={form.note}
                onChange={e=>setForm(f=>({...f, note:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <button type="submit" className="btn">Add</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Breakdown (this month)</h2>
          {Object.keys(stats.byCategory).length ? <Bar data={barData} /> : <div className="empty">Add a few transactions to see charts.</div>}
          <div className="hr" />
          <div style={{maxWidth:320, margin:"0 auto"}}><Pie data={pieData} /></div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h2>All Transactions</h2>
        {!txs.length ? (
          <div className="empty">No transactions yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {txs.map(t=>(
                <tr key={t.id}>
                  <td>{format(new Date(t.date+"T00:00:00"), "MMM d, yyyy")}</td>
                  <td><span className={`tag ${t.type}`}>{t.type}</span></td>
                  <td>{t.category}</td>
                  <td style={{color:"var(--muted)"}}>{t.note || "-"}</td>
                  <td style={{color: t.type==='income' ? "var(--success)" : "var(--danger)"}}>
                    {t.type==='income' ? "+" : "-"}${t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

