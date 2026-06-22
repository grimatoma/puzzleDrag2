import fs from "fs";
import path from "path";
import https from "https";

const assets = [
  {
    // Tuxemon sample tileset, 32px extruded (margin=1, spacing=2). CC-BY-SA (Tuxemon project).
    url: "https://raw.githubusercontent.com/mikewesthad/phaser-3-tilemap-blog-posts/master/examples/post-1/assets/tilesets/tuxmon-sample-32px-extruded.png",
    dest: "public/town/tileset.png",
  },
  {
    // "Misa" 4-direction top-down walk atlas (png + JSONHash). Tuxemon character
    // sprite, CC-BY-SA 4.0, via the Phaser RPG tutorial project. See public/town/CREDITS.md.
    url: "https://raw.githubusercontent.com/remarkablegames/phaser-rpg/master/src/assets/atlas/atlas.png",
    dest: "public/town/character-atlas.png",
  },
  {
    url: "https://raw.githubusercontent.com/remarkablegames/phaser-rpg/master/src/assets/atlas/atlas.json",
    dest: "public/town/character-atlas.json",
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`Downloaded ${url} to ${dest}`);
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log("Starting asset download...");
  try {
    for (const asset of assets) {
      await download(asset.url, asset.dest);
    }
    console.log("All assets downloaded successfully!");
  } catch (err) {
    console.error("Error downloading assets:", err);
    process.exit(1);
  }
}

main();
