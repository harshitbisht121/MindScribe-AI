import { useState } from "react";
import { colors } from "../utils/colors";
import { Icon } from "../components/Icon";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { api } from "../utils/api";

export const SearchPanel = ({ lectures }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const r = await api.search(query);
    setResults(r);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={16} color={colors.textDim} /></div>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search across all lectures..."
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 16px 12px 42px", color: colors.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <button onClick={doSearch} style={{ background: colors.accent, border: "none", borderRadius: 12, padding: "12px 20px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
          {loading ? <Spinner /> : "Search"}
        </button>
      </div>

      {results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: colors.textMuted, fontSize: 13 }}>{results.total} lecture(s) found</div>
          {results.results.map(r => (
            <div key={r.lecture_id} style={{ background: colors.surface, borderRadius: 14, padding: 18, border: `1px solid ${colors.border}` }}>
              <div style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{r.title}</div>
              {r.matches.map((m, i) => (
                <div key={i} style={{ background: colors.bg, borderRadius: 8, padding: 12, marginBottom: 8, borderLeft: `3px solid ${colors.accent}` }}>
                  <Badge color="accent">{m.type}</Badge>
                  <div style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                    ...{m.context?.replace(new RegExp(query, "gi"), (match) => `**${match}**`)}...
                  </div>
                </div>
              ))}
            </div>
          ))}
          {results.total === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>
              <Icon name="search" size={40} color={colors.textDim} />
              <div style={{ marginTop: 12 }}>No results found for "{query}"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
