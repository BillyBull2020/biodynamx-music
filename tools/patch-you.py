"""One-shot patcher: show the app version and an update check in the You tab."""
import io

P = r"www/js/ui/screens/you.js"
s = io.open(P, encoding="utf-8").read()

# 1) import the version label
imp_anchor = "import { backButton, progressBar, segmented, starsEl, topbar } from '../components.js';"
imp_add = "\nimport { VERSION_LABEL } from '../../version.js';"
assert s.count(imp_anchor) == 1, f"import anchor {s.count(imp_anchor)}"
if "../../version.js" not in s:
    s = s.replace(imp_anchor, imp_anchor + imp_add)

# 2) footer: version pill + update check
foot_anchor = """    el('p.tiny', {
      style: { textAlign: 'center', marginTop: '22px', lineHeight: '1.6' },
      text: 'Bio Dynamx Music \u00b7 no account, no subscription, nothing leaves this device. All songs are public domain or written for this app.',
    }),
  ]);"""
foot_new = """    el('p.tiny', {
      style: { textAlign: 'center', marginTop: '22px', lineHeight: '1.6' },
      text: 'Bio Dynamx Music \u00b7 no account, no subscription, nothing leaves this device. All songs are public domain or written for this app.',
    }),
    el('div.center', { style: { marginTop: '12px' } }, [el('span.pill', { text: VERSION_LABEL })]),
    el('div.center', { style: { marginTop: '8px' } }, [
      el('button.btn.btn--sm.btn--ghost', {
        type: 'button',
        text: 'Check for updates',
        onclick: async () => {
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            if (!reg) {
              toast('Not installed as an app, so this copy always loads fresh.', '', 3400);
              return;
            }
            await reg.update();
            toast('Checked. If a newer version exists a Reload banner appears.', 'ok', 3600);
          } catch {
            toast('Could not check for updates.', 'warn');
          }
        },
      }),
    ]),
  ]);"""

assert s.count(foot_anchor) == 1, f"footer anchor {s.count(foot_anchor)}"
s = s.replace(foot_anchor, foot_new)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("you.js patched: version pill + update check")
