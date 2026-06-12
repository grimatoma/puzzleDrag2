import fs from "fs";
import path from "path";
import https from "https";

const assets = [
  {
    url: "https://raw.githubusercontent.com/mikewesthad/phaser-3-tilemap-blog-posts/master/examples/post-1/assets/tilesets/tuxmon-sample-32px-extruded.png",
    dest: "public/town/tileset.png",
  },
  {
    url: "https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/dude.png",
    dest: "public/town/character.png",
  }
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
