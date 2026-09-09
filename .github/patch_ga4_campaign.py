from pathlib import Path

p = Path("index.html")
t = p.read_text(encoding="utf-8")
old = '''      url.searchParams.set("utm_source", "user_share");
      url.searchParams.set("utm_medium", "share");
      url.searchParams.set("utm_campaign", "battle_item_manager");'''
new = '''      url.searchParams.set("utm_source", "user_share");
      url.searchParams.set("utm_medium", "referral");
      url.searchParams.set("utm_campaign", "live_glove_copy_202609");
      url.searchParams.set("utm_content", "in_app_share");'''

if old not in t:
    if 'utm_campaign", "live_glove_copy_202609' in t:
        print("Already updated")
        raise SystemExit(0)
    raise SystemExit("UTM anchor not found")

p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("Updated GA4 share UTM tags")
