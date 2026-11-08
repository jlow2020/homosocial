// The emoji picker's grid, grouped the way a phone keyboard is. Anything else
// can still be typed from the keyboard.
export const EMOJI_GROUPS: { name: string; list: string[] }[] = [
  {
    name: "Faces",
    list: "😂 🤣 😭 🥹 😍 🥰 😘 😏 😈 🥵 🫦 🤤 😮 😳 🤯 🫣 🤭 🙈 😅 😆 😊 🙂 😉 😜 🤪 😎 🤓 🥸 🤔 🫠 😐 🙄 😬 😴 😪 😢 🥲 😤 😡 🤬 🥺 😱 🤢 🤮 🤧 🥴 😇 🤠 🥳 💀 👻 🤡 👽 🤖 💩"
      .split(" "),
  },
  {
    name: "Hearts",
    list: "❤️ 🩷 🧡 💛 💚 🩵 💙 💜 🖤 🤍 🤎 ❤️‍🔥 💔 💕 💞 💓 💗 💖 💘 💝 💋 💯 💢 💥 💫 💦 💨".split(" "),
  },
  {
    name: "Hands and people",
    list: "👍 👎 👏 🙌 🙏 🤝 👊 ✊ 🤞 🤟 🤘 👌 🤌 🤏 ✌️ 👋 🫶 💪 🦵 👀 👅 👄 🫡 💅 🕺 💃 👯 🧖 🏳️‍🌈 🏳️‍⚧️ 🌈 👑 🎩 🧢 👙 🩲 👟".split(" "),
  },
  {
    name: "Food and drink",
    list: "🍑 🍆 🍌 🍒 🌶️ 🥑 🍕 🍔 🌮 🍣 🍜 🍩 🍪 🎂 🍿 ☕ 🧋 🍺 🍻 🥂 🍷 🍸 🍹 🥃 🍾 🧊".split(" "),
  },
  {
    name: "Fun",
    list: "🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊 🎈 🎁 🏆 🥇 🎯 🎮 🎲 🎤 🎧 🎶 🎬 📸 💸 💰 💎 🔒 🗝️ 🚀 ✈️ 🏖️ 🌴 🌊 🏔️ 🏕️ 🌙 ☀️ 🌧️ ❄️ 🌹 🌸 🌻 🍀".split(" "),
  },
  {
    name: "Animals",
    list: "🐻 🐻‍❄️ 🦦 🐶 🐱 🐰 🦊 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙊 🐔 🦄 🐝 🦋 🐙 🦀 🐬 🦈 🐍 🦖".split(" "),
  },
  {
    name: "Symbols",
    list: "✅ ❌ ❓ ❗ ‼️ ⁉️ 💤 🆗 🆒 🆕 🔞 🚩 🏁 ⚠️ ♻️ ➕ 💬 👁️‍🗨️ 🕐 📍".split(" "),
  },
];

const PICTO = /\p{Extended_Pictographic}/u;
const ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\p{Emoji_Modifier}|‍|️|⃣)+$/u;
const FLAG = /^\p{Regional_Indicator}{2}$/u;

// One emoji, nothing else: what reactions accept.
export function isOneEmoji(s: string): boolean {
  if (!s || s.length > 16) return false;
  if (FLAG.test(s)) return true;
  if (!ONLY.test(s) || !PICTO.test(s)) return false;
  return graphemes(s).length === 1;
}

// The first emoji someone typed, from the keyboard's emoji pad.
export function firstEmoji(s: string): string | null {
  for (const g of graphemes(s)) if (isOneEmoji(g)) return g;
  return null;
}

function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  return [...s];
}
