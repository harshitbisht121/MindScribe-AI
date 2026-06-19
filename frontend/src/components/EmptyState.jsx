import { colors } from "../utils/colors";
import { Icon } from "./Icon";

export const EmptyState = ({ icon, message, processing }) => (
  <div style={{ textAlign: "center", padding: 60, color: colors.textMuted }}>
    {processing ? <Icon name="spinner" size={40} color={colors.accent} /> : <Icon name={icon} size={40} color={colors.textDim} />}
    <div style={{ marginTop: 12, fontSize: 14 }}>{message}</div>
  </div>
);
