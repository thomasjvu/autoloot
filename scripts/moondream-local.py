#!/usr/bin/env python3
"""Loopback-only Autoloot adapter for Moondream Photon. No frame files are retained."""
import base64
import io
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

import moondream as md
from PIL import Image

MODEL = os.environ.get('MOONDREAM_MODEL', 'moondream3.1-9B-A2B')
PORT = int(os.environ.get('MOONDREAM_LOCAL_PORT', '2021'))
Image.MAX_IMAGE_PIXELS = 16_000_000


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(35)

    def reply(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path != '/health' or self.headers.get('Origin') or self.headers.get('Host') not in (f'127.0.0.1:{PORT}', f'localhost:{PORT}'):
            return self.reply(404, {'error': 'Unknown route.'})
        return self.reply(200, {'ready': True, 'model': MODEL})

    def do_POST(self):
        if (self.headers.get('Origin') or self.headers.get('Host') not in
                (f'127.0.0.1:{PORT}', f'localhost:{PORT}')):
            return self.reply(403, {'error': 'Local server access only.'})
        if self.path != '/query':
            return self.reply(404, {'error': 'Unknown route.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2_800_000 or self.headers.get('Content-Type') != 'application/json':
                return self.reply(400, {'error': 'Send a bounded JSON request.'})
            data = json.loads(self.rfile.read(size))
            if data.get('model') != MODEL:
                return self.reply(400, {'error': 'Model differs from the loaded local model.'})
            image_url = data['image_url']
            prefix = 'data:image/jpeg;base64,'
            if not image_url.startswith(prefix):
                raise ValueError('Expected JPEG')
            raw = base64.b64decode(image_url[len(prefix):], validate=True)
            if len(raw) > 2_000_000:
                raise ValueError('Image too large')
            question = data['question']
            if not isinstance(question, str) or len(question) > 6000:
                raise ValueError('Invalid question')
            with Image.open(io.BytesIO(raw)) as image:
                if image.format != 'JPEG' or image.width * image.height > Image.MAX_IMAGE_PIXELS:
                    raise ValueError('Invalid JPEG dimensions')
                result = model.query(image.convert('RGB'), question)
            return self.reply(200, {'answer': result['answer']})
        except (ValueError, KeyError, TypeError, OSError):
            return self.reply(400, {'error': 'Invalid frame request.'})
        except Exception:
            return self.reply(503, {'error': 'Local inference failed. Check the local process.'})

    def log_message(self, *_args):
        pass


if __name__ == '__main__':
    print(f'Loading {MODEL}; first start may download model weights.', flush=True)
    model = md.photon(MODEL)
    try:
        print(f'Moondream ready on http://127.0.0.1:{PORT}', flush=True)
        HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
    finally:
        model.close()
