import os
import re

EMOJI_MAP = {
    "🌾": "grass_hay", "🌿": "grass_meadow", "🌱": "grass_spiky", "𓂃": "grain_wheat", "✿": "grain", "◈": "grain_flour",
    "🪵": "wood_log", "▤": "wood_plank", "▦": "wood_beam",
    "◉": "berry", "◎": "berry_jam",
    "◯": "bird_egg", "🦃": "bird_turkey", "☘": "bird_clover", "🍈": "bird_melon",
    "🥕": "veg_carrot", "🍆": "veg_eggplant", "🥬": "veg_turnip", "🫜": "veg_beet", "🥒": "veg_cucumber", "🎃": "veg_squash", "🍄": "veg_mushroom", "🌶": "veg_pepper", "🥦": "veg_broccoli",
    "🍲": "soup", "🥧": "pie", "🍯": "honey", "🍖": "meat", "🥛": "milk", "🧲": "horseshoe", "🥚": "eggs", "🍞": "bread", "🌽": "grain_corn",
    "✨": "ui_star", "🍎": "fruit_apple", "🍐": "fruit_pear", "🍏": "fruit_golden_apple", "🫐": "fruit_blackberry", "⭐": "fruit_starfruit", "🥥": "fruit_coconut", "🍋": "fruit_lemon",
    "🔒": "ui_lock", "▶": "ui_enter", "⛏": "ui_build", "⚓": "ui_enter", "✖": "ui_cancel", "🔨": "ui_build", "📍": "ui_pin",
    "⚙": "ui_settings", "📋": "ui_clipboard", "🏡": "ui_home", "🏆": "ui_trophy", "🏪": "ui_shop",
    "🌊": "ui_water", "🐚": "fish_pearl", "🛠": "ui_devtools", "⚖️": "ui_scale", "🎒": "ui_inventory", "🗺️": "ui_map", "👥": "ui_people", "🧩": "ui_puzzle", "🔮": "ui_portal",
    "🟣": "fish_pearl", "⛏️": "ui_build", "★": "ui_star", "🧑‍🌾": "ui_farmer", "⚠": "ui_warning", "📉": "ui_warning", "🪙": "goldring", "💰": "goldring", "📐": "ui_scale", "🔀": "ui_enter", "🛡": "ui_warning", "⏩": "ui_enter", "🧰": "ui_build", "🛏": "ui_home"
}

def replace_in_data_files(content):
    # Removes glyph: "..." because they already have key: "..."
    # If there's an icon: "..." it replaces it with iconKey: "..."
    content = re.sub(r',\s*glyph:\s*"([^"]+)"', '', content)
    
    def replacer_icon(match):
        emoji = match.group(1)
        key = EMOJI_MAP.get(emoji, "ui_star")
        return f'iconKey: "{key}"'
    content = re.sub(r'icon:\s*"([^"]+)"', replacer_icon, content)
    
    return content

def replace_bubbles(content):
    def bubble_replacer(match):
        text = match.group(0)
        for emoji, key in EMOJI_MAP.items():
            if emoji in text:
                text = text.replace(emoji, f'[icon:{key}]')
        return text
    # Only replace inside bubble text
    content = re.sub(r'text:\s*`[^`]+`', bubble_replacer, content)
    content = re.sub(r'text:\s*"[^"]+"', bubble_replacer, content)
    return content

def run():
    for root, dirs, files in os.walk("src"):
        for f in files:
            if f.endswith(".js") or f.endswith(".jsx"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as file:
                    content = file.read()
                
                new_content = replace_in_data_files(content)
                new_content = replace_bubbles(new_content)
                
                if new_content != content:
                    with open(path, "w", encoding="utf-8") as file:
                        file.write(new_content)
                    print(f"Updated {path}")
                    
run()
