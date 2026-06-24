import { colors } from "../utils/colors";
import { Icon } from "./Icon";

export const NotesView = ({ notes, lectureId, title }) => {
  const downloadMd = () => {
    const blob = new Blob([`# ${title}\n\n${notes}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}_notes.md`;
    a.click();
  };

  const downloadTxt = () => {
    const blob = new Blob([notes], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}_notes.txt`;
    a.click();
  };

  // Simple markdown renderer
  const renderMd = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const elements = [];
    let tableRows = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="responsive-table-container">
            <div className="table-inner" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {tableRows.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 1, fontFamily: "monospace", fontSize: 13 }}>
                  {line.split("|").filter((_, idx, a) => idx > 0 && idx < a.length - 1).map((cell, j) => (
                    <span key={j} style={{ flex: 1, padding: "6px 10px", background: cell.trim().match(/^[-]+$/) ? "transparent" : colors.bg, color: cell.trim().match(/^[-]+$/) ? "transparent" : colors.text, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                      {cell.trim()}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
        tableRows = [];
      }
    };

    lines.forEach((line, i) => {
      if (line.startsWith("|")) {
        tableRows.push(line);
      } else {
        flushTable();
        if (line.startsWith("# ")) elements.push(<h1 key={i} style={{ color: colors.accentLight, fontSize: 22, fontWeight: 800, margin: "24px 0 12px", borderBottom: `2px solid ${colors.accentDim}`, paddingBottom: 8 }}>{line.slice(2)}</h1>);
        else if (line.startsWith("## ")) elements.push(<h2 key={i} style={{ color: colors.text, fontSize: 18, fontWeight: 700, margin: "20px 0 8px" }}>{line.slice(3)}</h2>);
        else if (line.startsWith("### ")) elements.push(<h3 key={i} style={{ color: colors.textMuted, fontSize: 15, fontWeight: 600, margin: "16px 0 6px" }}>{line.slice(4)}</h3>);
        else if (line.startsWith("- ") || line.startsWith("* ")) elements.push(<li key={i} style={{ color: colors.text, fontSize: 14, lineHeight: 1.7, marginLeft: 20, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#A5B4FC">$1</strong>').replace(/\`(.*?)\`/g, '<code style="background:#1E293B;padding:2px 6px;border-radius:4px;font-size:12px;color:#10B981">$1</code>') }} />);
        else if (line.trim() === "") elements.push(<div key={i} style={{ height: 8 }} />);
        else elements.push(<p key={i} style={{ color: colors.text, fontSize: 14, lineHeight: 1.8, margin: "4px 0" }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#A5B4FC">$1</strong>').replace(/\`(.*?)\`/g, '<code style="background:#1E293B;padding:2px 6px;border-radius:4px;font-size:12px;color:#10B981">$1</code>') }} />);
      }
    });
    
    flushTable();
    return elements;
  };

  return (
    <div className="printable-content">
      <div className="no-print notes-actions" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={downloadMd} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "8px 14px", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon name="download" size={14} /> Markdown
        </button>
        <button onClick={downloadTxt} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "8px 14px", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon name="download" size={14} /> Text
        </button>
        <button onClick={() => window.print()} style={{ background: colors.accent, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon name="download" size={14} /> Save as PDF
        </button>
      </div>
      <div style={{ background: colors.surface, borderRadius: 16, padding: 28, border: `1px solid ${colors.border}`, lineHeight: 1.8 }} className="printable-content-box">
        <div className="print-only" style={{ display: "none", marginBottom: 20, borderBottom: "2px solid #000", paddingBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
          <div style={{ fontSize: 12, color: "#666", marginTop: 5 }}>Generated by MindScribe AI on {new Date().toLocaleDateString()}</div>
        </div>
        {renderMd(notes)}
      </div>
    </div>
  );
};
