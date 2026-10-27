import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {json} from './response.mjs';
export function createMedia({imageDir,rip}) {
 return async function handle({req,res,path,adminAccess}) {
  if(!(path.startsWith('/media/') || req.method==='POST' && ['/api/upload','/api/rip/frame'].includes(path)))return false;
  await dispatch();
  return true;
  async function dispatch() {
    if (path.startsWith("/media/")) {
      const name = path.slice(7);
      if (
        !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name) ||
        !existsSync(join(imageDir, name))
      )
        return json(res, { error: "Image not found." }, 404);
      res.writeHead(200, {
        "Content-Type": name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".jpg")
            ? "image/jpeg"
            : "image/webp",
        "Cache-Control": "public, max-age=3600",
      });
      return res.end(readFileSync(join(imageDir, name)));
    }
    if (req.method === "POST" && path === "/api/upload") {
      if (!adminAccess)
        return json(res, { error: "Streamer access required." }, 403);
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}`
      )
        return json(res, { error: "Cross-origin request rejected." }, 403);
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 3 * 1024 * 1024)
          throw new Error("Choose an image smaller than 3 MB.");
        chunks.push(c);
      }
      const image = Buffer.concat(chunks);
      const ext = image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : image[0] === 255 && image[1] === 216 && image[2] === 255
          ? "jpg"
          : image.toString("ascii", 0, 4) === "RIFF" &&
              image.toString("ascii", 8, 12) === "WEBP"
            ? "webp"
            : null;
      if (!ext) throw new Error("Choose a PNG, JPEG, or WebP image.");
      const name = randomBytes(16).toString("hex") + "." + ext;
      writeFileSync(join(imageDir, name), image, { mode: 0o600 });
      return json(res, { image: "/media/" + name });
    }
    if (req.method === "POST" && path === "/api/rip/frame") {
      if (!adminAccess) return json(res, {error:"Streamer access required."},403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(res,{error:"Cross-origin request rejected."},403);
      if(req.headers['content-type'] !== 'image/jpeg') throw Error('Send a JPEG frame.');
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>2000000)throw Error('Frame too large.');chunks.push(chunk);}
      const image=Buffer.concat(chunks);if(image[0]!==255||image[1]!==216)throw Error('Invalid JPEG.');
      await rip.scan(image);return json(res,rip.snapshot());
    }
  }
 };
}
