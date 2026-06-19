import { colors } from "../utils/colors";

export const ProgressBar = ({ value, color = colors.accent }) => (
  <div style={{ background: colors.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
    <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.5s ease" }} />
  </div>
);
