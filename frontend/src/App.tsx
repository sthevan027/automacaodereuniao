import { Link, NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { MeetingDetailPage } from "./pages/MeetingDetail";

function App() {
  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-sm font-semibold tracking-wide text-zinc-100">
            Automação de Reuniões
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-1.5",
                  isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900"
                ].join(" ")
              }
            >
              Reuniões
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
