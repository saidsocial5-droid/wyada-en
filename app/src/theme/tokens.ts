// generated from replica/design/tokens.json by build-tokens.mjs: do not edit
export const palettes = {
  "light": {
    "bg": "#FBF8F3",
    "surface": "#FFFFFF",
    "surface-sunken": "#F2EDE4",
    "border": "#E3DACB",
    "border-input": "#8A7F70",
    "text": "#1C1B2E",
    "text-muted": "#5B5768",
    "text-disabled": "#9C97A6",
    "accent": "#2E48D4",
    "accent-edge": "#1D2F96",
    "accent-soft": "#E6EAFC",
    "on-accent": "#FFFFFF",
    "on-accent-soft": "#1D2F96",
    "reward": "#F4A81D",
    "reward-edge": "#C27D00",
    "on-reward": "#1C1B2E",
    "success": "#0B7F57",
    "success-edge": "#075A3D",
    "success-soft": "#E1F5EC",
    "on-success": "#FFFFFF",
    "on-success-soft": "#065238",
    "danger": "#C8302A",
    "danger-edge": "#8F1F1A",
    "danger-soft": "#FCE7E5",
    "on-danger": "#FFFFFF",
    "on-danger-soft": "#8A1C17",
    "warning-soft": "#FFF2D6",
    "on-warning-soft": "#7A4A00",
    "icon-streak": "#D9580A",
    "icon-gem": "#0B83A8",
    "icon-energy": "#B07800",
    "icon-xp": "#6D3FD8",
    "locked": "#E3DACB",
    "on-locked": "#6F6A7A",
    "focus-ring": "#2E48D4",
    "scrim": "#1C1B2ECC"
  },
  "dark": {
    "bg": "#121120",
    "surface": "#1C1B2E",
    "surface-sunken": "#0D0C18",
    "border": "#34314C",
    "border-input": "#7C7896",
    "text": "#F5F2EB",
    "text-muted": "#B5B0C6",
    "text-disabled": "#6E6A82",
    "accent": "#8B9BFF",
    "accent-edge": "#5566D6",
    "accent-soft": "#262A52",
    "on-accent": "#0D0C18",
    "on-accent-soft": "#C9D0FF",
    "reward": "#F7B84A",
    "reward-edge": "#C98A1A",
    "on-reward": "#0D0C18",
    "success": "#3FD49C",
    "success-edge": "#22A673",
    "success-soft": "#13332A",
    "on-success": "#0D0C18",
    "on-success-soft": "#8EEBC6",
    "danger": "#FF7F75",
    "danger-edge": "#D2524A",
    "danger-soft": "#3A1C1F",
    "on-danger": "#0D0C18",
    "on-danger-soft": "#FFB8B1",
    "warning-soft": "#3A2E14",
    "on-warning-soft": "#FFD98A",
    "icon-streak": "#FF9442",
    "icon-gem": "#4FC8EC",
    "icon-energy": "#F2C14E",
    "icon-xp": "#B394FF",
    "locked": "#34314C",
    "on-locked": "#A39FB6",
    "focus-ring": "#8B9BFF",
    "scrim": "#000000CC"
  }
} as const;
export type ColorRole = keyof typeof palettes.light;
export type Palette = Record<ColorRole, string>;
export const unitColors = {
  "unit-1": [
    "#2E48D4",
    "#FFFFFF"
  ],
  "unit-2": [
    "#A65A17",
    "#FFFFFF"
  ],
  "unit-3": [
    "#0B7A80",
    "#FFFFFF"
  ],
  "unit-4": [
    "#B23A63",
    "#FFFFFF"
  ],
  "unit-5": [
    "#5B3FB8",
    "#FFFFFF"
  ],
  "unit-6": [
    "#3F6B2A",
    "#FFFFFF"
  ]
} as const;
export const type = {
  "family": {
    "sans": "ReadexPro"
  },
  "weight": {
    "regular": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700
  },
  "scale": {
    "xs": {
      "size": 12,
      "line": 16
    },
    "sm": {
      "size": 14,
      "line": 20
    },
    "md": {
      "size": 16,
      "line": 24
    },
    "lg": {
      "size": 18,
      "line": 26
    },
    "xl": {
      "size": 22,
      "line": 30
    },
    "2xl": {
      "size": 28,
      "line": 36
    },
    "3xl": {
      "size": 36,
      "line": 44
    }
  },
  "arabic_line_multiplier": 1.15,
  "min_body": 16,
  "note": "Exercise prompts use lg/xl. Answers typed by the learner are always LTR English."
} as const;
export const space = {"0":0,"1":4,"2":8,"3":12,"4":16,"5":20,"6":24,"8":32,"10":40,"12":48,"16":64} as const;
export const radius = {"sm":8,"md":12,"lg":16,"xl":24,"pill":999} as const;
export const depth = {"note":"Pressable 3D look: a solid bottom edge in the *-edge colour; pressed = edge 0 and translateY(edge).","edge-sm":3,"edge-md":4,"edge-lg":5} as const;
export const motion = {"fast":120,"base":200,"slow":360,"spring":{"damping":14,"stiffness":180},"reduce_motion":"honour AccessibilityInfo.isReduceMotionEnabled: no bounce, no confetti, fades only"} as const;
export const layout = {"max_content":560,"gutter":16,"tap_min":48,"header":56,"bottom_nav":64,"lesson_footer":96,"breakpoints":{"tablet":600,"desktop":1024}} as const;
