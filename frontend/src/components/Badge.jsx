import { colors } from "../utils/colors";

export const Badge = ({ children, color = "accent" }) => {
  const map = { accent: [colors.accentDim, colors.accentLight], green: [colors.greenDim, colors.green], yellow: [colors.yellowDim, colors.yellow], red: [colors.redDim, colors.red] };
  const [bg, txt] = map[color] || map.accent;
  return <span style={{ background: bg, color: txt, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>{children}</span>;
};
