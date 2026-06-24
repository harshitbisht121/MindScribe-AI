import { colors } from "../utils/colors";
import { Icon } from "./Icon";

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="tabs-container" style={{ background: colors.bg, borderRadius: 10, padding: 4 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, transition: "all 0.2s",
        background: active === t.id ? colors.accent : "transparent",
        color: active === t.id ? "#fff" : colors.textMuted,
      }}>
        {t.icon && <Icon name={t.icon} size={14} />} {t.label}
        {t.badge && <span style={{ background: active === t.id ? "rgba(255,255,255,0.3)" : colors.accentDim, color: active === t.id ? "#fff" : colors.accentLight, padding: "0 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{t.badge}</span>}
      </button>
    ))}
  </div>
);
