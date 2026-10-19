import { checkText, needsCare } from "../src/lib/moderation/text";
const cases: [string, "public" | "dm" | "profile", string | null][] = [
  // should pass
  ["My exes? One cried at a Cheesecake Factory. One stole my dog.", "public", null],
  ["I'd let him top me in a heartbeat. Those forearms.", "public", null],
  ["Who wants to split an Uber to the bar Saturday? Venmo me $12", "public", null],
  ["Need ice for the cooler, anyone bringing some?", "public", null],
  ["Tina from work set us up lol", "public", null],
  ["I was 16 when I first kissed a guy", "public", null],
  ["I'm 17 minutes away", "dm", null],
  ["We should hit the gay bars downtown", "public", null],
  ["Party tonight at my place, bring drinks", "public", null],
  ["I'll kill you if you spoil the finale", "public", null],
  ["No rice tonight, making tacos", "public", null],
  ["Blow dry my hair and let's go", "public", null],
  ["text me 941-555-0134", "dm", null],
  ["that fag hag energy is unmatched lol", "public", null],
  ["I paid $60 for that massage and it was worth it", "public", null],
  ["Diet coke and a bump of gossip", "public", null],
  // should flag
  ["Generous guy looking to pay $200 for an hour of fun, cashapp ready", "dm", "solicitation:clear"],
  ["Rates start at 150, incall only", "dm", "solicitation:clear"],
  ["anyone pnp tonight?", "dm", "drugs:clear"],
  ["Looking to parTy this weekend", "public", "drugs:clear"],
  ["who has molly for saturday", "public", "drugs:clear"],
  ["anyone got some ice? hmu", "dm", "drugs:maybe"],
  ["Check my OnlyFans, link in bio", "public", "spam:clear"],
  ["Call me 941-555-0134", "public", "contact:clear"],
  ["No fats, no fems, no Asians", "profile", "hate:clear"],
  ["Masc only, sorry", "profile", "hate:clear"],
  ["im 16 years old lol", "dm", "minor:maybe"],
  ["hooked up with a 16 yo boy last night", "public", "minor:clear"],
  ["kys", "dm", "threat:clear"],
  ["I'll tell your wife about us", "dm", "threat:clear"],
  ["I'm gonna kill you", "dm", "threat:maybe"],
];
let fail = 0;
for (const [text, surface, want] of cases) {
  const h = checkText(text, surface);
  const got = h ? `${h.category}:${h.level}` : null;
  const ok = got === want;
  if (!ok) fail++;
  console.log(ok ? "ok  " : "FAIL", JSON.stringify(text), "→", got, h ? `(${h.match})` : "", ok ? "" : `wanted ${want}`);
}
console.log("care:", needsCare("honestly I want to die"), needsCare("I'm dying laughing, I want to die lol"));
console.log(fail ? `${fail} failed` : "all passed");
