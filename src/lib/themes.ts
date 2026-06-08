export const themes = {
    dark: {
        pageBg: "bg-[#0a0a0a]", sidebarBg: "bg-[#141414]", cardBg: "bg-[#141414]", headerBg: "bg-[#141414]/50", inputBg: "bg-[#1f1f1f]",
        textPrimary: "text-white", textSecondary: "text-gray-100", textMuted: "text-gray-300", textHeading: "text-white", textWhite: "text-white", textBright: "text-white",
        bg: "bg-white", borderColor: "border-white/5", borderHover: "border-white/10", tableRowHover: "hover:bg-white/[0.02]", tableDivide: "divide-white/5",
        primary: "#3b82f6", accentBg: "bg-blue-600", accentHover: "hover:bg-blue-500", accentText: "text-blue-400", accentShadow: "shadow-blue-500/20",
        badgeBg: "bg-blue-500/10", badgeBorder: "border-blue-500/20", overlayBg: "bg-black/50",
    },
    light: {
        pageBg: "bg-gray-50", sidebarBg: "bg-white", cardBg: "bg-white", headerBg: "bg-white/80", inputBg: "bg-gray-100",
        textPrimary: "text-black", textSecondary: "text-gray-900", textMuted: "text-gray-700", textHeading: "text-black", textWhite: "text-black", textBright: "text-black",
        bg: "bg-gray-700", borderColor: "border-gray-200", borderHover: "border-gray-300", tableRowHover: "hover:bg-gray-50", tableDivide: "divide-gray-200",
        primary: "#3b82f6", accentBg: "bg-blue-600", accentHover: "hover:bg-blue-500", accentText: "text-blue-600", accentShadow: "shadow-blue-500/20",
        badgeBg: "bg-blue-50", badgeBorder: "border-blue-200", overlayBg: "bg-black/30",
    },
};

export type Theme = typeof themes.dark;
export type ThemeName = keyof typeof themes;
