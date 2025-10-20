import { opt } from "./options";
import { findBinary } from "./binary";

const { utils } = iina;

export async function fetchPlaylists() {
  const ytdl = findBinary();
  const args = [
    "--flat-playlist",
    '--print=<li><a href="%(webpage_url)s">%(title)s</a></li>',
    `${opt.useBrowser ? "--cookies-from-browser=" : "--add-header=Cookie: "}${opt.cookies}`,
    "--",
    `https://www.youtube.com/@${opt.handle}/playlists/`,
  ];

  return await utils.exec(ytdl, args);
}
